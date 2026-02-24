'use strict';

/**
 * Data Routes - /api/data/:objectName CRUD, lookup, related records
 * Also includes fsCollection and resolveLookupNames helpers
 */

function createDataRoutes(app, ctx) {
  const { ensureAuthenticated, canUserAccessObject, filterFieldsByFLS, pgService, fsCollection, resolveLookupNames, findObjectDef, validateRecord, schemaConfig } = ctx;

  // GET list
  app.get('/api/data/:objectName', ensureAuthenticated, async (req, res) => {
    const { objectName } = req.params;

    if (!canUserAccessObject(req.user, objectName, 'read')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    try {
      const page = parseInt(req.query.page) || 0;
      const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize) || 25));
      const sortBy = req.query.sortBy || 'LastModifiedDate';
      const sortDir = (req.query.sortDir || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      const searchQ = req.query.q || '';

      // If no page param, return all records (backward compatibility)
      if (!req.query.page) {
        const dateField = req.query.dateField;
        const fromDate = req.query.from;
        const toDate = req.query.to;
        let records;
        if (dateField && fromDate && toDate) {
          // Use DB WHERE clause for date range (uses index)
          const { records: dbRecs } = await pgService.queryWithCount(fsCollection(objectName), {
            where: [
              { field: dateField, op: '>=', value: fromDate },
              { field: dateField, op: '<=', value: toDate }
            ],
            orderBy: [{ field: dateField, direction: 'ASC' }]
          });
          records = dbRecs;
        } else {
          records = await pgService.getAll(fsCollection(objectName));
        }
        const filtered = records.map(record =>
          filterFieldsByFLS(req.user, objectName, record)
        );
        return res.json({
          object: objectName,
          records: filtered,
          totalSize: filtered.length
        });
      }

      // Server-side paginated query
      const where = [];
      if (searchQ) {
        // Search across Name and other text fields
        const objDef = findObjectDef(objectName);
        const searchFields = ['Name'];
        if (objDef && objDef.fields) {
          for (const f of objDef.fields) {
            if (['Text', 'Email', 'Phone', 'Url'].includes(f.type) && f.apiName !== 'Name') {
              searchFields.push(f.apiName);
            }
          }
        }
        where.push({ op: 'OR_LIKE', fields: searchFields, value: `%${searchQ}%` });
      }

      // Filter params: filter[FieldName]=value
      if (req.query.filter && typeof req.query.filter === 'object') {
        for (const [field, value] of Object.entries(req.query.filter)) {
          where.push({ field, op: '==', value });
        }
      }

      const queryOpts = {
        where: where.length > 0 ? where : undefined,
        orderBy: [{ field: sortBy, direction: sortDir }],
        limit: pageSize,
        offset: (page - 1) * pageSize
      };

      const { records, totalSize } = await pgService.queryWithCount(
        fsCollection(objectName), queryOpts
      );

      const filtered = records.map(record =>
        filterFieldsByFLS(req.user, objectName, record)
      );

      // Resolve lookup display names
      const lookupNames = await resolveLookupNames(objectName, filtered);

      const pageCount = Math.ceil(totalSize / pageSize);

      res.json({
        object: objectName,
        records: filtered,
        totalSize,
        page,
        pageSize,
        pageCount,
        done: page >= pageCount,
        lookupNames
      });
    } catch (error) {
      console.error(`[ERROR] GET ${objectName}:`, error);
      res.status(500).json({ error: 'Failed to fetch data' });
    }
  });

  // Lightweight lookup endpoint (Id + Name only, for dropdowns)
  app.get('/api/data/:objectName/lookup', ensureAuthenticated, async (req, res) => {
    const { objectName } = req.params;
    if (!canUserAccessObject(req.user, objectName, 'read')) {
      return res.status(403).json({ error: 'Access denied' });
    }
    try {
      const searchQ = req.query.q || '';
      const limit = Math.min(500, parseInt(req.query.limit) || 200);
      const where = searchQ ? [{ field: 'Name', op: 'LIKE', value: `%${searchQ}%` }] : [];
      const records = await pgService.query(fsCollection(objectName), {
        where: where.length > 0 ? where : undefined,
        orderBy: [{ field: 'Name', direction: 'ASC' }],
        limit
      });
      const results = records.map(r => ({
        Id: r.Id,
        Name: r.Name || r.LastName || r.Subject || r.Username || r.Id
      }));
      res.json({ records: results });
    } catch (error) {
      console.error(`[ERROR] GET ${objectName}/lookup:`, error);
      res.status(500).json({ error: 'Failed to fetch lookup data' });
    }
  });

  // GET by ID
  app.get('/api/data/:objectName/:id', ensureAuthenticated, async (req, res) => {
    const { objectName, id } = req.params;

    if (!canUserAccessObject(req.user, objectName, 'read')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    try {
      const record = await pgService.getById(fsCollection(objectName), id);
      if (!record) {
        return res.status(404).json({ error: 'Not found' });
      }
      res.json(filterFieldsByFLS(req.user, objectName, record));
    } catch (error) {
      console.error(`[ERROR] GET ${objectName}/${id}:`, error);
      res.status(500).json({ error: 'Failed to fetch record' });
    }
  });

  // POST create
  app.post('/api/data/:objectName', ensureAuthenticated, async (req, res) => {
    const { objectName } = req.params;

    if (!canUserAccessObject(req.user, objectName, 'create')) {
      return res.status(403).json({ error: 'Create permission denied' });
    }

    try {
      // Validation Rule enforcement
      const vrErrors = validateRecord(objectName, req.body, schemaConfig);
      if (vrErrors.length > 0) {
        return res.status(400).json({ error: vrErrors[0], validationErrors: vrErrors });
      }
      const newRecord = await pgService.create(fsCollection(objectName), {
        ...req.body
      });

      res.status(201).json({
        Id: newRecord.Id,
        success: true,
        record: newRecord
      });
    } catch (error) {
      console.error(`[ERROR] POST ${objectName}:`, error);
      res.status(500).json({ error: 'Failed to create record' });
    }
  });

  // PUT update
  app.put('/api/data/:objectName/:id', ensureAuthenticated, async (req, res) => {
    const { objectName, id } = req.params;

    if (!canUserAccessObject(req.user, objectName, 'edit')) {
      return res.status(403).json({ error: 'Edit permission denied' });
    }

    try {
      // Validation Rule enforcement
      const existing = await pgService.getById(fsCollection(objectName), id);
      const merged = { ...(existing || {}), ...req.body };
      const vrErrors = validateRecord(objectName, merged, schemaConfig);
      if (vrErrors.length > 0) {
        return res.status(400).json({ error: vrErrors[0], validationErrors: vrErrors });
      }
      const record = await pgService.update(fsCollection(objectName), id, req.body);

      res.json({
        Id: id,
        success: true,
        record: record
      });
    } catch (error) {
      console.error(`[ERROR] PUT ${objectName}/${id}:`, error);
      res.status(500).json({ error: 'Failed to update record' });
    }
  });

  // DELETE
  app.delete('/api/data/:objectName/:id', ensureAuthenticated, async (req, res) => {
    const { objectName, id } = req.params;

    if (!canUserAccessObject(req.user, objectName, 'delete')) {
      return res.status(403).json({ error: 'Delete permission denied' });
    }

    try {
      await pgService.remove(fsCollection(objectName), id);

      res.json({
        Id: id,
        success: true
      });
    } catch (error) {
      console.error(`[ERROR] DELETE ${objectName}/${id}:`, error);
      res.status(500).json({ error: 'Failed to delete record' });
    }
  });

  // Related records endpoint (paginated)
  app.get('/api/data/:objectName/:id/related/:childObject', ensureAuthenticated, async (req, res) => {
    const { objectName, id, childObject } = req.params;
    const lookupField = req.query.lookupField;
    if (!lookupField) {
      return res.status(400).json({ error: 'Missing lookupField parameter' });
    }
    // Validate lookupField name (prevent injection via field names)
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(lookupField)) {
      return res.status(400).json({ error: 'Invalid lookupField parameter' });
    }
    // Check access on BOTH parent and child objects
    if (!canUserAccessObject(req.user, objectName, 'read')) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!canUserAccessObject(req.user, childObject, 'read')) {
      return res.status(403).json({ error: 'Access denied' });
    }
    try {
      // Verify the parent record exists and user can access it
      const parentRecord = await pgService.getById(fsCollection(objectName), id);
      if (!parentRecord) {
        return res.status(404).json({ error: 'Parent record not found' });
      }
      const page = parseInt(req.query.page) || 1;
      const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize) || 25));
      const { records, totalSize } = await pgService.queryWithCount(
        fsCollection(childObject), {
          where: [{ field: lookupField, op: '==', value: id }],
          orderBy: [{ field: 'CreatedDate', direction: 'DESC' }],
          limit: pageSize,
          offset: (page - 1) * pageSize
        }
      );
      const filtered = records.map(r => filterFieldsByFLS(req.user, childObject, r));
      const pageCount = Math.ceil(totalSize / pageSize);
      res.json({ records: filtered, totalSize, page, pageSize, pageCount });
    } catch (error) {
      console.error(`[ERROR] GET ${objectName}/${id}/related/${childObject}:`, error);
      res.status(500).json({ error: 'Failed to fetch related records' });
    }
  });
}

module.exports = { createDataRoutes };
