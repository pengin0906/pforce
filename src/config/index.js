'use strict';

/**
 * Configuration Loader
 *
 * 環境変数、アクセス制御YAML、スキーマ設定を読み込み、
 * アプリケーション設定オブジェクトを返す。
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * Load all configuration from environment variables, access control YAML,
 * and schema configuration.
 *
 * @param {string} rootDir - Project root directory (__dirname of server.js)
 * @returns {{ port, nodeEnv, googleClientId, googleClientSecret, googleCallbackUrl,
 *             allowedDomain, allowedEmails, sessionSecret, instanceName, dbPrefix,
 *             accessControlConfig, schemaConfig }}
 */
function loadConfig(rootDir) {
  // ---- Environment variables ----
  const port = process.env.PORT || 8080;
  const nodeEnv = process.env.NODE_ENV || 'development';

  // OAuth Configuration
  const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  const googleCallbackUrl = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:8080/auth/google/callback';
  const allowedDomain = process.env.ALLOWED_DOMAIN || '';
  const allowedEmails = (process.env.ALLOWED_EMAILS || '').split(',').map(e => e.trim()).filter(e => e);

  // Session Secret
  const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

  // Instance name (for multi-instance support)
  const instanceName = process.env.PFORCE_INSTANCE_NAME || 'Pforce';
  const dbPrefix = process.env.PFORCE_DB_PREFIX || process.env.PFORCE_FIRESTORE_PREFIX || '';

  // ---- Access Control Configuration ----
  let accessControlConfig = {};
  try {
    const acPath = process.env.PFORCE_ACCESS_CONTROL || path.join(rootDir, 'config', 'access-control.yaml');
    const fileContents = fs.readFileSync(acPath, 'utf8');
    accessControlConfig = yaml.load(fileContents);
    console.log(`[INFO] [${instanceName}] Access control configuration loaded`);
  } catch (error) {
    console.error('[ERROR] Failed to load access control configuration:', error.message);
    process.exit(1);
  }

  // ---- Schema Configuration ----
  const { loadModularSchema, applyOverlay, validateAccessControlAlignment } = require(path.join(rootDir, 'config', 'schema', 'loader'));
  let schemaConfig = {};
  try {
    const legacySchemaPath = process.env.PFORCE_SCHEMA;
    if (legacySchemaPath) {
      // レガシーモード: 単一YAMLファイル (インスタンス用)
      const fileContents = fs.readFileSync(legacySchemaPath, 'utf8');
      schemaConfig = yaml.load(fileContents);
      console.log(`[INFO] [${instanceName}] Schema configuration loaded (legacy: ${legacySchemaPath})`);
    } else {
      // モジュラーモード: config/schema/ ディレクトリから読み込み
      schemaConfig = loadModularSchema(rootDir);
      console.log(`[INFO] [${instanceName}] Schema configuration loaded (modular: ${schemaConfig.standardObjects.length} standard + ${schemaConfig.objects.length} custom objects)`);
    }

    // インスタンスオーバーレイの適用
    const overlayPath = process.env.PFORCE_SCHEMA_OVERLAY;
    if (overlayPath) {
      schemaConfig = applyOverlay(schemaConfig, overlayPath);
      console.log(`[INFO] [${instanceName}] Schema overlay applied: ${overlayPath}`);
    }
  } catch (error) {
    console.error('[ERROR] Failed to load schema configuration:', error.message);
    process.exit(1);
  }

  // スキーマとアクセス制御の整合性チェック
  const acErrors = validateAccessControlAlignment(schemaConfig, accessControlConfig);
  if (acErrors.length > 0) {
    for (const err of acErrors) {
      console.warn(`[WARN] [${instanceName}] Access control alignment: ${err}`);
    }
  }

  return {
    port,
    nodeEnv,
    googleClientId,
    googleClientSecret,
    googleCallbackUrl,
    allowedDomain,
    allowedEmails,
    sessionSecret,
    instanceName,
    dbPrefix,
    accessControlConfig,
    schemaConfig
  };
}

module.exports = { loadConfig };
