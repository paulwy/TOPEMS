import { useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import { navigationRegistry, type NavItem } from '@/lib/NavigationRegistry';

interface AutoBreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

interface UseAutoBreadcrumbsOptions {
  /** 是否忽略首页（默认包含） */
  includeHome?: boolean;
  /** 自定义首页路径 */
  homePath?: string;
  /** 自定义首页标签 */
  homeLabel?: string;
  /** 当无法匹配时是否使用路径分段作为标签 */
  fallbackToPath?: boolean;
}

export function useAutoBreadcrumbs(
  options: UseAutoBreadcrumbsOptions = {}
): AutoBreadcrumbItem[] {
  const {
    includeHome = true,
    homePath = '/dashboard',
    homeLabel = '首页',
    fallbackToPath = true,
  } = options;

  const location = useLocation();
  const currentPath = location.pathname;

  const breadcrumbs = useMemo((): AutoBreadcrumbItem[] => {
    const result: AutoBreadcrumbItem[] = [];

    if (includeHome) {
      result.push({ label: homeLabel, href: homePath });
    }

    if (!currentPath || currentPath === '/' || currentPath === homePath) {
      return result;
    }

    const matchedItems = findMatchingNavItems(currentPath);

    if (matchedItems.length > 0) {
      result.push(...matchedItems);
    } else if (fallbackToPath) {
      const pathItems = generatePathBreadcrumbs(currentPath, includeHome);
      result.push(...pathItems);
    }

    return result;
  }, [currentPath, includeHome, homePath, homeLabel, fallbackToPath]);

  return breadcrumbs;
}

function findMatchingNavItems(path: string): AutoBreadcrumbItem[] {
  const allNavItems = getAllNavItems();
  const pathSegments = path.split('/').filter(Boolean);
  const matchedItems: AutoBreadcrumbItem[] = [];

  for (let i = 1; i <= pathSegments.length; i++) {
    const currentPath = `/${pathSegments.slice(0, i).join('/')}`;
    const matchedItem = findBestMatch(currentPath, allNavItems);

    if (matchedItem) {
      const existingIndex = matchedItems.findIndex(
        (item) => item.href === matchedItem.path
      );

      if (existingIndex === -1) {
        matchedItems.push({
          label: matchedItem.label,
          href: matchedItem.path,
          icon: matchedItem.icon,
        });
      }
    }
  }

  const lastItem = matchedItems[matchedItems.length - 1];
  if (lastItem && lastItem.href && lastItem.href !== path) {
    const tailSegments = pathSegments.slice(
      lastItem.href.split('/').filter(Boolean).length
    );

    if (tailSegments.length > 0) {
      const tailPath = `${lastItem.href}/${tailSegments.join('/')}`;

      const tailMatch = findBestMatch(tailPath, allNavItems);
      if (tailMatch && tailMatch.path !== lastItem.href) {
        matchedItems.push({
          label: tailMatch.label,
          href: tailMatch.path,
          icon: tailMatch.icon,
        });
      }
    }
  }

  return matchedItems;
}

function getAllNavItems(): NavItem[] {
  const items: NavItem[] = [];
  const pluginCodes = navigationRegistry.getAllPluginCodes();

  pluginCodes.forEach((code) => {
    const sidebarNav = navigationRegistry.getSidebarNavItems(code);
    const topNav = navigationRegistry.getTopNavItems();

    items.push(...sidebarNav);

    const pluginTopNav = topNav.find((item) => item.path.startsWith(`/${code}`));
    if (pluginTopNav) {
      items.push(pluginTopNav);
    }
  });

  return items;
}

function findBestMatch(path: string, navItems: NavItem[]): NavItem | undefined {
  for (const item of navItems) {
    if (item.path === path) {
      return item;
    }

    if (item.path.includes(':') && matchDynamicRoute(item.path, path)) {
      return item;
    }

    if (item.children) {
      const childMatch = findBestMatch(path, item.children);
      if (childMatch) {
        return childMatch;
      }
    }
  }

  return undefined;
}

function matchDynamicRoute(routePath: string, currentPath: string): boolean {
  const routeSegments = routePath.split('/').filter(Boolean);
  const pathSegments = currentPath.split('/').filter(Boolean);

  if (routeSegments.length !== pathSegments.length) {
    return false;
  }

  for (let i = 0; i < routeSegments.length; i++) {
    const routeSegment = routeSegments[i];
    const pathSegment = pathSegments[i];

    if (routeSegment.startsWith(':')) {
      continue;
    }

    if (routeSegment !== pathSegment) {
      return false;
    }
  }

  return true;
}

function generatePathBreadcrumbs(path: string, skipHome: boolean): AutoBreadcrumbItem[] {
  const segments = path.split('/').filter(Boolean);
  const result: AutoBreadcrumbItem[] = [];
  let currentPath = '';

  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;

    if (skipHome && index === 0 && segment === 'dashboard') {
      return;
    }

    const isLast = index === segments.length - 1;

    result.push({
      label: formatSegmentLabel(segment),
      href: isLast ? undefined : currentPath,
    });
  });

  return result;
}

function formatSegmentLabel(segment: string): string {
  if (segment.startsWith(':')) {
    return segment.slice(1);
  }

  const labelMap: Record<string, string> = {
    dashboard: '仪表盘',
    customers: '客户管理',
    opportunities: '商机管理',
    activities: '活动管理',
    reports: '报表',
    finance: '财务管理',
    inventory: '库存管理',
    sales: '销售管理',
    projects: '项目管理',
    tasks: '任务管理',
    gantt: '甘特图',
    risk: '风险管理',
    contract: '合同管理',
    timeline: '时间线',
    employees: '员工管理',
    recruitment: '招聘管理',
    training: '培训管理',
    performance: '绩效考核',
    suppliers: '供应商管理',
    'purchase-order': '采购订单',
    warehouse: '仓储管理',
    logistics: '物流追踪',
    order: '订单管理',
    process: '流程管理',
    workstation: '工作站',
    equipment: '设备管理',
    quality: '质量管理',
    settings: '设置',
    detail: '详情',
    edit: '编辑',
    create: '新建',
    list: '列表',
    form: '表单',
    overview: '概览',
    analytics: '数据分析',
    comparison: '对比分析',
    datasources: '数据源',
    visualizations: '可视化',
    read: '阅读',
    write: '编辑',
    audit: '审计',
    system: '系统',
    dictionaries: '数据字典',
    plugins: '插件',
    definitions: '流程定义',
    designer: '流程设计',
    instances: '流程实例',
    approvals: '审批中心',
    statistics: '统计分析',
    history: '历史记录',
    warehouses: '仓库管理',
    'inbound-orders': '入库管理',
    'outbound-orders': '出库管理',
    'stock-takes': '盘点管理',
    stats: '统计概览',
    formula: '配方管理',
    batch: '批次管理',
    step: '步骤管理',
    bom: 'BOM管理',
    version: '版本管理',
    'product-config': '产品配置',
    metrics: '性能指标',
    alerts: '告警中心',
    documents: '文档首页',
    'document-center': '文档库',
    'knowledge-base': '知识库',
    templates: '模板管理',
    help: '帮助中心',
    notifications: '通知列表',
    archive: '归档管理',
    schedules: '定时任务',
    subscriptions: '订阅管理',
    scan: '扫码设置',
    'offline-sync': '离线同步',
    lims: 'LIMS系统',
    qms: '质量管理系统',
    mes: '生产执行系统',
    erp: '企业资源管理',
    wms: '仓储管理系统',
    scm: '供应链管理',
    events: '事件中心',
    rules: '转换规则',
    'external-erp': '外部ERP',
  };

  return (
    labelMap[segment] ||
    segment
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  );
}