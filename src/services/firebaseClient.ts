import { initializeApp, getApps, getApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import type { Auth } from 'firebase/auth';

export interface FirebaseConfigOptions {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

const STORAGE_KEY = 'tijarah_custom_firebase_config_v1';

export function getStoredFirebaseConfig(): FirebaseConfigOptions | null {
  try {
    const fromStorage = localStorage.getItem(STORAGE_KEY);
    if (fromStorage) {
      const parsed = JSON.parse(fromStorage);
      if (parsed && parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    }
  } catch {
    // Ignore JSON errors
  }

  // Fallback to Vite env variables
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || (projectId ? `${projectId}.firebaseapp.com` : '');
  const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || (projectId ? `${projectId}.appspot.com` : '');
  const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '';
  const appId = import.meta.env.VITE_FIREBASE_APP_ID || '';

  if (apiKey && projectId) {
    return { apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId };
  }

  return null;
}

export function saveStoredFirebaseConfig(config: FirebaseConfigOptions | null) {
  if (!config) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }
}

let appInstance: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;

export function initFirebase(customConfig?: FirebaseConfigOptions): { app: FirebaseApp | null; db: Firestore | null; auth: Auth | null } {
  const config = customConfig || getStoredFirebaseConfig();

  if (!config || !config.apiKey || !config.projectId) {
    return { app: null, db: null, auth: null };
  }

  try {
    if (getApps().length === 0) {
      appInstance = initializeApp(config);
    } else {
      appInstance = getApp();
    }

    dbInstance = getFirestore(appInstance);
    authInstance = getAuth(appInstance);

    return { app: appInstance, db: dbInstance, auth: authInstance };
  } catch (error) {
    console.error('Error initializing Firebase SDK:', error);
    return { app: null, db: null, auth: null };
  }
}

// Initial attempt
initFirebase();

export function isFirebaseConfigured(): boolean {
  const config = getStoredFirebaseConfig();
  return Boolean(config && config.apiKey && config.projectId);
}

export function getDb(): Firestore | null {
  if (!dbInstance && isFirebaseConfigured()) {
    initFirebase();
  }
  return dbInstance;
}

export function getFirebaseAuth(): Auth | null {
  if (!authInstance && isFirebaseConfigured()) {
    initFirebase();
  }
  return authInstance;
}
