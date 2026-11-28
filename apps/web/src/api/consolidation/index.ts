/**
 * 合并报表API客户端
 * 支持多公司财务报表合并、内部交易抵消
 */

import { apiClient, downloadBlob } from '../client';
import type {
  ConsolidationScope,
  ConsolidationCompany,
  AddCompanyToScopeRequest,
  EliminationRule,
  InternalTransaction,
  ConsolidationReport,
  ConsolidationReportLine,
  GenerateConsolidationReportRequest,
  ConsolidationReportGenerateResult,
  CompanyRelation,
  CompanyFinancialData,
  CompanyTreeNode,
  ConsolidationScopeQueryParams,
  EliminationRuleQueryParams,
  InternalTransactionQueryParams,
  ConsolidationReportQueryParams,
} from '@/types/consolidation';
import type { ApiResponse, PaginatedResponse } from '../client';
import config from '../../config/runtime';

// ============================================
// 一、合并范围管理
// ============================================

/**
 * 获取合并范围列表
 */
export const getConsolidationScopes = async (
  params?: ConsolidationScopeQueryParams
): Promise<PaginatedResponse<ConsolidationScope>> => {
  return apiClient.erp.get('/consolidation/scopes', { params });
};

/**
 * 获取合并范围详情
 */
export const getConsolidationScope = async (
  scopeId: string
): Promise<ApiResponse<ConsolidationScope>> => {
  return apiClient.erp.get(`/consolidation/scopes/${scopeId}`);
};

/**
 * 创建合并范围
 */
export const createConsolidationScope = async (
  data: Partial<ConsolidationScope>
): Promise<ApiResponse<ConsolidationScope>> => {
  return apiClient.erp.post('/consolidation/scopes', data);
};

/**
 * 更新合并范围
 */
export const updateConsolidationScope = async (
  scopeId: string,
  data: Partial<ConsolidationScope>
): Promise<ApiResponse<ConsolidationScope>> => {
  return apiClient.erp.put(`/consolidation/scopes/${scopeId}`, data);
};

/**
 * 删除合并范围
 */
export const deleteConsolidationScope = async (scopeId: string): Promise<ApiResponse<void>> => {
  return apiClient.erp.delete(`/consolidation/scopes/${scopeId}`);
};

/**
 * 获取合并范围内的公司列表
 */
export const getScopeCompanies = async (
  scopeId: string
): Promise<ApiResponse<ConsolidationCompany[]>> => {
  return apiClient.erp.get(`/consolidation/scopes/${scopeId}/companies`);
};

/**
 * 添加公司到合并范围
 */
export const addCompanyToScope = async (
  data: AddCompanyToScopeRequest
): Promise<ApiResponse<ConsolidationCompany>> => {
  return apiClient.erp.post('/consolidation/scopes/companies', data);
};

/**
 * 更新合并范围内公司
 */
const updateScopeCompany = async (
  companyId: string,
  data: Partial<ConsolidationCompany>
): Promise<ApiResponse<ConsolidationCompany>> => {
  return apiClient.erp.put(`/consolidation/scopes/companies/${companyId}`, data);
};

/**
 * 从合并范围移除公司
 */
export const removeCompanyFromScope = async (companyId: string): Promise<ApiResponse<void>> => {
  return apiClient.erp.delete(`/consolidation/scopes/companies/${companyId}`);
};

// ============================================
// 二、内部交易抵消
// ============================================

/**
 * 获取抵消规则列表
 */
const getEliminationRules = async (
  params: EliminationRuleQueryParams
): Promise<PaginatedResponse<EliminationRule>> => {
  return apiClient.erp.get('/consolidation/elimination-rules', {
    params,
  });
};

/**
 * 获取抵消规则详情
 */
const getEliminationRule = async (ruleId: string): Promise<ApiResponse<EliminationRule>> => {
  return apiClient.erp.get(`/consolidation/elimination-rules/${ruleId}`);
};

/**
 * 创建抵消规则
 */
const createEliminationRule = async (
  data: Partial<EliminationRule>
): Promise<ApiResponse<EliminationRule>> => {
  return apiClient.erp.post('/consolidation/elimination-rules', data);
};

/**
 * 更新抵消规则
 */
const updateEliminationRule = async (
  ruleId: string,
  data: Partial<EliminationRule>
): Promise<ApiResponse<EliminationRule>> => {
  return apiClient.erp.put(`/consolidation/elimination-rules/${ruleId}`, data);
};

/**
 * 删除抵消规则
 */
const deleteEliminationRule = async (ruleId: string): Promise<ApiResponse<void>> => {
  return apiClient.erp.delete(`/consolidation/elimination-rules/${ruleId}`);
};

/**
 * 获取内部交易列表
 */
const getInternalTransactions = async (
  params?: InternalTransactionQueryParams
): Promise<PaginatedResponse<InternalTransaction>> => {
  return apiClient.erp.get('/consolidation/internal-transactions', {
    params,
  });
};

/**
 * 获取内部交易详情
 */
const getInternalTransaction = async (
  transactionId: string
): Promise<ApiResponse<InternalTransaction>> => {
  return apiClient.erp.get(`/consolidation/internal-transactions/${transactionId}`);
};

/**
 * 执行内部交易抵消
 */
const executeElimination = async (params: {
  scope_id: string;
  period: string;
  rule_ids?: string[];
}): Promise<
  ApiResponse<{
    eliminated_count: number;
    total_eliminated: number;
  }>
> => {
  return apiClient.erp.post('/consolidation/execute-elimination', params);
};

// ============================================
// 三、合并报表
// ============================================

/**
 * 获取合并报表列表
 */
export const getConsolidationReports = async (
  params?: ConsolidationReportQueryParams
): Promise<PaginatedResponse<ConsolidationReport>> => {
  return apiClient.erp.get('/consolidation/reports', { params });
};

/**
 * 获取合并报表详情
 */
const getConsolidationReport = async (
  reportId: string
): Promise<ApiResponse<ConsolidationReport>> => {
  return apiClient.erp.get(`/consolidation/reports/${reportId}`);
};

/**
 * 生成合并报表
 */
export const generateConsolidationReport = async (
  data: GenerateConsolidationReportRequest
): Promise<ApiResponse<ConsolidationReportGenerateResult>> => {
  return apiClient.erp.post('/consolidation/reports/generate', data);
};

/**
 * 获取合并报表行项目
 */
export const getConsolidationReportLines = async (
  reportId: string
): Promise<ApiResponse<ConsolidationReportLine[]>> => {
  return apiClient.erp.get(`/consolidation/reports/${reportId}/lines`);
};

/**
 * 审批合并报表
 */
export const approveConsolidationReport = async (
  reportId: string
): Promise<ApiResponse<ConsolidationReport>> => {
  return apiClient.erp.post(`/consolidation/reports/${reportId}/approve`);
};

/**
 * 发布合并报表
 */
export const publishConsolidationReport = async (
  reportId: string
): Promise<ApiResponse<ConsolidationReport>> => {
  return apiClient.erp.post(`/consolidation/reports/${reportId}/publish`);
};

/**
 * 删除合并报表
 */
const deleteConsolidationReport = async (reportId: string): Promise<ApiResponse<void>> => {
  return apiClient.erp.delete(`/consolidation/reports/${reportId}`);
};

// ============================================
// 四、公司架构
// ============================================

/**
 * 获取公司关系列表
 */
export const getCompanyRelations = async (params?: {
  company_id?: string;
  relation_type?: string;
  keyword?: string;
}): Promise<ApiResponse<CompanyRelation[]>> => {
  return apiClient.erp.get('/consolidation/company-relations', {
    params,
  });
};

/**
 * 创建公司关系
 */
export const createCompanyRelation = async (
  data: Partial<CompanyRelation>
): Promise<ApiResponse<CompanyRelation>> => {
  return apiClient.erp.post('/consolidation/company-relations', data);
};

/**
 * 更新公司关系
 */
export const updateCompanyRelation = async (
  relationId: string,
  data: Partial<CompanyRelation>
): Promise<ApiResponse<CompanyRelation>> => {
  return apiClient.erp.put(`/consolidation/company-relations/${relationId}`, data);
};

/**
 * 删除公司关系
 */
export const deleteCompanyRelation = async (relationId: string): Promise<ApiResponse<void>> => {
  return apiClient.erp.delete(`/consolidation/company-relations/${relationId}`);
};

/**
 * 获取公司财务数据（用于合并）
 */
const getCompanyFinancialData = async (
  companyId: string,
  period: string
): Promise<ApiResponse<CompanyFinancialData>> => {
  return apiClient.erp.get(`/consolidation/companies/${companyId}/financial-data`, {
    params: { period },
  });
};

/**
 * 获取公司架构树
 */
export const getCompanyTree = async (): Promise<ApiResponse<CompanyTreeNode>> => {
  return apiClient.erp.get('/consolidation/company-tree');
};

// ============================================
// 五、导出功能
// ============================================

/**
 * 导出合并报表
 */
const exportConsolidationReport = async (
  reportId: string,
  format: 'excel' | 'pdf' = 'excel'
): Promise<Blob> => {
  const baseURL = apiClient.erp.defaults?.baseURL || config.services.erp;
  return downloadBlob(baseURL, `/consolidation/reports/${reportId}/export`, {
    params: { format },
  });
};

/**
 * 导出抵消工作底稿
 */
const exportEliminationWorkSheet = async (scopeId: string, period: string): Promise<Blob> => {
  const baseURL = apiClient.erp.defaults?.baseURL || config.services.erp;
  return downloadBlob(baseURL, `/consolidation/scopes/${scopeId}/elimination-worksheet/export`, {
    params: { period },
  });
};

export default {
  getConsolidationScopes,
  getConsolidationScope,
  createConsolidationScope,
  updateConsolidationScope,
  deleteConsolidationScope,
  getScopeCompanies,
  addCompanyToScope,
  updateScopeCompany,
  removeCompanyFromScope,
  getEliminationRules,
  getEliminationRule,
  createEliminationRule,
  updateEliminationRule,
  deleteEliminationRule,
  getInternalTransactions,
  getInternalTransaction,
  executeElimination,
  getConsolidationReports,
  getConsolidationReport,
  generateConsolidationReport,
  getConsolidationReportLines,
  approveConsolidationReport,
  publishConsolidationReport,
  deleteConsolidationReport,
  getCompanyRelations,
  createCompanyRelation,
  updateCompanyRelation,
  deleteCompanyRelation,
  getCompanyFinancialData,
  getCompanyTree,
  exportConsolidationReport,
  exportEliminationWorkSheet,
};

// ── v74 to_bind 补绑（2026-10-29）──
export const submitConsolidationReport = async (
  reportId: string,
  data: Record<string, unknown> = {}
): Promise<ApiResponse<ConsolidationReport>> => {
  return apiClient.erp.post<ConsolidationReport>(
    `/consolidation/reports/${reportId}/submit`,
    data
  );
};
