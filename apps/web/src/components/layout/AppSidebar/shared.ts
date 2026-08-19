import type { Theme } from '@mui/material/styles';
import type { NavItem } from '@/lib/navigation/types';
import { navigationRegistryV2 } from '@/lib/navigation';

export const moduleToService: Record<string, string> = {
  // unified-core 虚拟服务（共用端口 8000）
  admin: 'unified-core',
  iam: 'unified-core',
  doc: 'unified-core',
  workflow: 'unified-core',
  plugin: 'unified-core',
  automation: 'unified-core',

  // 独立服务
  rs: 'rd',
  rd: 'rd',
  lims: 'lims',
  ai: 'ai',
  qms: 'qms',
  ehs: 'ehs',
  srm: 'srm',
  pdm: 'pdm',
  crm: 'crm',
  mes: 'mes',
  hrm: 'hrm',
  erp: 'erp',
  gis: 'gis',
  pm: 'pm',
  bi: 'bi',
  report: 'bi',
  integration: 'integration',
  portal: 'portal',
  scm: 'scm',
  wms: 'wms',
  mobile: 'mobile',
  finance: 'finance',
  monitor: 'monitor',

  // communication 服务（端口 8084）
  im: 'communication',
  notification: 'communication',
  mail: 'communication',

  // 别名
  contract: 'hrm',
  oa: 'erp',
  asset: 'erp',
};

const PLATFORM_ROOT_PATHS = new Set(['dashboard', 'login', 'register', 'settings', 'profile']);

export function getModuleFromPath(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return null;
  return segments[0];
}

export function getNavigablePath(path: string): string | null {
  if (!path) return null;
  if (path.includes(':id')) {
    const segments = path.split('/').filter(Boolean);
    const paramIndex = segments.findIndex((s) => s.startsWith(':'));
    if (paramIndex > 0) {
      return `/${segments.slice(0, paramIndex).join('/')}`;
    }
    return null;
  }
  return path;
}

export function isPlatformPath(pathname: string): boolean {
  const mod = getModuleFromPath(pathname);
  if (!mod) return true;
  if (PLATFORM_ROOT_PATHS.has(mod)) return true;
  const allModuleCodes = navigationRegistryV2.getAllModuleCodes();
  return !allModuleCodes.includes(mod);
}

export const navItemSx = (collapsed: boolean, isActive: boolean, _hasPath: boolean) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 1.5,
  px: collapsed ? 0 : 1.5,
  py: 1.25,
  borderRadius: 1,
  cursor: 'pointer',
  border: 'none',
  background: 'none',
  padding: 0,
  borderLeft: '3px solid',
  borderLeftColor: isActive ? 'primary.main' : 'transparent',
  bgcolor: isActive ? 'primary.50' : 'transparent',
  color: isActive ? 'primary.main' : 'text.secondary',
  transition: (theme: Theme) => `all 200ms ${theme.transitions.easing.easeInOut}`,
  justifyContent: collapsed ? 'center' : 'flex-start',
  position: 'relative' as const,
  width: '100%',
  '&:hover': {
    bgcolor: isActive ? 'primary.50' : 'action.hover',
    color: 'text.primary',
    transform: 'translateX(2px)',
  },
  '&:active': {
    transform: 'translateX(1px) scale(0.99)',
  },
  '&:focus-visible': {
    outline: '2px solid',
    outlineColor: 'primary.main',
    outlineOffset: -2,
  },
});

export function getAllNavItems(): NavItem[] {
  const items: NavItem[] = [];
  const topItems = navigationRegistryV2.getTopNavItems(() => true);

  const collectItems = (navItems: NavItem[]) => {
    navItems.forEach((item) => {
      if (item.path) items.push(item);
      if (item.children) collectItems(item.children);
    });
  };

  topItems.forEach((item) => {
    if (item.path) items.push(item);
    if (item.children) collectItems(item.children);
  });

  return items;
}
