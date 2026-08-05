import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { LowcodeDashboardStats } from './types';

import { lowcodeAppsApi } from './apps';
import { lowcodeDataModelsApi } from './dataModels';
import { lowcodeDataSourcesApi } from './dataSources';
import { lowcodeFormsApi } from './forms';
import { lowcodePagesApi } from './pages';
import { lowcodeWorkflowsApi } from './workflows';

export * from './types';
export { lowcodeAppsApi } from './apps';
export { lowcodeDataModelsApi } from './dataModels';
export { lowcodeDataSourcesApi } from './dataSources';
export { lowcodeFormsApi } from './forms';
export { lowcodePagesApi } from './pages';
export { lowcodeWorkflowsApi } from './workflows';

// 聚合对象：方便整体引用（如 import { lowcodeApi } from '@/api/lowcode'）
export const lowcodeApi = {
  apps: lowcodeAppsApi,
  dataModels: lowcodeDataModelsApi,
  dataSources: lowcodeDataSourcesApi,
  forms: lowcodeFormsApi,
  pages: lowcodePagesApi,
  workflows: lowcodeWorkflowsApi,

  // 健康检查（前端联调用，后端可返回任意 200）
  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.lowcode.get<string>('/health');
  },

  // 仪表盘统计（LowCodeHomePage 用）
  getDashboardStats: async (): Promise<ApiResponse<LowcodeDashboardStats>> => {
    return apiClient.lowcode.get<LowcodeDashboardStats>('/dashboard/stats');
  },
};

export default lowcodeApi;
