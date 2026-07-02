import apiClient from '../client';
import type { ApiResponse } from '../client';

import { workflowDefinitionApi } from './definition';
import { instanceApi } from './instance';
import { approvalApi, approvalTaskApi } from './approval';
import { templateApi } from './template';
import { notificationApi } from './notification';
import { settingApi } from './setting';
import { historyApi } from './history';
import { formDefinitionApi, formInstanceApi } from './form';
import { taskApi } from './task';
import { monitorApi } from './monitor';
import { delegateApi } from './delegate';
import { categoryApi } from './category';
import { ruleApi } from './rule';
import { variableApi } from './variable';
import type {
  StatisticsResponse,
  PerformanceStats,
  FormDefinition,
  FormInstance,
  ApprovalTask,
  WorkflowDelegate,
  WorkflowCategory,
  WorkflowRule,
  WorkflowVariable,
  ProcessInstanceDetail,
  ProcessLog,
  ProcessAnalysisData,
  WorkflowEfficiencyAnalysis,
  UserWorkflowStats,
  DepartmentWorkflowStats,
  WorkflowTrendData,
  WorkflowInstanceDetail,
  TaskBatchResult,
} from './types';

export * from './types';

export { workflowDefinitionApi } from './definition';
export { instanceApi } from './instance';
export { approvalApi, approvalTaskApi } from './approval';
export { templateApi } from './template';
export { notificationApi } from './notification';
export { settingApi } from './setting';
export { historyApi } from './history';
export { formDefinitionApi, formInstanceApi } from './form';
export { taskApi } from './task';
export { monitorApi } from './monitor';
export { delegateApi } from './delegate';
export { categoryApi } from './category';
export { ruleApi } from './rule';
export { variableApi } from './variable';

export const workflowApi = {
  workflows: workflowDefinitionApi,
  instances: instanceApi,
  approvals: approvalApi,
  approvalTasks: approvalTaskApi,
  notifications: notificationApi,
  templates: templateApi,
  settings: settingApi,
  history: historyApi,
  formDefinitions: formDefinitionApi,
  formInstances: formInstanceApi,
  tasks: taskApi,
  monitor: monitorApi,
  delegates: delegateApi,
  categories: categoryApi,
  rules: ruleApi,
  variables: variableApi,

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
  delegateApprovalTask: approvalTaskApi.delegateTask,
  reassignApprovalTask: approvalTaskApi.reassignTask,
  claimApprovalTask: approvalTaskApi.claimTask,
  unclaimApprovalTask: approvalTaskApi.unclaimTask,

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

  listFormDefinitions: formDefinitionApi.listFormDefinitions,
  getFormDefinition: formDefinitionApi.getFormDefinition,
  createFormDefinition: formDefinitionApi.createFormDefinition,
  updateFormDefinition: formDefinitionApi.updateFormDefinition,
  deleteFormDefinition: formDefinitionApi.deleteFormDefinition,
  activateFormDefinition: formDefinitionApi.activate,
  deactivateFormDefinition: formDefinitionApi.deactivate,
  publishFormDefinition: formDefinitionApi.publish,
  copyFormDefinition: formDefinitionApi.copy,

  listFormInstances: formInstanceApi.listFormInstances,
  getFormInstance: formInstanceApi.getFormInstance,
  createFormInstance: formInstanceApi.createFormInstance,
  updateFormInstance: formInstanceApi.updateFormInstance,
  deleteFormInstance: formInstanceApi.deleteFormInstance,
  submitFormInstance: formInstanceApi.submit,
  saveFormDraft: formInstanceApi.saveDraft,

  listTasks: taskApi.listTasks,
  getTask: taskApi.getTask,
  claimTask: taskApi.claim,
  unclaimTask: taskApi.unclaim,
  completeTask: taskApi.complete,
  approveTask2: taskApi.approve,
  rejectTask2: taskApi.reject,
  delegateTask2: taskApi.delegate,
  transferTask: taskApi.transfer,
  reassignTask2: taskApi.reassign,
  addSignTask: taskApi.addSign,
  withdrawTask: taskApi.withdraw,
  returnTask: taskApi.returnTask,
  jumpTask: taskApi.jump,
  urgeTask: taskApi.urge,
  batchApproveTasks: taskApi.batchApprove,
  batchCompleteTasks: taskApi.batchComplete,
  myTasks: taskApi.myTasks,
  myPendingTasks: taskApi.myPending,
  myCompletedTasks: taskApi.myCompleted,
  myInvolvedTasks: taskApi.myInvolved,
  myCreatedTasks: taskApi.myCreated,
  candidateTasks: taskApi.candidateTasks,

  monitorListInstances: monitorApi.listInstances,
  monitorGetInstanceDetail: monitorApi.getInstanceDetail,
  monitorGetInstanceHistory: monitorApi.getInstanceHistory,
  monitorGetInstanceTasks: monitorApi.getInstanceTasks,
  monitorGetStatistics: monitorApi.getStatistics,
  monitorGetWorkflowAnalysis: monitorApi.getWorkflowAnalysis,
  monitorGetNodeStatistics: monitorApi.getNodeStatistics,
  monitorGetBottleneckAnalysis: monitorApi.getBottleneckAnalysis,
  monitorGetEfficiencyAnalysis: monitorApi.getEfficiencyAnalysis,
  monitorGetTrendData: monitorApi.getTrendData,
  monitorGetUserStats: monitorApi.getUserStats,
  monitorGetDepartmentStats: monitorApi.getDepartmentStats,
  monitorListLogs: monitorApi.listLogs,
  monitorGetLogsByInstance: monitorApi.getLogsByInstance,
  monitorGetLogsByWorkflow: monitorApi.getLogsByWorkflow,
  monitorGetRealTimeStats: monitorApi.getRealTimeStats,
  monitorGetDashboardData: monitorApi.getDashboardData,
  monitorGetPerformanceMetrics: monitorApi.getPerformanceMetrics,
  monitorGetSlaCompliance: monitorApi.getSlaCompliance,

  listDelegates: delegateApi.listDelegates,
  getDelegate: delegateApi.getDelegate,
  createDelegate: delegateApi.createDelegate,
  updateDelegate: delegateApi.updateDelegate,
  deleteDelegate: delegateApi.deleteDelegate,
  activateDelegate: delegateApi.activate,
  deactivateDelegate: delegateApi.deactivate,
  myDelegates: delegateApi.getMyDelegates,
  myAttorneys: delegateApi.getMyAttorneys,

  listCategories: categoryApi.listCategories,
  getCategory: categoryApi.getCategory,
  createCategory: categoryApi.createCategory,
  updateCategory: categoryApi.updateCategory,
  deleteCategory: categoryApi.deleteCategory,
  getActiveCategories: categoryApi.getActiveCategories,
  getCategoryWorkflows: categoryApi.getCategoryWorkflows,

  listRules: ruleApi.listRules,
  getRule: ruleApi.getRule,
  createRule: ruleApi.createRule,
  updateRule: ruleApi.updateRule,
  deleteRule: ruleApi.deleteRule,
  getRulesByWorkflow: ruleApi.getRulesByWorkflow,
  getRulesByNode: ruleApi.getRulesByNode,
  activateRule: ruleApi.activate,
  deactivateRule: ruleApi.deactivate,

  listVariables: variableApi.listVariables,
  getVariable: variableApi.getVariable,
  setVariable: variableApi.setVariable,
  deleteVariable: variableApi.remove,
  setVariables: variableApi.setVariables,
  getTaskVariables: variableApi.getTaskVariables,
  setTaskVariable: variableApi.setTaskVariable,
  getGlobalVariables: variableApi.getGlobalVariables,

  getStatistics: async (): Promise<ApiResponse<StatisticsResponse>> => {
    return apiClient.workflow.get('/statistics');
  },

  getPerformance: async (): Promise<ApiResponse<PerformanceStats>> => {
    return apiClient.workflow.get('/performance');
  },

  resetPerformance: async (): Promise<ApiResponse<string>> => {
    return apiClient.workflow.post('/performance/reset');
  },

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.workflow.get('/health');
  },
};

export default workflowApi;
