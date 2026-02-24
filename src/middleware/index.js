'use strict';

/**
 * Middleware Setup
 *
 * Express アプリケーションにセキュリティ、パーシング、セッション、
 * レート制限、ロギングなどのミドルウェアを一括設定する。
 */

const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const express = require('express');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const session = require('express-session');
const MemoryStore = require('memorystore')(session);
const passport = require('passport');

/**
 * Set up all middleware on the Express app.
 *
 * @param {import('express').Application} app - Express application instance
 * @param {object} ctx - Context object containing configuration
 * @param {string} ctx.sessionSecret - Session secret key
 * @param {string} ctx.nodeEnv - NODE_ENV value ('development' | 'production')
 */
function setupMiddleware(app, ctx) {
  const { sessionSecret, nodeEnv } = ctx;

  // Compression middleware
  app.use(compression());

  // Helmet for security headers with strict CSP
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "cdnjs.cloudflare.com", "unpkg.com"],
        scriptSrcAttr: ["'none'"],
        styleSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com", "unpkg.com"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    xContentTypeOptions: true,
    xFrameOptions: { action: 'deny' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    strictTransportSecurity: { maxAge: 31536000, includeSubDomains: true }
  }));

  // CORS Configuration
  const corsOptions = {
    origin: function (origin, callback) {
      const allowed = process.env.ALLOWED_ORIGINS?.split(',').map(s => s.trim()) || ['http://localhost:3000'];
      if (!origin || allowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
  };
  app.use(cors(corsOptions));

  // Normalize double slashes in URL (SF CLI sometimes sends //services/data)
  app.use((req, _res, next) => {
    if (req.url.includes('//')) req.url = req.url.replace(/\/\/+/g, '/');
    next();
  });

  // Body parsing and cookies
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ limit: '2mb', extended: true }));
  app.use(express.text({ type: ['text/xml', 'application/xml', 'application/soap+xml'], limit: '1mb' }));
  app.use(cookieParser());

  // Rate limiting
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Too many authentication attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false
  });

  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: 'Too many API requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false
    // Rate limits apply to all users (no admin bypass)
  });

  app.use('/auth/', authLimiter);
  app.use('/services/oauth2/token', authLimiter);
  app.use('/services/Soap/', authLimiter);

  // Session configuration
  app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    name: '_pforce_sid',
    store: new MemoryStore({ checkPeriod: 86400000 }),
    cookie: {
      httpOnly: true,
      secure: nodeEnv === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000,
      path: '/'
    }
  }));

  // Passport initialization
  app.use(passport.initialize());
  app.use(passport.session());

  // Impersonation middleware: if admin is impersonating a user, swap req.user
  app.use((req, res, next) => {
    if (req.session && req.session.impersonatedUser) {
      // Save original user for reference
      if (!req.session.originalUser && req.user) {
        req.session.originalUser = req.user;
      }
      req.user = req.session.impersonatedUser;
    }
    next();
  });

  // API rate limiter (after session/passport so req.user is available)
  app.use('/api/', apiLimiter);
  app.use('/services/', apiLimiter);

  // Request logging (no PII in production)
  app.use((req, res, next) => {
    if (nodeEnv !== 'production') {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] ${req.method} ${req.path}`);
    }
    next();
  });
}

module.exports = { setupMiddleware };
