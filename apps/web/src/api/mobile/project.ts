/**
 * Mobile · 移动端 PM 项目管理 API 绑定
 *
 * 后端: svc/mobile/src/main.rs (通过 Workflow/PM 服务客户端)
 * 路由:
 *   GET    /mobile/projects
 *   GET    /mobile/projects/{id}
 *   GET    /mobile/projects/{id}/tasks
 *   POST   /mobile/projects/{id}/tasks
 *   GET    /mobile/tasks/{id}
 *   PUT    /mobile/tasks/{id}/status
 *   GET    /mobile/projects/{id}/milestones
 *   POST   /mobile/projects/{id}/milestones
 *   GET    /mobile/my-tasks
 *   GET    /mobile/projects/stats
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export type ProjectStatus = 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type MilestoneStatus = 'pending' | 'in_progress' | 'achieved' | 'delayed';

export interface Project {
  id: string;
  name: string;
  code?: string;
  description?: string;
  status: ProjectStatus;
  progress: number;
  start_date: string;
  end_date?: string;
  manager: string;
  team_members: string[];
  total_tasks: number;
  completed_tasks: number;
  created_at: string;
}

export interface ProjectTask {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: string;
  start_date?: string;
  due_date?: string;
  completed_date?: string;
  parent_id?: string;
  order: number;
  created_at: string;
}

export interface Milestone {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  status: MilestoneStatus;
  due_date: string;
  completed_date?: string;
  progress: number;
  created_at: string;
}

export interface ProjectStats {
  active_projects: number;
  completed_projects: number;
  overdue_tasks: number;
  upcoming_milestones: number;
  my_tasks: number;
  by_status: Array<{
    status: ProjectStatus;
    count: number;
  }>;
  by_priority: Array<{
    priority: TaskPriority;
    count: number;
  }>;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  priority?: TaskPriority;
  assignee?: string;
  start_date?: string;
  due_date?: string;
  parent_id?: string;
}

export interface CreateMilestoneRequest {
  title: string;
  description?: string;
  due_date: string;
}

export const projectApi = {
  // ==================== 项目管理 ====================

  listProjects: async (params?: {
    status?: ProjectStatus;
    manager?: string;
    keyword?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<Project>>> => {
    return apiClient.mobile.get('projects', { params });
  },

  getProject: async (id: string): Promise<ApiResponse<Project>> => {
    return apiClient.mobile.get(`projects/${id}`);
  },

  // ==================== 任务管理 ====================

  listProjectTasks: async (
    projectId: string,
    params?: {
      status?: TaskStatus;
      priority?: TaskPriority;
      assignee?: string;
    }
  ): Promise<ApiResponse<ProjectTask[]>> => {
    return apiClient.mobile.get(`projects/${projectId}/tasks`, { params });
  },

  createTask: async (
    projectId: string,
    data: CreateTaskRequest
  ): Promise<ApiResponse<ProjectTask>> => {
    return apiClient.mobile.post(`projects/${projectId}/tasks`, data);
  },

  getTask: async (id: string): Promise<ApiResponse<ProjectTask>> => {
    return apiClient.mobile.get(`tasks/${id}`);
  },

  updateTaskStatus: async (id: string, status: TaskStatus): Promise<ApiResponse<ProjectTask>> => {
    return apiClient.mobile.put(`tasks/${id}/status`, { status });
  },

  // ==================== 里程碑管理 ====================

  listMilestones: async (projectId: string): Promise<ApiResponse<Milestone[]>> => {
    return apiClient.mobile.get(`projects/${projectId}/milestones`);
  },

  createMilestone: async (
    projectId: string,
    data: CreateMilestoneRequest
  ): Promise<ApiResponse<Milestone>> => {
    return apiClient.mobile.post(`projects/${projectId}/milestones`, data);
  },

  // ==================== 我的任务 ====================

  listMyTasks: async (params?: {
    status?: TaskStatus;
    project_id?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<ProjectTask>>> => {
    return apiClient.mobile.get('my-tasks', { params });
  },

  // ==================== 项目统计 ====================

  getProjectStats: async (): Promise<ApiResponse<ProjectStats>> => {
    return apiClient.mobile.get('projects/stats');
  },
};

export default projectApi;
