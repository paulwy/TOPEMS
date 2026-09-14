interface L1BusinessDomain {
  key: string;
  title: string;
  /** i18n key for the title; when present, caller should translate at render time */
  titleKey?: string;
  order: number;
  icon: string;
}

export const L1_BUSINESS_DOMAINS: L1BusinessDomain[] = [
  {
    key: 'workbench',
    title: '',
    titleKey: 'shared.constants.k0',
    order: 1,
    icon: 'LayoutDashboard',
  },
  { key: 'core', title: '', titleKey: 'shared.constants.k1', order: 2, icon: 'Building2' },
  { key: 'operation', title: '', titleKey: 'shared.constants.k2', order: 3, icon: 'Briefcase' },
  { key: 'manufacturing', title: '', titleKey: 'shared.constants.k3', order: 4, icon: 'Factory' },
  { key: 'quality', title: '', titleKey: 'shared.constants.k4', order: 5, icon: 'ShieldCheck' },
  { key: 'supply', title: '', titleKey: 'shared.constants.k5', order: 6, icon: 'Truck' },
  { key: 'finance_hr', title: '', titleKey: 'shared.constants.k6', order: 7, icon: 'Wallet' },
  { key: 'data_ai', title: '', titleKey: 'shared.constants.ai_7', order: 8, icon: 'Sparkles' },
  { key: 'system', title: '', titleKey: 'shared.constants.k8', order: 9, icon: 'Settings' },
  { key: 'profile', title: '', titleKey: 'shared.constants.k9', order: 10, icon: 'User' },
];

export const L2_TO_L1_MAP: Record<string, string> = {
  iam: 'core',
  workflow: 'core',
  notification: 'core',
  integration: 'core',
  automation: 'core',
  erp: 'core',
  pdm: 'core',
  crm: 'operation',
  pm: 'operation',
  rd: 'operation',
  doc: 'operation',
  oa: 'operation',
  im: 'operation',
  ticket: 'operation',
  mes: 'manufacturing',
  ehs: 'manufacturing',
  qms: 'quality',
  lims: 'quality',
  scm: 'supply',
  wms: 'supply',
  srm: 'supply',
  finance: 'finance_hr',
  hrm: 'finance_hr',
  asset: 'finance_hr',
  bi: 'data_ai',
  report: 'data_ai',
  ai: 'data_ai',
  gis: 'data_ai',
  admin: 'system',
  monitor: 'system',
  // [V2026.08 已移除] lowcode 空壳占位服务
  plugin: 'system',
  mobile: 'workbench',
};

export const L2_MODULE_ORDER: Record<string, number> = {
  iam: 1,
  workflow: 2,
  notification: 3,
  integration: 4,
  automation: 5,
  erp: 6,
  pdm: 7,
  crm: 1,
  pm: 2,
  rd: 3,
  doc: 4,
  oa: 5,
  im: 6,
  ticket: 7,
  mes: 1,
  ehs: 2,
  qms: 1,
  lims: 2,
  scm: 1,
  wms: 2,
  srm: 3,
  finance: 1,
  hrm: 2,
  asset: 3,
  bi: 1,
  report: 2,
  ai: 3,
  gis: 4,
  admin: 1,
  monitor: 2,
  plugin: 4,
  mobile: 1,
};
