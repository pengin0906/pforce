'use strict';

/**
 * Schema Index Service
 *
 * スキーマ設定からChild/Parent Relationship インデックスを構築し、
 * オブジェクト定義の検索・永続化を提供する。
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * SOAP type mapping from schema field types to XSD types
 */
const soapTypeMap = {
  'string': 'xsd:string', 'textarea': 'xsd:string', 'email': 'xsd:string',
  'phone': 'xsd:string', 'url': 'xsd:string', 'id': 'tns:ID',
  'double': 'xsd:double', 'currency': 'xsd:double', 'percent': 'xsd:double',
  'int': 'xsd:int', 'boolean': 'xsd:boolean', 'date': 'xsd:date',
  'datetime': 'xsd:dateTime', 'reference': 'tns:ID', 'picklist': 'xsd:string',
  'multipicklist': 'xsd:string', 'base64': 'xsd:base64Binary',
  'combobox': 'xsd:string', 'time': 'xsd:time'
};

/**
 * Build child relationships index from schema Lookup/MasterDetail fields
 * @param {object} config - schemaConfig
 * @returns {Map}
 */
function buildChildRelationshipsIndex(config) {
  const index = new Map();
  const allObjects = [...(config.standardObjects || []), ...(config.objects || [])];
  for (const obj of allObjects) {
    for (const f of (obj.fields || [])) {
      if ((f.type === 'Lookup' || f.type === 'MasterDetail') && f.referenceTo) {
        const target = f.referenceTo;
        if (!index.has(target)) index.set(target, []);
        index.get(target).push({
          childSObject: obj.apiName,
          field: f.apiName,
          relationshipName: f.relationshipName || f.apiName.replace(/__c$/, '__r').replace(/Id$/, 's'),
          cascadeDelete: f.type === 'MasterDetail',
          restrictedDelete: f.deleteConstraint === 'Restrict',
          deprecatedAndHidden: false
        });
      }
    }
  }
  return index;
}

/**
 * Build parent relationship map for resolving parent relationship queries
 * (e.g., Account.Name on Contact)
 * @param {object} config - schemaConfig
 * @returns {Map}
 */
function buildParentRelationshipMap(config) {
  const map = new Map();
  const allObjects = [...(config.standardObjects || []), ...(config.objects || [])];
  for (const obj of allObjects) {
    const objMap = new Map();
    for (const f of (obj.fields || [])) {
      if ((f.type === 'Lookup' || f.type === 'MasterDetail') && f.referenceTo) {
        // Standard: AccountId -> relationship name "Account"
        // Custom: Medical_Institution__c -> relationship name from schema or strip __c -> __r
        const relName = f.relationshipName
          ? f.apiName.replace(/Id$/, '').replace(/__c$/, '__r')
          : f.apiName.replace(/Id$/, '');
        objMap.set(relName, { lookupField: f.apiName, parentObject: f.referenceTo });
        // Also store by field name for direct lookup
        objMap.set(f.apiName, { lookupField: f.apiName, parentObject: f.referenceTo });
      }
    }
    map.set(obj.apiName, objMap);
  }
  return map;
}

/**
 * Create a schema service that manages indexes and provides lookup functions.
 *
 * @param {object} schemaConfig - The loaded schema configuration (mutable reference)
 * @returns {{ soapTypeMap, buildChildRelationshipsIndex, buildParentRelationshipMap,
 *             findObjectDef, persistSchemaConfig, rebuildSchemaIndexes,
 *             childRelationshipsIndex, parentRelationshipMap,
 *             getChildRelationshipsIndex, getParentRelationshipMap }}
 */
function createSchemaService(schemaConfig) {
  let childRelationshipsIndex = buildChildRelationshipsIndex(schemaConfig);
  let parentRelationshipMap = buildParentRelationshipMap(schemaConfig);

  /**
   * Find an object definition by apiName
   * @param {string} objectName
   * @returns {object|null}
   */
  function findObjectDef(objectName) {
    const allObjects = [...(schemaConfig.standardObjects || []), ...(schemaConfig.objects || [])];
    return allObjects.find(o => o.apiName === objectName) || null;
  }

  /**
   * Persist schema config to YAML file (atomic write via temp file + rename)
   */
  function persistSchemaConfig() {
    const schemaPath = process.env.PFORCE_SCHEMA || path.join(__dirname, '..', '..', 'config', 'schema.yaml');
    const tempPath = schemaPath + '.tmp.' + Date.now();
    const yamlContent = yaml.dump(schemaConfig, { lineWidth: -1, quotingType: '"', forceQuotes: false, noRefs: true });
    fs.writeFileSync(tempPath, yamlContent, 'utf8');
    fs.renameSync(tempPath, schemaPath);
  }

  /**
   * Rebuild child and parent relationship indexes (after schema changes)
   */
  function rebuildSchemaIndexes() {
    childRelationshipsIndex = buildChildRelationshipsIndex(schemaConfig);
    parentRelationshipMap = buildParentRelationshipMap(schemaConfig);
  }

  return {
    soapTypeMap,
    buildChildRelationshipsIndex,
    buildParentRelationshipMap,
    findObjectDef,
    persistSchemaConfig,
    rebuildSchemaIndexes,
    // Expose current indexes via getters so callers always get the latest after rebuild
    get childRelationshipsIndex() { return childRelationshipsIndex; },
    get parentRelationshipMap() { return parentRelationshipMap; }
  };
}

module.exports = { createSchemaService, soapTypeMap, buildChildRelationshipsIndex, buildParentRelationshipMap };
