/**
 * 合并报表React Query Hooks
 */
import type { ConsolidationScope, ConsolidationCompany, EliminationRule, GenerateConsolidationReportRequest, ConsolidationScopeQueryParams, EliminationRuleQueryParams, InternalTransactionQueryParams, ConsolidationReportQueryParams, CompanyRelationType } from "@/types/consolidation";
/**
 * 获取合并范围列表
 */
export declare const useConsolidationScopes: (params?: ConsolidationScopeQueryParams) => import("@tanstack/react-query").UseQueryResult<NoInfer<import("../api/client").PaginatedResponse<ConsolidationScope>>, Error>;
/**
 * 获取合并范围详情
 */
export declare const useConsolidationScope: (scopeId: string) => import("@tanstack/react-query").UseQueryResult<NoInfer<import("../api/client").ApiResponse<ConsolidationScope>>, Error>;
/**
 * 创建合并范围
 */
export declare const useCreateConsolidationScope: () => import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<ConsolidationScope>, Error, Partial<ConsolidationScope>, unknown>;
/**
 * 更新合并范围
 */
export declare const useUpdateConsolidationScope: () => import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<ConsolidationScope>, Error, {
    scopeId: string;
    data: Partial<ConsolidationScope>;
}, unknown>;
/**
 * 删除合并范围
 */
export declare const useDeleteConsolidationScope: () => import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<void>, Error, string, unknown>;
/**
 * 获取合并范围内的公司列表
 */
export declare const useScopeCompanies: (scopeId: string) => import("@tanstack/react-query").UseQueryResult<NoInfer<import("../api/client").ApiResponse<ConsolidationCompany[]>>, Error>;
/**
 * 添加公司到合并范围
 */
export declare const useAddCompanyToScope: () => import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<ConsolidationCompany>, Error, {
    scope_id: string;
    company_id: string;
    ownership_percentage: number;
    consolidation_percentage: number;
    control_type: "full_control" | "joint_venture" | "associate";
}, unknown>;
/**
 * 更新合并范围公司
 */
export declare const useUpdateScopeCompany: () => import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<ConsolidationCompany>, Error, {
    companyId: string;
    data: Partial<ConsolidationCompany>;
}, unknown>;
/**
 * 从合并范围移除公司
 */
export declare const useRemoveCompanyFromScope: () => import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<void>, Error, string, unknown>;
/**
 * 获取抵消规则列表
 */
export declare const useEliminationRules: (params: EliminationRuleQueryParams) => import("@tanstack/react-query").UseQueryResult<NoInfer<import("../api/client").PaginatedResponse<EliminationRule>>, Error>;
/**
 * 获取抵消规则详情
 */
export declare const useEliminationRule: (ruleId: string) => import("@tanstack/react-query").UseQueryResult<NoInfer<import("../api/client").ApiResponse<EliminationRule>>, Error>;
/**
 * 创建抵消规则
 */
export declare const useCreateEliminationRule: () => import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<EliminationRule>, Error, Partial<EliminationRule>, unknown>;
/**
 * 更新抵消规则
 */
export declare const useUpdateEliminationRule: () => import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<EliminationRule>, Error, {
    ruleId: string;
    data: Partial<EliminationRule>;
}, unknown>;
/**
 * 删除抵消规则
 */
export declare const useDeleteEliminationRule: () => import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<void>, Error, string, unknown>;
/**
 * 获取内部交易列表
 */
export declare const useInternalTransactions: (params?: InternalTransactionQueryParams) => import("@tanstack/react-query").UseQueryResult<NoInfer<import("../api/client").PaginatedResponse<import("@/types/consolidation").InternalTransaction>>, Error>;
/**
 * 获取内部交易详情
 */
export declare const useInternalTransaction: (transactionId: string) => import("@tanstack/react-query").UseQueryResult<NoInfer<import("../api/client").ApiResponse<import("@/types/consolidation").InternalTransaction>>, Error>;
/**
 * 执行内部交易抵消
 */
export declare const useExecuteElimination: () => import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<{
    eliminated_count: number;
    total_eliminated: number;
}>, Error, {
    scope_id: string;
    period: string;
    rule_ids?: string[];
}, unknown>;
/**
 * 获取合并报表列表
 */
export declare const useConsolidationReports: (params?: ConsolidationReportQueryParams) => import("@tanstack/react-query").UseQueryResult<NoInfer<import("../api/client").PaginatedResponse<import("@/types/consolidation").ConsolidationReport>>, Error>;
/**
 * 获取合并报表详情
 */
export declare const useConsolidationReport: (reportId: string) => import("@tanstack/react-query").UseQueryResult<NoInfer<import("../api/client").ApiResponse<import("@/types/consolidation").ConsolidationReport>>, Error>;
/**
 * 生成合并报表
 */
export declare const useGenerateConsolidationReport: () => import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<import("@/types/consolidation").ConsolidationReportGenerateResult>, Error, GenerateConsolidationReportRequest, unknown>;
/**
 * 获取合并报表行项目
 */
export declare const useConsolidationReportLines: (reportId: string) => import("@tanstack/react-query").UseQueryResult<NoInfer<import("../api/client").ApiResponse<import("@/types/consolidation").ConsolidationReportLine[]>>, Error>;
/**
 * 审批合并报表
 */
export declare const useApproveConsolidationReport: () => import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<import("@/types/consolidation").ConsolidationReport>, Error, string, unknown>;
/**
 * 发布合并报表
 */
export declare const usePublishConsolidationReport: () => import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<import("@/types/consolidation").ConsolidationReport>, Error, string, unknown>;
/**
 * 删除合并报表
 */
export declare const useDeleteConsolidationReport: () => import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<void>, Error, string, unknown>;
/**
 * 获取公司关系列表
 */
export declare const useCompanyRelations: (params?: {
    company_id?: string;
    relation_type?: string;
    keyword?: string;
}) => import("@tanstack/react-query").UseQueryResult<NoInfer<import("../api/client").ApiResponse<import("@/types/consolidation").CompanyRelation[]>>, Error>;
/**
 * 创建公司关系
 */
export declare const useCreateCompanyRelation: () => import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<import("@/types/consolidation").CompanyRelation>, Error, Partial<{
    parent_company_id: string;
    child_company_id: string;
    relation_type: CompanyRelationType;
    ownership_percentage: number;
}>, unknown>;
/**
 * 更新公司关系
 */
export declare const useUpdateCompanyRelation: () => import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<import("@/types/consolidation").CompanyRelation>, Error, {
    relationId: string;
    data: Partial<{
        ownership_percentage: number;
        status: "active" | "inactive";
    }>;
}, unknown>;
/**
 * 删除公司关系
 */
export declare const useDeleteCompanyRelation: () => import("@tanstack/react-query").UseMutationResult<import("../api/client").ApiResponse<void>, Error, string, unknown>;
/**
 * 获取公司架构树
 */
export declare const useCompanyTree: () => import("@tanstack/react-query").UseQueryResult<NoInfer<import("../api/client").ApiResponse<{
    id: string;
    name: string;
    code: string;
    level: number;
    children: any[];
}>>, Error>;
