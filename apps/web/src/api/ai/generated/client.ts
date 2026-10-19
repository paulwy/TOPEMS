/**
 * AI 业务智能模块 - API 客户端
 *
 * 此文件由 scripts/generate-ai-api.sh 自动生成
 * 请勿手动修改
 */

import { apiClient } from '../../client';
import type { ApiResponse } from '../../client';
import type * as Types from './types';

// ============================================================================
// 业务 Copilot API
// ============================================================================

const copilotApi = {
  /** 创建会话 */
  createSession: (data: Types.CreateSessionRequest): Promise<ApiResponse<Types.CopilotSession>> =>
    apiClient.ai.post('/dsh/copilot/sessions', data),

  /** 发送消息 */
  sendMessage: (
    sessionId: string,
    data: Types.CopilotRequest
  ): Promise<ApiResponse<Types.CopilotResponse>> =>
    apiClient.ai.post(`/dsh/copilot/sessions/${sessionId}/messages`, data),

  /** 识别意图 */
  recognizeIntent: (data: {
    text: string;
    module?: Types.BusinessModuleType;
  }): Promise<ApiResponse<Types.IntentRecognitionResult>> =>
    apiClient.ai.post('/dsh/copilot/intent/recognize', data),

  /** 获取所有业务模块配置 */
  getAllModuleConfigs: (): Promise<ApiResponse<Types.BusinessModuleConfig[]>> =>
    apiClient.ai.get('/dsh/copilot/modules'),

  /** 获取业务模块配置 */
  getModuleConfig: (
    module: Types.BusinessModuleType
  ): Promise<ApiResponse<Types.BusinessModuleConfig>> =>
    apiClient.ai.get(`/dsh/copilot/modules/${module}`),
};

// ============================================================================
// 智能表单 API
// ============================================================================

const formsApi = {
  /** 获取所有表单模板 */
  getAllForms: (category?: string): Promise<ApiResponse<Types.FormDefinition[]>> =>
    apiClient.ai.get('/dsh/smart-forms/templates', {
      params: category ? { category } : undefined,
    }),

  /** 验证表单数据 */
  validateForm: (
    _formId: string,
    values: Record<string, unknown>
  ): Promise<ApiResponse<Types.FormValidationResult>> =>
    apiClient.ai.post('/dsh/smart-forms/validate', { values }),

  /** 自动填充表单 */
  autoFillForm: (
    _formId: string,
    context: Record<string, unknown>
  ): Promise<ApiResponse<Types.FormData>> =>
    apiClient.ai.post('/dsh/smart-forms/ai-fill', { context }),
};

// ============================================================================
// 文档智能 API
// ============================================================================

const documentsApi = {
  /** 获取文档列表 */
  listDocuments: (params?: {
    page?: number;
    page_size?: number;
    document_type?: Types.DocumentType;
    status?: Types.DocumentProcessingStatus;
  }): Promise<
    ApiResponse<{ items: Types.DocumentInfo[]; total: number; page: number; page_size: number }>
  > => apiClient.ai.get('/documents', { params }),

  /** 上传文档 */
  uploadDocument: (
    file: File,
    metadata?: Record<string, unknown>
  ): Promise<ApiResponse<Types.DocumentInfo>> => {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata) formData.append('metadata', JSON.stringify(metadata));
    return apiClient.ai.post('/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /** 获取文档信息 */
  getDocument: (documentId: string): Promise<ApiResponse<Types.DocumentInfo>> =>
    apiClient.ai.get(`/documents/${documentId}`),

  /** 删除文档 */
  deleteDocument: (documentId: string): Promise<ApiResponse<void>> =>
    apiClient.ai.delete(`/documents/${documentId}`),

  /** 生成文档摘要 */
  generateDocumentSummary: (
    documentId: string,
    summaryType?: Types.SummaryType
  ): Promise<ApiResponse<Types.DocumentSummary>> =>
    apiClient.ai.post(`/documents/${documentId}/summarize`, { summary_type: summaryType }),

  /** 下载文档 */
  downloadDocument: (documentId: string): Promise<Blob> =>
    apiClient.ai
      .get(`/documents/${documentId}/download`, { responseType: 'blob' })
      .then((r) => r.data as Blob),
};

// ============================================================================
// 治理仪表盘 API
// ============================================================================

export const governanceApi = {
  /** 获取治理仪表盘数据 */
  getDashboard: (
    timeRange?: Types.TimeRange
  ): Promise<ApiResponse<Types.GovernanceDashboardData>> =>
    apiClient.ai.get('/dsh/governance/dashboard', {
      params: timeRange ? { time_range: timeRange } : undefined,
    }),

  /** 获取治理评分 */
  getScore: (
    timeRange?: Types.TimeRange
  ): Promise<
    ApiResponse<{
      overall_score: number;
      governance_level: Types.GovernanceLevel;
      breakdown: {
        security: number;
        compliance: number;
        cost: number;
        performance: number;
        reliability: number;
      };
    }>
  > =>
    apiClient.ai.get('/dsh/governance/score', {
      params: timeRange ? { time_range: timeRange } : undefined,
    }),

  /** 获取风险评估 */
  getRiskAssessment: (timeRange?: Types.TimeRange): Promise<ApiResponse<Types.RiskAssessment>> =>
    apiClient.ai.get('/dsh/governance/risk', {
      params: timeRange ? { time_range: timeRange } : undefined,
    }),

  /** 获取合规状态 */
  getComplianceStatus: (framework?: string): Promise<ApiResponse<Types.ComplianceStatus>> =>
    apiClient.ai.get('/dsh/governance/compliance', {
      params: framework ? { framework } : undefined,
    }),

  /** 获取成本分析 */
  getCostAnalysis: (timeRange?: Types.TimeRange): Promise<ApiResponse<Types.CostAnalysis>> =>
    apiClient.ai.get('/dsh/governance/cost', {
      params: timeRange ? { time_range: timeRange } : undefined,
    }),

  /** 获取性能指标 */
  getPerformanceMetrics: (
    timeRange?: Types.TimeRange
  ): Promise<ApiResponse<Types.PerformanceMetrics>> =>
    apiClient.ai.get('/dsh/governance/performance', {
      params: timeRange ? { time_range: timeRange } : undefined,
    }),

  /** 获取安全事件 */
  getSecurityEvents: (params?: {
    severity?: Types.RiskLevel;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<{ items: Types.SecurityEventSummary[]; total: number }>> =>
    apiClient.ai.get('/dsh/governance/security-events', { params }),

  /** 获取审计日志摘要 */
  getAuditSummary: (timeRange?: Types.TimeRange): Promise<ApiResponse<Types.AuditSummary>> =>
    apiClient.ai.get('/dsh/governance/audit', {
      params: timeRange ? { time_range: timeRange } : undefined,
    }),

  /** 获取趋势数据 */
  getTrends: (
    timeRange?: Types.TimeRange,
    metrics?: string
  ): Promise<ApiResponse<Types.TrendDataPoint[]>> =>
    apiClient.ai.get('/dsh/governance/metrics', { params: { time_range: timeRange, metrics } }),

  /** 获取建议和改进项 */
  getRecommendations: (
    priority?: Types.RecommendationPriority
  ): Promise<ApiResponse<Types.Recommendation[]>> =>
    apiClient.ai.get('/dsh/governance/recommendations', {
      params: priority ? { priority } : undefined,
    }),

  /** 刷新仪表盘缓存 */
  refreshCache: (): Promise<ApiResponse<void>> => apiClient.ai.delete('/dsh/governance/cache'),

  /** 导出治理报告 */
  exportReport: (format: 'pdf' | 'excel' | 'json', timeRange?: Types.TimeRange): Promise<Blob> =>
    apiClient.ai
      .get('/dsh/governance/export', {
        params: { format, time_range: timeRange },
        responseType: 'blob',
      })
      .then((r) => r.data as Blob),
};

// ============================================================================
// 统一导出
// ============================================================================

const aiBusinessApi = {
  ...copilotApi,
  ...formsApi,
  ...documentsApi,
  ...governanceApi,
};

export default aiBusinessApi;
