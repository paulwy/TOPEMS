import { useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import { navigationRegistryV2 } from '@/lib/navigation';
import type { NavItem } from '@/lib/navigation/types';
import { DASHBOARD_PATHS } from '@/routes/dashboard';
import i18n from '@/i18n';

interface AutoBreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  isDynamic?: boolean;
  paramName?: string;
  paramValue?: string;
}

interface UseAutoBreadcrumbsOptions {
  includeHome?: boolean;
  homePath?: string;
  homeLabel?: string;
  fallbackToPath?: boolean;
  customItems?: AutoBreadcrumbItem[];
  dynamicTitleResolver?: (paramName: string, paramValue: string) => string | undefined;
}

export function useAutoBreadcrumbs(options: UseAutoBreadcrumbsOptions = {}): AutoBreadcrumbItem[] {
  const {
    includeHome = true,
    homePath = DASHBOARD_PATHS.dashboard,
    homeLabel = i18n.t('shared.use_auto_breadcrumbs.k0'),
    fallbackToPath = true,
    customItems,
    dynamicTitleResolver,
  } = options;

  const location = useLocation();
  const currentPath = location.pathname;

  const breadcrumbs = useMemo((): AutoBreadcrumbItem[] => {
    const result: AutoBreadcrumbItem[] = [];

    if (includeHome) {
      result.push({ label: homeLabel, href: homePath });
    }

    if (!currentPath || currentPath === '/' || currentPath === homePath) {
      return mergeWithCustomItems(result, customItems);
    }

    const matchedItems = findMatchingNavItems(currentPath, dynamicTitleResolver);

    if (matchedItems.length > 0) {
      result.push(...matchedItems);
    } else if (fallbackToPath) {
      const pathItems = generateSmartFallbackBreadcrumbs(
        currentPath,
        includeHome,
        dynamicTitleResolver
      );
      result.push(...pathItems);
    }

    return mergeWithCustomItems(result, customItems);
  }, [
    currentPath,
    includeHome,
    homePath,
    homeLabel,
    fallbackToPath,
    customItems,
    dynamicTitleResolver,
  ]);

  return breadcrumbs;
}

function mergeWithCustomItems(
  baseItems: AutoBreadcrumbItem[],
  customItems?: AutoBreadcrumbItem[]
): AutoBreadcrumbItem[] {
  if (!customItems || customItems.length === 0) {
    return baseItems;
  }

  const lastIndex = baseItems.length - 1;
  const result = [...baseItems];

  customItems.forEach((item, index) => {
    const isLastCustom = index === customItems.length - 1;

    const existingIndex = result.findIndex((b) => b.href === item.href);
    if (existingIndex !== -1) {
      result[existingIndex] = { ...result[existingIndex], ...item };
    } else {
      if (isLastCustom) {
        if (result.length > 0) {
          const lastBase = result[result.length - 1];
          if (lastBase.href) {
            result.push(item);
          } else {
            result[result.length - 1] = item;
          }
        } else {
          result.push(item);
        }
      } else {
        result.splice(lastIndex, 0, item);
      }
    }
  });

  return result;
}

function findMatchingNavItems(
  path: string,
  dynamicTitleResolver?: (paramName: string, paramValue: string) => string | undefined
): AutoBreadcrumbItem[] {
  const allNavItems = getAllNavItemsWithHierarchy();

  const result = findBestPathMatch(path, allNavItems, dynamicTitleResolver);

  if (result.length > 0) {
    return result;
  }

  return findDetailPageWithParent(path, allNavItems, dynamicTitleResolver);
}

interface PathMatchResult {
  items: AutoBreadcrumbItem[];
  matchedLength: number;
}

function findBestPathMatch(
  path: string,
  allNavItems: NavItem[],
  dynamicTitleResolver?: (paramName: string, paramValue: string) => string | undefined
): AutoBreadcrumbItem[] {
  const allResults: PathMatchResult[] = [];

  function traverse(
    items: NavItem[],
    currentPath: string,
    breadcrumbs: AutoBreadcrumbItem[]
  ): void {
    for (const item of items) {
      const itemPath = item.path;

      let exactMatch = false;
      let isDynamic = false;
      let paramName = '';
      let paramValue = '';

      if (itemPath === path) {
        exactMatch = true;
      } else if (itemPath.includes(':')) {
        const dynamicMatch = matchDynamicRoute(itemPath, path);
        if (dynamicMatch.matched) {
          exactMatch = true;
          isDynamic = true;
          paramName = dynamicMatch.paramName || '';
          paramValue = dynamicMatch.paramValue || '';
        }
      }

      if (exactMatch) {
        const label =
          isDynamic && dynamicTitleResolver
            ? dynamicTitleResolver(paramName, paramValue) || item.label
            : item.label;

        const actualPath = isDynamic ? path : itemPath;

        const newBreadcrumbs = [
          ...breadcrumbs,
          {
            label,
            href: actualPath,
            isDynamic,
            paramName,
            paramValue,
          },
        ];

        allResults.push({
          items: newBreadcrumbs,
          matchedLength: path.split('/').filter(Boolean).length,
        });
        continue;
      }

      if (path.startsWith(`${itemPath}/`) || isParentPath(itemPath, path)) {
        const childBreadcrumbs = [
          ...breadcrumbs,
          {
            label: item.label,
            href: itemPath,
          },
        ];

        if (item.children && item.children.length > 0) {
          traverse(item.children, currentPath, childBreadcrumbs);
        }
      }
    }
  }

  traverse(allNavItems, '', []);

  if (allResults.length === 0) {
    return [];
  }

  allResults.sort((a, b) => b.matchedLength - a.matchedLength);
  return allResults[0].items;
}

function isParentPath(parentPath: string, childPath: string): boolean {
  const parentSegments = parentPath.split('/').filter(Boolean);
  const childSegments = childPath.split('/').filter(Boolean);

  if (parentSegments.length >= childSegments.length) {
    return false;
  }

  for (let i = 0; i < parentSegments.length; i++) {
    const parentSeg = parentSegments[i];
    const childSeg = childSegments[i];

    if (parentSeg.startsWith(':')) {
      continue;
    }

    if (parentSeg !== childSeg) {
      return false;
    }
  }

  return true;
}

function findDetailPageWithParent(
  path: string,
  allNavItems: NavItem[],
  dynamicTitleResolver?: (paramName: string, paramValue: string) => string | undefined
): AutoBreadcrumbItem[] {
  const pathSegments = path.split('/').filter(Boolean);

  if (pathSegments.length < 2) {
    return [];
  }

  const lastSegment = pathSegments[pathSegments.length - 1];
  const isDetailId = /^[a-f0-9-]{36}$/i.test(lastSegment) || /^\d+$/.test(lastSegment);

  if (!isDetailId && !isDetailPageSegment(lastSegment)) {
    return [];
  }

  for (let i = pathSegments.length - 2; i >= 0; i--) {
    const parentPath = `/${pathSegments.slice(0, i + 1).join('/')}`;
    const parentItem = findNavItemByPath(parentPath, allNavItems);

    if (parentItem) {
      const result: AutoBreadcrumbItem[] = [];

      const parentHierarchy = findItemHierarchy(parentPath, allNavItems);
      result.push(...parentHierarchy);

      const detailLabel = isDetailId
        ? dynamicTitleResolver
          ? dynamicTitleResolver('id', lastSegment) || i18n.t('shared.use_auto_breadcrumbs.k1')
          : i18n.t('shared.use_auto_breadcrumbs.k2')
        : formatSegmentLabel(lastSegment);

      result.push({
        label: detailLabel,
        isDynamic: isDetailId,
        paramName: 'id',
        paramValue: isDetailId ? lastSegment : undefined,
      });

      return result;
    }

    const pluralParent = findPluralParentPath(parentPath, allNavItems);
    if (pluralParent) {
      const result: AutoBreadcrumbItem[] = [];

      const parentHierarchy = findItemHierarchy(pluralParent.path, allNavItems);
      result.push(...parentHierarchy);

      const detailLabel = isDetailId
        ? dynamicTitleResolver
          ? dynamicTitleResolver('id', lastSegment) || i18n.t('shared.use_auto_breadcrumbs.k3')
          : i18n.t('shared.use_auto_breadcrumbs.k4')
        : formatSegmentLabel(lastSegment);

      result.push({
        label: detailLabel,
        isDynamic: isDetailId,
        paramName: 'id',
        paramValue: isDetailId ? lastSegment : undefined,
      });

      return result;
    }
  }

  return [];
}

function isDetailPageSegment(segment: string): boolean {
  const detailKeywords = ['detail', 'view', 'edit', 'create', 'show'];
  return detailKeywords.includes(segment.toLowerCase());
}

function findPluralParentPath(singularPath: string, allNavItems: NavItem[]): NavItem | undefined {
  const pathSegments = singularPath.split('/').filter(Boolean);
  if (pathSegments.length === 0) return undefined;

  const lastSegment = pathSegments[pathSegments.length - 1];

  const pluralVariants = [`${lastSegment}s`, `${lastSegment}es`, lastSegment.replace(/y$/, 'ies')];

  for (const variant of pluralVariants) {
    const testPath = `/${[...pathSegments.slice(0, -1), variant].join('/')}`;
    const item = findNavItemByPath(testPath, allNavItems);
    if (item) return item;
  }

  return undefined;
}

function findNavItemByPath(path: string, _items: NavItem[]): NavItem | undefined {
  return navigationRegistryV2.findNavItemByPath(path);
}

function findItemHierarchy(path: string, _allNavItems: NavItem[]): AutoBreadcrumbItem[] {
  const navHierarchy = navigationRegistryV2.getNavHierarchy(path);
  return navHierarchy.map((item) => ({
    label: item.label,
    href: item.path,
  }));
}

interface DynamicMatchResult {
  matched: boolean;
  paramName?: string;
  paramValue?: string;
}

function matchDynamicRoute(routePath: string, currentPath: string): DynamicMatchResult {
  const routeSegments = routePath.split('/').filter(Boolean);
  const pathSegments = currentPath.split('/').filter(Boolean);

  if (routeSegments.length !== pathSegments.length) {
    return { matched: false };
  }

  let paramName = '';
  let paramValue = '';

  for (let i = 0; i < routeSegments.length; i++) {
    const routeSegment = routeSegments[i];
    const pathSegment = pathSegments[i];

    if (routeSegment.startsWith(':')) {
      paramName = routeSegment.slice(1);
      paramValue = pathSegment;
    } else if (routeSegment !== pathSegment) {
      return { matched: false };
    }
  }

  return { matched: true, paramName, paramValue };
}

function getAllNavItemsWithHierarchy(): NavItem[] {
  const allItems: NavItem[] = [];
  const topItems = navigationRegistryV2.getTopNavItems(() => true);

  const collectItems = (items: NavItem[]) => {
    items.forEach((item) => {
      allItems.push(item);
      if (item.children) collectItems(item.children);
    });
  };

  collectItems(topItems);
  return allItems;
}

function generateSmartFallbackBreadcrumbs(
  path: string,
  skipHome: boolean,
  dynamicTitleResolver?: (paramName: string, paramValue: string) => string | undefined
): AutoBreadcrumbItem[] {
  const segments = path.split('/').filter(Boolean);
  const result: AutoBreadcrumbItem[] = [];
  let currentPath = '';

  const allNavItems = getAllNavItemsWithHierarchy();

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;

    if (skipHome && i === 0 && segment === 'dashboard') {
      continue;
    }

    const isLast = i === segments.length - 1;
    const isDynamic = Boolean(segment.match(/^[a-f0-9-]{36}$/i) || segment.match(/^\d+$/));

    const navItem = findNavItemByPath(currentPath, allNavItems);

    let label: string;
    let href: string | undefined;

    if (navItem) {
      label = navItem.label;
      href = isLast ? undefined : currentPath;
    } else if (isDynamic) {
      label = dynamicTitleResolver
        ? dynamicTitleResolver('id', segment) || i18n.t('shared.use_auto_breadcrumbs.k5')
        : i18n.t('shared.use_auto_breadcrumbs.k6');
      href = undefined;
    } else {
      const pluralMatch = findPluralParentPath(currentPath, allNavItems);
      if (pluralMatch) {
        label = pluralMatch.label;
        href = isLast ? undefined : pluralMatch.path;
      } else {
        label = formatSegmentLabel(segment);
        href = isLast ? undefined : currentPath;
      }
    }

    result.push({
      label,
      href,
      isDynamic,
      paramValue: isDynamic ? segment : undefined,
    });
  }

  return optimizeBreadcrumbHierarchy(result, allNavItems);
}

function optimizeBreadcrumbHierarchy(
  items: AutoBreadcrumbItem[],
  _allNavItems: NavItem[]
): AutoBreadcrumbItem[] {
  if (items.length <= 1) return items;

  const result: AutoBreadcrumbItem[] = [];
  const seenHrefs = new Set<string>();

  for (const item of items) {
    if (item.href && seenHrefs.has(item.href)) {
      continue;
    }

    if (item.href) {
      seenHrefs.add(item.href);
    }

    result.push(item);
  }

  return result;
}

function formatSegmentLabel(segment: string): string {
  if (segment.startsWith(':')) {
    return segment.slice(1);
  }

  const labelMap: Record<string, string> = {
    dashboard: i18n.t('shared.use_auto_breadcrumbs.k7'),
    customers: i18n.t('shared.use_auto_breadcrumbs.k8'),
    opportunities: i18n.t('shared.use_auto_breadcrumbs.k9'),
    activities: i18n.t('shared.use_auto_breadcrumbs.k10'),
    reports: i18n.t('shared.use_auto_breadcrumbs.k11'),
    finance: i18n.t('shared.use_auto_breadcrumbs.k12'),
    inventory: i18n.t('shared.use_auto_breadcrumbs.k13'),
    sales: i18n.t('shared.use_auto_breadcrumbs.k14'),
    projects: i18n.t('shared.use_auto_breadcrumbs.k15'),
    tasks: i18n.t('shared.use_auto_breadcrumbs.k16'),
    gantt: i18n.t('shared.use_auto_breadcrumbs.k17'),
    risk: i18n.t('shared.use_auto_breadcrumbs.k18'),
    contract: i18n.t('shared.use_auto_breadcrumbs.k19'),
    timeline: i18n.t('shared.use_auto_breadcrumbs.k20'),
    employees: i18n.t('shared.use_auto_breadcrumbs.k21'),
    recruitment: i18n.t('shared.use_auto_breadcrumbs.k22'),
    training: i18n.t('shared.use_auto_breadcrumbs.k23'),
    performance: i18n.t('shared.use_auto_breadcrumbs.k24'),
    suppliers: i18n.t('shared.use_auto_breadcrumbs.k25'),
    supplier: i18n.t('shared.use_auto_breadcrumbs.k26'),
    'purchase-order': i18n.t('shared.use_auto_breadcrumbs.k27'),
    warehouse: i18n.t('shared.use_auto_breadcrumbs.k28'),
    warehouses: i18n.t('shared.use_auto_breadcrumbs.k29'),
    logistics: i18n.t('shared.use_auto_breadcrumbs.k30'),
    order: i18n.t('shared.use_auto_breadcrumbs.k31'),
    orders: i18n.t('shared.use_auto_breadcrumbs.k32'),
    process: i18n.t('shared.use_auto_breadcrumbs.k33'),
    processes: i18n.t('shared.use_auto_breadcrumbs.k34'),
    workstation: i18n.t('shared.use_auto_breadcrumbs.k35'),
    workstations: i18n.t('shared.use_auto_breadcrumbs.k36'),
    equipment: i18n.t('shared.use_auto_breadcrumbs.k37'),
    quality: i18n.t('shared.use_auto_breadcrumbs.k38'),
    settings: i18n.t('shared.use_auto_breadcrumbs.k39'),
    detail: i18n.t('shared.use_auto_breadcrumbs.k40'),
    edit: i18n.t('shared.use_auto_breadcrumbs.k41'),
    create: i18n.t('shared.use_auto_breadcrumbs.k42'),
    list: i18n.t('shared.use_auto_breadcrumbs.k43'),
    form: i18n.t('shared.use_auto_breadcrumbs.k44'),
    overview: i18n.t('shared.use_auto_breadcrumbs.k45'),
    analytics: i18n.t('shared.use_auto_breadcrumbs.k46'),
    comparison: i18n.t('shared.use_auto_breadcrumbs.k47'),
    datasources: i18n.t('shared.use_auto_breadcrumbs.k48'),
    visualizations: i18n.t('shared.use_auto_breadcrumbs.k49'),
    read: i18n.t('shared.use_auto_breadcrumbs.k50'),
    write: i18n.t('shared.use_auto_breadcrumbs.k51'),
    audit: i18n.t('shared.use_auto_breadcrumbs.k52'),
    system: i18n.t('shared.use_auto_breadcrumbs.k53'),
    dictionaries: i18n.t('shared.use_auto_breadcrumbs.k54'),
    plugins: i18n.t('shared.use_auto_breadcrumbs.k55'),
    definitions: i18n.t('shared.use_auto_breadcrumbs.k56'),
    designer: i18n.t('shared.use_auto_breadcrumbs.k57'),
    instances: i18n.t('shared.use_auto_breadcrumbs.k58'),
    approvals: i18n.t('shared.use_auto_breadcrumbs.k59'),
    statistics: i18n.t('shared.use_auto_breadcrumbs.k60'),
    history: i18n.t('shared.use_auto_breadcrumbs.k61'),
    'inbound-orders': i18n.t('shared.use_auto_breadcrumbs.k62'),
    'outbound-orders': i18n.t('shared.use_auto_breadcrumbs.k63'),
    'stock-takes': i18n.t('shared.use_auto_breadcrumbs.k64'),
    inbound: i18n.t('shared.use_auto_breadcrumbs.k65'),
    outbound: i18n.t('shared.use_auto_breadcrumbs.k66'),
    stats: i18n.t('shared.use_auto_breadcrumbs.k67'),
    formula: i18n.t('shared.use_auto_breadcrumbs.k68'),
    batch: i18n.t('shared.use_auto_breadcrumbs.k69'),
    step: i18n.t('shared.use_auto_breadcrumbs.k70'),
    bom: i18n.t('shared.use_auto_breadcrumbs.bom_0'),
    version: i18n.t('shared.use_auto_breadcrumbs.k71'),
    'product-config': i18n.t('shared.use_auto_breadcrumbs.k72'),
    metrics: i18n.t('shared.use_auto_breadcrumbs.k73'),
    alerts: i18n.t('shared.use_auto_breadcrumbs.k74'),
    documents: i18n.t('shared.use_auto_breadcrumbs.k75'),
    'document-center': i18n.t('shared.use_auto_breadcrumbs.k76'),
    'knowledge-base': i18n.t('shared.use_auto_breadcrumbs.k77'),
    templates: i18n.t('shared.use_auto_breadcrumbs.k78'),
    help: i18n.t('shared.use_auto_breadcrumbs.k79'),
    notifications: i18n.t('shared.use_auto_breadcrumbs.k80'),
    archive: i18n.t('shared.use_auto_breadcrumbs.k81'),
    schedules: i18n.t('shared.use_auto_breadcrumbs.k82'),
    subscriptions: i18n.t('shared.use_auto_breadcrumbs.k83'),
    scan: i18n.t('shared.use_auto_breadcrumbs.k84'),
    'offline-sync': i18n.t('shared.use_auto_breadcrumbs.k85'),
    lims: i18n.t('shared.use_auto_breadcrumbs.k86'),
    qms: i18n.t('shared.use_auto_breadcrumbs.k87'),
    mes: i18n.t('shared.use_auto_breadcrumbs.k88'),
    erp: i18n.t('shared.use_auto_breadcrumbs.k89'),
    wms: i18n.t('shared.use_auto_breadcrumbs.k90'),
    scm: i18n.t('shared.use_auto_breadcrumbs.k91'),
    srm: i18n.t('shared.use_auto_breadcrumbs.k92'),
    ehs: i18n.t('shared.use_auto_breadcrumbs.k93'),
    pdm: i18n.t('shared.use_auto_breadcrumbs.k94'),
    bi: i18n.t('shared.use_auto_breadcrumbs.k95'),
    iam: i18n.t('shared.use_auto_breadcrumbs.k96'),
    workflow: i18n.t('shared.use_auto_breadcrumbs.k97'),
    monitor: i18n.t('shared.use_auto_breadcrumbs.k98'),
    docs: i18n.t('shared.use_auto_breadcrumbs.k99'),
    report: i18n.t('shared.use_auto_breadcrumbs.k100'),
    mobile: i18n.t('shared.use_auto_breadcrumbs.k101'),
    integration: i18n.t('shared.use_auto_breadcrumbs.k102'),
    hrm: i18n.t('shared.use_auto_breadcrumbs.k103'),
    crm: i18n.t('shared.use_auto_breadcrumbs.k104'),
    pm: i18n.t('shared.use_auto_breadcrumbs.k105'),
    rs: i18n.t('shared.use_auto_breadcrumbs.k106'),
    ai: i18n.t('shared.use_auto_breadcrumbs.ai_1'),
    gis: i18n.t('shared.use_auto_breadcrumbs.k107'),
    im: i18n.t('shared.use_auto_breadcrumbs.k108'),
    finance_module: i18n.t('shared.use_auto_breadcrumbs.k109'),
    notification: i18n.t('shared.use_auto_breadcrumbs.k110'),
    samples: i18n.t('shared.use_auto_breadcrumbs.k111'),
    sample: i18n.t('shared.use_auto_breadcrumbs.k112'),
    task: i18n.t('shared.use_auto_breadcrumbs.k113'),
    instruments: i18n.t('shared.use_auto_breadcrumbs.k114'),
    instrument: i18n.t('shared.use_auto_breadcrumbs.k115'),
    standards: i18n.t('shared.use_auto_breadcrumbs.k116'),
    standard: i18n.t('shared.use_auto_breadcrumbs.k117'),
    checks: i18n.t('shared.use_auto_breadcrumbs.k118'),
    check: i18n.t('shared.use_auto_breadcrumbs.k119'),
    issues: i18n.t('shared.use_auto_breadcrumbs.k120'),
    improvements: i18n.t('shared.use_auto_breadcrumbs.k121'),
    hazards: i18n.t('shared.use_auto_breadcrumbs.k122'),
    hazard: i18n.t('shared.use_auto_breadcrumbs.k123'),
    incident: i18n.t('shared.use_auto_breadcrumbs.k124'),
    accidents: i18n.t('shared.use_auto_breadcrumbs.k125'),
    plan: i18n.t('shared.use_auto_breadcrumbs.k126'),
    evaluations: i18n.t('shared.use_auto_breadcrumbs.k127'),
    sourcing: i18n.t('shared.use_auto_breadcrumbs.k128'),
    contracts: i18n.t('shared.use_auto_breadcrumbs.k129'),
    finance_srm: i18n.t('shared.use_auto_breadcrumbs.k130'),
    users: i18n.t('shared.use_auto_breadcrumbs.k131'),
    roles: i18n.t('shared.use_auto_breadcrumbs.k132'),
    permissions: i18n.t('shared.use_auto_breadcrumbs.k133'),
    event: i18n.t('shared.use_auto_breadcrumbs.k134'),
    events: i18n.t('shared.use_auto_breadcrumbs.k135'),
    rules: i18n.t('shared.use_auto_breadcrumbs.k136'),
    'external-erp': i18n.t('shared.use_auto_breadcrumbs.erp_137'),
    connections: i18n.t('shared.use_auto_breadcrumbs.k138'),
    mappings: i18n.t('shared.use_auto_breadcrumbs.k139'),
    plugin: i18n.t('shared.use_auto_breadcrumbs.k140'),
    marketplace: i18n.t('shared.use_auto_breadcrumbs.k141'),
  };

  return (
    labelMap[segment] ||
    segment
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  );
}
