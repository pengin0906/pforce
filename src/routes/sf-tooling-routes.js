'use strict';

/**
 * SF Tooling Routes - /services/data/v62.0/tooling/* routes
 * TOOLING_OBJECTS, getToolingRecords
 */

const crypto = require('crypto');

function createSfToolingRoutes(app, ctx) {
  const {
    ensureAuthenticated,
    schemaConfig, SF_API_VERSION,
    tokenizeSOQL, SOQLParser, evaluateWhereExpr
  } = ctx;

  // parseSOQL wrapper
  function parseSOQL(query) {
    const tokens = tokenizeSOQL(query);
    const parser = new SOQLParser(tokens);
    return parser.parse();
  }

  const TOOLING_OBJECTS = {
    CustomObject: { label: 'Custom Object', fields: [
      { name: 'Id', label: 'ID', type: 'id', length: 18, nillable: false },
      { name: 'DeveloperName', label: 'Developer Name', type: 'string', length: 80, nillable: false },
      { name: 'Description', label: 'Description', type: 'string', length: 255, nillable: true },
      { name: 'NamespacePrefix', label: 'Namespace Prefix', type: 'string', length: 15, nillable: true },
      { name: 'ManageableState', label: 'Manageable State', type: 'string', length: 40, nillable: true }
    ]},
    CustomField: { label: 'Custom Field', fields: [
      { name: 'Id', label: 'ID', type: 'id', length: 18, nillable: false },
      { name: 'DeveloperName', label: 'Developer Name', type: 'string', length: 80, nillable: false },
      { name: 'TableEnumOrId', label: 'Object', type: 'string', length: 80, nillable: false },
      { name: 'DataType', label: 'Data Type', type: 'string', length: 40, nillable: true },
      { name: 'FullName', label: 'Full Name', type: 'string', length: 255, nillable: false },
      { name: 'Length', label: 'Length', type: 'double', length: 0, nillable: true }
    ]},
    ValidationRule: { label: 'Validation Rule', fields: [
      { name: 'Id', label: 'ID', type: 'id', length: 18, nillable: false },
      { name: 'Active', label: 'Active', type: 'boolean', length: 0, nillable: false },
      { name: 'Description', label: 'Description', type: 'string', length: 255, nillable: true },
      { name: 'EntityDefinitionId', label: 'Entity Definition ID', type: 'string', length: 80, nillable: false },
      { name: 'ErrorConditionFormula', label: 'Error Condition Formula', type: 'string', length: 4000, nillable: true },
      { name: 'ErrorMessage', label: 'Error Message', type: 'string', length: 255, nillable: true }
    ]},
    ApexClass: { label: 'Apex Class', fields: [
      { name: 'Id', label: 'ID', type: 'id', length: 18, nillable: false },
      { name: 'Name', label: 'Name', type: 'string', length: 255, nillable: false },
      { name: 'Body', label: 'Body', type: 'textarea', length: 0, nillable: true },
      { name: 'Status', label: 'Status', type: 'string', length: 40, nillable: true },
      { name: 'ApiVersion', label: 'API Version', type: 'double', length: 0, nillable: true },
      { name: 'NamespacePrefix', label: 'Namespace Prefix', type: 'string', length: 15, nillable: true }
    ]},
    ApexTrigger: { label: 'Apex Trigger', fields: [
      { name: 'Id', label: 'ID', type: 'id', length: 18, nillable: false },
      { name: 'Name', label: 'Name', type: 'string', length: 255, nillable: false },
      { name: 'Body', label: 'Body', type: 'textarea', length: 0, nillable: true },
      { name: 'TableEnumOrId', label: 'Object', type: 'string', length: 80, nillable: false },
      { name: 'Status', label: 'Status', type: 'string', length: 40, nillable: true },
      { name: 'ApiVersion', label: 'API Version', type: 'double', length: 0, nillable: true }
    ]},
    FlowDefinition: { label: 'Flow Definition', fields: [
      { name: 'Id', label: 'ID', type: 'id', length: 18, nillable: false },
      { name: 'DeveloperName', label: 'Developer Name', type: 'string', length: 255, nillable: false },
      { name: 'ActiveVersionId', label: 'Active Version ID', type: 'id', length: 18, nillable: true },
      { name: 'Description', label: 'Description', type: 'string', length: 255, nillable: true },
      { name: 'NamespacePrefix', label: 'Namespace Prefix', type: 'string', length: 15, nillable: true }
    ]}
  };

  function getToolingRecords(name) {
    const allObjects = [...(schemaConfig.standardObjects || []), ...(schemaConfig.objects || [])];
    switch (name) {
      case 'CustomObject': return (schemaConfig.objects || []).filter(o => o.apiName.endsWith('__c')).map(o => ({
        Id: 'CO_' + o.apiName, DeveloperName: o.apiName.replace(/__c$/, ''), Description: o.description || '',
        NamespacePrefix: '', ManageableState: 'unmanaged', attributes: { type: 'CustomObject' }
      }));
      case 'CustomField': {
        const recs = [];
        for (const o of allObjects) for (const f of (o.fields || [])) recs.push({
          Id: 'CF_' + o.apiName + '.' + f.apiName, DeveloperName: f.apiName.replace(/__c$/, ''),
          TableEnumOrId: o.apiName, DataType: f.type || 'Text', FullName: o.apiName + '.' + f.apiName,
          Length: f.length || 0, attributes: { type: 'CustomField' }
        });
        return recs;
      }
      case 'ValidationRule': {
        const recs = [];
        for (const o of allObjects) for (const vr of (o.validationRules || [])) recs.push({
          Id: 'VR_' + o.apiName + '.' + vr.apiName, Active: vr.active !== false,
          Description: vr.description || '', EntityDefinitionId: o.apiName,
          ErrorConditionFormula: vr.errorConditionFormula || '', ErrorMessage: vr.errorMessage || '',
          attributes: { type: 'ValidationRule' }
        });
        return recs;
      }
      default: return [];
    }
  }

  app.get(`/services/data/v${SF_API_VERSION}/tooling/`, ensureAuthenticated, (req, res) => {
    res.json({ sobjects: `/services/data/v${SF_API_VERSION}/tooling/sobjects/`, query: `/services/data/v${SF_API_VERSION}/tooling/query/` });
  });

  app.get(`/services/data/v${SF_API_VERSION}/tooling/sobjects/`, ensureAuthenticated, (req, res) => {
    const sobjects = Object.entries(TOOLING_OBJECTS).map(([name, def]) => ({
      name, label: def.label, custom: false, queryable: true,
      urls: { sobject: `/services/data/v${SF_API_VERSION}/tooling/sobjects/${name}`, describe: `/services/data/v${SF_API_VERSION}/tooling/sobjects/${name}/describe/` }
    }));
    res.json({ encoding: 'UTF-8', maxBatchSize: 200, sobjects });
  });

  app.get(`/services/data/v${SF_API_VERSION}/tooling/sobjects/:objectName/describe/`, ensureAuthenticated, (req, res) => {
    const def = TOOLING_OBJECTS[req.params.objectName];
    if (!def) return res.status(404).json([{ message: `Not found: ${req.params.objectName}`, errorCode: 'NOT_FOUND' }]);
    res.json({ name: req.params.objectName, label: def.label, custom: false, queryable: true, fields: def.fields.map(f => ({ ...f, updateable: false, createable: false, filterable: true, sortable: true })) });
  });

  app.get(`/services/data/v${SF_API_VERSION}/tooling/query/`, ensureAuthenticated, (req, res) => {
    const q = req.query.q;
    if (!q) return res.status(400).json([{ message: 'Missing q', errorCode: 'MALFORMED_QUERY' }]);
    try {
      const parsed = parseSOQL(q);
      if (!TOOLING_OBJECTS[parsed.from]) return res.status(400).json([{ message: `Unknown tooling object: ${parsed.from}`, errorCode: 'INVALID_TYPE' }]);
      let records = getToolingRecords(parsed.from);
      if (parsed.where) records = records.filter(r => evaluateWhereExpr(r, parsed.where, {}));
      if (parsed.isCount) return res.json({ totalSize: records.length, done: true, records: [{ expr0: records.length }] });
      if (parsed.orderBy && parsed.orderBy.length > 0) {
        records.sort((a, b) => {
          for (const ob of parsed.orderBy) {
            const va = a[ob.field], vb = b[ob.field];
            if (va == null && vb == null) continue;
            if (va == null) return 1; if (vb == null) return -1;
            if (va < vb) return ob.direction === 'ASC' ? -1 : 1;
            if (va > vb) return ob.direction === 'ASC' ? 1 : -1;
          }
          return 0;
        });
      }
      if (parsed.offset) records = records.slice(parsed.offset);
      if (parsed.limit) records = records.slice(0, parsed.limit);
      const result = records.map(r => {
        const sel = { attributes: r.attributes || { type: parsed.from } };
        for (const f of parsed.fields) {
          if (f.type === 'star') Object.assign(sel, r);
          else if (f.type === 'field') sel[f.name] = r[f.name];
        }
        return sel;
      });
      res.json({ totalSize: result.length, done: true, records: result });
    } catch (e) {
      res.status(400).json([{ message: e.message, errorCode: 'MALFORMED_QUERY' }]);
    }
  });

  // Tooling: executeAnonymous (stub - GET and POST)
  app.get(`/services/data/v${SF_API_VERSION}/tooling/executeAnonymous/`, ensureAuthenticated, (req, res) => {
    res.json({ line: -1, column: -1, compiled: true, success: true, compileProblem: null, exceptionMessage: null, exceptionStackTrace: null });
  });
  app.post(`/services/data/v${SF_API_VERSION}/tooling/executeAnonymous/`, ensureAuthenticated, (req, res) => {
    res.json({ line: -1, column: -1, compiled: true, success: true, compileProblem: null, exceptionMessage: null, exceptionStackTrace: null });
  });

  // Tooling: CRUD create (stub)
  app.post(`/services/data/v${SF_API_VERSION}/tooling/sobjects/:objectName/`, ensureAuthenticated, (req, res) => {
    res.status(201).json({ id: crypto.randomUUID().replace(/-/g, '').slice(0, 18), success: true, errors: [] });
  });
}

module.exports = { createSfToolingRoutes };
