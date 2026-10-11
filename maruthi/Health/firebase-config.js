/**
 * HealthContinuum AI — Firebase Configuration Module
 * Loads project credentials from firebase-config.json or window.FIREBASE_CONFIG
 * and initializes Authentication, Cloud Firestore, and Firebase Storage.
 */

'use strict';

const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyABKXZ2pjyASYsFr4Y79tPU0xzzJsmXvXQ",
  authDomain: "healthcontinum-ai.firebaseapp.com",
  projectId: "healthcontinum-ai",
  storageBucket: "healthcontinum-ai.firebasestorage.app",
  messagingSenderId: "1068567388079",
  appId: "1:1068567388079:web:788fe5327aac790d18995a",
  measurementId: "G-7J92NF93QE"
};

let firebaseApp = null;
let firebaseAuth = null;
let firestoreDb = null;
let firebaseStorage = null;
let firebaseAnalytics = null;
let isConfigured = false;

function isPlaceholder(value) {
  return !value || typeof value !== 'string' || value.includes('YOUR_') || value.trim() === '';
}

function checkFirebaseConfiguration(config) {
  if (!config) return false;
  return !isPlaceholder(config.apiKey) && !isPlaceholder(config.projectId);
}

async function loadFirebaseConfig() {
  // 1. Check window.FIREBASE_CONFIG
  if (window.FIREBASE_CONFIG && checkFirebaseConfiguration(window.FIREBASE_CONFIG)) {
    return window.FIREBASE_CONFIG;
  }

  // 2. Try fetching from firebase-config.json
  try {
    const res = await fetch('/firebase-config.json');
    if (res.ok) {
      const config = await res.json();
      if (checkFirebaseConfiguration(config)) {
        return config;
      }
    }
  } catch (err) {
    console.debug('[Firebase] firebase-config.json not loaded yet:', err.message);
  }

  return DEFAULT_FIREBASE_CONFIG;
}

async function initFirebase() {
  if (typeof firebase === 'undefined') {
    console.warn('[Firebase] Firebase SDK scripts not loaded yet.');
    return { app: null, auth: null, db: null, storage: null, isConfigured: false };
  }

  const config = await loadFirebaseConfig();
  isConfigured = checkFirebaseConfiguration(config);

  if (!isConfigured) {
    console.info('[Firebase] Config is pending user credentials. To connect, update firebase-config.json with your Firebase Console Web App keys.');
    return { app: null, auth: null, db: null, storage: null, isConfigured: false };
  }

  try {
    if (!firebase.apps.length) {
      firebaseApp = firebase.initializeApp(config);
    } else {
      firebaseApp = firebase.app();
    }

    firebaseAuth = firebase.auth();
    firestoreDb = firebase.firestore();
    firebaseStorage = firebase.storage();

    // Enable Analytics if available in current environment
    if (typeof firebase.analytics === 'function' && config.measurementId) {
      try {
        firebaseAnalytics = firebase.analytics();
      } catch (err) {
        console.debug('[Firebase] Analytics not active:', err.message);
      }
    }

    // Enable offline persistence in Firestore
    try {
      firestoreDb.enablePersistence({ synchronizeTabs: true }).catch((err) => {
        if (err.code === 'failed-precondition') {
          console.debug('[Firebase] Multiple tabs open, persistence active in first tab');
        } else if (err.code === 'unimplemented') {
          console.debug('[Firebase] Browser does not support persistence');
        }
      });
    } catch (e) {}

    console.info('[Firebase] Connected successfully to project:', config.projectId);
  } catch (err) {
    console.error('[Firebase] Initialization error:', err);
    isConfigured = false;
  }

  return {
    app: firebaseApp,
    auth: firebaseAuth,
    db: firestoreDb,
    storage: firebaseStorage,
    analytics: firebaseAnalytics,
    isConfigured
  };
}

// Export to window
window.FirebaseConfig = {
  initFirebase,
  getApp: () => firebaseApp,
  getAuth: () => firebaseAuth,
  getDb: () => firestoreDb,
  getStorage: () => firebaseStorage,
  getAnalytics: () => firebaseAnalytics,
  isConfigured: () => isConfigured
};
