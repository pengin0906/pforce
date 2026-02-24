'use strict';

/**
 * BaseSpace Routes - /api/basespace/*, /api/novasec/* proxy routes
 * Also includes getBsBase, bsProxyFetch, lab instrument proxy
 */

function createBasespaceRoutes(app, ctx) {
  const { INSTANCE_NAME } = ctx;

  const BASESPACE_API = process.env.BASESPACE_API_URL || 'https://api.basespace.illumina.com';
  const BASESPACE_TOKEN = process.env.BASESPACE_ACCESS_TOKEN || '';
  const NOVASEC_URL = process.env.NOVASEC_URL || `http://localhost:${process.env.NOVASEC_PORT || 8081}`;
  const BASESPACE_MODE = process.env.BASESPACE_MODE || (BASESPACE_TOKEN ? 'live' : 'novasec');

  console.log(`[INFO] BaseSpace mode: ${BASESPACE_MODE}${BASESPACE_MODE === 'novasec' ? ` (NovaSeq Pforce @ ${NOVASEC_URL})` : ''}`);

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

  // --- プロキシ: NovaSeq Pforce or 本物のBaseSpaceを自動選択 ---
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
    const r = await fetch(url, { headers });
    if (!r.ok) throw new Error(`BaseSpace ${r.status}: ${await r.text()}`);
    return r.json();
  }

  // 機器ステータス取得プロキシ
  app.get('/api/instruments/:instId/status', async (req, res) => {
    const port = LAB_INSTRUMENT_PORTS[req.params.instId];
    if (!port) return res.status(404).json({ error: 'Unknown instrument: ' + req.params.instId });
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const r = await fetch(`http://localhost:${port}/api/status`, { signal: controller.signal });
      clearTimeout(timeout);
      const data = await r.json();
      res.json({ connected: true, port, data });
    } catch (e) {
      res.json({ connected: false, port, error: e.message });
    }
  });

  // 機器一覧ステータス
  app.get('/api/instruments/all/status', async (req, res) => {
    const results = {};
    const promises = Object.entries(LAB_INSTRUMENT_PORTS).map(async ([id, port]) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const r = await fetch(`http://localhost:${port}/api/status`, { signal: controller.signal });
        clearTimeout(timeout);
        results[id] = { connected: true, port };
      } catch (e) {
        results[id] = { connected: false, port, error: e.message };
      }
    });
    await Promise.allSettled(promises);
    res.json(results);
  });

  // 接続ステータス
  app.get('/api/basespace/status', async (req, res) => {
    try {
      const data = await bsProxyFetch('/v2/users/current');
      const user = data.Response ? data.Response.Name : data.Name;
      res.json({
        connected: true,
        mock: false,
        mode: BASESPACE_MODE,
        server: getBsBase(),
        user,
        lastCheck: new Date().toISOString()
      });
    } catch (err) {
      res.json({ connected: false, mock: false, error: err.message, mode: BASESPACE_MODE });
    }
  });

  // ラン一覧
  app.get('/api/basespace/runs', async (req, res) => {
    try {
      const limit = req.query.limit || 20;
      const offset = req.query.offset || 0;
      const data = await bsProxyFetch(`/v2/users/current/runs?limit=${limit}&offset=${offset}&SortBy=DateCreated&SortDir=Desc`);
      res.json(data.Response || data);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ラン詳細
  app.get('/api/basespace/runs/:runId', async (req, res) => {
    try {
      const data = await bsProxyFetch(`/v2/runs/${req.params.runId}`);
      res.json(data.Response || data);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ランQCメトリクス
  app.get('/api/basespace/runs/:runId/sequencingstats', async (req, res) => {
    try {
      const data = await bsProxyFetch(`/v2/runs/${req.params.runId}/sequencingstats`);
      res.json(data.Response || data);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // プロジェクト一覧
  app.get('/api/basespace/projects', async (req, res) => {
    try {
      const limit = req.query.limit || 20;
      const data = await bsProxyFetch(`/v2/users/current/projects?limit=${limit}&SortBy=DateCreated&SortDir=Desc`);
      res.json(data.Response || data);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // プロジェクト詳細
  app.get('/api/basespace/projects/:projectId', async (req, res) => {
    try {
      const data = await bsProxyFetch(`/v2/projects/${req.params.projectId}`);
      res.json(data.Response || data);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // サンプル一覧
  app.get('/api/basespace/projects/:projectId/samples', async (req, res) => {
    try {
      const data = await bsProxyFetch(`/v2/projects/${req.params.projectId}/samples?limit=50`);
      res.json(data.Response || data);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // --- NovaSeq Pforce 固有APIプロキシ ---
  // NovaSeq機器ステータス
  app.get('/api/novasec/status', async (req, res) => {
    try {
      const r = await fetch(`${NOVASEC_URL}/api/instrument/status`);
      res.json(await r.json());
    } catch (err) { res.status(500).json({ error: `NovaSeq Pforce接続エラー: ${err.message}` }); }
  });

  // NovaSeq検査結果一覧
  app.get('/api/novasec/results', async (req, res) => {
    try {
      const status = req.query.status || 'all';
      const r = await fetch(`${NOVASEC_URL}/api/results?status=${status}`);
      res.json(await r.json());
    } catch (err) { res.status(500).json({ error: `NovaSeq Pforce接続エラー: ${err.message}` }); }
  });

  // NovaSeq検査結果詳細
  app.get('/api/novasec/results/:resultId', async (req, res) => {
    try {
      const r = await fetch(`${NOVASEC_URL}/api/results/${req.params.resultId}`);
      res.json(await r.json());
    } catch (err) { res.status(500).json({ error: `NovaSeq Pforce接続エラー: ${err.message}` }); }
  });

  // NovaSeq検査結果をLIMS受領済みマーク
  app.post('/api/novasec/results/:resultId/deliver', async (req, res) => {
    try {
      const r = await fetch(`${NOVASEC_URL}/api/results/${req.params.resultId}/deliver`, { method: 'POST' });
      res.json(await r.json());
    } catch (err) { res.status(500).json({ error: `NovaSeq Pforce接続エラー: ${err.message}` }); }
  });

  // NovaSeqに検体を送付（LIMS → NovaSeq）
  app.post('/api/novasec/specimens/submit', async (req, res) => {
    try {
      const r = await fetch(`${NOVASEC_URL}/api/specimens/submit`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body)
      });
      res.json(await r.json());
    } catch (err) { res.status(500).json({ error: `NovaSeq Pforce接続エラー: ${err.message}` }); }
  });

  // NovaSeq検体キュー確認
  app.get('/api/novasec/specimens', async (req, res) => {
    try {
      const r = await fetch(`${NOVASEC_URL}/api/specimens`);
      res.json(await r.json());
    } catch (err) { res.status(500).json({ error: `NovaSeq Pforce接続エラー: ${err.message}` }); }
  });

  // NovaSeqヘルスチェック
  app.get('/api/novasec/health', async (req, res) => {
    try {
      const r = await fetch(`${NOVASEC_URL}/health`);
      res.json(await r.json());
    } catch (err) { res.json({ status: 'unreachable', error: err.message }); }
  });

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });
}

module.exports = { createBasespaceRoutes };
