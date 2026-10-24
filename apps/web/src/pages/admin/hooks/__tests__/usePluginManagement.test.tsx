import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { PLUGIN_CATEGORIES } from '../UsePluginManagement';
import type { MarketplacePlugin, UninstallTier } from '../UsePluginManagement';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params) {
        let result = key;
        for (const [k, v] of Object.entries(params)) {
          result = result.replace(`{${k}}`, String(v));
        }
        return result;
      }
      return key;
    },
    i18n: {},
  }),
}));

vi.mock('lucide-react', () => ({
  Play: () => React.createElement('span'),
  Square: () => React.createElement('span'),
  Trash2: () => React.createElement('span'),
  Download: () => React.createElement('span'),
}));

vi.mock('@/api/plugin', () => ({
  Plugin: class {},
  fetchAllPluginInfo: vi.fn(),
  PLUGIN_REGISTRY: () => ({
    workflow: { port: 3001, url: 'http://localhost:3001' },
    erp: { port: 3002, url: 'http://localhost:3002' },
    hrm: { port: 3003, url: 'http://localhost:3003' },
    crm: { port: 3004, url: 'http://localhost:3004' },
    mes: { port: 3005, url: 'http://localhost:3005' },
    qa: { port: 3006, url: 'http://localhost:3006' },
    scm: { port: 3007, url: 'http://localhost:3007' },
    wms: { port: 3008, url: 'http://localhost:3008' },
    bi: { port: 3009, url: 'http://localhost:3009' },
    pm: { port: 3010, url: 'http://localhost:3010' },
    ai: { port: 3011, url: 'http://localhost:3011' },
    gis: { port: 3012, url: 'http://localhost:3012' },
    mobile: { port: 3013, url: 'http://localhost:3013' },
    rs: { port: 3014, url: 'http://localhost:3014' },
    srm: { port: 3015, url: 'http://localhost:3015' },
    monitor: { port: 3016, url: 'http://localhost:3016' },
    portal: { port: 3017, url: 'http://localhost:3017' },
    integration: { port: 3018, url: 'http://localhost:3018' },
  }),
}));

vi.mock('@/lib/reactQuery', () => ({
  QUERY_KEYS: {
    SYSTEM: {
      PLUGINS: ['system', 'plugins'],
    },
  },
}));

vi.mock('@/i18n', () => ({
  default: {
    t: (key: string) => key,
  },
}));

vi.mock('@/store/pluginStore', () => ({
  usePluginStore: vi.fn(() => ({
    installedPlugins: [],
    fetchInstalledPlugins: vi.fn(),
    fetchHealthStatus: vi.fn(),
    enablePlugin: vi.fn(),
    disablePlugin: vi.fn(),
    uninstallPlugin: vi.fn(),
    installPlugin: vi.fn(),
    upgradePlugin: vi.fn(),
  })),
}));

vi.mock('@/utils/errors', () => ({
  extractErrorMessage: (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback,
}));

describe('PLUGIN_CATEGORIES constants', () => {
  it('should have correct category mappings', () => {
    expect(PLUGIN_CATEGORIES.workflow).toBe('System');
    expect(PLUGIN_CATEGORIES.erp).toBe('Business');
    expect(PLUGIN_CATEGORIES.hrm).toBe('Business');
    expect(PLUGIN_CATEGORIES.crm).toBe('Business');
    expect(PLUGIN_CATEGORIES.mes).toBe('Manufacturing');
    expect(PLUGIN_CATEGORIES.qa).toBe('Quality');
    expect(PLUGIN_CATEGORIES.scm).toBe('Supply Chain');
    expect(PLUGIN_CATEGORIES.wms).toBe('Warehouse');
    expect(PLUGIN_CATEGORIES.bi).toBe('Analytics');
    expect(PLUGIN_CATEGORIES.pm).toBe('Project');
    expect(PLUGIN_CATEGORIES.ai).toBe('AI');
    expect(PLUGIN_CATEGORIES.gis).toBe('IoT');
    expect(PLUGIN_CATEGORIES.mobile).toBe('System');
    expect(PLUGIN_CATEGORIES.rs).toBe('R&D');
    expect(PLUGIN_CATEGORIES.srm).toBe('Business');
    expect(PLUGIN_CATEGORIES.monitor).toBe('System');
    expect(PLUGIN_CATEGORIES.portal).toBe('System');
    expect(PLUGIN_CATEGORIES.integration).toBe('System');
  });
});
