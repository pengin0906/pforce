'use strict';

// =============================================================================
// Bulk API 2.0 Implementation
// =============================================================================
// Self-contained module — no external dependencies beyond Express.
// Exports: createBulkApiRoutes(app, config)
// =============================================================================

const express = require('express');
const crypto = require('crypto');

// ---------------------------------------------------------------------------
// In-memory job store
// ---------------------------------------------------------------------------

/** @type {Map<string, BulkJob>} */
const jobStore = new Map();

// ---------------------------------------------------------------------------
// CSV Parser — handles quoted fields, doubled double-quotes,
// field-internal newlines, and BOM
// ---------------------------------------------------------------------------

/**
 * Parse a CSV string into an array of objects keyed by header names.
 * @param {string} text  Raw CSV text (may include BOM)
 * @param {string} [delimiter=',']  Column delimiter character
 * @returns {{ headers: string[], rows: Record<string,string>[] }}
 */
function parseCsv(text, delimiter) {
  if (!delimiter) delimiter = ',';

  // Strip BOM (U+FEFF)
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1);
  }

  // Normalise line endings to \n so the state machine is simpler
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const records = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const len = text.length;

  while (i < len) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        // Peek ahead: doubled double-quote?
        if (i + 1 < len && text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          // End of quoted field
          inQuotes = false;
          i++;
        }
      } else {
        // Any character (including newlines) inside quotes
        field += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        // Start of quoted field (only valid at field start or after delimiter)
        inQuotes = true;
        i++;
      } else if (ch === delimiter) {
        row.push(field);
        field = '';
        i++;
      } else if (ch === '\n') {
        row.push(field);
        field = '';
        records.push(row);
        row = [];
        i++;
      } else {
        field += ch;
        i++;
      }
    }
  }

  // Handle last field / row (if file doesn't end with newline)
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    records.push(row);
  }

  if (records.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = records[0].map(h => h.trim());
  const rows = [];
  for (let r = 1; r < records.length; r++) {
    const cells = records[r];
    // Skip completely empty trailing rows
    if (cells.length === 1 && cells[0] === '') continue;
    const obj = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = c < cells.length ? cells[c] : '';
    }
    rows.push(obj);
  }

  return { headers, rows };
}

// ---------------------------------------------------------------------------
// CSV Serializer
// ---------------------------------------------------------------------------

/**
 * Serialize an array of objects into a CSV string.
 * @param {string[]} headers  Column names (in order)
 * @param {Record<string,string>[]} rows  Data rows
 * @param {string} [delimiter=',']  Column delimiter
 * @param {string} [lineEnding='\n']  Line ending
 * @returns {string}
 */
function serializeCsv(headers, rows, delimiter, lineEnding) {
  if (!delimiter) delimiter = ',';
  if (!lineEnding) lineEnding = '\n';

  function escapeField(val) {
    if (val === null || val === undefined) return '';
    const s = String(val);
    if (s.indexOf('"') !== -1 || s.indexOf(delimiter) !== -1 ||
        s.indexOf('\n') !== -1 || s.indexOf('\r') !== -1) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  const lines = [];
  lines.push(headers.map(escapeField).join(delimiter));
  for (const row of rows) {
    const cells = headers.map(h => escapeField(row[h]));
    lines.push(cells.join(delimiter));
  }
  return lines.join(lineEnding) + lineEnding;
}

// ---------------------------------------------------------------------------
// Column delimiter helpers
// ---------------------------------------------------------------------------

const DELIMITER_MAP = {
  COMMA: ',',
  TAB: '\t',
  PIPE: '|',
  SEMICOLON: ';',
  CARET: '^',
  BACKQUOTE: '`',
};

const LINE_ENDING_MAP = {
  LF: '\n',
  CRLF: '\r\n',
};

function resolveDelimiter(name) {
  return DELIMITER_MAP[name] || ',';
}

function resolveLineEnding(name) {
  return LINE_ENDING_MAP[name] || '\n';
}

// ---------------------------------------------------------------------------
// BulkJob class — state machine
// ---------------------------------------------------------------------------
//
// Ingest jobs:   Open → UploadComplete → InProgress → JobComplete | Failed
//                Open → Aborted
//                UploadComplete → Aborted
//
// Query jobs:    Open → InProgress → JobComplete | Failed
// ---------------------------------------------------------------------------

class BulkJob {
  /**
   * @param {object} opts
   * @param {string} opts.operation   insert | update | upsert | delete | hardDelete | query
   * @param {string} opts.object      SObject name
   * @param {string} [opts.externalIdFieldName]
   * @param {string} [opts.columnDelimiter]
   * @param {string} [opts.lineEnding]
   * @param {string} [opts.contentType]
   * @param {string} [opts.query]      SOQL query (for query jobs)
   * @param {string} opts.apiVersion
   * @param {string} [opts.createdById]
   */
  constructor(opts) {
    this.id = crypto.randomUUID();
    this.operation = opts.operation;
    this.object = opts.object || '';
    this.externalIdFieldName = opts.externalIdFieldName || null;
    this.columnDelimiter = opts.columnDelimiter || 'COMMA';
    this.lineEnding = opts.lineEnding || 'LF';
    this.contentType = opts.contentType || 'CSV';
    this.query = opts.query || null;
    this.apiVersion = opts.apiVersion;
    this.createdById = opts.createdById || '005000000000001AAA';
    this.createdDate = new Date().toISOString();
    this.systemModstamp = this.createdDate;
    this.concurrencyMode = 'Parallel';
    this.jobType = opts.query ? 'V2Query' : 'V2Ingest';

    // State
    this.state = 'Open';

    // CSV data uploaded by client (ingest)
    this.csvData = '';

    // Processing results
    this.successfulResults = [];   // { sf__Id, sf__Created, ...original }
    this.failedResults = [];       // { sf__Id, sf__Error, ...original }
    this.unprocessedRecords = [];  // original rows not yet processed

    // Query results (query jobs)
    this.queryResultCsv = '';
    this.queryResultHeaders = [];

    // Metrics
    this.numberRecordsProcessed = 0;
    this.numberRecordsFailed = 0;
    this.totalProcessingTime = 0;
    this.startTime = null;

    // Retries
    this.retries = 0;
  }

  // Valid state transitions
  static VALID_TRANSITIONS = {
    Open: ['UploadComplete', 'Aborted'],
    UploadComplete: ['InProgress', 'Aborted'],
    InProgress: ['JobComplete', 'Failed'],
  };

  canTransitionTo(newState) {
    const allowed = BulkJob.VALID_TRANSITIONS[this.state];
    return allowed && allowed.includes(newState);
  }

  transitionTo(newState) {
    if (!this.canTransitionTo(newState)) {
      throw new Error(
        `Invalid state transition from ${this.state} to ${newState}`
      );
    }
    this.state = newState;
    this.systemModstamp = new Date().toISOString();
  }

  /**
   * Return the API-shaped JSON for this job.
   */
  toJSON() {
    return {
      id: this.id,
      operation: this.operation,
      object: this.object,
      createdById: this.createdById,
      createdDate: this.createdDate,
      systemModstamp: this.systemModstamp,
      state: this.state,
      externalIdFieldName: this.externalIdFieldName,
      concurrencyMode: this.concurrencyMode,
      contentType: this.contentType,
      apiVersion: this.apiVersion,
      jobType: this.jobType,
      lineEnding: this.lineEnding,
      columnDelimiter: this.columnDelimiter,
      numberRecordsProcessed: this.numberRecordsProcessed,
      numberRecordsFailed: this.numberRecordsFailed,
      retries: this.retries,
      totalProcessingTime: this.totalProcessingTime,
      apiActiveProcessingTime: 0,
      apexProcessingTime: 0,
    };
  }
}

// ---------------------------------------------------------------------------
// processIngestJob — handles insert / update / upsert / delete / hardDelete
// ---------------------------------------------------------------------------

async function processIngestJob(job, config) {
  const { firestoreService, sfId, fsCollection, findObjectDef } = config;

  job.transitionTo('InProgress');
  job.startTime = Date.now();

  const delimiter = resolveDelimiter(job.columnDelimiter);
  const { headers, rows } = parseCsv(job.csvData, delimiter);

  if (rows.length === 0) {
    job.numberRecordsProcessed = 0;
    job.numberRecordsFailed = 0;
    job.totalProcessingTime = Date.now() - job.startTime;
    job.transitionTo('JobComplete');
    return;
  }

  const collectionName = fsCollection(job.object);
  const operation = (job.operation || '').toLowerCase();

  let hasError = false;

  for (const row of rows) {
    try {
      switch (operation) {
        // ----- INSERT -----
        case 'insert': {
          const created = await firestoreService.create(collectionName, { ...row });
          job.successfulResults.push({
            sf__Id: created.Id,
            sf__Created: 'true',
            ...row,
          });
          job.numberRecordsProcessed++;
          break;
        }

        // ----- UPDATE -----
        case 'update': {
          const id = row.Id;
          if (!id) {
            throw new Error('Missing Id field for update operation');
          }
          const updateData = { ...row };
          delete updateData.Id;
          await firestoreService.update(collectionName, id, updateData);
          job.successfulResults.push({
            sf__Id: id,
            sf__Created: 'false',
            ...row,
          });
          job.numberRecordsProcessed++;
          break;
        }

        // ----- UPSERT -----
        case 'upsert': {
          const extField = job.externalIdFieldName || 'Id';
          const extValue = row[extField];
          if (!extValue) {
            throw new Error(
              `Missing external ID field "${extField}" for upsert operation`
            );
          }

          // Search for existing record by external ID field
          let existingRecord = null;
          const allRecords = await firestoreService.getAll(collectionName);
          for (const rec of allRecords) {
            if (String(rec[extField]) === String(extValue)) {
              existingRecord = rec;
              break;
            }
          }

          if (existingRecord) {
            // Update existing record
            const updateData = { ...row };
            delete updateData.Id;
            await firestoreService.update(
              collectionName,
              existingRecord.Id,
              updateData
            );
            job.successfulResults.push({
              sf__Id: existingRecord.Id,
              sf__Created: 'false',
              ...row,
            });
          } else {
            // Create new record
            const created = await firestoreService.create(collectionName, {
              ...row,
            });
            job.successfulResults.push({
              sf__Id: created.Id,
              sf__Created: 'true',
              ...row,
            });
          }
          job.numberRecordsProcessed++;
          break;
        }

        // ----- DELETE / HARD DELETE -----
        case 'delete':
        case 'harddelete': {
          const deleteId = row.Id;
          if (!deleteId) {
            throw new Error('Missing Id field for delete operation');
          }
          await firestoreService.remove(collectionName, deleteId);
          job.successfulResults.push({
            sf__Id: deleteId,
            sf__Created: 'false',
            ...row,
          });
          job.numberRecordsProcessed++;
          break;
        }

        default:
          throw new Error(`Unsupported operation: ${job.operation}`);
      }
    } catch (err) {
      hasError = true;
      job.failedResults.push({
        sf__Id: row.Id || '',
        sf__Error: err.message || String(err),
        ...row,
      });
      job.numberRecordsFailed++;
      job.numberRecordsProcessed++;
    }
  }

  job.totalProcessingTime = Date.now() - job.startTime;

  // Transition to final state
  try {
    if (job.numberRecordsFailed === rows.length) {
      job.transitionTo('Failed');
    } else {
      job.transitionTo('JobComplete');
    }
  } catch (_ignored) {
    // Already in a terminal state — should not happen but be safe
  }
}

// ---------------------------------------------------------------------------
// processQueryJob — parses SOQL, fetches data, converts to CSV
// ---------------------------------------------------------------------------

async function processQueryJob(job, config) {
  const {
    firestoreService,
    fsCollection,
    parseSOQL,
    evaluateWhereExpr,
  } = config;

  job.startTime = Date.now();
  job.transitionTo('InProgress');

  try {
    // Parse the SOQL query
    const ast = parseSOQL(job.query);
    const objectName = ast.from;
    const collectionName = fsCollection(objectName);

    // Fetch all records from the collection
    const allRecords = await firestoreService.getAll(collectionName);

    // Apply WHERE clause filtering
    let filtered = allRecords;
    if (ast.where) {
      filtered = allRecords.filter(rec => {
        try {
          return evaluateWhereExpr(rec, ast.where, {});
        } catch (_e) {
          return false;
        }
      });
    }

    // Apply ORDER BY
    if (ast.orderBy && ast.orderBy.length > 0) {
      filtered.sort((a, b) => {
        for (const ob of ast.orderBy) {
          const fieldName = ob.field || (ob.type === 'field' ? ob.name : '');
          const va = a[fieldName];
          const vb = b[fieldName];
          let cmp = 0;
          if (va == null && vb == null) cmp = 0;
          else if (va == null) cmp = ob.nulls === 'FIRST' ? -1 : 1;
          else if (vb == null) cmp = ob.nulls === 'FIRST' ? 1 : -1;
          else if (typeof va === 'string') cmp = va.localeCompare(vb);
          else cmp = va < vb ? -1 : va > vb ? 1 : 0;
          if (ob.direction === 'DESC') cmp = -cmp;
          if (cmp !== 0) return cmp;
        }
        return 0;
      });
    }

    // Apply LIMIT
    if (ast.limit != null) {
      filtered = filtered.slice(0, ast.limit);
    }

    // Apply OFFSET
    if (ast.offset != null) {
      filtered = filtered.slice(ast.offset);
    }

    // Determine which fields to project
    let fieldNames = [];
    for (const f of ast.fields) {
      if (f.type === 'field') {
        fieldNames.push(f.name);
      } else if (f.type === 'relationship_field') {
        fieldNames.push(f.path.join('.'));
      }
    }

    // If SELECT * or no explicit fields, use all keys from first record
    if (fieldNames.length === 0 && filtered.length > 0) {
      fieldNames = Object.keys(filtered[0]);
    }

    // Build result rows
    const resultRows = filtered.map(rec => {
      const out = {};
      for (const fn of fieldNames) {
        out[fn] = rec[fn] !== undefined ? rec[fn] : '';
      }
      return out;
    });

    // Serialize to CSV
    const delimiter = resolveDelimiter(job.columnDelimiter);
    const lineEnding = resolveLineEnding(job.lineEnding);
    job.queryResultHeaders = fieldNames;
    job.queryResultCsv = serializeCsv(fieldNames, resultRows, delimiter, lineEnding);
    job.numberRecordsProcessed = resultRows.length;
    job.totalProcessingTime = Date.now() - job.startTime;
    job.transitionTo('JobComplete');
  } catch (err) {
    job.totalProcessingTime = Date.now() - (job.startTime || Date.now());
    job.numberRecordsFailed = 1;
    try {
      job.transitionTo('Failed');
    } catch (_ignored) {
      job.state = 'Failed';
      job.systemModstamp = new Date().toISOString();
    }
    // Store error in failedResults for diagnostics
    job.failedResults.push({
      sf__Id: '',
      sf__Error: err.message || String(err),
    });
  }
}

// ---------------------------------------------------------------------------
// Route factory
// ---------------------------------------------------------------------------

/**
 * Register all Bulk API 2.0 routes on the given Express app.
 *
 * @param {import('express').Express} app
 * @param {object} config
 * @param {string} config.apiVersion           e.g. '62.0'
 * @param {object} config.firestoreService     { getAll, getById, create, update, remove }
 * @param {Function} config.sfId               Salesforce-style ID generator
 * @param {Function} config.fsCollection       (objectName) => collectionName
 * @param {Function} config.findObjectDef      (objectName) => objectDef | null
 * @param {Function} config.ensureAuthenticated Express middleware
 * @param {Function} config.parseSOQL          (query) => AST
 * @param {Function} config.evaluateWhereExpr  (record, expr, ctx) => boolean
 */
function createBulkApiRoutes(app, config) {
  const {
    apiVersion,
    ensureAuthenticated,
  } = config;

  const prefix = `/services/data/v${apiVersion}`;

  // Helper: parse SOQL using the provided parser
  function parseSOQL(query) {
    if (config.parseSOQL) {
      return config.parseSOQL(query);
    }
    throw new Error('parseSOQL not configured');
  }

  // ==========================================================================
  // INGEST JOBS
  // ==========================================================================

  // --------------------------------------------------------------------------
  // 1. POST /jobs/ingest — Create a new ingest job
  // --------------------------------------------------------------------------
  app.post(
    `${prefix}/jobs/ingest`,
    ensureAuthenticated,
    (req, res) => {
      try {
        const {
          object,
          operation,
          externalIdFieldName,
          columnDelimiter,
          lineEnding,
          contentType,
        } = req.body;

        if (!object || !operation) {
          return res.status(400).json({
            message: 'object and operation are required',
            errorCode: 'INVALID_INPUT',
          });
        }

        const job = new BulkJob({
          object,
          operation,
          externalIdFieldName: externalIdFieldName || null,
          columnDelimiter: columnDelimiter || 'COMMA',
          lineEnding: lineEnding || 'LF',
          contentType: contentType || 'CSV',
          apiVersion,
          createdById: req.user && req.user.id ? req.user.id : '005000000000001AAA',
        });

        jobStore.set(job.id, job);

        return res.status(200).json(job.toJSON());
      } catch (err) {
        return res.status(500).json({
          message: err.message,
          errorCode: 'INTERNAL_ERROR',
        });
      }
    }
  );

  // --------------------------------------------------------------------------
  // 2. PUT /jobs/ingest/:jobId/batches — Upload CSV data
  //    Content-Type must be text/csv.  We use express.text() inline.
  // --------------------------------------------------------------------------
  app.put(
    `${prefix}/jobs/ingest/:jobId/batches`,
    ensureAuthenticated,
    express.text({ type: 'text/csv', limit: '10mb' }),
    (req, res) => {
      try {
        const { jobId } = req.params;
        const job = jobStore.get(jobId);

        if (!job) {
          return res.status(404).json({
            message: `Job ${jobId} not found`,
            errorCode: 'NOT_FOUND',
          });
        }

        if (job.state !== 'Open') {
          return res.status(400).json({
            message: `Job is in state ${job.state}; CSV upload is only allowed in Open state`,
            errorCode: 'INVALID_STATE',
          });
        }

        // Append CSV data (Salesforce allows multiple PUT calls)
        const body = typeof req.body === 'string' ? req.body : String(req.body);
        // Security: reject if total would exceed 10MB (don't truncate)
        if (job.csvData.length + body.length > 10 * 1024 * 1024) {
          return res.status(413).json({ message: "CSV data exceeds maximum size (10MB)", errorCode: "SIZE_LIMIT_EXCEEDED" });
        }
        job.csvData += body;

        return res.status(201).send();
      } catch (err) {
        return res.status(500).json({
          message: err.message,
          errorCode: 'INTERNAL_ERROR',
        });
      }
    }
  );

  // --------------------------------------------------------------------------
  // 3. PATCH /jobs/ingest/:jobId — Close or Abort the job
  // --------------------------------------------------------------------------
  app.patch(
    `${prefix}/jobs/ingest/:jobId`,
    ensureAuthenticated,
    (req, res) => {
      try {
        const { jobId } = req.params;
        const job = jobStore.get(jobId);

        if (!job) {
          return res.status(404).json({
            message: `Job ${jobId} not found`,
            errorCode: 'NOT_FOUND',
          });
        }

        const requestedState = req.body && req.body.state;

        if (!requestedState) {
          return res.status(400).json({
            message: 'state is required (UploadComplete or Aborted)',
            errorCode: 'INVALID_INPUT',
          });
        }

        if (requestedState === 'Aborted') {
          if (job.state !== 'Open' && job.state !== 'UploadComplete') {
            return res.status(400).json({
              message: `Cannot abort job in state ${job.state}`,
              errorCode: 'INVALID_STATE',
            });
          }
          job.state = 'Aborted';
          job.systemModstamp = new Date().toISOString();
          return res.status(200).json(job.toJSON());
        }

        if (requestedState === 'UploadComplete') {
          if (job.state !== 'Open') {
            return res.status(400).json({
              message: `Cannot close upload for job in state ${job.state}`,
              errorCode: 'INVALID_STATE',
            });
          }

          job.transitionTo('UploadComplete');

          // Trigger processing asynchronously
          setImmediate(() => {
            processIngestJob(job, config).catch(err => {
              console.error(
                `[BULK API] Error processing ingest job ${job.id}:`,
                err
              );
              job.totalProcessingTime = Date.now() - (job.startTime || Date.now());
              try {
                job.transitionTo('Failed');
              } catch (_ignored) {
                job.state = 'Failed';
                job.systemModstamp = new Date().toISOString();
              }
            });
          });

          return res.status(200).json(job.toJSON());
        }

        return res.status(400).json({
          message: `Invalid state: ${requestedState}. Must be UploadComplete or Aborted`,
          errorCode: 'INVALID_INPUT',
        });
      } catch (err) {
        return res.status(500).json({
          message: err.message,
          errorCode: 'INTERNAL_ERROR',
        });
      }
    }
  );

  // --------------------------------------------------------------------------
  // 4. GET /jobs/ingest/:jobId — Get job info
  // --------------------------------------------------------------------------
  app.get(
    `${prefix}/jobs/ingest/:jobId`,
    ensureAuthenticated,
    (req, res) => {
      const { jobId } = req.params;
      const job = jobStore.get(jobId);

      if (!job) {
        return res.status(404).json({
          message: `Job ${jobId} not found`,
          errorCode: 'NOT_FOUND',
        });
      }

      return res.status(200).json(job.toJSON());
    }
  );

  // --------------------------------------------------------------------------
  // 5. GET /jobs/ingest/:jobId/successfulResults — CSV of successes
  // --------------------------------------------------------------------------
  app.get(
    `${prefix}/jobs/ingest/:jobId/successfulResults`,
    ensureAuthenticated,
    (req, res) => {
      const { jobId } = req.params;
      const job = jobStore.get(jobId);

      if (!job) {
        return res.status(404).json({
          message: `Job ${jobId} not found`,
          errorCode: 'NOT_FOUND',
        });
      }

      const delimiter = resolveDelimiter(job.columnDelimiter);
      const lineEnding = resolveLineEnding(job.lineEnding);

      if (job.successfulResults.length === 0) {
        // Return header-only CSV
        const csv = ['sf__Id', 'sf__Created'].join(delimiter) + lineEnding;
        res.setHeader('Content-Type', 'text/csv');
        return res.status(200).send(csv);
      }

      // Build headers: sf__Id, sf__Created, then original data columns
      const dataHeaders = Object.keys(job.successfulResults[0]).filter(
        k => k !== 'sf__Id' && k !== 'sf__Created'
      );
      const allHeaders = ['sf__Id', 'sf__Created', ...dataHeaders];

      const csv = serializeCsv(allHeaders, job.successfulResults, delimiter, lineEnding);
      res.setHeader('Content-Type', 'text/csv');
      return res.status(200).send(csv);
    }
  );

  // --------------------------------------------------------------------------
  // 6. GET /jobs/ingest/:jobId/failedResults — CSV of failures
  // --------------------------------------------------------------------------
  app.get(
    `${prefix}/jobs/ingest/:jobId/failedResults`,
    ensureAuthenticated,
    (req, res) => {
      const { jobId } = req.params;
      const job = jobStore.get(jobId);

      if (!job) {
        return res.status(404).json({
          message: `Job ${jobId} not found`,
          errorCode: 'NOT_FOUND',
        });
      }

      const delimiter = resolveDelimiter(job.columnDelimiter);
      const lineEnding = resolveLineEnding(job.lineEnding);

      if (job.failedResults.length === 0) {
        const csv = ['sf__Id', 'sf__Error'].join(delimiter) + lineEnding;
        res.setHeader('Content-Type', 'text/csv');
        return res.status(200).send(csv);
      }

      const dataHeaders = Object.keys(job.failedResults[0]).filter(
        k => k !== 'sf__Id' && k !== 'sf__Error'
      );
      const allHeaders = ['sf__Id', 'sf__Error', ...dataHeaders];

      const csv = serializeCsv(allHeaders, job.failedResults, delimiter, lineEnding);
      res.setHeader('Content-Type', 'text/csv');
      return res.status(200).send(csv);
    }
  );

  // --------------------------------------------------------------------------
  // 7. GET /jobs/ingest/:jobId/unprocessedrecords — CSV of unprocessed rows
  // --------------------------------------------------------------------------
  app.get(
    `${prefix}/jobs/ingest/:jobId/unprocessedrecords`,
    ensureAuthenticated,
    (req, res) => {
      const { jobId } = req.params;
      const job = jobStore.get(jobId);

      if (!job) {
        return res.status(404).json({
          message: `Job ${jobId} not found`,
          errorCode: 'NOT_FOUND',
        });
      }

      const delimiter = resolveDelimiter(job.columnDelimiter);
      const lineEnding = resolveLineEnding(job.lineEnding);

      if (job.unprocessedRecords.length === 0) {
        // If no unprocessed records, return header-only CSV derived from
        // the uploaded CSV headers (if available)
        const parsed = parseCsv(job.csvData || '', delimiter);
        const hdrs = parsed.headers.length > 0 ? parsed.headers : [];
        const csv = hdrs.length > 0
          ? hdrs.join(delimiter) + lineEnding
          : lineEnding;
        res.setHeader('Content-Type', 'text/csv');
        return res.status(200).send(csv);
      }

      const headers = Object.keys(job.unprocessedRecords[0]);
      const csv = serializeCsv(headers, job.unprocessedRecords, delimiter, lineEnding);
      res.setHeader('Content-Type', 'text/csv');
      return res.status(200).send(csv);
    }
  );

  // ==========================================================================
  // QUERY JOBS
  // ==========================================================================

  // --------------------------------------------------------------------------
  // 1. POST /jobs/query — Create and execute a query job
  // --------------------------------------------------------------------------
  app.post(
    `${prefix}/jobs/query`,
    ensureAuthenticated,
    (req, res) => {
      try {
        const { operation, query } = req.body;

        if (!query) {
          return res.status(400).json({
            message: 'query is required',
            errorCode: 'INVALID_INPUT',
          });
        }

        const job = new BulkJob({
          operation: operation || 'query',
          object: '',  // Will be derived from SOQL
          query,
          apiVersion,
          createdById: req.user && req.user.id ? req.user.id : '005000000000001AAA',
        });

        // Derive object name from SOQL query
        try {
          const ast = parseSOQL(query);
          job.object = ast.from || '';
        } catch (_e) {
          // Best-effort object name extraction
        }

        jobStore.set(job.id, job);

        // Immediately transition to InProgress and execute
        job.transitionTo('UploadComplete');

        setImmediate(() => {
          // For query jobs, go from UploadComplete → InProgress → JobComplete/Failed
          processQueryJob(job, config).catch(err => {
            console.error(
              `[BULK API] Error processing query job ${job.id}:`,
              err
            );
            job.totalProcessingTime = Date.now() - (job.startTime || Date.now());
            try {
              job.transitionTo('Failed');
            } catch (_ignored) {
              job.state = 'Failed';
              job.systemModstamp = new Date().toISOString();
            }
          });
        });

        return res.status(200).json(job.toJSON());
      } catch (err) {
        return res.status(500).json({
          message: err.message,
          errorCode: 'INTERNAL_ERROR',
        });
      }
    }
  );

  // --------------------------------------------------------------------------
  // 2. GET /jobs/query/:jobId — Get query job info
  // --------------------------------------------------------------------------
  app.get(
    `${prefix}/jobs/query/:jobId`,
    ensureAuthenticated,
    (req, res) => {
      const { jobId } = req.params;
      const job = jobStore.get(jobId);

      if (!job) {
        return res.status(404).json({
          message: `Job ${jobId} not found`,
          errorCode: 'NOT_FOUND',
        });
      }

      return res.status(200).json(job.toJSON());
    }
  );

  // --------------------------------------------------------------------------
  // 3. GET /jobs/query/:jobId/results — Return CSV results
  // --------------------------------------------------------------------------
  app.get(
    `${prefix}/jobs/query/:jobId/results`,
    ensureAuthenticated,
    (req, res) => {
      const { jobId } = req.params;
      const job = jobStore.get(jobId);

      if (!job) {
        return res.status(404).json({
          message: `Job ${jobId} not found`,
          errorCode: 'NOT_FOUND',
        });
      }

      if (job.state !== 'JobComplete') {
        return res.status(400).json({
          message: `Query results are not available; job is in state ${job.state}`,
          errorCode: 'INVALID_STATE',
        });
      }

      res.setHeader('Content-Type', 'text/csv');
      return res.status(200).send(job.queryResultCsv);
    }
  );
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  createBulkApiRoutes,
  // Expose internals for testing
  parseCsv,
  serializeCsv,
  BulkJob,
  jobStore,
};
