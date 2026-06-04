import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { auth, isFirebaseConfigured, isUsingFirebaseEmulators } from './firebase';
import { storage } from './storage';

const DEV_PARENT_EMAIL = 'parent@local.test';
const DEV_PARENT_PASSWORD = 'local-dev';
export const GUEST_SESSION_KEY = 'kid-todolist:guest-session:v1';

function readGuestSession(): boolean {
  return storage.get<boolean>(GUEST_SESSION_KEY, false);
}

interface AuthState {
  user: User | null;
  loading: boolean;
  configured: boolean;
  usingEmulators: boolean;
  isGuest: boolean;
  continueAsGuest: () => void;
  signInWithGoogle: () => Promise<void>;
  signInForLocalDev: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(isFirebaseConfigured);
  const [isGuest, setIsGuest] = useState<boolean>(() => readGuestSession());

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return onAuthStateChanged(auth, (next) => {
      setUser(next);
      if (next) {
        storage.remove(GUEST_SESSION_KEY);
        setIsGuest(false);
      }
      setLoading(false);
    });
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      configured: isFirebaseConfigured,
      usingEmulators: isUsingFirebaseEmulators,
      isGuest,
      continueAsGuest() {
        storage.set(GUEST_SESSION_KEY, true);
        setIsGuest(true);
      },
      async signInWithGoogle() {
        await signInWithPopup(auth, new GoogleAuthProvider());
      },
      async signInForLocalDev() {
        if (!isUsingFirebaseEmulators) {
          throw new Error('signInForLocalDev is only available with Firebase emulators');
        }
        try {
          await signInWithEmailAndPassword(
            auth,
            DEV_PARENT_EMAIL,
            DEV_PARENT_PASSWORD,
          );
        } catch (err: unknown) {
          const code =
            err && typeof err === 'object' && 'code' in err
              ? String((err as { code: string }).code)
              : '';
          if (
            code === 'auth/user-not-found' ||
            code === 'auth/invalid-credential'
          ) {
            await createUserWithEmailAndPassword(
              auth,
              DEV_PARENT_EMAIL,
              DEV_PARENT_PASSWORD,
            );
            return;
          }
          throw err;
        }
      },
      async signOutUser() {
        storage.remove(GUEST_SESSION_KEY);
        setIsGuest(false);
        if (user) {
          await signOut(auth);
        }
      },
    }),
    [user, loading, isGuest],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
