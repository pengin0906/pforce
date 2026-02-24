'use strict';

/**
 * BaseSpace Routes - /api/basespace/*, /api/novasec/* proxy routes
 * All endpoints require authentication.
 */

function createBasespaceRoutes(app, ctx) {
  const { INSTANCE_NAME, ensureAuthenticated } = ctx;

  const BASESPACE_API = process.env.BASESPACE_API_URL || 'https://api.basespace.illumina.com';
  const BASESPACE_TOKEN = process.env.BASESPACE_ACCESS_TOKEN || '';
  const NOVASEC_URL = process.env.NOVASEC_URL || `http://localhost:${process.env.NOVASEC_PORT || 8081}`;
  const BASESPACE_MODE = process.env.BASESPACE_MODE || (BASESPACE_TOKEN ? 'live' : 'novasec');

  console.log(`[INFO] BaseSpace mode: ${BASESPACE_MODE}${BASESPACE_MODE === 'novasec' ? ` (NovaSeq Pforce)` : ''}`);

  const LAB_INSTRUMENT_PORTS = {
    'visionmate':       process.env.VISIONMATE_PORT || 8082,
    'scinomix':         process.env.SCINOMIX_PORT || 8083,
    'kingfisher':       process.env.KINGFISHER_PORT || 8084,
    'fragment-analyzer': process.env.FRAGMENT_ANALYZER_PORT || 8085,
    'hamilton':          process.env.HAMILTON_PORT || 8086,
    'novaseq-xplus':    process.env.NOVASEQ_XPLUS_PORT || 8087,
    'automata-linq':    process.env.AUTOMATA_LINQ_PORT || 8088,
    'novaseq-6000':     process.env.NOVASEC_PORT || 8081
  };

  // Input validation helpers
  const SAFE_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;
  function validateId(id) {
    if (!id || !SAFE_ID_RE.test(id)) throw new Error('Invalid ID parameter');
    return id;
  }
  function safeInt(val, defaultVal, max) {
    const n = parseInt(val);
    return (Number.isFinite(n) && n >= 0 && n <= (max || 1000)) ? n : defaultVal;
  }
  const SAFE_STATUS_VALUES = ['all', 'pending', 'running', 'completed', 'failed', 'delivered'];
  function safeStatus(val) {
    return SAFE_STATUS_VALUES.includes(val) ? val : 'all';
  }

  function getBsBase() {
    return BASESPACE_MODE === 'live' ? BASESPACE_API : NOVASEC_URL;
  }

  async function bsProxyFetch(apiPath) {
    const base = getBsBase();
    const url = `${base}${apiPath}`;
    const headers = { 'Content-Type': 'application/json' };
    if (BASESPACE_MODE === 'live' && BASESPACE_TOKEN) {
      headers['Authorization'] = `Bearer ${BASESPACE_TOKEN}`;
    }
    const r = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
    if (!r.ok) throw new Error(`BaseSpace error: ${r.status}`);
    return r.json();
  }

  // 機器ステータス取得プロキシ (authenticated)
  app.get('/api/instruments/:instId/status', ensureAuthenticated, async (req, res) => {
    const instId = req.params.instId;
    const port = LAB_INSTRUMENT_PORTS[instId];
    if (!port) return res.status(404).json({ error: 'Unknown instrument' });
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const r = await fetch(`http://localhost:${port}/api/status`, { signal: controller.signal });
      clearTimeout(timeout);
      const data = await r.json();
      res.json({ connected: true, port, data });
    } catch (e) {
      res.json({ connected: false, port, error: 'Connection failed' });
    }
  });

  // 機器一覧ステータス (authenticated)
  app.get('/api/instruments/all/status', ensureAuthenticated, async (req, res) => {
    const results = {};
    const promises = Object.entries(LAB_INSTRUMENT_PORTS).map(async ([id, port]) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const r = await fetch(`http://localhost:${port}/api/status`, { signal: controller.signal });
        clearTimeout(timeout);
        results[id] = { connected: true, port };
      } catch (e) {
        results[id] = { connected: false, port };
      }
    });
    await Promise.allSettled(promises);
    res.json(results);
  });

  // 接続ステータス (authenticated)
  app.get('/api/basespace/status', ensureAuthenticated, async (req, res) => {
    try {
      const data = await bsProxyFetch('/v2/users/current');
      const user = data.Response ? data.Response.Name : data.Name;
      res.json({
        connected: true,
        mode: BASESPACE_MODE,
        user,
        lastCheck: new Date().toISOString()
      });
    } catch (err) {
      res.json({ connected: false, mode: BASESPACE_MODE });
    }
  });

  // ラン一覧 (authenticated, sanitized params)
  app.get('/api/basespace/runs', ensureAuthenticated, async (req, res) => {
    try {
      const limit = safeInt(req.query.limit, 20, 100);
      const offset = safeInt(req.query.offset, 0, 10000);
      const data = await bsProxyFetch(`/v2/users/current/runs?limit=${limit}&offset=${offset}&SortBy=DateCreated&SortDir=Desc`);
      res.json(data.Response || data);
    } catch (err) { res.status(500).json({ error: 'Failed to fetch runs' }); }
  });

  // ラン詳細 (authenticated, validated ID)
  app.get('/api/basespace/runs/:runId', ensureAuthenticated, async (req, res) => {
    try {
      const runId = validateId(req.params.runId);
      const data = await bsProxyFetch(`/v2/runs/${runId}`);
      res.json(data.Response || data);
    } catch (err) { res.status(500).json({ error: 'Failed to fetch run' }); }
  });

  // ランQCメトリクス (authenticated, validated ID)
  app.get('/api/basespace/runs/:runId/sequencingstats', ensureAuthenticated, async (req, res) => {
    try {
      const runId = validateId(req.params.runId);
      const data = await bsProxyFetch(`/v2/runs/${runId}/sequencingstats`);
      res.json(data.Response || data);
    } catch (err) { res.status(500).json({ error: 'Failed to fetch stats' }); }
  });

  // プロジェクト一覧 (authenticated)
  app.get('/api/basespace/projects', ensureAuthenticated, async (req, res) => {
    try {
      const limit = safeInt(req.query.limit, 20, 100);
      const data = await bsProxyFetch(`/v2/users/current/projects?limit=${limit}&SortBy=DateCreated&SortDir=Desc`);
      res.json(data.Response || data);
    } catch (err) { res.status(500).json({ error: 'Failed to fetch projects' }); }
  });

  // プロジェクト詳細 (authenticated, validated ID)
  app.get('/api/basespace/projects/:projectId', ensureAuthenticated, async (req, res) => {
    try {
      const projectId = validateId(req.params.projectId);
      const data = await bsProxyFetch(`/v2/projects/${projectId}`);
      res.json(data.Response || data);
    } catch (err) { res.status(500).json({ error: 'Failed to fetch project' }); }
  });

  // サンプル一覧 (authenticated, validated ID)
  app.get('/api/basespace/projects/:projectId/samples', ensureAuthenticated, async (req, res) => {
    try {
      const projectId = validateId(req.params.projectId);
      const data = await bsProxyFetch(`/v2/projects/${projectId}/samples?limit=50`);
      res.json(data.Response || data);
    } catch (err) { res.status(500).json({ error: 'Failed to fetch samples' }); }
  });

  // --- NovaSeq Pforce 固有APIプロキシ (all authenticated) ---
  app.get('/api/novasec/status', ensureAuthenticated, async (req, res) => {
    try {
      const r = await fetch(`${NOVASEC_URL}/api/instrument/status`, { signal: AbortSignal.timeout(5000) });
      res.json(await r.json());
    } catch (err) { res.status(500).json({ error: 'NovaSeq connection failed' }); }
  });

  app.get('/api/novasec/results', ensureAuthenticated, async (req, res) => {
    try {
      const status = safeStatus(req.query.status);
      const r = await fetch(`${NOVASEC_URL}/api/results?status=${status}`, { signal: AbortSignal.timeout(5000) });
      res.json(await r.json());
    } catch (err) { res.status(500).json({ error: 'NovaSeq connection failed' }); }
  });

  app.get('/api/novasec/results/:resultId', ensureAuthenticated, async (req, res) => {
    try {
      const resultId = validateId(req.params.resultId);
      const r = await fetch(`${NOVASEC_URL}/api/results/${resultId}`, { signal: AbortSignal.timeout(5000) });
      res.json(await r.json());
    } catch (err) { res.status(500).json({ error: 'NovaSeq connection failed' }); }
  });

  app.post('/api/novasec/results/:resultId/deliver', ensureAuthenticated, async (req, res) => {
    try {
      const resultId = validateId(req.params.resultId);
      const r = await fetch(`${NOVASEC_URL}/api/results/${resultId}/deliver`, { method: 'POST', signal: AbortSignal.timeout(5000) });
      res.json(await r.json());
    } catch (err) { res.status(500).json({ error: 'NovaSeq connection failed' }); }
  });

  app.post('/api/novasec/specimens/submit', ensureAuthenticated, async (req, res) => {
    try {
      const r = await fetch(`${NOVASEC_URL}/api/specimens/submit`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
        signal: AbortSignal.timeout(5000)
      });
      res.json(await r.json());
    } catch (err) { res.status(500).json({ error: 'NovaSeq connection failed' }); }
  });

  app.get('/api/novasec/specimens', ensureAuthenticated, async (req, res) => {
    try {
      const r = await fetch(`${NOVASEC_URL}/api/specimens`, { signal: AbortSignal.timeout(5000) });
      res.json(await r.json());
    } catch (err) { res.status(500).json({ error: 'NovaSeq connection failed' }); }
  });

  app.get('/api/novasec/health', ensureAuthenticated, async (req, res) => {
    try {
      const r = await fetch(`${NOVASEC_URL}/health`, { signal: AbortSignal.timeout(3000) });
      res.json(await r.json());
    } catch (err) { res.json({ status: 'unreachable' }); }
  });
}

module.exports = { createBasespaceRoutes };
