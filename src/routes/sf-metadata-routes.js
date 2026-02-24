'use strict';

/**
 * SF Metadata Routes - /services/data/v62.0/metadata/* routes for deploy, retrieve, package.xml
 */

const yaml = require('js-yaml');

function createSfMetadataRoutes(app, ctx) {
  const {
    ensureAuthenticated, ensureAdmin,
    schemaConfig, accessControlConfig, SF_API_VERSION,
    rebuildSchemaIndexes, persistSchemaConfig,
    parseMetadataXML, generateMetadataXML
  } = ctx;

  // Metadata Deploy (XML Import)
  app.post(`/services/data/v${SF_API_VERSION}/metadata/deploy/`, ensureAdmin, (req, res) => {
    const { xmlContent, objectDefinitions } = req.body;

    if (objectDefinitions) {
      // JSON-based metadata import
      for (const obj of objectDefinitions) {
        if (obj.apiName) {
          const existingIdx = (schemaConfig.objects || []).findIndex(o => o.apiName === obj.apiName);
          if (existingIdx >= 0) {
            schemaConfig.objects[existingIdx] = { ...schemaConfig.objects[existingIdx], ...obj };
          } else {
            if (!schemaConfig.objects) schemaConfig.objects = [];
            schemaConfig.objects.push(obj);
          }
        }
      }
      persistSchemaConfig();
      rebuildSchemaIndexes();
      return res.json({ id: `deploy-${Date.now()}`, success: true, status: 'Succeeded', numberComponentsDeployed: objectDefinitions.length, numberComponentErrors: 0 });
    }

    if (xmlContent) {
      // Parse XML metadata (basic CustomObject parsing)
      try {
        const objects = parseMetadataXML(xmlContent);
        for (const obj of objects) {
          const existingIdx = (schemaConfig.objects || []).findIndex(o => o.apiName === obj.apiName);
          if (existingIdx >= 0) {
            schemaConfig.objects[existingIdx] = obj;
          } else {
            if (!schemaConfig.objects) schemaConfig.objects = [];
            schemaConfig.objects.push(obj);
          }
        }
        persistSchemaConfig();
        rebuildSchemaIndexes();
        return res.json({ id: `deploy-${Date.now()}`, success: true, status: 'Succeeded', numberComponentsDeployed: objects.length, numberComponentErrors: 0 });
      } catch (error) {
        return res.status(400).json({ id: `deploy-${Date.now()}`, success: false, status: 'Failed', errorMessage: error.message });
      }
    }

    res.status(400).json([{ message: 'Missing xmlContent or objectDefinitions', errorCode: 'INVALID_INPUT' }]);
  });

  // Metadata Retrieve (XML Export)
  app.get(`/services/data/v${SF_API_VERSION}/metadata/retrieve/`, ensureAuthenticated, (req, res) => {
    const { objectName, format } = req.query;

    const allObjects = [...(schemaConfig.objects || []), ...(schemaConfig.standardObjects || [])];
    let targetObjects = allObjects;

    if (objectName) {
      targetObjects = allObjects.filter(o => o.apiName === objectName);
      if (targetObjects.length === 0) {
        return res.status(404).json([{ message: `Object not found: ${objectName}`, errorCode: 'NOT_FOUND' }]);
      }
    }

    if (format === 'yaml') {
      return res.type('text/yaml').send(yaml.dump({ apiVersion: SF_API_VERSION, objects: targetObjects }));
    }

    // Default: generate SFDX XML
    const xmlOutput = generateMetadataXML(targetObjects, accessControlConfig, schemaConfig);
    res.type('application/xml').send(xmlOutput);
  });

  // Package.xml generation
  app.get(`/services/data/v${SF_API_VERSION}/metadata/package.xml`, ensureAuthenticated, (req, res) => {
    const customObjects = (schemaConfig.objects || []).filter(o => o.apiName.endsWith('__c'));
    const permSets = schemaConfig.permissionSets || [];
    const profiles = accessControlConfig.profiles || [];

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<Package xmlns="http://soap.sforce.com/2006/04/metadata">\n';

    if (customObjects.length > 0) {
      xml += '  <types>\n';
      for (const obj of customObjects) {
        xml += `    <members>${obj.apiName}</members>\n`;
      }
      xml += '    <name>CustomObject</name>\n';
      xml += '  </types>\n';
    }

    // Custom fields
    xml += '  <types>\n';
    for (const obj of customObjects) {
      for (const field of (obj.fields || [])) {
        xml += `    <members>${obj.apiName}.${field.apiName}</members>\n`;
      }
    }
    xml += '    <name>CustomField</name>\n';
    xml += '  </types>\n';

    if (permSets.length > 0) {
      xml += '  <types>\n';
      for (const ps of permSets) {
        xml += `    <members>${ps.apiName}</members>\n`;
      }
      xml += '    <name>PermissionSet</name>\n';
      xml += '  </types>\n';
    }

    if (profiles.length > 0) {
      xml += '  <types>\n';
      for (const p of profiles) {
        xml += `    <members>${p.apiName}</members>\n`;
      }
      xml += '    <name>Profile</name>\n';
      xml += '  </types>\n';
    }

    xml += `  <version>${SF_API_VERSION}</version>\n`;
    xml += '</Package>\n';

    res.type('application/xml').send(xml);
  });
}

module.exports = { createSfMetadataRoutes };
