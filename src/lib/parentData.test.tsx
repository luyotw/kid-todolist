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
} from './parentData';
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
      'users/test-uid/tasks',
      expect.any(String),
      expect.objectContaining({ title: '刷牙' }),
    );
  });
});

describe('useReward cloud mode', () => {
  beforeEach(() => {
    mockCloudSubscriptions();
  });

  it('returns default reward when cloud settings doc is missing', async () => {
    const { result } = renderHook(() => useReward(), { wrapper });
    await waitFor(() => expect(result.current.sync.ready).toBe(true));
    expect(result.current.text).toBe('你今天好棒！');
  });
});

describe('useCompletions cloud mode', () => {
  beforeEach(() => {
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
});

describe('useAdhoc cloud mode', () => {
  beforeEach(() => {
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
    vi.spyOn(firestore, 'subscribeDoc').mockImplementation((_path, onData) => {
      onData({
        rewardText: '棒',
        rewardCost: 3,
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
      'users/test-uid/meta/settings',
      expect.objectContaining({ pointsBalance: 3 }),
    );
  });
});

describe('usePoints cloud mode — uncheck debits with floor', () => {
  beforeEach(() => {
    vi.spyOn(firestore, 'subscribeDoc').mockImplementation((_path, onData) => {
      onData({
        rewardText: '棒',
        rewardCost: 1,
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
    vi.spyOn(firestore, 'subscribeDoc').mockImplementation((_path, onData) => {
      onData({ rewardText: '棒', rewardCost: 1, pointsBalance: 2 });
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
