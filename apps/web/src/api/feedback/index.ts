import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

import type {
  Feedback,
  CreateFeedbackRequest,
  UpdateFeedbackRequest,
  FeedbackQueryParams,
} from './types';

import { slaApi } from './sla';
import { categoryApi } from './category';
import { attachmentApi } from './attachment';
import { dashboardApi } from './dashboard';
import { batchApi } from './batch';
import { workflowApi } from './workflow';
import { assignmentRuleApi } from './assignmentRule';
import { aiAnalysisApi } from './aiAnalysis';

export * from './types';

export interface FeedbackComment {
  id: string;
  feedback_id: string;
  author_id: string;
  content: string;
  is_private?: boolean;
  created_at?: string;
}

export interface FeedbackStats {
  total: number;
  by_status: Record<string, number>;
  by_type: Record<string, number>;
  resolved_this_month: number;
  avg_resolution_days?: number;
}

export const feedbackApi = {
  // ==================== 反馈 CRUD ====================

  list: async (params?: FeedbackQueryParams): Promise<ApiResponse<PaginatedResponse<Feedback>>> => {
    return apiClient.feedback.get('/feedbacks', { params });
  },

  listFeedbacks: async (
    params?: FeedbackQueryParams
  ): Promise<ApiResponse<PaginatedResponse<Feedback>>> => {
    return apiClient.feedback.get('/feedbacks', { params });
  },

  get: async (id: string): Promise<ApiResponse<Feedback>> => {
    return apiClient.feedback.get(`/feedbacks/${id}`);
  },

  getFeedback: async (id: string): Promise<ApiResponse<Feedback>> => {
    return apiClient.feedback.get(`/feedbacks/${id}`);
  },

  create: async (data: CreateFeedbackRequest): Promise<ApiResponse<Feedback>> => {
    return apiClient.feedback.post('/feedbacks', data);
  },

  createFeedback: async (data: CreateFeedbackRequest): Promise<ApiResponse<Feedback>> => {
    return apiClient.feedback.post('/feedbacks', data);
  },

  update: async (id: string, data: UpdateFeedbackRequest): Promise<ApiResponse<Feedback>> => {
    return apiClient.feedback.put(`/feedbacks/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.feedback.delete(`/feedbacks/${id}`);
  },

  deleteFeedback: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.feedback.delete(`/feedbacks/${id}`);
  },

  respond: async (
    id: string,
    data: {
      response_type: 'acknowledgment' | 'update' | 'resolution' | 'rejection';
      content: string;
    }
  ): Promise<ApiResponse<Feedback>> => {
    return apiClient.feedback.post(`/feedbacks/${id}/respond`, data);
  },

  changeStatus: async (
    id: string,
    status: string,
    reason?: string
  ): Promise<ApiResponse<Feedback>> => {
    return apiClient.feedback.put(`/feedbacks/${id}/status`, { status, reason });
  },

  assign: async (id: string, assigneeId: string): Promise<ApiResponse<Feedback>> => {
    return apiClient.feedback.post(`/feedbacks/${id}/assign`, { assignee_id: assigneeId });
  },

  addComment: async (
    id: string,
    data: {
      content: string;
      is_private?: boolean;
    }
  ): Promise<ApiResponse<FeedbackComment>> => {
    return apiClient.feedback.post(`/feedbacks/${id}/comments`, data);
  },

  listComments: async (id: string): Promise<ApiResponse<FeedbackComment[]>> => {
    return apiClient.feedback.get(`/feedbacks/${id}/comments`);
  },

  // ==================== 统计 ====================

  getStats: async (params?: {
    period?: 'month' | 'quarter' | 'year';
  }): Promise<ApiResponse<FeedbackStats>> => {
    return apiClient.feedback.get('/feedbacks/stats', { params });
  },

  getMy: async (params?: {
    status?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<Feedback>>> => {
    return apiClient.feedback.get('/feedbacks/my', { params });
  },

  // ==================== SLA 子域 ====================

  sla: slaApi,
  listSlaPolicies: slaApi.listSlaPolicies,
  getSlaPolicy: slaApi.getSlaPolicy,
  createSlaPolicy: slaApi.createSlaPolicy,
  updateSlaPolicy: slaApi.updateSlaPolicy,
  deleteSlaPolicy: slaApi.deleteSlaPolicy,
  getFeedbackSla: slaApi.getFeedbackSla,
  calculateFeedbackSla: slaApi.calculateFeedbackSla,
  getSlaStats: slaApi.getSlaStats,

  // ==================== 分类与标签子域 ====================

  categories: categoryApi,
  listCategories: categoryApi.listCategories,
  getCategory: categoryApi.getCategory,
  createCategory: categoryApi.createCategory,
  updateCategory: categoryApi.updateCategory,
  deleteCategory: categoryApi.deleteCategory,
  listTags: categoryApi.listTags,
  createTag: categoryApi.createTag,
  updateTag: categoryApi.updateTag,
  deleteTag: categoryApi.deleteTag,
  addTagToFeedback: categoryApi.addTagToFeedback,
  removeTagFromFeedback: categoryApi.removeTagFromFeedback,
  bulkAddTagsToFeedback: categoryApi.bulkAddTagsToFeedback,

  // ==================== 附件子域 ====================

  attachments: attachmentApi,
  listAttachments: attachmentApi.listAttachments,
  uploadAttachment: attachmentApi.uploadAttachment,
  deleteAttachment: attachmentApi.deleteAttachment,
  bulkDeleteAttachments: attachmentApi.bulkDeleteAttachments,
  downloadAttachment: attachmentApi.downloadAttachment,
  bulkUploadAttachments: attachmentApi.bulkUploadAttachments,

  // ==================== 统计与看板子域 ====================

  dashboard: dashboardApi,
  getDashboardSummary: dashboardApi.getSummary,
  getTrend: dashboardApi.getTrend,
  getByType: dashboardApi.getByType,
  getByStatus: dashboardApi.getByStatus,
  getByAssignee: dashboardApi.getByAssignee,
  getSlaDashboard: dashboardApi.getSlaDashboard,
  getSatisfaction: dashboardApi.getSatisfaction,
  getCategoryStats: dashboardApi.getCategoryStats,
  getResolutionTimeTrend: dashboardApi.getResolutionTimeTrend,
  getFeedbackSourceStats: dashboardApi.getFeedbackSourceStats,
  getTopIssues: dashboardApi.getTopIssues,
  getResponseTimeStats: dashboardApi.getResponseTimeStats,
  getAssigneeWorkload: dashboardApi.getAssigneeWorkload,

  // ==================== 批量操作子域 ====================

  batch: batchApi,
  batchChangeStatus: batchApi.batchChangeStatus,
  batchAssign: batchApi.batchAssign,
  batchDelete: batchApi.batchDelete,
  batchResolve: batchApi.batchResolve,
  batchClose: batchApi.batchClose,
  batchAddTags: batchApi.batchAddTags,
  batchRemoveTags: batchApi.batchRemoveTags,
  exportFeedbacks: batchApi.exportFeedbacks,
  getExportStatus: batchApi.getExportStatus,
  importFeedbacks: batchApi.importFeedbacks,

  // ==================== 自动化工作流子域 ====================

  workflow: workflowApi,
  listWorkflows: workflowApi.listWorkflows,
  getWorkflow: workflowApi.getWorkflow,
  createWorkflow: workflowApi.createWorkflow,
  updateWorkflow: workflowApi.updateWorkflow,
  deleteWorkflow: workflowApi.deleteWorkflow,
  triggerWorkflow: workflowApi.triggerWorkflow,
  getWorkflowHistory: workflowApi.getWorkflowHistory,
  listTriggers: workflowApi.listTriggers,
  createTrigger: workflowApi.createTrigger,
  getTrigger: workflowApi.getTrigger,
  updateTrigger: workflowApi.updateTrigger,
  deleteTrigger: workflowApi.deleteTrigger,
  listActions: workflowApi.listActions,
  createAction: workflowApi.createAction,
  getAction: workflowApi.getAction,
  updateAction: workflowApi.updateAction,
  deleteAction: workflowApi.deleteAction,
  validateWorkflow: workflowApi.validateWorkflow,
  getWorkflowStats: workflowApi.getWorkflowStats,

  // ==================== 智能分派规则子域 ====================

  assignment: assignmentRuleApi,
  listAssignmentRules: assignmentRuleApi.listRules,
  getAssignmentRule: assignmentRuleApi.getRule,
  createAssignmentRule: assignmentRuleApi.createRule,
  updateAssignmentRule: assignmentRuleApi.updateRule,
  deleteAssignmentRule: assignmentRuleApi.deleteRule,
  activateAssignmentRule: assignmentRuleApi.activateRule,
  deactivateAssignmentRule: assignmentRuleApi.deactivateRule,
  testAssignmentRule: assignmentRuleApi.testRule,
  reorderAssignmentRules: assignmentRuleApi.reorderRules,
  autoAssign: assignmentRuleApi.autoAssign,
  listAssignmentHistory: assignmentRuleApi.listAssignmentHistory,
  listAssignmentAgents: assignmentRuleApi.listAgents,
  addAssignmentAgent: assignmentRuleApi.addAgent,
  removeAssignmentAgent: assignmentRuleApi.removeAgent,
  getAssignmentRuleStats: assignmentRuleApi.getRuleStats,

  // ==================== AI 智能分析子域 ====================

  ai: aiAnalysisApi,
  analyzeSentiment: aiAnalysisApi.analyzeSentiment,
  classifyFeedback: aiAnalysisApi.classifyFeedback,
  predictPriority: aiAnalysisApi.predictPriority,
  findSimilar: aiAnalysisApi.findSimilar,
  generateResponse: aiAnalysisApi.generateResponse,
  extractIssues: aiAnalysisApi.extractIssues,
  getTrendPrediction: aiAnalysisApi.getTrendPrediction,
  batchAnalyze: aiAnalysisApi.batchAnalyze,
  listAiModels: aiAnalysisApi.listModels,
  createAiModel: aiAnalysisApi.createModel,
  getAiModel: aiAnalysisApi.getModel,
  updateAiModel: aiAnalysisApi.updateModel,
  deleteAiModel: aiAnalysisApi.deleteModel,
  testAiModel: aiAnalysisApi.testModel,
  listAnalysisHistory: aiAnalysisApi.listAnalysisHistory,
  getAnalysisStats: aiAnalysisApi.getAnalysisStats,
  submitFeedbackForLearning: aiAnalysisApi.submitFeedbackForLearning,
};

export type {
  FeedbackSlaPolicy,
  FeedbackSlaInfo,
  CreateSlaPolicyRequest,
  FeedbackSlaStats,
} from './sla';

export type {
  FeedbackCategory,
  FeedbackTag,
  CreateCategoryRequest,
  CreateTagRequest,
} from './category';

export type { FeedbackAttachment, UploadAttachmentRequest, BulkUploadResult } from './attachment';

export type {
  DashboardSummary,
  TrendPoint,
  ByTypeStat,
  ByStatusStat,
  ByAssigneeStat,
  SlaDashboard,
  SatisfactionStat,
  CategoryStat,
  ResolutionTimeTrendPoint,
  BySourceStat,
  TopIssue,
  ResponseTimeStats,
  AssigneeWorkload,
} from './dashboard';

export type {
  BatchStatusRequest,
  BatchAssignRequest,
  BatchTagRequest,
  BatchOperationResult,
  ExportRequest,
  ExportTask,
  ImportRequest,
  ImportResult,
  FeedbackStatus,
  ExportFormat,
} from './batch';

export type {
  WorkflowRule,
  WorkflowTrigger,
  WorkflowAction,
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
  ValidateRequest,
  WorkflowHistory,
  WorkflowStats,
  WorkflowStatus,
  TriggerType,
  ActionType,
} from './workflow';

export type {
  AssignmentRule,
  AssignmentAgent,
  CreateAssignmentRuleRequest,
  UpdateAssignmentRuleRequest,
  TestAssignmentRequest,
  AutoAssignRequest,
  AssignmentHistory,
  AssignmentRuleStats,
  AssignmentRuleType,
  AssignmentRuleStatus,
} from './assignmentRule';

export type {
  SentimentResult,
  ClassificationResult,
  PriorityPrediction,
  SimilarFeedback,
  GeneratedResponse,
  ExtractedIssue,
  TrendPrediction,
  AiModel,
  AnalysisHistory,
  AnalysisStats,
  AnalyzeRequest,
  BatchAnalyzeRequest,
  CreateModelRequest,
  SentimentType,
  PriorityLevel,
  AiModelType,
  ModelStatus,
} from './aiAnalysis';

export default feedbackApi;
