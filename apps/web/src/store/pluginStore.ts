import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Plugin, TenantPlugin, PluginCategory } from '@/api/plugin';
import { pluginApi, checkAllPluginsHealth, listPlugins } from '@/api/plugin';
import { REMOTE_MODULES, MODULE_CATEGORIES } from '@/config/plugins.config';

export interface PluginState {
  installedPlugins: TenantPlugin[];
  marketplacePlugins: Plugin[];
  healthStatus: Record<string, { healthy: boolean; status?: string; latency?: number }>;
  loading: boolean;
  error: string | null;
  selectedPluginCode: string | null;
  selectedPlugins: string[];
  searchQuery: string;
  activeCategory: string;
  lastFetchTime: Record<string, number>;

  setInstalledPlugins: (plugins: TenantPlugin[]) => void;
  setMarketplacePlugins: (plugins: Plugin[]) => void;
  setHealthStatus: (
    status: Record<string, { healthy: boolean; status?: string; latency?: number }>
  ) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedPluginCode: (code: string | null) => void;
  setSelectedPlugins: (plugins: string[]) => void;
  togglePluginSelection: (code: string) => void;
  setSearchQuery: (query: string) => void;
  setActiveCategory: (category: string) => void;

  fetchInstalledPlugins: (force?: boolean) => Promise<void>;
  fetchMarketplacePlugins: (force?: boolean) => Promise<void>;
  fetchHealthStatus: (force?: boolean) => Promise<void>;
  fetchAllData: () => Promise<void>;

  installPlugin: (code: string) => Promise<boolean>;
  uninstallPlugin: (code: string) => Promise<boolean>;
  enablePlugin: (code: string) => Promise<boolean>;
  disablePlugin: (code: string) => Promise<boolean>;
  upgradePlugin: (code: string, version?: string) => Promise<boolean>;

  batchInstallPlugins: (codes: string[]) => Promise<{ success: string[]; failed: string[] }>;
  batchUninstallPlugins: (codes: string[]) => Promise<{ success: string[]; failed: string[] }>;
  batchEnablePlugins: (codes: string[]) => Promise<{ success: string[]; failed: string[] }>;
  batchDisablePlugins: (codes: string[]) => Promise<{ success: string[]; failed: string[] }>;

  isPluginInstalled: (code: string) => boolean;
  isPluginActive: (code: string) => boolean;
  isPluginSelected: (code: string) => boolean;
  getPluginHealth: (code: string) => { healthy: boolean; status?: string; latency?: number };
  getInstalledPlugin: (code: string) => TenantPlugin | undefined;
  getMarketplacePlugin: (code: string) => Plugin | undefined;

  getFilteredPlugins: () => Plugin[];
  getFilteredInstalledPlugins: () => TenantPlugin[];
  getHealthSummary: () => { total: number; healthy: number; unhealthy: number };
  getCategoryPlugins: (category: string) => Plugin[];
  getInstalledCount: () => number;
  getActiveCount: () => number;

  refreshPlugins: () => void;
  clearError: () => void;
}

const CACHE_TTL = 60000;

export const usePluginStore = create<PluginState>()(
  persist(
    (set, get) => ({
      installedPlugins: [],
      marketplacePlugins: [],
      healthStatus: {},
      loading: false,
      error: null,
      selectedPluginCode: null,
      selectedPlugins: [],
      searchQuery: '',
      activeCategory: 'all',
      lastFetchTime: {},

      setInstalledPlugins: (plugins) => set({ installedPlugins: plugins }),
      setMarketplacePlugins: (plugins) => set({ marketplacePlugins: plugins }),
      setHealthStatus: (status) => set({ healthStatus: status }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setSelectedPluginCode: (code) => set({ selectedPluginCode: code }),
      setSelectedPlugins: (plugins) => set({ selectedPlugins: plugins }),
      togglePluginSelection: (code) => {
        set((state) => ({
          selectedPlugins: state.selectedPlugins.includes(code)
            ? state.selectedPlugins.filter((c) => c !== code)
            : [...state.selectedPlugins, code],
        }));
      },
      setSearchQuery: (query) => set({ searchQuery: query }),
      setActiveCategory: (category) => set({ activeCategory: category }),

      fetchInstalledPlugins: async (force = false) => {
        const now = Date.now();
        const lastFetch = get().lastFetchTime['installed'];
        if (!force && lastFetch && now - lastFetch < CACHE_TTL) {
          return;
        }

        try {
          set({ loading: true, error: null });
          const response = await pluginApi.listInstalled();
          if (response.success && response.data) {
            set({ installedPlugins: response.data });
            set((state) => ({
              lastFetchTime: { ...state.lastFetchTime, installed: now },
            }));
          }
        } catch (error: unknown) {
          set({
            error: (error as { message?: string }).message || 'Failed to fetch installed plugins',
          });
        } finally {
          set({ loading: false });
        }
      },

      fetchMarketplacePlugins: async (force = false) => {
        const now = Date.now();
        const lastFetch = get().lastFetchTime['marketplace'];
        if (!force && lastFetch && now - lastFetch < CACHE_TTL) {
          return;
        }

        try {
          set({ loading: true, error: null });
          const response = await listPlugins();
          if (response.success && response.data) {
            set({ marketplacePlugins: response.data.plugins });
            set((state) => ({
              lastFetchTime: { ...state.lastFetchTime, marketplace: now },
            }));
          }
        } catch (error: unknown) {
          const msg =
            error instanceof Error ? (error as { message?: string }).message : String(error);
          set({ error: msg || 'Failed to fetch marketplace plugins' });
        } finally {
          set({ loading: false });
        }
      },

      fetchHealthStatus: async (force = false) => {
        const now = Date.now();
        const lastFetch = get().lastFetchTime['health'];
        if (!force && lastFetch && now - lastFetch < CACHE_TTL) {
          return;
        }

        try {
          set({ loading: true, error: null });
          const health = await checkAllPluginsHealth();
          set({ healthStatus: health });
          set((state) => ({
            lastFetchTime: { ...state.lastFetchTime, health: now },
          }));
        } catch (error: unknown) {
          set({
            error: (error as { message?: string }).message || 'Failed to check plugin health',
          });
        } finally {
          set({ loading: false });
        }
      },

      fetchAllData: async () => {
        await Promise.all([
          get().fetchInstalledPlugins(),
          get().fetchMarketplacePlugins(),
          get().fetchHealthStatus(),
        ]);
      },

      installPlugin: async (code) => {
        try {
          set({ loading: true, error: null });
          const response = await pluginApi.install(code);
          if (response.success) {
            await get().fetchInstalledPlugins(true);
            await get().fetchHealthStatus(true);
            return true;
          }
          return false;
        } catch (error: unknown) {
          set({ error: (error as { message?: string }).message || 'Failed to install plugin' });
          return false;
        } finally {
          set({ loading: false });
        }
      },

      uninstallPlugin: async (code) => {
        try {
          set({ loading: true, error: null });
          const response = await pluginApi.uninstall(code);
          if (response.success) {
            await get().fetchInstalledPlugins(true);
            await get().fetchHealthStatus(true);
            set((state) => ({
              selectedPlugins: state.selectedPlugins.filter((c) => c !== code),
            }));
            return true;
          }
          return false;
        } catch (error: unknown) {
          set({ error: (error as { message?: string }).message || 'Failed to uninstall plugin' });
          return false;
        } finally {
          set({ loading: false });
        }
      },

      enablePlugin: async (code) => {
        try {
          set({ loading: true, error: null });
          const response = await pluginApi.enable(code);
          if (response.success) {
            await get().fetchInstalledPlugins(true);
            await get().fetchHealthStatus(true);
            return true;
          }
          return false;
        } catch (error: unknown) {
          set({ error: (error as { message?: string }).message || 'Failed to enable plugin' });
          return false;
        } finally {
          set({ loading: false });
        }
      },

      disablePlugin: async (code) => {
        try {
          set({ loading: true, error: null });
          const response = await pluginApi.disable(code);
          if (response.success) {
            await get().fetchInstalledPlugins(true);
            await get().fetchHealthStatus(true);
            return true;
          }
          return false;
        } catch (error: unknown) {
          const msg =
            error instanceof Error ? (error as { message?: string }).message : String(error);
          set({ error: msg || 'Failed to disable plugin' });
          return false;
        } finally {
          set({ loading: false });
        }
      },

      upgradePlugin: async (code, version) => {
        try {
          set({ loading: true, error: null });
          const response = await pluginApi.upgrade(code, version);
          if (response.success) {
            await get().fetchInstalledPlugins(true);
            await get().fetchHealthStatus(true);
            return true;
          }
          return false;
        } catch (error: unknown) {
          const msg =
            error instanceof Error ? (error as { message?: string }).message : String(error);
          set({ error: msg || 'Failed to upgrade plugin' });
          return false;
        } finally {
          set({ loading: false });
        }
      },

      batchInstallPlugins: async (codes) => {
        const success: string[] = [];
        const failed: string[] = [];

        for (const code of codes) {
          const result = await get().installPlugin(code);
          if (result) {
            success.push(code);
          } else {
            failed.push(code);
          }
        }

        return { success, failed };
      },

      batchUninstallPlugins: async (codes) => {
        const success: string[] = [];
        const failed: string[] = [];

        for (const code of codes) {
          const result = await get().uninstallPlugin(code);
          if (result) {
            success.push(code);
          } else {
            failed.push(code);
          }
        }

        return { success, failed };
      },

      batchEnablePlugins: async (codes) => {
        const success: string[] = [];
        const failed: string[] = [];

        for (const code of codes) {
          const result = await get().enablePlugin(code);
          if (result) {
            success.push(code);
          } else {
            failed.push(code);
          }
        }

        return { success, failed };
      },

      batchDisablePlugins: async (codes) => {
        const success: string[] = [];
        const failed: string[] = [];

        for (const code of codes) {
          const result = await get().disablePlugin(code);
          if (result) {
            success.push(code);
          } else {
            failed.push(code);
          }
        }

        return { success, failed };
      },

      isPluginInstalled: (code) => {
        return get().installedPlugins.some((p) => p.plugin_id === code);
      },

      isPluginActive: (code) => {
        const plugin = get().installedPlugins.find((p) => p.plugin_id === code);
        return plugin?.is_active === true;
      },

      isPluginSelected: (code) => {
        return get().selectedPlugins.includes(code);
      },

      getPluginHealth: (code) => {
        return get().healthStatus[code] || { healthy: false };
      },

      getInstalledPlugin: (code) => {
        return get().installedPlugins.find((p) => p.plugin_id === code);
      },

      getMarketplacePlugin: (code) => {
        return get().marketplacePlugins.find((p) => p.code === code);
      },

      getFilteredPlugins: () => {
        const { marketplacePlugins, searchQuery, activeCategory } = get();
        let result = [...marketplacePlugins];

        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          result = result.filter(
            (p) =>
              p.name.toLowerCase().includes(query) ||
              p.description?.toLowerCase().includes(query) ||
              p.tags?.some((t) => t.toLowerCase().includes(query))
          );
        }

        if (activeCategory !== 'all') {
          const isModuleCategory = REMOTE_MODULES.some((m) => m.code === activeCategory);
          if (isModuleCategory) {
            result = result.filter((p) => p.code === activeCategory);
          } else {
            result = result.filter((p) => {
              const module = REMOTE_MODULES.find((m) => m.code === p.code);
              return module?.category === activeCategory;
            });
          }
        }

        return result;
      },

      getFilteredInstalledPlugins: () => {
        const { installedPlugins, searchQuery } = get();
        if (!searchQuery) {
          return installedPlugins;
        }

        const query = searchQuery.toLowerCase();
        return installedPlugins.filter(
          (p) =>
            (p.plugin_name || '').toLowerCase().includes(query) ||
            (p.plugin_id || '').toLowerCase().includes(query)
        );
      },

      getHealthSummary: () => {
        const { healthStatus } = get();
        const statusList = Object.values(healthStatus);
        const healthy = statusList.filter((s) => s.healthy).length;
        return {
          total: statusList.length,
          healthy,
          unhealthy: statusList.length - healthy,
        };
      },

      getCategoryPlugins: (category) => {
        const { marketplacePlugins } = get();
        if (category === 'all') {
          return marketplacePlugins;
        }
        return marketplacePlugins.filter((p) => {
          const module = REMOTE_MODULES.find((m) => m.code === p.code);
          return module?.category === category;
        });
      },

      getInstalledCount: () => {
        return get().installedPlugins.length;
      },

      getActiveCount: () => {
        return get().installedPlugins.filter((p) => p.is_active).length;
      },

      refreshPlugins: () => {
        get().fetchInstalledPlugins(true);
        get().fetchMarketplacePlugins(true);
        get().fetchHealthStatus(true);
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'topems-plugin-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        installedPlugins: state.installedPlugins,
        healthStatus: state.healthStatus,
      }),
    }
  )
);
