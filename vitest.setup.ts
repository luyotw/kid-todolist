import '@testing-library/jest-dom/vitest';

// Node 25 ships a partial built-in `localStorage` that overrides jsdom's
// (missing `clear`, throws on some calls). Replace it with a real in-memory
// Storage on `window` so tests see a normal browser-like API.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear() {
    this.store.clear();
  }
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
}

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: new MemoryStorage(),
  });

  beforeEach(() => {
    window.localStorage.clear();
  });
}
