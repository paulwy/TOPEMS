import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface MenuGroup {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  icon?: string | null;
  sort_order: number;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface MenuItem {
  id: string;
  tenant_id: string;
  group_id: string;
  parent_id?: string | null;
  name: string;
  code: string;
  path?: string | null;
  icon?: string | null;
  sort_order: number;
  status: string;
  permissions?: unknown;
  created_at?: string;
  updated_at?: string;
}

export interface MenuGroupList {
  items: MenuGroup[];
  total: number;
  page: number;
  page_size: number;
}

export interface MenuItemList {
  items: MenuItem[];
  total: number;
  page: number;
  page_size: number;
}

interface ListParams {
  search?: string;
  status?: string;
  page?: number;
  page_size?: number;
}

interface MenuGroupCreate {
  name: string;
  code: string;
  icon?: string | null;
  sort_order?: number;
}

interface MenuGroupUpdate {
  name?: string;
  code?: string;
  icon?: string | null;
  sort_order?: number;
  status?: string;
}

interface MenuItemCreate {
  group_id: string;
  parent_id?: string | null;
  name: string;
  code: string;
  path?: string | null;
  icon?: string | null;
  sort_order?: number;
  permissions?: unknown;
}

interface MenuItemUpdate {
  group_id?: string;
  parent_id?: string | null;
  name?: string;
  code?: string;
  path?: string | null;
  icon?: string | null;
  sort_order?: number;
  status?: string;
  permissions?: unknown;
}

export const menuApi = {
  listGroups: (params: ListParams = {}): Promise<ApiResponse<MenuGroupList>> => {
    return apiClient.core.get('/menu/groups', { params });
  },

  getGroup: (id: string): Promise<ApiResponse<MenuGroup>> => {
    return apiClient.core.get(`/menu/groups/${id}`);
  },

  createGroup: (data: MenuGroupCreate): Promise<ApiResponse<MenuGroup>> => {
    return apiClient.core.post('/menu/groups', data);
  },

  updateGroup: (id: string, data: MenuGroupUpdate): Promise<ApiResponse<MenuGroup>> => {
    return apiClient.core.put(`/menu/groups/${id}`, data);
  },

  deleteGroup: (id: string): Promise<ApiResponse<string>> => {
    return apiClient.core.delete(`/menu/groups/${id}`);
  },

  listMenus: (
    params: ListParams & { group_id?: string; parent_id?: string } = {}
  ): Promise<ApiResponse<MenuItemList>> => {
    return apiClient.core.get('/menu/menus', { params });
  },

  getMenu: (id: string): Promise<ApiResponse<MenuItem>> => {
    return apiClient.core.get(`/menu/menus/${id}`);
  },

  createMenu: (data: MenuItemCreate): Promise<ApiResponse<MenuItem>> => {
    return apiClient.core.post('/menu/menus', data);
  },

  updateMenu: (id: string, data: MenuItemUpdate): Promise<ApiResponse<MenuItem>> => {
    return apiClient.core.put(`/menu/menus/${id}`, data);
  },

  deleteMenu: (id: string): Promise<ApiResponse<string>> => {
    return apiClient.core.delete(`/menu/menus/${id}`);
  },
};

export default menuApi;
