import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  enableIndexedDbPersistence,
  getFirestore,
  type Firestore,
} from 'firebase/firestore';

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

/** True when Vite dev server runs with `--mode emulator` (see npm run dev:local). */
export const isUsingFirebaseEmulators =
  import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';

export const app: FirebaseApp = getApps().length
  ? getApp()
  : initializeApp(config);

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);

if (isUsingFirebaseEmulators && typeof window !== 'undefined') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}

if (isFirebaseConfigured && typeof window !== 'undefined' && !isUsingFirebaseEmulators) {
  void enableIndexedDbPersistence(db).catch(() => {
    // Another tab may already hold persistence; offline cache still works there.
  });
}
