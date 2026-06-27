import apiClient from '../client';
import type { ApiResponse } from '../client';

import { workflowDefinitionApi } from './definition';
import { instanceApi } from './instance';
import { approvalApi, approvalTaskApi } from './approval';
import { templateApi } from './template';
import { notificationApi } from './notification';
import { settingApi } from './setting';
import { historyApi } from './history';
import type { StatisticsResponse, PerformanceStats } from './types';

export * from './types';

export { workflowDefinitionApi } from './definition';
export { instanceApi } from './instance';
export { approvalApi, approvalTaskApi } from './approval';
export { templateApi } from './template';
export { notificationApi } from './notification';
export { settingApi } from './setting';
export { historyApi } from './history';

export const workflowApi = {
  workflows: workflowDefinitionApi,
  instances: instanceApi,
  approvals: approvalApi,
  approvalTasks: approvalTaskApi,
  notifications: notificationApi,
  templates: templateApi,
  settings: settingApi,
  history: historyApi,

  listWorkflows: workflowDefinitionApi.listWorkflows,
  getWorkflow: workflowDefinitionApi.getWorkflow,
  createWorkflow: workflowDefinitionApi.createWorkflow,
  updateWorkflow: workflowDefinitionApi.updateWorkflow,
  deleteWorkflow: workflowDefinitionApi.deleteWorkflow,
  deployWorkflow: workflowDefinitionApi.deploy,
  activateWorkflow: workflowDefinitionApi.activate,
  deactivateWorkflow: workflowDefinitionApi.deactivate,

  listInstances: instanceApi.listInstances,
  startInstance: instanceApi.start,
  getInstance: instanceApi.getInstance,
  getInstanceDetails: instanceApi.getDetails,
  cancelInstance: instanceApi.cancelInstance,
  suspendInstance: instanceApi.suspendInstance,
  resumeInstance: instanceApi.resumeInstance,

  listApprovals: approvalApi.listApprovals,
  createApproval: approvalApi.create,
  getApproval: approvalApi.get,
  processApproval: approvalApi.process,

  listApprovalTasks: approvalTaskApi.listApprovalTasks,
  getApprovalTask: approvalTaskApi.getApprovalTask,
  approveTask: approvalTaskApi.approveTask,
  rejectTask: approvalTaskApi.rejectTask,
  delegateTask: approvalTaskApi.delegateTask,
  reassignTask: approvalTaskApi.reassignTask,

  listNotifications: notificationApi.listNotifications,
  getNotificationCount: notificationApi.getCount,
  markNotificationsAsRead: notificationApi.markAsRead,
  createNotification: notificationApi.create,

  listTemplates: templateApi.listTemplates,
  getTemplate: templateApi.getTemplate,
  createTemplate: templateApi.createTemplate,
  updateTemplate: templateApi.updateTemplate,
  deleteTemplate: templateApi.deleteTemplate,

  listSettings: settingApi.listSettings,
  getSetting: settingApi.getSetting,
  updateSetting: settingApi.updateSetting,

  listHistory: historyApi.listHistory,
  getHistory: historyApi.getHistory,

  getRecords: approvalApi.getRecords,
  getRecordsByApproval: approvalApi.getRecordsByApproval,

  getVersions: workflowDefinitionApi.getVersions,
  createVersion: workflowDefinitionApi.createVersion,
  getVersion: workflowDefinitionApi.getVersion,
  activateVersion: workflowDefinitionApi.activateVersion,
  rollbackVersion: workflowDefinitionApi.rollback,
  compareVersions: workflowDefinitionApi.compareVersions,
  deleteVersion: workflowDefinitionApi.deleteVersion,

  getStatistics: async (): Promise<ApiResponse<StatisticsResponse>> => {
    return apiClient.workflow.get('/api/flow/statistics');
  },

  getPerformance: async (): Promise<ApiResponse<PerformanceStats>> => {
    return apiClient.workflow.get('/api/flow/performance');
  },

  resetPerformance: async (): Promise<ApiResponse<string>> => {
    return apiClient.workflow.post('/api/flow/performance/reset');
  },

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.workflow.get('/health');
  },
};

export default workflowApi;
