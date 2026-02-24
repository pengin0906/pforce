// ============================================================================
// Pforce - OAuth2 / Bearer Token / SOAP Login Authentication
// ============================================================================

const crypto = require('crypto');

// In-memory token store: Map<token, { user, issuedAt, expiresAt }>
const tokenStore = new Map();
const TOKEN_TTL = 2 * 60 * 60 * 1000; // 2 hours

// Periodic cleanup every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, entry] of tokenStore) {
    if (now > entry.expiresAt) tokenStore.delete(token);
  }
}, 30 * 60 * 1000);

/**
 * Issue a new access token for a user object (cryptographically secure)
 */
const ORG_ID = process.env.PFORCE_ORG_ID || '00D000000000001';

function issueToken(user) {
  const rawToken = crypto.randomBytes(48).toString('hex');
  const token = `${ORG_ID}!${rawToken}`;
  const now = Date.now();
  tokenStore.set(token, { user, issuedAt: now, expiresAt: now + TOKEN_TTL });
  return { token, issuedAt: String(now) };
}

/**
 * Build a user object from a username/email using access-control config
 */
function buildUserFromEmail(email, accessControlConfig) {
  // Validate email format
  if (!email || typeof email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error('Invalid email format');
  }

  const assignProfile = (email) => {
    const rules = (accessControlConfig.profileAssignment || {}).emailRules || [];
    for (const rule of rules) {
      // Use exact string matching instead of regex to prevent ReDoS
      const pattern = rule.pattern;
      if (pattern === email) return rule.profile;
      if (pattern.includes('*')) {
        const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
        const regex = new RegExp('^' + escaped + '$');
        if (regex.test(email)) return rule.profile;
      }
    }
    const domain = email.split('@')[1];
    const domainRules = (accessControlConfig.profileAssignment || {}).domainRules || [];
    for (const rule of domainRules) {
      if (rule.domain === domain) return rule.profile;
    }
    // Default to Read_Only (not System_Admin) for safety
    return (accessControlConfig.profileAssignment || {}).defaultProfile || 'Read_Only';
  };

  const getPermissionSets = (email) => {
    const sets = accessControlConfig.permissionSets || [];
    const assigned = [];
    for (const ps of sets) {
      if (ps.assignedEmails && ps.assignedEmails.includes(email)) assigned.push(ps.apiName);
    }
    return assigned;
  };

  const profile = assignProfile(email);
  return {
    id: 'usr_' + crypto.createHash('sha256').update(email).digest('hex').slice(0, 15),
    email,
    displayName: email.split('@')[0],
    profilePhoto: null,
    profile,
    permissionSets: getPermissionSets(email),
    googleId: null
  };
}

/**
 * Validate client credentials from environment config
 */
function validateClientCredentials(clientId, clientSecret) {
  const validId = process.env.PFORCE_CLIENT_ID;
  const validSecret = process.env.PFORCE_CLIENT_SECRET;
  if (!validId || !validSecret) return false;
  // Use constant-time comparison to prevent timing attacks
  const idMatch = validId.length === (clientId || '').length &&
    crypto.timingSafeEqual(Buffer.from(validId), Buffer.from(clientId || ''));
  const secretMatch = validSecret.length === (clientSecret || '').length &&
    crypto.timingSafeEqual(Buffer.from(validSecret), Buffer.from(clientSecret || ''));
  return idMatch && secretMatch;
}

/**
 * Register all authentication routes on the Express app
 */
function createAuthRoutes(app, config) {
  const { accessControlConfig, SF_API_VERSION, firestoreService, fsCollection } = config;

  // -----------------------------------------------------------------------
  // POST /services/oauth2/token — OAuth2 token endpoint
  // -----------------------------------------------------------------------
  app.post('/services/oauth2/token', (req, res) => {
    const grantType = req.body.grant_type;

    if (grantType === 'password') {
      const username = req.body.username;
      const password = req.body.password;

      // Require username and password
      if (!username || !password) {
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'username and password are required'
        });
      }

      // Validate password against environment variable
      const validPassword = process.env.PFORCE_API_PASSWORD;
      if (!validPassword) {
        return res.status(500).json({
          error: 'server_error',
          error_description: 'Password authentication not configured (set PFORCE_API_PASSWORD)'
        });
      }
      if (password !== validPassword) {
        return res.status(401).json({
          error: 'invalid_grant',
          error_description: 'Authentication failed'
        });
      }

      try {
        const user = buildUserFromEmail(username, accessControlConfig);
        const { token, issuedAt } = issueToken(user);
        const instanceUrl = `${req.protocol}://${req.get('host')}`;

        return res.json({
          access_token: token,
          instance_url: instanceUrl,
          id: `${instanceUrl}/services/oauth2/userinfo`,
          token_type: 'Bearer',
          issued_at: issuedAt,
          signature: crypto.createHmac('sha256', ORG_ID).update(token).digest('base64').slice(0, 28)
        });
      } catch (e) {
        return res.status(400).json({ error: 'invalid_grant', error_description: 'Invalid username' });
      }
    }

    if (grantType === 'client_credentials') {
      const clientId = req.body.client_id;
      const clientSecret = req.body.client_secret;

      if (!validateClientCredentials(clientId, clientSecret)) {
        return res.status(401).json({
          error: 'invalid_client',
          error_description: 'Invalid client credentials'
        });
      }

      // Client credentials use a service account email
      const serviceEmail = process.env.PFORCE_SERVICE_EMAIL || 'service@pforce.local';
      try {
        const user = buildUserFromEmail(serviceEmail, accessControlConfig);
        const { token, issuedAt } = issueToken(user);
        const instanceUrl = `${req.protocol}://${req.get('host')}`;

        return res.json({
          access_token: token,
          instance_url: instanceUrl,
          id: `${instanceUrl}/services/oauth2/userinfo`,
          token_type: 'Bearer',
          issued_at: issuedAt,
          signature: crypto.createHmac('sha256', ORG_ID).update(token).digest('base64').slice(0, 28)
        });
      } catch (e) {
        return res.status(400).json({ error: 'invalid_grant', error_description: 'Authentication failed' });
      }
    }

    if (grantType === 'refresh_token') {
      const oldToken = req.body.refresh_token;
      if (!oldToken) {
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'refresh_token is required'
        });
      }
      const oldEntry = tokenStore.get(oldToken);
      if (!oldEntry) {
        return res.status(401).json({
          error: 'invalid_grant',
          error_description: 'Invalid or expired refresh token'
        });
      }
      // Revoke old token
      tokenStore.delete(oldToken);
      const user = oldEntry.user;
      const { token, issuedAt } = issueToken(user);
      const instanceUrl = `${req.protocol}://${req.get('host')}`;

      return res.json({
        access_token: token,
        instance_url: instanceUrl,
        id: `${instanceUrl}/services/oauth2/userinfo`,
        token_type: 'Bearer',
        issued_at: issuedAt,
        signature: crypto.createHmac('sha256', ORG_ID).update(token).digest('base64').slice(0, 28)
      });
    }

    // authorization_code flow
    if (grantType === 'authorization_code') {
      const code = req.body.code;
      const clientId = req.body.client_id;
      const clientSecret = req.body.client_secret;

      if (!code) {
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'authorization code is required'
        });
      }
      if (!validateClientCredentials(clientId, clientSecret)) {
        return res.status(401).json({
          error: 'invalid_client',
          error_description: 'Invalid client credentials'
        });
      }

      // In production, you'd validate the authorization code against a code store
      // For now, use the service email (not admin)
      const serviceEmail = process.env.PFORCE_SERVICE_EMAIL || 'service@pforce.local';
      try {
        const user = buildUserFromEmail(serviceEmail, accessControlConfig);
        const { token, issuedAt } = issueToken(user);
        const instanceUrl = `${req.protocol}://${req.get('host')}`;

        return res.json({
          access_token: token,
          instance_url: instanceUrl,
          id: `${instanceUrl}/services/oauth2/userinfo`,
          token_type: 'Bearer',
          issued_at: issuedAt,
          signature: crypto.createHmac('sha256', ORG_ID).update(token).digest('base64').slice(0, 28)
        });
      } catch (e) {
        return res.status(400).json({ error: 'invalid_grant', error_description: 'Authentication failed' });
      }
    }

    return res.status(400).json({ error: 'unsupported_grant_type', error_description: `Grant type '${grantType}' is not supported` });
  });

  // -----------------------------------------------------------------------
  // GET /services/oauth2/authorize — OAuth2 authorize (with redirect_uri validation)
  // -----------------------------------------------------------------------
  app.get('/services/oauth2/authorize', (req, res) => {
    const redirectUri = req.query.redirect_uri;
    const state = req.query.state || '';

    if (!redirectUri) {
      return res.status(400).json({ error: 'invalid_request', error_description: 'Missing redirect_uri' });
    }

    // Validate redirect_uri against allowlist
    const allowedRedirects = (process.env.PFORCE_ALLOWED_REDIRECTS || '').split(',').filter(Boolean);
    if (allowedRedirects.length === 0) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'No redirect URIs configured (set PFORCE_ALLOWED_REDIRECTS)'
      });
    }

    let isAllowed = false;
    try {
      const parsed = new URL(redirectUri);
      // Require HTTPS in production
      if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
        return res.status(400).json({ error: 'invalid_request', error_description: 'redirect_uri must use HTTPS' });
      }
      for (const allowed of allowedRedirects) {
        if (redirectUri.startsWith(allowed.trim())) {
          isAllowed = true;
          break;
        }
      }
    } catch (_e) {
      return res.status(400).json({ error: 'invalid_request', error_description: 'Invalid redirect_uri format' });
    }

    if (!isAllowed) {
      return res.status(400).json({ error: 'invalid_request', error_description: 'redirect_uri is not in the allowed list' });
    }

    const code = crypto.randomBytes(32).toString('hex');
    const separator = redirectUri.includes('?') ? '&' : '?';
    return res.redirect(`${redirectUri}${separator}code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`);
  });

  // -----------------------------------------------------------------------
  // GET /services/oauth2/userinfo — Identity endpoint
  // -----------------------------------------------------------------------
  app.get('/services/oauth2/userinfo', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json([{ message: 'Session expired or invalid', errorCode: 'INVALID_SESSION_ID' }]);
    }
    const token = authHeader.slice(7);
    const entry = tokenStore.get(token);
    if (!entry || Date.now() > entry.expiresAt) {
      tokenStore.delete(token);
      return res.status(401).json([{ message: 'Session expired or invalid', errorCode: 'INVALID_SESSION_ID' }]);
    }
    const user = entry.user;
    const instanceUrl = `${req.protocol}://${req.get('host')}`;

    // Look up actual User record by email/username
    let sfUserId = '005000000000001';
    let sfUsername = user.email;
    let sfDisplayName = user.displayName;
    try {
      if (firestoreService && fsCollection) {
        const allUsers = await firestoreService.getAll(fsCollection('User'));
        const match = allUsers.find(u => u.Email === user.email || u.Username === user.email);
        if (match) {
          sfUserId = match.Id;
          sfUsername = match.Username || match.Email || user.email;
          sfDisplayName = ((match.FirstName || '') + ' ' + (match.LastName || '')).trim() || user.displayName;
        }
      }
    } catch (_e) { /* fallback to defaults */ }

    res.json({
      sub: sfUserId,
      name: sfDisplayName,
      email: user.email,
      preferred_username: sfUsername,
      nickname: sfUsername,
      organization_id: ORG_ID,
      user_id: sfUserId,
      user_type: 'STANDARD',
      active: true,
      locale: 'ja_JP',
      language: 'ja',
      timezone: 'Asia/Tokyo',
      photos: { picture: null, thumbnail: null },
      urls: {
        enterprise: `${instanceUrl}/services/Soap/c/${SF_API_VERSION}`,
        metadata: `${instanceUrl}/services/Soap/m/${SF_API_VERSION}`,
        partner: `${instanceUrl}/services/Soap/u/${SF_API_VERSION}`,
        rest: `${instanceUrl}/services/data/v${SF_API_VERSION}/`,
        sobjects: `${instanceUrl}/services/data/v${SF_API_VERSION}/sobjects/`,
        search: `${instanceUrl}/services/data/v${SF_API_VERSION}/search/`,
        query: `${instanceUrl}/services/data/v${SF_API_VERSION}/query/`,
        tooling_rest: `${instanceUrl}/services/data/v${SF_API_VERSION}/tooling/`,
        profile: `${instanceUrl}/${sfUserId}`
      }
    });
  });

  // -----------------------------------------------------------------------
  // POST /services/Soap/u/:version — SOAP Login (with password validation)
  // -----------------------------------------------------------------------
  app.post('/services/Soap/u/:version', (req, res) => {
    const body = typeof req.body === 'string' ? req.body : '';

    // Parse username and password from SOAP XML
    const usernameMatch = body.match(/<(?:\w+:)?username[^>]*>(.*?)<\/(?:\w+:)?username>/i);
    const passwordMatch = body.match(/<(?:\w+:)?password[^>]*>(.*?)<\/(?:\w+:)?password>/i);
    const username = usernameMatch ? usernameMatch[1] : null;
    const password = passwordMatch ? passwordMatch[1] : null;

    if (!username || !password) {
      res.set('Content-Type', 'text/xml; charset=UTF-8');
      return res.status(401).send(`<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <soapenv:Fault>
      <faultcode>INVALID_LOGIN</faultcode>
      <faultstring>INVALID_LOGIN: username and password are required</faultstring>
    </soapenv:Fault>
  </soapenv:Body>
</soapenv:Envelope>`);
    }

    // Validate password
    const validPassword = process.env.PFORCE_API_PASSWORD;
    if (!validPassword || password !== validPassword) {
      res.set('Content-Type', 'text/xml; charset=UTF-8');
      return res.status(401).send(`<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <soapenv:Fault>
      <faultcode>INVALID_LOGIN</faultcode>
      <faultstring>INVALID_LOGIN: Invalid username or password</faultstring>
    </soapenv:Fault>
  </soapenv:Body>
</soapenv:Envelope>`);
    }

    let user;
    try {
      user = buildUserFromEmail(username, accessControlConfig);
    } catch (_e) {
      res.set('Content-Type', 'text/xml; charset=UTF-8');
      return res.status(401).send(`<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <soapenv:Fault>
      <faultcode>INVALID_LOGIN</faultcode>
      <faultstring>INVALID_LOGIN: Invalid username format</faultstring>
    </soapenv:Fault>
  </soapenv:Body>
</soapenv:Envelope>`);
    }

    const { token } = issueToken(user);
    const instanceUrl = `${req.protocol}://${req.get('host')}`;
    const escapedEmail = user.email.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const escapedName = user.displayName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    res.set('Content-Type', 'text/xml; charset=UTF-8');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns="urn:partner.soap.sforce.com">
  <soapenv:Body>
    <loginResponse>
      <result>
        <metadataServerUrl>${instanceUrl}/services/Soap/m/${SF_API_VERSION}/00Dxx0000001gPL</metadataServerUrl>
        <passwordExpired>false</passwordExpired>
        <sandbox>true</sandbox>
        <serverUrl>${instanceUrl}/services/Soap/u/${SF_API_VERSION}/00Dxx0000001gPL</serverUrl>
        <sessionId>${token}</sessionId>
        <userId>${user.id}</userId>
        <userInfo>
          <organizationId>${ORG_ID}</organizationId>
          <organizationName>Pforce</organizationName>
          <profileId>00exx000001234</profileId>
          <userName>${escapedEmail}</userName>
          <userEmail>${escapedEmail}</userEmail>
          <userFullName>${escapedName}</userFullName>
          <userLanguage>ja</userLanguage>
          <userLocale>ja_JP</userLocale>
          <userTimeZone>Asia/Tokyo</userTimeZone>
        </userInfo>
      </result>
    </loginResponse>
  </soapenv:Body>
</soapenv:Envelope>`);
  });

  // -----------------------------------------------------------------------
  // POST /services/Soap/c/:version — Enterprise SOAP Login (alias)
  // -----------------------------------------------------------------------
  app.post('/services/Soap/c/:version', (req, res) => {
    // Forward to partner SOAP login
    req.params.version = req.params.version;
    app.handle(req, res);
  });
}

/**
 * Create Bearer token middleware (no dev-mode token auto-acceptance)
 */
function createBearerMiddleware(devAutoLogin, _accessControlConfig) {
  return function ensureAuthenticated(req, res, next) {
    // Check Bearer token first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const entry = tokenStore.get(token);
      if (entry && Date.now() <= entry.expiresAt) {
        req.user = entry.user;
        return next();
      }
      // Reject unknown/expired tokens — no dev-mode auto-acceptance
      return res.status(401).json([{ message: 'Session expired or invalid', errorCode: 'INVALID_SESSION_ID' }]);
    }

    // Fall through to dev auto-login and session
    devAutoLogin(req);
    if (req.isAuthenticated && req.isAuthenticated()) {
      return next();
    }
    if (req.user) {
      return next();
    }
    res.status(401).json([{ message: 'Session expired or invalid', errorCode: 'INVALID_SESSION_ID' }]);
  };
}

module.exports = {
  createAuthRoutes,
  createBearerMiddleware,
  tokenStore,
  issueToken,
  buildUserFromEmail
};
