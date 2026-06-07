import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { AdhocTask, Task } from '../types';
import { useAuth } from './auth';
import {
  isLocalSnapshotEmpty,
  loadingSync,
  mergeSyncMeta,
  pushSnapshotToPaths,
  readySync,
  runCloudWrite,
  useOnlineStatus,
  type CloudSyncMeta,
  type LocalParentSnapshot,
} from './cloudSync';
import { resolveCloudSyncTarget } from './cloudSyncTarget';
import { useFamilyMembership } from './family/useFamilyMembership';
import { maybeMigrateLegacyUserCloud } from './legacyCloudMigration';
import {
  removeDoc,
  subscribeCollection,
  subscribeDoc,
  writeDoc,
  writeSingleton,
} from './firestore';
import { firestoreReadError } from './firestoreErrors';
import { getAdhocFor } from './adhoc';
import {
  createAdhoc as createAdhocPure,
  deleteAdhoc as deleteAdhocPure,
} from './adhoc';
import {
  createTask as createTaskPure,
  deleteTask as deleteTaskPure,
  updateTask as updateTaskPure,
} from './tasks';
import {
  appendAdhocToDayOrderIfOverride,
  appendTaskToGlobalOrder,
  clearDayOrder,
  hasDayOverride,
  removeTaskFromOrders,
  setDayOrder,
  sortTasksByGlobalOrder,
  type DayOrders,
  type OrderedItemKey,
} from './taskOrder';
import { storage } from './storage';
import {
  createReward as createRewardPure,
  deleteReward as deleteRewardPure,
  findReward,
  updateReward as updateRewardPure,
} from './rewards';
import {
  DEFAULT_COMPLETION_MESSAGE,
  type ParentSettings,
  type RewardItem,
  loadLocalSettings,
  normalizeSettings,
  saveLocalSettings,
} from './settings';
import {
  applyCompletionDelta,
  applyRedemption,
  getTaskPoints,
  isScheduledTaskId,
  type RedemptionResult,
} from './points';

export { DEFAULT_COMPLETION_MESSAGE, DEFAULT_COMPLETION_MESSAGE as DEFAULT_REWARD };

const TASKS_KEY = 'kid-todolist:tasks:v1';
const COMPLETIONS_KEY = 'kid-todolist:completions:v1';
const ADHOC_KEY = 'kid-todolist:adhoc:v1';

type StoredCompletions = Record<string, string[]>;

interface CompletionDay {
  id: string;
  ids?: string[];
}

interface SettingsDoc {
  completionMessage?: string;
  rewards?: RewardItem[];
  pointsBalance?: number;
  rewardText?: string;
  rewardCost?: number;
  taskOrder?: string[];
  dayOrders?: DayOrders;
}

function settingsFromDoc(data: SettingsDoc | null): ParentSettings {
  if (!data) return normalizeSettings(null);
  return normalizeSettings({
    completionMessage: data.completionMessage,
    rewards: data.rewards,
    pointsBalance: data.pointsBalance,
    rewardText: data.rewardText,
    rewardCost: data.rewardCost,
    taskOrder: data.taskOrder,
    dayOrders: data.dayOrders,
  });
}

function settingsToDoc(settings: ParentSettings): SettingsDoc {
  return {
    completionMessage: settings.completionMessage,
    rewards: settings.rewards,
    pointsBalance: settings.pointsBalance,
    ...(settings.taskOrder ? { taskOrder: settings.taskOrder } : {}),
    ...(settings.dayOrders ? { dayOrders: settings.dayOrders } : {}),
  };
}

function taskToFirestore(task: Task) {
  return {
    title: task.title,
    weekdays: task.weekdays,
    createdAt: task.createdAt,
    ...(task.points !== undefined ? { points: task.points } : {}),
  };
}

function readLocalSnapshot(): LocalParentSnapshot {
  return {
    tasks: storage.get<Task[]>(TASKS_KEY, []),
    completions: storage.get<StoredCompletions>(COMPLETIONS_KEY, {}),
    adhoc: storage.get<AdhocTask[]>(ADHOC_KEY, []),
    settings: loadLocalSettings(),
  };
}

interface ParentDataContextValue {
  tasks: Task[];
  tasksSync: CloudSyncMeta;
  createTask: (
    title: string,
    weekdays?: Task['weekdays'],
    points?: number,
  ) => void;
  updateTask: (
    id: string,
    patch: Partial<Pick<Task, 'title' | 'weekdays' | 'points'>>,
  ) => void;
  removeTask: (id: string) => void;
  allCompletions: StoredCompletions;
  completionsSync: CloudSyncMeta;
  toggleCompletion: (dateStr: string, taskId: string) => void;
  allAdhoc: AdhocTask[];
  adhocSync: CloudSyncMeta;
  addAdhoc: (title: string, dateStr: string) => void;
  removeAdhoc: (id: string) => void;
  completionMessage: string;
  rewards: RewardItem[];
  pointsBalance: number;
  rewardSync: CloudSyncMeta;
  setCompletionMessage: (text: string) => void;
  addReward: (title: string, cost: number) => void;
  updateReward: (
    id: string,
    patch: Partial<Pick<RewardItem, 'title' | 'cost'>>,
  ) => void;
  removeReward: (id: string) => void;
  redeemReward: (id: string) => RedemptionResult;
  defaultCompletionMessage: string;
  sync: CloudSyncMeta;
  taskOrder: string[];
  dayOrders: DayOrders;
  reorderGlobalTasks: (orderedIds: string[]) => void;
  reorderToday: (dateStr: string, keys: OrderedItemKey[]) => void;
  restoreDefaultTodayOrder: (dateStr: string) => void;
  hasTodayOrderOverride: (dateStr: string) => boolean;
}

const ParentDataContext = createContext<ParentDataContextValue | null>(null);

function useLocalTasks() {
  const [tasks, setTasks] = useState<Task[]>(() =>
    storage.get<Task[]>(TASKS_KEY, []),
  );
  useEffect(() => {
    storage.set(TASKS_KEY, tasks);
  }, [tasks]);
  return { tasks, setTasks };
}

function useLocalCompletions() {
  const [all, setAll] = useState<StoredCompletions>(() =>
    storage.get<StoredCompletions>(COMPLETIONS_KEY, {}),
  );
  useEffect(() => {
    storage.set(COMPLETIONS_KEY, all);
  }, [all]);
  return { all, setAll };
}

function useLocalAdhoc() {
  const [all, setAll] = useState<AdhocTask[]>(() =>
    storage.get<AdhocTask[]>(ADHOC_KEY, []),
  );
  useEffect(() => {
    storage.set(ADHOC_KEY, all);
  }, [all]);
  return { all, setAll };
}

function useLocalSettingsState() {
  const [settings, setSettings] = useState<ParentSettings>(() =>
    loadLocalSettings(),
  );
  useEffect(() => {
    saveLocalSettings(settings);
  }, [settings]);
  return { settings, setSettings };
}

export function ParentDataProvider({ children }: { children: ReactNode }) {
  const { user, configured } = useAuth();
  const { membership, loading: membershipLoading } = useFamilyMembership();
  const online = useOnlineStatus();
  const uid = user?.uid ?? '';
  const syncTarget = resolveCloudSyncTarget(membership);
  const membershipPending = configured && Boolean(user) && membershipLoading;
  const cloudMode =
    configured && Boolean(user) && !membershipLoading && syncTarget.enabled;

  const localTasks = useLocalTasks();
  const localCompletions = useLocalCompletions();
  const localAdhoc = useLocalAdhoc();
  const localSettings = useLocalSettingsState();

  const [cloudSyncReady, setCloudSyncReady] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [completionsError, setCompletionsError] = useState<string | null>(null);
  const [adhocError, setAdhocError] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const initialSyncDoneRef = useRef(false);

  useEffect(() => {
    if (!configured || !user) {
      setCloudSyncReady(true);
      initialSyncDoneRef.current = false;
      return;
    }

    if (membershipLoading) {
      setCloudSyncReady(false);
      initialSyncDoneRef.current = false;
      return;
    }

    if (!syncTarget.enabled) {
      setCloudSyncReady(true);
      initialSyncDoneRef.current = false;
      return;
    }

    setCloudSyncReady(false);
    initialSyncDoneRef.current = false;

    const syncPaths = syncTarget.paths;
    let cancelled = false;
    let cleanup = () => {};

    const cloudSnap = {
      tasks: [] as Task[],
      completions: {} as StoredCompletions,
      adhoc: [] as AdhocTask[],
      settings: normalizeSettings(null),
    };
    const loaded = {
      tasks: false,
      completions: false,
      adhoc: false,
      settings: false,
    };

    const finishInitialSync = () => {
      if (cancelled || initialSyncDoneRef.current) return;
      if (!loaded.tasks || !loaded.completions || !loaded.adhoc || !loaded.settings) {
        return;
      }
      initialSyncDoneRef.current = true;

      const localSnap = readLocalSnapshot();
      if (isLocalSnapshotEmpty(localSnap)) {
        localTasks.setTasks(cloudSnap.tasks);
        localCompletions.setAll(cloudSnap.completions);
        localAdhoc.setAll(cloudSnap.adhoc);
        localSettings.setSettings(cloudSnap.settings);
      } else {
        void runCloudWrite(
          () => pushSnapshotToPaths(syncPaths, localSnap),
          (msg) => {
            setTasksError(msg);
            setCompletionsError(msg);
            setAdhocError(msg);
            setSettingsError(msg);
          },
        );
        // Local-first push keeps tasks/completions/settings; still mirror cloud adhoc
        // so temp tasks from other devices appear after refresh.
        localAdhoc.setAll(cloudSnap.adhoc);
      }
      setCloudSyncReady(true);
    };

    const startSubscriptions = () => {
      if (cancelled) return;

      const unsubTasks = subscribeCollection<Task>(
      syncPaths.tasks,
      (items) => {
        cloudSnap.tasks = items;
        loaded.tasks = true;
        finishInitialSync();
      },
      (err) => {
        setTasksError(firestoreReadError('任務', err));
        loaded.tasks = true;
        finishInitialSync();
      },
    );

    const unsubCompletions = subscribeCollection<CompletionDay>(
      syncPaths.completions,
      (items) => {
        const next: StoredCompletions = {};
        for (const day of items) next[day.id] = day.ids ?? [];
        cloudSnap.completions = next;
        loaded.completions = true;
        finishInitialSync();
      },
      (err) => {
        setCompletionsError(firestoreReadError('完成紀錄', err));
        loaded.completions = true;
        finishInitialSync();
      },
    );

    const unsubAdhoc = subscribeCollection<AdhocTask>(
      syncPaths.adhoc,
      (items) => {
        cloudSnap.adhoc = items;
        loaded.adhoc = true;
        if (!initialSyncDoneRef.current) {
          finishInitialSync();
        }
        if (initialSyncDoneRef.current) {
          localAdhoc.setAll(items);
        }
      },
      (err) => {
        setAdhocError(firestoreReadError('臨時任務', err));
        loaded.adhoc = true;
        finishInitialSync();
      },
    );

      const unsubSettings = subscribeDoc<SettingsDoc>(
        syncPaths.settings,
        (data) => {
          cloudSnap.settings = settingsFromDoc(data);
          loaded.settings = true;
          finishInitialSync();
        },
        (err) => {
          setSettingsError(firestoreReadError('獎勵設定', err));
          loaded.settings = true;
          finishInitialSync();
        },
      );

      cleanup = () => {
        unsubTasks();
        unsubCompletions();
        unsubAdhoc();
        unsubSettings();
      };
    };

    void (async () => {
      if (membership) {
        await maybeMigrateLegacyUserCloud(uid, membership);
      }
      startSubscriptions();
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [
    configured,
    user?.uid,
    membership?.familyId,
    membership?.activeChildId,
    membershipLoading,
    syncTarget.enabled,
  ]);

  const tasks = localTasks.tasks;
  const allCompletions = localCompletions.all;
  const allAdhoc = localAdhoc.all;
  const settings = localSettings.settings;
  const completionMessage = settings.completionMessage;
  const rewards = settings.rewards;
  const pointsBalance = settings.pointsBalance;

  const cloudSyncMeta = (error: string | null): CloudSyncMeta => ({
    loading: !cloudSyncReady,
    error,
    offline: !online,
    ready: cloudSyncReady,
  });

  const idleSync = membershipPending ? loadingSync : readySync;
  const tasksSync = cloudMode ? cloudSyncMeta(tasksError) : idleSync;
  const completionsSync = cloudMode
    ? cloudSyncMeta(completionsError)
    : idleSync;
  const adhocSync = cloudMode ? cloudSyncMeta(adhocError) : idleSync;
  const rewardSync = cloudMode ? cloudSyncMeta(settingsError) : idleSync;

  const sync = mergeSyncMeta(
    tasksSync,
    completionsSync,
    adhocSync,
    rewardSync,
  );

  const setTasksErrorMsg = useCallback((msg: string) => {
    setTasksError(msg);
  }, []);

  const setSettingsErrorMsg = useCallback((msg: string) => {
    setSettingsError(msg);
  }, []);

  const persistSettings = useCallback(
    (next: ParentSettings) => {
      localSettings.setSettings(next);
      if (cloudMode) {
        void runCloudWrite(
          () => writeSingleton(syncTarget.paths.settings, settingsToDoc(next)),
          setSettingsErrorMsg,
        );
      }
    },
    [cloudMode, syncTarget.paths, localSettings, setSettingsErrorMsg],
  );

  const createTask = useCallback(
    (title: string, weekdays?: Task['weekdays'], points?: number) => {
      const next = createTaskPure(tasks, title, weekdays, points);
      const created = next[next.length - 1];
      if (!created || next.length === tasks.length) return;
      localTasks.setTasks(next);
      persistSettings({
        ...settings,
        taskOrder: appendTaskToGlobalOrder(settings.taskOrder, created.id),
      });
      if (cloudMode) {
        void runCloudWrite(
          () => writeDoc(syncTarget.paths.tasks, created.id, taskToFirestore(created)),
          setTasksErrorMsg,
        );
      }
    },
    [cloudMode, syncTarget.paths, tasks, settings, localTasks, persistSettings, setTasksErrorMsg],
  );

  const updateTask = useCallback(
    (id: string, patch: Partial<Pick<Task, 'title' | 'weekdays' | 'points'>>) => {
      const next = updateTaskPure(tasks, id, patch);
      const updated = next.find((t) => t.id === id);
      if (!updated) return;
      localTasks.setTasks(next);
      if (cloudMode) {
        void runCloudWrite(
          () => writeDoc(syncTarget.paths.tasks, id, taskToFirestore(updated)),
          setTasksErrorMsg,
        );
      }
    },
    [cloudMode, syncTarget.paths, tasks, localTasks, setTasksErrorMsg],
  );

  const removeTask = useCallback(
    (id: string) => {
      localTasks.setTasks((prev) => deleteTaskPure(prev, id));
      const { taskOrder, dayOrders } = removeTaskFromOrders(
        id,
        settings.taskOrder,
        settings.dayOrders,
      );
      persistSettings({
        ...settings,
        ...(taskOrder.length > 0 ? { taskOrder } : { taskOrder: undefined }),
        ...(Object.keys(dayOrders).length > 0
          ? { dayOrders }
          : { dayOrders: undefined }),
      });
      if (cloudMode) {
        void runCloudWrite(
          () => removeDoc(syncTarget.paths.tasks, id),
          setTasksErrorMsg,
        );
      }
    },
    [cloudMode, settings, localTasks, persistSettings, setTasksErrorMsg, syncTarget.paths.tasks],
  );

  const setCompletionsErrorMsg = useCallback((msg: string) => {
    setCompletionsError(msg);
  }, []);

  const toggleCompletion = useCallback(
    (dateStr: string, taskId: string) => {
      const wasCompleted = (allCompletions[dateStr] ?? []).includes(taskId);
      const completing = !wasCompleted;
      const scheduledTask = tasks.find((t) => t.id === taskId);
      const affectsPoints =
        scheduledTask &&
        isScheduledTaskId(tasks, allAdhoc, taskId);

      const applyCompletions = (prev: StoredCompletions) => {
        const current = new Set(prev[dateStr] ?? []);
        if (current.has(taskId)) current.delete(taskId);
        else current.add(taskId);
        return { ...prev, [dateStr]: Array.from(current) };
      };

      const applyPoints = (prev: ParentSettings): ParentSettings => {
        if (!affectsPoints || !scheduledTask) return prev;
        return {
          ...prev,
          pointsBalance: applyCompletionDelta(
            prev.pointsBalance,
            getTaskPoints(scheduledTask),
            completing,
          ),
        };
      };

      const nextCompletions = applyCompletions(allCompletions);
      const ids = nextCompletions[dateStr] ?? [];
      const nextSettings = applyPoints(settings);

      localCompletions.setAll(nextCompletions);
      if (nextSettings !== settings) {
        localSettings.setSettings(nextSettings);
      }

      if (cloudMode) {
        void runCloudWrite(async () => {
          if (ids.length === 0) {
            await removeDoc(syncTarget.paths.completions, dateStr);
          } else {
            await writeDoc(syncTarget.paths.completions, dateStr, { ids });
          }
          if (nextSettings !== settings) {
            await writeSingleton(syncTarget.paths.settings, settingsToDoc(nextSettings));
          }
        }, setCompletionsErrorMsg);
      }
    },
    [
      cloudMode,
      allCompletions,
      allAdhoc,
      tasks,
      settings,
      uid,
      syncTarget.paths,
      localCompletions,
      localSettings,
      setCompletionsErrorMsg,
    ],
  );

  const setAdhocErrorMsg = useCallback((msg: string) => {
    setAdhocError(msg);
  }, []);

  const addAdhoc = useCallback(
    (title: string, dateStr: string) => {
      const next = createAdhocPure(allAdhoc, title, dateStr);
      const created = next[next.length - 1];
      if (!created || next.length === allAdhoc.length) return;
      localAdhoc.setAll(next);
      const dayOrders = appendAdhocToDayOrderIfOverride(
        settings.dayOrders,
        dateStr,
        created.id,
      );
      if (dayOrders !== settings.dayOrders) {
        persistSettings({
          ...settings,
          dayOrders:
            Object.keys(dayOrders).length > 0 ? dayOrders : undefined,
        });
      }
      if (cloudMode) {
        void runCloudWrite(
          () =>
            writeDoc(syncTarget.paths.adhoc, created.id, {
              title: created.title,
              date: created.date,
              createdAt: created.createdAt,
            }),
          setAdhocErrorMsg,
        );
      }
    },
    [cloudMode, syncTarget.paths, allAdhoc, settings, localAdhoc, persistSettings, setAdhocErrorMsg],
  );

  const removeAdhocItem = useCallback(
    (id: string) => {
      localAdhoc.setAll((prev) => deleteAdhocPure(prev, id));
      if (cloudMode) {
        void runCloudWrite(
          () => removeDoc(syncTarget.paths.adhoc, id),
          setAdhocErrorMsg,
        );
      }
    },
    [cloudMode, uid, localAdhoc, setAdhocErrorMsg],
  );

  const setCompletionMessage = useCallback(
    (text: string) => {
      persistSettings({ ...settings, completionMessage: text });
    },
    [settings, persistSettings],
  );

  const addReward = useCallback(
    (title: string, cost: number) => {
      persistSettings({
        ...settings,
        rewards: createRewardPure(settings.rewards, title, cost),
      });
    },
    [settings, persistSettings],
  );

  const updateRewardItem = useCallback(
    (id: string, patch: Partial<Pick<RewardItem, 'title' | 'cost'>>) => {
      persistSettings({
        ...settings,
        rewards: updateRewardPure(settings.rewards, id, patch),
      });
    },
    [settings, persistSettings],
  );

  const removeReward = useCallback(
    (id: string) => {
      persistSettings({
        ...settings,
        rewards: deleteRewardPure(settings.rewards, id),
      });
    },
    [settings, persistSettings],
  );

  const taskOrder = settings.taskOrder ?? [];
  const dayOrders = settings.dayOrders ?? {};

  const reorderGlobalTasks = useCallback(
    (orderedIds: string[]) => {
      persistSettings({
        ...settings,
        taskOrder: orderedIds,
      });
    },
    [settings, persistSettings],
  );

  const reorderToday = useCallback(
    (dateStr: string, keys: OrderedItemKey[]) => {
      persistSettings({
        ...settings,
        dayOrders: setDayOrder(settings.dayOrders, dateStr, keys),
      });
    },
    [settings, persistSettings],
  );

  const restoreDefaultTodayOrder = useCallback(
    (dateStr: string) => {
      const nextDayOrders = clearDayOrder(settings.dayOrders, dateStr);
      persistSettings({
        ...settings,
        dayOrders:
          Object.keys(nextDayOrders).length > 0 ? nextDayOrders : undefined,
      });
    },
    [settings, persistSettings],
  );

  const hasTodayOrderOverride = useCallback(
    (dateStr: string) => hasDayOverride(settings.dayOrders, dateStr),
    [settings.dayOrders],
  );

  const redeemReward = useCallback(
    (id: string): RedemptionResult => {
      const reward = findReward(settings.rewards, id);
      if (!reward) {
        return { ok: false, balance: settings.pointsBalance, shortfall: 0 };
      }
      const result = applyRedemption(settings.pointsBalance, reward.cost);
      if (result.ok) {
        persistSettings({ ...settings, pointsBalance: result.balance });
      }
      return result;
    },
    [settings, persistSettings],
  );

  const value = useMemo<ParentDataContextValue>(
    () => ({
      tasks,
      tasksSync,
      createTask,
      updateTask,
      removeTask,
      allCompletions,
      completionsSync,
      toggleCompletion,
      allAdhoc,
      adhocSync,
      addAdhoc,
      removeAdhoc: removeAdhocItem,
      completionMessage,
      rewards,
      pointsBalance,
      rewardSync,
      setCompletionMessage,
      addReward,
      updateReward: updateRewardItem,
      removeReward,
      redeemReward,
      defaultCompletionMessage: DEFAULT_COMPLETION_MESSAGE,
      sync,
      taskOrder,
      dayOrders,
      reorderGlobalTasks,
      reorderToday,
      restoreDefaultTodayOrder,
      hasTodayOrderOverride,
    }),
    [
      tasks,
      tasksSync,
      createTask,
      updateTask,
      removeTask,
      allCompletions,
      completionsSync,
      toggleCompletion,
      allAdhoc,
      adhocSync,
      addAdhoc,
      removeAdhocItem,
      completionMessage,
      rewards,
      pointsBalance,
      rewardSync,
      setCompletionMessage,
      addReward,
      updateRewardItem,
      removeReward,
      redeemReward,
      sync,
      taskOrder,
      dayOrders,
      reorderGlobalTasks,
      reorderToday,
      restoreDefaultTodayOrder,
      hasTodayOrderOverride,
    ],
  );

  return (
    <ParentDataContext.Provider value={value}>
      {children}
    </ParentDataContext.Provider>
  );
}

function useParentData(): ParentDataContextValue {
  const ctx = useContext(ParentDataContext);
  if (!ctx) {
    throw new Error('useParentData must be used within ParentDataProvider');
  }
  return ctx;
}

export function useDataSync(): CloudSyncMeta {
  return useParentData().sync;
}

export function useTasks() {
  const {
    tasks,
    tasksSync,
    createTask,
    updateTask,
    removeTask,
    taskOrder,
    reorderGlobalTasks,
  } = useParentData();
  const orderedTasks = useMemo(
    () => sortTasksByGlobalOrder(tasks, taskOrder),
    [tasks, taskOrder],
  );
  return {
    tasks: orderedTasks,
    allTasks: tasks,
    taskOrder,
    create: createTask,
    update: updateTask,
    remove: removeTask,
    reorder: reorderGlobalTasks,
    sync: tasksSync,
  };
}

export function useTaskOrder(dateStr: string) {
  const {
    taskOrder,
    dayOrders,
    reorderToday,
    restoreDefaultTodayOrder,
    hasTodayOrderOverride,
  } = useParentData();
  return {
    taskOrder,
    dayOrders,
    reorderToday,
    restoreDefaultTodayOrder,
    hasOverride: hasTodayOrderOverride(dateStr),
  };
}

export function useCompletions(dateStr: string) {
  const { allCompletions, completionsSync, toggleCompletion } =
    useParentData();
  const completedIds = useMemo(
    () => new Set<string>(allCompletions[dateStr] ?? []),
    [allCompletions, dateStr],
  );
  const toggle = useCallback(
    (taskId: string) => toggleCompletion(dateStr, taskId),
    [toggleCompletion, dateStr],
  );
  return { completedIds, toggle, sync: completionsSync };
}

export function useAdhoc(dateStr: string) {
  const { allAdhoc, adhocSync, addAdhoc, removeAdhoc } = useParentData();
  const adhocToday = useMemo(
    () => getAdhocFor(allAdhoc, dateStr),
    [allAdhoc, dateStr],
  );
  const add = useCallback(
    (title: string) => addAdhoc(title, dateStr),
    [addAdhoc, dateStr],
  );
  return { adhocToday, add, remove: removeAdhoc, sync: adhocSync };
}

export function useReward() {
  const {
    completionMessage,
    rewardSync,
    setCompletionMessage,
    defaultCompletionMessage,
  } = useParentData();
  return {
    text: completionMessage,
    setText: setCompletionMessage,
    defaultText: defaultCompletionMessage,
    sync: rewardSync,
  };
}

export function useRewards() {
  const {
    rewards,
    pointsBalance,
    rewardSync,
    addReward,
    updateReward,
    removeReward,
    redeemReward,
  } = useParentData();
  return {
    rewards,
    balance: pointsBalance,
    add: addReward,
    update: updateReward,
    remove: removeReward,
    redeem: redeemReward,
    sync: rewardSync,
  };
}

export function usePoints() {
  const { pointsBalance, rewardSync } = useParentData();
  return {
    balance: pointsBalance,
    sync: rewardSync,
  };
}
