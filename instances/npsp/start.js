#!/usr/bin/env node
/**
 * NPSP (Nonprofit Success Pack) - Standalone Pforce Instance
 * Runs on port 3002 with its own schema, seed data, and Firestore namespace
 *
 * 31 objects, 606 fields - Full nonprofit CRM
 */

const path = require('path');

// Register NPSP custom object prefixes
const sfId = require('../../salesforce-id');

const NPSP_PREFIXES = {
  Payment__c:                    'a0M',
  Recurring_Donation__c:         'a0N',
  General_Accounting_Unit__c:    'a0O',
  Allocation__c:                 'a0P',
  Address__c:                    'a0Q',
  Engagement_Plan_Template__c:   'a0R',
  Engagement_Plan__c:            'a0S',
  Engagement_Plan_Task__c:       'a0T',  // Note: reuses 00T for Task standard obj - using a0T for custom
  Level__c:                      'a0U',
  Affiliation__c:                'a0V',
  Relationship__c:               'a0W',
  Account_Soft_Credit__c:        'a0X',
  Partial_Soft_Credit__c:        'a0Y',
  Household__c:                  'a0Z',
  Error__c:                      'a10',
  Fund__c:                       'a11',
  DataImport__c:                 'a12',
  DataImportBatch__c:            'a13',
  Batch__c:                      'a14',
  Grant_Deadline__c:             'a15',
  RecurringDonationChangeLog__c: 'a16',
  RecurringDonationSchedule__c:  'a17',
};

for (const [objName, prefix] of Object.entries(NPSP_PREFIXES)) {
  sfId.KEY_PREFIXES[objName] = prefix;
  sfId.PREFIX_TO_OBJECT[prefix] = objName;
}

// Set instance config
process.env.PFORCE_SCHEMA = path.join(__dirname, 'schema.yaml');
process.env.PFORCE_ACCESS_CONTROL = path.join(__dirname, 'access-control.yaml');
process.env.PFORCE_SEED_DATA = path.join(__dirname, 'seed-data.js');
process.env.PFORCE_INSTANCE_NAME = 'NPSP';
process.env.PFORCE_FIRESTORE_PREFIX = 'npsp_';
process.env.PFORCE_PUBLIC_DIR = path.join(__dirname, 'public');
process.env.PORT = process.env.PORT || '3002';
process.env.NODE_ENV = 'development';
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8181';

// Start the server
require('../../server');
