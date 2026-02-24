'use strict';

/**
 * Access Control Service
 *
 * プロファイルベースのオブジェクト権限、フィールドレベルセキュリティ、
 * パーミッションセット割当、ユーザー認証ヘルパーを提供する。
 */

/**
 * Create an access control service bound to the given configurations.
 *
 * @param {object} accessControlConfig - Parsed access-control.yaml
 * @param {object} schemaConfig - Parsed schema configuration
 * @param {object} ctx - Context object
 * @param {string} ctx.nodeEnv - NODE_ENV value
 * @param {string} ctx.googleClientId - GOOGLE_CLIENT_ID value
 * @param {object} ctx.pgService - PostgreSQL service (for getCollectionNames)
 * @returns {{ assignProfileToUser, getPermissionSetsForUser, getProfileByName,
 *             canUserAccessObject, getFieldLevelSecurity, getAccessibleObjects,
 *             requireObjectAccess, filterFieldsByFLS, devAutoLogin, ensureAdmin }}
 */
function createAccessControlService(accessControlConfig, schemaConfig, ctx) {
  const { nodeEnv, googleClientId } = ctx;

  /**
   * Assign profile to user based on email rules
   * @param {string} email
   * @returns {string} profile API name
   */
  function assignProfileToUser(email) {
    const rules = accessControlConfig.profileAssignment?.emailRules || [];

    for (const rule of rules) {
      const regex = new RegExp('^' + rule.pattern.replace(/\*/g, '.*') + '$');
      if (regex.test(email)) {
        return rule.profile;
      }
    }

    const domain = email.split('@')[1];
    const domainRules = accessControlConfig.profileAssignment?.domainRules || [];
    for (const rule of domainRules) {
      if (rule.domain === domain) {
        return rule.profile;
      }
    }

    return accessControlConfig.profileAssignment?.defaultProfile || 'Read_Only';
  }

  /**
   * Get permission sets assigned to user
   * @param {string} email
   * @returns {string[]}
   */
  function getPermissionSetsForUser(email) {
    const permissionSets = accessControlConfig.permissionSets || [];
    const assignedSets = [];

    for (const pset of permissionSets) {
      if (pset.assignedEmails && pset.assignedEmails.includes(email)) {
        assignedSets.push(pset.apiName);
      }
    }

    return assignedSets;
  }

  /**
   * Get profile object by API name
   * @param {string} profileName
   * @returns {object|undefined}
   */
  function getProfileByName(profileName) {
    const profiles = accessControlConfig.profiles || [];
    return profiles.find(p => p.apiName === profileName);
  }

  /**
   * Check if user can perform action on object
   * @param {object} user
   * @param {string} objectName
   * @param {string} action - 'create' | 'read' | 'edit' | 'delete'
   * @returns {boolean}
   */
  function canUserAccessObject(user, objectName, action) {
    if (!user) return false;

    const profile = getProfileByName(user.profile);
    if (!profile) return false;

    const objPerms = profile.objectPermissions || [];
    let permission = objPerms.find(op => op.object === objectName || op.object === '*');

    if (!permission) return false;

    const actionMap = {
      create: 'allowCreate',
      read: 'allowRead',
      edit: 'allowEdit',
      delete: 'allowDelete'
    };

    return permission[actionMap[action]] === true;
  }

  /**
   * Get field-level security for user on a specific object
   * @param {object} user
   * @param {string} objectName
   * @returns {Object.<string, {visible: boolean, readOnly: boolean}>}
   */
  function getFieldLevelSecurity(user, objectName) {
    const fls = accessControlConfig.fieldLevelSecurity || [];
    const userFLS = fls.filter(f => f.profile === user.profile && f.object === objectName);

    const fieldMap = {};
    for (const flsItem of userFLS) {
      for (const field of flsItem.fields || []) {
        fieldMap[field.field] = {
          visible: field.visible !== false,
          readOnly: field.readOnly === true
        };
      }
    }

    return fieldMap;
  }

  /**
   * Get list of objects accessible to user
   * @param {object} user
   * @returns {string[]}
   */
  function getAccessibleObjects(user) {
    const profile = getProfileByName(user.profile);
    if (!profile) return [];

    const objects = [];
    for (const perm of profile.objectPermissions || []) {
      if (perm.allowRead) {
        if (perm.object === '*') {
          // Build from schema + firestore collections
          const schemaObjects = [
            ...((schemaConfig.standardObjects || []).map(o => o.apiName)),
            ...((schemaConfig.objects || []).map(o => o.apiName))
          ];
          if (schemaObjects.length > 0) return schemaObjects;
          return ctx.pgService.getCollectionNames();
        }
        objects.push(perm.object);
      }
    }

    return objects;
  }

  /**
   * Middleware: check object access for a specific action
   * @param {string} objectName
   * @param {string} action - 'create' | 'read' | 'edit' | 'delete'
   * @returns {Function} Express middleware
   */
  function requireObjectAccess(objectName, action) {
    return (req, res, next) => {
      devAutoLogin(req);
      if (!(req.isAuthenticated && req.isAuthenticated()) && !req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!canUserAccessObject(req.user, objectName, action)) {
        console.log(`[WARNING] User ${req.user.email} denied ${action} access to ${objectName}`);
        return res.status(403).json({ error: `You do not have permission to ${action} ${objectName}` });
      }

      next();
    };
  }

  /**
   * Filter fields based on FLS (field-level security)
   * @param {object} user
   * @param {string} objectName
   * @param {object} data - Record data
   * @returns {object} Filtered record data
   */
  function filterFieldsByFLS(user, objectName, data) {
    const fls = getFieldLevelSecurity(user, objectName);

    if (Object.keys(fls).length === 0) {
      return data;
    }

    const filtered = { ...data };
    for (const [field, permission] of Object.entries(fls)) {
      if (!permission.visible) {
        delete filtered[field];
      }
    }

    return filtered;
  }

  /**
   * Development mode: auto-assign a demo user if not authenticated
   * @param {object} req - Express request
   */
  function devAutoLogin(req) {
    if (nodeEnv === 'development' && !googleClientId && !req.user) {
      req.user = {
        id: 'dev-user-001',
        email: 'admin@sb-tempus.dev',
        displayName: '開発ユーザー (Admin)',
        profilePhoto: null,
        profile: 'System_Admin',
        permissionSets: ['Full_Access'],
        googleId: 'dev-user-001'
      };
    }
  }

  /**
   * Middleware: ensure the current (or original impersonating) user is System_Admin
   * @param {object} req
   * @param {object} res
   * @param {Function} next
   */
  function ensureAdmin(req, res, next) {
    devAutoLogin(req);
    // Allow if current user is admin, OR if original user (before impersonation) is admin
    const currentProfile = req.user?.profile;
    const originalProfile = req.session?.originalUser?.profile;
    if ((req.isAuthenticated && req.isAuthenticated() || req.user) && (currentProfile === 'System_Admin' || originalProfile === 'System_Admin')) {
      return next();
    }
    res.status(403).json({ error: 'Admin access required' });
  }

  return {
    assignProfileToUser,
    getPermissionSetsForUser,
    getProfileByName,
    canUserAccessObject,
    getFieldLevelSecurity,
    getAccessibleObjects,
    requireObjectAccess,
    filterFieldsByFLS,
    devAutoLogin,
    ensureAdmin
  };
}

module.exports = { createAccessControlService };
