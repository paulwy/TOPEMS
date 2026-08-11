import apiClient, { downloadBlob } from '../client';
import type {
  AddressbookEntry,
  AddressbookDetail,
  AddressbookQueryParams,
  AddressbookSearchParams,
  ApiResponse,
  DepartmentNode,
  ExportParams,
  PaginatedResponse,
} from '../../types/addressbook';
import config from '../../config/runtime';
import { addressbookGroupApi } from './group';
import { addressbookTagApi } from './tag';
import { addressbookImportExportApi } from './importExport';
import { addressbookFavoriteApi } from './favorite';

export const addressbookApi = {
  // ==================== 基础查询 ====================

  getContacts: async (
    params: AddressbookQueryParams
  ): Promise<ApiResponse<PaginatedResponse<AddressbookEntry>>> => {
    const response = await apiClient.erp.get('/addressbook', { params });
    return response;
  },

  getContactDetail: async (
    id: string,
    contactType: string
  ): Promise<ApiResponse<AddressbookDetail>> => {
    const response = await apiClient.erp.get(`/addressbook/${id}`, {
      params: { contact_type: contactType },
    });
    return response;
  },

  search: async (
    params: AddressbookSearchParams
  ): Promise<ApiResponse<Record<string, unknown>[]>> => {
    const response = await apiClient.erp.get('/addressbook/search', {
      params,
    });
    return response;
  },

  getDepartmentTree: async (): Promise<ApiResponse<DepartmentNode[]>> => {
    const response = await apiClient.erp.get('/addressbook/departments/tree');
    return response;
  },

  exportContacts: async (params: ExportParams): Promise<Blob> => {
    const baseURL = apiClient.erp.defaults?.baseURL || config.services.erp;
    return downloadBlob(baseURL, '/addressbook/export', {
      params: params as unknown as Record<string, unknown>,
    });
  },

  // ==================== 子模块聚合 ====================

  /** 联系人分组管理（分组 CRUD + 成员管理 + 排序 + 分享 + 复制/移动） */
  groups: addressbookGroupApi,

  /** 联系人标签管理（标签 CRUD + 联系人关联 + 颜色预设） */
  tags: addressbookTagApi,

  /** 导入导出与批量操作（导入模板/验证/执行 + 导出任务 + 批量更新/删除 + 重复检测/合并） */
  importExport: addressbookImportExportApi,

  /** 收藏与分享（收藏 CRUD + 最近联系人 + 分享管理） */
  favorites: addressbookFavoriteApi,

  // ==================== 顶层快捷方法 ====================

  // Group 快捷方法
  listGroups: addressbookGroupApi.listGroups,
  createGroup: addressbookGroupApi.createGroup,
  updateGroup: addressbookGroupApi.updateGroup,
  deleteGroup: addressbookGroupApi.deleteGroup,
  getGroupTree: addressbookGroupApi.getGroupTree,
  listGroupContacts: addressbookGroupApi.listGroupContacts,
  addContactToGroup: addressbookGroupApi.addContactToGroup,
  shareGroup: addressbookGroupApi.shareGroup,

  // Tag 快捷方法
  listTags: addressbookTagApi.listTags,
  createTag: addressbookTagApi.createTag,
  deleteTag: addressbookTagApi.deleteTag,
  listContactTags: addressbookTagApi.listContactTags,

  // ImportExport 快捷方法
  validateImport: addressbookImportExportApi.validateImport,
  executeImport: addressbookImportExportApi.executeImport,
  createExportTask: addressbookImportExportApi.createExportTask,
  batchUpdateContacts: addressbookImportExportApi.batchUpdateContacts,
  batchDeleteContacts: addressbookImportExportApi.batchDeleteContacts,
  findDuplicates: addressbookImportExportApi.findDuplicates,

  // Favorite 快捷方法
  listFavorites: addressbookFavoriteApi.listFavorites,
  addFavorite: addressbookFavoriteApi.addFavorite,
  listRecent: addressbookFavoriteApi.listRecent,
};

export default addressbookApi;
export {
  addressbookGroupApi,
  addressbookTagApi,
  addressbookImportExportApi,
  addressbookFavoriteApi,
};

// Re-export sub-module types
export type { ContactGroup, CreateGroupRequest, UpdateGroupRequest, GroupShare } from './group';
export type { ContactTag, CreateTagRequest, UpdateTagRequest } from './tag';
export type {
  ImportTask,
  ImportValidateResult,
  ExportTask,
  DuplicateContact,
  MergeContactsRequest,
  ActivityLog,
} from './importExport';
export type { FavoriteContact, RecentContact, SharedContact } from './favorite';
