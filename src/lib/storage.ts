// One place to swap for a real backend later.
const ls = (): Storage | null =>
  typeof window !== 'undefined' && window.localStorage
    ? window.localStorage
    : null;

export const storage = {
  get<T>(key: string, fallback: T): T {
    const store = ls();
    if (!store) return fallback;
    const raw = store.getItem(key);
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },

  set<T>(key: string, value: T): void {
    const store = ls();
    if (!store) return;
    store.setItem(key, JSON.stringify(value));
  },

  remove(key: string): void {
    const store = ls();
    if (!store) return;
    store.removeItem(key);
  },
};
