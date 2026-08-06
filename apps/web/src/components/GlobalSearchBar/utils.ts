import type { SearchResult } from '@/api/search';
import type { GroupedResults, SearchFilter, SearchFilterOption } from './types';
import type { Theme } from '@mui/material/styles';

export const SEARCH_HISTORY_KEY = 'topems_search_history';
export const MAX_HISTORY_ITEMS = 10;

export const serviceLabels: Record<string, string> = {
  erp: 'ERP系统',
  crm: '客户管理',
  bi: '商业智能',
  notification: '通知中心',
  doc: '文档中心',
  hrm: '人力资源',
  workflow: '审批中心',
  mes: '生产制造',
};

export const typeLabels: Record<string, string> = {
  user: '用户',
  role: '角色',
  permission: '权限',
  customer: '客户',
  contract: '合同',
  order: '订单',
  purchase: '采购',
  product: '产品',
  category: '分类',
  inventory: '库存',
  document: '文档',
  report: '报表',
  setting: '设置',
  log: '日志',
  task: '任务',
  notification: '通知',
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

export const getServiceLabel = (service: string) => {
  return serviceLabels[service] || service;
};

export const getServiceColor = (service: string, theme: Theme) => {
  const colors: Record<string, string> = {
    erp: theme.palette.primary.main,
    crm: theme.palette.success.main,
    bi: theme.palette.warning.main,
    doc: theme.palette.info.main,
    hrm: theme.palette.secondary.main,
    workflow: theme.palette.error.main,
    mes: theme.palette.primary.dark,
    notification: theme.palette.info.dark,
  };
  return colors[service] || theme.palette.text.secondary;
};

export const getModuleColor = (module: string, theme: Theme) => {
  return getServiceColor(module, theme);
};

export const groupResultsByService = (results: SearchResult[]): GroupedResults[] => {
  const groups = new Map<string, SearchResult[]>();
  results.forEach((result) => {
    if (!groups.has(result.service)) {
      groups.set(result.service, []);
    }
    groups.get(result.service)!.push(result);
  });
  return Array.from(groups.entries()).map(([service, results]) => ({
    service,
    module: service,
    label: getServiceLabel(service),
    results,
  }));
};

export const groupResultsByModule = (results: SearchResult[]): GroupedResults[] => {
  return groupResultsByService(results);
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
  return searchSuggestions.filter((s) => s.toLowerCase().includes(lowerQuery)).slice(0, limit);
};

export const fuzzyMatch = (text: string, query: string): boolean => {
  if (!query.trim()) return true;
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();

  const queryChars = lowerQuery.split('');
  let currentIndex = 0;

  for (const char of lowerText) {
    if (currentIndex < queryChars.length && char === queryChars[currentIndex]) {
      currentIndex++;
    }
  }

  return currentIndex === queryChars.length;
};

export const fuzzySearch = (results: SearchResult[], query: string): SearchResult[] => {
  if (!query.trim()) return results;

  return results.filter((result) => {
    const searchText = `${result.title} ${result.summary || ''} ${result.result_type || ''}`;
    return fuzzyMatch(searchText, query);
  });
};

export const filterResults = (results: SearchResult[], filter: SearchFilter): SearchResult[] => {
  return results.filter((result) => {
    if (filter.service && result.service !== filter.service) return false;
    if (filter.type && result.result_type !== filter.type) return false;
    return true;
  });
};

export const getAvailableServices = (results: SearchResult[]): SearchFilterOption[] => {
  const serviceCounts = new Map<string, number>();
  results.forEach((result) => {
    serviceCounts.set(result.service, (serviceCounts.get(result.service) || 0) + 1);
  });
  return Array.from(serviceCounts.entries()).map(([value, count]) => ({
    value,
    label: getServiceLabel(value),
    count,
  }));
};

export const getAvailableTypes = (results: SearchResult[]): SearchFilterOption[] => {
  const typeCounts = new Map<string, number>();
  results.forEach((result) => {
    const type = result.result_type || result.service;
    typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
  });
  return Array.from(typeCounts.entries()).map(([value, count]) => ({
    value,
    label: typeLabels[value] || value,
    count,
  }));
};
