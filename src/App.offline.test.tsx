import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('./lib/firebase', () => ({
  isFirebaseConfigured: true,
  auth: {},
  db: {},
  app: {},
}));

const authUser = { uid: 'u1', displayName: '家長' };
const familyMembership = { familyId: 'fam-1', activeChildId: '_default' };

vi.mock('./lib/auth', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    user: authUser,
    loading: false,
    configured: true,
    isGuest: false,
    continueAsGuest: vi.fn(),
    signInWithGoogle: vi.fn(),
    signOutUser: vi.fn(),
  }),
}));

vi.mock('./lib/family/useFamilyMembership', () => ({
  FamilyMembershipProvider: ({ children }: { children: React.ReactNode }) => children,
  useFamilyMembership: () => ({
    membership: familyMembership,
    loading: false,
    refresh: vi.fn(),
  }),
}));

vi.mock('./lib/legacyCloudMigration', () => ({
  maybeMigrateLegacyUserCloud: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./lib/firestore', () => ({
  paths: {
    tasks: (uid: string) => `users/${uid}/tasks`,
    adhoc: (uid: string) => `users/${uid}/adhoc`,
    completions: (uid: string) => `users/${uid}/completions`,
    settings: (uid: string) => `users/${uid}/meta/settings`,
    family: {
      tasks: (familyId: string) => `families/${familyId}/children/_default/tasks`,
      completions: (familyId: string) =>
        `families/${familyId}/children/_default/completions`,
      adhoc: (familyId: string) => `families/${familyId}/children/_default/adhoc`,
      settings: (familyId: string) =>
        `families/${familyId}/children/_default/meta/settings`,
    },
  },
  subscribeCollection: (_path: string, onData: (items: unknown[]) => void) => {
    onData([]);
    return vi.fn();
  },
  subscribeDoc: (_path: string, onData: (data: unknown) => void) => {
    onData(null);
    return vi.fn();
  },
  writeDoc: vi.fn().mockResolvedValue(undefined),
  writeSingleton: vi.fn().mockResolvedValue(undefined),
  removeDoc: vi.fn().mockResolvedValue(undefined),
}));

describe('App offline banner', () => {
  beforeEach(() => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: false,
    });
  });

  it('shows offline status when navigator is offline', async () => {
    render(<App />);
    expect(await screen.findByRole('status')).toHaveTextContent(/目前離線/);
  });

  it('shows main navigation while logged in and offline', async () => {
    render(<App />);
    expect(await screen.findByRole('navigation', { name: '主要導覽' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '今天' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '任務' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '設定' })).toBeInTheDocument();
  });
});
