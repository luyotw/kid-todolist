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

const TASKS_KEY = 'kid-todolist:tasks:v1';
const COMPLETIONS_KEY = 'kid-todolist:completions:v1';
const ADHOC_KEY = 'kid-todolist:adhoc:v1';
const REWARD_KEY = 'kid-todolist:reward:v1';
export const DEFAULT_REWARD = '你今天好棒！';

type StoredCompletions = Record<string, string[]>;

interface CompletionsDoc {
  dates: StoredCompletions;
}

interface SettingsDoc {
  rewardText: string;
}

interface ParentDataContextValue {
  tasks: Task[];
  tasksSync: CloudSyncMeta;
  createTask: (title: string, weekdays?: Task['weekdays']) => void;
  updateTask: (
    id: string,
    patch: Partial<Pick<Task, 'title' | 'weekdays'>>,
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
  rewardSync: CloudSyncMeta;
  setRewardText: (text: string) => void;
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

function useLocalReward() {
  const [text, setText] = useState<string>(() =>
    storage.get<string>(REWARD_KEY, DEFAULT_REWARD),
  );
  useEffect(() => {
    storage.set(REWARD_KEY, text);
  }, [text]);
  return { text, setText };
}

export function ParentDataProvider({ children }: { children: ReactNode }) {
  const { user, configured } = useAuth();
  const online = useOnlineStatus();
  const cloudMode = configured && Boolean(user);
  const uid = user?.uid ?? '';

  const localTasks = useLocalTasks();
  const localCompletions = useLocalCompletions();
  const localAdhoc = useLocalAdhoc();
  const localReward = useLocalReward();

  const [cloudTasks, setCloudTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(cloudMode);
  const [tasksError, setTasksError] = useState<string | null>(null);

  const [cloudCompletions, setCloudCompletions] = useState<StoredCompletions>({});
  const [completionsLoading, setCompletionsLoading] = useState(cloudMode);
  const [completionsError, setCompletionsError] = useState<string | null>(null);

  const [cloudAdhoc, setCloudAdhoc] = useState<AdhocTask[]>([]);
  const [adhocLoading, setAdhocLoading] = useState(cloudMode);
  const [adhocError, setAdhocError] = useState<string | null>(null);

  const [cloudReward, setCloudReward] = useState(DEFAULT_REWARD);
  const [rewardLoading, setRewardLoading] = useState(cloudMode);
  const [rewardError, setRewardError] = useState<string | null>(null);

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
    return subscribeDoc<CompletionsDoc>(
      paths.completionsMain(uid),
      (data) => {
        setCloudCompletions(data?.dates ?? {});
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
    setRewardLoading(true);
    return subscribeDoc<SettingsDoc>(
      paths.settings(uid),
      (data) => {
        setCloudReward(data?.rewardText ?? DEFAULT_REWARD);
        setRewardLoading(false);
        setRewardError(null);
      },
      () => {
        setRewardError('讀取獎勵設定失敗。');
        setRewardLoading(false);
      },
    );
  }, [cloudMode, uid]);

  const tasks = cloudMode ? cloudTasks : localTasks.tasks;
  const allCompletions = cloudMode ? cloudCompletions : localCompletions.all;
  const allAdhoc = cloudMode ? cloudAdhoc : localAdhoc.all;
  const rewardText = cloudMode ? cloudReward : localReward.text;

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
        loading: rewardLoading,
        error: rewardError,
        offline: !online,
        ready: !rewardLoading,
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

  const createTask = useCallback(
    (title: string, weekdays?: Task['weekdays']) => {
      if (cloudMode) {
        const next = createTaskPure(tasks, title, weekdays);
        const created = next[next.length - 1];
        if (!created) return;
        setCloudTasks(next);
        void runCloudWrite(
          () =>
            writeDoc(paths.tasks(uid), created.id, {
              title: created.title,
              weekdays: created.weekdays,
              createdAt: created.createdAt,
            }),
          setTasksErrorMsg,
        );
        return;
      }
      localTasks.setTasks((prev) => createTaskPure(prev, title, weekdays));
    },
    [cloudMode, tasks, uid, localTasks, setTasksErrorMsg],
  );

  const updateTask = useCallback(
    (id: string, patch: Partial<Pick<Task, 'title' | 'weekdays'>>) => {
      if (cloudMode) {
        const next = updateTaskPure(tasks, id, patch);
        const updated = next.find((t) => t.id === id);
        if (!updated) return;
        setCloudTasks(next);
        void runCloudWrite(
          () =>
            writeDoc(paths.tasks(uid), id, {
              title: updated.title,
              weekdays: updated.weekdays,
              createdAt: updated.createdAt,
            }),
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
      const apply = (prev: StoredCompletions) => {
        const current = new Set(prev[dateStr] ?? []);
        if (current.has(taskId)) current.delete(taskId);
        else current.add(taskId);
        return { ...prev, [dateStr]: Array.from(current) };
      };
      if (cloudMode) {
        const next = apply(allCompletions);
        setCloudCompletions(next);
        void runCloudWrite(
          () =>
            writeSingleton(paths.completionsMain(uid), { dates: next }),
          setCompletionsErrorMsg,
        );
        return;
      }
      localCompletions.setAll(apply);
    },
    [cloudMode, allCompletions, uid, localCompletions, setCompletionsErrorMsg],
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

  const setRewardErrorMsg = useCallback((msg: string) => {
    setRewardError(msg);
  }, []);

  const setRewardText = useCallback(
    (text: string) => {
      if (cloudMode) {
        setCloudReward(text);
        void runCloudWrite(
          () => writeSingleton(paths.settings(uid), { rewardText: text }),
          setRewardErrorMsg,
        );
        return;
      }
      localReward.setText(text);
    },
    [cloudMode, uid, localReward, setRewardErrorMsg],
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
      rewardText,
      rewardSync,
      setRewardText,
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
      rewardSync,
      setRewardText,
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