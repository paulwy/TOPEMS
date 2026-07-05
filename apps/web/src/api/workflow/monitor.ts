import apiClient from '../client';
import type {
  ProcessMonitorQueryParams,
  ProcessInstanceDetail,
  ProcessAnalysisData,
  ProcessLog,
  ProcessLogQueryParams,
  WorkflowEfficiencyAnalysis,
  WorkflowTrendData,
  UserWorkflowStats,
  DepartmentWorkflowStats,
  StatisticsQueryParams,
  ListParams,
} from './types';

export const monitorApi = {
  listInstances: (params?: ProcessMonitorQueryParams) => {
    return apiClient.workflow.get('/monitor/instances', { params });
  },

  getInstanceDetail: (id: string): Promise<ProcessInstanceDetail> => {
    return apiClient.workflow.get(`/monitor/instances/${id}`) as unknown as Promise<ProcessInstanceDetail>;
  },

  getInstanceHistory: (id: string, params?: ListParams) => {
    return apiClient.workflow.get(`/monitor/instances/${id}/history`, { params });
  },

  getInstanceTasks: (id: string, params?: ListParams) => {
    return apiClient.workflow.get(`/monitor/instances/${id}/tasks`, { params });
  },

  getInstanceVariables: (id: string) => {
    return apiClient.workflow.get(`/monitor/instances/${id}/variables`);
  },

  getInstanceDiagram: (id: string) => {
    return apiClient.workflow.get(`/monitor/instances/${id}/diagram`);
  },

  getRunningInstances: (params?: ListParams) => {
    return apiClient.workflow.get('/monitor/instances/running', { params });
  },

  getCompletedInstances: (params?: ListParams) => {
    return apiClient.workflow.get('/monitor/instances/completed', { params });
  },

  getRejectedInstances: (params?: ListParams) => {
    return apiClient.workflow.get('/monitor/instances/rejected', { params });
  },

  getSuspendedInstances: (params?: ListParams) => {
    return apiClient.workflow.get('/monitor/instances/suspended', { params });
  },

  getOverdueInstances: (params?: ListParams) => {
    return apiClient.workflow.get('/monitor/instances/overdue', { params });
  },

  getStatistics: (params?: StatisticsQueryParams) => {
    return apiClient.workflow.get('/monitor/statistics', { params });
  },

  getWorkflowAnalysis: (workflowId: string): Promise<ProcessAnalysisData> => {
    return apiClient.workflow.get(`/monitor/analysis/${workflowId}`) as unknown as Promise<ProcessAnalysisData>;
  },

  getNodeStatistics: (workflowId: string) => {
    return apiClient.workflow.get(`/monitor/analysis/${workflowId}/nodes`);
  },

  getBottleneckAnalysis: (workflowId: string) => {
    return apiClient.workflow.get(`/monitor/analysis/${workflowId}/bottlenecks`);
  },

  getEfficiencyAnalysis: (params?: StatisticsQueryParams): Promise<WorkflowEfficiencyAnalysis> => {
    return apiClient.workflow.get('/monitor/analysis/efficiency', { params }) as unknown as Promise<WorkflowEfficiencyAnalysis>;
  },

  getTrendData: (params?: StatisticsQueryParams): Promise<WorkflowTrendData[]> => {
    return apiClient.workflow.get('/monitor/analysis/trend', { params }) as unknown as Promise<WorkflowTrendData[]>;
  },

  getUserStats: (params?: StatisticsQueryParams): Promise<UserWorkflowStats[]> => {
    return apiClient.workflow.get('/monitor/analysis/users', { params }) as unknown as Promise<UserWorkflowStats[]>;
  },

  getDepartmentStats: (params?: StatisticsQueryParams): Promise<DepartmentWorkflowStats[]> => {
    return apiClient.workflow.get('/monitor/analysis/departments', { params }) as unknown as Promise<DepartmentWorkflowStats[]>;
  },

  listLogs: (params?: ProcessLogQueryParams) => {
    return apiClient.workflow.get('/monitor/logs', { params });
  },

  getLog: (id: string): Promise<ProcessLog> => {
    return apiClient.workflow.get(`/monitor/logs/${id}`) as unknown as Promise<ProcessLog>;
  },

  getLogsByInstance: (instanceId: string, params?: ListParams) => {
    return apiClient.workflow.get(`/monitor/logs/instance/${instanceId}`, { params });
  },

  getLogsByWorkflow: (workflowId: string, params?: ListParams) => {
    return apiClient.workflow.get(`/monitor/logs/workflow/${workflowId}`, { params });
  },

  getLogsByNode: (workflowId: string, nodeId: string, params?: ListParams) => {
    return apiClient.workflow.get(`/monitor/logs/node/${workflowId}/${nodeId}`, { params });
  },

  getLogsByUser: (userId: string, params?: ListParams) => {
    return apiClient.workflow.get(`/monitor/logs/user/${userId}`, { params });
  },

  getRealTimeStats: () => {
    return apiClient.workflow.get('/monitor/realtime');
  },

  getDashboardData: () => {
    return apiClient.workflow.get('/monitor/dashboard');
  },

  getPerformanceMetrics: (params?: StatisticsQueryParams) => {
    return apiClient.workflow.get('/monitor/performance', { params });
  },

  getSlaCompliance: (params?: StatisticsQueryParams) => {
    return apiClient.workflow.get('/monitor/sla-compliance', { params });
  },

  getErrorInstances: (params?: ListParams) => {
    return apiClient.workflow.get('/monitor/instances/error', { params });
  },

  retryInstance: (id: string, data?: { node_id?: string }) => {
    return apiClient.workflow.post(`/monitor/instances/${id}/retry`, data);
  },

  skipNode: (id: string, data: { node_id: string }) => {
    return apiClient.workflow.post(`/monitor/instances/${id}/skip`, data);
  },

  forceComplete: (id: string, data?: { reason?: string }) => {
    return apiClient.workflow.post(`/monitor/instances/${id}/force-complete`, data);
  },

  forceTerminate: (id: string, data?: { reason?: string }) => {
    return apiClient.workflow.post(`/monitor/instances/${id}/force-terminate`, data);
  },
};
