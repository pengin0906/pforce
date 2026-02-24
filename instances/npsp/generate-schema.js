#!/usr/bin/env node
/**
 * NPSP schema.yaml generator
 * Reads SFDX XML from demo/salesforce-npsp and generates Pforce-compatible schema.yaml
 */
const fs = require('fs');
const path = require('path');
const { readSfdxProject } = require('../../converter/lib/sfdx-reader');
const { parseStringPromise } = require('xml2js');

const NPSP_DIR = path.join(__dirname, '../../demo/salesforce-npsp/force-app');
const OBJECTS_DIR = path.join(NPSP_DIR, 'main/default/objects');

// Objects to skip (settings, metadata, events, internal-only)
const SKIP_PATTERNS = [
  /_Settings__c$/,
  /Settings__c$/,
  /__mdt$/,
  /__e$/,
  /^GetStarted/,
  /^Package_Settings/,
  /^Schedulable__c$/,
  /^AutoNumber__c$/,
  /^Custom_Column_Header__c$/,
  /^Relationship_Sync_Excluded_Fields__c$/,
  /^Payment_Services_Configuration__c$/,
  /^Form_Template__c$/,
  /^GetStartedCompletionChecklistState__c$/,
];

// Pforce-supported field types
const SUPPORTED_TYPES = new Set([
  'Text', 'LongTextArea', 'TextArea', 'Number', 'Currency', 'Percent',
  'Phone', 'Email', 'Url', 'Date', 'DateTime', 'Checkbox',
  'Picklist', 'MultiselectPicklist', 'Lookup', 'MasterDetail',
]);

// Map unsupported types to supported ones
const TYPE_MAP = {
  'Formula': null, // skip formula fields for now
  'AutoNumber': null,
  'Summary': null,
  'Html': 'LongTextArea',
  'EncryptedText': 'Text',
  'Location': 'Text',
  'Geolocation': 'Text',
};

function shouldSkip(apiName) {
  return SKIP_PATTERNS.some(p => p.test(apiName));
}

function mapFieldType(field) {
  if (SUPPORTED_TYPES.has(field.type)) return field;
  if (TYPE_MAP[field.type] === null) return null; // skip
  if (TYPE_MAP[field.type]) {
    return { ...field, type: TYPE_MAP[field.type] };
  }
  // Unknown type → Text
  return { ...field, type: 'Text', length: field.length || 255 };
}

async function readStandardObjectFields(objectName) {
  const fieldsDir = path.join(OBJECTS_DIR, objectName, 'fields');
  if (!fs.existsSync(fieldsDir)) return [];

  const fieldFiles = fs.readdirSync(fieldsDir).filter(f => f.endsWith('.field-meta.xml'));
  const fields = [];

  for (const ff of fieldFiles) {
    const xml = fs.readFileSync(path.join(fieldsDir, ff), 'utf8');
    const parsed = await parseStringPromise(xml, { explicitArray: false });
    const fd = parsed.CustomField;

    const field = {
      apiName: fd.fullName || path.basename(ff, '.field-meta.xml'),
      label: fd.label || fd.fullName,
      type: fd.type,
    };

    if (fd.length) field.length = parseInt(fd.length, 10);
    if (fd.precision) field.precision = parseInt(fd.precision, 10);
    if (fd.scale !== undefined && fd.scale !== '') field.scale = parseInt(fd.scale, 10);
    if (fd.required === 'true') field.required = true;
    if (fd.visibleLines) field.visibleLines = parseInt(fd.visibleLines, 10);
    if (fd.defaultValue !== undefined && fd.defaultValue !== '') {
      field.defaultValue = fd.type === 'Checkbox' ? (fd.defaultValue === 'true') : fd.defaultValue;
    }

    if (fd.type === 'Picklist' || fd.type === 'MultiselectPicklist') {
      field.values = [];
      if (fd.valueSet?.valueSetDefinition?.value) {
        let items = fd.valueSet.valueSetDefinition.value;
        if (!Array.isArray(items)) items = [items];
        field.values = items.map(i => i.fullName || i.label);
      }
    }

    if (fd.type === 'Lookup' || fd.type === 'MasterDetail') {
      if (fd.referenceTo) field.referenceTo = fd.referenceTo;
      if (fd.relationshipLabel) field.relationshipLabel = fd.relationshipLabel;
      if (fd.relationshipName) field.relationshipName = fd.relationshipName;
      if (fd.deleteConstraint) field.deleteConstraint = fd.deleteConstraint;
    }

    if (fd.type === 'Formula') {
      if (fd.formula) field.formula = fd.formula;
      if (fd.formulaReturnType) field.formulaReturnType = fd.formulaReturnType;
    }

    fields.push(field);
  }
  return fields;
}

function cleanFieldForYaml(field) {
  const mapped = mapFieldType(field);
  if (!mapped) return null;

  const clean = {
    apiName: mapped.apiName,
    label: mapped.label,
    type: mapped.type,
  };

  if (mapped.length) clean.length = mapped.length;
  if (mapped.precision) clean.precision = mapped.precision;
  if (mapped.scale !== undefined) clean.scale = mapped.scale;
  if (mapped.required) clean.required = true;
  if (mapped.visibleLines) clean.visibleLines = mapped.visibleLines;
  if (mapped.values && mapped.values.length > 0) {
    clean.values = mapped.values.filter(v => !v.startsWith('[GlobalValueSet'));
  }
  if (mapped.referenceTo) clean.referenceTo = mapped.referenceTo;
  if (mapped.relationshipLabel) clean.relationshipLabel = mapped.relationshipLabel;
  if (mapped.relationshipName) clean.relationshipName = mapped.relationshipName;
  if (mapped.deleteConstraint) clean.deleteConstraint = mapped.deleteConstraint;
  if (mapped.externalId) clean.externalId = true;
  if (mapped.defaultValue !== undefined) clean.defaultValue = mapped.defaultValue;

  // Ensure Text fields have length
  if (clean.type === 'Text' && !clean.length) clean.length = 255;
  if (clean.type === 'LongTextArea' && !clean.length) clean.length = 32000;
  if (clean.type === 'LongTextArea' && !clean.visibleLines) clean.visibleLines = 3;
  if (clean.type === 'TextArea' && !clean.length) clean.length = 255;
  if ((clean.type === 'Number' || clean.type === 'Currency' || clean.type === 'Percent') && !clean.precision) {
    clean.precision = 18;
    if (clean.scale === undefined) clean.scale = 2;
  }

  return clean;
}

function yamlValue(val) {
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'string') {
    if (val.includes(':') || val.includes('#') || val.includes("'") || val.includes('"') || val.includes('\n') || val.match(/^[{[]/) || val === '' || val === 'true' || val === 'false' || val === 'null' || val === 'yes' || val === 'no') {
      return "'" + val.replace(/'/g, "''") + "'";
    }
    return val;
  }
  return String(val);
}

function fieldToYaml(field, indent) {
  const lines = [];
  lines.push(`${indent}- apiName: ${yamlValue(field.apiName)}`);
  lines.push(`${indent}  label: ${yamlValue(field.label)}`);
  lines.push(`${indent}  type: ${field.type}`);

  if (field.length) lines.push(`${indent}  length: ${field.length}`);
  if (field.precision) lines.push(`${indent}  precision: ${field.precision}`);
  if (field.scale !== undefined) lines.push(`${indent}  scale: ${field.scale}`);
  if (field.required) lines.push(`${indent}  required: true`);
  if (field.externalId) lines.push(`${indent}  externalId: true`);
  if (field.visibleLines) lines.push(`${indent}  visibleLines: ${field.visibleLines}`);
  if (field.defaultValue !== undefined) lines.push(`${indent}  defaultValue: ${yamlValue(field.defaultValue)}`);
  if (field.referenceTo) lines.push(`${indent}  referenceTo: ${field.referenceTo}`);
  if (field.relationshipLabel) lines.push(`${indent}  relationshipLabel: ${yamlValue(field.relationshipLabel)}`);
  if (field.relationshipName) lines.push(`${indent}  relationshipName: ${field.relationshipName}`);
  if (field.deleteConstraint) lines.push(`${indent}  deleteConstraint: ${field.deleteConstraint}`);
  if (field.values && field.values.length > 0) {
    if (field.values.length <= 6) {
      lines.push(`${indent}  values: [${field.values.map(v => yamlValue(v)).join(', ')}]`);
    } else {
      lines.push(`${indent}  values:`);
      field.values.forEach(v => lines.push(`${indent}    - ${yamlValue(v)}`));
    }
  }

  return lines.join('\n');
}

async function main() {
  console.log('Reading NPSP SFDX project...');
  const sfdxResult = await readSfdxProject(NPSP_DIR);

  // Build standard objects with NPSP field extensions
  const standardObjectDefs = [
    {
      apiName: 'Account', label: 'Account', pluralLabel: 'Accounts',
      description: 'Organization/Household account',
      baseFields: [
        { apiName: 'Name', label: 'Account Name', type: 'Text', length: 255 },
        { apiName: 'Phone', label: 'Phone', type: 'Phone' },
        { apiName: 'Website', label: 'Website', type: 'Url' },
        { apiName: 'Industry', label: 'Industry', type: 'Picklist', values: ['Nonprofit', 'Education', 'Government', 'Healthcare', 'Technology', 'Finance', 'Other'] },
        { apiName: 'Type', label: 'Type', type: 'Picklist', values: ['Household', 'Organization', 'Foundation', 'Government', 'Other'] },
        { apiName: 'Description', label: 'Description', type: 'LongTextArea', length: 32000, visibleLines: 3 },
        { apiName: 'BillingStreet', label: 'Billing Street', type: 'Text', length: 255 },
        { apiName: 'BillingCity', label: 'Billing City', type: 'Text', length: 40 },
        { apiName: 'BillingState', label: 'Billing State', type: 'Text', length: 80 },
        { apiName: 'BillingPostalCode', label: 'Billing Zip/Postal Code', type: 'Text', length: 20 },
        { apiName: 'BillingCountry', label: 'Billing Country', type: 'Text', length: 80 },
        { apiName: 'AnnualRevenue', label: 'Annual Revenue', type: 'Currency', precision: 18, scale: 0 },
        { apiName: 'NumberOfEmployees', label: 'Number of Employees', type: 'Number', precision: 8, scale: 0 },
      ],
    },
    {
      apiName: 'Contact', label: 'Contact', pluralLabel: 'Contacts',
      description: 'Individual donor or constituent',
      baseFields: [
        { apiName: 'FirstName', label: 'First Name', type: 'Text', length: 40 },
        { apiName: 'LastName', label: 'Last Name', type: 'Text', length: 80 },
        { apiName: 'Email', label: 'Email', type: 'Email' },
        { apiName: 'Phone', label: 'Phone', type: 'Phone' },
        { apiName: 'MobilePhone', label: 'Mobile Phone', type: 'Phone' },
        { apiName: 'MailingStreet', label: 'Mailing Street', type: 'Text', length: 255 },
        { apiName: 'MailingCity', label: 'Mailing City', type: 'Text', length: 40 },
        { apiName: 'MailingState', label: 'Mailing State', type: 'Text', length: 80 },
        { apiName: 'MailingPostalCode', label: 'Mailing Zip/Postal Code', type: 'Text', length: 20 },
        { apiName: 'MailingCountry', label: 'Mailing Country', type: 'Text', length: 80 },
        { apiName: 'Title', label: 'Title', type: 'Text', length: 128 },
        { apiName: 'Department', label: 'Department', type: 'Text', length: 80 },
        { apiName: 'Birthdate', label: 'Birthdate', type: 'Date' },
        { apiName: 'AccountId', label: 'Account', type: 'Lookup', referenceTo: 'Account' },
        { apiName: 'Description', label: 'Description', type: 'LongTextArea', length: 32000, visibleLines: 3 },
      ],
    },
    {
      apiName: 'Opportunity', label: 'Donation', pluralLabel: 'Donations',
      description: 'Donation/grant/pledge',
      baseFields: [
        { apiName: 'Name', label: 'Donation Name', type: 'Text', length: 120 },
        { apiName: 'Amount', label: 'Amount', type: 'Currency', precision: 18, scale: 2 },
        { apiName: 'CloseDate', label: 'Close Date', type: 'Date' },
        { apiName: 'StageName', label: 'Stage', type: 'Picklist', values: ['Prospecting', 'Pledged', 'Received', 'Thanked', 'Closed Won', 'Closed Lost'] },
        { apiName: 'Probability', label: 'Probability (%)', type: 'Percent', precision: 3, scale: 0 },
        { apiName: 'AccountId', label: 'Account', type: 'Lookup', referenceTo: 'Account' },
        { apiName: 'Description', label: 'Description', type: 'LongTextArea', length: 32000, visibleLines: 3 },
        { apiName: 'Type', label: 'Type', type: 'Picklist', values: ['Individual', 'Corporate', 'Foundation', 'Government', 'In-Kind', 'Major Gift', 'Matching Gift'] },
        { apiName: 'LeadSource', label: 'Lead Source', type: 'Picklist', values: ['Web', 'Phone Inquiry', 'Partner Referral', 'Purchased List', 'Event', 'Other'] },
        { apiName: 'NextStep', label: 'Next Step', type: 'Text', length: 255 },
        { apiName: 'CampaignId', label: 'Campaign', type: 'Lookup', referenceTo: 'Campaign' },
      ],
    },
    {
      apiName: 'Lead', label: 'Lead', pluralLabel: 'Leads',
      description: 'Prospective donor or volunteer',
      baseFields: [
        { apiName: 'FirstName', label: 'First Name', type: 'Text', length: 40 },
        { apiName: 'LastName', label: 'Last Name', type: 'Text', length: 80 },
        { apiName: 'Company', label: 'Company/Organization', type: 'Text', length: 255 },
        { apiName: 'Email', label: 'Email', type: 'Email' },
        { apiName: 'Phone', label: 'Phone', type: 'Phone' },
        { apiName: 'Status', label: 'Status', type: 'Picklist', values: ['Open', 'Contacted', 'Qualified', 'Unqualified', 'Converted'] },
        { apiName: 'LeadSource', label: 'Lead Source', type: 'Picklist', values: ['Web', 'Phone Inquiry', 'Partner Referral', 'Event', 'Other'] },
        { apiName: 'Street', label: 'Street', type: 'Text', length: 255 },
        { apiName: 'City', label: 'City', type: 'Text', length: 40 },
        { apiName: 'State', label: 'State', type: 'Text', length: 80 },
        { apiName: 'PostalCode', label: 'Zip/Postal Code', type: 'Text', length: 20 },
        { apiName: 'Description', label: 'Description', type: 'LongTextArea', length: 32000, visibleLines: 3 },
      ],
    },
    {
      apiName: 'Campaign', label: 'Campaign', pluralLabel: 'Campaigns',
      description: 'Fundraising campaign or event',
      baseFields: [
        { apiName: 'Name', label: 'Campaign Name', type: 'Text', length: 80 },
        { apiName: 'Type', label: 'Type', type: 'Picklist', values: ['Direct Mail', 'Email', 'Telemarketing', 'Event', 'Webinar', 'Social Media', 'Other'] },
        { apiName: 'Status', label: 'Status', type: 'Picklist', values: ['Planned', 'In Progress', 'Completed', 'Aborted'] },
        { apiName: 'StartDate', label: 'Start Date', type: 'Date' },
        { apiName: 'EndDate', label: 'End Date', type: 'Date' },
        { apiName: 'BudgetedCost', label: 'Budgeted Cost', type: 'Currency', precision: 18, scale: 2 },
        { apiName: 'ActualCost', label: 'Actual Cost', type: 'Currency', precision: 18, scale: 2 },
        { apiName: 'ExpectedRevenue', label: 'Expected Revenue', type: 'Currency', precision: 18, scale: 2 },
        { apiName: 'Description', label: 'Description', type: 'LongTextArea', length: 32000, visibleLines: 3 },
        { apiName: 'IsActive', label: 'Active', type: 'Checkbox', defaultValue: true },
        { apiName: 'NumberOfContacts', label: 'Contacts', type: 'Number', precision: 8, scale: 0 },
        { apiName: 'NumberOfResponses', label: 'Responses', type: 'Number', precision: 8, scale: 0 },
        { apiName: 'ParentId', label: 'Parent Campaign', type: 'Lookup', referenceTo: 'Campaign' },
      ],
    },
    {
      apiName: 'Task', label: 'Task', pluralLabel: 'Tasks',
      description: 'Activity/task record',
      baseFields: [
        { apiName: 'Subject', label: 'Subject', type: 'Picklist', values: ['Call', 'Email', 'Send Letter', 'Send Quote', 'Other'] },
        { apiName: 'Status', label: 'Status', type: 'Picklist', values: ['Not Started', 'In Progress', 'Completed', 'Waiting on someone else', 'Deferred'] },
        { apiName: 'Priority', label: 'Priority', type: 'Picklist', values: ['High', 'Normal', 'Low'] },
        { apiName: 'ActivityDate', label: 'Due Date', type: 'Date' },
        { apiName: 'Description', label: 'Comments', type: 'LongTextArea', length: 32000, visibleLines: 3 },
        { apiName: 'WhoId', label: 'Name (Contact/Lead)', type: 'Lookup', referenceTo: 'Contact' },
        { apiName: 'WhatId', label: 'Related To', type: 'Lookup', referenceTo: 'Account' },
        { apiName: 'OwnerId', label: 'Assigned To', type: 'Lookup', referenceTo: 'User' },
      ],
    },
    {
      apiName: 'Event', label: 'Event', pluralLabel: 'Events',
      description: 'Calendar event',
      baseFields: [
        { apiName: 'Subject', label: 'Subject', type: 'Text', length: 255 },
        { apiName: 'StartDateTime', label: 'Start Date/Time', type: 'DateTime' },
        { apiName: 'EndDateTime', label: 'End Date/Time', type: 'DateTime' },
        { apiName: 'Location', label: 'Location', type: 'Text', length: 255 },
        { apiName: 'Description', label: 'Description', type: 'LongTextArea', length: 32000, visibleLines: 3 },
        { apiName: 'WhoId', label: 'Name (Contact/Lead)', type: 'Lookup', referenceTo: 'Contact' },
        { apiName: 'WhatId', label: 'Related To', type: 'Lookup', referenceTo: 'Account' },
        { apiName: 'OwnerId', label: 'Assigned To', type: 'Lookup', referenceTo: 'User' },
      ],
    },
    {
      apiName: 'CampaignMember', label: 'Campaign Member', pluralLabel: 'Campaign Members',
      description: 'Contact/Lead associated with a Campaign',
      baseFields: [
        { apiName: 'CampaignId', label: 'Campaign', type: 'Lookup', referenceTo: 'Campaign' },
        { apiName: 'ContactId', label: 'Contact', type: 'Lookup', referenceTo: 'Contact' },
        { apiName: 'LeadId', label: 'Lead', type: 'Lookup', referenceTo: 'Lead' },
        { apiName: 'Status', label: 'Status', type: 'Picklist', values: ['Sent', 'Responded', 'Attended', 'No Show'] },
        { apiName: 'FirstRespondedDate', label: 'First Responded Date', type: 'Date' },
      ],
    },
    {
      apiName: 'User', label: 'User', pluralLabel: 'Users',
      description: 'System user',
      baseFields: [
        { apiName: 'Username', label: 'Username', type: 'Text', length: 80 },
        { apiName: 'LastName', label: 'Last Name', type: 'Text', length: 80 },
        { apiName: 'FirstName', label: 'First Name', type: 'Text', length: 40 },
        { apiName: 'Email', label: 'Email', type: 'Email' },
        { apiName: 'Title', label: 'Title', type: 'Text', length: 80 },
        { apiName: 'IsActive', label: 'Active', type: 'Checkbox', defaultValue: true },
        { apiName: 'ProfileId', label: 'Profile', type: 'Text', length: 80 },
        { apiName: 'Alias', label: 'Alias', type: 'Text', length: 8 },
      ],
    },
  ];

  // Read NPSP custom fields for standard objects
  console.log('Reading NPSP standard object extensions...');
  for (const stdObj of standardObjectDefs) {
    const npspFields = await readStandardObjectFields(stdObj.apiName);
    const cleanedNpspFields = npspFields
      .map(f => cleanFieldForYaml(f))
      .filter(f => f !== null);

    // Merge: base fields + NPSP custom fields
    const existingNames = new Set(stdObj.baseFields.map(f => f.apiName));
    for (const nf of cleanedNpspFields) {
      if (!existingNames.has(nf.apiName)) {
        stdObj.baseFields.push(nf);
        existingNames.add(nf.apiName);
      }
    }
    console.log(`  ${stdObj.apiName}: ${stdObj.baseFields.length} fields (${cleanedNpspFields.length} from NPSP)`);
  }

  // Process custom objects
  const customObjects = sfdxResult.objects
    .filter(o => !shouldSkip(o.apiName))
    .map(obj => {
      const fields = (obj.fields || [])
        .map(f => cleanFieldForYaml(f))
        .filter(f => f !== null);
      return { ...obj, fields };
    })
    .filter(o => o.fields.length > 0 || o.apiName === 'Fund__c');

  // Add namespaced objects with their fields
  const namespacedObjects = [
    'npe01__OppPayment__c',
    'npe03__Recurring_Donation__c',
    'npe4__Relationship__c',
    'npe5__Affiliation__c',
    'npo02__Household__c',
  ];

  const namespacedDefs = [];
  for (const nsObj of namespacedObjects) {
    const fieldsDir = path.join(OBJECTS_DIR, nsObj, 'fields');
    const metaFile = path.join(OBJECTS_DIR, nsObj, `${nsObj}.object-meta.xml`);

    let objDef = { apiName: nsObj, label: nsObj, fields: [] };
    if (fs.existsSync(metaFile)) {
      const xml = fs.readFileSync(metaFile, 'utf8');
      const parsed = await parseStringPromise(xml, { explicitArray: false });
      const od = parsed.CustomObject;
      objDef.label = od.label || nsObj;
      objDef.pluralLabel = od.pluralLabel || od.label || nsObj;
      objDef.description = od.description || '';
    }

    if (fs.existsSync(fieldsDir)) {
      const fieldFiles = fs.readdirSync(fieldsDir).filter(f => f.endsWith('.field-meta.xml'));
      for (const ff of fieldFiles) {
        const xml = fs.readFileSync(path.join(fieldsDir, ff), 'utf8');
        const parsed = await parseStringPromise(xml, { explicitArray: false });
        const fd = parsed.CustomField;
        const field = {
          apiName: fd.fullName || path.basename(ff, '.field-meta.xml'),
          label: fd.label || fd.fullName,
          type: fd.type,
        };
        if (fd.length) field.length = parseInt(fd.length, 10);
        if (fd.precision) field.precision = parseInt(fd.precision, 10);
        if (fd.scale !== undefined) field.scale = parseInt(fd.scale, 10);
        if (fd.referenceTo) field.referenceTo = fd.referenceTo;
        if (fd.relationshipLabel) field.relationshipLabel = fd.relationshipLabel;
        if (fd.relationshipName) field.relationshipName = fd.relationshipName;
        if (fd.type === 'Picklist' || fd.type === 'MultiselectPicklist') {
          field.values = [];
          if (fd.valueSet?.valueSetDefinition?.value) {
            let items = fd.valueSet.valueSetDefinition.value;
            if (!Array.isArray(items)) items = [items];
            field.values = items.map(i => i.fullName || i.label);
          }
        }
        const cleaned = cleanFieldForYaml(field);
        if (cleaned) objDef.fields.push(cleaned);
      }
    }

    // Remap namespaced names to clean names for Pforce
    const RENAMES = {
      'npe01__OppPayment__c': { apiName: 'Payment__c', label: 'Payment', pluralLabel: 'Payments', description: 'Donation payment' },
      'npe03__Recurring_Donation__c': { apiName: 'Recurring_Donation__c', label: 'Recurring Donation', pluralLabel: 'Recurring Donations', description: 'Recurring donation schedule' },
      'npe4__Relationship__c': { apiName: 'Relationship__c', label: 'Relationship', pluralLabel: 'Relationships', description: 'Contact-to-contact relationship' },
      'npe5__Affiliation__c': { apiName: 'Affiliation__c', label: 'Affiliation', pluralLabel: 'Affiliations', description: 'Contact-to-organization affiliation' },
      'npo02__Household__c': { apiName: 'Household__c', label: 'Household', pluralLabel: 'Households', description: 'Household group' },
    };

    if (RENAMES[nsObj]) {
      Object.assign(objDef, RENAMES[nsObj]);
      // Also rename field apiNames: remove namespace prefix
      objDef.fields = objDef.fields.map(f => ({
        ...f,
        apiName: f.apiName.replace(/^npe\d{1,2}__/, '').replace(/^npo\d{1,2}__/, ''),
        referenceTo: f.referenceTo ? f.referenceTo.replace(/^npe\d{1,2}__/, '').replace(/^npo\d{1,2}__/, '') : f.referenceTo,
      }));
    }

    namespacedDefs.push(objDef);
    console.log(`  ${objDef.apiName}: ${objDef.fields.length} fields`);
  }

  // Rename custom object fields that reference namespaced objects
  for (const obj of customObjects) {
    obj.fields = obj.fields.map(f => ({
      ...f,
      referenceTo: f.referenceTo ? f.referenceTo
        .replace('npe01__OppPayment__c', 'Payment__c')
        .replace('npe03__Recurring_Donation__c', 'Recurring_Donation__c')
        .replace('npe4__Relationship__c', 'Relationship__c')
        .replace('npe5__Affiliation__c', 'Affiliation__c')
        .replace('npo02__Household__c', 'Household__c')
        : f.referenceTo,
    }));
  }

  // Also update standard objects' NPSP fields
  for (const stdObj of standardObjectDefs) {
    stdObj.baseFields = stdObj.baseFields.map(f => ({
      ...f,
      apiName: f.apiName.replace(/^npe\d{1,2}__/, '').replace(/^npo\d{1,2}__/, ''),
      referenceTo: f.referenceTo ? f.referenceTo
        .replace('npe01__OppPayment__c', 'Payment__c')
        .replace('npe03__Recurring_Donation__c', 'Recurring_Donation__c')
        .replace('npe4__Relationship__c', 'Relationship__c')
        .replace('npe5__Affiliation__c', 'Affiliation__c')
        .replace('npo02__Household__c', 'Household__c')
        : f.referenceTo,
    }));
  }

  // Generate YAML
  console.log('\nGenerating schema.yaml...');
  const lines = [];
  lines.push("apiVersion: '62.0'");
  lines.push('');

  // Standard objects
  lines.push('standardObjects:');
  for (const stdObj of standardObjectDefs) {
    lines.push(`  - apiName: ${stdObj.apiName}`);
    lines.push(`    label: ${yamlValue(stdObj.label)}`);
    lines.push(`    pluralLabel: ${yamlValue(stdObj.pluralLabel)}`);
    lines.push(`    description: ${yamlValue(stdObj.description)}`);
    lines.push('    fields:');
    for (const field of stdObj.baseFields) {
      lines.push(fieldToYaml(field, '      '));
    }
    lines.push('');
  }

  // Custom objects (NPSP + namespaced)
  const allCustom = [...namespacedDefs, ...customObjects].sort((a, b) => a.apiName.localeCompare(b.apiName));

  lines.push('objects:');
  for (const obj of allCustom) {
    lines.push(`  - apiName: ${obj.apiName}`);
    lines.push(`    label: ${yamlValue(obj.label)}`);
    lines.push(`    pluralLabel: ${yamlValue(obj.pluralLabel || obj.label)}`);
    lines.push(`    description: ${yamlValue(obj.description || '')}`);
    lines.push(`    sharingModel: ${obj.sharingModel || 'ReadWrite'}`);
    lines.push(`    deploymentStatus: Deployed`);

    if (obj.nameField) {
      lines.push('    nameField:');
      lines.push(`      apiName: ${obj.nameField.apiName}`);
      lines.push(`      label: ${yamlValue(obj.nameField.label)}`);
      lines.push(`      type: ${obj.nameField.type}`);
      if (obj.nameField.length) lines.push(`      length: ${obj.nameField.length}`);
      if (obj.nameField.displayFormat) lines.push(`      displayFormat: ${yamlValue(obj.nameField.displayFormat)}`);
    }

    if (obj.fields && obj.fields.length > 0) {
      lines.push('    fields:');
      for (const field of obj.fields) {
        lines.push(fieldToYaml(field, '      '));
      }
    }
    lines.push('');
  }

  // Dashboard configuration
  lines.push('dashboard:');
  lines.push('  title: NPSP Nonprofit Dashboard');
  lines.push('  widgets:');
  lines.push('    - type: pipeline');
  lines.push('      object: Opportunity');
  lines.push('      field: StageName');
  lines.push('      title: Donation Pipeline');
  lines.push('    - type: count');
  lines.push('      object: Contact');
  lines.push('      title: Total Constituents');
  lines.push('    - type: count');
  lines.push('      object: Opportunity');
  lines.push('      title: Total Donations');
  lines.push('    - type: count');
  lines.push('      object: Account');
  lines.push('      title: Total Organizations');
  lines.push('    - type: count');
  lines.push('      object: Campaign');
  lines.push('      title: Active Campaigns');
  lines.push('    - type: count');
  lines.push('      object: Recurring_Donation__c');
  lines.push('      title: Recurring Donors');
  lines.push('    - type: pipeline');
  lines.push('      object: Campaign');
  lines.push('      field: Status');
  lines.push('      title: Campaign Status');
  lines.push('    - type: count');
  lines.push('      object: Payment__c');
  lines.push('      title: Total Payments');

  const yaml = lines.join('\n') + '\n';
  const outputPath = path.join(__dirname, 'schema.yaml');
  fs.writeFileSync(outputPath, yaml);

  // Count totals
  let totalObjects = standardObjectDefs.length + allCustom.length;
  let totalFields = 0;
  for (const s of standardObjectDefs) totalFields += s.baseFields.length;
  for (const c of allCustom) totalFields += (c.fields || []).length;

  console.log(`\nGenerated: ${outputPath}`);
  console.log(`Total objects: ${totalObjects}`);
  console.log(`Total fields: ${totalFields}`);
  console.log('Standard objects:', standardObjectDefs.map(o => o.apiName).join(', '));
  console.log('Custom objects:', allCustom.map(o => o.apiName).join(', '));
}

main().catch(console.error);
