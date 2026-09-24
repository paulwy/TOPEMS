/**
 * Addressbook · 收藏与分享 API 绑定
 *
 * 后端: erp 服务 /addressbook/favorites/* 和 /addressbook/shared/*
 * 路由:
 *   GET    /addressbook/favorites
 *   POST   /addressbook/favorites
 *   DELETE /addressbook/favorites/{contact_id}
 *   POST   /addressbook/favorites/sort
 *   GET    /addressbook/recent
 *   GET    /addressbook/shared
 *   GET    /addressbook/shared/{id}
 *   DELETE /addressbook/shared/{id}
 *   GET    /addressbook/contacts/{id}/shared-with
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

interface FavoriteContact {
  id: string;
  contact_id: string;
  contact_type: 'EMPLOYEE' | 'DEPARTMENT' | 'COMPANY';
  name: string;
  position?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  department_name?: string;
  sort_order: number;
  added_at: string;
}

interface AddFavoriteRequest {
  contact_id: string;
  contact_type: 'EMPLOYEE' | 'DEPARTMENT' | 'COMPANY';
}

interface SortFavoritesRequest {
  contact_ids: string[];
}

interface RecentContact {
  id: string;
  contact_id: string;
  contact_type: 'EMPLOYEE' | 'DEPARTMENT' | 'COMPANY';
  name: string;
  avatar_url?: string;
  action: 'view' | 'edit' | 'message' | 'call';
  last_interaction_at: string;
  interaction_count: number;
}

interface SharedContact {
  id: string;
  contact_id: string;
  contact_name: string;
  contact_type: 'EMPLOYEE' | 'DEPARTMENT' | 'COMPANY';
  shared_by: string;
  shared_by_name: string;
  shared_by_email: string;
  permission: 'view' | 'edit';
  shared_at: string;
  expires_at?: string;
}

interface SharedWithUser {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  permission: 'view' | 'edit';
  shared_at: string;
}

export const addressbookFavoriteApi = {
  // ==================== 收藏 ====================

  listFavorites: async (params?: {
    contact_type?: 'EMPLOYEE' | 'DEPARTMENT' | 'COMPANY';
  }): Promise<ApiResponse<FavoriteContact[]>> => {
    return apiClient.erp.get('/addressbook/favorites', { params });
  },

  addFavorite: async (data: AddFavoriteRequest): Promise<ApiResponse<FavoriteContact>> => {
    return apiClient.erp.post('/addressbook/favorites', data);
  },

  removeFavorite: async (contactId: string): Promise<ApiResponse<string>> => {
    return apiClient.erp.delete(`/addressbook/favorites/${contactId}`);
  },

  sortFavorites: async (data: SortFavoritesRequest): Promise<ApiResponse<string>> => {
    return apiClient.erp.post('/addressbook/favorites/sort', data);
  },

  // ==================== 最近联系人 ====================

  listRecent: async (params?: {
    action?: RecentContact['action'];
    limit?: number;
  }): Promise<ApiResponse<RecentContact[]>> => {
    return apiClient.erp.get('/addressbook/recent', { params });
  },

  // ==================== 分享 ====================

  listSharedWithMe: async (params?: {
    contact_type?: 'EMPLOYEE' | 'DEPARTMENT' | 'COMPANY';
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<SharedContact[]>> => {
    return apiClient.erp.get('/addressbook/shared', { params });
  },

  getSharedContact: async (id: string): Promise<ApiResponse<SharedContact>> => {
    return apiClient.erp.get(`/addressbook/shared/${id}`);
  },

  revokeShared: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.erp.delete(`/addressbook/shared/${id}`);
  },

  // ==================== 联系人被分享信息 ====================

  listContactShares: async (contactId: string): Promise<ApiResponse<SharedWithUser[]>> => {
    return apiClient.erp.get(`/addressbook/contacts/${contactId}/shared-with`);
  },
};

export default addressbookFavoriteApi;
