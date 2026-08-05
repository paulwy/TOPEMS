import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  AutomationDesignerCanvas,
  SaveAutomationCanvasRequest,
  AutomationDesignerResources,
} from './types';

// 自动化编排设计器：对应 AutomationDesignerPage
export const automationDesignerApi = {
  /** 获取某规则的画布配置 */
  getCanvas: async (ruleId: string): Promise<ApiResponse<AutomationDesignerCanvas>> => {
    return apiClient.automation.get<AutomationDesignerCanvas>(
      `/designer/canvas/${encodeURIComponent(ruleId)}`
    );
  },

  /** 保存画布（自动创建或更新） */
  saveCanvas: async (
    ruleId: string,
    data: SaveAutomationCanvasRequest
  ): Promise<ApiResponse<AutomationDesignerCanvas>> => {
    return apiClient.automation.put<AutomationDesignerCanvas>(
      `/designer/canvas/${encodeURIComponent(ruleId)}`,
      data
    );
  },

  /** 校验画布（检查节点连线、必填字段、循环依赖等） */
  validate: async (
    ruleId: string,
    data: SaveAutomationCanvasRequest
  ): Promise<
    ApiResponse<{
      valid: boolean;
      errors: Array<{ node_id?: string; message: string; severity: 'error' | 'warning' }>;
    }>
  > => {
    return apiClient.automation.post<
      { valid: boolean; errors: Array<{ node_id?: string; message: string; severity: 'error' | 'warning' }> }
    >(`/designer/canvas/${encodeURIComponent(ruleId)}/validate`, data);
  },

  /** 获取设计器可选资源（触发器/动作候选） */
  getResources: async (): Promise<ApiResponse<AutomationDesignerResources>> => {
    return apiClient.automation.get<AutomationDesignerResources>('/designer/resources');
  },

  /** 从画布生成规则定义（trigger + action + hooks） */
  syncToRule: async (
    ruleId: string
  ): Promise<ApiResponse<{ success: boolean; message?: string }>> => {
    return apiClient.automation.post<{ success: boolean; message?: string }>(
      `/designer/canvas/${encodeURIComponent(ruleId)}/sync-to-rule`
    );
  },

  /** 从规则定义反向生成画布（首次打开设计器时自动初始化） */
  syncFromRule: async (
    ruleId: string
  ): Promise<ApiResponse<AutomationDesignerCanvas>> => {
    return apiClient.automation.post<AutomationDesignerCanvas>(
      `/designer/canvas/${encodeURIComponent(ruleId)}/sync-from-rule`
    );
  },
};
