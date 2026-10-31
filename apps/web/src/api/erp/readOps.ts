import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 BIZ 接入候选 erp 50 条（2026-10-29，剔除 addressbook 冒烟 stub 10）──
export const erpReadApi = {
  getDashboardData: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/master-data-refs/dashboard/{dashboard_id}/data'),
  getKpiSummary: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/master-data-refs/dashboard/kpi/summary'),
  getRepairWorkflow: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/master-data/quality/repair-workflows/{id}'),
  getArchivePolicy: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/mdm-v49/get-archive-policy'),
  getPopularEntries: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/master-data-refs/get-popular-entries-handler'),
  graphqlEndpoint: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/master-data/graphql'),
  listProductionOrders: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/production-orders'),
  qualityAiPredictQuality: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/master-data/quality-ai/predict/{id}'),
  getImprovementPlan: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/master-data-refs/maturity/improvement-plan'),
  cancelRetirementPlan: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/mdm-v49/cancel-retirement-plan'),
  getAssociationRecommendations: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/master-data/recommendations/associations'),
  listRecentCustomers: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/customers/recent'),
  getLifecycleDashboard: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/mdm-v49/get-lifecycle-dashboard'),
  listCompanyRelations: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/consolidation/company-relations'),
  getCompanyTree: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/consolidation/company-tree'),
  listEliminationRules: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/consolidation/elimination-rules'),
  listInternalTransactions: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/consolidation/internal-transactions'),
  listScopes: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/consolidation/scopes'),
  getQualityTrend: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/master-data-refs/governance/quality-trend'),
  startQualityTicket: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.post('/master-data/quality/tickets/{id}/start', data ?? {}),
  submitQualityTicket: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.post('/master-data/quality/tickets/{id}/submit', data ?? {}),
  verifyQualityTicket: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.post('/master-data/quality/tickets/{id}/verify', data ?? {}),
  rejectQualityTicket: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.post('/master-data/quality/tickets/{id}/reject', data ?? {}),
  escalateTicket: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.post('/master-data/quality/tickets/{id}/escalate', data ?? {}),
  createRepairWorkflow: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.post('/master-data/quality/repair-workflows', data ?? {}),
  getRepairWorkflow2: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/master-data/quality/repair-workflows/{id}'),
  approveRepairWorkflow: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.post('/master-data/quality/repair-workflows/{id}/approve', data ?? {}),
  verifyRepair: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.post('/master-data/quality/repair-workflows/{id}/verify', data ?? {}),
  getAssociationRecommendations2: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/master-data/recommendations/associations'),
  mdmGatewayBatch: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.post('/master-data/gateway/batch', data ?? {}),
  qualityAiGetAnomalies: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/master-data/quality-ai/anomalies'),
  qualityAiPredictQuality2: async (
    data?: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.post('/master-data/quality-ai/predict/{id}', data ?? {}),
  qualityAiGetStats: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/master-data/quality-ai/stats'),
  getKpiSummary2: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/master-data-refs/dashboard/kpi/summary'),
  getDashboardData2: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/master-data-refs/dashboard/{dashboard_id}/data'),
  proxyListEmployees2: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/hr/employees'),
  proxyListPositions2: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/hr/positions'),
  proxyListAttendances2: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/hr/attendances'),
  proxyGetAttendance2: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/hr/attendances/{id}'),
  listEmployeesFromHrm2: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/example/employees'),
};
