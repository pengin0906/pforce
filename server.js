/**
 * Pforce - Salesforce Compatible CRM Platform
 * Node.js/Express with Google OAuth 2.0 and Salesforce-compatible Access Control
 * Deploys to Google Cloud Run
 */

'use strict';

require('dotenv').config({ override: true });

const express = require('express');
const passport = require('passport');

// External service modules
const pgService = require('./pg-service');
const sfId = require('./salesforce-id');
const { tokenizeSOQL, SOQLParser, evaluateWhereExpr, resolveDateLiteral, resolveFieldValue, subqueryKey } = require('./soql-parser');
const { translateSOQL } = require('./soql-to-sql');
const { createAuthRoutes: createBearerAuthRoutes, createBearerMiddleware, buildUserFromEmail } = require('./auth');
const { createBulkApiRoutes } = require('./bulk-api');
const { createSearchRoutes } = require('./search');

// Internal modules (src/)
const { loadConfig } = require('./src/config/index');
const { createSchemaService } = require('./src/config/schema-index');
const { setupMiddleware } = require('./src/middleware/index');
const { createAccessControlService } = require('./src/services/access-control');
const { validateRecord } = require('./src/services/validation-engine');
const { parseMetadataXML, generateMetadataXML, escXml } = require('./src/services/metadata-xml');
const { mountRoutes } = require('./src/routes/index');

// ============================================================================
// Configuration
// ============================================================================

const config = loadConfig(__dirname);
const {
  port: PORT, nodeEnv: NODE_ENV, sessionSecret,
  instanceName: INSTANCE_NAME, dbPrefix: DB_PREFIX,
  accessControlConfig, schemaConfig,
} = config;

const SF_API_VERSION = schemaConfig.apiVersion || '62.0';

// ============================================================================
// Express App
// ============================================================================

const app = express();

// ============================================================================
// Services
// ============================================================================

const schemaService = createSchemaService(schemaConfig);
const { findObjectDef, persistSchemaConfig, rebuildSchemaIndexes, soapTypeMap } = schemaService;

const acService = createAccessControlService(accessControlConfig, schemaConfig, {
  nodeEnv: NODE_ENV,
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  pgService,
});
const {
  assignProfileToUser, getPermissionSetsForUser, getProfileByName,
  canUserAccessObject, getFieldLevelSecurity, getAccessibleObjects,
  requireObjectAccess, filterFieldsByFLS, devAutoLogin, ensureAdmin,
} = acService;

const ensureAuthenticated = createBearerMiddleware(devAutoLogin, accessControlConfig);

function fsCollection(objectName) {
  return DB_PREFIX + objectName;
}

async function resolveLookupNames(objectName, records) {
  const objDef = findObjectDef(objectName);
  if (!objDef || !objDef.fields || records.length === 0) return {};

  const lookupFields = objDef.fields.filter(f => f.type === 'Lookup' || f.type === 'MasterDetail');
  if (lookupFields.length === 0) return {};

  const lookupNames = {};
  for (const lf of lookupFields) {
    const ids = [...new Set(records.map(r => r[lf.apiName]).filter(Boolean))];
    if (ids.length === 0) continue;
    const refObj = lf.referenceTo || lf.apiName.replace(/Id$/, '').replace(/__c$/, '__c');
    try {
      const names = await pgService.resolveNames(fsCollection(refObj), ids);
      Object.assign(lookupNames, names);
    } catch (e) { /* skip if referenced table doesn't exist */ }
  }
  return lookupNames;
}

// ============================================================================
// Middleware
// ============================================================================

setupMiddleware(app, { sessionSecret, nodeEnv: NODE_ENV });

// ============================================================================
// Shared Context (passed to all route modules)
// ============================================================================

const ctx = {
  // Config
  schemaConfig, accessControlConfig, SF_API_VERSION,
  INSTANCE_NAME, NODE_ENV, DB_PREFIX,

  // Services
  pgService, sfId, schemaService,
  get childRelationshipsIndex() { return schemaService.childRelationshipsIndex; },
  get parentRelationshipMap() { return schemaService.parentRelationshipMap; },
  soapTypeMap,

  // Schema helpers
  findObjectDef, persistSchemaConfig, rebuildSchemaIndexes,

  // Access control
  assignProfileToUser, getPermissionSetsForUser, getProfileByName,
  canUserAccessObject, getFieldLevelSecurity, getAccessibleObjects,
  requireObjectAccess, filterFieldsByFLS, devAutoLogin, ensureAdmin,
  ensureAuthenticated,

  // Data helpers
  fsCollection, resolveLookupNames,
  validateRecord,

  // Metadata XML
  parseMetadataXML, generateMetadataXML, escXml,

  // SOQL/SOSL
  tokenizeSOQL, SOQLParser, evaluateWhereExpr, resolveDateLiteral, resolveFieldValue, subqueryKey,
  translateSOQL,

  // Auth
  buildUserFromEmail, passport,
};

// ============================================================================
// Routes
// ============================================================================

// Bearer/OAuth2/SOAP auth routes (must come before other SF routes)
createBearerAuthRoutes(app, { accessControlConfig, SF_API_VERSION, firestoreService: pgService, fsCollection, sessionSecret });

// All application routes (auth, data, SF API, static, etc.)
mountRoutes(app, ctx);

// Bulk API 2.0
createBulkApiRoutes(app, {
  apiVersion: SF_API_VERSION, firestoreService: pgService, sfId, fsCollection, findObjectDef,
  ensureAuthenticated, parseSOQL(query) {
    const tokens = tokenizeSOQL(query);
    return new SOQLParser(tokens).parse();
  }, evaluateWhereExpr,
});

// SOSL Search
createSearchRoutes(app, {
  apiVersion: SF_API_VERSION, firestoreService: pgService, fsCollection, findObjectDef,
  schemaConfig, ensureAuthenticated,
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// ============================================================================
// Error Handlers
// ============================================================================

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, _next) => {
  if (NODE_ENV === 'production') {
    console.error('[ERROR]', err.message);
  } else {
    console.error('[ERROR]', err);
  }
  res.status(500).json({ error: 'Internal server error' });
});

// ============================================================================
// Server Startup
// ============================================================================

const seedDataPath = process.env.PFORCE_SEED_DATA || './seed-data';
if (seedDataPath.includes('..') || seedDataPath.startsWith('/')) {
  throw new Error('PFORCE_SEED_DATA must be a relative path');
}
const seedModule = require(seedDataPath);

async function seedIfEmptyWithPrefix() {
  const { demoData } = seedModule;
  if (!demoData) return;

  console.log(`[INFO] [${INSTANCE_NAME}] Checking seed data status...`);
  let totalCount = 0;
  let seededCollections = 0;

  for (const [collectionName, records] of Object.entries(demoData)) {
    const tblName = DB_PREFIX + collectionName;
    const exists = await pgService.collectionExists(tblName);
    if (exists) continue;

    const batch = pgService.db.batch();
    let count = 0;
    for (const record of records) {
      const id = record.Id;
      const docData = { ...record };
      delete docData.Id;
      batch.set(pgService.db.collection(tblName).doc(id), docData);
      count++;
    }
    await batch.commit();
    totalCount += count;
    seededCollections++;
    console.log(`[INFO] [${INSTANCE_NAME}] Seeded ${tblName}: ${count} records`);
  }

  if (totalCount === 0) {
    console.log(`[INFO] [${INSTANCE_NAME}] All collections already have data, skipping seed`);
  } else {
    console.log(`[INFO] [${INSTANCE_NAME}] Seeded ${totalCount} records across ${seededCollections} collections`);
  }
}

async function startServer() {
  try {
    await pgService.initTables(schemaConfig);
    if (DB_PREFIX) {
      await seedIfEmptyWithPrefix();
    } else if (seedModule.seedIfEmpty) {
      await seedModule.seedIfEmpty();
    }
  } catch (error) {
    console.error('[ERROR] Failed to initialize database. Check DATABASE_URL or PGHOST/PGPORT settings.');
  }

  app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║       ${INSTANCE_NAME} Server Started            ║
╠════════════════════════════════════════╣
║ Instance: ${INSTANCE_NAME}
║ Port: ${PORT}
║ Environment: ${NODE_ENV}
║ Database: PostgreSQL (connected)
║ SF API: /services/data/v${SF_API_VERSION}/
║ Timestamp: ${new Date().toISOString()}
╚════════════════════════════════════════╝
    `);
    console.log(`[INFO] Login: http://localhost:${PORT}/login`);
    console.log(`[INFO] Health check: http://localhost:${PORT}/health`);
  });
}

startServer();

module.exports = app;
