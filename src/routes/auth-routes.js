'use strict';

/**
 * Auth Routes - Login page, Google OAuth, Logout, Passport strategy setup
 */

function createAuthRoutes(app, ctx) {
  const { passport, NODE_ENV, ensureAuthenticated } = ctx;

  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
  const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:8080/auth/google/callback';
  const ALLOWED_DOMAIN = process.env.ALLOWED_DOMAIN || '';
  const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS || '').split(',').map(e => e.trim()).filter(e => e);

  // Only configure Google OAuth if credentials are provided
  if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    const GoogleStrategy = require('passport-google-oauth20').Strategy;

    passport.use(new GoogleStrategy({
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_CALLBACK_URL
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const domain = email.split('@')[1];

        // Validate domain if specified
        if (ALLOWED_DOMAIN && domain !== ALLOWED_DOMAIN) {
          console.log(`[WARNING] User ${email} domain ${domain} not in allowed domain ${ALLOWED_DOMAIN}`);
          return done(null, false, { message: 'ドメインが許可されていません' });
        }

        // Validate email if whitelist is specified
        if (ALLOWED_EMAILS.length > 0 && !ALLOWED_EMAILS.includes(email)) {
          console.log(`[WARNING] User ${email} not in allowed emails list`);
          return done(null, false, { message: 'メールアドレスが許可されていません' });
        }

        // Assign profile based on rules
        const assignedProfile = ctx.assignProfileToUser(email);

        const user = {
          id: profile.id,
          email: email,
          displayName: profile.displayName,
          profilePhoto: profile.photos[0]?.value || null,
          profile: assignedProfile,
          permissionSets: ctx.getPermissionSetsForUser(email),
          googleId: profile.id
        };

        console.log(`[INFO] User authenticated: ${email} with profile: ${assignedProfile}`);
        return done(null, user);
      } catch (error) {
        console.error('[ERROR] OAuth strategy error:', error);
        return done(error);
      }
    }));
  } else if (NODE_ENV === 'development') {
    console.log('[INFO] Development mode: Google OAuth credentials not set, using dev auto-login');
  }

  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((user, done) => {
    done(null, user);
  });

  // Login page
  app.get('/login', (req, res) => {
    // In dev mode without OAuth, auto-redirect to home
    if (NODE_ENV === 'development' && !GOOGLE_CLIENT_ID) {
      return res.redirect('/');
    }
    if (req.isAuthenticated()) {
      return res.redirect('/');
    }

    res.send(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Pforce - ログイン</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .login-container {
          background: white;
          border-radius: 10px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          padding: 40px;
          max-width: 400px;
          width: 100%;
        }
        h1 {
          color: #333;
          margin-bottom: 10px;
          text-align: center;
        }
        .subtitle {
          color: #666;
          text-align: center;
          margin-bottom: 30px;
          font-size: 14px;
        }
        .btn-google {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: white;
          border: 1px solid #ddd;
          color: #333;
          padding: 12px 20px;
          border-radius: 5px;
          font-size: 16px;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.3s ease;
          width: 100%;
        }
        .btn-google:hover {
          background: #f8f8f8;
          border-color: #999;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .google-icon {
          width: 20px;
          height: 20px;
        }
      </style>
    </head>
    <body>
      <div class="login-container">
        <h1>Pforce</h1>
        <p class="subtitle">Salesforce互換 CRMプラットフォーム</p>
        <a href="/auth/google" class="btn-google">
          <svg class="google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google アカウントでログイン
        </a>
      </div>
    </body>
    </html>
  `);
  });

  app.get('/auth/google',
    passport.authenticate('google', {
      scope: ['profile', 'email']
    })
  );

  app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
      res.redirect('/');
    }
  );

  app.get('/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.redirect('/login');
    });
  });
}

module.exports = { createAuthRoutes };
