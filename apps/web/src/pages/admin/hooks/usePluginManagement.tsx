import React, { useCallback, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Square, Trash2, Download } from 'lucide-react';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { QUERY_KEYS, queryClient } from '@/lib/reactQuery';
import { useNotificationStore } from '@/store';
import { type Plugin, fetchAllPluginInfo, PLUGIN_REGISTRY } from '@/api/plugin';
import { usePluginStore } from '@/store/pluginStore';
import { extractErrorMessage } from '@/utils/errors';
import i18n from '@/i18n';
export interface MarketplacePlugin {
  code: string;
  name: string;
  version: string;
  latest_version: string;
  description: string;
  author: string;
  published_at: string;
  downloads: number;
  category: string;
  plugin_type: string;
  permissions: Array<{ code: string; name: string }>;
}
export type UninstallTier = 'disable' | 'uninstall' | 'delete';
export const getPluginDisplayNames = (t: (key: string) => string): Record<string, string> => ({
  workflow: i18n.t('admin.plugin_management.workflow_engine'),
  erp: i18n.t('admin.plugin_management.enterprise_resource_planning'),
  hrm: i18n.t('admin.plugin_management.human_resource_management'),
  crm: i18n.t('admin.plugin_management.customer_relationship_management'),
  mes: i18n.t('admin.plugin_management.manufacturing_execution_system'),
  qa: i18n.t('admin.plugin_management.quality_management_safety'),
  scm: i18n.t('admin.plugin_management.supply_chain_management'),
  wms: i18n.t('admin.plugin_management.warehouse_management'),
  bi: i18n.t('admin.plugin_management.business_intelligence'),
  pm: i18n.t('admin.plugin_management.project_management'),
  ai: i18n.t('admin.plugin_management_page.ai_e93885'),
  gis: i18n.t('admin.plugin_management.geographic_information_service'),
  mobile: i18n.t('admin.plugin_management.mobile_services'),
  rs: i18n.t('admin.plugin_management.r_d_management'),
  srm: i18n.t('admin.plugin_management.supplier_management'),
  monitor: i18n.t('admin.plugin_management.monitoring_alerts'),
  portal: i18n.t('admin.plugin_management.enterprise_portal'),
  integration: i18n.t('admin.plugin_management.system_integration'),
});
export const PLUGIN_CATEGORIES: Record<string, string> = {
  workflow: 'System',
  erp: 'Business',
  hrm: 'Business',
  crm: 'Business',
  mes: 'Manufacturing',
  qa: 'Quality',
  scm: 'Supply Chain',
  wms: 'Warehouse',
  bi: 'Analytics',
  pm: 'Project',
  ai: 'AI',
  gis: 'IoT',
  mobile: 'System',
  rs: 'R&D',
  srm: 'Business',
  monitor: 'System',
  portal: 'System',
  integration: 'System',
};
export interface UninstallTarget {
  code: string;
  tier: UninstallTier;
}
type EnableMutation = ReturnType<typeof useMutation<string, unknown, string>>;
type DisableMutation = ReturnType<typeof useMutation<string, unknown, string>>;
type UpgradeMutation = ReturnType<typeof useMutation<string, unknown, string>>;
type UninstallMutation = ReturnType<
  typeof useMutation<
    { pluginCode: string; tier: UninstallTier },
    unknown,
    { pluginCode: string; tier: UninstallTier }
  >
>;
type InstallMutation = ReturnType<typeof useMutation<string, unknown, string>>;
export interface UsePluginManagementReturn {
  // marketplace state
  marketplaceOpen: boolean;
  marketplaceTab: number;
  marketplaceSearch: string;
  installingPlugin: MarketplacePlugin | null;
  installStep: number;
  installLoading: boolean;
  installError: string | null;
  // uninstall state
  uninstallTarget: UninstallTarget | null;
  setUninstallTarget: React.Dispatch<React.SetStateAction<UninstallTarget | null>>;
  // marketplace setters
  setMarketplaceTab: React.Dispatch<React.SetStateAction<number>>;
  setMarketplaceSearch: React.Dispatch<React.SetStateAction<string>>;
  // marketplace data
  filteredMarketplace: MarketplacePlugin[];
  installedCodes: string[];
  // mutations
  enableMutation: EnableMutation;
  disableMutation: DisableMutation;
  upgradeMutation: UpgradeMutation;
  uninstallMutation: UninstallMutation;
  installMutation: InstallMutation;
  // handlers
  handleOpenMarketplace: () => void;
  handleCloseMarketplace: () => void;
  handleInstallPlugin: (plugin: MarketplacePlugin) => void;
  handleInstallNext: () => Promise<void>;
  handleInstallBack: () => void;
  getUninstallMessage: (pluginCode: string, tier: UninstallTier) => string;
  // adapters / config
  apiAdapter: CrudApiAdapter;
  customRowActions: RowAction[];
}
export function usePluginManagement(): UsePluginManagementReturn {
  const pluginDisplayNames = getPluginDisplayNames(i18n.t);
  const {
    installedPlugins,
    fetchInstalledPlugins,
    fetchHealthStatus,
    enablePlugin,
    disablePlugin,
    uninstallPlugin,
    installPlugin,
    upgradePlugin,
  } = usePluginStore();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();
  const [marketplaceOpen, setMarketplaceOpen] = useState(false);
  const [marketplaceTab, setMarketplaceTab] = useState(0);
  const [marketplaceSearch, setMarketplaceSearch] = useState('');
  const [installingPlugin, setInstallingPlugin] = useState<MarketplacePlugin | null>(null);
  const [installStep, setInstallStep] = useState(0);
  const [installLoading, setInstallLoading] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);
  const [uninstallTarget, setUninstallTarget] = useState<UninstallTarget | null>(null);
  const loadPlugins = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SYSTEM.PLUGINS ,
  exact: false,
  refetchType: 'active',
});
  }, [queryClient]);
  const apiAdapter: CrudApiAdapter = useMemo(
    () => ({
      list: async (params) => {
        await Promise.all([fetchInstalledPlugins(), fetchHealthStatus()]);
        const pluginInfoList = await fetchAllPluginInfo();
        const search = (params?.search as string) || '';
        const typeFilter = (params?.plugin_type as string) || 'all';
        const runtimePlugins: Plugin[] = pluginInfoList.map((info, index) => ({
          id: String(index + 1),
          code: info.code,
          name: pluginDisplayNames[info.code] || info.name,
          description: info.description,
          version: info.version,
          plugin_type: info.plugin_type,
          is_published: true,
          category: info.category,
          runtime_status: 'running',
          runtime_url: PLUGIN_REGISTRY[info.code]?.url || '',
          base_path: `/api/${info.code}`,
        }));
        const filtered = runtimePlugins.filter((plugin) => {
          const matchesSearch =
            !search ||
            (plugin.name && plugin.name.toLowerCase().includes(search.toLowerCase())) ||
            (plugin.code && plugin.code.toLowerCase().includes(search.toLowerCase())) ||
            (plugin.description && plugin.description.toLowerCase().includes(search.toLowerCase()));
          const matchesType = typeFilter === 'all' || plugin.plugin_type === typeFilter;
          return matchesSearch && matchesType;
        });
        return { data: filtered as unknown as Record<string, unknown>[], total: filtered.length };
      },
      create: async () => {
        throw new Error(` + ${i18n.t('admin.plugin_management_page.error_6b5f03')} + `);
      },
      update: async () => {
        throw new Error(
          i18n.t('admin.plugin_management.plugin_configuration_does_not_support_direct_editing')
        );
      },
      delete: async () => {
        throw new Error(i18n.t('admin.plugin_management.please_use_uninstall_to_remove_the_plugin'));
      },
    }),
    [fetchInstalledPlugins, fetchHealthStatus, i18n.t]
  );
  const enableMutation = useMutation({
    mutationFn: async (pluginCode: string) => {
      const success = await enablePlugin(pluginCode);
      if (!success) throw new Error(i18n.t('admin.plugin_management.enable_failed'));
      return pluginCode;
    },
    onSuccess: (pluginCode) => {
      
      queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.ADMIN.SETTINGS,
          exact: false,
          refetchType: 'active',
        });
      addNotification({
        title: i18n.t('admin.plugin_management.enabled_successfully'),
        message: i18n.t('admin.plugin_management_page.text_773966', { pluginCode }),
        type: 'success',
      });
      loadPlugins();
    },
    onError: (err: unknown) => {
      addNotification({
        title: i18n.t('admin.plugin_management.failed'),
        message: (err as Error).message || i18n.t('admin.plugin_management.enable_failed'),
        type: 'error',
      });
    },
  });
  const disableMutation = useMutation({
    mutationFn: async (pluginCode: string) => {
      const success = await disablePlugin(pluginCode);
      if (!success) throw new Error(i18n.t('admin.plugin_management.disable_failed'));
      return pluginCode;
    },
    onSuccess: (pluginCode) => {
      
      queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.ADMIN.SETTINGS,
          exact: false,
          refetchType: 'active',
        });
      addNotification({
        title: i18n.t('admin.plugin_management.disabled_successfully'),
        message: i18n.t('admin.plugin_management_page.text_c0f589', { pluginCode }),
        type: 'success',
      });
      loadPlugins();
    },
    onError: (err: unknown) => {
      addNotification({
        title: i18n.t('admin.plugin_management.failed'),
        message: (err as Error).message || i18n.t('admin.plugin_management.disable_failed'),
        type: 'error',
      });
    },
  });
  const upgradeMutation = useMutation({
    mutationFn: async (pluginCode: string) => {
      const success = await upgradePlugin(pluginCode);
      if (!success) throw new Error(i18n.t('admin.plugin_management.upgrade_failed'));
      return pluginCode;
    },
    onSuccess: (pluginCode) => {
      
      queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.ADMIN.SETTINGS,
          exact: false,
          refetchType: 'active',
        });
      addNotification({
        title: i18n.t('admin.plugin_management.upgraded_successfully'),
        message: i18n.t('admin.plugin_management_page.text_b13651', { pluginCode }),
        type: 'success',
      });
      loadPlugins();
    },
    onError: (err: unknown) => {
      addNotification({
        title: i18n.t('admin.plugin_management.failed'),
        message: (err as Error).message || i18n.t('admin.plugin_management.upgrade_failed'),
        type: 'error',
      });
    },
  });
  const uninstallMutation = useMutation({
    mutationFn: async ({ pluginCode, tier }: { pluginCode: string; tier: UninstallTier }) => {
      const success = await uninstallPlugin(pluginCode, tier);
      if (!success) throw new Error(i18n.t('admin.plugin_management.uninstall_failed'));
      return { pluginCode, tier };
    },
    onSuccess: ({ pluginCode, tier }) => {
      
      queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.ADMIN.SETTINGS,
          exact: false,
          refetchType: 'active',
        });
      addNotification({
        title: i18n.t('admin.plugin_management.operation_successful'),
        message:
          tier === 'delete'
            ? i18n.t('admin.plugin_management_page.text_9e796d', { pluginCode })
            : tier === 'disable'
              ? i18n.t('admin.plugin_management_page.text_c0f589', { pluginCode })
              : i18n.t('admin.plugin_management_page.text_46c7c3', { pluginCode }),
        type: 'success',
      });
      loadPlugins();
    },
    onError: (err: unknown) => {
      addNotification({
        title: i18n.t('admin.plugin_management.failed'),
        message: (err as Error).message || i18n.t('admin.plugin_management.uninstall_failed'),
        type: 'error',
      });
    },
    onSettled: () => {
      setUninstallTarget(null);
    },
  });
  const installMutation = useMutation({
    mutationFn: async (pluginCode: string) => {
      const success = await installPlugin(pluginCode);
      if (!success) throw new Error(i18n.t('admin.plugin_management.install_failed'));
      return pluginCode;
    },
  
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.ADMIN.SETTINGS,
          exact: false,
          refetchType: 'active',
        });
      },});
  const allMarketplacePlugins: MarketplacePlugin[] = useMemo(
    () =>
      Object.entries(PLUGIN_REGISTRY).map(([code, config]) => ({
        code,
        name: pluginDisplayNames[code] || code.toUpperCase(),
        version: '1.0.0',
        latest_version: '1.0.0',
        description: i18n.t('admin.plugin_management_page.text_97114b', {
          var0: pluginDisplayNames[code] || code,
          var1: config.port,
        }),
        author: 'TOPEMS',
        published_at: '2024-01-01',
        downloads: 0,
        category: PLUGIN_CATEGORIES[code] || 'Business',
        plugin_type: code === 'workflow' ? 'core' : 'business',
        permissions: [],
      })),
    [i18n.t]
  );
  const filteredMarketplace = useMemo(
    () =>
      allMarketplacePlugins.filter((plugin) => {
        const searchLower = marketplaceSearch.toLowerCase();
        return (
          plugin.name.toLowerCase().includes(searchLower) ||
          plugin.code.toLowerCase().includes(searchLower) ||
          plugin.description.toLowerCase().includes(searchLower)
        );
      }),
    [allMarketplacePlugins, marketplaceSearch]
  );
  const installedCodes = useMemo(
    () => [
      ...(queryClient.getQueryData<Plugin[]>(QUERY_KEYS.SYSTEM.PLUGINS) || []).map((p) => p.code),
      ...installedPlugins.map((p) => p.plugin_id),
    ],
    [queryClient, installedPlugins]
  );
  const handleOpenMarketplace = useCallback(() => {
    setMarketplaceOpen(true);
    setMarketplaceTab(0);
    setMarketplaceSearch('');
  }, []);
  const handleCloseMarketplace = useCallback(() => {
    setMarketplaceOpen(false);
    setInstallingPlugin(null);
    setInstallStep(0);
    setInstallError(null);
  }, []);
  const handleInstallPlugin = useCallback((plugin: MarketplacePlugin) => {
    setInstallingPlugin(plugin);
    setInstallStep(0);
    setInstallError(null);
  }, []);
  const handleInstallNext = useCallback(async () => {
    if (installStep === 0) {
      setInstallStep(1);
    } else if (installStep === 1) {
      setInstallLoading(true);
      setInstallError(null);
      try {
        await installMutation.mutateAsync(installingPlugin!.code);
        setInstallStep(2);
        loadPlugins();
      } catch (err: unknown) {
        setInstallError(extractErrorMessage(err, i18n.t('admin.plugin_management.install_failed')));
      } finally {
        setInstallLoading(false);
      }
    } else if (installStep === 2) {
      handleCloseMarketplace();
    }
  }, [installStep, installMutation, installingPlugin, loadPlugins, handleCloseMarketplace, i18n.t]);
  const handleInstallBack = useCallback(() => {
    if (installStep > 0) {
      setInstallStep(installStep - 1);
    }
  }, [installStep]);
  const getUninstallMessage = useCallback(
    (pluginCode: string, tier: UninstallTier) => {
      switch (tier) {
        case 'disable':
          return i18n.t('admin.plugin_management_page.text_ede147', { pluginCode });
        case 'uninstall':
          return i18n.t('admin.plugin_management_page.text_c0b87f', { pluginCode });
        case 'delete':
          return i18n.t('admin.plugin_management_page.text_5cb48f', { pluginCode });
        default:
          return i18n.t(`admin.plugin_management_page.text_3ad04c${{ pluginCode }}`);
      }
    },
    [i18n.t]
  );
  const customRowActions: RowAction[] = useMemo(
    () => [
      {
        label: i18n.t('admin.plugin_management.enable'),
        icon: <Play size={16} />,
        onClick: (row) => enableMutation.mutate(String(row.code)),
        color: 'success',
        show: (row) => row.runtime_status !== 'running',
      },
      {
        label: i18n.t('admin.plugin_management.disable'),
        icon: <Square size={16} />,
        onClick: (row) => disableMutation.mutate(String(row.code)),
        color: 'warning',
        show: (row) => row.runtime_status === 'running',
      },
      {
        label: i18n.t('admin.plugin_management.upgrade'),
        icon: <Download size={16} />,
        onClick: (row) => upgradeMutation.mutate(String(row.code)),
        color: 'primary',
        show: (row) => {
          const marketplacePlugin = allMarketplacePlugins.find((p) => p.code === row.code);
          const currentVersion = String(row.version || '');
          return !!marketplacePlugin && marketplacePlugin.latest_version !== currentVersion;
        },
      },
      {
        label: i18n.t('admin.plugin_management.uninstall'),
        icon: <Trash2 size={16} />,
        onClick: (row) => setUninstallTarget({ code: String(row.code), tier: 'uninstall' }),
        color: 'error',
        divider: true,
      },
    ],
    [enableMutation, disableMutation, upgradeMutation, allMarketplacePlugins, i18n.t]
  );
  return {
    marketplaceOpen,
    marketplaceTab,
    marketplaceSearch,
    installingPlugin,
    installStep,
    installLoading,
    installError,
    uninstallTarget,
    setUninstallTarget,
    setMarketplaceTab,
    setMarketplaceSearch,
    filteredMarketplace,
    installedCodes,
    enableMutation,
    disableMutation,
    upgradeMutation,
    uninstallMutation,
    installMutation,
    handleOpenMarketplace,
    handleCloseMarketplace,
    handleInstallPlugin,
    handleInstallNext,
    handleInstallBack,
    getUninstallMessage,
    apiAdapter,
    customRowActions,
  };
}