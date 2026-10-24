/**
 * 统一编码生成服务 - 集中管理全系统ID编码
 */

import { useMutation } from '@tanstack/react-query';
import { queryClient, QUERY_KEYS } from '@/lib/reactQuery';

// ============================================
// 一、编码规则类型定义
// ============================================

/**
 * 模块类型
 */
export type ModuleType =
  | 'hrm' // 人力资源
  | 'crm' // 客户关系
  | 'srm' // 供应商管理
  | 'pm' // 项目管理
  | 'erp' // 财务
  | 'qms' // 质量管理
  | 'lims' // 实验室
  | 'ehs' // 环境健康安全
  | 'wms' // 仓库管理
  | 'inv'; // 库存

/**
 * 实体类型
 */
export type EntityType =
  // 组织架构
  | 'company' // 公司
  | 'department' // 部门
  | 'position' // 岗位
  // 人员
  | 'employee' // 员工
  | 'candidate' // 候选人
  // 往来单位
  | 'customer' // 客户
  | 'supplier' // 供应商
  | 'contact' // 联系人
  // 项目合同
  | 'project' // 项目
  | 'contract' // 合同
  | 'milestone' // 里程碑
  // 财务
  | 'account' // 会计科目
  | 'voucher' // 凭证
  | 'invoice' // 发票
  | 'asset' // 固定资产
  | 'bank_account'; // 银行账户

/**
 * 编码规则配置
 */
export interface CodeRule {
  id: string;
  name: string; // 规则名称
  entity_type: EntityType; // 实体类型
  module: ModuleType; // 所属模块
  prefix: string; // 前缀
  include_date: boolean; // 是否包含日期
  dateformat: 'YYYY' | 'YYYYMM' | 'YYYYMMDD';
  sequence_length: number; // 流水号长度
  sequence_start: number; // 起始值
  separator: string; // 分隔符
  auto_generate: boolean; // 自动生成
  allow_manual: boolean; // 允许手工输入
  is_default: boolean; // 是否默认
}

/**
 * 编码生成响应
 */
export interface GenerateCodeResponse {
  code: string;
  rule_id: string;
  rule_name: string;
}

/**
 * 批量编码生成响应
 */
export interface BatchGenerateCodeResponse {
  codes: GenerateCodeResponse[];
  total: number;
}

// ============================================
// 二、编码生成API
// ============================================

const codeApi = {
  /**
   * 获取下一个编码
   */
  getNextCode: async (params: {
    entity_type: EntityType;
    module?: ModuleType;
    prefix_variables?: Record<string, string>;
  }): Promise<GenerateCodeResponse> => {
    const { default: client } = await import('../api/client');
    const response = await client.master.post('/codes/generate', params);
    return response.data;
  },

  /**
   * 批量获取编码
   */
  batchGetNextCodes: async (
    requests: {
      entity_type: EntityType;
      quantity: number;
      module?: ModuleType;
    }[]
  ): Promise<BatchGenerateCodeResponse> => {
    const { default: client } = await import('../api/client');
    const response = await client.master.post('/codes/batch-generate', {
      requests,
    });
    return response.data;
  },

  /**
   * 验证编码
   */
  validateCode: async (params: {
    entity_type: EntityType;
    code: string;
  }): Promise<{ valid: boolean; message?: string }> => {
    const { default: client } = await import('../api/client');
    const response = await client.master.post('/codes/validate', params);
    return response.data;
  },

  /**
   * 预留编码
   */
  reserveCodes: async (params: {
    entity_type: EntityType;
    quantity: number;
    reserve_days?: number;
  }): Promise<{ reservation_id: string; codes: string[] }> => {
    const { default: client } = await import('../api/client');
    const response = await client.master.post('/codes/reserve', params);
    return response.data;
  },

  /**
   * 释放预留编码
   */
  releaseCodes: async (reservationId: string): Promise<void> => {
    const { default: client } = await import('../api/client');
    await client.master.delete(`/codes/reserve/${reservationId}`);
  },

  /**
   * 获取编码规则列表
   */
  getRules: async (params?: {
    module?: ModuleType;
    entity_type?: EntityType;
  }): Promise<CodeRule[]> => {
    const { default: client } = await import('../api/client');
    const response = await client.master.get('/code-rules', {
      params,
    });
    return response.data.items || [];
  },

  /**
   * 获取编码规则详情
   */
  getRule: async (id: string): Promise<CodeRule> => {
    const { default: client } = await import('../api/client');
    const response = await client.master.get(`/code-rules/${id}`);
    return response.data;
  },

  /**
   * 预览编码格式
   */
  previewCode: async (ruleId: string, variables?: Record<string, string>): Promise<string> => {
    const { default: client } = await import('../api/client');
    const response = await client.master.post(`/code-rules/${ruleId}/preview`, {
      variables,
    });
    return response.data.code;
  },
};

// ============================================
// 三、Hooks
// ============================================

/**
 * 批量获取编码
 */
function useBatchNextCodes() {
  return useMutation({
    mutationFn: (
      requests: {
        entity_type: EntityType;
        quantity: number;
        module?: ModuleType;
      }[]
    ) => codeApi.batchGetNextCodes(requests),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.CODE_RESERVATIONS_BASE,
        exact: false,
        refetchType: 'active',
      });
    },
  });
}

/**
 * 验证编码
 */
function useValidateCode() {
  return useMutation({
    mutationFn: (params: { entity_type: EntityType; code: string }) => codeApi.validateCode(params),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.CODE_RESERVATIONS_BASE,
        exact: false,
        refetchType: 'active',
      });
    },
  });
}

/**
 * 预览编码格式
 */
function usePreviewCode() {
  return useMutation({
    mutationFn: ({ ruleId, variables }: { ruleId: string; variables?: Record<string, string> }) =>
      codeApi.previewCode(ruleId, variables),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.CODE_RESERVATIONS_BASE,
        exact: false,
        refetchType: 'active',
      });
    },
  });
}

// ============================================
// 五、导出
// ============================================

export { codeApi };
