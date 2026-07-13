import type { SearchResult } from '@/api/search';
import type { GroupedResults } from './types';

export const SEARCH_HISTORY_KEY = 'topems_search_history';
export const MAX_HISTORY_ITEMS = 10;

export const moduleLabels: Record<string, string> = {
  user: '用户管理',
  customer: '客户管理',
  order: '订单管理',
  product: '产品管理',
  document: '文档中心',
  admin: '系统管理',
};

export const searchSuggestions = [
  '用户管理',
  '用户列表',
  '用户角色',
  '用户权限',
  '客户管理',
  '客户列表',
  '客户跟进',
  '客户合同',
  '订单管理',
  '销售订单',
  '采购订单',
  '订单审批',
  '产品管理',
  '产品列表',
  '产品分类',
  '库存管理',
  '库存盘点',
  '库存预警',
  '财务管理',
  '财务报表',
  '费用报销',
  '审批流程',
  '采购审批',
  '请假审批',
  '报销审批',
  '系统设置',
  '角色管理',
  '权限管理',
  '数据字典',
  '系统日志',
  '报表中心',
  '销售报表',
  '采购报表',
  '库存报表',
  '我的任务',
  '待办事项',
  '已办事项',
  '通知中心',
  '消息通知',
];

export const getModuleLabel = (module: string) => {
  return moduleLabels[module] || module;
};

export const getModuleColor = (module: string, theme: any) => {
  const colors: Record<string, string> = {
    user: theme.palette.primary.main,
    customer: theme.palette.success.main,
    order: theme.palette.warning.main,
    product: theme.palette.secondary.main,
    document: theme.palette.info.main,
    admin: theme.palette.error.main,
  };
  return colors[module] || theme.palette.text.secondary;
};

export const groupResultsByModule = (results: SearchResult[]): GroupedResults[] => {
  const groups = new Map<string, SearchResult[]>();
  results.forEach((result) => {
    if (!groups.has(result.module)) {
      groups.set(result.module, []);
    }
    groups.get(result.module)!.push(result);
  });
  return Array.from(groups.entries()).map(([module, results]) => ({
    module,
    label: getModuleLabel(module),
    results,
  }));
};

export const loadSearchHistory = (): string[] => {
  try {
    const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const saveSearchHistory = (history: string[]) => {
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
  } catch {
    // ignore
  }
};

export const getSearchSuggestions = (query: string, limit = 6): string[] => {
  if (!query.trim()) return [];
  const lowerQuery = query.toLowerCase();
  return searchSuggestions
    .filter((s) => s.toLowerCase().includes(lowerQuery))
    .slice(0, limit);
};

