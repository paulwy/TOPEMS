/**
 * 统一编码生成服务 - 集中管理全系统ID编码
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ============================================
// 一、编码规则类型定义
// ============================================

/**
 * 模块类型
 */
export type ModuleType =
  | "hrm" // 人力资源
  | "crm" // 客户关系
  | "srm" // 供应商管理
  | "pm" // 项目管理
  | "erp" // 财务
  | "qms" // 质量管理
  | "lims" // 实验室
  | "ehs" // 环境健康安全
  | "wms" // 仓库管理
  | "inv"; // 库存

/**
 * 实体类型
 */
export type EntityType =
  // 组织架构
  | "company" // 公司
  | "department" // 部门
  | "position" // 岗位
  // 人员
  | "employee" // 员工
  | "candidate" // 候选人
  // 往来单位
  | "customer" // 客户
  | "supplier" // 供应商
  | "contact" // 联系人
  // 项目合同
  | "project" // 项目
  | "contract" // 合同
  | "milestone" // 里程碑
  // 财务
  | "account" // 会计科目
  | "voucher" // 凭证
  | "invoice" // 发票
  | "asset" // 固定资产
  | "bank_account"; // 银行账户

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
  date_format: "YYYY" | "YYYYMM" | "YYYYMMDD";
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
    const { default: client } = await import("../api/client");
    const response = await client.master.post(
      "/api/v1/master/codes/generate",
      params,
    );
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
    }[],
  ): Promise<BatchGenerateCodeResponse> => {
    const { default: client } = await import("../api/client");
    const response = await client.master.post(
      "/api/v1/master/codes/batch-generate",
      {
        requests,
      },
    );
    return response.data;
  },

  /**
   * 验证编码
   */
  validateCode: async (params: {
    entity_type: EntityType;
    code: string;
  }): Promise<{ valid: boolean; message?: string }> => {
    const { default: client } = await import("../api/client");
    const response = await client.master.post(
      "/api/v1/master/codes/validate",
      params,
    );
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
    const { default: client } = await import("../api/client");
    const response = await client.master.post(
      "/api/v1/master/codes/reserve",
      params,
    );
    return response.data;
  },

  /**
   * 释放预留编码
   */
  releaseCodes: async (reservationId: string): Promise<void> => {
    const { default: client } = await import("../api/client");
    await client.master.delete(`/api/v1/master/codes/reserve/${reservationId}`);
  },

  /**
   * 获取编码规则列表
   */
  getRules: async (params?: {
    module?: ModuleType;
    entity_type?: EntityType;
  }): Promise<CodeRule[]> => {
    const { default: client } = await import("../api/client");
    const response = await client.master.get("/api/v1/master/code-rules", {
      params,
    });
    return response.data.items || [];
  },

  /**
   * 获取编码规则详情
   */
  getRule: async (id: string): Promise<CodeRule> => {
    const { default: client } = await import("../api/client");
    const response = await client.master.get(`/api/v1/master/code-rules/${id}`);
    return response.data;
  },

  /**
   * 预览编码格式
   */
  previewCode: async (
    ruleId: string,
    variables?: Record<string, string>,
  ): Promise<string> => {
    const { default: client } = await import("../api/client");
    const response = await client.master.post(
      `/api/v1/master/code-rules/${ruleId}/preview`,
      { variables },
    );
    return response.data.code;
  },
};

// ============================================
// 三、Hooks
// ============================================

/**
 * 获取下一个编码
 */
export function useNextCode(entityType: EntityType, module?: ModuleType) {
  return useQuery({
    queryKey: ["next-code", entityType, module],
    queryFn: () => codeApi.getNextCode({ entity_type: entityType, module }),
    staleTime: 0, // 每次都获取新的编码
    enabled: !!entityType,
  });
}

/**
 * 批量获取编码
 */
export function useBatchNextCodes() {
  return useMutation({
    mutationFn: (
      requests: {
        entity_type: EntityType;
        quantity: number;
        module?: ModuleType;
      }[],
    ) => codeApi.batchGetNextCodes(requests),
  });
}

/**
 * 验证编码
 */
export function useValidateCode() {
  return useMutation({
    mutationFn: (params: { entity_type: EntityType; code: string }) =>
      codeApi.validateCode(params),
  });
}

/**
 * 预留编码
 */
export function useReserveCodes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      entity_type: EntityType;
      quantity: number;
      reserve_days?: number;
    }) => codeApi.reserveCodes(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["code-reservations"] });
    },
  });
}

/**
 * 释放预留编码
 */
export function useReleaseCodes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reservationId: string) => codeApi.releaseCodes(reservationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["code-reservations"] });
    },
  });
}

/**
 * 获取编码规则列表
 */
export function useCodeRules(params?: {
  module?: ModuleType;
  entity_type?: EntityType;
}) {
  return useQuery({
    queryKey: ["code-rules", params],
    queryFn: () => codeApi.getRules(params),
    staleTime: 30 * 60 * 1000, // 30分钟
  });
}

/**
 * 获取编码规则详情
 */
export function useCodeRule(id: string) {
  return useQuery({
    queryKey: ["code-rule", id],
    queryFn: () => codeApi.getRule(id),
    enabled: !!id,
  });
}

/**
 * 预览编码格式
 */
export function usePreviewCode() {
  return useMutation({
    mutationFn: ({
      ruleId,
      variables,
    }: {
      ruleId: string;
      variables?: Record<string, string>;
    }) => codeApi.previewCode(ruleId, variables),
  });
}

// ============================================
// 四、编码工具函数
// ============================================

/**
 * 前端编码生成工具（同步版本，用于预览和本地缓存）
 * 注意：正式编码应使用服务端API
 */
export class CodeGenerator {
  private prefix: string;
  private includeDate: boolean;
  private dateFormat: "YYYY" | "YYYYMM" | "YYYYMMDD";
  private sequenceLength: number;
  private separator: string;
  private currentSequence: number;

  constructor(rule: Partial<CodeRule> = {}) {
    this.prefix = rule.prefix || "";
    this.includeDate = rule.include_date ?? true;
    this.dateFormat = rule.date_format || "YYYYMMDD";
    this.sequenceLength = rule.sequence_length || 4;
    this.separator = rule.separator || "";
    this.currentSequence = rule.sequence_start || 1;
  }

  /**
   * 生成下一个编码
   */
  generate(): string {
    const parts: string[] = [];

    // 添加前缀
    if (this.prefix) {
      parts.push(this.prefix);
    }

    // 添加日期
    if (this.includeDate) {
      const now = new Date();
      let dateStr = "";

      switch (this.dateFormat) {
        case "YYYY":
          dateStr = now.getFullYear().toString();
          break;
        case "YYYYMM":
          dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
          break;
        case "YYYYMMDD":
        default:
          dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
          break;
      }

      parts.push(dateStr);
    }

    // 添加流水号
    const sequence = String(this.currentSequence).padStart(
      this.sequenceLength,
      "0",
    );
    parts.push(sequence);

    // 更新序列号
    this.currentSequence++;

    // 组合编码
    return parts.join(this.separator);
  }

  /**
   * 批量生成
   */
  generateBatch(count: number): string[] {
    return Array.from({ length: count }, () => this.generate());
  }

  /**
   * 验证编码格式
   */
  static validate(code: string, rule: Partial<CodeRule>): boolean {
    const parts: string[] = [];

    if (rule.prefix) {
      // 检查前缀
      if (!code.startsWith(rule.prefix)) {
        return false;
      }
      parts.push(rule.prefix);
    }

    if (rule.include_date) {
      // 检查日期部分
      const dateRegex =
        rule.date_format === "YYYY"
          ? /^\d{4}$/
          : rule.date_format === "YYYYMM"
            ? /^\d{6}$/
            : /^\d{8}$/;

      const remaining = code.substring(parts.join(rule.separator || "").length);
      const datePart = remaining.substring(
        0,
        rule.date_format === "YYYY" ? 4 : rule.date_format === "YYYYMM" ? 6 : 8,
      );

      if (!dateRegex.test(datePart)) {
        return false;
      }

      parts.push(datePart);
    }

    // 检查流水号
    const seqLength = rule.sequence_length || 4;
    const seqRegex = new RegExp(`^\\d{${seqLength}}$`);
    const afterDate = code.substring(parts.join(rule.separator || "").length);

    return seqRegex.test(afterDate);
  }
}

/**
 * 预定义的编码规则
 */
export const CODE_RULES: Record<EntityType, Partial<CodeRule>> = {
  company: {
    prefix: "C",
    include_date: true,
    date_format: "YYYYMMDD",
    sequence_length: 3,
    separator: "",
  },
  department: {
    prefix: "D",
    include_date: false,
    sequence_length: 4,
    separator: "",
  },
  position: {
    prefix: "P",
    include_date: false,
    sequence_length: 4,
    separator: "",
  },
  employee: {
    prefix: "E",
    include_date: false,
    sequence_length: 6,
    separator: "",
  },
  candidate: {
    prefix: "CA",
    include_date: true,
    date_format: "YYYYMMDD",
    sequence_length: 4,
    separator: "",
  },
  customer: {
    prefix: "CU",
    include_date: true,
    date_format: "YYYYMMDD",
    sequence_length: 4,
    separator: "",
  },
  supplier: {
    prefix: "SU",
    include_date: true,
    date_format: "YYYYMMDD",
    sequence_length: 4,
    separator: "",
  },
  contact: {
    prefix: "CO",
    include_date: false,
    sequence_length: 6,
    separator: "",
  },
  project: {
    prefix: "PRJ",
    include_date: true,
    date_format: "YYYYMM",
    sequence_length: 4,
    separator: "",
  },
  contract: {
    prefix: "CT",
    include_date: true,
    date_format: "YYYYMMDD",
    sequence_length: 4,
    separator: "",
  },
  milestone: {
    prefix: "MS",
    include_date: false,
    sequence_length: 4,
    separator: "",
  },
  account: {
    prefix: "",
    include_date: false,
    sequence_length: 4,
    separator: "",
  },
  voucher: {
    prefix: "V",
    include_date: false,
    sequence_length: 8,
    separator: "",
  },
  invoice: {
    prefix: "INV",
    include_date: true,
    date_format: "YYYYMMDD",
    sequence_length: 4,
    separator: "",
  },
  asset: {
    prefix: "FA",
    include_date: true,
    date_format: "YYYYMMDD",
    sequence_length: 4,
    separator: "",
  },
  bank_account: {
    prefix: "BA",
    include_date: false,
    sequence_length: 6,
    separator: "",
  },
};

/**
 * 获取实体的编码规则
 */
export function getCodeRuleForEntity(
  entityType: EntityType,
): Partial<CodeRule> {
  return CODE_RULES[entityType] || { prefix: "", sequence_length: 6 };
}

/**
 * 生成实体编码（前端预览用）
 */
export function generateCodeForEntity(entityType: EntityType): string {
  const rule = getCodeRuleForEntity(entityType);
  const generator = new CodeGenerator(rule);
  return generator.generate();
}

/**
 * 批量生成实体编码
 */
export function batchGenerateCodesForEntity(
  entityType: EntityType,
  count: number,
): string[] {
  const rule = getCodeRuleForEntity(entityType);
  const generator = new CodeGenerator(rule);
  return generator.generateBatch(count);
}

// ============================================
// 五、导出
// ============================================

export { codeApi };
