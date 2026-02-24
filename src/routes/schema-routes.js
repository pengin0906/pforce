'use strict';

/**
 * Schema Routes - /api/schema, /api/schema/full
 */

function createSchemaRoutes(app, ctx) {
  const { ensureAuthenticated, schemaConfig, getAccessibleObjects, accessControlConfig } = ctx;

  app.get('/api/schema/full', ensureAuthenticated, (req, res) => {
    res.json(schemaConfig);
  });

  app.get('/api/schema', ensureAuthenticated, (req, res) => {
    const objectNames = getAccessibleObjects(req.user);
    res.json({
      objects: objectNames,
      organization: accessControlConfig.organizationSettings
    });
  });
}

module.exports = { createSchemaRoutes };
