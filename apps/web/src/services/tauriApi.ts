/**
 * Tauri API Service — Backend IPC API Calls
 *
 * Provides frontend access to Tauri backend IPC commands for:
 * - Issue/Ticket CRUD operations
 * - Project CRUD operations
 * - Device & Plugin information
 * - API metrics monitoring
 * - Generic message handling
 * - Per-request cancellation support via AbortSignal
 */

interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

let _isTauriAvailable: boolean | null = null;

function isTauriAvailable(): boolean {
  if (_isTauriAvailable !== null) return _isTauriAvailable;
  try {
    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
      _isTauriAvailable = true;
    } else {
      _isTauriAvailable = false;
    }
  } catch {
    _isTauriAvailable = false;
  }
  return _isTauriAvailable;
}

function genRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<ApiResponse<T>> {
  if (!isTauriAvailable()) {
    return { success: false, data: null, error: 'Not running in Tauri environment' };
  }

  try {
    const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
    const result = await tauriInvoke<ApiResponse<T>>(command, args);
    return result;
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ─── Types ───────────────────────────────────────────────────────

export interface Issue {
  id: string;
  title: string;
  status: string;
  project_id?: string;
  assignee?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  members?: string[];
}

export interface DeviceInfo {
  id: string;
  name: string;
  os: string;
  version: string;
  last_seen: string;
}

export interface PluginInfo {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
}

export interface ApiMetrics {
  total_requests: number;
  success_count: number;
  failure_count: number;
  retry_count: number;
  avg_response_time_ms: number;
}

// ─── Issue/Ticket CRUD ───────────────────────────────────────────

export const tauriApi = {
  isAvailable(): boolean {
    return isTauriAvailable();
  },

  // ─── Issue/Ticket CRUD ────────────────────────────────────────

  async getIssues(status?: string, projectId?: string, signal?: AbortSignal): Promise<Issue[]> {
    const requestId = genRequestId();
    const args: Record<string, unknown> = { request_id: requestId };
    if (status) args.status = status;
    if (projectId) args.project_id = projectId;

    if (signal) {
      signal.addEventListener('abort', () => {
        invoke<void>('cancel_request', { request_id: requestId });
      });
    }

    const result = await invoke<Issue[]>('get_issue_list', args);
    if (result.success && result.data) {
      return result.data;
    }
    throw new Error(result.error || 'Failed to get issues');
  },

  async getIssue(id: string, signal?: AbortSignal): Promise<Issue> {
    const requestId = genRequestId();
    if (signal) {
      signal.addEventListener('abort', () => {
        invoke<void>('cancel_request', { request_id: requestId });
      });
    }
    const result = await invoke<Issue>('get_issue_detail', { id, request_id: requestId });
    if (result.success && result.data) {
      return result.data;
    }
    throw new Error(result.error || 'Failed to get issue');
  },

  async createIssue(
    params: {
      title: string;
      description?: string;
      status?: string;
      project_id?: string;
      assignee?: string;
    },
    signal?: AbortSignal
  ): Promise<Issue> {
    const requestId = genRequestId();
    if (signal) {
      signal.addEventListener('abort', () => {
        invoke<void>('cancel_request', { request_id: requestId });
      });
    }
    const result = await invoke<Issue>('create_issue', { ...params, request_id: requestId });
    if (result.success && result.data) {
      return result.data;
    }
    throw new Error(result.error || 'Failed to create issue');
  },

  async updateIssue(
    id: string,
    params: { title?: string; status?: string; assignee?: string },
    signal?: AbortSignal
  ): Promise<Issue> {
    const requestId = genRequestId();
    if (signal) {
      signal.addEventListener('abort', () => {
        invoke<void>('cancel_request', { request_id: requestId });
      });
    }
    const result = await invoke<Issue>('update_issue', { id, ...params, request_id: requestId });
    if (result.success && result.data) {
      return result.data;
    }
    throw new Error(result.error || 'Failed to update issue');
  },

  async deleteIssue(id: string, signal?: AbortSignal): Promise<void> {
    const requestId = genRequestId();
    if (signal) {
      signal.addEventListener('abort', () => {
        invoke<void>('cancel_request', { request_id: requestId });
      });
    }
    const result = await invoke<void>('delete_issue', { id, request_id: requestId });
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete issue');
    }
  },

  // ─── Project CRUD ────────────────────────────────────────────

  async getProjects(signal?: AbortSignal): Promise<Project[]> {
    const requestId = genRequestId();
    if (signal) {
      signal.addEventListener('abort', () => {
        invoke<void>('cancel_request', { request_id: requestId });
      });
    }
    const result = await invoke<Project[]>('get_project_list', { request_id: requestId });
    if (result.success && result.data) {
      return result.data;
    }
    throw new Error(result.error || 'Failed to get projects');
  },

  async createProject(
    params: {
      name: string;
      description?: string;
      members?: string[];
    },
    signal?: AbortSignal
  ): Promise<Project> {
    const requestId = genRequestId();
    if (signal) {
      signal.addEventListener('abort', () => {
        invoke<void>('cancel_request', { request_id: requestId });
      });
    }
    const result = await invoke<Project>('create_project', { ...params, request_id: requestId });
    if (result.success && result.data) {
      return result.data;
    }
    throw new Error(result.error || 'Failed to create project');
  },

  async updateProject(
    id: string,
    params: { name?: string; description?: string; members?: string[] },
    signal?: AbortSignal
  ): Promise<Project> {
    const requestId = genRequestId();
    if (signal) {
      signal.addEventListener('abort', () => {
        invoke<void>('cancel_request', { request_id: requestId });
      });
    }
    const result = await invoke<Project>('update_project', {
      id,
      ...params,
      request_id: requestId,
    });
    if (result.success && result.data) {
      return result.data;
    }
    throw new Error(result.error || 'Failed to update project');
  },

  async deleteProject(id: string, signal?: AbortSignal): Promise<void> {
    const requestId = genRequestId();
    if (signal) {
      signal.addEventListener('abort', () => {
        invoke<void>('cancel_request', { request_id: requestId });
      });
    }
    const result = await invoke<void>('delete_project', { id, request_id: requestId });
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete project');
    }
  },

  // ─── Device & Plugin Information ──────────────────────────────

  async getDeviceInfo(): Promise<DeviceInfo> {
    const result = await invoke<DeviceInfo>('get_device_info');
    if (result.success && result.data) {
      return result.data;
    }
    throw new Error(result.error || 'Failed to get device info');
  },

  async getPluginList(signal?: AbortSignal): Promise<PluginInfo[]> {
    const requestId = genRequestId();
    if (signal) {
      signal.addEventListener('abort', () => {
        invoke<void>('cancel_request', { request_id: requestId });
      });
    }
    const result = await invoke<PluginInfo[]>('get_plugin_list', { request_id: requestId });
    if (result.success && result.data) {
      return result.data;
    }
    throw new Error(result.error || 'Failed to get plugin list');
  },

  // ─── API Metrics ──────────────────────────────────────────────

  async getMetrics(): Promise<ApiMetrics> {
    const result = await invoke<ApiMetrics>('get_metrics');
    if (result.success && result.data) {
      return result.data;
    }
    throw new Error(result.error || 'Failed to get metrics');
  },

  // ─── Generic Message Handler ─────────────────────────────────

  async sendMessage(params: {
    action: string;
    payload: Record<string, unknown>;
    module_name: string;
    api_version?: string;
  }): Promise<Record<string, unknown>> {
    const result = await invoke<Record<string, unknown>>('handle_message', {
      message: {
        api_version: '1.0',
        ...params,
      },
    });
    if (result.success && result.data) {
      return result.data;
    }
    throw new Error(result.error || 'Failed to send message');
  },

  // ─── Event Subscription ──────────────────────────────────────

  async subscribe(event: string, windowLabel: string): Promise<void> {
    const result = await invoke<void>('subscribe', {
      event,
      window_label: windowLabel,
    });
    if (!result.success) {
      throw new Error(result.error || 'Failed to subscribe');
    }
  },

  async unsubscribe(event: string, windowLabel: string): Promise<void> {
    const result = await invoke<void>('unsubscribe', {
      event,
      window_label: windowLabel,
    });
    if (!result.success) {
      throw new Error(result.error || 'Failed to unsubscribe');
    }
  },

  // ─── User Management ─────────────────────────────────────────

  async getUsers(
    params?: {
      page?: number;
      per_page?: number;
      search?: string;
    },
    signal?: AbortSignal
  ): Promise<Record<string, unknown>> {
    const requestId = genRequestId();
    const args: Record<string, unknown> = { request_id: requestId };
    if (params?.page !== undefined) args.page = params.page;
    if (params?.per_page !== undefined) args.per_page = params.per_page;
    if (params?.search) args.search = params.search;

    if (signal) {
      signal.addEventListener('abort', () => {
        invoke<void>('cancel_request', { request_id: requestId });
      });
    }
    const result = await invoke<Record<string, unknown>>('get_user_list', args);
    if (result.success && result.data) {
      return result.data;
    }
    throw new Error(result.error || 'Failed to get users');
  },

  async getUser(id: string, signal?: AbortSignal): Promise<Record<string, unknown>> {
    const requestId = genRequestId();
    if (signal) {
      signal.addEventListener('abort', () => {
        invoke<void>('cancel_request', { request_id: requestId });
      });
    }
    const result = await invoke<Record<string, unknown>>('get_user', { id, request_id: requestId });
    if (result.success && result.data) {
      return result.data;
    }
    throw new Error(result.error || 'Failed to get user');
  },

  async createUser(
    params: {
      username: string;
      email: string;
      role?: string;
      department?: string;
    },
    signal?: AbortSignal
  ): Promise<Record<string, unknown>> {
    const requestId = genRequestId();
    if (signal) {
      signal.addEventListener('abort', () => {
        invoke<void>('cancel_request', { request_id: requestId });
      });
    }
    const result = await invoke<Record<string, unknown>>('create_user', {
      ...params,
      request_id: requestId,
    });
    if (result.success && result.data) {
      return result.data;
    }
    throw new Error(result.error || 'Failed to create user');
  },

  async updateUser(
    id: string,
    params: { username?: string; email?: string; role?: string; department?: string },
    signal?: AbortSignal
  ): Promise<Record<string, unknown>> {
    const requestId = genRequestId();
    if (signal) {
      signal.addEventListener('abort', () => {
        invoke<void>('cancel_request', { request_id: requestId });
      });
    }
    const result = await invoke<Record<string, unknown>>('update_user', {
      id,
      ...params,
      request_id: requestId,
    });
    if (result.success && result.data) {
      return result.data;
    }
    throw new Error(result.error || 'Failed to update user');
  },

  async deleteUser(id: string, signal?: AbortSignal): Promise<void> {
    const requestId = genRequestId();
    if (signal) {
      signal.addEventListener('abort', () => {
        invoke<void>('cancel_request', { request_id: requestId });
      });
    }
    const result = await invoke<void>('delete_user', { id, request_id: requestId });
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete user');
    }
  },

  // ─── Role Management ─────────────────────────────────────────

  async getRoles(signal?: AbortSignal): Promise<Record<string, unknown>> {
    const requestId = genRequestId();
    if (signal) {
      signal.addEventListener('abort', () => {
        invoke<void>('cancel_request', { request_id: requestId });
      });
    }
    const result = await invoke<Record<string, unknown>>('get_role_list', {
      request_id: requestId,
    });
    if (result.success && result.data) {
      return result.data;
    }
    throw new Error(result.error || 'Failed to get roles');
  },

  async createRole(
    params: {
      name: string;
      description?: string;
      permissions?: string[];
    },
    signal?: AbortSignal
  ): Promise<Record<string, unknown>> {
    const requestId = genRequestId();
    if (signal) {
      signal.addEventListener('abort', () => {
        invoke<void>('cancel_request', { request_id: requestId });
      });
    }
    const result = await invoke<Record<string, unknown>>('create_role', {
      ...params,
      request_id: requestId,
    });
    if (result.success && result.data) {
      return result.data;
    }
    throw new Error(result.error || 'Failed to create role');
  },

  async updateRole(
    id: string,
    params: { name?: string; description?: string; permissions?: string[] },
    signal?: AbortSignal
  ): Promise<Record<string, unknown>> {
    const requestId = genRequestId();
    if (signal) {
      signal.addEventListener('abort', () => {
        invoke<void>('cancel_request', { request_id: requestId });
      });
    }
    const result = await invoke<Record<string, unknown>>('update_role', {
      id,
      ...params,
      request_id: requestId,
    });
    if (result.success && result.data) {
      return result.data;
    }
    throw new Error(result.error || 'Failed to update role');
  },

  async deleteRole(id: string, signal?: AbortSignal): Promise<void> {
    const requestId = genRequestId();
    if (signal) {
      signal.addEventListener('abort', () => {
        invoke<void>('cancel_request', { request_id: requestId });
      });
    }
    const result = await invoke<void>('delete_role', { id, request_id: requestId });
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete role');
    }
  },

  // ─── System Health ───────────────────────────────────────────

  async checkHealth(signal?: AbortSignal): Promise<Record<string, unknown>> {
    const requestId = genRequestId();
    if (signal) {
      signal.addEventListener('abort', () => {
        invoke<void>('cancel_request', { request_id: requestId });
      });
    }
    const result = await invoke<Record<string, unknown>>('check_health', { request_id: requestId });
    if (result.success && result.data) {
      return result.data;
    }
    throw new Error(result.error || 'Health check failed');
  },

  async getSystemConfig(signal?: AbortSignal): Promise<Record<string, unknown>> {
    const requestId = genRequestId();
    if (signal) {
      signal.addEventListener('abort', () => {
        invoke<void>('cancel_request', { request_id: requestId });
      });
    }
    const result = await invoke<Record<string, unknown>>('get_system_config', {
      request_id: requestId,
    });
    if (result.success && result.data) {
      return result.data;
    }
    throw new Error(result.error || 'Failed to get system config');
  },

  // ─── Batch Operations ────────────────────────────────────────

  async batchCreateIssues(
    issues: Record<string, unknown>[],
    signal?: AbortSignal
  ): Promise<Record<string, unknown>> {
    const requestId = genRequestId();
    if (signal) {
      signal.addEventListener('abort', () => {
        invoke<void>('cancel_request', { request_id: requestId });
      });
    }
    const result = await invoke<Record<string, unknown>>('batch_create_issues', {
      issues,
      request_id: requestId,
    });
    if (result.success && result.data) return result.data;
    throw new Error(result.error || 'Failed to batch create issues');
  },

  async batchDeleteIssues(ids: string[], signal?: AbortSignal): Promise<void> {
    const requestId = genRequestId();
    if (signal) {
      signal.addEventListener('abort', () => {
        invoke<void>('cancel_request', { request_id: requestId });
      });
    }
    const result = await invoke<void>('batch_delete_issues', { ids, request_id: requestId });
    if (!result.success) throw new Error(result.error || 'Failed to batch delete issues');
  },

  async batchUpdateIssues(
    updates: Record<string, unknown>[],
    signal?: AbortSignal
  ): Promise<Record<string, unknown>> {
    const requestId = genRequestId();
    if (signal) {
      signal.addEventListener('abort', () => {
        invoke<void>('cancel_request', { request_id: requestId });
      });
    }
    const result = await invoke<Record<string, unknown>>('batch_update_issues', {
      updates,
      request_id: requestId,
    });
    if (result.success && result.data) return result.data;
    throw new Error(result.error || 'Failed to batch update issues');
  },

  async batchCreateProjects(
    projects: Record<string, unknown>[],
    signal?: AbortSignal
  ): Promise<Record<string, unknown>> {
    const requestId = genRequestId();
    if (signal) {
      signal.addEventListener('abort', () => {
        invoke<void>('cancel_request', { request_id: requestId });
      });
    }
    const result = await invoke<Record<string, unknown>>('batch_create_projects', {
      projects,
      request_id: requestId,
    });
    if (result.success && result.data) return result.data;
    throw new Error(result.error || 'Failed to batch create projects');
  },

  async batchDeleteProjects(ids: string[], signal?: AbortSignal): Promise<void> {
    const requestId = genRequestId();
    if (signal) {
      signal.addEventListener('abort', () => {
        invoke<void>('cancel_request', { request_id: requestId });
      });
    }
    const result = await invoke<void>('batch_delete_projects', { ids, request_id: requestId });
    if (!result.success) throw new Error(result.error || 'Failed to batch delete projects');
  },

  // ─── Audit & Export ──────────────────────────────────────────

  async getAuditLogs(
    params?: {
      action?: string;
      target_type?: string;
      user_id?: string;
      from?: string;
      to?: string;
    },
    signal?: AbortSignal
  ): Promise<Record<string, unknown>> {
    const requestId = genRequestId();
    if (signal) {
      signal.addEventListener('abort', () => {
        invoke<void>('cancel_request', { request_id: requestId });
      });
    }
    const result = await invoke<Record<string, unknown>>('get_audit_logs', {
      ...params,
      request_id: requestId,
    });
    if (result.success && result.data) return result.data;
    throw new Error(result.error || 'Failed to get audit logs');
  },

  async exportData(
    resource_type: string,
    format?: string,
    filters?: Record<string, unknown>,
    signal?: AbortSignal
  ): Promise<Record<string, unknown>> {
    const requestId = genRequestId();
    if (signal) {
      signal.addEventListener('abort', () => {
        invoke<void>('cancel_request', { request_id: requestId });
      });
    }
    const result = await invoke<Record<string, unknown>>('export_data', {
      resource_type,
      format,
      filters,
      request_id: requestId,
    });
    if (result.success && result.data) return result.data;
    throw new Error(result.error || 'Failed to export data');
  },

  // ─── Request Cancellation ────────────────────────────────────

  async cancelRequests(): Promise<void> {
    const result = await invoke<void>('cancel_requests');
    if (!result.success) {
      throw new Error(result.error || 'Failed to cancel requests');
    }
  },

  async cancelRequest(requestId: string): Promise<void> {
    const result = await invoke<void>('cancel_request', { request_id: requestId });
    if (!result.success) {
      throw new Error(result.error || 'Failed to cancel request');
    }
  },

  async getActiveRequests(): Promise<string[]> {
    const result = await invoke<string[]>('get_active_requests');
    if (result.success && result.data) {
      return result.data;
    }
    return [];
  },

  // ─── Offline Mode ────────────────────────────────────────────

  async getSyncQueue(): Promise<unknown[]> {
    const result = await invoke<unknown[]>('get_sync_queue');
    if (result.success && result.data) {
      return result.data;
    }
    throw new Error(result.error || 'Failed to get sync queue');
  },

  async flushSync(): Promise<number> {
    const result = await invoke<number>('flush_sync');
    if (result.success && result.data !== null && result.data !== undefined) {
      return result.data;
    }
    throw new Error(result.error || 'Failed to flush sync queue');
  },

  async setOffline(offline: boolean): Promise<void> {
    const result = await invoke<void>('set_offline', { offline });
    if (!result.success) {
      throw new Error(result.error || 'Failed to set offline mode');
    }
  },

  async getOfflineStatus(): Promise<{
    offline: boolean;
    pending_count: number;
    cached_responses: number;
  }> {
    const result = await invoke<{
      offline: boolean;
      pending_count: number;
      cached_responses: number;
    }>('get_offline_status');
    if (result.success && result.data) {
      return result.data;
    }
    throw new Error(result.error || 'Failed to get offline status');
  },
};
