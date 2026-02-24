const { Pool } = require('pg');
const { generateId, validateId } = require('./salesforce-id');

// ============================================================================
// PostgreSQL Connection
// ============================================================================

const connStr = process.env.DATABASE_URL || '';
const isSSL = connStr.includes('sslmode=require') || connStr.includes('neon.tech') || process.env.PGSSLMODE === 'require';

const pool = new Pool({
  connectionString: connStr || undefined,
  host: connStr ? undefined : (process.env.PGHOST || 'localhost'),
  port: connStr ? undefined : parseInt(process.env.PGPORT || '5432'),
  database: connStr ? undefined : (process.env.PGDATABASE || 'sfa'),
  user: connStr ? undefined : (process.env.PGUSER || 'postgres'),
  password: connStr ? undefined : (process.env.PGPASSWORD || 'postgres'),
  ssl: isSSL ? { rejectUnauthorized: process.env.PGSSL_REJECT_UNAUTHORIZED !== 'false' } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

pool.on('error', (err) => {
  console.error('[ERROR] PostgreSQL pool error:', err.message);
});

// ============================================================================
// Table name mapping: Salesforce object names → PostgreSQL table names
// e.g. "Medical_Institution__c" → "medical_institution__c"
// We store as lowercase to follow PG conventions, but the API layer
// continues to use the original Salesforce-style names.
// ============================================================================

function tableName(collectionName, prefix) {
  return ((prefix || '') + collectionName).toLowerCase();
}

// ============================================================================
// Safe field name validation (prevent SQL injection in JSONB field access)
// ============================================================================

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

// ============================================================================
// Schema bootstrap: ensure table exists for a given object
// Uses a single JSONB column for flexibility (schemaless like Firestore)
// ============================================================================

async function ensureTable(name) {
  const tbl = tableName(name);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "${tbl}" (
      "Id" TEXT PRIMARY KEY,
      data JSONB NOT NULL DEFAULT '{}'::jsonb
    )
  `);
}

// ============================================================================
// CRUD Operations (same interface as firestore-service.js)
// ============================================================================

async function getAll(collectionName) {
  const tbl = tableName(collectionName);
  try {
    const result = await pool.query(`SELECT "Id", data FROM "${tbl}"`);
    return result.rows.map(row => ({ Id: row.Id, ...row.data }));
  } catch (err) {
    if (err.code === '42P01') {
      // Table does not exist yet
      await ensureTable(collectionName);
      return [];
    }
    throw err;
  }
}

async function getById(collectionName, id) {
  const tbl = tableName(collectionName);
  try {
    const result = await pool.query(`SELECT "Id", data FROM "${tbl}" WHERE "Id" = $1`, [id]);
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return { Id: row.Id, ...row.data };
  } catch (err) {
    if (err.code === '42P01') return null;
    throw err;
  }
}

async function create(collectionName, data) {
  let id = data.Id;
  if (!id) {
    id = generateId(collectionName);
  } else {
    const validation = validateId(id);
    if (!validation.valid) {
      id = generateId(collectionName);
    }
  }

  const docData = { ...data };
  delete docData.Id;

  const tbl = tableName(collectionName);
  await ensureTable(collectionName);
  await pool.query(
    `INSERT INTO "${tbl}" ("Id", data) VALUES ($1, $2)`,
    [id, JSON.stringify(docData)]
  );
  return { Id: id, ...docData };
}

async function update(collectionName, id, data) {
  const docData = { ...data };
  delete docData.Id;

  const tbl = tableName(collectionName);
  // Merge with existing data (like Firestore's merge: true)
  await pool.query(
    `UPDATE "${tbl}" SET data = data || $1::jsonb WHERE "Id" = $2`,
    [JSON.stringify(docData), id]
  );
  // Return updated record
  const updated = await getById(collectionName, id);
  return updated;
}

async function remove(collectionName, id) {
  const tbl = tableName(collectionName);
  await pool.query(`DELETE FROM "${tbl}" WHERE "Id" = $1`, [id]);
}

async function collectionExists(collectionName) {
  const tbl = tableName(collectionName);
  try {
    const result = await pool.query(`SELECT 1 FROM "${tbl}" LIMIT 1`);
    return result.rows.length > 0;
  } catch (err) {
    if (err.code === '42P01') return false;
    throw err;
  }
}

// ============================================================================
// WHERE clause builder (shared by query, count, search)
// ============================================================================

function buildWhereClause(where, params, paramIdx) {
  const conditions = [];
  for (const w of where) {
    const op = w.op;

    if (op === 'LIKE' || op === 'like') {
      if (w.field === 'Id') {
        conditions.push(`"Id" ILIKE $${paramIdx}`);
      } else {
        conditions.push(`${fieldRef(w.field)} ILIKE $${paramIdx}`);
      }
      params.push(w.value);
      paramIdx++;
    } else if (op === 'IN' || op === 'in') {
      if (w.field === 'Id') {
        conditions.push(`"Id" = ANY($${paramIdx}::text[])`);
      } else {
        conditions.push(`${fieldRef(w.field)} = ANY($${paramIdx}::text[])`);
      }
      params.push(w.value);
      paramIdx++;
    } else if (op === 'NOT IN' || op === 'not in') {
      if (w.field === 'Id') {
        conditions.push(`"Id" != ALL($${paramIdx}::text[])`);
      } else {
        conditions.push(`${fieldRef(w.field)} != ALL($${paramIdx}::text[])`);
      }
      params.push(w.value);
      paramIdx++;
    } else if (op === 'IS NULL' || op === 'is null') {
      if (w.field === 'Id') {
        conditions.push(`"Id" IS NULL`);
      } else {
        conditions.push(`(${fieldRef(w.field)}) IS NULL`);
      }
    } else if (op === 'IS NOT NULL' || op === 'is not null') {
      if (w.field === 'Id') {
        conditions.push(`"Id" IS NOT NULL`);
      } else {
        conditions.push(`(${fieldRef(w.field)}) IS NOT NULL`);
      }
    } else if (op === 'NUMERIC_GT' || op === 'NUMERIC_GTE' || op === 'NUMERIC_LT' || op === 'NUMERIC_LTE' || op === 'NUMERIC_EQ' || op === 'NUMERIC_NEQ') {
      const sqlOp = { NUMERIC_GT: '>', NUMERIC_GTE: '>=', NUMERIC_LT: '<', NUMERIC_LTE: '<=', NUMERIC_EQ: '=', NUMERIC_NEQ: '!=' }[op];
      conditions.push(`${numericFieldRef(w.field)} ${sqlOp} $${paramIdx}`);
      params.push(w.value);
      paramIdx++;
    } else if (op === 'OR_LIKE') {
      // Multiple fields OR'd with ILIKE (for search)
      const fields = w.fields || [];
      if (fields.length > 0) {
        const orParts = fields.map(f => `${fieldRef(f)} ILIKE $${paramIdx}`);
        conditions.push(`(${orParts.join(' OR ')})`);
        params.push(w.value);
        paramIdx++;
      }
    } else {
      // Standard comparison operators: ==, !=, <, <=, >, >=
      const pgOp = { '==': '=', '!=': '!=', '<': '<', '<=': '<=', '>': '>', '>=': '>=' }[op] || '=';
      if (w.field === 'Id') {
        conditions.push(`"Id" ${pgOp} $${paramIdx}`);
      } else {
        conditions.push(`${fieldRef(w.field)} ${pgOp} $${paramIdx}`);
      }
      params.push(w.value);
      paramIdx++;
    }
  }
  return { conditions, paramIdx };
}

// ============================================================================
// Query (compatible with firestore-service query interface)
// ============================================================================

async function query(collectionName, options = {}) {
  const tbl = tableName(collectionName);
  let sql = `SELECT "Id", data FROM "${tbl}"`;
  const params = [];
  let paramIdx = 1;

  // WHERE clauses
  if (options.where && options.where.length > 0) {
    const result = buildWhereClause(options.where, params, paramIdx);
    paramIdx = result.paramIdx;
    if (result.conditions.length > 0) {
      sql += ' WHERE ' + result.conditions.join(' AND ');
    }
  }

  // ORDER BY
  if (options.orderBy && options.orderBy.length > 0) {
    const orderClauses = options.orderBy.map(o => {
      const dir = (o.direction || 'asc').toUpperCase();
      if (dir !== 'ASC' && dir !== 'DESC') throw new Error('Invalid sort direction');
      if (o.field === 'Id') return `"Id" ${dir}`;
      if (o.numeric) return `${numericFieldRef(o.field)} ${dir}`;
      return `${fieldRef(o.field)} ${dir}`;
    });
    sql += ' ORDER BY ' + orderClauses.join(', ');
  }

  if (options.limit) {
    sql += ` LIMIT $${paramIdx}`;
    params.push(options.limit);
    paramIdx++;
  }

  if (options.offset) {
    sql += ` OFFSET $${paramIdx}`;
    params.push(options.offset);
    paramIdx++;
  }

  try {
    const result = await pool.query(sql, params);
    return result.rows.map(row => ({ Id: row.Id, ...row.data }));
  } catch (err) {
    if (err.code === '42P01') {
      await ensureTable(collectionName);
      return [];
    }
    throw err;
  }
}

// ============================================================================
// Count - efficient record counting with WHERE support
// ============================================================================

async function count(collectionName, options = {}) {
  const tbl = tableName(collectionName);
  let sql = `SELECT COUNT(*) as cnt FROM "${tbl}"`;
  const params = [];
  let paramIdx = 1;

  if (options.where && options.where.length > 0) {
    const result = buildWhereClause(options.where, params, paramIdx);
    paramIdx = result.paramIdx;
    if (result.conditions.length > 0) {
      sql += ' WHERE ' + result.conditions.join(' AND ');
    }
  }

  try {
    const result = await pool.query(sql, params);
    return parseInt(result.rows[0].cnt, 10);
  } catch (err) {
    if (err.code === '42P01') return 0;
    throw err;
  }
}

// ============================================================================
// QueryWithCount - returns records + totalSize in one call
// ============================================================================

async function queryWithCount(collectionName, options = {}) {
  const [records, totalSize] = await Promise.all([
    query(collectionName, options),
    count(collectionName, { where: options.where })
  ]);
  return { records, totalSize };
}

// ============================================================================
// Search - ILIKE search across multiple fields
// ============================================================================

async function search(collectionName, searchTerm, fields, options = {}) {
  if (!searchTerm || !fields || fields.length === 0) {
    return query(collectionName, options);
  }

  const tbl = tableName(collectionName);
  const params = [];
  let paramIdx = 1;

  // Build OR conditions for each searchable field
  const searchParam = `%${searchTerm}%`;
  const orParts = fields.map(f => `${fieldRef(f)} ILIKE $${paramIdx}`);
  params.push(searchParam);
  paramIdx++;

  let sql = `SELECT "Id", data FROM "${tbl}" WHERE (${orParts.join(' OR ')})`;

  // Additional WHERE conditions
  if (options.where && options.where.length > 0) {
    const result = buildWhereClause(options.where, params, paramIdx);
    paramIdx = result.paramIdx;
    if (result.conditions.length > 0) {
      sql += ' AND ' + result.conditions.join(' AND ');
    }
  }

  // ORDER BY
  if (options.orderBy && options.orderBy.length > 0) {
    const orderClauses = options.orderBy.map(o => {
      const dir = (o.direction || 'asc').toUpperCase();
      if (dir !== 'ASC' && dir !== 'DESC') throw new Error('Invalid sort direction');
      if (o.field === 'Id') return `"Id" ${dir}`;
      return `${fieldRef(o.field)} ${dir}`;
    });
    sql += ' ORDER BY ' + orderClauses.join(', ');
  }

  if (options.limit) {
    sql += ` LIMIT $${paramIdx}`;
    params.push(options.limit);
    paramIdx++;
  }

  if (options.offset) {
    sql += ` OFFSET $${paramIdx}`;
    params.push(options.offset);
    paramIdx++;
  }

  try {
    const result = await pool.query(sql, params);
    return result.rows.map(row => ({ Id: row.Id, ...row.data }));
  } catch (err) {
    if (err.code === '42P01') return [];
    throw err;
  }
}

// ============================================================================
// SearchWithCount - search + total count
// ============================================================================

async function searchWithCount(collectionName, searchTerm, fields, options = {}) {
  if (!searchTerm || !fields || fields.length === 0) {
    return queryWithCount(collectionName, options);
  }

  const searchWhere = [{
    op: 'OR_LIKE',
    fields: fields,
    value: `%${searchTerm}%`
  }];

  const combinedWhere = [...searchWhere, ...(options.where || [])];

  const [records, totalSize] = await Promise.all([
    query(collectionName, { ...options, where: combinedWhere }),
    count(collectionName, { where: combinedWhere })
  ]);
  return { records, totalSize };
}

// ============================================================================
// Aggregate - GROUP BY with aggregate functions (COUNT, SUM, AVG, MIN, MAX)
// ============================================================================

async function aggregate(collectionName, options = {}) {
  const tbl = tableName(collectionName);
  const params = [];
  let paramIdx = 1;

  // Build SELECT with aggregate functions
  const selectParts = [];
  const groupByFields = options.groupBy || [];

  for (const g of groupByFields) {
    selectParts.push(`${fieldRef(g)} as "${safeField(g)}"`);
  }

  const aggFuncs = options.aggregates || [];
  for (const agg of aggFuncs) {
    const func = agg.func.toUpperCase();
    if (!['COUNT', 'SUM', 'AVG', 'MIN', 'MAX'].includes(func)) {
      throw new Error(`Invalid aggregate function: ${func}`);
    }
    if (func === 'COUNT' && !agg.field) {
      selectParts.push(`COUNT(*) as "${agg.alias || 'cnt'}"`);
    } else if (func === 'COUNT') {
      selectParts.push(`COUNT(${fieldRef(agg.field)}) as "${agg.alias || 'cnt'}"`);
    } else {
      selectParts.push(`${func}(${numericFieldRef(agg.field)}) as "${agg.alias || func.toLowerCase()}"`);
    }
  }

  if (selectParts.length === 0) {
    selectParts.push('COUNT(*) as cnt');
  }

  let sql = `SELECT ${selectParts.join(', ')} FROM "${tbl}"`;

  // WHERE
  if (options.where && options.where.length > 0) {
    const result = buildWhereClause(options.where, params, paramIdx);
    paramIdx = result.paramIdx;
    if (result.conditions.length > 0) {
      sql += ' WHERE ' + result.conditions.join(' AND ');
    }
  }

  // GROUP BY
  if (groupByFields.length > 0) {
    sql += ' GROUP BY ' + groupByFields.map(g => fieldRef(g)).join(', ');
  }

  // HAVING
  if (options.having && options.having.length > 0) {
    const havingParts = [];
    for (const h of options.having) {
      const func = h.func.toUpperCase();
      const op = { '==': '=', '!=': '!=', '<': '<', '<=': '<=', '>': '>', '>=': '>=' }[h.op] || '=';
      if (func === 'COUNT' && !h.field) {
        havingParts.push(`COUNT(*) ${op} $${paramIdx}`);
      } else {
        havingParts.push(`${func}(${numericFieldRef(h.field)}) ${op} $${paramIdx}`);
      }
      params.push(h.value);
      paramIdx++;
    }
    sql += ' HAVING ' + havingParts.join(' AND ');
  }

  // ORDER BY
  if (options.orderBy && options.orderBy.length > 0) {
    const orderClauses = options.orderBy.map(o => {
      const dir = (o.direction || 'asc').toUpperCase();
      if (dir !== 'ASC' && dir !== 'DESC') throw new Error('Invalid sort direction');
      if (o.aggregate) {
        const func = o.aggregate.toUpperCase();
        if (o.field) return `${func}(${numericFieldRef(o.field)}) ${dir}`;
        return `${func}(*) ${dir}`;
      }
      return `${fieldRef(o.field)} ${dir}`;
    });
    sql += ' ORDER BY ' + orderClauses.join(', ');
  }

  if (options.limit) {
    sql += ` LIMIT $${paramIdx}`;
    params.push(options.limit);
    paramIdx++;
  }

  try {
    const result = await pool.query(sql, params);
    return result.rows;
  } catch (err) {
    if (err.code === '42P01') return [];
    throw err;
  }
}

// ============================================================================
// Resolve lookup names in batch
// ============================================================================

async function resolveNames(collectionName, ids) {
  if (!ids || ids.length === 0) return {};
  const tbl = tableName(collectionName);
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) return {};

  try {
    const result = await pool.query(
      `SELECT "Id", data->>'Name' as "Name", data->>'LastName' as "LastName",
              data->>'Subject' as "Subject", data->>'Username' as "Username"
       FROM "${tbl}" WHERE "Id" = ANY($1::text[])`,
      [uniqueIds]
    );
    const map = {};
    for (const row of result.rows) {
      map[row.Id] = row.Name || row.LastName || row.Subject || row.Username || row.Id;
    }
    return map;
  } catch (err) {
    if (err.code === '42P01') return {};
    throw err;
  }
}

// ============================================================================
// Raw SQL query (for soql-to-sql translated queries)
// ============================================================================

async function rawQuery(sql, params) {
  const result = await pool.query(sql, params);
  return result.rows;
}

// ============================================================================
// Collection names (same as firestore-service)
// ============================================================================

const COLLECTION_NAMES = [
  // Standard Salesforce Objects
  'Account', 'Contact', 'Lead', 'Opportunity', 'OpportunityLineItem',
  'OpportunityContactRole', 'Campaign', 'CampaignMember', 'Case', 'Task',
  'Event', 'Product2', 'Pricebook2', 'PricebookEntry', 'Quote',
  'QuoteLineItem', 'Contract', 'Order', 'OrderItem', 'User', 'Note',
  'ContentDocument',
  // Custom Objects
  'Medical_Institution__c', 'Doctor__c', 'Pharma_Opportunity__c',
  'Genomic_Project__c', 'Visit_Record__c', 'Specimen__c', 'MA_Activity__c',
  'Seminar__c', 'Lab__c', 'Joint_Research__c',
  'Bento_Order__c', 'Seminar_Attendee__c', 'Testing_Order__c',
  'PMDA_Submission__c', 'Broker__c', 'Property__c'
];

function getCollectionNames() {
  return COLLECTION_NAMES;
}

// ============================================================================
// Batch operations (replaces Firestore batch for seeding)
// ============================================================================

function batch() {
  const ops = [];
  return {
    set(ref, data) {
      ops.push({ table: ref._table, id: ref._id, data });
    },
    async commit() {
      if (ops.length === 0) return;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        for (const op of ops) {
          await client.query(
            `INSERT INTO "${op.table}" ("Id", data) VALUES ($1, $2)
             ON CONFLICT ("Id") DO UPDATE SET data = $2`,
            [op.id, JSON.stringify(op.data)]
          );
        }
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }
  };
}

// Helper to create a doc reference (mimics Firestore's db.collection().doc())
function collection(collectionName) {
  const tbl = tableName(collectionName);
  return {
    doc(id) {
      return { _table: tbl, _id: id };
    }
  };
}

// ============================================================================
// Initialization: create tables + indexes for all known collections
// ============================================================================

// Standard fields that should be indexed on every table (like Salesforce)
const STANDARD_INDEX_FIELDS = ['Name', 'OwnerId', 'CreatedDate', 'LastModifiedDate', 'Visit_Date__c', 'Event_Date__c', 'Activity_Date__c', 'Report_Date__c', 'Order_Date__c', 'Received_Date__c'];

async function initTables(schemaConfig) {
  const client = await pool.connect();
  try {
    for (const name of COLLECTION_NAMES) {
      const tbl = tableName(name);
      await client.query(`
        CREATE TABLE IF NOT EXISTS "${tbl}" (
          "Id" TEXT PRIMARY KEY,
          data JSONB NOT NULL DEFAULT '{}'::jsonb
        )
      `);

      // GIN index for general JSONB containment queries
      await client.query(`
        CREATE INDEX IF NOT EXISTS "idx_${tbl}_gin" ON "${tbl}" USING gin (data)
      `);

      // B-tree indexes on standard fields
      for (const field of STANDARD_INDEX_FIELDS) {
        await client.query(`
          CREATE INDEX IF NOT EXISTS "idx_${tbl}_${field.toLowerCase()}"
          ON "${tbl}" ((data->>'${field}'))
        `);
      }

      // Schema-driven indexes for Lookup fields
      if (schemaConfig) {
        const objDef = findObjectDef(schemaConfig, name);
        if (objDef && objDef.fields) {
          for (const f of objDef.fields) {
            if (f.type === 'Lookup' || f.type === 'MasterDetail') {
              const fn = f.apiName;
              if (!STANDARD_INDEX_FIELDS.includes(fn) && SAFE_FIELD_RE.test(fn)) {
                await client.query(`
                  CREATE INDEX IF NOT EXISTS "idx_${tbl}_${fn.toLowerCase()}"
                  ON "${tbl}" ((data->>'${fn}'))
                `);
              }
            }
            // Numeric fields used in aggregation
            if ((f.type === 'Currency' || f.type === 'Number' || f.type === 'Percent') && SAFE_FIELD_RE.test(f.apiName)) {
              await client.query(`
                CREATE INDEX IF NOT EXISTS "idx_${tbl}_${f.apiName.toLowerCase()}_num"
                ON "${tbl}" ((CAST(NULLIF(data->>'${f.apiName}', '') AS numeric)))
              `);
            }
          }
        }
      }
    }
    console.log(`[INFO] PostgreSQL tables and indexes initialized (${COLLECTION_NAMES.length} tables)`);
  } finally {
    client.release();
  }
}

// Helper to find object definition from schema config
function findObjectDef(schemaConfig, objectName) {
  if (!schemaConfig) return null;
  const stdObj = (schemaConfig.standardObjects || []).find(o => o.apiName === objectName);
  if (stdObj) return stdObj;
  const custObj = (schemaConfig.customObjects || []).find(o => o.apiName === objectName);
  return custObj || null;
}

// ============================================================================
// Exports (drop-in replacement for firestore-service)
// ============================================================================

module.exports = {
  pool,
  tableName,
  // Firestore-compatible 'db' interface for seeding code
  db: { batch, collection },
  getAll,
  getById,
  query,
  queryWithCount,
  count,
  search,
  searchWithCount,
  aggregate,
  resolveNames,
  rawQuery,
  create,
  update,
  remove,
  collectionExists,
  getCollectionNames,
  initTables
};
