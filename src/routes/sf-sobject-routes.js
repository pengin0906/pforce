'use strict';

/**
 * SF sObject Routes - Describe Global, Describe Object, sObject CRUD, Upsert by External ID
 * Also includes the API version rewrite middleware.
 */

function createSfSobjectRoutes(app, ctx) {
  const {
    ensureAuthenticated, canUserAccessObject, filterFieldsByFLS,
    getFieldLevelSecurity, getAccessibleObjects,
    pgService, sfId, fsCollection, findObjectDef, validateRecord,
    schemaConfig, accessControlConfig, SF_API_VERSION,
    childRelationshipsIndex, soapTypeMap
  } = ctx;

  // Rewrite any API version to our supported version (jsforce may use v50.0, v58.0, etc.)
  app.use('/services/data/', (req, res, next) => {
    req.url = req.url.replace(/^\/v\d+\.\d+\//, `/v${SF_API_VERSION}/`);
    next();
  });

  // API Version Info
  app.get('/services/data/', (req, res) => {
    res.json([{ label: `Pforce API v${SF_API_VERSION}`, url: `/services/data/v${SF_API_VERSION}`, version: SF_API_VERSION }]);
  });
  app.get('/services/data', (req, res) => {
    res.json([{ label: `Pforce API v${SF_API_VERSION}`, url: `/services/data/v${SF_API_VERSION}`, version: SF_API_VERSION }]);
  });

  app.get(`/services/data/v${SF_API_VERSION}/`, ensureAuthenticated, (req, res) => {
    res.json({
      sobjects: `/services/data/v${SF_API_VERSION}/sobjects/`,
      query: `/services/data/v${SF_API_VERSION}/query/`,
      tooling: `/services/data/v${SF_API_VERSION}/tooling/`,
      metadata: `/services/data/v${SF_API_VERSION}/metadata/`
    });
  });

  // Describe Global - list all objects
  app.get(`/services/data/v${SF_API_VERSION}/sobjects/`, ensureAuthenticated, (req, res) => {
    const objectNames = getAccessibleObjects(req.user);
    const allObjects = [...(schemaConfig.objects || []), ...(schemaConfig.standardObjects || [])];

    const sobjects = objectNames.map(name => {
      const def = allObjects.find(o => o.apiName === name);
      return {
        name: name,
        label: def ? def.label : name,
        labelPlural: def ? (def.pluralLabel || def.label) : name,
        custom: name.endsWith('__c'),
        queryable: true,
        createable: canUserAccessObject(req.user, name, 'create'),
        updateable: canUserAccessObject(req.user, name, 'edit'),
        deletable: canUserAccessObject(req.user, name, 'delete'),
        urls: {
          sobject: `/services/data/v${SF_API_VERSION}/sobjects/${name}`,
          describe: `/services/data/v${SF_API_VERSION}/sobjects/${name}/describe/`,
          rowTemplate: `/services/data/v${SF_API_VERSION}/sobjects/${name}/{ID}`
        }
      };
    });

    res.json({ encoding: 'UTF-8', maxBatchSize: 200, sobjects });
  });

  // Describe Object
  app.get(`/services/data/v${SF_API_VERSION}/sobjects/:objectName/describe/`, ensureAuthenticated, (req, res) => {
    const { objectName } = req.params;
    if (!canUserAccessObject(req.user, objectName, 'read')) {
      return res.status(403).json([{ message: 'Access denied', errorCode: 'INSUFFICIENT_ACCESS' }]);
    }

    const allObjects = [...(schemaConfig.objects || []), ...(schemaConfig.standardObjects || [])];
    const objDef = allObjects.find(o => o.apiName === objectName);

    const keyPrefix = sfId.getKeyPrefix(objectName);
    const fields = [];
    // Always add Id field
    fields.push({ name: 'Id', label: 'レコードID', type: 'id', soapType: 'tns:ID', length: 18, nillable: false, updateable: false, createable: false, filterable: true, sortable: true, groupable: true, aggregatable: true, idLookup: true });

    if (objDef) {
      // Name field
      if (objDef.nameField) {
        fields.push({
          name: objDef.nameField.apiName || 'Name',
          label: objDef.nameField.label || '名前',
          type: objDef.nameField.type === 'AutoNumber' ? 'string' : 'string',
          length: objDef.nameField.length || 255,
          nillable: false,
          updateable: objDef.nameField.type !== 'AutoNumber',
          createable: objDef.nameField.type !== 'AutoNumber',
          nameField: true,
          filterable: true,
          sortable: true
        });
      }

      // Other fields
      for (const f of (objDef.fields || [])) {
        const typeMap = {
          'Text': 'string', 'LongTextArea': 'textarea', 'Email': 'email', 'Phone': 'phone',
          'Url': 'url', 'Number': 'double', 'Currency': 'currency', 'Percent': 'percent',
          'Picklist': 'picklist', 'MultiselectPicklist': 'multipicklist', 'Date': 'date',
          'DateTime': 'datetime', 'Checkbox': 'boolean', 'Lookup': 'reference',
          'MasterDetail': 'reference', 'Formula': 'string', 'AutoNumber': 'string'
        };

        const mappedType = typeMap[f.type] || 'string';
        const field = {
          name: f.apiName,
          label: f.label,
          type: mappedType,
          soapType: soapTypeMap[mappedType] || 'xsd:string',
          length: f.length || (mappedType === 'string' ? 255 : 0),
          precision: f.precision || (mappedType === 'double' || mappedType === 'currency' || mappedType === 'percent' ? 18 : 0),
          scale: f.scale || 0,
          nillable: !f.required,
          updateable: f.type !== 'Formula' && f.type !== 'AutoNumber',
          createable: f.type !== 'Formula' && f.type !== 'AutoNumber',
          filterable: true,
          sortable: mappedType !== 'textarea' && mappedType !== 'multipicklist',
          groupable: mappedType !== 'textarea' && mappedType !== 'multipicklist' && mappedType !== 'base64',
          aggregatable: mappedType !== 'textarea' && mappedType !== 'base64',
          namePointing: mappedType === 'reference' && (f.apiName === 'OwnerId' || f.apiName === 'WhoId' || f.apiName === 'WhatId'),
          calculated: f.type === 'Formula',
          autoNumber: f.type === 'AutoNumber',
          htmlFormatted: false,
          deprecatedAndHidden: false,
          externalId: f.externalId || false,
          unique: f.unique || false,
          defaultValue: f.defaultValue !== undefined ? f.defaultValue : null,
          inlineHelpText: f.inlineHelpText || null
        };

        if (f.type === 'Picklist' || f.type === 'MultiselectPicklist') {
          field.picklistValues = (f.values || []).map(v => ({ value: v, label: v, active: true, defaultValue: false }));
        }
        if (f.referenceTo) {
          field.referenceTo = [f.referenceTo];
          field.relationshipName = f.relationshipName || null;
        }

        fields.push(field);
      }
    }

    // Apply FLS
    const fls = getFieldLevelSecurity(req.user, objectName);
    const visibleFields = fields.filter(f => {
      const flsEntry = fls[f.name];
      return !flsEntry || flsEntry.visible !== false;
    });

    res.json({
      name: objectName,
      label: objDef ? objDef.label : objectName,
      labelPlural: objDef ? (objDef.pluralLabel || objDef.label) : objectName,
      keyPrefix: keyPrefix || null,
      custom: objectName.endsWith('__c'),
      queryable: true,
      createable: canUserAccessObject(req.user, objectName, 'create'),
      updateable: canUserAccessObject(req.user, objectName, 'edit'),
      deletable: canUserAccessObject(req.user, objectName, 'delete'),
      fields: visibleFields,
      childRelationships: (childRelationshipsIndex.get(objectName) || []),
      recordTypeInfos: (objDef?.recordTypes || []).map(rt => ({
        name: rt.apiName, label: rt.label, active: rt.active !== false, defaultRecordTypeMapping: false
      })),
      urls: {
        sobject: `/services/data/v${SF_API_VERSION}/sobjects/${objectName}`,
        describe: `/services/data/v${SF_API_VERSION}/sobjects/${objectName}/describe/`,
        rowTemplate: `/services/data/v${SF_API_VERSION}/sobjects/${objectName}/{ID}`
      }
    });
  });

  // sObject CRUD - GET single record
  app.get(`/services/data/v${SF_API_VERSION}/sobjects/:objectName/:id`, ensureAuthenticated, async (req, res) => {
    const { objectName, id } = req.params;
    if (!canUserAccessObject(req.user, objectName, 'read')) {
      return res.status(403).json([{ message: 'Insufficient access', errorCode: 'INSUFFICIENT_ACCESS' }]);
    }
    try {
      let record = await pgService.getById(fsCollection(objectName), id);
      if (!record && objectName === 'User' && id.startsWith('005')) {
        // SF CLI expects to look up the logged-in user by ID; generate a stub
        record = {
          Id: id, Username: req.user?.email || 'admin@pforce.dev',
          Email: req.user?.email || 'admin@pforce.dev',
          FirstName: 'Pforce', LastName: 'Admin',
          Name: 'Pforce Admin', Alias: 'padmin',
          IsActive: true, ProfileId: 'System_Admin',
          UserRoleId: null, Department: null, Title: null,
        };
      }
      if (!record) {
        return res.status(404).json([{ message: `Record not found: ${id}`, errorCode: 'NOT_FOUND' }]);
      }
      const filtered = filterFieldsByFLS(req.user, objectName, record);
      const requestedFields = req.query.fields ? req.query.fields.split(',').map(f => f.trim()) : null;
      let result;
      if (requestedFields) {
        result = { attributes: { type: objectName, url: `/services/data/v${SF_API_VERSION}/sobjects/${objectName}/${id}` } };
        for (const f of requestedFields) {
          if (f in filtered) result[f] = filtered[f];
        }
      } else {
        result = { ...filtered, attributes: { type: objectName, url: `/services/data/v${SF_API_VERSION}/sobjects/${objectName}/${id}` } };
      }
      res.json(result);
    } catch (error) {
      res.status(500).json([{ message: error.message, errorCode: 'UNKNOWN_EXCEPTION' }]);
    }
  });

  // sObject CRUD - CREATE
  app.post(`/services/data/v${SF_API_VERSION}/sobjects/:objectName/`, ensureAuthenticated, async (req, res) => {
    const { objectName } = req.params;
    if (!canUserAccessObject(req.user, objectName, 'create')) {
      return res.status(403).json([{ message: 'Insufficient access', errorCode: 'INSUFFICIENT_ACCESS' }]);
    }
    try {
      // Validation Rule enforcement
      const vrErrors = validateRecord(objectName, req.body, schemaConfig);
      if (vrErrors.length > 0) {
        return res.status(400).json(vrErrors.map(e => ({ message: e, errorCode: 'FIELD_CUSTOM_VALIDATION_EXCEPTION', fields: [] })));
      }
      const newRecord = await pgService.create(fsCollection(objectName), {
        ...req.body
      });
      res.status(201).json({ id: newRecord.Id, success: true, errors: [] });
    } catch (error) {
      res.status(400).json([{ message: error.message, errorCode: 'INVALID_FIELD' }]);
    }
  });

  // sObject CRUD - UPSERT by External ID
  app.patch(`/services/data/v${SF_API_VERSION}/sobjects/:objectName/:externalIdField/:externalIdValue`, ensureAuthenticated, async (req, res) => {
    const { objectName, externalIdField, externalIdValue } = req.params;
    try {
      const records = await pgService.getAll(fsCollection(objectName));
      const existing = records.find(r => String(r[externalIdField]) === String(externalIdValue));
      if (existing) {
        if (!canUserAccessObject(req.user, objectName, 'edit')) {
          return res.status(403).json([{ message: 'Insufficient access', errorCode: 'INSUFFICIENT_ACCESS' }]);
        }
        const merged = { ...existing, ...req.body };
        const vrErrors = validateRecord(objectName, merged, schemaConfig);
        if (vrErrors.length > 0) {
          return res.status(400).json(vrErrors.map(e => ({ message: e, errorCode: 'FIELD_CUSTOM_VALIDATION_EXCEPTION', fields: [] })));
        }
        await pgService.update(fsCollection(objectName), existing.Id, req.body);
        res.status(200).json({ id: existing.Id, success: true, errors: [], created: false });
      } else {
        if (!canUserAccessObject(req.user, objectName, 'create')) {
          return res.status(403).json([{ message: 'Insufficient access', errorCode: 'INSUFFICIENT_ACCESS' }]);
        }
        const newData = { ...req.body, [externalIdField]: externalIdValue };
        const vrErrors = validateRecord(objectName, newData, schemaConfig);
        if (vrErrors.length > 0) {
          return res.status(400).json(vrErrors.map(e => ({ message: e, errorCode: 'FIELD_CUSTOM_VALIDATION_EXCEPTION', fields: [] })));
        }
        const created = await pgService.create(fsCollection(objectName), newData);
        res.status(201).json({ id: created.Id, success: true, errors: [], created: true });
      }
    } catch (error) {
      res.status(400).json([{ message: error.message, errorCode: 'INVALID_FIELD' }]);
    }
  });

  // sObject CRUD - UPDATE (PATCH)
  app.patch(`/services/data/v${SF_API_VERSION}/sobjects/:objectName/:id`, ensureAuthenticated, async (req, res) => {
    const { objectName, id } = req.params;
    if (!canUserAccessObject(req.user, objectName, 'edit')) {
      return res.status(403).json([{ message: 'Insufficient access', errorCode: 'INSUFFICIENT_ACCESS' }]);
    }
    try {
      // Validation Rule enforcement - merge existing record with updates
      const existing = await pgService.getById(fsCollection(objectName), id);
      const merged = { ...(existing || {}), ...req.body };
      const vrErrors = validateRecord(objectName, merged, schemaConfig);
      if (vrErrors.length > 0) {
        return res.status(400).json(vrErrors.map(e => ({ message: e, errorCode: 'FIELD_CUSTOM_VALIDATION_EXCEPTION', fields: [] })));
      }
      await pgService.update(fsCollection(objectName), id, req.body);
      res.status(204).send();
    } catch (error) {
      res.status(400).json([{ message: error.message, errorCode: 'INVALID_FIELD' }]);
    }
  });

  // sObject CRUD - DELETE
  app.delete(`/services/data/v${SF_API_VERSION}/sobjects/:objectName/:id`, ensureAuthenticated, async (req, res) => {
    const { objectName, id } = req.params;
    if (!canUserAccessObject(req.user, objectName, 'delete')) {
      return res.status(403).json([{ message: 'Insufficient access', errorCode: 'INSUFFICIENT_ACCESS' }]);
    }
    try {
      await pgService.remove(fsCollection(objectName), id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json([{ message: error.message, errorCode: 'UNKNOWN_EXCEPTION' }]);
    }
  });
}

module.exports = { createSfSobjectRoutes };
