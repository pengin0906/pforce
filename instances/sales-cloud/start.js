#!/usr/bin/env node
/**
 * Sales Cloud - Full SFA Standalone Pforce Instance
 * Runs on port 3002 with comprehensive Sales Cloud schema
 */

const path = require('path');

// Set instance config
process.env.PFORCE_SCHEMA = path.join(__dirname, 'schema.yaml');
process.env.PFORCE_ACCESS_CONTROL = path.join(__dirname, 'access-control.yaml');
process.env.PFORCE_SEED_DATA = path.join(__dirname, 'seed-data.js');
process.env.PFORCE_INSTANCE_NAME = 'SalesCloud';
process.env.PFORCE_FIRESTORE_PREFIX = 'sc_';
process.env.PFORCE_PUBLIC_DIR = path.join(__dirname, 'public');
process.env.PORT = process.env.PORT || '3002';
process.env.NODE_ENV = 'development';
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8181';

// Start the server
require('../../server');
