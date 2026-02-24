#!/usr/bin/env node
/**
 * DreamHouse - Standalone Pforce Instance
 * Runs on port 3001 with its own schema, seed data, and Firestore namespace
 */

const path = require('path');

// Register DreamHouse object prefixes
const sfId = require('../../salesforce-id');
sfId.KEY_PREFIXES.Broker__c = 'a0K';
sfId.KEY_PREFIXES.Property__c = 'a0L';
sfId.PREFIX_TO_OBJECT['a0K'] = 'Broker__c';
sfId.PREFIX_TO_OBJECT['a0L'] = 'Property__c';

// Set instance config
process.env.PFORCE_SCHEMA = path.join(__dirname, 'schema.yaml');
process.env.PFORCE_ACCESS_CONTROL = path.join(__dirname, 'access-control.yaml');
process.env.PFORCE_SEED_DATA = path.join(__dirname, 'seed-data.js');
process.env.PFORCE_INSTANCE_NAME = 'DreamHouse';
process.env.PFORCE_FIRESTORE_PREFIX = 'dh_';
process.env.PFORCE_PUBLIC_DIR = path.join(__dirname, 'public');
process.env.PORT = process.env.PORT || '3001';
process.env.NODE_ENV = 'development';
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8181';

// Start the server
require('../../server');
