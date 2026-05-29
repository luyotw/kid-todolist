import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { ParentDataProvider, useTasks, useReward } from './parentData';
import * as firestore from './firestore';

vi.mock('./firebase', () => ({
  isFirebaseConfigured: true,
  auth: {},
  db: {},
  app: {},
}));

vi.mock('./auth', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => ({
    user: { uid: 'test-uid', displayName: 'Test Parent' },
    loading: false,
    configured: true,
    signInWithGoogle: vi.fn(),
    signOutUser: vi.fn(),
  }),
}));

function wrapper({ children }: { children: ReactNode }) {
  return <ParentDataProvider>{children}</ParentDataProvider>;
}

describe('useTasks cloud mode', () => {
  beforeEach(() => {
    vi.spyOn(firestore, 'subscribeCollection').mockImplementation((_path, onData) => {
      onData([]);
      return vi.fn();
    });
    vi.spyOn(firestore, 'subscribeDoc').mockImplementation((_path, onData) => {
      onData(null);
      return vi.fn();
    });
    vi.spyOn(firestore, 'writeDoc').mockResolvedValue(undefined);
    vi.spyOn(firestore, 'removeDoc').mockResolvedValue(undefined);
    vi.spyOn(firestore, 'writeSingleton').mockResolvedValue(undefined);
  });

  it('creates a task via writeDoc when subscribed', async () => {
    const { result } = renderHook(() => useTasks(), { wrapper });

    await waitFor(() => expect(result.current.sync.ready).toBe(true));

    act(() => {
      result.current.create('刷牙');
    });

    await waitFor(() => expect(firestore.writeDoc).toHaveBeenCalled());
    expect(firestore.writeDoc).toHaveBeenCalledWith(
      'users/test-uid/tasks',
      expect.any(String),
      expect.objectContaining({ title: '刷牙' }),
    );
  });
});

describe('useReward cloud mode', () => {
  beforeEach(() => {
    vi.spyOn(firestore, 'subscribeCollection').mockImplementation((_path, onData) => {
      onData([]);
      return vi.fn();
    });
    vi.spyOn(firestore, 'subscribeDoc').mockImplementation((_path, onData) => {
      onData(null);
      return vi.fn();
    });
    vi.spyOn(firestore, 'writeSingleton').mockResolvedValue(undefined);
  });

  it('returns default reward when cloud settings doc is missing', async () => {
    const { result } = renderHook(() => useReward(), { wrapper });
    await waitFor(() => expect(result.current.sync.ready).toBe(true));
    expect(result.current.text).toBe('你今天好棒！');
  });
});
