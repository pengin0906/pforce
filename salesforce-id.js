/**
 * Salesforce 18-Character ID Generator & Utilities
 *
 * Salesforce ID format:
 * - 15-char case-sensitive ID = 3-char key prefix + 12-char random (base62)
 * - 18-char case-insensitive ID = 15-char ID + 3-char checksum
 *
 * Checksum algorithm:
 * 1. Split 15-char ID into 3 groups of 5 chars
 * 2. For each group, build a 5-bit number (LSB first):
 *    - bit = 1 if char is uppercase A-Z, 0 otherwise
 * 3. Map each 5-bit number to: 0-25 → A-Z, 26-31 → 0-5
 */

const crypto = require('crypto');

// Base62 character set (Salesforce compatible)
const BASE62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

// Checksum lookup: index 0-25 → A-Z, 26-31 → 0-5
const CHECKSUM_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ012345';

/**
 * Salesforce standard object key prefixes
 */
const KEY_PREFIXES = {
  // Standard Objects
  Account:                '001',
  Contact:                '003',
  Lead:                   '00Q',
  Opportunity:            '006',
  OpportunityLineItem:    '00k',
  OpportunityContactRole: '00K',
  Campaign:               '701',
  CampaignMember:         '00v',
  Case:                   '500',
  Task:                   '00T',
  Event:                  '00U',
  Product2:               '01t',
  Pricebook2:             '01s',
  PricebookEntry:         '01u',
  Quote:                  '0Q0',
  QuoteLineItem:          '0QL',
  Contract:               '800',
  Order:                  '801',
  OrderItem:              '802',
  User:                   '005',
  Note:                   '002',
  ContentDocument:        '069',

  // Custom Objects (using a0x pattern like Salesforce)
  Medical_Institution__c: 'a0A',
  Doctor__c:              'a0B',
  Pharma_Opportunity__c:  'a0C',
  Genomic_Project__c:     'a0D',
  Visit_Record__c:        'a0E',
  Specimen__c:            'a0F',
  MA_Activity__c:         'a0G',
  Seminar__c:             'a0H',
  Lab__c:                 'a0I',
  Joint_Research__c:      'a0J',
  Broker__c:              'a0K',
  Property__c:            'a0L',
  Bento_Order__c:         'a0M',
  Seminar_Attendee__c:    'a0N',
  Testing_Order__c:       'a0O',
  Daily_Report__c:        'a0P',
  Approval_Request__c:    'a0Q',
  Expense_Report__c:      'a0R',
  Competitive_Intel__c:   'a0S',
  Visit_Target__c:        'a0T',
  Workflow_Instance__c:   'a0U'
};

/**
 * Reverse lookup: prefix → object name
 */
const PREFIX_TO_OBJECT = {};
for (const [objName, prefix] of Object.entries(KEY_PREFIXES)) {
  PREFIX_TO_OBJECT[prefix] = objName;
}

/**
 * Calculate 3-character checksum for a 15-char Salesforce ID
 * @param {string} id15 - 15-character case-sensitive ID
 * @returns {string} 3-character checksum
 */
function calculateChecksum(id15) {
  if (id15.length !== 15) {
    throw new Error(`ID must be 15 characters, got ${id15.length}`);
  }

  let checksum = '';
  for (let group = 0; group < 3; group++) {
    let bits = 0;
    for (let i = 0; i < 5; i++) {
      const ch = id15[group * 5 + i];
      if (ch >= 'A' && ch <= 'Z') {
        bits |= (1 << i);
      }
    }
    checksum += CHECKSUM_CHARS[bits];
  }
  return checksum;
}

/**
 * Generate a random 12-character base62 string
 * @returns {string} 12-char random string
 */
function randomBase62(length = 12) {
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += BASE62[bytes[i] % 62];
  }
  return result;
}

/**
 * Generate a new 18-character Salesforce-compatible ID
 * @param {string} objectName - The sObject API name (e.g., 'Account', 'Medical_Institution__c')
 * @returns {string} 18-character ID
 */
function generateId(objectName) {
  const prefix = KEY_PREFIXES[objectName];
  if (!prefix) {
    throw new Error(`Unknown object type: ${objectName}. Register it in KEY_PREFIXES first.`);
  }

  const randomPart = randomBase62(12);
  const id15 = prefix + randomPart;
  const checksum = calculateChecksum(id15);
  return id15 + checksum;
}

/**
 * Convert a 15-char ID to 18-char ID
 * @param {string} id15 - 15-character case-sensitive ID
 * @returns {string} 18-character ID
 */
function to18(id15) {
  if (id15.length === 18) return id15;
  if (id15.length !== 15) {
    throw new Error(`ID must be 15 or 18 characters, got ${id15.length}: ${id15}`);
  }
  return id15 + calculateChecksum(id15);
}

/**
 * Extract the 15-char case-sensitive ID from an 18-char ID
 * @param {string} id18 - 18-character ID
 * @returns {string} 15-character ID
 */
function to15(id18) {
  if (id18.length === 15) return id18;
  if (id18.length !== 18) {
    throw new Error(`ID must be 15 or 18 characters, got ${id18.length}: ${id18}`);
  }
  return id18.substring(0, 15);
}

/**
 * Validate a Salesforce ID (15 or 18 chars)
 * @param {string} id - The ID to validate
 * @returns {{ valid: boolean, error?: string }}
 */
function validateId(id) {
  if (!id || typeof id !== 'string') {
    return { valid: false, error: 'ID must be a non-empty string' };
  }

  if (id.length !== 15 && id.length !== 18) {
    return { valid: false, error: `ID must be 15 or 18 characters, got ${id.length}` };
  }

  // Check all chars are alphanumeric
  if (!/^[a-zA-Z0-9]+$/.test(id)) {
    return { valid: false, error: 'ID must contain only alphanumeric characters' };
  }

  // If 18-char, validate checksum
  if (id.length === 18) {
    const expectedChecksum = calculateChecksum(id.substring(0, 15));
    const actualChecksum = id.substring(15, 18);
    if (expectedChecksum !== actualChecksum) {
      return { valid: false, error: `Invalid checksum: expected ${expectedChecksum}, got ${actualChecksum}` };
    }
  }

  return { valid: true };
}

/**
 * Get the object type from a Salesforce ID by its key prefix
 * @param {string} id - 15 or 18 character ID
 * @returns {string|null} Object API name or null
 */
function getObjectType(id) {
  if (!id || id.length < 3) return null;
  const prefix = id.substring(0, 3);
  return PREFIX_TO_OBJECT[prefix] || null;
}

/**
 * Get the key prefix for an object type
 * @param {string} objectName - Object API name
 * @returns {string|null} 3-character key prefix or null
 */
function getKeyPrefix(objectName) {
  return KEY_PREFIXES[objectName] || null;
}

/**
 * Compare two Salesforce IDs for equality (case-insensitive for 18-char)
 * @param {string} id1
 * @param {string} id2
 * @returns {boolean}
 */
function idsEqual(id1, id2) {
  if (!id1 || !id2) return false;
  // Normalize both to 15-char for comparison
  const a = id1.length === 18 ? id1.substring(0, 15) : id1;
  const b = id2.length === 18 ? id2.substring(0, 15) : id2;
  return a === b;
}

/**
 * Generate a deterministic 18-char ID from an object name and a sequential index.
 * Useful for seed data where IDs need to be stable across runs.
 * @param {string} objectName
 * @param {number} index - Sequential number (1-based)
 * @returns {string} 18-character ID
 */
function generateSeedId(objectName, index) {
  const prefix = KEY_PREFIXES[objectName];
  if (!prefix) {
    throw new Error(`Unknown object type: ${objectName}`);
  }

  // Create a deterministic 12-char base62 string from the index
  // Pad the index to 12 chars using base62 encoding
  const padded = index.toString().padStart(12, '0');
  // Map each digit to a base62 char (keeping it readable: 0→A, 1→B, etc.)
  let encoded = '';
  for (let i = 0; i < 12; i++) {
    encoded += BASE62[parseInt(padded[i]) % 62];
  }

  const id15 = prefix + encoded;
  const checksum = calculateChecksum(id15);
  return id15 + checksum;
}

module.exports = {
  generateId,
  generateSeedId,
  to18,
  to15,
  validateId,
  getObjectType,
  getKeyPrefix,
  idsEqual,
  calculateChecksum,
  KEY_PREFIXES,
  PREFIX_TO_OBJECT
};
