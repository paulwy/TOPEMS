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
