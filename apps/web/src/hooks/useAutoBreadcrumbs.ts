import { useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import { navigationRegistry, type NavItem } from '@/lib/NavigationRegistry';

export interface AutoBreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  isDynamic?: boolean;
  paramName?: string;
  paramValue?: string;
}

export interface UseAutoBreadcrumbsOptions {
  includeHome?: boolean;
  homePath?: string;
  homeLabel?: string;
  fallbackToPath?: boolean;
  customItems?: AutoBreadcrumbItem[];
  dynamicTitleResolver?: (paramName: string, paramValue: string) => string | undefined;
}

export function useAutoBreadcrumbs(
  options: UseAutoBreadcrumbsOptions = {}
): AutoBreadcrumbItem[] {
  const {
    includeHome = true,
    homePath = '/dashboard',
    homeLabel = '首页',
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
      const pathItems = generatePathBreadcrumbs(currentPath, includeHome);
      result.push(...pathItems);
    }

    return mergeWithCustomItems(result, customItems);
  }, [currentPath, includeHome, homePath, homeLabel, fallbackToPath, customItems, dynamicTitleResolver]);

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
  const pathSegments = path.split('/').filter(Boolean);
  const matchedItems: AutoBreadcrumbItem[] = [];
  let currentItems = allNavItems;
  let matchedPath = '';

  for (let i = 0; i < pathSegments.length; i++) {
    const segment = pathSegments[i];
    const currentPathSegment = `/${segment}`;
    const testPath = matchedPath + currentPathSegment;

    let matchedItem: NavItem | null = null;
    let isDynamic = false;
    let paramName = '';
    let paramValue = '';

    for (const item of currentItems) {
      if (item.path === testPath) {
        matchedItem = item;
        break;
      }

      if (item.path.includes(':')) {
        const dynamicMatch = matchDynamicRoute(item.path, testPath);
        if (dynamicMatch.matched) {
          matchedItem = item;
          isDynamic = true;
          paramName = dynamicMatch.paramName || '';
          paramValue = dynamicMatch.paramValue || '';
          break;
        }
      }
    }

    if (matchedItem) {
      const label = isDynamic && dynamicTitleResolver
        ? dynamicTitleResolver(paramName, paramValue) || matchedItem.label
        : matchedItem.label;

      const existingIndex = matchedItems.findIndex(
        (item) => item.href === matchedItem!.path
      );

      if (existingIndex === -1) {
        const breadcrumbItem: AutoBreadcrumbItem = {
          label,
          href: isDynamic ? undefined : matchedItem.path,
          isDynamic,
          paramName,
          paramValue,
        };
        matchedItems.push(breadcrumbItem);
      }

      matchedPath = testPath;
      currentItems = matchedItem.children || [];
    } else {
      const parentMatch = findInAllItems(testPath, allNavItems);
      if (parentMatch && !matchedItems.find(m => m.href === parentMatch.path)) {
        matchedItems.push({
          label: parentMatch.label,
          href: parentMatch.path,
        });
        matchedPath = testPath;
        currentItems = parentMatch.children || [];
      }
    }
  }

  return matchedItems;
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
  const items: NavItem[] = [];
  const pluginCodes = navigationRegistry.getAllPluginCodes();
  const topNavItems = navigationRegistry.getTopNavItems();

  pluginCodes.forEach((code) => {
    const sidebarNav = navigationRegistry.getSidebarNavItems(code);
    const topNav = topNavItems.find((item) => item.code === code);

    if (topNav) {
      const itemWithChildren: NavItem = {
        ...topNav,
        children: sidebarNav.length > 0 ? sidebarNav : topNav.children,
      };
      items.push(itemWithChildren);
    } else if (sidebarNav.length > 0) {
      items.push(...sidebarNav);
    }
  });

  return items;
}

function findInAllItems(path: string, items: NavItem[]): NavItem | undefined {
  for (const item of items) {
    if (item.path === path) {
      return item;
    }

    if (item.path.includes(':') && matchDynamicRoute(item.path, path).matched) {
      return item;
    }

    if (item.children) {
      const childMatch = findInAllItems(path, item.children);
      if (childMatch) {
        return childMatch;
      }
    }
  }
  return undefined;
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
    const isDynamic = Boolean(segment.match(/^[a-f0-9-]{36}$/i) || segment.match(/^\d+$/));

    result.push({
      label: isDynamic ? '详情' : formatSegmentLabel(segment),
      href: isLast ? undefined : currentPath,
      isDynamic,
      paramValue: isDynamic ? segment : undefined,
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
    performance: '绩效报表',
    suppliers: '供应商管理',
    supplier: '供应商',
    'purchase-order': '采购订单',
    warehouse: '仓储管理',
    warehouses: '仓库管理',
    logistics: '物流追踪',
    order: '订单管理',
    orders: '采购订单',
    process: '流程管理',
    processes: '流程管理',
    workstation: '工作站',
    workstations: '工作站',
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
    audit: '审计日志',
    system: '系统管理',
    dictionaries: '数据字典',
    plugins: '插件市场',
    definitions: '流程定义',
    designer: '流程设计',
    instances: '流程实例',
    approvals: '审批中心',
    statistics: '统计分析',
    history: '历史记录',
    'inbound-orders': '入库管理',
    'outbound-orders': '出库管理',
    'stock-takes': '盘点管理',
    inbound: '入库管理',
    outbound: '出库管理',
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
    lims: '实验室管理',
    qms: '质量管理',
    mes: '生产执行',
    erp: '企业资源',
    wms: '仓储管理',
    scm: '供应链',
    srm: '供应商管理',
    ehs: '环境健康',
    pdm: '产品数据',
    bi: '商业智能',
    iam: '权限管理',
    workflow: '工作流',
    monitor: '系统监控',
    docs: '文档中心',
    report: '报表中心',
    mobile: '移动配置',
    integration: '系统集成',
    hrm: '人力资源',
    crm: '客户关系',
    pm: '项目管理',
    rs: '研发管理',
    ai: 'AI助手',
    gis: '地理信息',
    im: '即时通讯',
    finance_module: '财务管理',
    notification: '通知中心',
    samples: '样品管理',
    sample: '样品',
    task: '任务',
    instruments: '仪器管理',
    instrument: '仪器',
    standards: '质量标准',
    standard: '质量标准',
    checks: '检验管理',
    check: '安全检查',
    issues: '不合格品',
    improvements: '持续改进',
    hazards: '危险源管理',
    hazard: '危险源',
    incident: '事故报告',
    accidents: '事故记录',
    plan: '应急预案',
    evaluations: '供应商评估',
    sourcing: '寻源管理',
    contracts: '合同管理',
    finance_srm: '财务结算',
    users: '用户管理',
    roles: '角色管理',
    permissions: '权限管理',
    event: '事件',
    events: '事件中心',
    rules: '转换规则',
    'external-erp': '外部ERP',
    connections: '连接管理',
    mappings: '映射配置',
  };

  return (
    labelMap[segment] ||
    segment
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  );
}