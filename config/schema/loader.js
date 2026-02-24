'use strict';

/**
 * モジュラースキーマローダー
 *
 * config/schema/ ディレクトリから個別YAMLファイルを読み込み、
 * server.js が期待する schemaConfig 形式に合成する。
 *
 * 出力形式: { apiVersion, standardObjects, objects, permissionSets, dashboard }
 */

const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

/**
 * config/schema/ ディレクトリからモジュラースキーマを読み込む
 * @param {string} baseDir - プロジェクトルートディレクトリ
 * @returns {{ apiVersion: string, standardObjects: Array, objects: Array, permissionSets: Array, dashboard: object }}
 */
function loadModularSchema(baseDir) {
  const schemaDir = path.join(baseDir, 'config', 'schema');

  // 1. メタデータ読み込み
  const metaPath = path.join(schemaDir, '_meta.yaml');
  const meta = yaml.load(fs.readFileSync(metaPath, 'utf8'));

  // 2. 標準オブジェクト読み込み
  const standardDir = path.join(schemaDir, 'standard');
  const standardObjects = loadObjectsFromDir(standardDir);

  // 3. カスタムオブジェクト読み込み (サブディレクトリを再帰的に探索)
  const customDir = path.join(schemaDir, 'custom');
  const objects = loadObjectsFromDir(customDir, { recursive: true });

  // 4. Permission Sets
  const permSetsPath = path.join(schemaDir, 'permission-sets.yaml');
  let permissionSets = [];
  if (fs.existsSync(permSetsPath)) {
    const permData = yaml.load(fs.readFileSync(permSetsPath, 'utf8'));
    permissionSets = permData.permissionSets || [];
  }

  // 5. Dashboard
  const dashboardPath = path.join(schemaDir, 'dashboard.yaml');
  let dashboard = {};
  if (fs.existsSync(dashboardPath)) {
    const dashData = yaml.load(fs.readFileSync(dashboardPath, 'utf8'));
    dashboard = dashData.dashboard || dashData;
  }

  return {
    apiVersion: meta.apiVersion || '62.0',
    standardObjects,
    objects,
    permissionSets,
    dashboard,
  };
}

/**
 * ディレクトリからYAMLオブジェクト定義を読み込む
 * @param {string} dir
 * @param {{ recursive?: boolean }} opts
 * @returns {Array}
 */
function loadObjectsFromDir(dir, opts = {}) {
  if (!fs.existsSync(dir)) return [];

  const files = opts.recursive
    ? findYamlFilesRecursive(dir)
    : fs.readdirSync(dir).filter(f => f.endsWith('.yaml')).map(f => path.join(dir, f));

  return files.map(f => {
    const content = fs.readFileSync(f, 'utf8');
    return yaml.load(content);
  }).filter(Boolean);
}

/**
 * ディレクトリを再帰的に探索してYAMLファイルを収集
 * @param {string} dir
 * @returns {string[]}
 */
function findYamlFilesRecursive(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findYamlFilesRecursive(fullPath));
    } else if (entry.name.endsWith('.yaml')) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * インスタンス用オーバーレイを適用
 * @param {{ standardObjects: Array, objects: Array }} baseSchema
 * @param {string} overlayPath - overlay YAML ファイルパス
 * @returns {object}
 */
function applyOverlay(baseSchema, overlayPath) {
  const overlay = yaml.load(fs.readFileSync(overlayPath, 'utf8'));

  // include: 使用するオブジェクトをフィルタ
  if (overlay.include) {
    if (overlay.include.standard) {
      baseSchema.standardObjects = baseSchema.standardObjects
        .filter(o => overlay.include.standard.includes(o.apiName));
    }
    if (overlay.include.custom !== undefined) {
      baseSchema.objects = baseSchema.objects
        .filter(o => overlay.include.custom.includes(o.apiName));
    }
  }

  // overrides: フィールドレベルの上書き
  if (overlay.overrides) {
    for (const [objName, changes] of Object.entries(overlay.overrides)) {
      const obj = findObj(baseSchema, objName);
      if (obj && changes.fields) {
        for (const fieldOverride of changes.fields) {
          const existing = (obj.fields || []).find(f => f.apiName === fieldOverride.apiName);
          if (existing) {
            Object.assign(existing, fieldOverride);
          }
        }
      }
    }
  }

  // objects: インスタンス固有のオブジェクトを追加
  if (overlay.objects) {
    baseSchema.objects = [...(baseSchema.objects || []), ...overlay.objects];
  }

  // dashboard: 上書き
  if (overlay.dashboard) {
    baseSchema.dashboard = overlay.dashboard;
  }

  // permissionSets: 上書き
  if (overlay.permissionSets) {
    baseSchema.permissionSets = overlay.permissionSets;
  }

  return baseSchema;
}

/**
 * schema内からオブジェクトを検索
 */
function findObj(schema, apiName) {
  return (schema.standardObjects || []).find(o => o.apiName === apiName)
    || (schema.objects || []).find(o => o.apiName === apiName);
}

/**
 * スキーマとアクセス制御の整合性を検証
 * @param {object} schemaConfig
 * @param {object} accessControlConfig
 * @returns {string[]} エラーメッセージの配列
 */
function validateAccessControlAlignment(schemaConfig, accessControlConfig) {
  const allObjectNames = new Set([
    ...(schemaConfig.standardObjects || []).map(o => o.apiName),
    ...(schemaConfig.objects || []).map(o => o.apiName),
  ]);

  const errors = [];

  // profiles.objectPermissions のチェック
  for (const profile of (accessControlConfig.profiles || [])) {
    for (const perm of (profile.objectPermissions || [])) {
      if (perm.object !== '*' && !allObjectNames.has(perm.object)) {
        errors.push(`Profile '${profile.apiName}' references unknown object '${perm.object}'`);
      }
    }
  }

  // OWD のチェック
  for (const owd of (accessControlConfig.organizationWideDefaults || [])) {
    if (!allObjectNames.has(owd.object)) {
      errors.push(`OWD references unknown object '${owd.object}'`);
    }
  }

  // FLS のチェック
  for (const profile of (accessControlConfig.profiles || [])) {
    for (const fls of (profile.fieldLevelSecurity || [])) {
      if (!allObjectNames.has(fls.object)) {
        errors.push(`FLS in profile '${profile.apiName}' references unknown object '${fls.object}'`);
      }
    }
  }

  // Sharing rules のチェック
  for (const rule of (accessControlConfig.sharingRules || [])) {
    if (!allObjectNames.has(rule.object)) {
      errors.push(`Sharing rule '${rule.apiName}' references unknown object '${rule.object}'`);
    }
  }

  return errors;
}

module.exports = { loadModularSchema, applyOverlay, validateAccessControlAlignment };
