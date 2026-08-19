import { initializeApp, getApps, getApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import type { Auth } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';
import type { Functions } from 'firebase/functions';

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
  // 1. Check Vite env variables FIRST
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || (projectId ? `${projectId}.firebaseapp.com` : '');
  const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || (projectId ? `${projectId}.firebasestorage.app` : (projectId ? `${projectId}.appspot.com` : ''));
  const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '';
  const appId = import.meta.env.VITE_FIREBASE_APP_ID || '';

  if (apiKey && projectId) {
    return { apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId };
  }

  // 2. Check localStorage for manual override if env was not provided
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
let functionsInstance: Functions | null = null;

export function initFirebase(customConfig?: FirebaseConfigOptions): {
  app: FirebaseApp | null;
  db: Firestore | null;
  auth: Auth | null;
  functions: Functions | null;
} {
  const config = customConfig || getStoredFirebaseConfig();

  if (!config || !config.apiKey || !config.projectId) {
    return { app: null, db: null, auth: null, functions: null };
  }

  try {
    if (getApps().length === 0) {
      appInstance = initializeApp(config);
    } else {
      appInstance = getApp();
    }

    dbInstance = getFirestore(appInstance);
    authInstance = getAuth(appInstance);
    functionsInstance = getFunctions(appInstance);

    return {
      app: appInstance,
      db: dbInstance,
      auth: authInstance,
      functions: functionsInstance,
    };
  } catch (error) {
    console.error('Error initializing Firebase SDK:', error);
    return { app: null, db: null, auth: null, functions: null };
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

export function getFirebaseFunctions(): Functions | null {
  if (!functionsInstance && isFirebaseConfigured()) {
    initFirebase();
  }
  return functionsInstance;
}
