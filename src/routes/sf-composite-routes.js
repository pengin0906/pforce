'use strict';

/**
 * SF Composite Routes - /services/data/v62.0/composite/* routes
 * executeSubRequest, resolveReferences, SObject tree, collections
 */

function createSfCompositeRoutes(app, ctx) {
  const {
    ensureAuthenticated, canUserAccessObject,
    pgService, sfId, fsCollection, findObjectDef, validateRecord,
    schemaConfig, SF_API_VERSION, DB_PREFIX,
    childRelationshipsIndex,
    tokenizeSOQL, SOQLParser, evaluateWhereExpr,
    translateSOQL
  } = ctx;

  // parseSOQL wrapper
  function parseSOQL(query) {
    const tokens = tokenizeSOQL(query);
    const parser = new SOQLParser(tokens);
    return parser.parse();
  }

  // Access control helper for sub-requests
  function checkAccess(user, objName, action) {
    if (!canUserAccessObject(user, objName, action)) {
      return { statusCode: 403, body: [{ message: `Access denied: ${action} on ${objName}`, errorCode: 'INSUFFICIENT_ACCESS' }] };
    }
    return null;
  }

  async function executeSubRequest(method, urlPath, body, user) {
    if (!user) {
      return { statusCode: 401, body: [{ message: 'Authentication required', errorCode: 'INVALID_SESSION_ID' }] };
    }

    const vp = `/services/data/v${SF_API_VERSION}`;
    const vpEsc = vp.replace(/\./g, '\\.');
    try {
      // SOQL Query
      const qm = urlPath.match(new RegExp(`^${vpEsc}/query/\\?q=(.+)$`));
      if (qm && method.toUpperCase() === 'GET') {
        const q = decodeURIComponent(qm[1].replace(/\+/g, ' '));
        const parsed = parseSOQL(q);
        // Check read access on queried object
        const denied = checkAccess(user, parsed.from, 'read');
        if (denied) return denied;
        const translated = translateSOQL(parsed, DB_PREFIX);
        if (parsed.isCount) {
          const rows = await pgService.rawQuery(translated.sql, translated.params);
          const cnt = parseInt(rows[0].cnt, 10);
          return { statusCode: 200, body: { totalSize: cnt, done: true, records: [{ expr0: cnt }] } };
        }
        const rows = await pgService.rawQuery(translated.sql, translated.params);
        const records = rows.map(row => ({ Id: row.Id, ...row.data }));
        const result = records.map(r => {
          const sel = { attributes: { type: parsed.from } };
          for (const f of parsed.fields) {
            if (f.type === 'star') Object.assign(sel, r);
            else if (f.type === 'field') sel[f.name] = r[f.name];
          }
          return sel;
        });
        return { statusCode: 200, body: { totalSize: result.length, done: true, records: result } };
      }
      // Describe
      const dm = urlPath.match(new RegExp(`^${vpEsc}/sobjects/(\\w+)/describe/?$`));
      if (dm && method.toUpperCase() === 'GET') {
        const objName = dm[1];
        const denied = checkAccess(user, objName, 'read');
        if (denied) return denied;
        const objDef = findObjectDef(objName);
        if (!objDef) return { statusCode: 404, body: [{ message: `Object not found: ${objName}`, errorCode: 'NOT_FOUND' }] };
        return { statusCode: 200, body: { name: objName, label: objDef.label || objName, fields: (objDef.fields || []).map(f => ({ name: f.apiName, label: f.label || f.apiName, type: f.type || 'string' })) } };
      }
      // Upsert by External ID
      const upsertMatch = urlPath.match(new RegExp(`^${vpEsc}/sobjects/(\\w+)/(\\w+)/(.+)$`));
      if (upsertMatch && method.toUpperCase() === 'PATCH') {
        const [, objName, extField, extValue] = upsertMatch;
        const denied = checkAccess(user, objName, 'edit');
        if (denied) return denied;
        const records = await pgService.query(fsCollection(objName), {
          where: [{ field: extField, op: '==', value: String(extValue) }],
          limit: 1
        });
        const existing = records[0];
        if (existing) {
          await pgService.update(fsCollection(objName), existing.Id, body);
          return { statusCode: 200, body: { id: existing.Id, success: true, errors: [], created: false } };
        } else {
          const createDenied = checkAccess(user, objName, 'create');
          if (createDenied) return createDenied;
          const created = await pgService.create(fsCollection(objName), { ...body, [extField]: extValue });
          return { statusCode: 201, body: { id: created.Id, success: true, errors: [], created: true } };
        }
      }
      // sObject CRUD
      const sm = urlPath.match(new RegExp(`^${vpEsc}/sobjects/(\\w+)/?(?:([\\w-]+))?$`));
      if (sm) {
        const objName = sm[1], recId = sm[2];
        const M = method.toUpperCase();
        if (M === 'GET' && recId) {
          const denied = checkAccess(user, objName, 'read');
          if (denied) return denied;
          const rec = await pgService.getById(fsCollection(objName), recId);
          if (!rec) return { statusCode: 404, body: [{ message: 'Not found', errorCode: 'NOT_FOUND' }] };
          rec.attributes = { type: objName };
          return { statusCode: 200, body: rec };
        }
        if (M === 'POST' && !recId) {
          const denied = checkAccess(user, objName, 'create');
          if (denied) return denied;
          const created = await pgService.create(fsCollection(objName), body);
          return { statusCode: 201, body: { id: created.Id, success: true, errors: [] } };
        }
        if (M === 'PATCH' && recId) {
          const denied = checkAccess(user, objName, 'edit');
          if (denied) return denied;
          await pgService.update(fsCollection(objName), recId, body);
          return { statusCode: 204, body: null };
        }
        if (M === 'DELETE' && recId) {
          const denied = checkAccess(user, objName, 'delete');
          if (denied) return denied;
          await pgService.remove(fsCollection(objName), recId);
          return { statusCode: 204, body: null };
        }
      }
      return { statusCode: 404, body: [{ message: 'Not found', errorCode: 'NOT_FOUND' }] };
    } catch (e) {
      return { statusCode: 400, body: [{ message: e.message, errorCode: 'UNKNOWN_EXCEPTION' }] };
    }
  }

  function resolveReferences(value, refResults) {
    if (typeof value === 'string') {
      return value.replace(/@\{(\w+)\.(\w+)\}/g, (_, refId, field) => {
        const ref = refResults[refId];
        return ref && ref[field] != null ? String(ref[field]) : '';
      });
    }
    if (Array.isArray(value)) return value.map(v => resolveReferences(v, refResults));
    if (value && typeof value === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(value)) out[k] = resolveReferences(v, refResults);
      return out;
    }
    return value;
  }

  // Composite: sequential execution with referenceId
  app.post(`/services/data/v${SF_API_VERSION}/composite/`, ensureAuthenticated, async (req, res) => {
    const { allOrNone, compositeRequest } = req.body;
    if (!compositeRequest || !Array.isArray(compositeRequest)) {
      return res.status(400).json([{ message: 'Missing compositeRequest', errorCode: 'INVALID_INPUT' }]);
    }
    const compositeResponse = [];
    const refResults = {};
    for (const sub of compositeRequest) {
      let url = resolveReferences(sub.url, refResults);
      let body = sub.body ? resolveReferences(sub.body, refResults) : undefined;
      const result = await executeSubRequest(sub.method, url, body, req.user);
      compositeResponse.push({ body: result.body, httpHeaders: {}, httpStatusCode: result.statusCode, referenceId: sub.referenceId });
      if (result.body && sub.referenceId) refResults[sub.referenceId] = result.body;
      if (allOrNone && result.statusCode >= 400) break;
    }
    res.json({ compositeResponse });
  });

  // Batch: parallel execution
  app.post(`/services/data/v${SF_API_VERSION}/composite/batch/`, ensureAuthenticated, async (req, res) => {
    const { batchRequests } = req.body;
    if (!batchRequests || !Array.isArray(batchRequests)) {
      return res.status(400).json([{ message: 'Missing batchRequests', errorCode: 'INVALID_INPUT' }]);
    }
    const settled = await Promise.allSettled(
      batchRequests.map(sub => executeSubRequest(sub.method, sub.url, sub.richInput || sub.body, req.user))
    );
    let hasErrors = false;
    const results = settled.map(s => {
      if (s.status === 'fulfilled') {
        if (s.value.statusCode >= 400) hasErrors = true;
        return { statusCode: s.value.statusCode, result: s.value.body };
      }
      hasErrors = true;
      return { statusCode: 500, result: [{ message: s.reason?.message || 'Unknown error', errorCode: 'UNKNOWN_EXCEPTION' }] };
    });
    res.json({ hasErrors, results });
  });

  // SObject Tree: create parent + children
  app.post(`/services/data/v${SF_API_VERSION}/composite/tree/:objectName/`, ensureAuthenticated, async (req, res) => {
    const { objectName } = req.params;
    const { records: inputRecords } = req.body;
    if (!inputRecords || !Array.isArray(inputRecords)) {
      return res.status(400).json([{ message: 'Missing records', errorCode: 'INVALID_INPUT' }]);
    }
    const results = [];
    let hasErrors = false;
    try {
      for (const rec of inputRecords) {
        const { attributes, ...fields } = rec;
        const childKeys = {};
        const parentFields = {};
        for (const [k, v] of Object.entries(fields)) {
          if (v && typeof v === 'object' && v.records) childKeys[k] = v;
          else parentFields[k] = v;
        }
        const parent = await pgService.create(fsCollection(objectName), parentFields);
        results.push({ referenceId: attributes?.referenceId || parent.Id, id: parent.Id });
        // Create children
        const childRels = childRelationshipsIndex.get(objectName) || [];
        for (const [relName, childData] of Object.entries(childKeys)) {
          const rel = childRels.find(cr => cr.relationshipName === relName);
          if (rel) {
            for (const childRec of childData.records) {
              const { attributes: cAttr, ...cFields } = childRec;
              cFields[rel.field] = parent.Id;
              const child = await pgService.create(fsCollection(rel.childSObject), cFields);
              results.push({ referenceId: cAttr?.referenceId || child.Id, id: child.Id });
            }
          }
        }
      }
    } catch (e) {
      hasErrors = true;
    }
    res.json({ hasErrors, results });
  });

  // SObject Collections: Create
  app.post(`/services/data/v${SF_API_VERSION}/composite/sobjects/`, ensureAuthenticated, async (req, res) => {
    const { records: inputRecords, allOrNone } = req.body;
    if (!inputRecords) return res.status(400).json([{ message: 'Missing records', errorCode: 'INVALID_INPUT' }]);
    const results = [];
    for (const rec of inputRecords) {
      try {
        const objType = rec.attributes?.type;
        if (!objType) { results.push({ id: null, success: false, errors: [{ message: 'Missing attributes.type', statusCode: 'INVALID_INPUT' }] }); continue; }
        const { attributes, ...fields } = rec;
        const created = await pgService.create(fsCollection(objType), fields);
        results.push({ id: created.Id, success: true, errors: [] });
      } catch (e) {
        results.push({ id: null, success: false, errors: [{ message: e.message, statusCode: 'UNKNOWN_EXCEPTION' }] });
        if (allOrNone) break;
      }
    }
    res.json(results);
  });

  // SObject Collections: Update
  app.patch(`/services/data/v${SF_API_VERSION}/composite/sobjects/`, ensureAuthenticated, async (req, res) => {
    const { records: inputRecords, allOrNone } = req.body;
    if (!inputRecords) return res.status(400).json([{ message: 'Missing records', errorCode: 'INVALID_INPUT' }]);
    const results = [];
    for (const rec of inputRecords) {
      try {
        const objType = rec.attributes?.type;
        const id = rec.Id;
        if (!objType || !id) { results.push({ id: null, success: false, errors: [{ message: 'Missing attributes.type or Id' }] }); continue; }
        const { attributes, Id, ...fields } = rec;
        await pgService.update(fsCollection(objType), id, fields);
        results.push({ id, success: true, errors: [] });
      } catch (e) {
        results.push({ id: rec.Id || null, success: false, errors: [{ message: e.message }] });
        if (allOrNone) break;
      }
    }
    res.json(results);
  });

  // SObject Collections: Delete
  app.delete(`/services/data/v${SF_API_VERSION}/composite/sobjects/`, ensureAuthenticated, async (req, res) => {
    const ids = (req.query.ids || '').split(',').filter(Boolean);
    if (!ids.length) return res.status(400).json([{ message: 'Missing ids', errorCode: 'INVALID_INPUT' }]);
    const results = [];
    for (const id of ids) {
      try {
        const objType = sfId.getObjectType(id);
        if (!objType) { results.push({ id, success: false, errors: [{ message: 'Unknown object type for ID' }] }); continue; }
        await pgService.remove(fsCollection(objType), id);
        results.push({ id, success: true, errors: [] });
      } catch (e) {
        results.push({ id, success: false, errors: [{ message: e.message }] });
      }
    }
    res.json(results);
  });
}

module.exports = { createSfCompositeRoutes };
