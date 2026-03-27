/**
 * Debug event bus — key events, console capture, network capture.
 * Only active in __DEV__ mode. Zero overhead in production.
 */

export type DebugKeyEvent = {
  type: 'key';
  timestamp: number;
  key: string;
  shift: boolean;
  alt: boolean;
  meta: boolean;
  ctrl: boolean;
  source: 'app' | 'test';
};

export type DebugConsoleEvent = {
  type: 'console';
  timestamp: number;
  level: 'log' | 'warn' | 'error';
  message: string;
};

export type DebugNetworkEvent = {
  type: 'network';
  timestamp: number;
  method: string;
  url: string;
  status?: number;
  duration?: number;
  error?: string;
};

export type DebugEvent = DebugKeyEvent | DebugConsoleEvent | DebugNetworkEvent;

type Listener = (event: DebugEvent) => void;
const listeners = new Set<Listener>();

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function emit(event: DebugEvent) {
  if (!__DEV__) return;
  listeners.forEach(fn => fn(event));
}

// ── Console capture ──────────────────────────────────────────────────

const origLog = console.log;
const origWarn = console.warn;
const origError = console.error;

export function initConsoleCapture() {
  if (!__DEV__) return;

  console.log = (...args: any[]) => {
    origLog(...args);
    emit({ type: 'console', timestamp: Date.now(), level: 'log', message: args.map(stringify).join(' ') });
  };
  console.warn = (...args: any[]) => {
    origWarn(...args);
    emit({ type: 'console', timestamp: Date.now(), level: 'warn', message: args.map(stringify).join(' ') });
  };
  console.error = (...args: any[]) => {
    origError(...args);
    emit({ type: 'console', timestamp: Date.now(), level: 'error', message: args.map(stringify).join(' ') });
  };
}

function stringify(v: any): string {
  if (typeof v === 'string') return v;
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
}

// ── Network capture ──────────────────────────────────────────────────

export function initNetworkCapture() {
  if (!__DEV__) return;

  const origFetch = global.fetch;
  global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    const url = typeof input === 'string' ? input : (input as Request).url ?? String(input);
    const start = Date.now();
    try {
      const res = await origFetch(input, init);
      setTimeout(() => emit({ type: 'network', timestamp: start, method, url, status: res.status, duration: Date.now() - start }), 0);
      return res;
    } catch (e: any) {
      setTimeout(() => emit({ type: 'network', timestamp: start, method, url, error: e?.message ?? 'unknown', duration: Date.now() - start }), 0);
      throw e;
    }
  };
}
