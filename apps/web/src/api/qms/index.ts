import apiClient from '../client';
import type { ApiResponse } from '../client';
import { apiLogger } from '@/utils/logger';

import { standardApi } from './standard';
import { inspectionApi } from './inspection';
import { issueApi } from './issue';
import { improvementApi } from './improvement';
import { spcApi } from './spc';
import { qualityCostApi } from './qualityCost';
import { eightDApi } from './eightD';
import { fmeaApi } from './fmea';
import { qualityDashboardApi } from './dashboard';
import { syncApi } from './sync';
import { correctiveActionApi } from './correctiveAction';
import { auditApi } from './audit';
import { apqpApi } from './apqp';
import type { QmsStatistics, ApprovalRequest, ApprovalResponse, ApprovalEntityType } from './types';
import i18n from '@/i18n';

export * from './types';
export * from './adapters';

export { useQmsMock, default as useQmsMockDefault } from './_mock';
export type { QmsMockShape } from './_mock';

export { inspectionApi } from './inspection';
export { improvementApi } from './improvement';
export { spcApi } from './spc';
export { qualityCostApi } from './qualityCost';
export { eightDApi } from './eightD';
export { fmeaApi } from './fmea';
export { qualityDashboardApi } from './dashboard';
export { syncApi } from './sync';
export { correctiveActionApi } from './correctiveAction';
export { auditApi } from './audit';
export { apqpApi } from './apqp';

export const qmsApi = {
  standards: standardApi,
  inspections: inspectionApi,
  issues: issueApi,
  improvements: improvementApi,
  spc: spcApi,
  qualityCosts: qualityCostApi,
  eightD: eightDApi,
  fmea: fmeaApi,
  dashboard: qualityDashboardApi,
  sync: syncApi,
  correctiveActions: correctiveActionApi,
  audit: auditApi,
  apqp: apqpApi,

  // Quality Standards
  listStandards: standardApi.listStandards,
  getStandard: standardApi.getStandard,
  createStandard: standardApi.createStandard,
  updateStandard: standardApi.updateStandard,
  deleteStandard: standardApi.deleteStandard,
  listRevisions: standardApi.listRevisions,

  // Quality Checks
  listChecks: inspectionApi.listChecks,
  getCheck: inspectionApi.getCheck,
  createCheck: inspectionApi.createCheck,
  updateCheck: inspectionApi.updateCheck,
  deleteCheck: inspectionApi.deleteCheck,
  assignCheck: inspectionApi.assignCheck,
  submitCheckResult: inspectionApi.submitCheckResult,
  auditCheck: inspectionApi.auditCheck,
  reworkCheck: inspectionApi.reworkCheck,
  getCheckResults: inspectionApi.getCheckResults,
  getCheckAudits: inspectionApi.getCheckAudits,

  // Quality Issues
  listIssues: issueApi.listIssues,
  getIssue: issueApi.getIssue,
  createIssue: issueApi.createIssue,
  updateIssue: issueApi.updateIssue,
  deleteIssue: issueApi.deleteIssue,

  // Quality Improvements
  listImprovements: improvementApi.listImprovements,
  getImprovement: improvementApi.getImprovement,
  createImprovement: improvementApi.createImprovement,
  updateImprovement: improvementApi.updateImprovement,
  deleteImprovement: improvementApi.deleteImprovement,

  // SPC
  listSpcCharts: spcApi.listSpcCharts,
  getSpcChart: spcApi.getSpcChart,
  createSpcChart: spcApi.createSpcChart,
  updateSpcChart: spcApi.updateSpcChart,
  deleteSpcChart: spcApi.deleteSpcChart,
  getSpcDataPoints: spcApi.getSpcDataPoints,
  addSpcDataPoint: spcApi.addSpcDataPoint,
  calculateControlLimits: spcApi.calculateControlLimits,

  // Quality Cost
  listQualityCosts: qualityCostApi.listQualityCosts,
  getQualityCost: qualityCostApi.getQualityCost,
  createQualityCost: qualityCostApi.createQualityCost,
  updateQualityCost: qualityCostApi.updateQualityCost,
  deleteQualityCost: qualityCostApi.deleteQualityCost,
  getCostStatistics: qualityCostApi.getCostStatistics,
  getCostTrend: qualityCostApi.getCostTrend,

  // 8D
  listEightDReports: eightDApi.listEightDReports,
  getEightDReport: eightDApi.getEightDReport,
  createEightDReport: eightDApi.createEightDReport,
  updateEightDReport: eightDApi.updateEightDReport,
  deleteEightDReport: eightDApi.deleteEightDReport,
  updateD1Team: eightDApi.updateD1Team,
  submitD3Containment: eightDApi.submitD3Containment,
  submitD4RootCause: eightDApi.submitD4RootCause,
  submitD5PermanentAction: eightDApi.submitD5PermanentAction,
  verifyD6Effectiveness: eightDApi.verifyD6Effectiveness,
  submitD7Preventive: eightDApi.submitD7Preventive,
  closeEightDReport: eightDApi.closeEightDReport,
  getEightDAuditLogs: eightDApi.getEightDAuditLogs,

  // FMEA
  listFmeaAnalyses: fmeaApi.listFmeaAnalyses,
  getFmeaAnalysis: fmeaApi.getFmeaAnalysis,
  createFmeaAnalysis: fmeaApi.createFmeaAnalysis,
  updateFmeaAnalysis: fmeaApi.updateFmeaAnalysis,
  deleteFmeaAnalysis: fmeaApi.deleteFmeaAnalysis,
  getFmeaStatistics: fmeaApi.getFmeaStatistics,
  listFmeaItems: fmeaApi.listFmeaItems,
  getFmeaItem: fmeaApi.getFmeaItem,
  createFmeaItem: fmeaApi.createFmeaItem,
  updateFmeaItem: fmeaApi.updateFmeaItem,
  deleteFmeaItem: fmeaApi.deleteFmeaItem,

  // Quality Dashboard
  getQualityOverview: qualityDashboardApi.getQualityOverview,

  // Data Sync
  listSyncRecords: syncApi.listSyncRecords,
  getSyncRecord: syncApi.getSyncRecord,
  deleteSyncRecord: syncApi.deleteSyncRecord,
  retrySync: syncApi.retrySync,
  syncInspectionToLims: syncApi.syncInspectionToLims,
  syncIssueToEhs: syncApi.syncIssueToEhs,

  // Corrective Actions
  completeAction: correctiveActionApi.completeAction,
  getActionItems: correctiveActionApi.getActionItems,

  // Audit
  startAuditPlan: auditApi.startAuditPlan,
  completeAuditPlan: auditApi.completeAuditPlan,
  createAuditTask: auditApi.createAuditTask,
  createAuditFinding: auditApi.createAuditFinding,
  verifyAuditFinding: auditApi.verifyAuditFinding,

  // Audit Plans
  listAuditPlans: auditApi.listAuditPlans,

  // Audit Tasks
  listAuditTasks: auditApi.listAuditTasks,

  // Audit Findings
  listAuditFindings: auditApi.listAuditFindings,

  // Create Audit Plan
  createAuditPlan: auditApi.createAuditPlan,

  // Complete Audit Task
  completeAuditTask: auditApi.completeAuditTask,

  // APQP Projects
  listApqpProjects: apqpApi.listApqpProjects,
  getApqpProject: apqpApi.getApqpProject,
  createApqpProject: apqpApi.createApqpProject,
  updateApqpProject: apqpApi.updateApqpProject,
  deleteApqpProject: apqpApi.deleteApqpProject,
  transitionApqpStatus: apqpApi.transitionApqpStatus,
  getApqpProgress: apqpApi.getApqpProgress,

  // APQP Phases
  listApqpPhases: apqpApi.listApqpPhases,
  getApqpPhase: apqpApi.getApqpPhase,
  createApqpPhase: apqpApi.createApqpPhase,
  updateApqpPhase: apqpApi.updateApqpPhase,
  deleteApqpPhase: apqpApi.deleteApqpPhase,

  // APQP Tasks
  listApqpTasks: apqpApi.listApqpTasks,
  getApqpTask: apqpApi.getApqpTask,
  createApqpTask: apqpApi.createApqpTask,
  updateApqpTask: apqpApi.updateApqpTask,
  deleteApqpTask: apqpApi.deleteApqpTask,

  // APQP Risks
  listApqpRisks: apqpApi.listApqpRisks,
  getApqpRisk: apqpApi.getApqpRisk,
  createApqpRisk: apqpApi.createApqpRisk,
  updateApqpRisk: apqpApi.updateApqpRisk,
  deleteApqpRisk: apqpApi.deleteApqpRisk,

  // APQP Approvals
  listApqpApprovals: apqpApi.listApqpApprovals,
  createApqpApproval: apqpApi.createApqpApproval,
  processApqpApproval: apqpApi.processApqpApproval,

  // Statistics
  getStatistics: async (): Promise<ApiResponse<QmsStatistics>> => {
    try {
      // V64 容错：用 allSettled 替代 all，单个子 API 404（服务未启动）不影响整体
      const [standardsRes, checksRes, issuesRes, improvementsRes] = await Promise.allSettled([
        qmsApi.listStandards(),
        qmsApi.listChecks(),
        qmsApi.listIssues(),
        qmsApi.listImprovements(),
      ]);

      const standards = standardsRes.status === 'fulfilled' ? standardsRes.value.data || [] : [];
      const checks = checksRes.status === 'fulfilled' ? checksRes.value.data || [] : [];
      const issues = issuesRes.status === 'fulfilled' ? issuesRes.value.data || [] : [];
      const improvements =
        improvementsRes.status === 'fulfilled' ? improvementsRes.value.data || [] : [];

      const statistics: QmsStatistics = {
        total_standards: standards.length,
        active_standards: standards.filter(
          (s) => s.status === 'active' || s.status === i18n.t('shared.index.k0')
        ).length,
        inactive_standards: standards.filter(
          (s) => s.status === 'inactive' || s.status === i18n.t('shared.index.k1')
        ).length,

        total_inspections: checks.length,
        pending_inspections: checks.filter(
          (c) => c.status === 'pending' || c.status === i18n.t('shared.index.k2')
        ).length,
        in_progress_inspections: checks.filter(
          (c) => c.status === 'in_progress' || c.status === i18n.t('shared.index.k3')
        ).length,
        completed_inspections: checks.filter(
          (c) => c.status === 'completed' || c.status === i18n.t('shared.index.k4')
        ).length,

        total_issues: issues.length,
        open_issues: issues.filter(
          (i) =>
            i.status === 'open' ||
            i.status === i18n.t('shared.index.k6') ||
            i.status === i18n.t('shared.index.k5')
        ).length,
        resolved_issues: issues.filter(
          (i) =>
            i.status === 'closed' ||
            i.status === 'resolved' ||
            i.status === i18n.t('shared.index.k7')
        ).length,
        critical_issues: issues.filter(
          (i) => i.severity === 'critical' || i.severity === i18n.t('shared.index.k8')
        ).length,

        total_actions: improvements.length,
        pending_actions: improvements.filter(
          (a) => a.status === 'pending' || a.status === i18n.t('shared.index.k9')
        ).length,
        in_progress_actions: improvements.filter(
          (a) => a.status === 'in_progress' || a.status === i18n.t('shared.index.k10')
        ).length,
        completed_actions: improvements.filter(
          (a) => a.status === 'completed' || a.status === i18n.t('shared.index.k11')
        ).length,
      };

      return {
        success: true,
        data: statistics,
        message: 'Statistics calculated',
        code: 200,
        timestamp: Date.now(),
      };
    } catch (error: unknown) {
      // V64 降级：statistics 是聚合统计，服务未启动时返回空数据即可，不应刷屏 ERROR
      apiLogger.warn('Failed to calculate QMS statistics (service may be down):', error);
      const fallbackStats: QmsStatistics = {
        total_standards: 0,
        active_standards: 0,
        inactive_standards: 0,
        total_inspections: 0,
        pending_inspections: 0,
        in_progress_inspections: 0,
        completed_inspections: 0,
        total_issues: 0,
        open_issues: 0,
        resolved_issues: 0,
        critical_issues: 0,
        total_actions: 0,
        pending_actions: 0,
        in_progress_actions: 0,
        completed_actions: 0,
      };
      return {
        success: true,
        data: fallbackStats,
        message: 'Using fallback statistics',
        code: 200,
        timestamp: Date.now(),
      };
    }
  },

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.qms.get<string>('/health');
  },
};

// ============================================================================
// 通用审批 API — 调用 /api/qms/{entityType}/{id}/{action} 端点
// 支持 approve / reject / rework / cancel 四种审批动作
// ============================================================================
const qmsApprovalApi = {
  approve: async (
    entityType: ApprovalEntityType,
    id: string,
    data: { operator: string; comment?: string; next_status?: string }
  ): Promise<ApiResponse<ApprovalResponse>> => {
    return apiClient.qms.post<ApprovalResponse>(`/${entityType}/${id}/approve`, data);
  },

  reject: async (
    entityType: ApprovalEntityType,
    id: string,
    data: { operator: string; comment?: string }
  ): Promise<ApiResponse<ApprovalResponse>> => {
    return apiClient.qms.post<ApprovalResponse>(`/${entityType}/${id}/reject`, data);
  },

  rework: async (
    entityType: ApprovalEntityType,
    id: string,
    data: { operator: string; comment?: string; next_status?: string }
  ): Promise<ApiResponse<ApprovalResponse>> => {
    return apiClient.qms.post<ApprovalResponse>(`/${entityType}/${id}/rework`, data);
  },

  cancel: async (
    entityType: ApprovalEntityType,
    id: string,
    data: { operator: string; comment?: string }
  ): Promise<ApiResponse<ApprovalResponse>> => {
    return apiClient.qms.post<ApprovalResponse>(`/${entityType}/${id}/cancel`, data);
  },

  /**
   * 通用审批入口 — 根据 ApprovalRequest.action 分发到对应端点
   */
  process: async (request: ApprovalRequest): Promise<ApiResponse<ApprovalResponse>> => {
    const { entityType, entityId, action, operator, comment, nextStatus } = request;
    switch (action) {
      case 'approve':
        return qmsApprovalApi.approve(entityType, entityId, {
          operator,
          comment,
          next_status: nextStatus,
        });
      case 'reject':
        return qmsApprovalApi.reject(entityType, entityId, { operator, comment });
      case 'rework':
        return qmsApprovalApi.rework(entityType, entityId, {
          operator,
          comment,
          next_status: nextStatus,
        });
      case 'cancel':
        return qmsApprovalApi.cancel(entityType, entityId, { operator, comment });
      default:
        throw new Error(`Unsupported approval action: ${String(action)}`);
    }
  },
};

export default qmsApi;
