import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import {
  ParentDataProvider,
  useTasks,
  useReward,
  useCompletions,
  useAdhoc,
  usePoints,
  useDataSync,
} from './parentData';
import * as firestore from './firestore';
import { maybeMigrateLegacyUserCloud } from './legacyCloudMigration';
import type { UserMembership } from './family/types';
import type { AdhocTask } from '../types';

vi.mock('./firebase', () => ({
  isFirebaseConfigured: true,
  auth: {},
  db: {},
  app: {},
}));

const authState = vi.hoisted(() => ({
  user: { uid: 'test-uid', displayName: 'Test Parent' },
}));

vi.mock('./auth', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => ({
    user: authState.user,
    loading: false,
    configured: true,
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
  membership: {
    familyId: 'fam-1',
    activeChildId: '_default',
  } as UserMembership | null,
  loading: false,
}));

vi.mock('./family/useFamilyMembership', () => ({
  useFamilyMembership: () => ({
    membership: membershipState.membership,
    loading: membershipState.loading,
    refresh: vi.fn(),
  }),
}));

const FAMILY_MEMBERSHIP = { familyId: 'fam-1', activeChildId: '_default' as const };

const FAMILY_TASKS = 'families/fam-1/children/_default/tasks';

const FAMILY_COMPLETIONS = 'families/fam-1/children/_default/completions';

const FAMILY_ADHOC = 'families/fam-1/children/_default/adhoc';

const FAMILY_SETTINGS = 'families/fam-1/children/_default/meta/settings';

const DATE = '2026-01-05';

function mockAdhocSubscription(initial: AdhocTask[]) {
  let adhocOnData: (items: AdhocTask[]) => void = () => {};
  vi.spyOn(firestore, 'subscribeDoc').mockImplementation((_path, onData) => {
    onData(null);
    return vi.fn();
  });
  vi.spyOn(firestore, 'writeDoc').mockResolvedValue(undefined);
  vi.spyOn(firestore, 'writeSingleton').mockResolvedValue(undefined);
  vi.spyOn(firestore, 'removeDoc').mockResolvedValue(undefined);
  vi.spyOn(firestore, 'subscribeCollection').mockImplementation((path, onData) => {
    if (path === FAMILY_ADHOC) {
      adhocOnData = onData as typeof adhocOnData;
      onData(initial);
    } else {
      onData([]);
    }
    return vi.fn();
  });
  return {
    pushAdhoc(items: AdhocTask[]) {
      act(() => {
        adhocOnData(items);
      });
    },
  };
}

function wrapper({ children }: { children: ReactNode }) {
  return <ParentDataProvider>{children}</ParentDataProvider>;
}

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
  vi.spyOn(firestore, 'removeDoc').mockResolvedValue(undefined);
  vi.spyOn(firestore, 'writeSingleton').mockResolvedValue(undefined);
}

describe('useTasks cloud mode', () => {
  beforeEach(() => {
    membershipState.membership = { ...FAMILY_MEMBERSHIP };
    membershipState.loading = false;
    mockCloudSubscriptions();
  });

  it('creates a task via writeDoc when subscribed', async () => {
    const { result } = renderHook(() => useTasks(), { wrapper });

    await waitFor(() => expect(result.current.sync.ready).toBe(true));

    act(() => {
      result.current.create('刷牙');
    });

    await waitFor(() => expect(firestore.writeDoc).toHaveBeenCalled());
    expect(firestore.writeDoc).toHaveBeenCalledWith(
      FAMILY_TASKS,
      expect.any(String),
      expect.objectContaining({ title: '刷牙' }),
    );
  });
});

describe('parentData without membership', () => {
  beforeEach(() => {
    membershipState.membership = null;
    membershipState.loading = false;
    vi.spyOn(firestore, 'subscribeCollection');
    vi.spyOn(firestore, 'subscribeDoc');
  });

  it('does not subscribe to Firestore when logged in without membership', async () => {
    const { result } = renderHook(() => useTasks(), { wrapper });
    await waitFor(() => expect(result.current.sync.ready).toBe(true));
    expect(firestore.subscribeCollection).not.toHaveBeenCalled();
    expect(firestore.subscribeDoc).not.toHaveBeenCalled();
  });
});

describe('parentData membership loading', () => {
  beforeEach(() => {
    membershipState.membership = null;
    membershipState.loading = true;
    mockCloudSubscriptions();
  });

  it('keeps sync not ready while membership is loading', async () => {
    const { result } = renderHook(() => useDataSync(), { wrapper });
    expect(result.current.ready).toBe(false);
    expect(result.current.loading).toBe(true);
  });
});

describe('useReward cloud mode', () => {
  beforeEach(() => {
    membershipState.membership = { ...FAMILY_MEMBERSHIP };
    membershipState.loading = false;
    mockCloudSubscriptions();
  });

  it('returns default completion message when cloud settings doc is missing', async () => {
    const { result } = renderHook(() => useReward(), { wrapper });
    await waitFor(() => expect(result.current.sync.ready).toBe(true));
    expect(result.current.text).toBe('你今天好棒！');
  });
});

describe('useCompletions cloud mode', () => {
  beforeEach(() => {
    membershipState.membership = { ...FAMILY_MEMBERSHIP };
    membershipState.loading = false;
    mockCloudSubscriptions();
  });

  it('toggles only the requested date and does not carry over to another day', async () => {
    const { result, rerender } = renderHook(
      ({ dateStr }: { dateStr: string }) => useCompletions(dateStr),
      {
        wrapper,
        initialProps: { dateStr: '2026-01-05' },
      },
    );

    await waitFor(() => expect(result.current.sync.ready).toBe(true));

    act(() => result.current.toggle('task-a'));
    expect(result.current.completedIds.has('task-a')).toBe(true);

    rerender({ dateStr: '2026-01-06' });
    await waitFor(() => expect(result.current.sync.ready).toBe(true));
    expect(result.current.completedIds.has('task-a')).toBe(false);
  });

  it('reflects remote completion changes after initial sync', async () => {
    let completionsOnData: (items: unknown[]) => void = () => {};
    vi.spyOn(firestore, 'subscribeDoc').mockImplementation((_path, onData) => {
      onData(null);
      return vi.fn();
    });
    vi.spyOn(firestore, 'writeDoc').mockResolvedValue(undefined);
    vi.spyOn(firestore, 'writeSingleton').mockResolvedValue(undefined);
    vi.spyOn(firestore, 'removeDoc').mockResolvedValue(undefined);
    vi.spyOn(firestore, 'subscribeCollection').mockImplementation((path, onData) => {
      if (path === FAMILY_COMPLETIONS) {
        completionsOnData = onData as typeof completionsOnData;
      }
      onData([]);
      return vi.fn();
    });

    const { result } = renderHook(() => useCompletions(DATE), { wrapper });
    await waitFor(() => expect(result.current.sync.ready).toBe(true));
    expect(result.current.completedIds.has('task-a')).toBe(false);

    act(() => {
      completionsOnData([{ id: DATE, ids: ['task-a'] }]);
    });

    await waitFor(() =>
      expect(result.current.completedIds.has('task-a')).toBe(true),
    );
  });
});

describe('parentData adhoc cloud subscription updates', () => {
  beforeEach(() => {
    membershipState.membership = { ...FAMILY_MEMBERSHIP };
    membershipState.loading = false;
    window.localStorage.setItem(
      'kid-todolist:adhoc:v1',
      JSON.stringify([
        {
          id: 'local-1',
          title: '本機臨時',
          date: DATE,
          createdAt: 0,
        },
      ]),
    );
  });

  it('reflects a remote adhoc add after initial sync', async () => {
    const initial = [
      {
        id: 'local-1',
        title: '本機臨時',
        date: DATE,
        createdAt: 0,
      },
    ];
    const { pushAdhoc } = mockAdhocSubscription(initial);

    const { result } = renderHook(() => useAdhoc(DATE), { wrapper });
    await waitFor(() => expect(result.current.sync.ready).toBe(true));
    expect(result.current.adhocToday.map((item) => item.id)).toEqual(['local-1']);

    pushAdhoc([
      ...initial,
      {
        id: 'remote-1',
        title: '遠端新增',
        date: DATE,
        createdAt: 1,
      },
    ]);

    await waitFor(() =>
      expect(result.current.adhocToday.map((item) => item.id)).toEqual([
        'local-1',
        'remote-1',
      ]),
    );
  });

  it('reflects a remote adhoc delete after initial sync', async () => {
    window.localStorage.setItem(
      'kid-todolist:adhoc:v1',
      JSON.stringify([
        {
          id: 'local-1',
          title: '本機臨時',
          date: DATE,
          createdAt: 0,
        },
        {
          id: 'remote-1',
          title: '遠端新增',
          date: DATE,
          createdAt: 1,
        },
      ]),
    );

    const initial = [
      {
        id: 'local-1',
        title: '本機臨時',
        date: DATE,
        createdAt: 0,
      },
      {
        id: 'remote-1',
        title: '遠端新增',
        date: DATE,
        createdAt: 1,
      },
    ];
    const { pushAdhoc } = mockAdhocSubscription(initial);

    const { result } = renderHook(() => useAdhoc(DATE), { wrapper });
    await waitFor(() => expect(result.current.sync.ready).toBe(true));
    expect(result.current.adhocToday.map((item) => item.id)).toEqual([
      'local-1',
      'remote-1',
    ]);

    pushAdhoc([initial[0]]);

    await waitFor(() =>
      expect(result.current.adhocToday.map((item) => item.id)).toEqual(['local-1']),
    );
  });

  it('hydrates cloud adhoc on initial sync when local has tasks but empty adhoc', async () => {
    window.localStorage.setItem(
      'kid-todolist:tasks:v1',
      JSON.stringify([
        {
          id: 'local-task',
          title: '本機任務',
          weekdays: [0, 1, 2, 3, 4, 5, 6],
          createdAt: 0,
        },
      ]),
    );
    window.localStorage.setItem('kid-todolist:adhoc:v1', JSON.stringify([]));

    mockAdhocSubscription([
      {
        id: 'remote-1',
        title: '另一台裝置加的',
        date: DATE,
        createdAt: 1,
      },
    ]);

    const { result } = renderHook(() => useAdhoc(DATE), { wrapper });
    await waitFor(() => expect(result.current.sync.ready).toBe(true));
    expect(result.current.adhocToday.map((item) => item.id)).toEqual(['remote-1']);
  });

  it('hydrates cloud adhoc when adhoc snapshot arrives before initial sync completes', async () => {
    window.localStorage.setItem(
      'kid-todolist:tasks:v1',
      JSON.stringify([
        {
          id: 'local-task',
          title: '本機任務',
          weekdays: [0, 1, 2, 3, 4, 5, 6],
          createdAt: 0,
        },
      ]),
    );
    window.localStorage.setItem('kid-todolist:adhoc:v1', JSON.stringify([]));

    const cloudAdhoc: AdhocTask[] = [
      {
        id: 'remote-early',
        title: '早到的雲端臨時',
        date: DATE,
        createdAt: 1,
      },
    ];
    let tasksOnData: (items: unknown[]) => void = () => {};

    vi.spyOn(firestore, 'subscribeDoc').mockImplementation((_path, onData) => {
      onData(null);
      return vi.fn();
    });
    vi.spyOn(firestore, 'writeDoc').mockResolvedValue(undefined);
    vi.spyOn(firestore, 'writeSingleton').mockResolvedValue(undefined);
    vi.spyOn(firestore, 'removeDoc').mockResolvedValue(undefined);
    vi.spyOn(firestore, 'subscribeCollection').mockImplementation((path, onData) => {
      if (path === FAMILY_ADHOC) {
        onData(cloudAdhoc);
      } else if (path === FAMILY_TASKS) {
        tasksOnData = onData as typeof tasksOnData;
      } else {
        onData([]);
      }
      return vi.fn();
    });

    const { result } = renderHook(() => useAdhoc(DATE), { wrapper });
    await act(async () => {
      await Promise.resolve();
    });
    act(() => {
      tasksOnData([]);
    });
    await waitFor(() => expect(result.current.sync.ready).toBe(true));
    expect(result.current.adhocToday.map((item) => item.id)).toEqual(['remote-early']);
  });
});

describe('useAdhoc cloud mode', () => {
  beforeEach(() => {
    membershipState.membership = { ...FAMILY_MEMBERSHIP };
    membershipState.loading = false;
    vi.spyOn(firestore, 'subscribeDoc').mockImplementation((_path, onData) => {
      onData(null);
      return vi.fn();
    });
    vi.spyOn(firestore, 'writeDoc').mockResolvedValue(undefined);
    vi.spyOn(firestore, 'writeSingleton').mockResolvedValue(undefined);
    vi.spyOn(firestore, 'removeDoc').mockResolvedValue(undefined);
    vi.spyOn(firestore, 'subscribeCollection').mockImplementation((path, onData) => {
      if (path.includes('adhoc')) {
        onData([
          {
            id: '1',
            title: '今天的事',
            date: '2026-01-05',
            createdAt: 0,
          },
          {
            id: '2',
            title: '明天的事',
            date: '2026-01-06',
            createdAt: 0,
          },
        ]);
      } else {
        onData([]);
      }
      return vi.fn();
    });
  });

  it('returns only adhoc items for the requested date', async () => {
    const { result } = renderHook(() => useAdhoc('2026-01-05'), { wrapper });
    await waitFor(() => expect(result.current.sync.ready).toBe(true));
    expect(result.current.adhocToday.map((item) => item.title)).toEqual([
      '今天的事',
    ]);
  });
});

describe('usePoints cloud mode — scheduled toggle credits balance', () => {
  beforeEach(() => {
    membershipState.membership = { ...FAMILY_MEMBERSHIP };
    membershipState.loading = false;
    vi.spyOn(firestore, 'subscribeDoc').mockImplementation((_path, onData) => {
      onData({
        completionMessage: '棒',
        rewards: [
          {
            id: 'reward-a',
            title: '冰棒',
            cost: 3,
            createdAt: 0,
          },
        ],
        pointsBalance: 0,
      });
      return vi.fn();
    });
    vi.spyOn(firestore, 'writeDoc').mockResolvedValue(undefined);
    vi.spyOn(firestore, 'writeSingleton').mockResolvedValue(undefined);
    vi.spyOn(firestore, 'removeDoc').mockResolvedValue(undefined);
    vi.spyOn(firestore, 'subscribeCollection').mockImplementation((path, onData) => {
      if (path.includes('tasks')) {
        onData([
          {
            id: 'task-a',
            title: '刷牙',
            weekdays: [0, 1, 2, 3, 4, 5, 6],
            createdAt: 0,
            points: 3,
          },
        ]);
      } else {
        onData([]);
      }
      return vi.fn();
    });
  });

  it('credits balance when a scheduled task is completed', async () => {
    const { result } = renderHook(
      () => ({
        points: usePoints(),
        completions: useCompletions('2026-01-05'),
      }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.points.sync.ready).toBe(true));

    act(() => result.current.completions.toggle('task-a'));

    await waitFor(() => expect(result.current.points.balance).toBe(3));
    expect(firestore.writeSingleton).toHaveBeenCalledWith(
      FAMILY_SETTINGS,
      expect.objectContaining({ pointsBalance: 3 }),
    );
  });
});

describe('usePoints cloud mode — uncheck debits with floor', () => {
  beforeEach(() => {
    membershipState.membership = { ...FAMILY_MEMBERSHIP };
    membershipState.loading = false;
    vi.spyOn(firestore, 'subscribeDoc').mockImplementation((_path, onData) => {
      onData({
        completionMessage: '棒',
        rewards: [
          {
            id: 'reward-a',
            title: '冰棒',
            cost: 3,
            createdAt: 0,
          },
        ],
        pointsBalance: 1,
      });
      return vi.fn();
    });
    vi.spyOn(firestore, 'writeDoc').mockResolvedValue(undefined);
    vi.spyOn(firestore, 'writeSingleton').mockResolvedValue(undefined);
    vi.spyOn(firestore, 'removeDoc').mockResolvedValue(undefined);
    vi.spyOn(firestore, 'subscribeCollection').mockImplementation((path, onData) => {
      if (path.includes('tasks')) {
        onData([
          {
            id: 'task-a',
            title: '刷牙',
            weekdays: [0, 1, 2, 3, 4, 5, 6],
            createdAt: 0,
            points: 3,
          },
        ]);
      } else if (path.includes('completions')) {
        onData([{ id: '2026-01-05', ids: ['task-a'] }]);
      } else {
        onData([]);
      }
      return vi.fn();
    });
  });

  it('floors balance at zero when uncompleting costs more than balance', async () => {
    const { result } = renderHook(
      () => ({
        points: usePoints(),
        completions: useCompletions('2026-01-05'),
      }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.points.sync.ready).toBe(true));
    expect(result.current.points.balance).toBe(1);

    act(() => result.current.completions.toggle('task-a'));

    await waitFor(() => expect(result.current.points.balance).toBe(0));
  });
});

describe('usePoints cloud mode — adhoc toggle no points', () => {
  beforeEach(() => {
    membershipState.membership = { ...FAMILY_MEMBERSHIP };
    membershipState.loading = false;
    vi.spyOn(firestore, 'subscribeDoc').mockImplementation((_path, onData) => {
      onData({
        completionMessage: '棒',
        rewards: [{ id: 'r1', title: '貼紙', cost: 1, createdAt: 0 }],
        pointsBalance: 2,
      });
      return vi.fn();
    });
    vi.spyOn(firestore, 'writeDoc').mockResolvedValue(undefined);
    vi.spyOn(firestore, 'writeSingleton').mockResolvedValue(undefined);
    vi.spyOn(firestore, 'removeDoc').mockResolvedValue(undefined);
    vi.spyOn(firestore, 'subscribeCollection').mockImplementation((path, onData) => {
      if (path.includes('adhoc')) {
        onData([
          {
            id: 'adhoc-1',
            title: '臨時',
            date: '2026-01-05',
            createdAt: 0,
          },
        ]);
      } else {
        onData([]);
      }
      return vi.fn();
    });
  });

  it('does not change balance when toggling adhoc tasks', async () => {
    const { result } = renderHook(
      () => ({
        points: usePoints(),
        completions: useCompletions('2026-01-05'),
      }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.points.sync.ready).toBe(true));

    act(() => result.current.completions.toggle('adhoc-1'));

    await waitFor(() =>
      expect(result.current.completions.completedIds.has('adhoc-1')).toBe(true),
    );
    expect(result.current.points.balance).toBe(2);
    expect(firestore.writeSingleton).not.toHaveBeenCalled();
  });
});

describe('parentData cloud read error', () => {
  beforeEach(() => {
    membershipState.membership = { ...FAMILY_MEMBERSHIP };
    membershipState.loading = false;
    vi.spyOn(firestore, 'subscribeCollection').mockImplementation((_path, _onData, onError) => {
      onError?.(new Error('read failed'));
      return vi.fn();
    });
    vi.spyOn(firestore, 'subscribeDoc').mockImplementation((_path, onData) => {
      onData(null);
      return vi.fn();
    });
  });

  it('still becomes ready and surfaces read error while keeping local data usable', async () => {
    window.localStorage.setItem(
      'kid-todolist:tasks:v1',
      JSON.stringify([{ id: 'local-1', title: '本機任務', weekdays: [0], createdAt: 0 }]),
    );
    const { result } = renderHook(() => useTasks(), { wrapper });
    await waitFor(() => expect(result.current.sync.ready).toBe(true));
    expect(result.current.sync.error).toBeTruthy();
    expect(result.current.tasks.some((t) => t.title === '本機任務')).toBe(true);
  });
});

describe('parentData local-first push', () => {
  beforeEach(() => {
    membershipState.membership = { ...FAMILY_MEMBERSHIP };
    membershipState.loading = false;
    window.localStorage.setItem(
      'kid-todolist:tasks:v1',
      JSON.stringify([{ id: 'local-1', title: '本機任務', weekdays: [0], createdAt: 0 }]),
    );
    mockCloudSubscriptions();
    vi.spyOn(firestore, 'writeDoc').mockResolvedValue(undefined);
    vi.spyOn(firestore, 'writeSingleton').mockResolvedValue(undefined);
  });

  it('pushes local snapshot to family cloud when cloud is empty', async () => {
    const { result } = renderHook(() => useTasks(), { wrapper });
    await waitFor(() => expect(result.current.sync.ready).toBe(true));
    await waitFor(() => expect(firestore.writeDoc).toHaveBeenCalled());
    expect(firestore.writeDoc).toHaveBeenCalledWith(
      FAMILY_TASKS,
      'local-1',
      expect.objectContaining({ title: '本機任務' }),
      expect.anything(),
    );
  });

  it('pulls cloud data instead of pushing stale local data when cloud is not empty', async () => {
    window.localStorage.setItem(
      'kid-todolist:tasks:v1',
      JSON.stringify([{ id: 'local-1', title: '本機任務', weekdays: [0], createdAt: 0 }]),
    );
    vi.spyOn(firestore, 'writeDoc').mockClear();
    vi.spyOn(firestore, 'subscribeCollection').mockImplementation((path, onData) => {
      if (path === FAMILY_TASKS) {
        onData([
          {
            id: 'cloud-1',
            title: '雲端任務',
            weekdays: [0],
            createdAt: 1,
          },
        ]);
      } else {
        onData([]);
      }
      return vi.fn();
    });

    const { result } = renderHook(() => useTasks(), { wrapper });
    await waitFor(() => expect(result.current.sync.ready).toBe(true));

    expect(result.current.tasks.map((task) => task.title)).toEqual(['雲端任務']);
    expect(firestore.writeDoc).not.toHaveBeenCalledWith(
      FAMILY_TASKS,
      'local-1',
      expect.anything(),
      expect.anything(),
    );
  });
});

describe('parentData legacy migration before subscribe', () => {
  beforeEach(() => {
    membershipState.membership = { ...FAMILY_MEMBERSHIP };
    membershipState.loading = false;
    window.localStorage.clear();
    vi.mocked(maybeMigrateLegacyUserCloud).mockResolvedValue(undefined);
    vi.spyOn(firestore, 'subscribeDoc').mockImplementation((_path, onData) => {
      onData(null);
      return vi.fn();
    });
    vi.spyOn(firestore, 'subscribeCollection').mockImplementation((path, onData) => {
      if (path === FAMILY_TASKS) {
        onData([
          {
            id: 'migrated-1',
            title: '遷移任務',
            weekdays: [0],
            createdAt: 0,
          },
        ]);
      } else {
        onData([]);
      }
      return vi.fn();
    });
  });

  it('waits for legacy migration before subscribing and hydrates migrated tasks', async () => {
    let resolveMigration!: () => void;
    const migrationPromise = new Promise<void>((resolve) => {
      resolveMigration = resolve;
    });
    vi.mocked(maybeMigrateLegacyUserCloud).mockReturnValue(migrationPromise);

    const { result } = renderHook(() => useTasks(), { wrapper });

    expect(firestore.subscribeCollection).not.toHaveBeenCalled();
    expect(firestore.subscribeDoc).not.toHaveBeenCalled();

    await act(async () => {
      resolveMigration();
      await migrationPromise;
    });

    await waitFor(() => expect(result.current.sync.ready).toBe(true));
    expect(maybeMigrateLegacyUserCloud).toHaveBeenCalledWith(
      'test-uid',
      FAMILY_MEMBERSHIP,
    );
    expect(result.current.tasks.some((t) => t.title === '遷移任務')).toBe(true);
  });
});

describe('parentData pull from empty local', () => {
  beforeEach(() => {
    membershipState.membership = { ...FAMILY_MEMBERSHIP };
    membershipState.loading = false;
    window.localStorage.clear();
    vi.spyOn(firestore, 'subscribeDoc').mockImplementation((_path, onData) => {
      onData(null);
      return vi.fn();
    });
    vi.spyOn(firestore, 'subscribeCollection').mockImplementation((path, onData) => {
      if (path === FAMILY_TASKS) {
        onData([
          {
            id: 'cloud-1',
            title: '雲端任務',
            weekdays: [0],
            createdAt: 0,
          },
        ]);
      } else {
        onData([]);
      }
      return vi.fn();
    });
  });

  it('hydrates local tasks from family cloud when local is empty', async () => {
    const { result } = renderHook(() => useTasks(), { wrapper });
    await waitFor(() => expect(result.current.sync.ready).toBe(true));
    expect(result.current.tasks.some((t) => t.title === '雲端任務')).toBe(true);
  });

  it('hydrates local adhoc from family cloud when local is empty', async () => {
    vi.spyOn(firestore, 'subscribeCollection').mockImplementation((path, onData) => {
      if (path === FAMILY_TASKS) {
        onData([]);
      } else if (path === FAMILY_ADHOC) {
        onData([
          {
            id: 'cloud-adhoc',
            title: '雲端臨時',
            date: DATE,
            createdAt: 0,
          },
        ]);
      } else {
        onData([]);
      }
      return vi.fn();
    });

    const { result } = renderHook(() => useAdhoc(DATE), { wrapper });
    await waitFor(() => expect(result.current.sync.ready).toBe(true));
    expect(result.current.adhocToday.map((item) => item.id)).toEqual(['cloud-adhoc']);
  });
});
