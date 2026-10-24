import type React from 'react';
import { useCallback, useMemo, useState } from 'react';
import type { useMutation } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { Play, Square, Trash2, Download } from 'lucide-react';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { QUERY_KEYS } from '@/lib/reactQuery';
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
export const getPluginDisplayNames = (_t: (key: string) => string): Record<string, string> => ({
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
interface UsePluginManagementReturn {
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
