/**
 * IM · 消息任务联动 API 绑定
 *
 * 后端: IM 服务 /task-sync/*
 * 路由:
 *   POST   /task-sync/tasks/from-message
 *   POST   /task-sync/tasks/batch
 *   GET    /task-sync/tasks
 *   GET    /task-sync/tasks/{id}
 *   PUT    /task-sync/tasks/{id}
 *   DELETE /task-sync/tasks/{id}
 *   GET    /task-sync/todos
 *   POST   /task-sync/todos
 *   PUT    /task-sync/todos/{id}/toggle
 *   DELETE /task-sync/todos/{id}
 *   GET    /task-sync/reminders
 *   POST   /task-sync/reminders
 *   PUT    /task-sync/reminders/{id}
 *   DELETE /task-sync/reminders/{id}
 *   GET    /task-sync/boards
 *   POST   /task-sync/boards
 *   GET    /task-sync/boards/{id}
 *   GET    /task-sync/stats
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled' | 'blocked';
type TodoStatus = 'pending' | 'completed';
export type ReminderType = 'once' | 'daily' | 'weekly' | 'custom_interval';

export interface SyncedTask {
  id: string;
  source_message_id: string;
  source_chat_id: string;
  source_sender_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id?: string;
  assignee_name?: string;
  project_id?: string;
  project_name?: string;
  due_date?: string;
  completed_at?: string;
  progress_percentage: number;
  tags: string[];
  subtasks: Array<{ id: string; title: string; completed: boolean }>;
  comments_count: number;
  attachments_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskFromMessageRequest {
  message_id: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  assignee_id?: string;
  project_id?: string;
  due_date?: string;
  tags?: string[];
  subtasks?: Array<{ title: string }>;
}

interface BatchCreateTasksRequest {
  tasks: CreateTaskFromMessageRequest[];
}

export interface PersonalTodo {
  id: string;
  title: string;
  description?: string;
  status: TodoStatus;
  priority: TaskPriority;
  due_date?: string;
  message_id?: string;
  message_chat_id?: string;
  reminder_id?: string;
  tags: string[];
  created_at: string;
  completed_at?: string;
}

interface CreatePersonalTodoRequest {
  title: string;
  description?: string;
  priority?: TaskPriority;
  due_date?: string;
  message_id?: string;
  message_chat_id?: string;
  tags?: string[];
}

export interface TaskReminder {
  id: string;
  message_id: string;
  chat_id: string;
  reminder_type: ReminderType;
  reminder_time?: string;
  interval_minutes?: number;
  is_enabled: boolean;
  is_triggered: boolean;
  last_triggered_at?: string;
  next_trigger_at?: string;
  created_at: string;
}

interface CreateTaskReminderRequest {
  message_id: string;
  chat_id: string;
  reminder_type: ReminderType;
  reminder_time?: string;
  interval_minutes?: number;
  is_enabled?: boolean;
}

export interface KanbanBoard {
  id: string;
  name: string;
  description?: string;
  is_default: boolean;
  columns: Array<{
    id: string;
    name: string;
    status_filter: TaskStatus;
    task_count: number;
    color: string;
  }>;
  task_count: number;
  created_at: string;
  updated_at: string;
}

export interface TaskSyncStats {
  total_tasks_today: number;
  total_tasks_completed_today: number;
  completion_rate_today: number;
  total_todos_today: number;
  total_todos_completed_today: number;
  active_reminders: number;
  overdue_tasks: number;
  by_priority: Record<TaskPriority, number>;
  by_status: Record<TaskStatus, number>;
  productive_hour: number;
}

export const imTaskSyncApi = {
  // ==================== 消息转任务 ====================

  createTaskFromMessage: async (
    data: CreateTaskFromMessageRequest
  ): Promise<ApiResponse<SyncedTask>> => {
    return apiClient.im.post('/task-sync/tasks/from-message', data);
  },

  batchCreateTasksFromMessages: async (
    data: BatchCreateTasksRequest
  ): Promise<ApiResponse<SyncedTask[]>> => {
    return apiClient.im.post('/task-sync/tasks/batch', data);
  },

  // ==================== 任务管理 ====================

  listSyncedTasks: async (params?: {
    status?: TaskStatus;
    priority?: TaskPriority;
    project_id?: string;
    assignee_id?: string;
    overdue?: boolean;
    from_date?: string;
    to_date?: string;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<PaginatedResponse<SyncedTask>>> => {
    return apiClient.im.get('/task-sync/tasks', { params });
  },

  getSyncedTask: async (id: string): Promise<ApiResponse<SyncedTask>> => {
    return apiClient.im.get(`/task-sync/tasks/${id}`);
  },

  updateSyncedTask: async (
    id: string,
    data: Partial<
      Pick<
        SyncedTask,
        | 'title'
        | 'description'
        | 'status'
        | 'priority'
        | 'assignee_id'
        | 'due_date'
        | 'progress_percentage'
        | 'tags'
      >
    >
  ): Promise<ApiResponse<SyncedTask>> => {
    return apiClient.im.put(`/task-sync/tasks/${id}`, data);
  },

  deleteSyncedTask: async (id: string): Promise<ApiResponse<{ deleted: boolean }>> => {
    return apiClient.im.delete(`/task-sync/tasks/${id}`);
  },

  // ==================== 个人待办 ====================

  listMyTodos: async (params?: {
    status?: TodoStatus;
    priority?: TaskPriority;
    overdue?: boolean;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<PaginatedResponse<PersonalTodo>>> => {
    return apiClient.im.get('/task-sync/todos', { params });
  },

  createMyTodo: async (data: CreatePersonalTodoRequest): Promise<ApiResponse<PersonalTodo>> => {
    return apiClient.im.post('/task-sync/todos', data);
  },

  toggleTodoComplete: async (id: string): Promise<ApiResponse<PersonalTodo>> => {
    return apiClient.im.put(`/task-sync/todos/${id}/toggle`);
  },

  deleteMyTodo: async (id: string): Promise<ApiResponse<{ deleted: boolean }>> => {
    return apiClient.im.delete(`/task-sync/todos/${id}`);
  },

  // ==================== 消息提醒 ====================

  listTaskReminders: async (params?: {
    is_enabled?: boolean;
    is_triggered?: boolean;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<PaginatedResponse<TaskReminder>>> => {
    return apiClient.im.get('/task-sync/reminders', { params });
  },

  createTaskReminder: async (
    data: CreateTaskReminderRequest
  ): Promise<ApiResponse<TaskReminder>> => {
    return apiClient.im.post('/task-sync/reminders', data);
  },

  updateTaskReminder: async (
    id: string,
    data: Partial<
      Pick<TaskReminder, 'reminder_type' | 'reminder_time' | 'interval_minutes' | 'is_enabled'>
    >
  ): Promise<ApiResponse<TaskReminder>> => {
    return apiClient.im.put(`/task-sync/reminders/${id}`, data);
  },

  deleteTaskReminder: async (id: string): Promise<ApiResponse<{ deleted: boolean }>> => {
    return apiClient.im.delete(`/task-sync/reminders/${id}`);
  },

  // ==================== 任务看板 ====================

  listKanbanBoards: async (): Promise<ApiResponse<KanbanBoard[]>> => {
    return apiClient.im.get('/task-sync/boards');
  },

  createKanbanBoard: async (data: {
    name: string;
    description?: string;
  }): Promise<ApiResponse<KanbanBoard>> => {
    return apiClient.im.post('/task-sync/boards', data);
  },

  getKanbanBoard: async (id: string): Promise<ApiResponse<KanbanBoard>> => {
    return apiClient.im.get(`/task-sync/boards/${id}`);
  },

  // ==================== 统计 ====================

  getTaskSyncStats: async (): Promise<ApiResponse<TaskSyncStats>> => {
    return apiClient.im.get('/task-sync/stats');
  },
};

export default imTaskSyncApi;
