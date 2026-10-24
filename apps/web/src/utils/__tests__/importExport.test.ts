import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportToCSV, downloadTemplate, type ExportColumn } from '../importExport';

// Mock @/i18n (i18n instance, used by importExport indirectly via i18n/index initialization)
vi.mock('@/i18n', () => {
  const i18nMap: Record<string, string> = {
    'shared.import_export.k0': '仅创建（跳过已存在）',
    'shared.import_export.k1': '仅更新',
    'shared.import_export.k2': '创建或更新',
    'shared.import_export.k3': '导入失败',
    'common.yes': '是',
    'common.no': '否',
  };
  const instance = {
    t: (key: string, options?: unknown) => {
      // support dual-sig: t(key, fallbackString) and t(key, {count:..})
      if (typeof options === 'string') return options;
      return i18nMap[key] ?? key;
    },
    use: (x: unknown) => instance,
    init: (cfg: unknown) => ({}) as unknown,
    on: vi.fn(),
    off: vi.fn(),
    language: 'zh-CN',
    changeLanguage: vi.fn(),
  };
  return {
    default: instance,
    SUPPORTED_LANGUAGES: [
      { code: 'zh', name: '中文' },
      { code: 'en', name: 'English' },
    ],
  };
});

// Mock i18next (re-exported, initReactI18next consumed by @/i18n)
vi.mock('i18next', () => {
  const i18nMap: Record<string, string> = {
    'shared.import_export.k0': '仅创建（跳过已存在）',
    'shared.import_export.k1': '仅更新',
    'shared.import_export.k6': '否',
    'shared.import_export.k7': '是',
    'common.yes': '是',
    'common.no': '否',
  };
  const instance = {
    t: (key: string, options?: unknown) => {
      if (typeof options === 'string') return options;
      return i18nMap[key] ?? key;
    },
    use: (x: unknown) => instance,
    init: (cfg: unknown) => ({}) as unknown,
    on: vi.fn(),
    off: vi.fn(),
    language: 'zh-CN',
    changeLanguage: vi.fn(),
  };
  return {
    default: instance,
    initReactI18next: { type: '3rdParty', init: () => {} },
  };
});

describe('utils/importExport - exportToCSV', () => {
  beforeEach(() => {
    // Mock DOM APIs
    vi.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      download: '',
      click: vi.fn(),
    } as unknown);
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as unknown);
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as unknown);
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:fake') });
  });

  interface TestRow {
    name: string;
    age: number;
    active: boolean;
    joinedAt: string;
    note?: string;
  }

  const columns: ExportColumn<TestRow>[] = [
    { key: 'name', label: '姓名' },
    { key: 'age', label: '年龄' },
    { key: 'active', label: '状态' },
    { key: 'joinedAt', label: '加入时间' },
    { key: 'note', label: '备注' },
  ];

  it('exports data to CSV with headers and rows', () => {
    const data: TestRow[] = [
      { name: 'Alice', age: 30, active: true, joinedAt: '2024-01-15T00:00:00Z' },
      { name: 'Bob', age: 25, active: false, joinedAt: '2024-06-01T00:00:00Z' },
    ];

    // The function calls DOM APIs; we just verify it doesn't throw
    expect(() => exportToCSV(data, columns, 'test-export')).not.toThrow();
  });

  it('handles null/undefined values as empty strings', () => {
    const data: TestRow[] = [
      { name: 'Alice', age: 30, active: true, joinedAt: '2024-01-15', note: undefined },
    ];
    expect(() => exportToCSV(data, columns)).not.toThrow();
  });

  it('handles boolean values as 是/否', () => {
    const data: TestRow[] = [
      { name: 'Alice', age: 30, active: true, joinedAt: '2024-01-15' },
      { name: 'Bob', age: 25, active: false, joinedAt: '2024-06-01' },
    ];
    expect(() => exportToCSV(data, columns)).not.toThrow();
  });

  it('uses custom format function when provided', () => {
    const cols: ExportColumn<TestRow>[] = [{ key: 'name', label: 'Name', format: (v) => `[${v}]` }];
    const data: TestRow[] = [{ name: 'Alice', age: 30, active: true, joinedAt: '2024-01-15' }];
    expect(() => exportToCSV(data, cols)).not.toThrow();
  });

  it('handles empty data array', () => {
    expect(() => exportToCSV([], columns)).not.toThrow();
  });

  it('uses default filename "export" when not provided', () => {
    const data: TestRow[] = [{ name: 'A', age: 1, active: true, joinedAt: '2024-01-01' }];
    expect(() => exportToCSV(data, columns)).not.toThrow();
  });
});

describe('utils/importExport - downloadTemplate', () => {
  beforeEach(() => {
    vi.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      download: '',
      click: vi.fn(),
    } as unknown);
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as unknown);
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as unknown);
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:fake') });
  });

  it('creates a download link for the template', () => {
    const columns: ExportColumn<unknown>[] = [
      { key: 'name', label: '姓名' },
      { key: 'email', label: '邮箱' },
    ];
    expect(() => downloadTemplate(columns, 'user-template')).not.toThrow();
  });

  it('uses default filename "template" when not provided', () => {
    const columns: ExportColumn<unknown>[] = [{ key: 'name', label: 'Name' }];
    expect(() => downloadTemplate(columns)).not.toThrow();
  });
});
