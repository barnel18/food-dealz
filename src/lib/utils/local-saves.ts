/**
 * Device-local saved deals for signed-out visitors (merged into the account on login).
 * Exposes a tiny external store so components can read it with useSyncExternalStore.
 */
const KEY = 'fd_saved';
const EMPTY: readonly string[] = Object.freeze([]);
const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedIds: readonly string[] = EMPTY;

function read(): readonly string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === cachedRaw) return cachedIds;
    cachedRaw = raw;
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    cachedIds = Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : EMPTY;
    return cachedIds;
  } catch {
    return cachedIds;
  }
}

function write(ids: readonly string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids.slice(0, 200)));
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((l) => l());
}

export const localSaves = {
  /** Snapshot (stable reference while storage is unchanged). */
  all: read,
  has: (id: string) => read().includes(id),
  toggle(id: string, on: boolean) {
    const ids = read().filter((x) => x !== id);
    write(on ? [id, ...ids] : ids);
  },
  clear() {
    write([]);
  },
  subscribe(cb: () => void) {
    listeners.add(cb);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY || e.key === null) cb();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(cb);
      window.removeEventListener('storage', onStorage);
    };
  },
  serverSnapshot: () => EMPTY,
};
