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
 * Issue a new access token for a user object
 */
const ORG_ID = '00D000000000001';

function issueToken(user) {
  const rawToken = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '');
  const token = `${ORG_ID}!${rawToken}`;
  const now = Date.now();
  tokenStore.set(token, { user, issuedAt: now, expiresAt: now + TOKEN_TTL });
  return { token, issuedAt: String(now) };
}

/**
 * Build a user object from a username/email using access-control config
 */
function buildUserFromEmail(email, accessControlConfig) {
  const assignProfile = (email) => {
    const rules = (accessControlConfig.profileAssignment || {}).emailRules || [];
    for (const rule of rules) {
      const regex = new RegExp('^' + rule.pattern.replace(/\*/g, '.*') + '$');
      if (regex.test(email)) return rule.profile;
    }
    const domain = email.split('@')[1];
    const domainRules = (accessControlConfig.profileAssignment || {}).domainRules || [];
    for (const rule of domainRules) {
      if (rule.domain === domain) return rule.profile;
    }
    return (accessControlConfig.profileAssignment || {}).defaultProfile || 'System_Admin';
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
    id: 'usr_' + crypto.createHash('md5').update(email).digest('hex').slice(0, 15),
    email,
    displayName: email.split('@')[0],
    profilePhoto: null,
    profile,
    permissionSets: getPermissionSets(email),
    googleId: null
  };
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
      const username = req.body.username || 'admin@pforce.dev';
      const user = buildUserFromEmail(username, accessControlConfig);
      const { token, issuedAt } = issueToken(user);
      const instanceUrl = `${req.protocol}://${req.get('host')}`;

      return res.json({
        access_token: token,
        instance_url: instanceUrl,
        id: `${instanceUrl}/services/oauth2/userinfo`,
        token_type: 'Bearer',
        issued_at: issuedAt,
        signature: crypto.createHash('sha256').update(token).digest('base64').slice(0, 20)
      });
    }

    if (grantType === 'client_credentials') {
      const user = buildUserFromEmail('admin@pforce.dev', accessControlConfig);
      const { token, issuedAt } = issueToken(user);
      const instanceUrl = `${req.protocol}://${req.get('host')}`;

      return res.json({
        access_token: token,
        instance_url: instanceUrl,
        id: `${instanceUrl}/services/oauth2/userinfo`,
        token_type: 'Bearer',
        issued_at: issuedAt,
        signature: crypto.createHash('sha256').update(token).digest('base64').slice(0, 20)
      });
    }

    if (grantType === 'refresh_token') {
      // Issue new token for the same user (look up old token if possible)
      const oldToken = req.body.refresh_token;
      const oldEntry = tokenStore.get(oldToken);
      const user = oldEntry ? oldEntry.user : buildUserFromEmail('admin@pforce.dev', accessControlConfig);
      const { token, issuedAt } = issueToken(user);
      const instanceUrl = `${req.protocol}://${req.get('host')}`;

      return res.json({
        access_token: token,
        instance_url: instanceUrl,
        id: `${instanceUrl}/services/oauth2/userinfo`,
        token_type: 'Bearer',
        issued_at: issuedAt,
        signature: crypto.createHash('sha256').update(token).digest('base64').slice(0, 20)
      });
    }

    // authorization_code flow (simplified — just issue a token)
    if (grantType === 'authorization_code') {
      const user = buildUserFromEmail('admin@pforce.dev', accessControlConfig);
      const { token, issuedAt } = issueToken(user);
      const instanceUrl = `${req.protocol}://${req.get('host')}`;

      return res.json({
        access_token: token,
        instance_url: instanceUrl,
        id: `${instanceUrl}/services/oauth2/userinfo`,
        token_type: 'Bearer',
        issued_at: issuedAt,
        signature: crypto.createHash('sha256').update(token).digest('base64').slice(0, 20)
      });
    }

    return res.status(400).json({ error: 'unsupported_grant_type', error_description: `Grant type '${grantType}' is not supported` });
  });

  // -----------------------------------------------------------------------
  // GET /services/oauth2/authorize — OAuth2 authorize (simplified redirect)
  // -----------------------------------------------------------------------
  app.get('/services/oauth2/authorize', (req, res) => {
    const redirectUri = req.query.redirect_uri;
    const state = req.query.state || '';
    if (redirectUri) {
      const code = crypto.randomUUID();
      const separator = redirectUri.includes('?') ? '&' : '?';
      return res.redirect(`${redirectUri}${separator}code=${code}&state=${state}`);
    }
    res.status(400).json({ error: 'invalid_request', error_description: 'Missing redirect_uri' });
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
  // POST /services/Soap/u/:version — SOAP Login
  // -----------------------------------------------------------------------
  app.post('/services/Soap/u/:version', (req, res) => {
    // Parse XML body for username
    const body = typeof req.body === 'string' ? req.body : '';
    const usernameMatch = body.match(/<(?:\w+:)?username[^>]*>(.*?)<\/(?:\w+:)?username>/i);
    const username = usernameMatch ? usernameMatch[1] : 'admin@pforce.dev';

    const user = buildUserFromEmail(username, accessControlConfig);
    const { token } = issueToken(user);
    const instanceUrl = `${req.protocol}://${req.get('host')}`;

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
          <userName>${user.email}</userName>
          <userEmail>${user.email}</userEmail>
          <userFullName>${user.displayName}</userFullName>
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
 * Create Bearer token middleware that extends the existing ensureAuthenticated
 */
function createBearerMiddleware(devAutoLogin, accessControlConfig) {
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
      // In dev mode, accept any <orgId>!<token> format (e.g. after server restart)
      if (token.startsWith(ORG_ID + '!') && accessControlConfig) {
        const user = buildUserFromEmail('admin@pforce.dev', accessControlConfig);
        const now = Date.now();
        tokenStore.set(token, { user, issuedAt: now, expiresAt: now + TOKEN_TTL });
        req.user = user;
        return next();
      }
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
