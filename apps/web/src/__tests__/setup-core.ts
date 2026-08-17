import { vi } from 'vitest';

/**
 * Core browser polyfills needed by all tests (unit + component).
 */

// ─── Mock @/i18n for pure unit tests (not loaded with setup-mocks.ts) ─────
// i18n 懒加载后，单元测试无法保证资源已就绪，使用最小 fixture 提供：
//   1. utils/errorHandler.ts 使用的 shared.error_handler.k0~k11
//   2. 其他 utils/* 单测可能用到的纯函数层常用 key
// 保持与 locales/zh/shared.json 一致的值，以便原有断言继续通过。
const __UNIT_TEST_TRANSLATIONS__: Record<string, string> = {
  // ── shared.error_handler ─────────────────────────────────────────
  'shared.error_handler.k0': '未知错误',
  'shared.error_handler.k1': '网络连接失败，请检查网络设置',
  'shared.error_handler.k2': '请求超时，请稍后重试',
  'shared.error_handler.k3': '登录已过期，请重新登录',
  'shared.error_handler.k4': '没有权限执行此操作',
  'shared.error_handler.k5': '请求的资源不存在',
  'shared.error_handler.k6': '请求数据验证失败',
  'shared.error_handler.k7': '服务器内部错误，请联系管理员',
  'shared.error_handler.k8': '服务暂时不可用，请稍后重试',
  'shared.error_handler.k9': '服务器未响应，请检查网络连接',
  'shared.error_handler.k10': '操作失败',
  'shared.error_handler.k11': '操作失败',
  // ── shared.format (status/statusBadge 等工具函数可能依赖) ────────
  'shared.format.k0': '刚刚',
  'shared.format.k1': '未启用',
  'shared.format.k2': '已启用',
  'shared.format.k3': '活跃',
  'shared.format.k4': '停用',
  'shared.format.k5': '待处理',
  'shared.format.k6': '已批准',
  'shared.format.k7': '已拒绝',
  'shared.format.k8': '已完成',
  'shared.format.k9': '处理中',
  'shared.format.k10': '已取消',
  'shared.format.k11': '草稿',
  'shared.format.k12': '已发布',
  'shared.format.k13': '已删除',
  'shared.format.k14': '成功',
  'shared.format.k15': '失败',
  'shared.format.k16': '警告',
  'shared.format.k17': '错误',
  // ── shared.data_export (importExport util 依赖) ─────────────────
  'shared.data_export.k0': '导出',
  'shared.data_export.excel_1': '导出 Excel',
  'shared.data_export.csv_2': '导出 CSV',
  'shared.data_export.pdf_3': '导出 PDF',
};

vi.mock('@/i18n', () => ({
  default: {
    t: (key: string) => __UNIT_TEST_TRANSLATIONS__[key] ?? key,
    language: 'zh-CN',
    changeLanguage: vi.fn(),
    exists: (key: string) => !!__UNIT_TEST_TRANSLATIONS__[key],
    loadNamespaces: vi.fn().mockResolvedValue(undefined),
  },
  ensureLanguageLoaded: vi.fn().mockResolvedValue(undefined),
  ensureNamespacesLoaded: vi.fn().mockResolvedValue(undefined),
  loadTranslationsForLang: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('react-i18next', () => {
  const React = require('react');
  return {
    useTranslation: (ns?: string) => ({
      t: (key: string) => {
        const full = ns ? `${ns}.${key}` : key;
        return __UNIT_TEST_TRANSLATIONS__[full] ?? key;
      },
      i18n: {
        language: 'zh-CN',
        changeLanguage: vi.fn(),
        exists: (k: string) => !!__UNIT_TEST_TRANSLATIONS__[k],
        loadNamespaces: vi.fn().mockResolvedValue(undefined),
      },
      ready: true,
    }),
    withTranslation: () => (Component: any) => Component,
    initReactI18next: { type: '3rdParty' as const, init: vi.fn() },
    Trans: ({ i18nKey, children }: { i18nKey?: string; children?: any }) =>
      React.createElement(
        React.Fragment,
        null,
        __UNIT_TEST_TRANSLATIONS__[i18nKey || ''] ?? i18nKey ?? children
      ),
  };
});


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
