/**
 * Mobile · 快捷方式 API 绑定
 *
 * 后端: svc/mobile/src/modules/shortcut.rs
 * 路由（已注册 main.rs）:
 *   GET    /shortcuts
 *   POST   /shortcuts
 * 扩展路由（预留）:
 *   PUT    /shortcuts/{id}
 *   DELETE /shortcuts/{id}
 *   POST   /shortcuts/reorder
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export type ActionType =
  'navigate' | 'scan' | 'call_api' | 'open_url' | 'start_workflow' | 'create_record';

export interface Shortcut {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  action_type: ActionType;
  action_params?: Record<string, unknown> | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateShortcutRequest {
  name: string;
  icon: string;
  action_type: ActionType;
  action_params?: Record<string, unknown>;
  sort_order?: number;
}

export interface UpdateShortcutRequest {
  name?: string;
  icon?: string;
  action_type?: ActionType;
  action_params?: Record<string, unknown>;
  sort_order?: number;
  is_active?: boolean;
}

export interface ReorderShortcutItem {
  id: string;
  sort_order: number;
}

export const shortcutApi = {
  listShortcuts: async (): Promise<ApiResponse<Shortcut[]>> => {
    return apiClient.mobile.get('/shortcuts');
  },

  createShortcut: async (data: CreateShortcutRequest): Promise<ApiResponse<Shortcut>> => {
    return apiClient.mobile.post('/shortcuts', data);
  },

  updateShortcut: async (
    id: string,
    data: UpdateShortcutRequest
  ): Promise<ApiResponse<Shortcut>> => {
    return apiClient.mobile.put(`/shortcuts/${id}`, data);
  },

  deleteShortcut: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.mobile.delete(`/shortcuts/${id}`);
  },

  reorderShortcuts: async (items: ReorderShortcutItem[]): Promise<ApiResponse<boolean>> => {
    return apiClient.mobile.post('/shortcuts/reorder', { items });
  },
};

export default shortcutApi;
