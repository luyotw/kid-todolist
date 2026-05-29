import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AdhocTask, Task } from '../types';
import { useAuth } from './auth';
import {
  mergeSyncMeta,
  readySync,
  runCloudWrite,
  useOnlineStatus,
  type CloudSyncMeta,
} from './cloudSync';
import {
  paths,
  removeDoc,
  subscribeCollection,
  subscribeDoc,
  writeDoc,
  writeSingleton,
} from './firestore';
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
import { storage } from './storage';
import {
  DEFAULT_REWARD,
  type ParentSettings,
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

export { DEFAULT_REWARD };

const TASKS_KEY = 'kid-todolist:tasks:v1';
const COMPLETIONS_KEY = 'kid-todolist:completions:v1';
const ADHOC_KEY = 'kid-todolist:adhoc:v1';

type StoredCompletions = Record<string, string[]>;

interface CompletionDay {
  id: string;
  ids?: string[];
}

interface SettingsDoc {
  rewardText?: string;
  rewardCost?: number;
  pointsBalance?: number;
}

function settingsFromDoc(data: SettingsDoc | null): ParentSettings {
  return normalizeSettings({
    rewardText: data?.rewardText,
    rewardCost: data?.rewardCost,
    pointsBalance: data?.pointsBalance,
  });
}

function settingsToDoc(settings: ParentSettings): SettingsDoc {
  return {
    rewardText: settings.rewardText,
    rewardCost: settings.rewardCost,
    pointsBalance: settings.pointsBalance,
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
  rewardText: string;
  rewardCost: number;
  pointsBalance: number;
  rewardSync: CloudSyncMeta;
  setRewardText: (text: string) => void;
  setRewardCost: (cost: number) => void;
  redeemReward: () => RedemptionResult;
  defaultReward: string;
  sync: CloudSyncMeta;
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
  const online = useOnlineStatus();
  const cloudMode = configured && Boolean(user);
  const uid = user?.uid ?? '';

  const localTasks = useLocalTasks();
  const localCompletions = useLocalCompletions();
  const localAdhoc = useLocalAdhoc();
  const localSettings = useLocalSettingsState();

  const [cloudTasks, setCloudTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(cloudMode);
  const [tasksError, setTasksError] = useState<string | null>(null);

  const [cloudCompletions, setCloudCompletions] = useState<StoredCompletions>({});
  const [completionsLoading, setCompletionsLoading] = useState(cloudMode);
  const [completionsError, setCompletionsError] = useState<string | null>(null);

  const [cloudAdhoc, setCloudAdhoc] = useState<AdhocTask[]>([]);
  const [adhocLoading, setAdhocLoading] = useState(cloudMode);
  const [adhocError, setAdhocError] = useState<string | null>(null);

  const [cloudSettings, setCloudSettings] = useState<ParentSettings>(() =>
    normalizeSettings(null),
  );
  const [settingsLoading, setSettingsLoading] = useState(cloudMode);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  useEffect(() => {
    if (!cloudMode) return;
    setTasksLoading(true);
    return subscribeCollection<Task>(
      paths.tasks(uid),
      (items) => {
        setCloudTasks(items);
        setTasksLoading(false);
        setTasksError(null);
      },
      () => {
        setTasksError('讀取任務失敗。');
        setTasksLoading(false);
      },
    );
  }, [cloudMode, uid]);

  useEffect(() => {
    if (!cloudMode) return;
    setCompletionsLoading(true);
    return subscribeCollection<CompletionDay>(
      paths.completions(uid),
      (items) => {
        const next: StoredCompletions = {};
        for (const day of items) next[day.id] = day.ids ?? [];
        setCloudCompletions(next);
        setCompletionsLoading(false);
        setCompletionsError(null);
      },
      () => {
        setCompletionsError('讀取完成紀錄失敗。');
        setCompletionsLoading(false);
      },
    );
  }, [cloudMode, uid]);

  useEffect(() => {
    if (!cloudMode) return;
    setAdhocLoading(true);
    return subscribeCollection<AdhocTask>(
      paths.adhoc(uid),
      (items) => {
        setCloudAdhoc(items);
        setAdhocLoading(false);
        setAdhocError(null);
      },
      () => {
        setAdhocError('讀取臨時任務失敗。');
        setAdhocLoading(false);
      },
    );
  }, [cloudMode, uid]);

  useEffect(() => {
    if (!cloudMode) return;
    setSettingsLoading(true);
    return subscribeDoc<SettingsDoc>(
      paths.settings(uid),
      (data) => {
        setCloudSettings(settingsFromDoc(data));
        setSettingsLoading(false);
        setSettingsError(null);
      },
      () => {
        setSettingsError('讀取獎勵設定失敗。');
        setSettingsLoading(false);
      },
    );
  }, [cloudMode, uid]);

  const tasks = cloudMode ? cloudTasks : localTasks.tasks;
  const allCompletions = cloudMode ? cloudCompletions : localCompletions.all;
  const allAdhoc = cloudMode ? cloudAdhoc : localAdhoc.all;
  const settings = cloudMode ? cloudSettings : localSettings.settings;
  const rewardText = settings.rewardText;
  const rewardCost = settings.rewardCost;
  const pointsBalance = settings.pointsBalance;

  const tasksSync: CloudSyncMeta = cloudMode
    ? {
        loading: tasksLoading,
        error: tasksError,
        offline: !online,
        ready: !tasksLoading,
      }
    : readySync;

  const completionsSync: CloudSyncMeta = cloudMode
    ? {
        loading: completionsLoading,
        error: completionsError,
        offline: !online,
        ready: !completionsLoading,
      }
    : readySync;

  const adhocSync: CloudSyncMeta = cloudMode
    ? {
        loading: adhocLoading,
        error: adhocError,
        offline: !online,
        ready: !adhocLoading,
      }
    : readySync;

  const rewardSync: CloudSyncMeta = cloudMode
    ? {
        loading: settingsLoading,
        error: settingsError,
        offline: !online,
        ready: !settingsLoading,
      }
    : readySync;

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
      if (cloudMode) {
        setCloudSettings(next);
        void runCloudWrite(
          () => writeSingleton(paths.settings(uid), settingsToDoc(next)),
          setSettingsErrorMsg,
        );
        return;
      }
      localSettings.setSettings(next);
    },
    [cloudMode, uid, localSettings, setSettingsErrorMsg],
  );

  const createTask = useCallback(
    (title: string, weekdays?: Task['weekdays'], points?: number) => {
      if (cloudMode) {
        const next = createTaskPure(tasks, title, weekdays, points);
        const created = next[next.length - 1];
        if (!created) return;
        setCloudTasks(next);
        void runCloudWrite(
          () => writeDoc(paths.tasks(uid), created.id, taskToFirestore(created)),
          setTasksErrorMsg,
        );
        return;
      }
      localTasks.setTasks((prev) =>
        createTaskPure(prev, title, weekdays, points),
      );
    },
    [cloudMode, tasks, uid, localTasks, setTasksErrorMsg],
  );

  const updateTask = useCallback(
    (id: string, patch: Partial<Pick<Task, 'title' | 'weekdays' | 'points'>>) => {
      if (cloudMode) {
        const next = updateTaskPure(tasks, id, patch);
        const updated = next.find((t) => t.id === id);
        if (!updated) return;
        setCloudTasks(next);
        void runCloudWrite(
          () => writeDoc(paths.tasks(uid), id, taskToFirestore(updated)),
          setTasksErrorMsg,
        );
        return;
      }
      localTasks.setTasks((prev) => updateTaskPure(prev, id, patch));
    },
    [cloudMode, tasks, uid, localTasks, setTasksErrorMsg],
  );

  const removeTask = useCallback(
    (id: string) => {
      if (cloudMode) {
        setCloudTasks((prev) => deleteTaskPure(prev, id));
        void runCloudWrite(
          () => removeDoc(paths.tasks(uid), id),
          setTasksErrorMsg,
        );
        return;
      }
      localTasks.setTasks((prev) => deleteTaskPure(prev, id));
    },
    [cloudMode, uid, localTasks, setTasksErrorMsg],
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

      if (cloudMode) {
        const nextCompletions = applyCompletions(allCompletions);
        const ids = nextCompletions[dateStr] ?? [];
        const nextSettings = applyPoints(settings);
        setCloudCompletions(nextCompletions);
        if (nextSettings !== settings) {
          setCloudSettings(nextSettings);
        }
        void runCloudWrite(async () => {
          if (ids.length === 0) {
            await removeDoc(paths.completions(uid), dateStr);
          } else {
            await writeDoc(paths.completions(uid), dateStr, { ids });
          }
          if (nextSettings !== settings) {
            await writeSingleton(paths.settings(uid), settingsToDoc(nextSettings));
          }
        }, setCompletionsErrorMsg);
        return;
      }

      localCompletions.setAll(applyCompletions);
      if (affectsPoints) {
        localSettings.setSettings(applyPoints);
      }
    },
    [
      cloudMode,
      allCompletions,
      allAdhoc,
      tasks,
      settings,
      uid,
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
      if (cloudMode) {
        const next = createAdhocPure(allAdhoc, title, dateStr);
        const created = next[next.length - 1];
        if (!created) return;
        setCloudAdhoc(next);
        void runCloudWrite(
          () =>
            writeDoc(paths.adhoc(uid), created.id, {
              title: created.title,
              date: created.date,
              createdAt: created.createdAt,
            }),
          setAdhocErrorMsg,
        );
        return;
      }
      localAdhoc.setAll((prev) => createAdhocPure(prev, title, dateStr));
    },
    [cloudMode, allAdhoc, uid, localAdhoc, setAdhocErrorMsg],
  );

  const removeAdhocItem = useCallback(
    (id: string) => {
      if (cloudMode) {
        setCloudAdhoc((prev) => deleteAdhocPure(prev, id));
        void runCloudWrite(
          () => removeDoc(paths.adhoc(uid), id),
          setAdhocErrorMsg,
        );
        return;
      }
      localAdhoc.setAll((prev) => deleteAdhocPure(prev, id));
    },
    [cloudMode, uid, localAdhoc, setAdhocErrorMsg],
  );

  const setRewardText = useCallback(
    (text: string) => {
      persistSettings({ ...settings, rewardText: text });
    },
    [settings, persistSettings],
  );

  const setRewardCost = useCallback(
    (cost: number) => {
      persistSettings(normalizeSettings({ ...settings, rewardCost: cost }));
    },
    [settings, persistSettings],
  );

  const redeemReward = useCallback((): RedemptionResult => {
    const result = applyRedemption(settings.pointsBalance, settings.rewardCost);
    if (result.ok) {
      persistSettings({ ...settings, pointsBalance: result.balance });
    }
    return result;
  }, [settings, persistSettings]);

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
      rewardText,
      rewardCost,
      pointsBalance,
      rewardSync,
      setRewardText,
      setRewardCost,
      redeemReward,
      defaultReward: DEFAULT_REWARD,
      sync,
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
      rewardText,
      rewardCost,
      pointsBalance,
      rewardSync,
      setRewardText,
      setRewardCost,
      redeemReward,
      sync,
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
  } = useParentData();
  return {
    tasks,
    create: createTask,
    update: updateTask,
    remove: removeTask,
    sync: tasksSync,
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
  const { rewardText, rewardSync, setRewardText, defaultReward } =
    useParentData();
  return {
    text: rewardText,
    setText: setRewardText,
    defaultText: defaultReward,
    sync: rewardSync,
  };
}

export function usePoints() {
  const {
    pointsBalance,
    rewardCost,
    setRewardCost,
    redeemReward,
    rewardSync,
  } = useParentData();
  return {
    balance: pointsBalance,
    rewardCost,
    setRewardCost,
    redeem: redeemReward,
    sync: rewardSync,
  };
}
