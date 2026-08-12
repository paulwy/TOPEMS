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
// NOTE: methods are defined as non-enumerable so that Object.keys(localStorage)
// returns only data keys (matching real browser Storage behaviour). This is
// required by source code that iterates via Object.keys(localStorage) — e.g.
// storage.ts keys()/clear() — which the previous Map-backed mock broke.
const createStorageMock = (): Storage => {
  const storage: Record<string, any> = {};

  Object.defineProperties(storage, {
    length: {
      get() {
        return Object.keys(storage).length;
      },
      enumerable: false,
      configurable: true,
    },
    clear: {
      value: vi.fn(() => {
        Object.keys(storage).forEach((key) => {
          delete storage[key];
        });
      }),
      enumerable: false,
      configurable: true,
      writable: true,
    },
    getItem: {
      value: vi.fn((key: string) => storage[key] ?? null),
      enumerable: false,
      configurable: true,
      writable: true,
    },
    key: {
      value: vi.fn((index: number) => Object.keys(storage)[index] ?? null),
      enumerable: false,
      configurable: true,
      writable: true,
    },
    removeItem: {
      value: vi.fn((key: string) => {
        delete storage[key];
      }),
      enumerable: false,
      configurable: true,
      writable: true,
    },
    setItem: {
      value: vi.fn((key: string, value: string) => {
        storage[key] = String(value);
      }),
      enumerable: false,
      configurable: true,
      writable: true,
    },
  });

  return storage as unknown as Storage;
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
