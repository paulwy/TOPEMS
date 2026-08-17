import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import type { Plugin } from '@/api/plugin';
import { PLUGIN_SUITE_MAP } from '@/api/plugin';
import { usePluginStore } from '@/store/pluginStore';
import { useNotificationStore } from '@/store';
import { logger } from '@/utils/logger';

import { QUERY_KEYS } from '@/lib/reactQuery';

export type SortOption = 'popular' | 'rating' | 'newest' | 'price';
export type ViewMode = 'grid' | 'list';

type HealthStatus = Record<string, { healthy: boolean; status?: string; latency?: number }>;

export interface UsePluginMarketplaceReturn {
  plugins: Plugin[];
  filteredPlugins: Plugin[];
  healthStatus: HealthStatus;
  loading: boolean;
  searchQuery: string;
  selectedSuite: string;
  sortBy: SortOption;
  viewMode: ViewMode;
  selectedPlugin: Plugin | null;
  setSearchQuery: (query: string) => void;
  setSelectedSuite: (suite: string) => void;
  setSortBy: (option: SortOption) => void;
  setViewMode: (mode: ViewMode) => void;
  setSelectedPlugin: (plugin: Plugin | null) => void;
  handleRefresh: () => void;
}

/**
 * Encapsulates all marketplace state, API calls (React Query) and derived
 * filtering/sorting logic for the plugin marketplace page.
 */
export const usePluginMarketplace = (): UsePluginMarketplaceReturn => {
  const { t } = useTranslation();
  const {
    marketplacePlugins,
    healthStatus,
    searchQuery,
    setSearchQuery,
    fetchMarketplacePlugins,
    fetchHealthStatus,
    fetchInstalledPlugins,
  } = usePluginStore();
  const [selectedSuite, setSelectedSuite] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const addNotification = useNotificationStore((state) => state.addNotification);

  const pluginsQuery = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.MARKETPLACE_PLUGINS_BASE,
    queryFn: async () => {
      await Promise.all([fetchMarketplacePlugins(true), fetchInstalledPlugins(true)]);
      // 必须从 store.getState() 读取最新值（外层解构 const 是 render 快照，闭包里不变）
      return usePluginStore.getState().marketplacePlugins;
    },
    staleTime: 5 * 60 * 1000,
  });

  const healthQuery = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.MARKETPLACE_HEALTH_BASE,
    queryFn: async () => {
      await fetchHealthStatus(true);
      return usePluginStore.getState().healthStatus;
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (pluginsQuery.isError && pluginsQuery.error) {
      logger.error(t('plugin.marketplace_page.log.load_plugins_failed'), pluginsQuery.error);
    }
  }, [pluginsQuery.isError, pluginsQuery.error]);

  useEffect(() => {
    if (healthQuery.isError && healthQuery.error) {
      logger.error(t('plugin.marketplace_page.log.load_health_failed'), healthQuery.error);
    }
  }, [healthQuery.isError, healthQuery.error]);

  const loading = pluginsQuery.isLoading;
  const plugins = pluginsQuery.data || [];

  const handleRefresh = () => {
    Promise.all([pluginsQuery.refetch(), healthQuery.refetch(), fetchInstalledPlugins(true)]);
    addNotification({
      title: t('plugin.message.refresh_success'),
      message: t('plugin.message.plugin_list_updated'),
      type: 'success',
    });
  };

  const filteredPlugins = useMemo(() => {
    let result = [...plugins];

    if (searchQuery) {
      const term = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.description?.toLowerCase().includes(term) ||
          p.tags?.some((tg) => tg.toLowerCase().includes(term))
      );
    }

    if (selectedSuite !== 'all') {
      result = result.filter((p) => PLUGIN_SUITE_MAP[p.code] === selectedSuite);
    }

    switch (sortBy) {
      case 'popular':
        result.sort((a, b) => (b.install_count || 0) - (a.install_count || 0));
        break;
      case 'rating':
        result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'newest':
        result.sort(
          (a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
        );
        break;
      case 'price':
        result.sort((a, b) => (a.price_cents || 0) - (b.price_cents || 0));
        break;
    }

    return result;
  }, [plugins, searchQuery, selectedSuite, sortBy]);

  return {
    plugins,
    filteredPlugins,
    healthStatus,
    loading,
    searchQuery,
    selectedSuite,
    sortBy,
    viewMode,
    selectedPlugin,
    setSearchQuery,
    setSelectedSuite,
    setSortBy,
    setViewMode,
    setSelectedPlugin,
    handleRefresh,
  };
};
