import apiClient from '../client';
import type {
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
    return apiClient.workflow.get('/tasks', { params });
  },

  get: (id: string) => {
    return apiClient.workflow.get(`/tasks/${id}`);
  },

  listTasks: (params?: TaskQueryParams) => {
    return apiClient.workflow.get('/tasks', { params });
  },

  getTask: (id: string) => {
    return apiClient.workflow.get(`/tasks/${id}`);
  },

  claim: (id: string) => {
    return apiClient.workflow.post(`/tasks/${id}/claim`);
  },

  unclaim: (id: string) => {
    return apiClient.workflow.post(`/tasks/${id}/unclaim`);
  },

  complete: (
    id: string,
    data?: { comment?: string; outcome?: string; variables?: Record<string, unknown> }
  ) => {
    return apiClient.workflow.post(`/tasks/${id}/complete`, data);
  },

  approve: (id: string, data?: { comment?: string; variables?: Record<string, unknown> }) => {
    return apiClient.workflow.post(`/tasks/${id}/approve`, data);
  },

  reject: (id: string, data?: { comment?: string; variables?: Record<string, unknown> }) => {
    return apiClient.workflow.post(`/tasks/${id}/reject`, data);
  },

  delegate: (id: string, data: TaskDelegateRequest) => {
    return apiClient.workflow.post(`/tasks/${id}/delegate`, data);
  },

  transfer: (id: string, data: TaskTransferRequest) => {
    return apiClient.workflow.post(`/tasks/${id}/transfer`, data);
  },

  reassign: (
    id: string,
    data: { assignee_id: string; assignee_name?: string; comment?: string }
  ) => {
    return apiClient.workflow.post(`/tasks/${id}/reassign`, data);
  },

  addSign: (id: string, data: TaskAddSignRequest) => {
    return apiClient.workflow.post(`/tasks/${id}/add-sign`, data);
  },

  counterSign: (id: string, data: { assignees: string[]; comment?: string }) => {
    return apiClient.workflow.post(`/tasks/${id}/counter-sign`, data);
  },

  withdraw: (id: string, data?: { reason?: string }) => {
    return apiClient.workflow.post(`/tasks/${id}/withdraw`, data);
  },

  returnTask: (id: string, data: { target_node_id?: string; comment?: string }) => {
    return apiClient.workflow.post(`/tasks/${id}/return`, data);
  },

  jump: (id: string, data: { target_node_id: string; comment?: string }) => {
    return apiClient.workflow.post(`/tasks/${id}/jump`, data);
  },

  urge: (id: string, data?: { message?: string; urge_type?: string }) => {
    return apiClient.workflow.post(`/tasks/${id}/urge`, data);
  },

  batchApprove: (data: TaskBatchApproveRequest): Promise<TaskBatchResult> => {
    return apiClient.workflow.post(
      '/tasks/batch/approve',
      data
    ) as unknown as Promise<TaskBatchResult>;
  },

  batchComplete: (data: { task_ids: string[]; comment?: string }): Promise<TaskBatchResult> => {
    return apiClient.workflow.post(
      '/tasks/batch/complete',
      data
    ) as unknown as Promise<TaskBatchResult>;
  },

  batchDelegate: (data: {
    task_ids: string[];
    delegate_to: string;
    comment?: string;
  }): Promise<TaskBatchResult> => {
    return apiClient.workflow.post(
      '/tasks/batch/delegate',
      data
    ) as unknown as Promise<TaskBatchResult>;
  },

  myTasks: (params?: TaskQueryParams) => {
    return apiClient.workflow.get('/tasks/my', { params });
  },

  myPending: (params?: ListParams) => {
    return apiClient.workflow.get('/tasks/my/pending', { params });
  },

  myCompleted: (params?: ListParams) => {
    return apiClient.workflow.get('/tasks/my/completed', { params });
  },

  myInvolved: (params?: ListParams) => {
    return apiClient.workflow.get('/tasks/my/involved', { params });
  },

  myCreated: (params?: ListParams) => {
    return apiClient.workflow.get('/tasks/my/created', { params });
  },

  candidateTasks: (params?: TaskQueryParams) => {
    return apiClient.workflow.get('/tasks/candidate', { params });
  },

  getTaskComments: (taskId: string, params?: ListParams) => {
    return apiClient.workflow.get(`/tasks/${taskId}/comments`, { params });
  },

  addTaskComment: (taskId: string, data: { content: string; type?: string }) => {
    return apiClient.workflow.post(`/tasks/${taskId}/comments`, data);
  },

  getTaskAttachments: (taskId: string) => {
    return apiClient.workflow.get(`/tasks/${taskId}/attachments`);
  },

  addTaskAttachment: (taskId: string, data: { file_id: string; file_name?: string }) => {
    return apiClient.workflow.post(`/tasks/${taskId}/attachments`, data);
  },

  removeTaskAttachment: (taskId: string, attachmentId: string) => {
    return apiClient.workflow.delete(`/tasks/${taskId}/attachments/${attachmentId}`);
  },

  getTaskForm: (taskId: string) => {
    return apiClient.workflow.get(`/tasks/${taskId}/form`);
  },

  saveTaskForm: (taskId: string, data: Record<string, unknown>) => {
    return apiClient.workflow.post(`/tasks/${taskId}/form`, data);
  },

  getTaskVariables: (taskId: string) => {
    return apiClient.workflow.get(`/tasks/${taskId}/variables`);
  },

  setTaskVariables: (taskId: string, data: Record<string, unknown>) => {
    return apiClient.workflow.post(`/tasks/${taskId}/variables`, data);
  },

  getTaskCount: (params?: { assignee_id?: string; status?: string }) => {
    return apiClient.workflow.get('/tasks/count', { params });
  },

  getMyTaskCount: () => {
    return apiClient.workflow.get('/tasks/my/count');
  },

  getHighPriorityTasks: (params?: ListParams) => {
    return apiClient.workflow.get('/tasks/high-priority', { params });
  },

  getOverdueTasks: (params?: ListParams) => {
    return apiClient.workflow.get('/tasks/overdue', { params });
  },

  getDueSoonTasks: (params?: { hours?: number } & ListParams) => {
    return apiClient.workflow.get('/tasks/due-soon', { params });
  },

  getTaskTimeline: (taskId: string) => {
    return apiClient.workflow.get(`/tasks/${taskId}/timeline`);
  },

  getTaskHistory: (taskId: string, params?: ListParams) => {
    return apiClient.workflow.get(`/tasks/${taskId}/history`, { params });
  },

  getTodoTasks: (params?: TaskQueryParams) => {
    return apiClient.workflow.get('/tasks/my/pending', { params });
  },

  getDoneTasks: (params?: TaskQueryParams) => {
    return apiClient.workflow.get('/tasks/my/completed', { params });
  },

  getSentTasks: (params?: TaskQueryParams) => {
    return apiClient.workflow.get('/tasks/my/created', { params });
  },

  getCcTasks: (params?: TaskQueryParams) => {
    return apiClient.workflow.get('/tasks/my/cc', { params });
  },

  getTaskStats: () => {
    return apiClient.workflow.get('/tasks/my/stats');
  },
};
