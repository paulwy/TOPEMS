import { vi } from 'vitest';

/**
 * Core browser polyfills needed by all tests (unit + component).
 * Safe to use with isolate:false — no vi.mock calls, no module registry mutations.
 */

// ─── window.matchMedia ─────────────────────────────────────────────────────
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ─── localStorage ──────────────────────────────────────────────────────────
const createStorageMock = (): Storage => {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear: vi.fn(() => store.clear()),
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
    removeItem: vi.fn((key: string) => store.delete(key)),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, String(value));
    }),
  };
};

const localStorageMock = createStorageMock();

Object.defineProperty(window, 'localStorage', {
  configurable: true,
  writable: true,
  value: localStorageMock,
});

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  writable: true,
  value: localStorageMock,
});

// ─── ResizeObserver ────────────────────────────────────────────────────────
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserver;

// ─── IntersectionObserver ──────────────────────────────────────────────────
class IntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.IntersectionObserver = IntersectionObserver;

// ─── CSS polyfill ──────────────────────────────────────────────────────────
global.CSS = {
  supports: vi.fn().mockReturnValue(true),
  escape: vi.fn().mockImplementation((str: string) => str),
  Hz: 'Hz',
  Q: 'Q',
  cap: 'cap',
  ch: 'ch',
  cm: 'cm',
  deg: 'deg',
  dpcm: 'dpcm',
  dpi: 'dpi',
  em: 'em',
  ex: 'ex',
  fr: 'fr',
  grad: 'grad',
  h: 'h',
  H: 'H',
  inch: 'in',
  kHz: 'kHz',
  mm: 'mm',
  ms: 'ms',
  pc: 'pc',
  pt: 'pt',
  px: 'px',
  q: 'q',
  rad: 'rad',
  rem: 'rem',
  s: 's',
  turn: 'turn',
  vh: 'vh',
  vmax: 'vmax',
  vmin: 'vmin',
  vw: 'vw',
  lh: 'lh',
  rlh: 'rlh',
} as unknown as typeof CSS;
