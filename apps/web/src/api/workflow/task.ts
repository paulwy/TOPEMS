import apiClient from '../client';
import type {
  ApprovalTask,
  TaskQueryParams,
  TaskDelegateRequest,
  TaskTransferRequest,
  TaskAddSignRequest,
  TaskBatchApproveRequest,
  TaskBatchResult,
  ListParams,
} from './types';

export const taskApi = {
  list: (params?: TaskQueryParams) => {
    return apiClient.workflow.get('/api/flow/tasks', { params });
  },

  get: (id: string) => {
    return apiClient.workflow.get(`/api/flow/tasks/${id}`);
  },

  listTasks: (params?: TaskQueryParams) => {
    return apiClient.workflow.get('/api/flow/tasks', { params });
  },

  getTask: (id: string) => {
    return apiClient.workflow.get(`/api/flow/tasks/${id}`);
  },

  claim: (id: string) => {
    return apiClient.workflow.post(`/api/flow/tasks/${id}/claim`);
  },

  unclaim: (id: string) => {
    return apiClient.workflow.post(`/api/flow/tasks/${id}/unclaim`);
  },

  complete: (
    id: string,
    data?: { comment?: string; outcome?: string; variables?: Record<string, unknown> }
  ) => {
    return apiClient.workflow.post(`/api/flow/tasks/${id}/complete`, data);
  },

  approve: (id: string, data?: { comment?: string; variables?: Record<string, unknown> }) => {
    return apiClient.workflow.post(`/api/flow/tasks/${id}/approve`, data);
  },

  reject: (id: string, data?: { comment?: string; variables?: Record<string, unknown> }) => {
    return apiClient.workflow.post(`/api/flow/tasks/${id}/reject`, data);
  },

  delegate: (id: string, data: TaskDelegateRequest) => {
    return apiClient.workflow.post(`/api/flow/tasks/${id}/delegate`, data);
  },

  transfer: (id: string, data: TaskTransferRequest) => {
    return apiClient.workflow.post(`/api/flow/tasks/${id}/transfer`, data);
  },

  reassign: (id: string, data: { assignee_id: string; assignee_name?: string; comment?: string }) => {
    return apiClient.workflow.post(`/api/flow/tasks/${id}/reassign`, data);
  },

  addSign: (id: string, data: TaskAddSignRequest) => {
    return apiClient.workflow.post(`/api/flow/tasks/${id}/add-sign`, data);
  },

  counterSign: (id: string, data: { assignees: string[]; comment?: string }) => {
    return apiClient.workflow.post(`/api/flow/tasks/${id}/counter-sign`, data);
  },

  withdraw: (id: string, data?: { reason?: string }) => {
    return apiClient.workflow.post(`/api/flow/tasks/${id}/withdraw`, data);
  },

  returnTask: (id: string, data: { target_node_id?: string; comment?: string }) => {
    return apiClient.workflow.post(`/api/flow/tasks/${id}/return`, data);
  },

  jump: (id: string, data: { target_node_id: string; comment?: string }) => {
    return apiClient.workflow.post(`/api/flow/tasks/${id}/jump`, data);
  },

  urge: (id: string, data?: { message?: string; urge_type?: string }) => {
    return apiClient.workflow.post(`/api/flow/tasks/${id}/urge`, data);
  },

  batchApprove: (data: TaskBatchApproveRequest): Promise<TaskBatchResult> => {
    return apiClient.workflow.post('/api/flow/tasks/batch/approve', data) as any;
  },

  batchComplete: (data: { task_ids: string[]; comment?: string }): Promise<TaskBatchResult> => {
    return apiClient.workflow.post('/api/flow/tasks/batch/complete', data) as any;
  },

  batchDelegate: (
    data: { task_ids: string[]; delegate_to: string; comment?: string }
  ): Promise<TaskBatchResult> => {
    return apiClient.workflow.post('/api/flow/tasks/batch/delegate', data) as any;
  },

  myTasks: (params?: TaskQueryParams) => {
    return apiClient.workflow.get('/api/flow/tasks/my', { params });
  },

  myPending: (params?: ListParams) => {
    return apiClient.workflow.get('/api/flow/tasks/my/pending', { params });
  },

  myCompleted: (params?: ListParams) => {
    return apiClient.workflow.get('/api/flow/tasks/my/completed', { params });
  },

  myInvolved: (params?: ListParams) => {
    return apiClient.workflow.get('/api/flow/tasks/my/involved', { params });
  },

  myCreated: (params?: ListParams) => {
    return apiClient.workflow.get('/api/flow/tasks/my/created', { params });
  },

  candidateTasks: (params?: TaskQueryParams) => {
    return apiClient.workflow.get('/api/flow/tasks/candidate', { params });
  },

  getTaskComments: (taskId: string, params?: ListParams) => {
    return apiClient.workflow.get(`/api/flow/tasks/${taskId}/comments`, { params });
  },

  addTaskComment: (taskId: string, data: { content: string; type?: string }) => {
    return apiClient.workflow.post(`/api/flow/tasks/${taskId}/comments`, data);
  },

  getTaskAttachments: (taskId: string) => {
    return apiClient.workflow.get(`/api/flow/tasks/${taskId}/attachments`);
  },

  addTaskAttachment: (taskId: string, data: { file_id: string; file_name?: string }) => {
    return apiClient.workflow.post(`/api/flow/tasks/${taskId}/attachments`, data);
  },

  removeTaskAttachment: (taskId: string, attachmentId: string) => {
    return apiClient.workflow.delete(`/api/flow/tasks/${taskId}/attachments/${attachmentId}`);
  },

  getTaskForm: (taskId: string) => {
    return apiClient.workflow.get(`/api/flow/tasks/${taskId}/form`);
  },

  saveTaskForm: (taskId: string, data: Record<string, unknown>) => {
    return apiClient.workflow.post(`/api/flow/tasks/${taskId}/form`, data);
  },

  getTaskVariables: (taskId: string) => {
    return apiClient.workflow.get(`/api/flow/tasks/${taskId}/variables`);
  },

  setTaskVariables: (taskId: string, data: Record<string, unknown>) => {
    return apiClient.workflow.post(`/api/flow/tasks/${taskId}/variables`, data);
  },

  getTaskCount: (params?: { assignee_id?: string; status?: string }) => {
    return apiClient.workflow.get('/api/flow/tasks/count', { params });
  },

  getMyTaskCount: () => {
    return apiClient.workflow.get('/api/flow/tasks/my/count');
  },

  getHighPriorityTasks: (params?: ListParams) => {
    return apiClient.workflow.get('/api/flow/tasks/high-priority', { params });
  },

  getOverdueTasks: (params?: ListParams) => {
    return apiClient.workflow.get('/api/flow/tasks/overdue', { params });
  },

  getDueSoonTasks: (params?: { hours?: number } & ListParams) => {
    return apiClient.workflow.get('/api/flow/tasks/due-soon', { params });
  },

  getTaskTimeline: (taskId: string) => {
    return apiClient.workflow.get(`/api/flow/tasks/${taskId}/timeline`);
  },

  getTaskHistory: (taskId: string, params?: ListParams) => {
    return apiClient.workflow.get(`/api/flow/tasks/${taskId}/history`, { params });
  },

  getTodoTasks: (params?: TaskQueryParams) => {
    return apiClient.workflow.get('/api/flow/tasks/my/pending', { params });
  },

  getDoneTasks: (params?: TaskQueryParams) => {
    return apiClient.workflow.get('/api/flow/tasks/my/completed', { params });
  },

  getSentTasks: (params?: TaskQueryParams) => {
    return apiClient.workflow.get('/api/flow/tasks/my/created', { params });
  },

  getCcTasks: (params?: TaskQueryParams) => {
    return apiClient.workflow.get('/api/flow/tasks/my/cc', { params });
  },

  getTaskStats: () => {
    return apiClient.workflow.get('/api/flow/tasks/my/stats');
  },

  claimTask: (id: string) => {
    return apiClient.workflow.post(`/api/flow/tasks/${id}/claim`);
  },

  completeTask: (
    id: string,
    data?: { comment?: string; outcome?: string; variables?: Record<string, unknown> }
  ) => {
    return apiClient.workflow.post(`/api/flow/tasks/${id}/complete`, data);
  },

  rejectTask: (id: string, data?: { comment?: string; variables?: Record<string, unknown> }) => {
    return apiClient.workflow.post(`/api/flow/tasks/${id}/reject`, data);
  },

  delegateTask: (id: string, data: TaskDelegateRequest) => {
    return apiClient.workflow.post(`/api/flow/tasks/${id}/delegate`, data);
  },

  transferTask: (id: string, data: TaskTransferRequest) => {
    return apiClient.workflow.post(`/api/flow/tasks/${id}/transfer`, data);
  },
};
