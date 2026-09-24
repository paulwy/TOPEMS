/**
 * Addressbook · 联系人分组管理 API 绑定
 *
 * 后端: erp 服务 /addressbook/groups/*
 * 路由:
 *   GET    /addressbook/groups
 *   POST   /addressbook/groups
 *   GET    /addressbook/groups/{id}
 *   PUT    /addressbook/groups/{id}
 *   DELETE /addressbook/groups/{id}
 *   POST   /addressbook/groups/{id}/contacts
 *   DELETE /addressbook/groups/{id}/contacts/{contact_id}
 *   POST   /addressbook/groups/{id}/contacts/batch
 *   GET    /addressbook/groups/{id}/contacts
 *   PUT    /addressbook/groups/{id}/sort
 *   POST   /addressbook/groups/sort-batch
 *   GET    /addressbook/groups/tree
 *   POST   /addressbook/groups/{id}/share
 *   DELETE /addressbook/groups/{id}/share/{user_id}
 *   GET    /addressbook/groups/{id}/sharees
 *   POST   /addressbook/groups/{id}/copy
 *   POST   /addressbook/groups/move
 *   DELETE /addressbook/groups/{id}/contacts
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export interface ContactGroup {
  id: string;
  name: string;
  description?: string;
  parent_id?: string;
  group_type: 'system' | 'custom' | 'shared';
  visibility: 'private' | 'team' | 'organization';
  color?: string;
  icon?: string;
  contact_count: number;
  sort_order: number;
  is_system: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
  parent_id?: string;
  group_type?: 'custom' | 'shared';
  visibility?: 'private' | 'team' | 'organization';
  color?: string;
  icon?: string;
}

interface UpdateGroupRequest {
  name?: string;
  description?: string;
  parent_id?: string;
  visibility?: 'private' | 'team' | 'organization';
  color?: string;
  icon?: string;
  sort_order?: number;
}

interface AddContactToGroupRequest {
  contact_id: string;
  contact_type: 'EMPLOYEE' | 'DEPARTMENT' | 'COMPANY';
}

interface BatchAddContactsRequest {
  contact_ids: Array<{ id: string; type: 'EMPLOYEE' | 'DEPARTMENT' | 'COMPANY' }>;
}

interface GroupShare {
  id: string;
  group_id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  permission: 'view' | 'edit' | 'manage';
  created_at: string;
}

interface ShareGroupRequest {
  user_ids: string[];
  permission: 'view' | 'edit' | 'manage';
}

interface CopyGroupRequest {
  name?: string;
  target_parent_id?: string;
  include_contacts?: boolean;
}

interface MoveGroupRequest {
  source_ids: string[];
  target_parent_id: string;
}

export const addressbookGroupApi = {
  // ==================== 分组 CRUD ====================

  listGroups: async (params?: {
    parent_id?: string;
    group_type?: 'system' | 'custom' | 'shared';
    visibility?: 'private' | 'team' | 'organization';
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<ContactGroup>>> => {
    return apiClient.erp.get('/addressbook/groups', { params });
  },

  getGroup: async (id: string): Promise<ApiResponse<ContactGroup>> => {
    return apiClient.erp.get(`/addressbook/groups/${id}`);
  },

  createGroup: async (data: CreateGroupRequest): Promise<ApiResponse<ContactGroup>> => {
    return apiClient.erp.post('/addressbook/groups', data);
  },

  updateGroup: async (id: string, data: UpdateGroupRequest): Promise<ApiResponse<ContactGroup>> => {
    return apiClient.erp.put(`/addressbook/groups/${id}`, data);
  },

  deleteGroup: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.erp.delete(`/addressbook/groups/${id}`);
  },

  // ==================== 分组树 ====================

  getGroupTree: async (params?: {
    include_system?: boolean;
    visibility?: 'private' | 'team' | 'organization';
  }): Promise<ApiResponse<Array<ContactGroup & { children: ContactGroup[] }>>> => {
    return apiClient.erp.get('/addressbook/groups/tree', { params });
  },

  // ==================== 分组成员管理 ====================

  listGroupContacts: async (
    groupId: string,
    params?: {
      page?: number;
      page_size?: number;
      search?: string;
    }
  ): Promise<
    ApiResponse<
      PaginatedResponse<{
        id: string;
        name: string;
        email?: string;
        phone?: string;
        contact_type: string;
        added_at: string;
      }>
    >
  > => {
    return apiClient.erp.get(`/addressbook/groups/${groupId}/contacts`, { params });
  },

  addContactToGroup: async (
    groupId: string,
    data: AddContactToGroupRequest
  ): Promise<ApiResponse<string>> => {
    return apiClient.erp.post(`/addressbook/groups/${groupId}/contacts`, data);
  },

  batchAddContacts: async (
    groupId: string,
    data: BatchAddContactsRequest
  ): Promise<ApiResponse<{ added: number }>> => {
    return apiClient.erp.post(`/addressbook/groups/${groupId}/contacts/batch`, data);
  },

  removeContactFromGroup: async (
    groupId: string,
    contactId: string
  ): Promise<ApiResponse<string>> => {
    return apiClient.erp.delete(`/addressbook/groups/${groupId}/contacts/${contactId}`);
  },

  clearGroupContacts: async (groupId: string): Promise<ApiResponse<string>> => {
    return apiClient.erp.delete(`/addressbook/groups/${groupId}/contacts`);
  },

  // ==================== 分组排序 ====================

  sortGroup: async (
    groupId: string,
    data: { sort_order: number }
  ): Promise<ApiResponse<ContactGroup>> => {
    return apiClient.erp.put(`/addressbook/groups/${groupId}/sort`, data);
  },

  batchSortGroups: async (
    data: Array<{ id: string; sort_order: number; parent_id?: string }>
  ): Promise<ApiResponse<string>> => {
    return apiClient.erp.post('/addressbook/groups/sort-batch', data);
  },

  // ==================== 分组分享 ====================

  listGroupShares: async (groupId: string): Promise<ApiResponse<GroupShare[]>> => {
    return apiClient.erp.get(`/addressbook/groups/${groupId}/sharees`);
  },

  shareGroup: async (
    groupId: string,
    data: ShareGroupRequest
  ): Promise<ApiResponse<GroupShare[]>> => {
    return apiClient.erp.post(`/addressbook/groups/${groupId}/share`, data);
  },

  unshareGroup: async (groupId: string, userId: string): Promise<ApiResponse<string>> => {
    return apiClient.erp.delete(`/addressbook/groups/${groupId}/share/${userId}`);
  },

  // ==================== 分组操作 ====================

  copyGroup: async (
    groupId: string,
    data?: CopyGroupRequest
  ): Promise<ApiResponse<ContactGroup>> => {
    return apiClient.erp.post(`/addressbook/groups/${groupId}/copy`, data || {});
  },

  moveGroups: async (data: MoveGroupRequest): Promise<ApiResponse<string>> => {
    return apiClient.erp.post('/addressbook/groups/move', data);
  },
};

export default addressbookGroupApi;
