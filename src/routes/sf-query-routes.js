'use strict';

/**
 * SF Query Routes - /services/data/v62.0/query/*, queryAll, query locator
 * Also includes queryResultCache, parseSOQL wrapper, resolveWhereSubqueries
 */

const crypto = require('crypto');

function createSfQueryRoutes(app, ctx) {
  const {
    ensureAuthenticated, canUserAccessObject, filterFieldsByFLS,
    pgService, fsCollection, findObjectDef,
    schemaConfig, SF_API_VERSION, DB_PREFIX,
    childRelationshipsIndex, parentRelationshipMap,
    tokenizeSOQL, SOQLParser, evaluateWhereExpr, subqueryKey,
    translateSOQL
  } = ctx;

  // parseSOQL wrapper
  function parseSOQL(query) {
    const tokens = tokenizeSOQL(query);
    const parser = new SOQLParser(tokens);
    return parser.parse();
  }

  // Legacy compat: evaluateConditions wraps the new evaluator
  function evaluateConditions(record, conditions) {
    return evaluateWhereExpr(record, conditions, {});
  }

  // Query pagination cache
  const queryResultCache = new Map();
  const QUERY_DEFAULT_BATCH_SIZE = 2000;
  const QUERY_CACHE_TTL = 15 * 60 * 1000;
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of queryResultCache) { if (now - v.timestamp > QUERY_CACHE_TTL) queryResultCache.delete(k); }
  }, 5 * 60 * 1000);

  function sendQueryResult(res, result, batchSize) {
    if (result.length > batchSize) {
      const locator = crypto.randomUUID();
      queryResultCache.set(locator, { records: result, position: batchSize, totalSize: result.length, timestamp: Date.now() });
      return res.json({ totalSize: result.length, done: false, nextRecordsUrl: `/services/data/v${SF_API_VERSION}/query/${locator}`, records: result.slice(0, batchSize) });
    }
    res.json({ totalSize: result.length, done: true, records: result });
  }

  function getQueryBatchSize(req) {
    const hdr = req.headers['sforce-query-options'];
    if (hdr) { const m = hdr.match(/batchSize=(\d+)/); if (m) return Math.min(Math.max(parseInt(m[1]), 200), 2000); }
    return QUERY_DEFAULT_BATCH_SIZE;
  }

  // SOQL Query endpoint (full executor with subqueries, relationship fields, GROUP BY, aggregates)
  app.get(`/services/data/v${SF_API_VERSION}/query/`, ensureAuthenticated, async (req, res) => {
    const q = req.query.q;
    if (!q) {
      return res.status(400).json([{ message: 'Missing query parameter q', errorCode: 'MALFORMED_QUERY' }]);
    }

    // SF CLI sends ?columns=true to get column metadata for display
    if (req.query.columns === 'true') {
      try {
        const parsed = parseSOQL(q);
        const objDef = findObjectDef(parsed.from);
        const fieldDefs = objDef ? (objDef.fields || []) : [];
        // parsed.fields are objects like {type:"field", name:"Id"} or strings like "*"
        const selectFieldNames = parsed.fields
          .filter(f => f !== '*' && typeof f === 'object' && f.name)
          .map(f => f.name);
        const fieldNames = selectFieldNames.length > 0 ? selectFieldNames : fieldDefs.map(f => typeof f === 'string' ? f : f.name);
        const columnMetadata = fieldNames.map(fn => {
          const fd = fieldDefs.find(f => (typeof f === 'string' ? f : f.name) === fn);
          const sfType = fd && typeof fd === 'object' ? (fd.type || 'string') : 'string';
          return { columnName: fn, aggregate: false, apexType: sfType, booleanType: sfType === 'boolean', custom: fn.endsWith('__c'), displayName: fn, foreignKeyName: null, insertable: true, joinColumns: [], numberType: sfType === 'double' || sfType === 'currency' || sfType === 'int', textType: sfType === 'string' || sfType === 'textarea' || sfType === 'id', updatable: true };
        });
        const hasId = fieldNames.some(fn => fn === 'Id');
        return res.json({ columnMetadata, done: true, entityTypeName: parsed.from, groupBy: false, idSelected: hasId, keyPrefix: null, orderBy: false, queryError: null, records: [], totalSize: 0 });
      } catch (e) {
        return res.status(400).json([{ message: e.message, errorCode: 'MALFORMED_QUERY' }]);
      }
    }

    try {
      const parsed = parseSOQL(q);

      if (!canUserAccessObject(req.user, parsed.from, 'read')) {
        return res.status(403).json([{ message: `Insufficient access to ${parsed.from}`, errorCode: 'INSUFFICIENT_ACCESS' }]);
      }

      // SQL push-down: translate SOQL to PostgreSQL query
      const translated = translateSOQL(parsed, DB_PREFIX);

      let records;

      if (!translated.needsPostProcess && (parsed.isCount || parsed.isAggregate || parsed.groupBy)) {
        // Pure SQL path for COUNT, aggregates, GROUP BY
        const rows = await pgService.rawQuery(translated.sql, translated.params);

        if (parsed.isCount) {
          return res.json({ totalSize: parseInt(rows[0].cnt, 10), done: true, records: [{ expr0: parseInt(rows[0].cnt, 10) }] });
        }

        // GROUP BY / aggregate results
        const aggResults = rows.map(row => {
          const r = { attributes: { type: 'AggregateResult' } };
          for (const key of Object.keys(row)) {
            r[key] = row[key] != null && !isNaN(row[key]) ? Number(row[key]) : row[key];
          }
          return r;
        });
        return res.json({ totalSize: aggResults.length, done: true, records: aggResults });
      }

      // Standard SELECT: use SQL for WHERE/ORDER/LIMIT/OFFSET
      const rows = await pgService.rawQuery(translated.sql, translated.params);
      records = rows.map(row => ({ Id: row.Id, ...row.data }));

      // Resolve parent relationship fields (e.g., Account.Name on Contact)
      const parentCaches = {};
      const hasRelFields = parsed.fields.some(f => f.type === 'relationship_field');

      // Resolve child subqueries in SELECT (e.g., (SELECT Id FROM Contacts))
      const childSubqueries = parsed.fields.filter(f => f.type === 'subquery');

      // Apply FLS and project fields
      const result = await Promise.all(records.map(async (record) => {
        const filtered = filterFieldsByFLS(req.user, parsed.from, record);
        const selected = { attributes: { type: parsed.from, url: `/services/data/v${SF_API_VERSION}/sobjects/${parsed.from}/${record.Id}` } };

        for (const f of parsed.fields) {
          if (f.type === 'star') {
            Object.assign(selected, filtered);
          } else if (f.type === 'field') {
            selected[f.name] = filtered[f.name];
          } else if (f.type === 'relationship_field') {
            // Resolve parent relationship: Account.Name -> record.AccountId -> Account table -> Name
            const relPath = f.path;
            const relName = relPath[0];
            const relMap = parentRelationshipMap.get(parsed.from);
            const relInfo = relMap ? (relMap.get(relName) || relMap.get(relName + 'Id')) : null;
            if (relInfo) {
              const lookupId = record[relInfo.lookupField];
              if (lookupId) {
                const cacheKey = relInfo.parentObject;
                if (!parentCaches[cacheKey]) {
                  parentCaches[cacheKey] = await pgService.getAll(fsCollection(relInfo.parentObject));
                }
                const parent = parentCaches[cacheKey].find(r => r.Id === lookupId);
                const targetField = relPath.slice(1).join('.');
                selected[relPath.join('.')] = parent ? parent[targetField] : null;
                // Also set as nested object for SF compat
                if (!selected[relName]) selected[relName] = { attributes: { type: relInfo.parentObject } };
                if (parent) selected[relName][targetField] = parent[targetField];
              } else {
                selected[relPath.join('.')] = null;
              }
            }
          } else if (f.type === 'subquery') {
            // Child subquery: (SELECT Id, Name FROM Contacts) on Account
            const relName = f.relationshipName;
            const childRels = childRelationshipsIndex.get(parsed.from) || [];
            const childRel = childRels.find(cr => cr.relationshipName === relName);
            if (childRel) {
              const cacheKey = '_child_' + childRel.childSObject;
              if (!parentCaches[cacheKey]) {
                parentCaches[cacheKey] = await pgService.getAll(fsCollection(childRel.childSObject));
              }
              const childRecords = parentCaches[cacheKey].filter(cr => cr[childRel.field] === record.Id);
              const childParsed = f.query;
              const projectedChildren = childRecords.map(cr => {
                const sel = { attributes: { type: childRel.childSObject } };
                for (const cf of childParsed.fields) {
                  if (cf.type === 'field') sel[cf.name] = cr[cf.name];
                  else if (cf.type === 'star') Object.assign(sel, cr);
                }
                return sel;
              });
              selected[relName] = { totalSize: projectedChildren.length, done: true, records: projectedChildren };
            }
          }
        }
        return selected;
      }));

      sendQueryResult(res, result, getQueryBatchSize(req));
    } catch (error) {
      res.status(400).json([{ message: error.message, errorCode: 'MALFORMED_QUERY' }]);
    }
  });

  // Query locator endpoint (pagination)
  app.get(`/services/data/v${SF_API_VERSION}/query/:queryLocator`, ensureAuthenticated, (req, res) => {
    const { queryLocator } = req.params;
    const cached = queryResultCache.get(queryLocator);
    if (!cached || Date.now() - cached.timestamp > QUERY_CACHE_TTL) {
      queryResultCache.delete(queryLocator);
      return res.status(400).json([{ message: 'Invalid query locator', errorCode: 'INVALID_QUERY_LOCATOR' }]);
    }
    const batchSize = getQueryBatchSize(req);
    const nextBatch = cached.records.slice(cached.position, cached.position + batchSize);
    cached.position += batchSize;
    const done = cached.position >= cached.records.length;
    if (done) queryResultCache.delete(queryLocator);
    res.json({
      totalSize: cached.totalSize,
      done,
      nextRecordsUrl: done ? undefined : `/services/data/v${SF_API_VERSION}/query/${queryLocator}`,
      records: nextBatch
    });
  });

  // queryAll endpoint (same as query since Pforce has no soft delete)
  app.get(`/services/data/v${SF_API_VERSION}/queryAll/`, ensureAuthenticated, async (req, res) => {
    // Forward to query handler - redirect internally
    const q = req.query.q;
    if (!q) return res.status(400).json([{ message: 'Missing query parameter q', errorCode: 'MALFORMED_QUERY' }]);
    try {
      const parsed = parseSOQL(q);
      if (!canUserAccessObject(req.user, parsed.from, 'read')) {
        return res.status(403).json([{ message: `Insufficient access to ${parsed.from}`, errorCode: 'INSUFFICIENT_ACCESS' }]);
      }
      const translated = translateSOQL(parsed, DB_PREFIX);

      if (parsed.isCount) {
        const rows = await pgService.rawQuery(translated.sql, translated.params);
        return res.json({ totalSize: parseInt(rows[0].cnt, 10), done: true, records: [{ expr0: parseInt(rows[0].cnt, 10) }] });
      }

      const rows = await pgService.rawQuery(translated.sql, translated.params);
      const records = rows.map(row => ({ Id: row.Id, ...row.data }));
      const result = records.map(r => {
        const sel = { attributes: { type: parsed.from, url: `/services/data/v${SF_API_VERSION}/sobjects/${parsed.from}/${r.Id}` } };
        for (const f of parsed.fields) {
          if (f.type === 'star') Object.assign(sel, r);
          else if (f.type === 'field') sel[f.name] = r[f.name];
        }
        return sel;
      });
      sendQueryResult(res, result, getQueryBatchSize(req));
    } catch (error) {
      res.status(400).json([{ message: error.message, errorCode: 'MALFORMED_QUERY' }]);
    }
  });

  // Resolve WHERE subqueries (pre-compute IN subquery results) -- now uses SQL
  async function resolveWhereSubqueries(expr, subCtx) {
    if (!expr) return;
    if (expr.type === 'and' || expr.type === 'or') {
      await resolveWhereSubqueries(expr.left, subCtx);
      await resolveWhereSubqueries(expr.right, subCtx);
    } else if (expr.type === 'not') {
      await resolveWhereSubqueries(expr.expr, subCtx);
    } else if (expr.type === 'in_subquery') {
      const subParsed = expr.subquery;
      const subField = subParsed.fields[0]?.name || 'Id';

      // Use SQL to fetch subquery results
      const translated = translateSOQL(subParsed, DB_PREFIX);
      const rows = await pgService.rawQuery(translated.sql, translated.params);
      const subRecords = rows.map(row => row.Id ? { Id: row.Id, ...row.data } : row);
      const values = new Set(subRecords.map(r => r[subField] || r.Id));
      const key = subqueryKey(expr);
      subCtx.subqueryResults.set(key, values);
    }
  }
}

module.exports = { createSfQueryRoutes };
