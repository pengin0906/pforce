/**
 * SOSL Search Implementation for Pforce
 * Supports FIND, IN, RETURNING, and LIMIT clauses
 */

'use strict';

// ============================================================================
// SOSL Parser
// ============================================================================

/**
 * Parse a SOSL query string into a structured representation.
 *
 * Supported syntax:
 *   FIND {searchTerm}
 *   [IN ALL FIELDS | IN NAME FIELDS | IN EMAIL FIELDS | IN PHONE FIELDS]
 *   [RETURNING Object1(field1, field2 WHERE condition ORDER BY field ASC LIMIT n), Object2(field1)]
 *   [WITH DATA CATEGORY ...]   -- ignored
 *   [LIMIT n]
 *
 * @param {string} soslString - The SOSL query string
 * @returns {object} Parsed SOSL structure
 */
function parseSOSL(soslString) {
  if (!soslString || typeof soslString !== 'string') {
    throw new Error('SOSL query string is required');
  }

  const trimmed = soslString.trim();

  // --- Extract FIND {searchTerm} ---
  // The curly braces are SOSL syntax, not URL encoding.
  // Match FIND followed by optional whitespace, then {term} where term can contain anything except }
  const findRegex = /^FIND\s+\{([^}]*)\}/i;
  const findMatch = trimmed.match(findRegex);
  if (!findMatch) {
    throw new Error('SOSL query must start with FIND {searchTerm}');
  }

  const searchTerm = findMatch[1].trim();
  if (!searchTerm) {
    throw new Error('Search term cannot be empty');
  }

  // Everything after the FIND {term} clause
  let remainder = trimmed.slice(findMatch[0].length).trim();

  // --- Extract IN clause ---
  let inClause = 'ALL FIELDS';
  const inRegex = /^IN\s+(ALL\s+FIELDS|NAME\s+FIELDS|EMAIL\s+FIELDS|PHONE\s+FIELDS)/i;
  const inMatch = remainder.match(inRegex);
  if (inMatch) {
    inClause = inMatch[1].toUpperCase().replace(/\s+/g, ' ');
    remainder = remainder.slice(inMatch[0].length).trim();
  }

  // --- Strip WITH DATA CATEGORY clause (ignored) ---
  // WITH DATA CATEGORY can appear before or after RETURNING; strip it out.
  const withRegex = /\bWITH\s+DATA\s+CATEGORY\b[^)]*?(?=\bRETURNING\b|\bLIMIT\b|$)/i;
  remainder = remainder.replace(withRegex, '').trim();

  // --- Extract overall LIMIT (at the end, not inside RETURNING parentheses) ---
  let limit = null;
  // We need the LIMIT that is NOT inside parentheses.
  // Find the last LIMIT outside of parentheses.
  let parenDepth = 0;
  let lastLimitOutsideParens = -1;
  const upperRemainder = remainder.toUpperCase();
  for (let i = 0; i < remainder.length; i++) {
    if (remainder[i] === '(') parenDepth++;
    else if (remainder[i] === ')') parenDepth--;
    if (parenDepth === 0) {
      // Check if LIMIT starts at position i
      if (upperRemainder.slice(i).match(/^LIMIT\s+\d+/i)) {
        lastLimitOutsideParens = i;
      }
    }
  }

  if (lastLimitOutsideParens >= 0) {
    const limitFragment = remainder.slice(lastLimitOutsideParens);
    const lm = limitFragment.match(/^LIMIT\s+(\d+)/i);
    if (lm) {
      limit = parseInt(lm[1], 10);
      remainder = remainder.slice(0, lastLimitOutsideParens).trim();
    }
  }

  // --- Extract RETURNING clause ---
  let returning = [];
  const returningRegex = /^RETURNING\s+/i;
  const retMatch = remainder.match(returningRegex);
  if (retMatch) {
    const returningBody = remainder.slice(retMatch[0].length).trim();
    returning = parseReturningClause(returningBody);
  }

  return {
    searchTerm,
    inClause,
    returning,
    limit
  };
}

/**
 * Parse the body of a RETURNING clause into an array of object specifications.
 *
 * Examples:
 *   "Account(Name, Id WHERE Name LIKE '%test%' LIMIT 5), Contact(FirstName, LastName)"
 *   "Account, Contact"
 *
 * @param {string} body
 * @returns {Array<{object: string, fields: string[], where: string|null, orderBy: string|null, limit: number|null}>}
 */
function parseReturningClause(body) {
  const results = [];
  let pos = 0;

  while (pos < body.length) {
    // Skip whitespace and commas
    while (pos < body.length && (body[pos] === ',' || body[pos] === ' ' || body[pos] === '\t' || body[pos] === '\n')) {
      pos++;
    }
    if (pos >= body.length) break;

    // Read object name
    let objectName = '';
    while (pos < body.length && body[pos] !== '(' && body[pos] !== ',' && body[pos] !== ' ' && body[pos] !== '\t') {
      objectName += body[pos];
      pos++;
    }

    objectName = objectName.trim();
    if (!objectName) break;

    // Skip whitespace
    while (pos < body.length && (body[pos] === ' ' || body[pos] === '\t')) {
      pos++;
    }

    let fields = [];
    let where = null;
    let orderBy = null;
    let objectLimit = null;

    // Check for parenthesized field list
    if (pos < body.length && body[pos] === '(') {
      pos++; // skip '('
      // Find the matching closing paren
      let depth = 1;
      let innerStart = pos;
      while (pos < body.length && depth > 0) {
        if (body[pos] === '(') depth++;
        else if (body[pos] === ')') depth--;
        if (depth > 0) pos++;
      }
      const inner = body.slice(innerStart, pos).trim();
      pos++; // skip ')'

      // Parse the inner content: fields [WHERE ...] [ORDER BY ...] [LIMIT n]
      const parsed = parseObjectInner(inner);
      fields = parsed.fields;
      where = parsed.where;
      orderBy = parsed.orderBy;
      objectLimit = parsed.limit;
    }

    results.push({
      object: objectName,
      fields,
      where,
      orderBy,
      limit: objectLimit
    });
  }

  return results;
}

/**
 * Parse the contents inside a RETURNING object's parentheses.
 * E.g. "Name, Id WHERE Name LIKE '%test%' ORDER BY Name ASC LIMIT 5"
 *
 * @param {string} inner
 * @returns {{fields: string[], where: string|null, orderBy: string|null, limit: number|null}}
 */
function parseObjectInner(inner) {
  let fields = [];
  let where = null;
  let orderBy = null;
  let limit = null;

  // Find the positions of WHERE, ORDER BY, and LIMIT keywords (not inside quotes)
  const upperInner = inner.toUpperCase();
  let whereIdx = findKeywordOutsideQuotes(upperInner, 'WHERE');
  let orderByIdx = findKeywordOutsideQuotes(upperInner, 'ORDER BY');
  let limitIdx = findKeywordOutsideQuotes(upperInner, 'LIMIT');

  // The field list is everything before the first keyword
  let fieldEnd = inner.length;
  if (whereIdx >= 0 && whereIdx < fieldEnd) fieldEnd = whereIdx;
  if (orderByIdx >= 0 && orderByIdx < fieldEnd) fieldEnd = orderByIdx;
  if (limitIdx >= 0 && limitIdx < fieldEnd) fieldEnd = limitIdx;

  const fieldStr = inner.slice(0, fieldEnd).trim();
  if (fieldStr) {
    fields = fieldStr.split(',').map(f => f.trim()).filter(f => f);
  }

  // Extract WHERE clause (between WHERE and ORDER BY or LIMIT or end)
  if (whereIdx >= 0) {
    let whereEnd = inner.length;
    if (orderByIdx > whereIdx) whereEnd = orderByIdx;
    if (limitIdx > whereIdx && limitIdx < whereEnd) whereEnd = limitIdx;
    where = inner.slice(whereIdx + 5, whereEnd).trim(); // 5 = 'WHERE'.length
    if (!where) where = null;
  }

  // Extract ORDER BY clause
  if (orderByIdx >= 0) {
    let orderEnd = inner.length;
    if (limitIdx > orderByIdx) orderEnd = limitIdx;
    orderBy = inner.slice(orderByIdx + 8, orderEnd).trim(); // 8 = 'ORDER BY'.length
    if (!orderBy) orderBy = null;
  }

  // Extract LIMIT
  if (limitIdx >= 0) {
    const limitStr = inner.slice(limitIdx + 5).trim(); // 5 = 'LIMIT'.length
    const lm = limitStr.match(/^(\d+)/);
    if (lm) {
      limit = parseInt(lm[1], 10);
    }
  }

  return { fields, where, orderBy, limit };
}

/**
 * Find a keyword in a string that is not inside single quotes.
 * Returns the index of the keyword or -1 if not found.
 *
 * @param {string} upperStr - Uppercased string to search
 * @param {string} keyword - Uppercased keyword to find
 * @returns {number}
 */
function findKeywordOutsideQuotes(upperStr, keyword) {
  let inQuote = false;
  for (let i = 0; i <= upperStr.length - keyword.length; i++) {
    if (upperStr[i] === "'") {
      inQuote = !inQuote;
      continue;
    }
    if (inQuote) continue;

    if (upperStr.slice(i, i + keyword.length) === keyword) {
      // Make sure it's a word boundary (preceded by space/comma/start and followed by space/end)
      const before = i === 0 || /[\s,()]/.test(upperStr[i - 1]);
      const after = (i + keyword.length >= upperStr.length) || /[\s(]/.test(upperStr[i + keyword.length]);
      if (before && after) {
        return i;
      }
    }
  }
  return -1;
}

// ============================================================================
// String-type field detection
// ============================================================================

const STRING_FIELD_TYPES = new Set([
  'text', 'longtextarea', 'email', 'phone', 'url', 'picklist',
  'string', 'textarea', 'combobox', 'fax', 'richtextarea',
  // Keep original casing variants for direct comparison
  'Text', 'LongTextArea', 'Email', 'Phone', 'Url', 'Picklist',
  'Fax', 'RichTextArea'
]);

/**
 * Check if a field type is a string-searchable type.
 * @param {string} fieldType
 * @returns {boolean}
 */
function isStringFieldType(fieldType) {
  if (!fieldType) return false;
  return STRING_FIELD_TYPES.has(fieldType) || STRING_FIELD_TYPES.has(fieldType.toLowerCase());
}

/**
 * Get the list of searchable field names for an object based on the IN clause.
 *
 * @param {object} objDef - Object definition from schema
 * @param {string} inClause - The IN clause value
 * @returns {string[]} List of field API names to search
 */
function getSearchableFields(objDef, inClause) {
  if (!objDef || !objDef.fields) return ['Name'];

  const fields = objDef.fields;
  let searchFields = [];

  switch (inClause) {
    case 'NAME FIELDS':
      // Only search Name-like fields
      searchFields = fields
        .filter(f => /^(Name|FirstName|LastName|FullName|CompanyName)$/i.test(f.apiName))
        .map(f => f.apiName);
      // Always include Name
      if (!searchFields.includes('Name')) {
        searchFields.unshift('Name');
      }
      break;

    case 'EMAIL FIELDS':
      searchFields = fields
        .filter(f => f.type === 'Email' || f.type === 'email' || /email/i.test(f.apiName))
        .map(f => f.apiName);
      break;

    case 'PHONE FIELDS':
      searchFields = fields
        .filter(f =>
          f.type === 'Phone' || f.type === 'phone' || f.type === 'Fax' || f.type === 'fax' ||
          /phone|fax|mobile/i.test(f.apiName)
        )
        .map(f => f.apiName);
      break;

    case 'ALL FIELDS':
    default:
      // All string-type fields
      searchFields = fields
        .filter(f => isStringFieldType(f.type))
        .map(f => f.apiName);
      // Always include Name
      if (!searchFields.includes('Name')) {
        searchFields.unshift('Name');
      }
      break;
  }

  return searchFields;
}

// ============================================================================
// Search execution
// ============================================================================

/**
 * Execute a parsed SOSL query and return matching records.
 *
 * @param {object} parsed - Parsed SOSL from parseSOSL()
 * @param {object} config - Configuration object
 * @returns {Promise<object[]>} Array of matching records with attributes
 */
async function executeSearch(parsed, config) {
  const { apiVersion, firestoreService, fsCollection, findObjectDef, schemaConfig } = config;

  // Determine which objects to search
  let objectSpecs;
  if (parsed.returning && parsed.returning.length > 0) {
    objectSpecs = parsed.returning;
  } else {
    // Search all objects from schema
    const allObjects = [
      ...(schemaConfig.standardObjects || []),
      ...(schemaConfig.objects || [])
    ];
    objectSpecs = allObjects.map(o => ({
      object: o.apiName,
      fields: [],
      where: null,
      orderBy: null,
      limit: null
    }));
  }

  const searchTermLower = parsed.searchTerm.toLowerCase();
  // Strip wildcard characters (* and ?) for substring matching
  const cleanedTerm = searchTermLower.replace(/[*?]/g, '');

  // Prevent wildcard-only or empty search terms (DoS protection)
  if (!cleanedTerm || cleanedTerm.length < 2) {
    return [];
  }

  let allResults = [];

  for (const spec of objectSpecs) {
    try {
      const collectionName = fsCollection(spec.object);

      const objDef = findObjectDef(spec.object);
      const searchFields = getSearchableFields(objDef, parsed.inClause);

      // Use DB-level ILIKE search instead of loading all records
      let matched;
      if (firestoreService.search && searchFields.length > 0 && cleanedTerm) {
        matched = await firestoreService.search(collectionName, cleanedTerm, searchFields, {
          limit: spec.limit || 200
        });
      } else {
        matched = await firestoreService.getAll(collectionName);
        matched = matched.filter(record => {
          for (const fieldName of searchFields) {
            const value = record[fieldName];
            if (value != null && String(value).toLowerCase().includes(cleanedTerm)) {
              return true;
            }
          }
          return false;
        });
      }

      // Determine which fields to project
      const projectFields = (spec.fields && spec.fields.length > 0)
        ? spec.fields
        : ['Id', 'Name'];

      // Project fields and add attributes
      let projected = matched.map(record => {
        const result = {};
        for (const field of projectFields) {
          if (record[field] !== undefined) {
            result[field] = record[field];
          } else {
            result[field] = null;
          }
        }
        // Ensure Id is always present for the URL
        const recordId = record.Id || record.id;
        if (!result.Id && recordId) {
          result.Id = recordId;
        }
        result.attributes = {
          type: spec.object,
          url: `/services/data/v${apiVersion}/sobjects/${spec.object}/${recordId || ''}`
        };
        return result;
      });

      // Apply per-object LIMIT
      if (spec.limit != null && spec.limit > 0) {
        projected = projected.slice(0, spec.limit);
      }

      allResults = allResults.concat(projected);
    } catch (err) {
      // If an object collection doesn't exist or errors, skip it silently
      // This is important when searching all objects -- some may have no data
      console.warn(`[SEARCH] Warning: Could not search ${spec.object}: ${err.message}`);
    }
  }

  // Apply overall LIMIT
  if (parsed.limit != null && parsed.limit > 0) {
    allResults = allResults.slice(0, parsed.limit);
  }

  return allResults;
}

// ============================================================================
// Route Registration
// ============================================================================

/**
 * Create and register search routes on the Express app.
 *
 * @param {object} app - Express app
 * @param {object} config - Configuration containing:
 *   - apiVersion: string
 *   - firestoreService: object with getAll()
 *   - fsCollection: function(objectName) => collectionName
 *   - findObjectDef: function(objectName) => objectDef
 *   - schemaConfig: schema configuration object
 *   - ensureAuthenticated: Express middleware
 */
function createSearchRoutes(app, config) {
  const { apiVersion, ensureAuthenticated } = config;

  // ---- GET /services/data/v{apiVersion}/search/ ----
  // Standard SOSL search endpoint: q parameter contains the SOSL string
  app.get(`/services/data/v${apiVersion}/search/`, ensureAuthenticated, async (req, res) => {
    try {
      let soslQuery = req.query.q;
      if (!soslQuery) {
        return res.status(400).json({
          message: 'Missing required parameter: q',
          errorCode: 'INVALID_SEARCH_QUERY'
        });
      }

      // Handle URL encoding: + for spaces, %7B for {, etc.
      // Express/qs may already decode query params, but handle the + for spaces explicitly
      soslQuery = decodeSOSLQuery(soslQuery);

      const parsed = parseSOSL(soslQuery);
      const searchRecords = await executeSearch(parsed, config);

      res.json({ searchRecords });
    } catch (err) {
      console.error('[SEARCH] Error executing SOSL search:', err.message);
      res.status(400).json({
        message: err.message,
        errorCode: 'INVALID_SEARCH_QUERY'
      });
    }
  });

  // ---- GET /services/data/v${apiVersion}/parameterizedSearch/ ----
  // Parameterized search via query params or JSON body
  app.get(`/services/data/v${apiVersion}/parameterizedSearch/`, ensureAuthenticated, async (req, res) => {
    try {
      const result = await handleParameterizedSearch(req, config);
      res.json(result);
    } catch (err) {
      console.error('[SEARCH] Error executing parameterized search:', err.message);
      res.status(400).json({
        message: err.message,
        errorCode: 'INVALID_SEARCH_QUERY'
      });
    }
  });

  // ---- POST /services/data/v${apiVersion}/parameterizedSearch/ ----
  app.post(`/services/data/v${apiVersion}/parameterizedSearch/`, ensureAuthenticated, async (req, res) => {
    try {
      const result = await handleParameterizedSearch(req, config);
      res.json(result);
    } catch (err) {
      console.error('[SEARCH] Error executing parameterized search:', err.message);
      res.status(400).json({
        message: err.message,
        errorCode: 'INVALID_SEARCH_QUERY'
      });
    }
  });
}

/**
 * Decode a SOSL query string that may have URL encoding artifacts.
 * - Replace + with spaces
 * - Apply decodeURIComponent for percent-encoded characters
 *
 * @param {string} query
 * @returns {string}
 */
function decodeSOSLQuery(query) {
  if (!query) return query;
  // Replace + with space first (common in query strings)
  let decoded = query.replace(/\+/g, ' ');
  // Then apply full URI decoding for any remaining percent-encoded chars
  try {
    decoded = decodeURIComponent(decoded);
  } catch (e) {
    // If decoding fails (malformed), use the +-replaced version
  }
  return decoded;
}

/**
 * Handle a parameterized search request (GET or POST).
 * Accepts either query parameters or a JSON body with:
 *   - q: the search term (required)
 *   - fields: comma-separated or array of fields
 *   - sobjects: comma-separated or array of sObject names
 *   - in: search scope (ALL FIELDS, NAME FIELDS, etc.)
 *   - overallLimit / limit: overall result limit
 *
 * @param {object} req - Express request
 * @param {object} config - Configuration
 * @returns {Promise<object>}
 */
async function handleParameterizedSearch(req, config) {
  // Merge query params and body
  const params = { ...req.query, ...req.body };

  let searchTerm = params.q;
  if (!searchTerm) {
    throw new Error('Missing required parameter: q');
  }

  // Decode if needed
  searchTerm = decodeSOSLQuery(searchTerm);

  // Build a SOSL-like parsed structure from the parameters
  const inClause = (params.in || 'ALL FIELDS').toUpperCase().replace(/\s+/g, ' ');

  // Build returning specs from sobjects parameter
  let returning = [];
  if (params.sobjects) {
    const sobjectList = Array.isArray(params.sobjects)
      ? params.sobjects
      : String(params.sobjects).split(',').map(s => s.trim()).filter(s => s);

    // Fields apply to all objects if specified at the top level
    const fieldList = params.fields
      ? (Array.isArray(params.fields)
        ? params.fields
        : String(params.fields).split(',').map(f => f.trim()).filter(f => f))
      : [];

    returning = sobjectList.map(obj => ({
      object: obj,
      fields: fieldList,
      where: null,
      orderBy: null,
      limit: null
    }));
  }

  const overallLimit = params.overallLimit || params.limit
    ? parseInt(params.overallLimit || params.limit, 10)
    : null;

  const parsed = {
    searchTerm,
    inClause,
    returning,
    limit: overallLimit
  };

  const searchRecords = await executeSearch(parsed, config);
  return { searchRecords };
}

// ============================================================================
// Exports
// ============================================================================

module.exports = {
  createSearchRoutes,
  parseSOSL
};
