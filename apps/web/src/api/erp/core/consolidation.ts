import apiClient from '../../client';
import type { ApiResponse } from '../../client';
import type { PaginationParams } from './types';

// ============ Types ============

export interface ConsolidationScope {
  id: string;
  name: string;
  period: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ConsolidationScopeCompany {
  id: string;
  scope_id: string;
  company_id: string;
  company_name: string;
  ownership_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface EliminationRule {
  id: string;
  name: string;
  rule_type: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface InternalTransaction {
  id: string;
  source_company_id: string;
  target_company_id: string;
  amount: number;
  transaction_type: string;
  period: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ConsolidationReport {
  id: string;
  name: string;
  scope_id: string;
  period: string;
  status: string;
  total_assets?: number;
  total_liabilities?: number;
  total_equity?: number;
  created_at: string;
  updated_at: string;
}

export interface ConsolidationReportLine {
  id: string;
  report_id: string;
  account_code: string;
  account_name: string;
  amount: number;
  counterparty_amount: number;
  elimination_amount: number;
}

export interface CompanyRelation {
  id: string;
  parent_company_id: string;
  child_company_id: string;
  relation_type: string;
  ownership_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface CompanyTreeNode {
  id: string;
  name: string;
  type: string;
  children?: CompanyTreeNode[];
}

export interface CompanyFinancialData {
  company_id: string;
  company_name: string;
  period: string;
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
  revenue: number;
  net_income: number;
}

// ============ Request Types ============

export interface CreateScopeRequest {
  name: string;
  period: string;
  status?: string;
}

export interface UpdateScopeRequest {
  name?: string;
  period?: string;
  status?: string;
}

export interface AddScopeCompanyRequest {
  scope_id: string;
  company_id: string;
  ownership_percentage: number;
}

export interface UpdateScopeCompanyRequest {
  ownership_percentage?: number;
}

export interface CreateEliminationRuleRequest {
  name: string;
  rule_type: string;
  description?: string;
  status?: string;
}

export interface UpdateEliminationRuleRequest {
  name?: string;
  rule_type?: string;
  description?: string;
  status?: string;
}

export interface CreateCompanyRelationRequest {
  parent_company_id: string;
  child_company_id: string;
  relation_type: string;
  ownership_percentage: number;
}

export interface UpdateCompanyRelationRequest {
  relation_type?: string;
  ownership_percentage?: number;
}

export interface GenerateReportRequest {
  scope_id: string;
  period: string;
}

export interface SubmitReportRequest {
  comment?: string;
}

export interface ApproveReportRequest {
  comment?: string;
}

export interface ScopeListResponse {
  items: ConsolidationScope[];
  total: number;
}

export interface ScopeCompanyListResponse {
  items: ConsolidationScopeCompany[];
  total: number;
}

export interface EliminationRuleListResponse {
  items: EliminationRule[];
  total: number;
}

export interface InternalTransactionListResponse {
  items: InternalTransaction[];
  total: number;
}

export interface ReportListResponse {
  items: ConsolidationReport[];
  total: number;
}

export interface ReportLineListResponse {
  items: ConsolidationReportLine[];
  total: number;
}

export interface CompanyRelationListResponse {
  items: CompanyRelation[];
  total: number;
}

// ============ Query Types ============

export interface ScopeQueryParams extends PaginationParams {
  period?: string;
  status?: string;
}

export interface EliminationRuleQueryParams extends PaginationParams {
  rule_type?: string;
  status?: string;
}

export interface InternalTransactionQueryParams extends PaginationParams {
  source_company_id?: string;
  target_company_id?: string;
  period?: string;
}

export interface ReportQueryParams extends PaginationParams {
  scope_id?: string;
  period?: string;
  status?: string;
}

export interface CompanyRelationQueryParams extends PaginationParams {
  parent_company_id?: string;
  relation_type?: string;
}

// ============ Helper ============

const resolvePageSize = (params?: PaginationParams): string | undefined => {
  const ps =
    (params as { pageSize?: number } | undefined)?.pageSize ??
    (params as { pagesize?: number } | undefined)?.pagesize;
  return ps ? ps.toString() : undefined;
};

const buildSearchParams = (params?: PaginationParams): URLSearchParams => {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', params.page.toString());
  const ps = resolvePageSize(params);
  if (ps) sp.set('pagesize', ps);
  return sp;
};

// ============ API ============

export const consolidationApi = {
  // ===== Scopes (合并范围) =====
  async listScopes(params?: ScopeQueryParams): Promise<ApiResponse<ScopeListResponse>> {
    const sp = buildSearchParams(params);
    if (params?.period) sp.set('period', params.period);
    if (params?.status) sp.set('status', params.status);
    const qs = sp.toString();
    return apiClient.erp.get<ScopeListResponse>(`/consolidation/scopes${qs ? `?${qs}` : ''}`);
  },

  async createScope(data: CreateScopeRequest): Promise<ApiResponse<ConsolidationScope>> {
    return apiClient.erp.post<ConsolidationScope>('/consolidation/scopes', data);
  },

  async getScope(id: string): Promise<ApiResponse<ConsolidationScope>> {
    return apiClient.erp.get<ConsolidationScope>(`/consolidation/scopes/${id}`);
  },

  async updateScope(
    id: string,
    data: UpdateScopeRequest
  ): Promise<ApiResponse<ConsolidationScope>> {
    return apiClient.erp.put<ConsolidationScope>(`/consolidation/scopes/${id}`, data);
  },

  async removeScope(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete<string>(`/consolidation/scopes/${id}`);
  },

  async deleteScope(id: string): Promise<ApiResponse<string>> {
    return this.removeScope(id);
  },

  // ===== Scope Companies (范围公司) =====
  async listScopeCompanies(scopeId: string): Promise<ApiResponse<ScopeCompanyListResponse>> {
    return apiClient.erp.get<ScopeCompanyListResponse>(
      `/consolidation/scopes/${scopeId}/companies`
    );
  },

  async addScopeCompany(
    data: AddScopeCompanyRequest
  ): Promise<ApiResponse<ConsolidationScopeCompany>> {
    return apiClient.erp.post<ConsolidationScopeCompany>('/consolidation/scopes/companies', data);
  },

  async updateScopeCompany(
    companyId: string,
    data: UpdateScopeCompanyRequest
  ): Promise<ApiResponse<ConsolidationScopeCompany>> {
    return apiClient.erp.put<ConsolidationScopeCompany>(
      `/consolidation/scopes/companies/${companyId}`,
      data
    );
  },

  async removeScopeCompany(companyId: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete<string>(`/consolidation/scopes/companies/${companyId}`);
  },

  async deleteScopeCompany(companyId: string): Promise<ApiResponse<string>> {
    return this.removeScopeCompany(companyId);
  },

  // ===== Elimination Rules (抵销规则) =====
  async listEliminationRules(
    params?: EliminationRuleQueryParams
  ): Promise<ApiResponse<EliminationRuleListResponse>> {
    const sp = buildSearchParams(params);
    if (params?.rule_type) sp.set('rule_type', params.rule_type);
    if (params?.status) sp.set('status', params.status);
    const qs = sp.toString();
    return apiClient.erp.get<EliminationRuleListResponse>(
      `/consolidation/elimination-rules${qs ? `?${qs}` : ''}`
    );
  },

  async createEliminationRule(
    data: CreateEliminationRuleRequest
  ): Promise<ApiResponse<EliminationRule>> {
    return apiClient.erp.post<EliminationRule>('/consolidation/elimination-rules', data);
  },

  async getEliminationRule(id: string): Promise<ApiResponse<EliminationRule>> {
    return apiClient.erp.get<EliminationRule>(`/consolidation/elimination-rules/${id}`);
  },

  async updateEliminationRule(
    id: string,
    data: UpdateEliminationRuleRequest
  ): Promise<ApiResponse<EliminationRule>> {
    return apiClient.erp.put<EliminationRule>(`/consolidation/elimination-rules/${id}`, data);
  },

  async removeEliminationRule(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete<string>(`/consolidation/elimination-rules/${id}`);
  },

  async deleteEliminationRule(id: string): Promise<ApiResponse<string>> {
    return this.removeEliminationRule(id);
  },

  async exportEliminationWorksheet(scopeId: string): Promise<ApiResponse<Blob>> {
    return apiClient.erp.get<Blob>(`/consolidation/scopes/${scopeId}/elimination-worksheet/export`);
  },

  // ===== Internal Transactions (内部交易) =====
  async listInternalTransactions(
    params?: InternalTransactionQueryParams
  ): Promise<ApiResponse<InternalTransactionListResponse>> {
    const sp = buildSearchParams(params);
    if (params?.source_company_id) sp.set('source_company_id', params.source_company_id);
    if (params?.target_company_id) sp.set('target_company_id', params.target_company_id);
    if (params?.period) sp.set('period', params.period);
    const qs = sp.toString();
    return apiClient.erp.get<InternalTransactionListResponse>(
      `/consolidation/internal-transactions${qs ? `?${qs}` : ''}`
    );
  },

  async getInternalTransaction(id: string): Promise<ApiResponse<InternalTransaction>> {
    return apiClient.erp.get<InternalTransaction>(`/consolidation/internal-transactions/${id}`);
  },

  async executeElimination(data: {
    scope_id: string;
    period: string;
  }): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return apiClient.erp.post<{ success: boolean; message: string }>(
      '/consolidation/execute-elimination',
      data
    );
  },

  // ===== Reports (合并报表) =====
  async listReports(params?: ReportQueryParams): Promise<ApiResponse<ReportListResponse>> {
    const sp = buildSearchParams(params);
    if (params?.scope_id) sp.set('scope_id', params.scope_id);
    if (params?.period) sp.set('period', params.period);
    if (params?.status) sp.set('status', params.status);
    const qs = sp.toString();
    return apiClient.erp.get<ReportListResponse>(`/consolidation/reports${qs ? `?${qs}` : ''}`);
  },

  async generateReport(data: GenerateReportRequest): Promise<ApiResponse<ConsolidationReport>> {
    return apiClient.erp.post<ConsolidationReport>('/consolidation/reports/generate', data);
  },

  async getReport(id: string): Promise<ApiResponse<ConsolidationReport>> {
    return apiClient.erp.get<ConsolidationReport>(`/consolidation/reports/${id}`);
  },

  async removeReport(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete<string>(`/consolidation/reports/${id}`);
  },

  async deleteReport(id: string): Promise<ApiResponse<string>> {
    return this.removeReport(id);
  },

  async getReportLines(reportId: string): Promise<ApiResponse<ReportLineListResponse>> {
    return apiClient.erp.get<ReportLineListResponse>(`/consolidation/reports/${reportId}/lines`);
  },

  async exportReport(reportId: string): Promise<ApiResponse<Blob>> {
    return apiClient.erp.get<Blob>(`/consolidation/reports/${reportId}/export`);
  },

  async approveReport(
    reportId: string,
    data?: ApproveReportRequest
  ): Promise<ApiResponse<ConsolidationReport>> {
    return apiClient.erp.post<ConsolidationReport>(
      `/consolidation/reports/${reportId}/approve`,
      data || {}
    );
  },

  async submitReport(
    reportId: string,
    data?: SubmitReportRequest
  ): Promise<ApiResponse<ConsolidationReport>> {
    return apiClient.erp.post<ConsolidationReport>(
      `/consolidation/reports/${reportId}/submit`,
      data || {}
    );
  },

  async publishReport(reportId: string): Promise<ApiResponse<ConsolidationReport>> {
    return apiClient.erp.post<ConsolidationReport>(
      `/consolidation/reports/${reportId}/publish`,
      {}
    );
  },

  // ===== Company Relations (公司关系) =====
  async listCompanyRelations(
    params?: CompanyRelationQueryParams
  ): Promise<ApiResponse<CompanyRelationListResponse>> {
    const sp = buildSearchParams(params);
    if (params?.parent_company_id) sp.set('parent_company_id', params.parent_company_id);
    if (params?.relation_type) sp.set('relation_type', params.relation_type);
    const qs = sp.toString();
    return apiClient.erp.get<CompanyRelationListResponse>(
      `/consolidation/company-relations${qs ? `?${qs}` : ''}`
    );
  },

  async createCompanyRelation(
    data: CreateCompanyRelationRequest
  ): Promise<ApiResponse<CompanyRelation>> {
    return apiClient.erp.post<CompanyRelation>('/consolidation/company-relations', data);
  },

  async updateCompanyRelation(
    id: string,
    data: UpdateCompanyRelationRequest
  ): Promise<ApiResponse<CompanyRelation>> {
    return apiClient.erp.put<CompanyRelation>(`/consolidation/company-relations/${id}`, data);
  },

  async removeCompanyRelation(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete<string>(`/consolidation/company-relations/${id}`);
  },

  async deleteCompanyRelation(id: string): Promise<ApiResponse<string>> {
    return this.removeCompanyRelation(id);
  },

  async getCompanyTree(): Promise<ApiResponse<CompanyTreeNode[]>> {
    return apiClient.erp.get<CompanyTreeNode[]>('/consolidation/company-tree');
  },

  async getCompanyFinancialData(companyId: string): Promise<ApiResponse<CompanyFinancialData>> {
    return apiClient.erp.get<CompanyFinancialData>(
      `/consolidation/companies/${companyId}/financial-data`
    );
  },
};
