const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK with service account
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Valid administrative roles and default permissions
 */
const ROLE_PERMISSIONS = {
  super_admin: [
    'users:view', 'users:edit', 'users:manage_subscription', 'users:delete', 'users:export',
    'fcm:compose', 'fcm:broadcast', 'fcm:view_campaigns', 'fcm:manage_segments',
    'crashlytics:view', 'crashlytics:manage_issues', 'analytics:app_health', 'analytics:financial',
    'admins:view', 'admins:manage_roles', 'admins:set_claims', 'audit:view_full', 'settings:manage'
  ],
  app_manager: [
    'users:view', 'users:edit', 'users:manage_subscription',
    'crashlytics:view', 'crashlytics:manage_issues', 'analytics:app_health', 'audit:view_limited'
  ],
  marketing_admin: [
    'fcm:compose', 'fcm:broadcast', 'fcm:view_campaigns', 'fcm:manage_segments', 'audit:view_limited'
  ]
};

/**
 * Cloud Function: Set Custom Claims & Admin Role
 * Restrict to Super Admins only
 */
exports.setAdminRole = functions.https.onCall(async (data, context) => {
  // 1. Verify caller is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  // 2. Verify caller has Super Admin role
  const callerRole = context.auth.token.role;
  if (callerRole !== 'super_admin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only Super Administrators are authorized to assign administrative roles and custom claims.'
    );
  }

  const { targetUid, newRole, customPermissions, department } = data;

  if (!targetUid || !newRole || !ROLE_PERMISSIONS[newRole]) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid target UID or role specified.');
  }

  const permissions = Array.isArray(customPermissions) && customPermissions.length > 0
    ? customPermissions
    : ROLE_PERMISSIONS[newRole];

  try {
    // 3. Inject custom claims into Firebase Auth Token
    await admin.auth().setCustomUserClaims(targetUid, {
      role: newRole,
      permissions: permissions,
      department: department || 'Staff',
      updated_at: new Date().toISOString(),
    });

    // 4. Update Firestore admins collection for queryable indexing
    await admin.firestore().collection('admins').doc(targetUid).set({
      role: newRole,
      permissions: permissions,
      department: department || 'Staff',
      updatedBy: context.auth.uid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // 5. Append immutable entry to audit_logs collection
    await admin.firestore().collection('audit_logs').add({
      action: 'admin_custom_claims_updated',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      actor: {
        uid: context.auth.uid,
        email: context.auth.token.email || 'unknown',
        role: callerRole,
      },
      targetResource: {
        type: 'admin',
        id: targetUid,
      },
      description: `Assigned role ${newRole} to user ${targetUid}`,
      changes: {
        role: newRole,
        permissionsCount: permissions.length,
      }
    });

    return {
      success: true,
      message: `Custom claims successfully assigned for ${targetUid}. User must refresh token.`
    };
  } catch (error) {
    console.error('Error assigning custom claims:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Express Middleware helper for backend APIs to verify token claims
 */
function verifyAdminClaims(requiredPermissions = []) {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or malformed Bearer token' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      req.adminUser = decodedToken;

      if (decodedToken.role === 'super_admin') {
        return next(); // Super admin bypass
      }

      const userPermissions = decodedToken.permissions || [];
      const hasAll = requiredPermissions.every(p => userPermissions.includes(p));

      if (!hasAll) {
        return res.status(403).json({
          error: 'Forbidden: Insufficient administrative privileges',
          required: requiredPermissions,
          currentClaims: userPermissions,
        });
      }

      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired Firebase ID token', details: err.message });
    }
  };
}

module.exports = {
  verifyAdminClaims,
};
