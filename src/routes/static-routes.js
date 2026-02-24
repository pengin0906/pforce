'use strict';

/**
 * Static Routes - Static file serving for public/, public-standalone/ (/crm), lab-standalone/ (/lab)
 */

const path = require('path');
const express = require('express');

function createStaticRoutes(app, ctx) {
  const { NODE_ENV } = ctx;

  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
  const PUBLIC_DIR = process.env.PFORCE_PUBLIC_DIR || path.join(__dirname, '..', '..', 'public');

  app.get('/', (req, res) => {
    // In dev mode without OAuth, serve directly
    if (NODE_ENV === 'development' && !GOOGLE_CLIENT_ID) {
      const indexPath = path.join(PUBLIC_DIR, 'index.html');
      return res.sendFile(indexPath);
    }
    if (!req.isAuthenticated()) {
      return res.redirect('/login');
    }

    // Serve the full SPA index.html
    const indexPath = path.join(PUBLIC_DIR, 'index.html');
    res.sendFile(indexPath);
  });

  app.use(express.static(PUBLIC_DIR));

  // Serve the standalone CRM at /crm/
  const STANDALONE_DIR = path.join(__dirname, '..', '..', 'public-standalone');
  app.use('/crm', express.static(STANDALONE_DIR, { maxAge: 0, etag: false }));

  // Serve the standalone LIMS at /lab/
  const LAB_DIR = path.join(__dirname, '..', '..', 'lab-standalone');
  app.use('/lab', express.static(LAB_DIR));
}

module.exports = { createStaticRoutes };
