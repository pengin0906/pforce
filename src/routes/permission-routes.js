'use strict';

/**
 * Permission Routes - /api/user/permissions/:objectName, /api/access-control
 */

function createPermissionRoutes(app, ctx) {
  const { ensureAuthenticated, getProfileByName, getFieldLevelSecurity } = ctx;

  app.get('/api/user/permissions/:objectName', ensureAuthenticated, (req, res) => {
    const { objectName } = req.params;
    const profile = getProfileByName(req.user.profile);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const objPerm = profile.objectPermissions?.find(op => op.object === objectName || op.object === '*');

    res.json({
      object: objectName,
      userProfile: req.user.profile,
      permissions: objPerm || {
        allowCreate: false,
        allowRead: false,
        allowEdit: false,
        allowDelete: false
      }
    });
  });

  app.get('/api/access-control', ensureAuthenticated, (req, res) => {
    const profile = getProfileByName(req.user.profile);

    res.json({
      userProfile: req.user.profile,
      permissionSets: req.user.permissionSets,
      objectPermissions: profile?.objectPermissions || [],
      fieldLevelSecurity: getFieldLevelSecurity(req.user, '*')
    });
  });
}

module.exports = { createPermissionRoutes };
