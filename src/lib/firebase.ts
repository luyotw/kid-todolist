import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Until a real project is wired up via `.env.local`, the app runs in an
// "unconfigured" state: the UI shows a setup notice instead of crashing.
export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId);

export const app: FirebaseApp = getApps().length
  ? getApp()
  : initializeApp(config);

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
