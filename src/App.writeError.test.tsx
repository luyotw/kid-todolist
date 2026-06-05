import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

const { writeDoc } = vi.hoisted(() => ({
  writeDoc: vi.fn().mockRejectedValue(new Error('network')),
}));

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
  writeDoc,
  writeSingleton: vi.fn().mockResolvedValue(undefined),
  removeDoc: vi.fn().mockResolvedValue(undefined),
}));

describe('App write-error banner', () => {
  it('shows alert when cloud write fails', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('navigation', { name: '主要導覽' });

    await user.click(screen.getByRole('button', { name: '任務' }));
    await user.type(screen.getByLabelText('新任務'), '刷牙');
    await user.click(screen.getByRole('button', { name: '加' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/儲存失敗/);
    });
  });
});
