'use strict';

/**
 * User Routes - /api/me, /api/admin/users, impersonation
 */

function createUserRoutes(app, ctx) {
  const { ensureAuthenticated, ensureAdmin, pgService, fsCollection, buildUserFromEmail, accessControlConfig, sfId } = ctx;

  // Current user info
  app.get('/api/me', ensureAuthenticated, (req, res) => {
    const user = {
      email: req.user.email,
      displayName: req.user.displayName,
      profilePhoto: req.user.profilePhoto,
      profile: req.user.profile,
      permissionSets: req.user.permissionSets || []
    };

    // Add impersonation info if active
    if (req.session && req.session.impersonatedUser && req.session.originalUser) {
      user.isImpersonating = true;
      user.originalUser = {
        email: req.session.originalUser.email,
        displayName: req.session.originalUser.displayName
      };
    }

    res.json(user);
  });

  // Get all users for admin user list
  app.get('/api/admin/users', ensureAdmin, async (req, res) => {
    try {
      const records = await pgService.getAll(fsCollection('User'));
      res.json({ users: records || [] });
    } catch (e) {
      // Return sample users if User table doesn't exist
      const sampleEmails = [
        { email: 'admin@sb-tempus.dev', FirstName: '管理者', LastName: 'システム' },
        { email: 'sales@softbank.co.jp', FirstName: '田中', LastName: '太郎' },
        { email: 'msl@sb-tempus.dev', FirstName: '高橋', LastName: '美咲' },
        { email: 'lab@sb-tempus.dev', FirstName: '伊藤', LastName: '直樹' },
        { email: 'viewer@sb-tempus.dev', FirstName: '閲覧', LastName: 'ユーザー' }
      ];
      const users = sampleEmails.map(s => {
        const u = buildUserFromEmail(s.email, accessControlConfig);
        return { Id: u.id, Username: s.email, Email: s.email, FirstName: s.FirstName, LastName: s.LastName, ProfileId: u.profile, IsActive: true };
      });
      res.json({ users });
    }
  });

  // Create a new user
  app.post('/api/admin/users', ensureAdmin, async (req, res) => {
    const { Email, FirstName, LastName, ProfileId } = req.body;
    if (!Email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    if (!LastName) {
      return res.status(400).json({ error: 'LastName is required' });
    }

    try {
      const id = sfId.generate('005');
      const userData = {
        Username: Email,
        Email,
        FirstName: FirstName || '',
        LastName,
        ProfileId: ProfileId || 'Read_Only',
        IsActive: true,
        CreatedDate: new Date().toISOString(),
        LastModifiedDate: new Date().toISOString()
      };
      await pgService.create(fsCollection('User'), { Id: id, data: userData });
      console.log(`[ADMIN] User created: ${Email} (${ProfileId})`);
      res.json({ success: true, Id: id, ...userData });
    } catch (e) {
      console.error('[ERROR] Failed to create user:', e.message);
      res.status(500).json({ error: 'Failed to create user' });
    }
  });

  // Delete a user
  app.delete('/api/admin/users/:id', ensureAdmin, async (req, res) => {
    try {
      await pgService.remove(fsCollection('User'), req.params.id);
      console.log(`[ADMIN] User deleted: ${req.params.id}`);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });

  // Start impersonating a user
  app.post('/api/admin/impersonate', ensureAdmin, (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }

    // Save original admin user before impersonation middleware overwrites it
    const originalUser = req.session.originalUser || req.user;
    const targetUser = buildUserFromEmail(email, accessControlConfig);

    req.session.originalUser = originalUser;
    req.session.impersonatedUser = targetUser;

    console.log(`[ADMIN] ${originalUser.email} started impersonating ${email}`);
    res.json({ success: true, user: targetUser });
  });

  // Stop impersonating
  app.post('/api/admin/stop-impersonate', ensureAuthenticated, (req, res) => {
    if (!req.session.originalUser) {
      return res.status(400).json({ error: 'Not currently impersonating' });
    }

    const originalUser = req.session.originalUser;
    console.log(`[ADMIN] ${originalUser.email} stopped impersonating ${req.session.impersonatedUser?.email}`);

    delete req.session.impersonatedUser;
    delete req.session.originalUser;

    // Restore original user for passport session
    req.user = originalUser;

    res.json({ success: true });
  });
}

module.exports = { createUserRoutes };
