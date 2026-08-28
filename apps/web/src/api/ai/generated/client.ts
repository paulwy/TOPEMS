/**
 * AI 业务智能模块 - API 客户端
 *
 * 此文件由 scripts/generate-ai-api.sh 自动生成
 * 请勿手动修改
 */

import { apiClient } from '../client';
import type { ApiResponse } from '../client';
import type * as Types from './types';

// ============================================================================
// 业务 Copilot API
// ============================================================================

export const copilotApi = {
  /** 创建会话 */
  createSession: (data: Types.CreateSessionRequest): Promise<ApiResponse<Types.CopilotSession>> =>
    apiClient.post('/copilot/sessions', data),

  /** 获取会话信息 */
  getSession: (sessionId: string): Promise<ApiResponse<Types.CopilotSession>> =>
    apiClient.get(`/copilot/sessions/${sessionId}`),

  /** 删除会话 */
  deleteSession: (sessionId: string): Promise<ApiResponse<void>> =>
    apiClient.delete(`/copilot/sessions/${sessionId}`),

  /** 发送消息 */
  sendMessage: (data: Types.CopilotRequest): Promise<ApiResponse<Types.CopilotResponse>> =>
    apiClient.post('/copilot/chat', data),

  /** 识别意图 */
  recognizeIntent: (data: { text: string; module?: Types.BusinessModuleType }): Promise<ApiResponse<Types.IntentRecognitionResult>> =>
    apiClient.post('/copilot/intent', data),

  /** 获取所有业务模块配置 */
  getAllModuleConfigs: (): Promise<ApiResponse<Types.BusinessModuleConfig[]>> =>
    apiClient.get('/copilot/modules'),

  /** 获取业务模块配置 */
  getModuleConfig: (module: Types.BusinessModuleType): Promise<ApiResponse<Types.BusinessModuleConfig>> =>
    apiClient.get(`/copilot/modules/${module}`),

  /** 搜索 FAQ */
  searchFAQ: (module: Types.BusinessModuleType, q: string): Promise<ApiResponse<Types.FAQItem[]>> =>
    apiClient.get(`/copilot/modules/${module}/faq`, { params: { q } }),
};

// ============================================================================
// 智能表单 API
// ============================================================================

export const formsApi = {
  /** 获取所有表单定义 */
  getAllForms: (category?: string): Promise<ApiResponse<Types.FormDefinition[]>> =>
    apiClient.get('/forms', { params: category ? { category } : undefined }),

  /** 获取表单定义 */
  getForm: (formId: string): Promise<ApiResponse<Types.FormDefinition>> =>
    apiClient.get(`/forms/${formId}`),

  /** 验证表单数据 */
  validateForm: (formId: string, values: Record<string, unknown>): Promise<ApiResponse<Types.FormValidationResult>> =>
    apiClient.post(`/forms/${formId}/validate`, { values }),

  /** 自动填充表单 */
  autoFillForm: (formId: string, context: Record<string, unknown>): Promise<ApiResponse<Types.FormData>> =>
    apiClient.post(`/forms/${formId}/auto-fill`, { context }),

  /** 从自然语言生成表单 */
  generateForm: (formId: string, text: string): Promise<ApiResponse<Types.FormData>> =>
    apiClient.post(`/forms/${formId}/generate`, { text }),

  /** 提交表单 */
  submitForm: (formId: string, values: Record<string, unknown>, recordId?: string): Promise<ApiResponse<Types.FormData>> =>
    apiClient.post(`/forms/${formId}/submit`, { values, record_id: recordId }),

  /** 保存表单草稿 */
  saveFormDraft: (formId: string, values: Record<string, unknown>, recordId?: string): Promise<ApiResponse<Types.FormData>> =>
    apiClient.post(`/forms/${formId}/draft`, { values, record_id: recordId }),
};

// ============================================================================
// 文档智能 API
// ============================================================================

export const documentsApi = {
  /** 获取文档列表 */
  listDocuments: (params?: {
    page?: number;
    page_size?: number;
    document_type?: Types.DocumentType;
    status?: Types.DocumentProcessingStatus;
  }): Promise<ApiResponse<{ items: Types.DocumentInfo[]; total: number; page: number; page_size: number }>> =>
    apiClient.get('/documents', { params }),

  /** 上传文档 */
  uploadDocument: (file: File, metadata?: Record<string, unknown>): Promise<ApiResponse<Types.DocumentInfo>> => {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata) formData.append('metadata', JSON.stringify(metadata));
    return apiClient.post('/documents', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },

  /** 获取文档信息 */
  getDocument: (documentId: string): Promise<ApiResponse<Types.DocumentInfo>> =>
    apiClient.get(`/documents/${documentId}`),

  /** 删除文档 */
  deleteDocument: (documentId: string): Promise<ApiResponse<void>> =>
    apiClient.delete(`/documents/${documentId}`),

  /** 解析文档 */
  parseDocument: (documentId: string): Promise<ApiResponse<Types.DocumentParseResult>> =>
    apiClient.post(`/documents/${documentId}/parse`),

  /** 获取文档摘要 */
  getDocumentSummary: (documentId: string, type?: Types.SummaryType): Promise<ApiResponse<Types.DocumentSummary>> =>
    apiClient.get(`/documents/${documentId}/summary`, { params: type ? { type } : undefined }),

  /** 生成文档摘要 */
  generateDocumentSummary: (documentId: string, summaryType?: Types.SummaryType): Promise<ApiResponse<Types.DocumentSummary>> =>
    apiClient.post(`/documents/${documentId}/summary`, { summary_type: summaryType }),

  /** 搜索文档内容 */
  searchDocument: (documentId: string, q: string): Promise<ApiResponse<Array<{ line_number: number; content: string; match_count: number }>>> =>
    apiClient.get(`/documents/${documentId}/search`, { params: { q } }),

  /** 下载文档 */
  downloadDocument: (documentId: string): Promise<Blob> =>
    apiClient.get(`/documents/${documentId}/download`, { responseType: 'blob' }).then(r => r.data as Blob),

  /** 生成文档 */
  generateDocument: (data: Types.DocumentGenerationRequest): Promise<ApiResponse<Types.DocumentInfo>> =>
    apiClient.post('/documents/generate', data),
};

// ============================================================================
// 治理仪表盘 API
// ============================================================================

export const governanceApi = {
  /** 获取治理仪表盘数据 */
  getDashboard: (timeRange?: Types.TimeRange): Promise<ApiResponse<Types.GovernanceDashboardData>> =>
    apiClient.get('/governance/dashboard', { params: timeRange ? { time_range: timeRange } : undefined }),

  /** 获取治理评分 */
  getScore: (timeRange?: Types.TimeRange): Promise<ApiResponse<{
    overall_score: number;
    governance_level: Types.GovernanceLevel;
    breakdown: { security: number; compliance: number; cost: number; performance: number; reliability: number };
  }>> =>
    apiClient.get('/governance/score', { params: timeRange ? { time_range: timeRange } : undefined }),

  /** 获取风险评估 */
  getRiskAssessment: (timeRange?: Types.TimeRange): Promise<ApiResponse<Types.RiskAssessment>> =>
    apiClient.get('/governance/risk', { params: timeRange ? { time_range: timeRange } : undefined }),

  /** 获取合规状态 */
  getComplianceStatus: (framework?: string): Promise<ApiResponse<Types.ComplianceStatus>> =>
    apiClient.get('/governance/compliance', { params: framework ? { framework } : undefined }),

  /** 获取成本分析 */
  getCostAnalysis: (timeRange?: Types.TimeRange): Promise<ApiResponse<Types.CostAnalysis>> =>
    apiClient.get('/governance/cost', { params: timeRange ? { time_range: timeRange } : undefined }),

  /** 获取性能指标 */
  getPerformanceMetrics: (timeRange?: Types.TimeRange): Promise<ApiResponse<Types.PerformanceMetrics>> =>
    apiClient.get('/governance/performance', { params: timeRange ? { time_range: timeRange } : undefined }),

  /** 获取安全事件 */
  getSecurityEvents: (params?: { severity?: Types.RiskLevel; limit?: number; offset?: number }): Promise<ApiResponse<{ items: Types.SecurityEventSummary[]; total: number }>> =>
    apiClient.get('/governance/security-events', { params }),

  /** 记录安全事件 */
  recordSecurityEvent: (data: { event_type: string; severity: Types.RiskLevel; description: string; affected_resource?: string; status?: string }): Promise<ApiResponse<Types.SecurityEventSummary>> =>
    apiClient.post('/governance/security-events', data),

  /** 获取审计日志摘要 */
  getAuditSummary: (timeRange?: Types.TimeRange): Promise<ApiResponse<Types.AuditSummary>> =>
    apiClient.get('/governance/audit', { params: timeRange ? { time_range: timeRange } : undefined }),

  /** 获取趋势数据 */
  getTrends: (timeRange?: Types.TimeRange, metrics?: string): Promise<ApiResponse<Types.TrendDataPoint[]>> =>
    apiClient.get('/governance/trends', { params: { time_range: timeRange, metrics } }),

  /** 获取建议和改进项 */
  getRecommendations: (priority?: Types.RecommendationPriority): Promise<ApiResponse<Types.Recommendation[]>> =>
    apiClient.get('/governance/recommendations', { params: priority ? { priority } : undefined }),

  /** 刷新仪表盘缓存 */
  refreshCache: (): Promise<ApiResponse<void>> =>
    apiClient.post('/governance/refresh'),

  /** 导出治理报告 */
  exportReport: (format: 'pdf' | 'excel' | 'json', timeRange?: Types.TimeRange): Promise<Blob> =>
    apiClient.get('/governance/export', { params: { format, time_range: timeRange }, responseType: 'blob' }).then(r => r.data as Blob),
};

// ============================================================================
// 统一导出
// ============================================================================

export const aiBusinessApi = {
  ...copilotApi,
  ...formsApi,
  ...documentsApi,
  ...governanceApi,
};

export default aiBusinessApi;
