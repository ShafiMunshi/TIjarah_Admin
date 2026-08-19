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
 * Cloud Function: Send Broadcast Push Notification via Firebase Cloud Messaging (FCM)
 * Restricted to authenticated Administrators with super_admin / marketing_admin or fcm:broadcast permission
 */
exports.sendBroadcastNotification = functions.https.onCall(async (data, context) => {
  // 1. Verify caller is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  // 2. Verify caller has authorized admin role or permissions
  const token = context.auth.token || {};
  const callerRole = token.role;
  const callerPermissions = token.permissions || [];
  const isSuperAdmin = callerRole === 'super_admin' || token.admin === true;
  const isMarketingAdmin = callerRole === 'marketing_admin';
  const hasBroadcastPerm = callerPermissions.includes('fcm:broadcast') || callerPermissions.includes('fcm:compose');

  let isAuthorized = isSuperAdmin || isMarketingAdmin || hasBroadcastPerm;

  // Fallback check against Firestore 'admins' / 'ADMINS' collections
  if (!isAuthorized) {
    try {
      const adminDoc = await admin.firestore().collection('admins').doc(context.auth.uid).get();
      if (adminDoc.exists) {
        const adminData = adminDoc.data() || {};
        if (
          adminData.role === 'super_admin' ||
          adminData.role === 'marketing_admin' ||
          adminData.isSuperAdmin ||
          (adminData.permissions && (adminData.permissions.sendNotifications || adminData.permissions.includes?.('fcm:broadcast')))
        ) {
          isAuthorized = true;
        }
      } else {
        const adminDocUpper = await admin.firestore().collection('ADMINS').doc(context.auth.uid).get();
        if (adminDocUpper.exists) {
          const adminData = adminDocUpper.data() || {};
          if (
            adminData.role === 'super_admin' ||
            adminData.role === 'marketing_admin' ||
            adminData.isSuperAdmin ||
            (adminData.permissions && (adminData.permissions.sendNotifications || adminData.permissions.includes?.('fcm:broadcast')))
          ) {
            isAuthorized = true;
          }
        }
      }
    } catch (authLookupErr) {
      console.warn('Admin authorization lookup error in Firestore:', authLookupErr);
    }
  }

  if (!isAuthorized) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Unauthorized: Only authorized administrators (super_admin, marketing_admin) can broadcast push notifications.'
    );
  }

  // 3. Validate request data
  const {
    title,
    body,
    imageUrl,
    route,
    url,
    arguments: customArgs,
    action,
    priority = 'high',
    sound = 'alert',
    scheduleLater = false,
    scheduledFor = null,
  } = data || {};

  if (!title || !title.trim() || !body || !body.trim()) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Notification title and message body are required.'
    );
  }

  const campaignId = data.campaignId || `camp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const cleanTitle = title.trim();
  const cleanBody = body.trim();
  const cleanImageUrl = (imageUrl && typeof imageUrl === 'string') ? imageUrl.trim() : null;
  const cleanRoute = (route && typeof route === 'string') ? route.trim() : null;
  const cleanUrl = (url && typeof url === 'string') ? url.trim() : null;
  const cleanAction = (action && typeof action === 'string') ? action.trim() : 'promotion';

  let customArgsString = '';
  if (customArgs) {
    customArgsString = typeof customArgs === 'string' ? customArgs.trim() : JSON.stringify(customArgs);
  }

  const author = {
    uid: context.auth.uid,
    email: token.email || 'admin@tijarah.app',
    displayName: token.name || token.email || 'Admin',
    role: callerRole || 'admin',
  };

  const campRef = admin.firestore().collection('CAMPAIGNS').doc(campaignId);

  // 4. Handle Scheduled Broadcasts
  if (scheduleLater && scheduledFor) {
    const scheduledPayload = {
      id: campaignId,
      title: cleanTitle,
      body: cleanBody,
      imageUrl: cleanImageUrl || '',
      deepLink: cleanRoute || cleanUrl || '',
      audience: 'all_users',
      targetTopic: '/topics/all_users',
      topic: 'all_users',
      status: 'scheduled',
      scheduledFor: scheduledFor,
      priority,
      sound,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      sentAt: null,
      fcmAccepted: false,
      fcmMessageId: null,
      createdBy: {
        adminId: author.uid,
        adminName: author.displayName,
        adminRole: author.role,
      },
      metrics: {
        totalSent: 0,
        fcmAcceptedCount: 0,
        failedCount: 0,
      },
    };

    await campRef.set(scheduledPayload);

    await admin.firestore().collection('audit_logs').add({
      action: 'fcm_broadcast_scheduled',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      actor: author,
      targetResource: { type: 'campaign', id: campaignId, name: cleanTitle },
      target: 'all_users',
      status: 'scheduled',
      scheduledFor: scheduledFor,
      description: `Scheduled push broadcast "${cleanTitle}" to topic /topics/all_users for ${scheduledFor}`,
    });

    return {
      success: true,
      mode: 'scheduled',
      campaignId,
      status: 'scheduled',
      message: `Notification successfully scheduled for ${scheduledFor}`,
    };
  }

  // 5. Build FCM Message Payload for Topic "all_users"
  const dataPayload = {
    title: cleanTitle,
    body: cleanBody,
    click_action: 'FLUTTER_NOTIFICATION_CLICK',
    priority: priority,
    sound: sound,
  };

  if (cleanRoute) {
    dataPayload.route = cleanRoute;
    dataPayload.screen = cleanRoute;
  }
  if (cleanUrl) {
    dataPayload.url = cleanUrl;
    dataPayload.link = cleanUrl;
  }
  if (customArgsString) {
    dataPayload.arguments = customArgsString;
  }
  if (cleanAction) {
    dataPayload.action = cleanAction;
    dataPayload.type = cleanAction;
  }

  const fcmMessage = {
    topic: 'all_users',
    notification: {
      title: cleanTitle,
      body: cleanBody,
      ...(cleanImageUrl ? { imageUrl: cleanImageUrl } : {}),
    },
    data: dataPayload,
    android: {
      priority: priority === 'normal' ? 'normal' : 'high',
      notification: {
        sound: sound === 'silent' ? undefined : (sound === 'alert' ? 'alert' : 'default'),
        clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        channelId: 'tijarah_general_broadcasts',
        ...(cleanImageUrl ? { imageUrl: cleanImageUrl } : {}),
      },
    },
    apns: {
      headers: {
        'apns-priority': priority === 'normal' ? '5' : '10',
      },
      payload: {
        aps: {
          alert: {
            title: cleanTitle,
            body: cleanBody,
          },
          sound: sound === 'silent' ? undefined : (sound === 'alert' ? 'alert.caf' : 'default'),
          badge: 1,
        },
      },
      ...(cleanImageUrl ? { fcmOptions: { imageUrl: cleanImageUrl } } : {}),
    },
  };

  // Record initial "sending" state in Firestore
  await campRef.set({
    id: campaignId,
    title: cleanTitle,
    body: cleanBody,
    imageUrl: cleanImageUrl || '',
    deepLink: cleanRoute || cleanUrl || '',
    audience: 'all_users',
    targetTopic: '/topics/all_users',
    topic: 'all_users',
    status: 'sending',
    priority,
    sound,
    fcmMessage,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: {
      adminId: author.uid,
      adminName: author.displayName,
      adminRole: author.role,
    },
  }, { merge: true });

  // 6. Send message via Firebase Admin SDK Messaging
  try {
    const messageId = await admin.messaging().send(fcmMessage);

    // 7. Update Firestore campaign with successful send
    await campRef.set({
      status: 'sent_to_fcm',
      fcmAccepted: true,
      fcmMessageId: messageId,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      metrics: {
        totalSent: 1,
        fcmAcceptedCount: 1,
        failedCount: 0,
      },
    }, { merge: true });

    // 8. Add immutable Audit Log
    await admin.firestore().collection('audit_logs').add({
      action: 'fcm_broadcast_dispatched',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      actor: author,
      targetResource: {
        type: 'campaign',
        id: campaignId,
        name: cleanTitle,
      },
      target: 'all_users',
      fcmMessageId: messageId,
      status: 'success',
      description: `Dispatched FCM Broadcast to all APK users (/topics/all_users): "${cleanTitle}"`,
      changes: {
        fcmMessageId: messageId,
        topic: 'all_users',
      },
    });

    return {
      success: true,
      messageId,
      campaignId,
      status: 'sent_to_fcm',
      fcmAccepted: true,
      mode: 'fcm_admin_sdk',
    };
  } catch (fcmError) {
    console.error('Firebase Admin FCM send error:', fcmError);

    // Update Firestore campaign with failed status
    await campRef.set({
      status: 'failed',
      fcmAccepted: false,
      fcmError: fcmError.message || 'Unknown FCM error',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      metrics: {
        totalSent: 1,
        fcmAcceptedCount: 0,
        failedCount: 1,
      },
    }, { merge: true }).catch(() => {});

    // Log failure in audit_logs
    await admin.firestore().collection('audit_logs').add({
      action: 'fcm_broadcast_failed',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      actor: author,
      targetResource: {
        type: 'campaign',
        id: campaignId,
        name: cleanTitle,
      },
      target: 'all_users',
      status: 'failed',
      error: fcmError.message,
      description: `Failed to broadcast FCM message to /topics/all_users: ${fcmError.message}`,
    }).catch(() => {});

    throw new functions.https.HttpsError(
      'internal',
      `Failed to send notification via Firebase Cloud Messaging: ${fcmError.message}`
    );
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

exports.verifyAdminClaims = verifyAdminClaims;
