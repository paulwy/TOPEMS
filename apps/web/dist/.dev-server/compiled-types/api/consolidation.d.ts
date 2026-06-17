/**
 * 合并报表API客户端
 * 支持多公司财务报表合并、内部交易抵消
 */
import type { ConsolidationScope, ConsolidationCompany, AddCompanyToScopeRequest, EliminationRule, InternalTransaction, ConsolidationReport, ConsolidationReportLine, GenerateConsolidationReportRequest, ConsolidationReportGenerateResult, CompanyRelation, CompanyFinancialData, ConsolidationScopeQueryParams, EliminationRuleQueryParams, InternalTransactionQueryParams, ConsolidationReportQueryParams } from "@/types/consolidation";
import type { ApiResponse, PaginatedResponse } from "./client";
/**
 * 获取合并范围列表
 */
export declare const getConsolidationScopes: (params?: ConsolidationScopeQueryParams) => Promise<PaginatedResponse<ConsolidationScope>>;
/**
 * 获取合并范围详情
 */
export declare const getConsolidationScope: (scopeId: string) => Promise<ApiResponse<ConsolidationScope>>;
/**
 * 创建合并范围
 */
export declare const createConsolidationScope: (data: Partial<ConsolidationScope>) => Promise<ApiResponse<ConsolidationScope>>;
/**
 * 更新合并范围
 */
export declare const updateConsolidationScope: (scopeId: string, data: Partial<ConsolidationScope>) => Promise<ApiResponse<ConsolidationScope>>;
/**
 * 删除合并范围
 */
export declare const deleteConsolidationScope: (scopeId: string) => Promise<ApiResponse<void>>;
/**
 * 获取合并范围内的公司列表
 */
export declare const getScopeCompanies: (scopeId: string) => Promise<ApiResponse<ConsolidationCompany[]>>;
/**
 * 添加公司到合并范围
 */
export declare const addCompanyToScope: (data: AddCompanyToScopeRequest) => Promise<ApiResponse<ConsolidationCompany>>;
/**
 * 更新合并范围内公司
 */
export declare const updateScopeCompany: (companyId: string, data: Partial<ConsolidationCompany>) => Promise<ApiResponse<ConsolidationCompany>>;
/**
 * 从合并范围移除公司
 */
export declare const removeCompanyFromScope: (companyId: string) => Promise<ApiResponse<void>>;
/**
 * 获取抵消规则列表
 */
export declare const getEliminationRules: (params: EliminationRuleQueryParams) => Promise<PaginatedResponse<EliminationRule>>;
/**
 * 获取抵消规则详情
 */
export declare const getEliminationRule: (ruleId: string) => Promise<ApiResponse<EliminationRule>>;
/**
 * 创建抵消规则
 */
export declare const createEliminationRule: (data: Partial<EliminationRule>) => Promise<ApiResponse<EliminationRule>>;
/**
 * 更新抵消规则
 */
export declare const updateEliminationRule: (ruleId: string, data: Partial<EliminationRule>) => Promise<ApiResponse<EliminationRule>>;
/**
 * 删除抵消规则
 */
export declare const deleteEliminationRule: (ruleId: string) => Promise<ApiResponse<void>>;
/**
 * 获取内部交易列表
 */
export declare const getInternalTransactions: (params?: InternalTransactionQueryParams) => Promise<PaginatedResponse<InternalTransaction>>;
/**
 * 获取内部交易详情
 */
export declare const getInternalTransaction: (transactionId: string) => Promise<ApiResponse<InternalTransaction>>;
/**
 * 执行内部交易抵消
 */
export declare const executeElimination: (params: {
    scope_id: string;
    period: string;
    rule_ids?: string[];
}) => Promise<ApiResponse<{
    eliminated_count: number;
    total_eliminated: number;
}>>;
/**
 * 获取合并报表列表
 */
export declare const getConsolidationReports: (params?: ConsolidationReportQueryParams) => Promise<PaginatedResponse<ConsolidationReport>>;
/**
 * 获取合并报表详情
 */
export declare const getConsolidationReport: (reportId: string) => Promise<ApiResponse<ConsolidationReport>>;
/**
 * 生成合并报表
 */
export declare const generateConsolidationReport: (data: GenerateConsolidationReportRequest) => Promise<ApiResponse<ConsolidationReportGenerateResult>>;
/**
 * 获取合并报表行项目
 */
export declare const getConsolidationReportLines: (reportId: string) => Promise<ApiResponse<ConsolidationReportLine[]>>;
/**
 * 审批合并报表
 */
export declare const approveConsolidationReport: (reportId: string) => Promise<ApiResponse<ConsolidationReport>>;
/**
 * 发布合并报表
 */
export declare const publishConsolidationReport: (reportId: string) => Promise<ApiResponse<ConsolidationReport>>;
/**
 * 删除合并报表
 */
export declare const deleteConsolidationReport: (reportId: string) => Promise<ApiResponse<void>>;
/**
 * 获取公司关系列表
 */
export declare const getCompanyRelations: (params?: {
    company_id?: string;
    relation_type?: string;
    keyword?: string;
}) => Promise<ApiResponse<CompanyRelation[]>>;
/**
 * 创建公司关系
 */
export declare const createCompanyRelation: (data: Partial<CompanyRelation>) => Promise<ApiResponse<CompanyRelation>>;
/**
 * 更新公司关系
 */
export declare const updateCompanyRelation: (relationId: string, data: Partial<CompanyRelation>) => Promise<ApiResponse<CompanyRelation>>;
/**
 * 删除公司关系
 */
export declare const deleteCompanyRelation: (relationId: string) => Promise<ApiResponse<void>>;
/**
 * 获取公司财务数据（用于合并）
 */
export declare const getCompanyFinancialData: (companyId: string, period: string) => Promise<ApiResponse<CompanyFinancialData>>;
/**
 * 获取公司架构树
 */
export declare const getCompanyTree: () => Promise<ApiResponse<{
    id: string;
    name: string;
    code: string;
    level: number;
    children: any[];
}>>;
/**
 * 导出合并报表
 */
export declare const exportConsolidationReport: (reportId: string, format?: "excel" | "pdf") => Promise<Blob>;
/**
 * 导出抵消工作底稿
 */
export declare const exportEliminationWorkSheet: (scopeId: string, period: string) => Promise<Blob>;
