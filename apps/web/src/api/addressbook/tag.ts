/**
 * Addressbook · 联系人标签管理 API 绑定
 *
 * 后端: erp 服务 /addressbook/tags/*
 * 路由:
 *   GET    /addressbook/tags
 *   POST   /addressbook/tags
 *   GET    /addressbook/tags/{id}
 *   PUT    /addressbook/tags/{id}
 *   DELETE /addressbook/tags/{id}
 *   POST   /addressbook/tags/{id}/contacts
 *   DELETE /addressbook/tags/{id}/contacts/{contact_id}
 *   POST   /addressbook/tags/{id}/contacts/batch
 *   GET    /addressbook/tags/{id}/contacts
 *   GET    /addressbook/contacts/{id}/tags
 *   POST   /addressbook/contacts/{id}/tags
 *   DELETE /addressbook/contacts/{id}/tags/{tag_id}
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import { designTokens, semanticTokens } from '@topems/tokens';
import i18n from '@/i18n';

export interface ContactTag {
  id: string;
  name: string;
  color: string;
  description?: string;
  tag_type: 'system' | 'custom';
  contact_count: number;
  is_system: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTagRequest {
  name: string;
  color?: string;
  description?: string;
}

export interface UpdateTagRequest {
  name?: string;
  color?: string;
  description?: string;
}

export interface AddTagToContactRequest {
  tag_ids: string[];
}

export interface AddContactToTagRequest {
  contact_ids: string[];
  contact_type?: 'EMPLOYEE' | 'DEPARTMENT' | 'COMPANY';
}

export interface TagColor {
  name: string;
  hex: string;
}

export const PRESET_TAG_COLORS: TagColor[] = [
  { name: i18n.t('shared.tag.k0'), hex: designTokens.colors.error.main },
  { name: i18n.t('shared.tag.k1'), hex: 'colors.orange.500' },
  { name: i18n.t('shared.tag.k2'), hex: 'var(--color-warning, #f59e0b)' },
  { name: i18n.t('shared.tag.k3'), hex: 'colors.success.main' },
  { name: i18n.t('shared.tag.k4'), hex: 'colors.cyan.500' },
  { name: i18n.t('shared.tag.k5'), hex: designTokens.colors.primary.main },
  { name: i18n.t('shared.tag.k6'), hex: designTokens.colors.secondary.main },
  { name: i18n.t('shared.tag.k7'), hex: designTokens.colors.pink.main },
  { name: i18n.t('shared.tag.k8'), hex: 'colors.grey.500' },
  { name: i18n.t('shared.tag.k9'), hex: 'colors.grey.800' },
];

export const addressbookTagApi = {
  // ==================== 标签 CRUD ====================

  listTags: async (params?: {
    tag_type?: 'system' | 'custom';
    search?: string;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<PaginatedResponse<ContactTag>>> => {
    return apiClient.erp.get('/addressbook/tags', { params });
  },

  getTag: async (id: string): Promise<ApiResponse<ContactTag>> => {
    return apiClient.erp.get(`/addressbook/tags/${id}`);
  },

  createTag: async (data: CreateTagRequest): Promise<ApiResponse<ContactTag>> => {
    return apiClient.erp.post('/addressbook/tags', data);
  },

  updateTag: async (id: string, data: UpdateTagRequest): Promise<ApiResponse<ContactTag>> => {
    return apiClient.erp.put(`/addressbook/tags/${id}`, data);
  },

  deleteTag: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.erp.delete(`/addressbook/tags/${id}`);
  },

  // ==================== 标签关联 ====================

  listTagContacts: async (
    tagId: string,
    params?: { page?: number; pagesize?: number; search?: string }
  ): Promise<
    ApiResponse<PaginatedResponse<{ id: string; name: string; contact_type: string }>>
  > => {
    return apiClient.erp.get(`/addressbook/tags/${tagId}/contacts`, { params });
  },

  addContactToTag: async (
    tagId: string,
    data: AddContactToTagRequest
  ): Promise<ApiResponse<{ added: number }>> => {
    return apiClient.erp.post(`/addressbook/tags/${tagId}/contacts`, data);
  },

  removeContactFromTag: async (tagId: string, contactId: string): Promise<ApiResponse<string>> => {
    return apiClient.erp.delete(`/addressbook/tags/${tagId}/contacts/${contactId}`);
  },

  // ==================== 联系人标签 ====================

  listContactTags: async (contactId: string): Promise<ApiResponse<ContactTag[]>> => {
    return apiClient.erp.get(`/addressbook/contacts/${contactId}/tags`);
  },

  addTagsToContact: async (
    contactId: string,
    data: AddTagToContactRequest
  ): Promise<ApiResponse<{ added: number }>> => {
    return apiClient.erp.post(`/addressbook/contacts/${contactId}/tags`, data);
  },

  removeTagFromContact: async (contactId: string, tagId: string): Promise<ApiResponse<string>> => {
    return apiClient.erp.delete(`/addressbook/contacts/${contactId}/tags/${tagId}`);
  },
};

export default addressbookTagApi;
