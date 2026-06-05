import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { ParentDataProvider, useTasks } from './parentData';
import * as firestore from './firestore';

vi.mock('./firebase', () => ({
  isFirebaseConfigured: false,
  auth: {},
  db: {},
  app: {},
}));

vi.mock('./auth', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => ({
    user: null,
    loading: false,
    configured: false,
    isGuest: false,
    continueAsGuest: vi.fn(),
    signInWithGoogle: vi.fn(),
    signOutUser: vi.fn(),
  }),
}));

vi.mock('./family/useFamilyMembership', () => ({
  useFamilyMembership: () => ({
    membership: null,
    loading: false,
    refresh: vi.fn(),
  }),
}));

describe('hooks local fallback', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.spyOn(firestore, 'subscribeCollection');
    vi.spyOn(firestore, 'subscribeDoc');
  });

  it('uses localStorage when Firebase is not configured', async () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ParentDataProvider>{children}</ParentDataProvider>
    );
    const { result } = renderHook(() => useTasks(), { wrapper });

    await waitFor(() => expect(result.current.sync.ready).toBe(true));
    expect(firestore.subscribeCollection).not.toHaveBeenCalled();
    expect(firestore.subscribeDoc).not.toHaveBeenCalled();

    act(() => result.current.create('本機任務'));
    expect(result.current.tasks.some((t) => t.title === '本機任務')).toBe(true);
  });
});
