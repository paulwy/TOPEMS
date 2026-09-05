import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  usePluginManagement,
  getPluginDisplayNames,
  PLUGIN_CATEGORIES,
} from '../UsePluginManagement';
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

describe('getPluginDisplayNames constants', () => {
  it('should have display names for all plugin categories', () => {
    const t = (key: string) => key;
    const PLUGIN_DISPLAY_NAMES = getPluginDisplayNames(t);
    expect(PLUGIN_DISPLAY_NAMES.workflow).toBe('admin.plugin_management.workflow_engine');
    expect(PLUGIN_DISPLAY_NAMES.erp).toBe('admin.plugin_management.enterprise_resource_planning');
    expect(PLUGIN_DISPLAY_NAMES.hrm).toBe('admin.plugin_management.human_resource_management');
    expect(PLUGIN_DISPLAY_NAMES.crm).toBe(
      'admin.plugin_management.customer_relationship_management'
    );
    expect(PLUGIN_DISPLAY_NAMES.mes).toBe('admin.plugin_management.manufacturing_execution_system');
    expect(PLUGIN_DISPLAY_NAMES.qa).toBe('admin.plugin_management.quality_management_safety');
    expect(PLUGIN_DISPLAY_NAMES.scm).toBe('admin.plugin_management.supply_chain_management');
    expect(PLUGIN_DISPLAY_NAMES.wms).toBe('admin.plugin_management.warehouse_management');
    expect(PLUGIN_DISPLAY_NAMES.bi).toBe('admin.plugin_management.business_intelligence');
    expect(PLUGIN_DISPLAY_NAMES.pm).toBe('admin.plugin_management.project_management');
    expect(PLUGIN_DISPLAY_NAMES.ai).toBe('admin.plugin_management_page.ai_e93885');
    expect(PLUGIN_DISPLAY_NAMES.gis).toBe('admin.plugin_management.geographic_information_service');
    expect(PLUGIN_DISPLAY_NAMES.mobile).toBe('admin.plugin_management.mobile_services');
    expect(PLUGIN_DISPLAY_NAMES.rs).toBe('admin.plugin_management.r_d_management');
    expect(PLUGIN_DISPLAY_NAMES.srm).toBe('admin.plugin_management.supplier_management');
    expect(PLUGIN_DISPLAY_NAMES.monitor).toBe('admin.plugin_management.monitoring_alerts');
    expect(PLUGIN_DISPLAY_NAMES.portal).toBe('admin.plugin_management.enterprise_portal');
    expect(PLUGIN_DISPLAY_NAMES.integration).toBe('admin.plugin_management.system_integration');
  });
});

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

describe('UsePluginManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hook initialization', () => {
    it('should render hook without errors', () => {
      const { result } = renderHook(() => usePluginManagement());
      expect(result.current).toBeDefined();
    });

    it('should have correct default marketplace state', () => {
      const { result } = renderHook(() => usePluginManagement());

      expect(result.current.marketplaceOpen).toBe(false);
      expect(result.current.marketplaceTab).toBe(0);
      expect(result.current.marketplaceSearch).toBe('');
      expect(result.current.installingPlugin).toBeNull();
      expect(result.current.installStep).toBe(0);
      expect(result.current.installLoading).toBe(false);
      expect(result.current.installError).toBeNull();
      expect(result.current.uninstallTarget).toBeNull();
    });

    it('should have correct default data arrays', () => {
      const { result } = renderHook(() => usePluginManagement());

      expect(Array.isArray(result.current.filteredMarketplace)).toBe(true);
      expect(Array.isArray(result.current.installedCodes)).toBe(true);
      expect(result.current.filteredMarketplace.length).toBeGreaterThan(0);
    });
  });

  describe('setter functions existence and state updates', () => {
    it('should expose marketplace setter functions', () => {
      const { result } = renderHook(() => usePluginManagement());

      expect(typeof result.current.setMarketplaceTab).toBe('function');
      expect(typeof result.current.setMarketplaceSearch).toBe('function');
      expect(typeof result.current.setUninstallTarget).toBe('function');
    });

    it('should update marketplaceTab via setMarketplaceTab', () => {
      const { result } = renderHook(() => usePluginManagement());

      act(() => {
        result.current.setMarketplaceTab(1);
      });
      expect(result.current.marketplaceTab).toBe(1);

      act(() => {
        result.current.setMarketplaceTab(2);
      });
      expect(result.current.marketplaceTab).toBe(2);
    });

    it('should update marketplaceSearch via setMarketplaceSearch', () => {
      const { result } = renderHook(() => usePluginManagement());

      act(() => {
        result.current.setMarketplaceSearch('workflow');
      });
      expect(result.current.marketplaceSearch).toBe('workflow');
    });

    it('should update uninstallTarget via setUninstallTarget', () => {
      const { result } = renderHook(() => usePluginManagement());
      const target = { code: 'workflow', tier: 'uninstall' as UninstallTier };

      act(() => {
        result.current.setUninstallTarget(target);
      });
      expect(result.current.uninstallTarget).toEqual(target);

      act(() => {
        result.current.setUninstallTarget(null);
      });
      expect(result.current.uninstallTarget).toBeNull();
    });
  });

  describe('mutation objects existence', () => {
    it('should expose all mutation objects', () => {
      const { result } = renderHook(() => usePluginManagement());

      expect(result.current.enableMutation).toBeDefined();
      expect(typeof result.current.enableMutation.mutate).toBe('function');
      expect(typeof result.current.enableMutation.mutateAsync).toBe('function');

      expect(result.current.disableMutation).toBeDefined();
      expect(typeof result.current.disableMutation.mutate).toBe('function');
      expect(typeof result.current.disableMutation.mutateAsync).toBe('function');

      expect(result.current.upgradeMutation).toBeDefined();
      expect(typeof result.current.upgradeMutation.mutate).toBe('function');
      expect(typeof result.current.upgradeMutation.mutateAsync).toBe('function');

      expect(result.current.uninstallMutation).toBeDefined();
      expect(typeof result.current.uninstallMutation.mutate).toBe('function');
      expect(typeof result.current.uninstallMutation.mutateAsync).toBe('function');

      expect(result.current.installMutation).toBeDefined();
      expect(typeof result.current.installMutation.mutate).toBe('function');
      expect(typeof result.current.installMutation.mutateAsync).toBe('function');
    });
  });

  describe('handler functions existence', () => {
    it('should expose all marketplace handler functions', () => {
      const { result } = renderHook(() => usePluginManagement());

      expect(typeof result.current.handleOpenMarketplace).toBe('function');
      expect(typeof result.current.handleCloseMarketplace).toBe('function');
      expect(typeof result.current.handleInstallPlugin).toBe('function');
      expect(typeof result.current.handleInstallNext).toBe('function');
      expect(typeof result.current.handleInstallBack).toBe('function');
      expect(typeof result.current.getUninstallMessage).toBe('function');
    });
  });

  describe('adapters and configs', () => {
    it('should expose apiAdapter and customRowActions', () => {
      const { result } = renderHook(() => usePluginManagement());

      expect(result.current.apiAdapter).toBeDefined();
      expect(typeof result.current.apiAdapter.list).toBe('function');
      expect(typeof result.current.apiAdapter.create).toBe('function');
      expect(typeof result.current.apiAdapter.update).toBe('function');
      expect(typeof result.current.apiAdapter.delete).toBe('function');

      expect(Array.isArray(result.current.customRowActions)).toBe(true);
      expect(result.current.customRowActions.length).toBeGreaterThan(0);
    });

    it('should have row actions with valid configs', () => {
      const { result } = renderHook(() => usePluginManagement());

      result.current.customRowActions.forEach((action) => {
        expect(action).toHaveProperty('label');
        expect(action).toHaveProperty('icon');
        expect(action).toHaveProperty('onClick');
        expect(typeof action.onClick).toBe('function');
        if (action.show !== undefined) {
          expect(typeof action.show).toBe('function');
        }
      });
    });
  });

  describe('handleOpenMarketplace and handleCloseMarketplace', () => {
    it('should open marketplace and reset state via handleOpenMarketplace', () => {
      const { result } = renderHook(() => usePluginManagement());

      act(() => {
        result.current.setMarketplaceTab(2);
        result.current.setMarketplaceSearch('test');
      });
      expect(result.current.marketplaceTab).toBe(2);
      expect(result.current.marketplaceSearch).toBe('test');

      act(() => {
        result.current.handleOpenMarketplace();
      });

      expect(result.current.marketplaceOpen).toBe(true);
      expect(result.current.marketplaceTab).toBe(0);
      expect(result.current.marketplaceSearch).toBe('');
    });

    it('should close marketplace and reset install state via handleCloseMarketplace', () => {
      const { result } = renderHook(() => usePluginManagement());
      const mockPlugin: MarketplacePlugin = {
        code: 'test',
        name: 'Test Plugin',
        version: '1.0.0',
        latest_version: '1.0.0',
        description: 'Test',
        author: 'TOPEMS',
        published_at: '2024-01-01',
        downloads: 0,
        category: 'Business',
        plugin_type: 'business',
        permissions: [],
      };

      act(() => {
        result.current.handleOpenMarketplace();
        result.current.handleInstallPlugin(mockPlugin);
      });
      expect(result.current.installingPlugin).toEqual(mockPlugin);
      expect(result.current.marketplaceOpen).toBe(true);

      act(() => {
        result.current.handleCloseMarketplace();
      });

      expect(result.current.marketplaceOpen).toBe(false);
      expect(result.current.installingPlugin).toBeNull();
      expect(result.current.installStep).toBe(0);
      expect(result.current.installError).toBeNull();
    });
  });

  describe('handleInstallPlugin', () => {
    it('should set installingPlugin and reset install steps', () => {
      const { result } = renderHook(() => usePluginManagement());
      const mockPlugin: MarketplacePlugin = {
        code: 'workflow',
        name: 'Workflow Engine',
        version: '1.0.0',
        latest_version: '1.0.0',
        description: 'Workflow management',
        author: 'TOPEMS',
        published_at: '2024-01-01',
        downloads: 100,
        category: 'System',
        plugin_type: 'core',
        permissions: [],
      };

      act(() => {
        result.current.handleInstallPlugin(mockPlugin);
      });

      expect(result.current.installingPlugin).toEqual(mockPlugin);
      expect(result.current.installStep).toBe(0);
      expect(result.current.installError).toBeNull();
    });
  });

  describe('handleInstallBack', () => {
    it('should not decrease step below 0', () => {
      const { result } = renderHook(() => usePluginManagement());

      expect(result.current.installStep).toBe(0);

      act(() => {
        result.current.handleInstallBack();
      });

      expect(result.current.installStep).toBe(0);
    });

    it('should decrease step when above 0', () => {
      const { result } = renderHook(() => usePluginManagement());

      act(() => {
        result.current.handleInstallNext();
      });
      expect(result.current.installStep).toBe(1);

      act(() => {
        result.current.handleInstallBack();
      });
      expect(result.current.installStep).toBe(0);
    });
  });

  describe('getUninstallMessage', () => {
    it('should return disable message string for disable tier', () => {
      const { result } = renderHook(() => usePluginManagement());
      const message = result.current.getUninstallMessage('workflow', 'disable');
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
    });

    it('should return uninstall message string for uninstall tier', () => {
      const { result } = renderHook(() => usePluginManagement());
      const message = result.current.getUninstallMessage('erp', 'uninstall');
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
    });

    it('should return delete message string for delete tier', () => {
      const { result } = renderHook(() => usePluginManagement());
      const message = result.current.getUninstallMessage('hrm', 'delete');
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
    });

    it('should return default message string for unknown tier', () => {
      const { result } = renderHook(() => usePluginManagement());
      const message = result.current.getUninstallMessage('crm', 'unknown' as UninstallTier);
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
    });

    it('should return different messages for different tiers', () => {
      const { result } = renderHook(() => usePluginManagement());
      const disableMsg = result.current.getUninstallMessage('wf', 'disable');
      const uninstallMsg = result.current.getUninstallMessage('wf', 'uninstall');
      const deleteMsg = result.current.getUninstallMessage('wf', 'delete');

      expect(disableMsg).not.toEqual(uninstallMsg);
      expect(uninstallMsg).not.toEqual(deleteMsg);
      expect(disableMsg).not.toEqual(deleteMsg);
    });
  });

  describe('filteredMarketplace', () => {
    it('should filter marketplace plugins by search query', () => {
      const { result } = renderHook(() => usePluginManagement());
      const allPluginsCount = result.current.filteredMarketplace.length;
      expect(allPluginsCount).toBeGreaterThan(0);

      act(() => {
        result.current.setMarketplaceSearch('workflow');
      });

      const filtered = result.current.filteredMarketplace;
      filtered.forEach((plugin) => {
        const searchLower = 'workflow';
        const matches =
          plugin.name.toLowerCase().includes(searchLower) ||
          plugin.code.toLowerCase().includes(searchLower) ||
          plugin.description.toLowerCase().includes(searchLower);
        expect(matches).toBe(true);
      });
    });

    it('should return all plugins when search is empty', () => {
      const { result } = renderHook(() => usePluginManagement());
      const count = result.current.filteredMarketplace.length;

      act(() => {
        result.current.setMarketplaceSearch('');
      });

      expect(result.current.filteredMarketplace.length).toBe(count);
    });
  });

  describe('installedCodes', () => {
    it('should return an array of strings', () => {
      const { result } = renderHook(() => usePluginManagement());
      expect(Array.isArray(result.current.installedCodes)).toBe(true);
      result.current.installedCodes.forEach((code) => {
        expect(typeof code).toBe('string');
      });
    });
  });
});
