'use strict';

/**
 * Route Aggregator - imports all route modules and exports mountRoutes(app, ctx)
 * that calls them all in the correct order.
 */

const { createAuthRoutes } = require('./auth-routes');
const { createUserRoutes } = require('./user-routes');
const { createSchemaRoutes } = require('./schema-routes');
const { createDataRoutes } = require('./data-routes');
const { createReportRoutes } = require('./report-routes');
const { createPermissionRoutes } = require('./permission-routes');
const { createSfSobjectRoutes } = require('./sf-sobject-routes');
const { createSfQueryRoutes } = require('./sf-query-routes');
const { createSfMetadataRoutes } = require('./sf-metadata-routes');
const { createSfCompositeRoutes } = require('./sf-composite-routes');
const { createSfToolingRoutes } = require('./sf-tooling-routes');
const { createSfMiscRoutes } = require('./sf-misc-routes');
const { createBasespaceRoutes } = require('./basespace-routes');
const { createReportAgentRoutes } = require('./report-agent-routes');
const { createStaticRoutes } = require('./static-routes');

/**
 * Mount all routes onto the Express app in the correct order.
 *
 * @param {import('express').Express} app - Express application
 * @param {Object} ctx - Shared context object containing:
 *   schemaConfig, accessControlConfig, SF_API_VERSION,
 *   childRelationshipsIndex, parentRelationshipMap, soapTypeMap,
 *   pgService, sfId, INSTANCE_NAME, NODE_ENV, DB_PREFIX,
 *   findObjectDef, canUserAccessObject, filterFieldsByFLS, getFieldLevelSecurity,
 *   getAccessibleObjects, getProfileByName, assignProfileToUser, getPermissionSetsForUser,
 *   ensureAuthenticated, ensureAdmin, devAutoLogin, requireObjectAccess,
 *   validateRecord, parseMetadataXML, generateMetadataXML, escXml,
 *   fsCollection, resolveLookupNames, rebuildSchemaIndexes, persistSchemaConfig,
 *   tokenizeSOQL, SOQLParser, evaluateWhereExpr, resolveDateLiteral, resolveFieldValue, subqueryKey,
 *   translateSOQL, buildUserFromEmail, passport
 */
function mountRoutes(app, ctx) {
  // 1. Auth routes (login, OAuth, logout, passport setup) - must be early
  createAuthRoutes(app, ctx);

  // 2. User routes (/api/me, admin users, impersonation)
  createUserRoutes(app, ctx);

  // 3. Schema routes (/api/schema)
  createSchemaRoutes(app, ctx);

  // 4. Data routes (/api/data/:objectName CRUD)
  createDataRoutes(app, ctx);

  // 5. Report routes (/api/reports/*)
  createReportRoutes(app, ctx);

  // 6. Permission routes (/api/user/permissions, /api/access-control)
  createPermissionRoutes(app, ctx);

  // 7. SF sObject routes (includes API version rewrite middleware - must come before other SF routes)
  createSfSobjectRoutes(app, ctx);

  // 8. SF Query routes (/services/data/v62.0/query/*)
  createSfQueryRoutes(app, ctx);

  // 9. SF Metadata routes (/services/data/v62.0/metadata/*)
  createSfMetadataRoutes(app, ctx);

  // 10. SF Composite routes (/services/data/v62.0/composite/*)
  createSfCompositeRoutes(app, ctx);

  // 11. SF Tooling routes (/services/data/v62.0/tooling/*)
  createSfToolingRoutes(app, ctx);

  // 12. SF Misc routes (limits, tabs, listviews, actions, apex, SOAP)
  createSfMiscRoutes(app, ctx);

  // 13. BaseSpace & NovaSeq proxy routes (/api/basespace/*, /api/novasec/*, /api/instruments/*)
  createBasespaceRoutes(app, ctx);

  // 14. Report Agent routes (/api/report/generate/*, /api/report/mode)
  createReportAgentRoutes(app, ctx);

  // 15. Static file routes (must be last - serves public/, /crm, /lab)
  createStaticRoutes(app, ctx);
}

module.exports = { mountRoutes };
