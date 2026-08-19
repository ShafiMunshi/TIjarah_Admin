/**
 * FCM Notification Service
 * Dispatches broadcast notifications securely via Firebase Callable Cloud Function (Firebase Admin SDK).
 * Targets all users who have installed the APK via topic "all_users".
 */

import { httpsCallable } from 'firebase/functions';
import { getFirebaseFunctions, isFirebaseConfigured } from './firebaseClient';
import type { NotificationPriority } from '../types/notifications';

export interface FcmBroadcastParams {
  campaignId?: string;
  title: string;
  body: string;
  imageUrl?: string;
  route?: string;
  url?: string;
  arguments?: any;
  action?: string;
  priority?: NotificationPriority;
  sound?: 'default' | 'alert' | 'silent';
  scheduleLater?: boolean;
  scheduledFor?: string;
}

export interface FcmV1WireMessage {
  message: {
    topic: string;
    notification?: {
      title: string;
      body: string;
      image?: string;
      imageUrl?: string;
    };
    data?: Record<string, string>;
    android?: {
      priority?: 'HIGH' | 'NORMAL' | 'normal' | 'high';
      notification?: {
        sound?: string;
        clickAction?: string;
        channelId?: string;
        imageUrl?: string;
      };
    };
    apns?: {
      headers?: Record<string, string>;
      payload?: {
        aps?: {
          alert?: {
            title?: string;
            body?: string;
          };
          sound?: string;
          badge?: number;
        };
      };
      fcmOptions?: {
        imageUrl?: string;
      };
    };
  };
}

export interface FcmSendResult {
  success: boolean;
  messageId?: string;
  campaignId: string;
  mode: 'callable_cloud_function' | 'scheduled' | 'offline_simulation';
  status: 'sent_to_fcm' | 'scheduled' | 'failed';
  fcmAccepted: boolean;
  rawPayload?: FcmV1WireMessage;
  response?: any;
  error?: string;
}

export class FcmNotificationService {
  /**
   * Build the exact wire payload preview for topic "all_users" (used for UI inspection & mobile preview)
   */
  public buildV1WirePayload(params: FcmBroadcastParams): FcmV1WireMessage {
    const priority = params.priority || 'high';
    const soundName = params.sound || 'alert';

    const dataPayload: Record<string, string> = {
      title: params.title,
      body: params.body,
      click_action: 'FLUTTER_NOTIFICATION_CLICK',
      priority,
      sound: soundName,
    };

    if (params.route) {
      dataPayload.route = params.route;
      dataPayload.screen = params.route;
    }
    if (params.url) {
      dataPayload.url = params.url;
      dataPayload.link = params.url;
    }
    if (params.arguments) {
      dataPayload.arguments = typeof params.arguments === 'string'
        ? params.arguments
        : JSON.stringify(params.arguments);
    }
    if (params.action) {
      dataPayload.action = params.action;
      dataPayload.type = params.action;
    }

    const wirePayload: FcmV1WireMessage = {
      message: {
        topic: 'all_users',
        notification: {
          title: params.title,
          body: params.body,
          ...(params.imageUrl ? { imageUrl: params.imageUrl, image: params.imageUrl } : {}),
        },
        data: dataPayload,
        android: {
          priority: priority === 'normal' ? 'normal' : 'high',
          notification: {
            sound: soundName === 'silent' ? undefined : (soundName === 'alert' ? 'alert' : 'default'),
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
            channelId: 'tijarah_general_broadcasts',
            ...(params.imageUrl ? { imageUrl: params.imageUrl } : {}),
          },
        },
        apns: {
          headers: {
            'apns-priority': priority === 'normal' ? '5' : '10',
          },
          payload: {
            aps: {
              alert: {
                title: params.title,
                body: params.body,
              },
              sound: soundName === 'silent' ? undefined : (soundName === 'alert' ? 'alert.caf' : 'default'),
              badge: 1,
            },
          },
          ...(params.imageUrl ? { fcmOptions: { imageUrl: params.imageUrl } } : {}),
        },
      },
    };

    return wirePayload;
  }

  /**
   * Broadcast message to all installed APK users by calling the secure
   * sendBroadcastNotification Callable Cloud Function (Firebase Admin SDK).
   */
  public async sendBroadcast(
    params: FcmBroadcastParams,
    _author?: { uid: string; displayName: string; email: string; role: string }
  ): Promise<FcmSendResult> {
    const campaignId = params.campaignId || `camp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const wirePayload = this.buildV1WirePayload(params);

    console.group(`🚀 [FCM Broadcast] Dispatching to /topics/all_users via Cloud Function (${new Date().toLocaleTimeString()})`);
    console.info('📡 Mechanism: Firebase Callable Cloud Function (sendBroadcastNotification)');
    console.info('📦 Wire Payload:', wirePayload);

    const functions = getFirebaseFunctions();

    if (!functions || !isFirebaseConfigured()) {
      // Offline / Unconfigured Firebase fallback simulation
      console.warn('⚠️ Firebase is not configured or offline. Running simulation.');
      console.groupEnd();
      return {
        success: true,
        campaignId,
        mode: 'offline_simulation',
        status: params.scheduleLater ? 'scheduled' : 'sent_to_fcm',
        fcmAccepted: true,
        messageId: `mock_msg_${Date.now()}`,
        rawPayload: wirePayload,
        response: {
          simulation: true,
          message: 'Firebase is not configured in local environment; simulated dispatch.',
          topic: 'all_users',
        },
      };
    }

    try {
      // Invoke secure backend Firebase Cloud Function
      const sendBroadcastFn = httpsCallable<any, any>(functions, 'sendBroadcastNotification');

      const callPayload = {
        campaignId,
        title: params.title,
        body: params.body,
        imageUrl: params.imageUrl || null,
        route: params.route || null,
        url: params.url || null,
        arguments: params.arguments || null,
        action: params.action || 'promotion',
        priority: params.priority || 'high',
        sound: params.sound || 'alert',
        scheduleLater: Boolean(params.scheduleLater),
        scheduledFor: params.scheduledFor || null,
      };

      console.info('📤 Cloud Function Invocation Payload:', callPayload);

      const result = await sendBroadcastFn(callPayload);
      const data = result.data || {};

      console.log('RESPONSE (Cloud Function Result):', data);
      console.groupEnd();

      const finalResult: FcmSendResult = {
        success: Boolean(data.success),
        messageId: data.messageId,
        campaignId: data.campaignId || campaignId,
        mode: data.mode === 'scheduled' ? 'scheduled' : 'callable_cloud_function',
        status: data.status || (params.scheduleLater ? 'scheduled' : 'sent_to_fcm'),
        fcmAccepted: Boolean(data.fcmAccepted),
        rawPayload: wirePayload,
        response: data,
      };

      console.log('RESPONSE:', finalResult);
      return finalResult;
    } catch (err: any) {
      console.error('❌ Cloud Function sendBroadcastNotification failed:', err);
      console.groupEnd();

      const errorMessage = err?.message || 'Error invoking sendBroadcastNotification Cloud Function';
      console.log('RESPONSE ERROR:', errorMessage);

      throw new Error(errorMessage);
    }
  }
}

export const fcmRestService = new FcmNotificationService();
