import type { AutomationDashboardStats } from './types';

import { automationRulesApi } from './rules';
import { automationRunsApi } from './runs';
import { automationDesignerApi } from './designer';
import { automationVariablesApi } from './variables';
import { automationDashboardApi } from './dashboard';

export * from './types';
export { automationRulesApi } from './rules';
export { automationRunsApi } from './runs';
export { automationDesignerApi } from './designer';
export { automationVariablesApi } from './variables';
export { automationDashboardApi } from './dashboard';

// 聚合对象：方便整体引用（如 import { automationApi } from '@/api/automation'）
export const automationApi = {
  rules: automationRulesApi,
  runs: automationRunsApi,
  designer: automationDesignerApi,
  variables: automationVariablesApi,
  dashboard: automationDashboardApi,

  // 健康检查（前端联调用，后端可返回任意 200）
  health: async () => automationDashboardApi.health(),

  // 仪表盘统计（AutomationDashboardPage 用）
  getDashboardStats: async () => automationDashboardApi.getStats(),
};

// 重新导出类型以便统一引用
export type { AutomationDashboardStats };

export default automationApi;
