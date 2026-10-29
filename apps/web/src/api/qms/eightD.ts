import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  EightDReport,
  CreateEightDReportRequest,
  EightDReportBackend,
  UpdateEightDReportRequestBackend,
  EightDAuditLog,
  EightDAuditLogBackend,
} from './types';
import {
  adaptEightDReportToFrontend,
  adaptEightDReportToBackend,
  adaptEightDAuditLogToFrontend,
} from './adapters';

// API 不可用时的降级 mock（qms 服务停止等场景），避免页面空白/报错
const MOCK_EIGHTD_REPORTS = [
  {
    id: 'mock-1',
    reportNo: '8D202609001',
    title: '伺服电机异响（模拟）',
    problemDescription: 'API 不可用时的降级示例数据',
    severity: 'major',
    source: 'customer',
    productId: 'P001',
    productName: '伺服电机',
    customer: '示例客户A',
    status: 'in_progress',
    currentStage: 4,
    teamLeader: '张工',
    teamMembers: ['李工', '王工'],
    dueDate: '2026-10-30',
    createdAt: '2026-09-15T08:00:00Z',
  },
  {
    id: 'mock-2',
    reportNo: '8D202608002',
    title: '注塑件缩水率超标（模拟）',
    problemDescription: 'API 不可用时的降级示例数据',
    severity: 'critical',
    source: 'internal',
    productId: 'P002',
    productName: '注塑壳体',
    status: 'open',
    currentStage: 2,
    teamLeader: '李工',
    dueDate: '2026-11-05',
    createdAt: '2026-08-20T10:30:00Z',
  },
  {
    id: 'mock-3',
    reportNo: '8D202608003',
    title: 'PCB 焊点虚焊（模拟）',
    problemDescription: 'API 不可用时的降级示例数据',
    severity: 'minor',
    source: 'supplier',
    productId: 'P003',
    productName: '控制板',
    customer: '示例客户B',
    status: 'completed',
    currentStage: 7,
    teamLeader: '王工',
    teamMembers: ['赵工'],
    dueDate: '2026-09-20',
    createdAt: '2026-08-05T14:00:00Z',
  },
  {
    id: 'mock-4',
    reportNo: '8D202607004',
    title: '轴承温升异常（模拟）',
    problemDescription: 'API 不可用时的降级示例数据',
    severity: 'major',
    source: 'audit',
    productId: 'P004',
    productName: '减速机',
    status: 'closed',
    currentStage: 8,
    teamLeader: '赵工',
    dueDate: '2026-08-30',
    createdAt: '2026-07-10T09:00:00Z',
  },
  {
    id: 'mock-5',
    reportNo: '8D202607005',
    title: '密封圈老化开裂（模拟）',
    problemDescription: 'API 不可用时的降级示例数据',
    severity: 'major',
    source: 'customer',
    productId: 'P005',
    productName: '液压泵',
    customer: '示例客户C',
    status: 'closed',
    currentStage: 8,
    teamLeader: '孙工',
    dueDate: '2026-09-10',
    createdAt: '2026-07-22T16:30:00Z',
  },
].map((r) => ({
  ...r,
  report_no: r.reportNo,
  product_name: r.productName,
  created_date: r.createdAt,
})) as unknown as EightDReport[];

export const eightDApi = {
  listEightDReports: async (): Promise<ApiResponse<EightDReport[]>> => {
    try {
      const response = await apiClient.qms.get<{ reports?: EightDReportBackend[] }>('/eightd');
      const adaptedData = (response.data?.reports || []).map(adaptEightDReportToFrontend);
      return { ...response, data: adaptedData };
    } catch (e) {
      // qms 服务不可用（503/连接失败）时降级 mock，保证列表/统计页可正常展示
      console.warn('[8D API] service unavailable, using mock data:', e);
      return {
        success: true,
        code: 0,
        message: 'mock fallback (service unavailable)',
        data: MOCK_EIGHTD_REPORTS as EightDReport[],
        timestamp: Date.now(),
      };
    }
  },

  getEightDReport: async (id: string): Promise<ApiResponse<EightDReport | undefined>> => {
    const response = await apiClient.qms.get<EightDReportBackend>(`/eightd/${id}`);
    return {
      ...response,
      data: response.data ? adaptEightDReportToFrontend(response.data) : ({} as EightDReport),
    };
  },

  createEightDReport: async (
    data: CreateEightDReportRequest
  ): Promise<ApiResponse<EightDReport | undefined>> => {
    const backendData = adaptEightDReportToBackend(data);
    const response = await apiClient.qms.post<EightDReportBackend>('/eightd', backendData);
    return {
      ...response,
      data: response.data ? adaptEightDReportToFrontend(response.data) : ({} as EightDReport),
    };
  },

  updateEightDReport: async (
    id: string,
    data: Partial<CreateEightDReportRequest>
  ): Promise<ApiResponse<EightDReport | undefined>> => {
    const backendData: UpdateEightDReportRequestBackend = {
      title: data.title,
      problem_description: data.problemDescription,
      d2_problem_description: data.problemDescription,
      severity: data.severity,
      source: data.source,
      product_id: data.productId,
      product_name: data.productName,
      customer: data.customer,
      assignee: data.assignee,
      due_date: data.dueDate,
      d1_team: data.d1Team,
      d1_leader: data.d1Leader,
      d3_containment_action: data.d3ContainmentAction,
      d4_root_cause: data.d4RootCause,
      d4_cause_analysis: data.d4CauseAnalysis,
      d5_permanent_action: data.d5PermanentAction,
      d6_verification_result: data.d6VerificationResult,
      d7_preventive_action: data.d7PreventiveAction,
      d8_congratulations: data.d8Congratulations,
    };
    const response = await apiClient.qms.put<EightDReportBackend>(`/eightd/${id}`, backendData);
    return {
      ...response,
      data: response.data ? adaptEightDReportToFrontend(response.data) : ({} as EightDReport),
    };
  },

  deleteEightDReport: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.qms.delete<boolean>(`/eightd/${id}`);
  },

  updateD1Team: async (
    id: string,
    data: { teamLeader?: string; teamMembers?: string[]; content?: string }
  ): Promise<ApiResponse<EightDReport | undefined>> => {
    const response = await apiClient.qms.post<EightDReportBackend>(`/eightd/${id}/d1-team`, {
      team_leader: data.teamLeader,
      team_members: data.teamMembers,
      content: data.content,
    });
    return {
      ...response,
      data: response.data ? adaptEightDReportToFrontend(response.data) : ({} as EightDReport),
    };
  },

  submitD3Containment: async (
    id: string,
    data: { content: string; operator?: string }
  ): Promise<ApiResponse<EightDReport | undefined>> => {
    const response = await apiClient.qms.post<EightDReportBackend>(
      `/eightd/${id}/d3-containment`,
      data
    );
    return {
      ...response,
      data: response.data ? adaptEightDReportToFrontend(response.data) : ({} as EightDReport),
    };
  },

  submitD4RootCause: async (
    id: string,
    data: { content: string; operator?: string }
  ): Promise<ApiResponse<EightDReport | undefined>> => {
    const response = await apiClient.qms.post<EightDReportBackend>(
      `/eightd/${id}/d4-root-cause`,
      data
    );
    return {
      ...response,
      data: response.data ? adaptEightDReportToFrontend(response.data) : ({} as EightDReport),
    };
  },

  submitD5PermanentAction: async (
    id: string,
    data: { content: string; operator?: string }
  ): Promise<ApiResponse<EightDReport | undefined>> => {
    const response = await apiClient.qms.post<EightDReportBackend>(
      `/eightd/${id}/d5-permanent-action`,
      data
    );
    return {
      ...response,
      data: response.data ? adaptEightDReportToFrontend(response.data) : ({} as EightDReport),
    };
  },

  verifyD6Effectiveness: async (
    id: string,
    data: { content: string; operator?: string; isEffective: boolean }
  ): Promise<ApiResponse<EightDReport | undefined>> => {
    const response = await apiClient.qms.post<EightDReportBackend>(`/eightd/${id}/d6-verify`, data);
    return {
      ...response,
      data: response.data ? adaptEightDReportToFrontend(response.data) : ({} as EightDReport),
    };
  },

  submitD7Preventive: async (
    id: string,
    data: { content: string; operator?: string }
  ): Promise<ApiResponse<EightDReport | undefined>> => {
    const response = await apiClient.qms.post<EightDReportBackend>(
      `/eightd/${id}/d7-preventive`,
      data
    );
    return {
      ...response,
      data: response.data ? adaptEightDReportToFrontend(response.data) : ({} as EightDReport),
    };
  },

  closeEightDReport: async (
    id: string,
    data: { content?: string; operator?: string }
  ): Promise<ApiResponse<EightDReport | undefined>> => {
    const response = await apiClient.qms.post<EightDReportBackend>(`/eightd/${id}/close`, data);
    return {
      ...response,
      data: response.data ? adaptEightDReportToFrontend(response.data) : ({} as EightDReport),
    };
  },

  getEightDAuditLogs: async (id: string): Promise<ApiResponse<EightDAuditLog[]>> => {
    const response = await apiClient.qms.get<{ logs?: EightDAuditLogBackend[] }>(
      `/eightd/${id}/audit-logs`
    );
    const adaptedData = (response.data?.logs || []).map(adaptEightDAuditLogToFrontend);
    return { ...response, data: adaptedData };
  },

  // ── v74 to_bind 补绑（2026-10-29）──
  approveEightd: async (id: string): Promise<ApiResponse<EightDReport>> => {
    return apiClient.qms.post<EightDReport>(`/eightd/${id}/approve`);
  },

  closeEightdApproval: async (id: string): Promise<ApiResponse<EightDReport>> => {
    return apiClient.qms.post<EightDReport>(`/eightd/${id}/close-approval`);
  },

  cancelEightd: async (id: string): Promise<ApiResponse<EightDReport>> => {
    return apiClient.qms.post<EightDReport>(`/eightd/${id}/cancel`);
  },
};
