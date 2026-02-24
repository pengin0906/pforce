'use strict';

/**
 * Metadata XML Helpers
 *
 * Salesforce メタデータ XML のパースと生成。
 * デプロイ/リトリーブAPIで使用。
 */

function escXml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function parseMetadataXML(xmlString) {
  const objects = [];
  const objectMatches = xmlString.match(/<CustomObject[\s\S]*?<\/CustomObject>/g) || [];

  for (const objXml of objectMatches) {
    const obj = {};
    const getTag = (tag) => { const m = objXml.match(new RegExp(`<${tag}>(.*?)</${tag}>`)); return m ? m[1] : null; };

    obj.label = getTag('label') || 'Unknown';
    obj.pluralLabel = getTag('pluralLabel') || obj.label;
    obj.description = getTag('description') || '';
    obj.sharingModel = getTag('sharingModel') || 'ReadWrite';
    obj.deploymentStatus = getTag('deploymentStatus') || 'Deployed';
    obj.enableActivities = getTag('enableActivities') === 'true';
    obj.enableHistory = getTag('enableHistory') === 'true';
    obj.enableReports = getTag('enableReports') === 'true';

    const fullName = getTag('fullName');
    obj.apiName = fullName || obj.label.replace(/\s+/g, '_') + '__c';

    // Parse nameField
    const nameFieldMatch = objXml.match(/<nameField>([\s\S]*?)<\/nameField>/);
    if (nameFieldMatch) {
      obj.nameField = {
        apiName: 'Name',
        label: nameFieldMatch[1].match(/<label>(.*?)<\/label>/)?.[1] || '名前',
        type: nameFieldMatch[1].match(/<type>(.*?)<\/type>/)?.[1] || 'Text',
        length: parseInt(nameFieldMatch[1].match(/<length>(.*?)<\/length>/)?.[1] || '80')
      };
    }

    // Parse fields
    obj.fields = [];
    const fieldMatches = objXml.match(/<fields>([\s\S]*?)<\/fields>/g) || [];
    for (const fieldXml of fieldMatches) {
      const field = {};
      const getFieldTag = (tag) => { const m = fieldXml.match(new RegExp(`<${tag}>(.*?)</${tag}>`)); return m ? m[1] : null; };

      field.apiName = getFieldTag('fullName') || 'Unknown__c';
      field.label = getFieldTag('label') || field.apiName;
      field.type = getFieldTag('type') || 'Text';
      field.required = getFieldTag('required') === 'true';

      if (field.type === 'Text') field.length = parseInt(getFieldTag('length') || '255');
      if (field.type === 'Number' || field.type === 'Currency' || field.type === 'Percent') {
        field.precision = parseInt(getFieldTag('precision') || '18');
        field.scale = parseInt(getFieldTag('scale') || '0');
      }
      if (field.type === 'Lookup' || field.type === 'MasterDetail') {
        field.referenceTo = getFieldTag('referenceTo');
        field.relationshipName = getFieldTag('relationshipName');
        field.deleteConstraint = getFieldTag('deleteConstraint') || 'SetNull';
      }
      if (field.type === 'LongTextArea') {
        field.length = parseInt(getFieldTag('length') || '32768');
        field.visibleLines = parseInt(getFieldTag('visibleLines') || '5');
      }
      if (field.type === 'Formula') {
        field.formula = getFieldTag('formula');
        field.formulaReturnType = getFieldTag('formulaReturnType');
      }
      if (field.type === 'Checkbox') {
        field.defaultValue = getFieldTag('defaultValue') === 'true';
      }

      // Picklist values
      const valueMatches = fieldXml.match(/<value>\s*<fullName>(.*?)<\/fullName>/g);
      if (valueMatches) {
        field.values = valueMatches.map(v => v.match(/<fullName>(.*?)<\/fullName>/)[1]);
      }

      obj.fields.push(field);
    }

    // Parse validation rules
    const vrMatches = objXml.match(/<validationRules>([\s\S]*?)<\/validationRules>/g) || [];
    if (vrMatches.length > 0) {
      obj.validationRules = vrMatches.map(vrXml => {
        const getVR = (tag) => { const m = vrXml.match(new RegExp(`<${tag}>(.*?)</${tag}>`)); return m ? m[1] : null; };
        return {
          apiName: getVR('fullName') || 'Unknown',
          active: getVR('active') === 'true',
          description: getVR('description') || '',
          errorConditionFormula: getVR('errorConditionFormula') || '',
          errorMessage: getVR('errorMessage') || ''
        };
      });
    }

    // Parse record types
    const rtMatches = objXml.match(/<recordTypes>([\s\S]*?)<\/recordTypes>/g) || [];
    if (rtMatches.length > 0) {
      obj.recordTypes = rtMatches.map(rtXml => {
        const getRT = (tag) => { const m = rtXml.match(new RegExp(`<${tag}>(.*?)</${tag}>`)); return m ? m[1] : null; };
        return {
          apiName: getRT('fullName') || 'Unknown',
          label: getRT('label') || '',
          description: getRT('description') || '',
          active: getRT('active') !== 'false'
        };
      });
    }

    objects.push(obj);
  }

  return objects;
}

function generateMetadataXML(objects, acConfig, schemaConfig) {
  let output = '';

  for (const obj of objects) {
    output += `${'='.repeat(60)}\n`;
    output += `force-app/main/default/objects/${obj.apiName}/${obj.apiName}.object-meta.xml\n`;
    output += `${'='.repeat(60)}\n`;
    output += '<?xml version="1.0" encoding="UTF-8"?>\n';
    output += '<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">\n';
    output += `  <label>${escXml(obj.label)}</label>\n`;
    if (obj.pluralLabel) output += `  <pluralLabel>${escXml(obj.pluralLabel)}</pluralLabel>\n`;
    if (obj.description) output += `  <description>${escXml(obj.description)}</description>\n`;
    output += `  <sharingModel>${obj.sharingModel || 'ReadWrite'}</sharingModel>\n`;
    output += `  <deploymentStatus>${obj.deploymentStatus || 'Deployed'}</deploymentStatus>\n`;
    output += `  <enableActivities>${obj.enableActivities !== false}</enableActivities>\n`;
    output += `  <enableHistory>${obj.enableHistory !== false}</enableHistory>\n`;
    output += `  <enableReports>${obj.enableReports !== false}</enableReports>\n`;

    if (obj.nameField) {
      output += '  <nameField>\n';
      output += `    <label>${escXml(obj.nameField.label)}</label>\n`;
      output += `    <type>${obj.nameField.type || 'Text'}</type>\n`;
      if (obj.nameField.length) output += `    <length>${obj.nameField.length}</length>\n`;
      if (obj.nameField.displayFormat) output += `    <displayFormat>${obj.nameField.displayFormat}</displayFormat>\n`;
      output += '  </nameField>\n';
    }

    for (const f of (obj.fields || [])) {
      output += '  <fields>\n';
      output += `    <fullName>${escXml(f.apiName)}</fullName>\n`;
      output += `    <label>${escXml(f.label)}</label>\n`;
      output += `    <type>${f.type}</type>\n`;

      if (f.required !== undefined) output += `    <required>${!!f.required}</required>\n`;
      if (f.length && ['Text', 'LongTextArea'].includes(f.type)) output += `    <length>${f.length}</length>\n`;
      if (f.precision) output += `    <precision>${f.precision}</precision>\n`;
      if (f.scale !== undefined && f.scale !== null) output += `    <scale>${f.scale}</scale>\n`;
      if (f.externalId) output += `    <externalId>true</externalId>\n`;
      if (f.unique) output += `    <unique>true</unique>\n`;
      if (f.defaultValue !== undefined && f.defaultValue !== null) output += `    <defaultValue>${f.defaultValue}</defaultValue>\n`;
      if (f.inlineHelpText) output += `    <inlineHelpText>${escXml(f.inlineHelpText)}</inlineHelpText>\n`;
      if (f.visibleLines) output += `    <visibleLines>${f.visibleLines}</visibleLines>\n`;

      if (f.referenceTo) {
        output += `    <referenceTo>${f.referenceTo}</referenceTo>\n`;
        output += `    <relationshipName>${f.relationshipName || f.apiName.replace(/__c$/, 's')}</relationshipName>\n`;
        if (f.relationshipLabel) output += `    <relationshipLabel>${escXml(f.relationshipLabel)}</relationshipLabel>\n`;
        output += `    <deleteConstraint>${f.deleteConstraint || 'SetNull'}</deleteConstraint>\n`;
      }

      if (f.type === 'Formula') {
        if (f.formulaReturnType) output += `    <formulaReturnType>${f.formulaReturnType}</formulaReturnType>\n`;
        if (f.formula) output += `    <formula>${escXml(f.formula)}</formula>\n`;
      }

      if (f.values && f.values.length > 0) {
        output += '    <valueSet>\n';
        output += '      <restricted>true</restricted>\n';
        output += '      <valueSetDefinition>\n';
        output += '        <sorted>false</sorted>\n';
        for (const v of f.values) {
          output += `        <value><fullName>${escXml(v)}</fullName><label>${escXml(v)}</label><default>false</default></value>\n`;
        }
        output += '      </valueSetDefinition>\n';
        output += '    </valueSet>\n';
      }

      output += '  </fields>\n';
    }

    for (const vr of (obj.validationRules || [])) {
      output += '  <validationRules>\n';
      output += `    <fullName>${escXml(vr.apiName)}</fullName>\n`;
      output += `    <active>${vr.active !== false}</active>\n`;
      if (vr.description) output += `    <description>${escXml(vr.description)}</description>\n`;
      output += `    <errorConditionFormula>${escXml(vr.errorConditionFormula)}</errorConditionFormula>\n`;
      output += `    <errorMessage>${escXml(vr.errorMessage)}</errorMessage>\n`;
      output += '  </validationRules>\n';
    }

    for (const rt of (obj.recordTypes || [])) {
      output += '  <recordTypes>\n';
      output += `    <fullName>${escXml(rt.apiName)}</fullName>\n`;
      output += `    <label>${escXml(rt.label)}</label>\n`;
      if (rt.description) output += `    <description>${escXml(rt.description)}</description>\n`;
      output += `    <active>${rt.active !== false}</active>\n`;
      output += '  </recordTypes>\n';
    }

    output += '</CustomObject>\n\n';
  }

  // Generate Profile XMLs
  for (const profile of (acConfig.profiles || [])) {
    output += `${'='.repeat(60)}\n`;
    output += `force-app/main/default/profiles/${profile.apiName}.profile-meta.xml\n`;
    output += `${'='.repeat(60)}\n`;
    output += '<?xml version="1.0" encoding="UTF-8"?>\n';
    output += '<Profile xmlns="http://soap.sforce.com/2006/04/metadata">\n';
    output += `  <description>${escXml(profile.description || '')}</description>\n`;
    output += '  <userLicense>Salesforce</userLicense>\n';

    for (const op of (profile.objectPermissions || [])) {
      output += '  <objectPermissions>\n';
      output += `    <object>${op.object}</object>\n`;
      output += `    <allowCreate>${!!op.allowCreate}</allowCreate>\n`;
      output += `    <allowRead>${!!op.allowRead}</allowRead>\n`;
      output += `    <allowEdit>${!!op.allowEdit}</allowEdit>\n`;
      output += `    <allowDelete>${!!op.allowDelete}</allowDelete>\n`;
      output += `    <viewAllRecords>${!!op.viewAllRecords}</viewAllRecords>\n`;
      output += `    <modifyAllRecords>${!!op.modifyAllRecords}</modifyAllRecords>\n`;
      output += '  </objectPermissions>\n';
    }

    output += '</Profile>\n\n';
  }

  // Generate PermissionSet XMLs
  const permSets = acConfig.permissionSets || (schemaConfig && schemaConfig.permissionSets) || [];
  for (const ps of permSets) {
    output += `${'='.repeat(60)}\n`;
    output += `force-app/main/default/permissionsets/${ps.apiName}.permissionset-meta.xml\n`;
    output += `${'='.repeat(60)}\n`;
    output += '<?xml version="1.0" encoding="UTF-8"?>\n';
    output += '<PermissionSet xmlns="http://soap.sforce.com/2006/04/metadata">\n';
    output += `  <label>${escXml(ps.label)}</label>\n`;
    if (ps.description) output += `  <description>${escXml(ps.description)}</description>\n`;

    for (const op of (ps.objectPermissions || [])) {
      output += '  <objectPermissions>\n';
      output += `    <object>${op.object}</object>\n`;
      output += `    <allowCreate>${!!op.allowCreate}</allowCreate>\n`;
      output += `    <allowRead>${!!op.allowRead}</allowRead>\n`;
      output += `    <allowEdit>${!!op.allowEdit}</allowEdit>\n`;
      output += `    <allowDelete>${!!op.allowDelete}</allowDelete>\n`;
      output += '  </objectPermissions>\n';
    }

    output += '</PermissionSet>\n\n';
  }

  return output;
}

module.exports = { parseMetadataXML, generateMetadataXML, escXml };
