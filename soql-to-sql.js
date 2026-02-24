'use strict';

// =============================================================================
// SOQL AST → PostgreSQL SQL Translator
// =============================================================================
// Translates parsed SOQL AST (from soql-parser.js) into PostgreSQL queries
// that operate on JSONB data columns.
//
// Table schema: "Id" TEXT PRIMARY KEY, data JSONB
// Field access: data->>'FieldName' (text), CAST(data->>'Field' AS numeric)
// =============================================================================

const { resolveDateLiteral } = require('./soql-parser');

// Safe field name validation
const SAFE_FIELD_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

function safeField(field) {
  if (!SAFE_FIELD_RE.test(field)) {
    throw new Error(`Invalid field name: ${field}`);
  }
  return field;
}

function fieldRef(field) {
  if (field === 'Id') return '"Id"';
  return `data->>'${safeField(field)}'`;
}

function numericFieldRef(field) {
  if (field === 'Id') return '"Id"';
  return `CAST(NULLIF(data->>'${safeField(field)}', '') AS numeric)`;
}

function jsonbFieldRef(field) {
  if (field === 'Id') return '"Id"';
  return `data->'${safeField(field)}'`;
}

// Helper: format date to ISO string (date only)
function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

function toDateTimeStr(d) {
  return d.toISOString();
}

// Table name helper
function tableName(objectName) {
  return objectName.toLowerCase();
}

// =============================================================================
// Main translator function
// =============================================================================

/**
 * Translate a parsed SOQL AST into a PostgreSQL query.
 *
 * @param {object} parsed - AST from SOQLParser.parse()
 * @param {string} collectionPrefix - Optional prefix for table names
 * @param {object} fieldTypeMap - Map<objectName, Map<fieldName, fieldType>>
 * @returns {{ sql: string, params: any[], needsPostProcess: boolean, postProcessInfo: object }}
 */
function translateSOQL(parsed, collectionPrefix, fieldTypeMap) {
  const ctx = {
    params: [],
    paramIdx: 1,
    prefix: collectionPrefix || '',
    fieldTypeMap: fieldTypeMap || new Map(),
    objectName: parsed.from,
    needsPostProcess: false,
    postProcessInfo: {
      hasRelationshipFields: false,
      hasSubqueryFields: false,
      relationshipFields: [],
      subqueryFields: []
    }
  };

  const tbl = tableName(ctx.prefix + parsed.from);

  // Check for relationship fields and subqueries in SELECT
  for (const f of parsed.fields) {
    if (f.type === 'relationship_field') {
      ctx.needsPostProcess = true;
      ctx.postProcessInfo.hasRelationshipFields = true;
      ctx.postProcessInfo.relationshipFields.push(f);
    }
    if (f.type === 'subquery') {
      ctx.needsPostProcess = true;
      ctx.postProcessInfo.hasSubqueryFields = true;
      ctx.postProcessInfo.subqueryFields.push(f);
    }
  }

  // ---- COUNT shortcut ----
  if (parsed.isCount && !parsed.groupBy) {
    let sql = `SELECT COUNT(*) as cnt FROM "${tbl}"`;
    if (parsed.where) {
      const whereSql = translateWhereExpr(parsed.where, ctx, tbl);
      if (whereSql) sql += ` WHERE ${whereSql}`;
    }
    return { sql, params: ctx.params, needsPostProcess: false, postProcessInfo: ctx.postProcessInfo };
  }

  // ---- GROUP BY with aggregates ----
  if (parsed.groupBy && parsed.groupBy.length > 0) {
    return translateGroupByQuery(parsed, ctx, tbl);
  }

  // ---- Non-grouped aggregates (e.g. SELECT SUM(Amount) FROM ...) ----
  if (parsed.isAggregate && !parsed.groupBy) {
    return translateAggregateQuery(parsed, ctx, tbl);
  }

  // ---- Standard SELECT ----
  let sql = `SELECT "Id", data FROM "${tbl}"`;

  // WHERE
  if (parsed.where) {
    const whereSql = translateWhereExpr(parsed.where, ctx, tbl);
    if (whereSql) sql += ` WHERE ${whereSql}`;
  }

  // ORDER BY
  if (parsed.orderBy && parsed.orderBy.length > 0) {
    const orderParts = parsed.orderBy.map(o => translateOrderByItem(o, ctx));
    sql += ` ORDER BY ${orderParts.join(', ')}`;
  }

  // OFFSET
  if (parsed.offset != null) {
    sql += ` OFFSET $${ctx.paramIdx}`;
    ctx.params.push(parseInt(parsed.offset, 10));
    ctx.paramIdx++;
  }

  // LIMIT
  if (parsed.limit != null) {
    sql += ` LIMIT $${ctx.paramIdx}`;
    ctx.params.push(parseInt(parsed.limit, 10));
    ctx.paramIdx++;
  }

  return { sql, params: ctx.params, needsPostProcess: ctx.needsPostProcess, postProcessInfo: ctx.postProcessInfo };
}

// =============================================================================
// GROUP BY query
// =============================================================================

function translateGroupByQuery(parsed, ctx, tbl) {
  const selectParts = [];

  // GROUP BY fields
  for (const g of parsed.groupBy) {
    if (g.includes('.')) {
      // Dotted path — needs post-processing
      ctx.needsPostProcess = true;
      selectParts.push(`${fieldRef(g.split('.')[0])} as "${safeField(g.split('.')[0])}"`);
    } else {
      selectParts.push(`${fieldRef(g)} as "${safeField(g)}"`);
    }
  }

  // Aggregate fields
  for (const f of parsed.fields) {
    if (f.type === 'aggregate') {
      selectParts.push(translateAggregateSelect(f, ctx));
    }
  }

  if (selectParts.length === 0) {
    selectParts.push('COUNT(*) as cnt');
  }

  let sql = `SELECT ${selectParts.join(', ')} FROM "${tbl}"`;

  // WHERE
  if (parsed.where) {
    const whereSql = translateWhereExpr(parsed.where, ctx, tbl);
    if (whereSql) sql += ` WHERE ${whereSql}`;
  }

  // GROUP BY
  const groupByParts = parsed.groupBy.map(g => {
    if (g.includes('.')) return fieldRef(g.split('.')[0]);
    return fieldRef(g);
  });
  sql += ` GROUP BY ${groupByParts.join(', ')}`;

  // HAVING
  if (parsed.having) {
    const havingSql = translateHavingExpr(parsed.having, ctx);
    if (havingSql) sql += ` HAVING ${havingSql}`;
  }

  // ORDER BY
  if (parsed.orderBy && parsed.orderBy.length > 0) {
    const orderParts = parsed.orderBy.map(o => translateOrderByItem(o, ctx));
    sql += ` ORDER BY ${orderParts.join(', ')}`;
  }

  // LIMIT
  if (parsed.limit != null) {
    sql += ` LIMIT $${ctx.paramIdx}`;
    ctx.params.push(parseInt(parsed.limit, 10));
    ctx.paramIdx++;
  }

  // OFFSET
  if (parsed.offset != null) {
    sql += ` OFFSET $${ctx.paramIdx}`;
    ctx.params.push(parseInt(parsed.offset, 10));
    ctx.paramIdx++;
  }

  return { sql, params: ctx.params, needsPostProcess: ctx.needsPostProcess, postProcessInfo: ctx.postProcessInfo };
}

// =============================================================================
// Non-grouped aggregate query
// =============================================================================

function translateAggregateQuery(parsed, ctx, tbl) {
  const selectParts = [];

  for (const f of parsed.fields) {
    if (f.type === 'aggregate') {
      selectParts.push(translateAggregateSelect(f, ctx));
    } else if (f.type === 'field') {
      selectParts.push(`${fieldRef(f.name)} as "${safeField(f.name)}"`);
    }
  }

  let sql = `SELECT ${selectParts.join(', ')} FROM "${tbl}"`;

  if (parsed.where) {
    const whereSql = translateWhereExpr(parsed.where, ctx, tbl);
    if (whereSql) sql += ` WHERE ${whereSql}`;
  }

  return { sql, params: ctx.params, needsPostProcess: false, postProcessInfo: ctx.postProcessInfo };
}

// =============================================================================
// Aggregate SELECT clause helper
// =============================================================================

function translateAggregateSelect(f, ctx) {
  const func = f.func.toUpperCase();
  const alias = f.alias || (func === 'COUNT' && !f.field ? 'expr0' : `${func.toLowerCase()}_${(f.field || '').replace(/\./g, '_')}`);

  if (func === 'COUNT' && !f.field) {
    return `COUNT(*) as "${alias}"`;
  }
  if (func === 'COUNT') {
    return `COUNT(${fieldRef(f.field)}) as "${alias}"`;
  }
  if (func === 'COUNT_DISTINCT') {
    return `COUNT(DISTINCT ${fieldRef(f.field)}) as "${alias}"`;
  }
  // SUM, AVG, MIN, MAX — need numeric cast
  if (['SUM', 'AVG'].includes(func)) {
    return `${func}(${numericFieldRef(f.field)}) as "${alias}"`;
  }
  // MIN, MAX can work on text too
  return `${func}(${fieldRef(f.field)}) as "${alias}"`;
}

// =============================================================================
// WHERE expression translator (recursive)
// =============================================================================

function translateWhereExpr(expr, ctx, tbl) {
  if (!expr) return null;

  switch (expr.type) {
    case 'and': {
      const left = translateWhereExpr(expr.left, ctx, tbl);
      const right = translateWhereExpr(expr.right, ctx, tbl);
      return `(${left} AND ${right})`;
    }
    case 'or': {
      const left = translateWhereExpr(expr.left, ctx, tbl);
      const right = translateWhereExpr(expr.right, ctx, tbl);
      return `(${left} OR ${right})`;
    }
    case 'not': {
      const inner = translateWhereExpr(expr.expr, ctx, tbl);
      return `NOT (${inner})`;
    }
    case 'condition':
      return translateCondition(expr, ctx);
    case 'in_subquery':
      return translateInSubquery(expr, ctx);
    default:
      throw new Error(`Unknown WHERE expression type: ${expr.type}`);
  }
}

// =============================================================================
// Condition translator
// =============================================================================

function translateCondition(cond, ctx) {
  const field = cond.field;
  const operator = cond.operator;
  let target = cond.value;

  // Dotted field path (e.g. Account.Name) — cannot push down to SQL
  // Use simple field reference for the first part; post-processing needed
  const isDottedField = field.includes('.');
  const fRef = isDottedField ? fieldRef(field.split('.')[0]) : fieldRef(field);

  // If dotted field, we can't reliably translate — mark for post-processing
  // But we can still try to filter at DB level on the first part
  if (isDottedField) {
    // For dotted paths, fall back to always true and let JS handle it
    return 'FALSE'; // Security: deny rather than expose all records
  }

  // Date literal handling
  if (target && typeof target === 'object' && target.__dateLiteral) {
    return translateDateLiteralCondition(field, operator, target, ctx);
  }

  switch (operator) {
    case '=': {
      if (target === null) return `(${fRef}) IS NULL`;
      ctx.params.push(String(target));
      return `${fRef} = $${ctx.paramIdx++}`;
    }
    case '!=': {
      if (target === null) return `(${fRef}) IS NOT NULL`;
      ctx.params.push(String(target));
      return `(${fRef} IS NULL OR ${fRef} != $${ctx.paramIdx++})`;
    }
    case '>':
    case '>=':
    case '<':
    case '<=': {
      // Determine if numeric comparison is needed
      if (isNumericValue(target)) {
        ctx.params.push(Number(target));
        return `${numericFieldRef(field)} ${operator} $${ctx.paramIdx++}`;
      }
      ctx.params.push(String(target));
      return `${fRef} ${operator} $${ctx.paramIdx++}`;
    }
    case 'LIKE': {
      ctx.params.push(String(target));
      return `${fRef} ILIKE $${ctx.paramIdx++}`;
    }
    case 'IN': {
      if (!Array.isArray(target) || target.length === 0) return 'FALSE';
      const values = target.map(v => String(v));
      ctx.params.push(values);
      return `${fRef} = ANY($${ctx.paramIdx++}::text[])`;
    }
    case 'NOT IN': {
      if (!Array.isArray(target) || target.length === 0) return 'TRUE';
      const values = target.map(v => String(v));
      ctx.params.push(values);
      return `(${fRef} IS NULL OR ${fRef} != ALL($${ctx.paramIdx++}::text[]))`;
    }
    case 'INCLUDES': {
      // Multi-picklist: field contains semicolon-separated values
      if (!Array.isArray(target) || target.length === 0) return 'FALSE';
      const parts = target.map(v => {
        ctx.params.push(`%${v}%`);
        return `${fRef} ILIKE $${ctx.paramIdx++}`;
      });
      return `(${parts.join(' OR ')})`;
    }
    case 'EXCLUDES': {
      if (!Array.isArray(target) || target.length === 0) return 'TRUE';
      const parts = target.map(v => {
        ctx.params.push(`%${v}%`);
        return `${fRef} NOT ILIKE $${ctx.paramIdx++}`;
      });
      return `(${fRef} IS NULL OR (${parts.join(' AND ')}))`;
    }
    default:
      throw new Error(`Unsupported SOQL operator: ${operator}`);
  }
}

// =============================================================================
// Date literal condition
// =============================================================================

function translateDateLiteralCondition(field, operator, target, ctx) {
  const resolved = resolveDateLiteral(target.value);
  const fRef = fieldRef(field);

  // Range date literals (THIS_MONTH, LAST_N_DAYS:7, etc.)
  if (resolved && typeof resolved === 'object' && resolved.start && resolved.end) {
    const startStr = toDateStr(resolved.start);
    const endStr = toDateStr(resolved.end);

    switch (operator) {
      case '=': {
        ctx.params.push(startStr);
        ctx.params.push(endStr);
        return `(${fRef} >= $${ctx.paramIdx++} AND ${fRef} <= $${ctx.paramIdx++})`;
      }
      case '!=': {
        ctx.params.push(startStr);
        ctx.params.push(endStr);
        return `(${fRef} < $${ctx.paramIdx++} OR ${fRef} > $${ctx.paramIdx++})`;
      }
      case '>': {
        ctx.params.push(endStr);
        return `${fRef} > $${ctx.paramIdx++}`;
      }
      case '>=': {
        ctx.params.push(startStr);
        return `${fRef} >= $${ctx.paramIdx++}`;
      }
      case '<': {
        ctx.params.push(startStr);
        return `${fRef} < $${ctx.paramIdx++}`;
      }
      case '<=': {
        ctx.params.push(endStr);
        return `${fRef} <= $${ctx.paramIdx++}`;
      }
      default:
        return 'TRUE';
    }
  }

  // Point date literals (TODAY, YESTERDAY, TOMORROW)
  const dateStr = toDateStr(resolved);
  switch (operator) {
    case '=': {
      ctx.params.push(dateStr);
      ctx.params.push(dateStr);
      return `(${fRef} >= $${ctx.paramIdx++} AND ${fRef} <= $${ctx.paramIdx++})`;
    }
    case '!=': {
      ctx.params.push(dateStr);
      ctx.params.push(dateStr);
      return `(${fRef} < $${ctx.paramIdx++} OR ${fRef} > $${ctx.paramIdx++})`;
    }
    case '>': {
      ctx.params.push(dateStr);
      return `${fRef} > $${ctx.paramIdx++}`;
    }
    case '>=': {
      ctx.params.push(dateStr);
      return `${fRef} >= $${ctx.paramIdx++}`;
    }
    case '<': {
      ctx.params.push(dateStr);
      return `${fRef} < $${ctx.paramIdx++}`;
    }
    case '<=': {
      ctx.params.push(dateStr);
      return `${fRef} <= $${ctx.paramIdx++}`;
    }
    default:
      return 'TRUE';
  }
}

// =============================================================================
// IN subquery translator
// =============================================================================

function translateInSubquery(expr, ctx) {
  const field = expr.field;
  const fRef = fieldRef(field);
  const subquery = expr.subquery;

  // Translate the subquery
  const subTbl = tableName(ctx.prefix + subquery.from);

  // Get the field from the subquery's SELECT
  let subField = 'Id';
  if (subquery.fields && subquery.fields.length > 0) {
    const f = subquery.fields[0];
    if (f.type === 'field') subField = f.name;
  }
  const subFRef = subField === 'Id' ? '"Id"' : `data->>'${safeField(subField)}'`;

  let subSql = `SELECT ${subFRef} FROM "${subTbl}"`;

  if (subquery.where) {
    const subWhere = translateWhereExpr(subquery.where, ctx, subTbl);
    if (subWhere) subSql += ` WHERE ${subWhere}`;
  }

  if (subquery.limit != null) {
    subSql += ` LIMIT $${ctx.paramIdx}`;
    ctx.params.push(parseInt(subquery.limit, 10));
    ctx.paramIdx++;
  }

  const op = expr.negated ? 'NOT IN' : 'IN';
  return `${fRef} ${op} (${subSql})`;
}

// =============================================================================
// HAVING expression translator
// =============================================================================

function translateHavingExpr(expr, ctx) {
  if (!expr) return null;

  switch (expr.type) {
    case 'and': {
      const left = translateHavingExpr(expr.left, ctx);
      const right = translateHavingExpr(expr.right, ctx);
      return `(${left} AND ${right})`;
    }
    case 'or': {
      const left = translateHavingExpr(expr.left, ctx);
      const right = translateHavingExpr(expr.right, ctx);
      return `(${left} OR ${right})`;
    }
    case 'condition': {
      // HAVING conditions — translate as regular condition
      return translateCondition(expr, ctx);
    }
    default:
      return translateCondition(expr, ctx);
  }
}

// =============================================================================
// ORDER BY translator
// =============================================================================

function translateOrderByItem(item, ctx) {
  const field = item.field;
  const dir = (item.direction || 'ASC').toUpperCase();

  // Dotted field — can't push down
  if (field.includes('.')) {
    // Use first part of path
    const firstPart = field.split('.')[0];
    let clause = `${fieldRef(firstPart)} ${dir}`;
    if (item.nulls) clause += ` NULLS ${item.nulls}`;
    return clause;
  }

  let clause;
  if (isNumericField(field, ctx)) {
    clause = `${numericFieldRef(field)} ${dir}`;
  } else {
    clause = `${fieldRef(field)} ${dir}`;
  }

  if (item.nulls) {
    clause += ` NULLS ${item.nulls}`;
  }
  return clause;
}

// =============================================================================
// Helpers
// =============================================================================

function isNumericValue(val) {
  if (val === null || val === undefined) return false;
  if (typeof val === 'number') return true;
  if (typeof val === 'string') return !isNaN(val) && val.trim() !== '';
  return false;
}

// Known numeric field suffixes/types
const NUMERIC_FIELD_PATTERNS = [
  /Amount/i, /Price/i, /Count/i, /Score/i, /Quantity/i,
  /Percent/i, /Probability/i, /Revenue/i, /Budget/i,
  /NumberOf/i, /Rate/i, /Cost/i, /Total/i
];

function isNumericField(field, ctx) {
  // Check field type map
  if (ctx.fieldTypeMap && ctx.fieldTypeMap.has(ctx.objectName)) {
    const objTypes = ctx.fieldTypeMap.get(ctx.objectName);
    if (objTypes && objTypes.has(field)) {
      const t = objTypes.get(field);
      return ['Currency', 'Number', 'Percent', 'Double', 'Integer'].includes(t);
    }
  }
  // Fallback: pattern matching
  return NUMERIC_FIELD_PATTERNS.some(p => p.test(field));
}

// =============================================================================
// Exports
// =============================================================================

module.exports = {
  translateSOQL,
  tableName
};
