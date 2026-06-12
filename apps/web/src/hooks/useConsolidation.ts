/**
 * 合并报表React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  ConsolidationScope,
  ConsolidationCompany,
  EliminationRule,
  InternalTransaction,
  ConsolidationReport,
  ConsolidationReportLine,
  GenerateConsolidationReportRequest,
  ConsolidationScopeQueryParams,
  EliminationRuleQueryParams,
  InternalTransactionQueryParams,
  ConsolidationReportQueryParams,
  CompanyRelationType,
} from "@/types/consolidation";
import * as consolidationApi from "@/api/consolidation";

// ============================================
// 一、合并范围Hook
// ============================================

/**
 * 获取合并范围列表
 */
export const useConsolidationScopes = (
  params?: ConsolidationScopeQueryParams,
) => {
  return useQuery({
    queryKey: ["consolidation-scopes", params],
    queryFn: () => consolidationApi.getConsolidationScopes(params),
  });
};

/**
 * 获取合并范围详情
 */
export const useConsolidationScope = (scopeId: string) => {
  return useQuery({
    queryKey: ["consolidation-scope", scopeId],
    queryFn: () => consolidationApi.getConsolidationScope(scopeId),
    enabled: !!scopeId,
  });
};

/**
 * 创建合并范围
 */
export const useCreateConsolidationScope = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ConsolidationScope>) =>
      consolidationApi.createConsolidationScope(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consolidation-scopes"] });
    },
  });
};

/**
 * 更新合并范围
 */
export const useUpdateConsolidationScope = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      scopeId,
      data,
    }: {
      scopeId: string;
      data: Partial<ConsolidationScope>;
    }) => consolidationApi.updateConsolidationScope(scopeId, data),
    onSuccess: (_, { scopeId }) => {
      queryClient.invalidateQueries({ queryKey: ["consolidation-scopes"] });
      queryClient.invalidateQueries({
        queryKey: ["consolidation-scope", scopeId],
      });
    },
  });
};

/**
 * 删除合并范围
 */
export const useDeleteConsolidationScope = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (scopeId: string) =>
      consolidationApi.deleteConsolidationScope(scopeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consolidation-scopes"] });
    },
  });
};

// ============================================
// 二、合并范围公司Hook
// ============================================

/**
 * 获取合并范围内的公司列表
 */
export const useScopeCompanies = (scopeId: string) => {
  return useQuery({
    queryKey: ["scope-companies", scopeId],
    queryFn: () => consolidationApi.getScopeCompanies(scopeId),
    enabled: !!scopeId,
  });
};

/**
 * 添加公司到合并范围
 */
export const useAddCompanyToScope = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      scope_id: string;
      company_id: string;
      ownership_percentage: number;
      consolidation_percentage: number;
      control_type: "full_control" | "joint_venture" | "associate";
    }) => consolidationApi.addCompanyToScope(data),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({
        queryKey: ["scope-companies", data.scope_id],
      });
    },
  });
};

/**
 * 更新合并范围公司
 */
export const useUpdateScopeCompany = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      companyId,
      data,
    }: {
      companyId: string;
      data: Partial<ConsolidationCompany>;
    }) => consolidationApi.updateScopeCompany(companyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scope-companies"] });
    },
  });
};

/**
 * 从合并范围移除公司
 */
export const useRemoveCompanyFromScope = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (companyId: string) =>
      consolidationApi.removeCompanyFromScope(companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scope-companies"] });
    },
  });
};

// ============================================
// 三、抵消规则Hook
// ============================================

/**
 * 获取抵消规则列表
 */
export const useEliminationRules = (params: EliminationRuleQueryParams) => {
  return useQuery({
    queryKey: ["elimination-rules", params],
    queryFn: () => consolidationApi.getEliminationRules(params),
  });
};

/**
 * 获取抵消规则详情
 */
export const useEliminationRule = (ruleId: string) => {
  return useQuery({
    queryKey: ["elimination-rule", ruleId],
    queryFn: () => consolidationApi.getEliminationRule(ruleId),
    enabled: !!ruleId,
  });
};

/**
 * 创建抵消规则
 */
export const useCreateEliminationRule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<EliminationRule>) =>
      consolidationApi.createEliminationRule(data),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({
        queryKey: ["elimination-rules", { scope_id: data.scope_id }],
      });
    },
  });
};

/**
 * 更新抵消规则
 */
export const useUpdateEliminationRule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      ruleId,
      data,
    }: {
      ruleId: string;
      data: Partial<EliminationRule>;
    }) => consolidationApi.updateEliminationRule(ruleId, data),
    onSuccess: (_, { data }) => {
      queryClient.invalidateQueries({
        queryKey: ["elimination-rules", { scope_id: data.scope_id }],
      });
    },
  });
};

/**
 * 删除抵消规则
 */
export const useDeleteEliminationRule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ruleId: string) =>
      consolidationApi.deleteEliminationRule(ruleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["elimination-rules"] });
    },
  });
};

// ============================================
// 四、内部交易Hook
// ============================================

/**
 * 获取内部交易列表
 */
export const useInternalTransactions = (
  params?: InternalTransactionQueryParams,
) => {
  return useQuery({
    queryKey: ["internal-transactions", params],
    queryFn: () => consolidationApi.getInternalTransactions(params),
  });
};

/**
 * 获取内部交易详情
 */
export const useInternalTransaction = (transactionId: string) => {
  return useQuery({
    queryKey: ["internal-transaction", transactionId],
    queryFn: () => consolidationApi.getInternalTransaction(transactionId),
    enabled: !!transactionId,
  });
};

/**
 * 执行内部交易抵消
 */
export const useExecuteElimination = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      scope_id: string;
      period: string;
      rule_ids?: string[];
    }) => consolidationApi.executeElimination(params),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["internal-transactions"],
      });
    },
  });
};

// ============================================
// 五、合并报表Hook
// ============================================

/**
 * 获取合并报表列表
 */
export const useConsolidationReports = (
  params?: ConsolidationReportQueryParams,
) => {
  return useQuery({
    queryKey: ["consolidation-reports", params],
    queryFn: () => consolidationApi.getConsolidationReports(params),
  });
};

/**
 * 获取合并报表详情
 */
export const useConsolidationReport = (reportId: string) => {
  return useQuery({
    queryKey: ["consolidation-report", reportId],
    queryFn: () => consolidationApi.getConsolidationReport(reportId),
    enabled: !!reportId,
  });
};

/**
 * 生成合并报表
 */
export const useGenerateConsolidationReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: GenerateConsolidationReportRequest) =>
      consolidationApi.generateConsolidationReport(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: ["consolidation-reports"],
      });
      queryClient.invalidateQueries({
        queryKey: ["consolidation-report", result.data?.report_id],
      });
    },
  });
};

/**
 * 获取合并报表行项目
 */
export const useConsolidationReportLines = (reportId: string) => {
  return useQuery({
    queryKey: ["consolidation-report-lines", reportId],
    queryFn: () => consolidationApi.getConsolidationReportLines(reportId),
    enabled: !!reportId,
  });
};

/**
 * 审批合并报表
 */
export const useApproveConsolidationReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reportId: string) =>
      consolidationApi.approveConsolidationReport(reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consolidation-reports"] });
    },
  });
};

/**
 * 发布合并报表
 */
export const usePublishConsolidationReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reportId: string) =>
      consolidationApi.publishConsolidationReport(reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consolidation-reports"] });
    },
  });
};

/**
 * 删除合并报表
 */
export const useDeleteConsolidationReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reportId: string) =>
      consolidationApi.deleteConsolidationReport(reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consolidation-reports"] });
    },
  });
};

// ============================================
// 六、公司架构Hook
// ============================================

/**
 * 获取公司关系列表
 */
export const useCompanyRelations = (params?: {
  company_id?: string;
  relation_type?: string;
  keyword?: string;
}) => {
  return useQuery({
    queryKey: ["company-relations", params],
    queryFn: () => consolidationApi.getCompanyRelations(params),
  });
};

/**
 * 创建公司关系
 */
export const useCreateCompanyRelation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      data: Partial<{
        parent_company_id: string;
        child_company_id: string;
        relation_type: CompanyRelationType;
        ownership_percentage: number;
      }>,
    ) => consolidationApi.createCompanyRelation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-relations"] });
      queryClient.invalidateQueries({ queryKey: ["company-tree"] });
    },
  });
};

/**
 * 更新公司关系
 */
export const useUpdateCompanyRelation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      relationId,
      data,
    }: {
      relationId: string;
      data: Partial<{
        ownership_percentage: number;
        status: "active" | "inactive";
      }>;
    }) => consolidationApi.updateCompanyRelation(relationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-relations"] });
    },
  });
};

/**
 * 删除公司关系
 */
export const useDeleteCompanyRelation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (relationId: string) =>
      consolidationApi.deleteCompanyRelation(relationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-relations"] });
      queryClient.invalidateQueries({ queryKey: ["company-tree"] });
    },
  });
};

/**
 * 获取公司架构树
 */
export const useCompanyTree = () => {
  return useQuery({
    queryKey: ["company-tree"],
    queryFn: () => consolidationApi.getCompanyTree(),
  });
};
