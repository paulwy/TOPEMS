import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { ApprovalStartRequest, ApprovalDecisionRequest, ApprovalResponse } from './types';

export const mesApprovalApi = {
  // APV-1: 生产订单变更审批
  startProductionOrderApproval: (orderId: string, data: ApprovalStartRequest) =>
    apiClient.mes.post<ApiResponse<ApprovalResponse>>(`/production-orders/${orderId}/approval/start`, data),
  approveProductionOrder: (orderId: string, data: ApprovalDecisionRequest) =>
    apiClient.mes.post<ApiResponse<ApprovalResponse>>(`/production-orders/${orderId}/approval/approve`, data),
  rejectProductionOrder: (orderId: string, data: ApprovalDecisionRequest) =>
    apiClient.mes.post<ApiResponse<ApprovalResponse>>(`/production-orders/${orderId}/approval/reject`, data),

  // APV-2: 工单返工审批
  startReworkApproval: (reportId: string, data: ApprovalStartRequest) =>
    apiClient.mes.post<ApiResponse<ApprovalResponse>>(`/work-reports/${reportId}/approval/start`, data),
  approveRework: (reportId: string, data: ApprovalDecisionRequest) =>
    apiClient.mes.post<ApiResponse<ApprovalResponse>>(`/work-reports/${reportId}/approval/approve`, data),
  rejectRework: (reportId: string, data: ApprovalDecisionRequest) =>
    apiClient.mes.post<ApiResponse<ApprovalResponse>>(`/work-reports/${reportId}/approval/reject`, data),

  // APV-3: 让步接收审批
  startConcessionApproval: (inspectionId: string, data: ApprovalStartRequest) =>
    apiClient.mes.post<ApiResponse<ApprovalResponse>>(`/quality-inspections/${inspectionId}/approval/start`, data),
  approveConcession: (inspectionId: string, data: ApprovalDecisionRequest) =>
    apiClient.mes.post<ApiResponse<ApprovalResponse>>(`/quality-inspections/${inspectionId}/approval/approve`, data),
  rejectConcession: (inspectionId: string, data: ApprovalDecisionRequest) =>
    apiClient.mes.post<ApiResponse<ApprovalResponse>>(`/quality-inspections/${inspectionId}/approval/reject`, data),

  // APV-4: 异常处置审批
  startAnomalyApproval: (anomalyId: string, data: ApprovalStartRequest) =>
    apiClient.mes.post<ApiResponse<ApprovalResponse>>(`/anomalies/${anomalyId}/approval/start`, data),
  approveAnomaly: (anomalyId: string, data: ApprovalDecisionRequest) =>
    apiClient.mes.post<ApiResponse<ApprovalResponse>>(`/anomalies/${anomalyId}/approval/approve`, data),
  rejectAnomaly: (anomalyId: string, data: ApprovalDecisionRequest) =>
    apiClient.mes.post<ApiResponse<ApprovalResponse>>(`/anomalies/${anomalyId}/approval/reject`, data),
};
