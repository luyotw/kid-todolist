import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import {
  ParentDataProvider,
  useTaskOrder,
  useTasks,
} from './parentData';
import * as firestore from './firestore';
import { maybeMigrateLegacyUserCloud } from './legacyCloudMigration';
import type { UserMembership } from './family/types';
import { SETTINGS_KEY } from './settings';
import { storage } from './storage';

const FAMILY_SETTINGS = 'families/fam-1/children/_default/meta/settings';

vi.mock('./firebase', () => ({
  isFirebaseConfigured: true,
  auth: {},
  db: {},
  app: {},
}));

const authState = vi.hoisted(() => ({
  user: null as { uid: string } | null,
}));

vi.mock('./auth', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => ({
    user: authState.user,
    loading: false,
    configured: Boolean(authState.user),
    isGuest: false,
    continueAsGuest: vi.fn(),
    signInWithGoogle: vi.fn(),
    signOutUser: vi.fn(),
  }),
}));

vi.mock('./legacyCloudMigration', () => ({
  maybeMigrateLegacyUserCloud: vi.fn().mockResolvedValue(undefined),
}));

const membershipState = vi.hoisted(() => ({
  membership: null as UserMembership | null,
  loading: false,
}));

vi.mock('./family/useFamilyMembership', () => ({
  useFamilyMembership: () => ({
    membership: membershipState.membership,
    loading: membershipState.loading,
    refresh: vi.fn(),
  }),
}));

function mockCloudSubscriptions() {
  vi.spyOn(firestore, 'subscribeCollection').mockImplementation((_path, onData) => {
    onData([]);
    return vi.fn();
  });
  vi.spyOn(firestore, 'subscribeDoc').mockImplementation((_path, onData) => {
    onData(null);
    return vi.fn();
  });
  vi.spyOn(firestore, 'writeDoc').mockResolvedValue(undefined);
  vi.spyOn(firestore, 'writeSingleton').mockResolvedValue(undefined);
  vi.spyOn(firestore, 'removeDoc').mockResolvedValue(undefined);
}

function wrapper({ children }: { children: ReactNode }) {
  return <ParentDataProvider>{children}</ParentDataProvider>;
}

describe('task order guest persistence', () => {
  beforeEach(() => {
    authState.user = null;
    membershipState.membership = null;
    membershipState.loading = false;
    window.localStorage.clear();
    vi.restoreAllMocks();
    mockCloudSubscriptions();
  });

  it('persists global reorder in local settings', async () => {
    const { result } = renderHook(
      () => ({
        tasks: useTasks(),
        order: useTaskOrder('2026-01-05'),
      }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.tasks.sync.ready).toBe(true));

    act(() => result.current.tasks.create('刷牙'));
    act(() => result.current.tasks.create('寫功課'));
    const ids = result.current.tasks.tasks.map((t) => t.id);

    act(() => result.current.tasks.reorder([ids[1]!, ids[0]!]));
    expect(result.current.tasks.tasks.map((t) => t.title)).toEqual([
      '寫功課',
      '刷牙',
    ]);

    const stored = storage.get<{ taskOrder?: string[] }>(SETTINGS_KEY, {});
    expect(stored.taskOrder).toEqual([ids[1], ids[0]]);
  });

  it('persists today override and restore clears it', async () => {
    const { result } = renderHook(
      () => ({
        tasks: useTasks(),
        order: useTaskOrder('2026-01-05'),
      }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.tasks.sync.ready).toBe(true));

    act(() => result.current.tasks.create('刷牙'));
    const taskId = result.current.tasks.tasks[0]!.id;

    act(() =>
      result.current.order.reorderToday([
        { source: 'task', id: taskId },
      ]),
    );
    expect(result.current.order.hasOverride).toBe(true);

    const stored = storage.get<{ dayOrders?: Record<string, unknown[]> }>(
      SETTINGS_KEY,
      {},
    );
    expect(stored.dayOrders?.['2026-01-05']).toEqual([
      { source: 'task', id: taskId },
    ]);

    act(() => result.current.order.restoreDefaultTodayOrder());
    expect(result.current.order.hasOverride).toBe(false);
    expect(
      storage.get<{ dayOrders?: Record<string, unknown[]> }>(SETTINGS_KEY, {})
        .dayOrders?.['2026-01-05'],
    ).toBeUndefined();
  });

  it('persists extra override separately from today', async () => {
    const { result } = renderHook(
      () => ({
        tasks: useTasks(),
        todayOrder: useTaskOrder('2026-01-05', 'today'),
        extraOrder: useTaskOrder('2026-01-05', 'extra'),
      }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.tasks.sync.ready).toBe(true));

    act(() => result.current.tasks.create('刷牙'));
    const taskId = result.current.tasks.tasks[0]!.id;

    act(() =>
      result.current.extraOrder.reorderToday([{ source: 'task', id: taskId }]),
    );

    const stored = storage.get<{
      dayOrders?: Record<string, unknown[]>;
      extraDayOrders?: Record<string, unknown[]>;
    }>(SETTINGS_KEY, {});
    expect(stored.extraDayOrders?.['2026-01-05']).toEqual([
      { source: 'task', id: taskId },
    ]);
    expect(stored.dayOrders?.['2026-01-05']).toBeUndefined();
    expect(result.current.todayOrder.hasOverride).toBe(false);
    expect(result.current.extraOrder.hasOverride).toBe(true);
  });
});

describe('task order cloud sync', () => {
  beforeEach(() => {
    authState.user = { uid: 'test-uid' };
    membershipState.membership = { familyId: 'fam-1', activeChildId: '_default' };
    membershipState.loading = false;
    window.localStorage.clear();
    vi.restoreAllMocks();
    mockCloudSubscriptions();
    vi.mocked(maybeMigrateLegacyUserCloud).mockResolvedValue(undefined);
  });

  it('writes taskOrder to settings singleton in cloud mode', async () => {
    const { result } = renderHook(() => useTasks(), { wrapper });

    await waitFor(() => expect(result.current.sync.ready).toBe(true));

    act(() => result.current.create('刷牙'));
    act(() => result.current.create('寫功課'));
    const ids = result.current.tasks.map((t) => t.id);

    vi.mocked(firestore.writeSingleton).mockClear();
    act(() => result.current.reorder([ids[1]!, ids[0]!]));

    expect(firestore.writeSingleton).toHaveBeenCalledWith(
      FAMILY_SETTINGS,
      expect.objectContaining({ taskOrder: [ids[1], ids[0]] }),
    );
  });

  it('reflects remote settings order changes after initial sync', async () => {
    let settingsOnData: (data: unknown) => void = () => {};
    vi.spyOn(firestore, 'subscribeCollection').mockImplementation((_path, onData) => {
      onData([]);
      return vi.fn();
    });
    vi.spyOn(firestore, 'subscribeDoc').mockImplementation((_path, onData) => {
      settingsOnData = onData as typeof settingsOnData;
      onData(null);
      return vi.fn();
    });

    const { result } = renderHook(() => useTaskOrder('2026-01-05'), {
      wrapper,
    });

    await waitFor(() => expect(result.current.taskOrder).toEqual([]));

    act(() => {
      settingsOnData({
        completionMessage: '棒',
        rewards: [],
        pointsBalance: 0,
        taskOrder: ['task-b', 'task-a'],
        dayOrders: {
          '2026-01-05': [{ source: 'task', id: 'task-b' }],
        },
      });
    });

    await waitFor(() =>
      expect(result.current.taskOrder).toEqual(['task-b', 'task-a']),
    );
    expect(result.current.dayOrders['2026-01-05']).toEqual([
      { source: 'task', id: 'task-b' },
    ]);
  });
});
