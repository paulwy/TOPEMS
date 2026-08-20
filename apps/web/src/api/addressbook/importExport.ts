/**
 * Addressbook · 导入导出与批量操作 API 绑定
 *
 * 后端: erp 服务 /addressbook/import/* 和 /addressbook/export/*
 * 路由:
 *   GET    /addressbook/import/template
 *   POST   /addressbook/import/validate
 *   POST   /addressbook/import/execute
 *   GET    /addressbook/import/tasks
 *   GET    /addressbook/import/tasks/{id}
 *   DELETE /addressbook/import/tasks/{id}
 *   POST   /addressbook/export/contacts
 *   GET    /addressbook/export/tasks
 *   GET    /addressbook/export/tasks/{id}
 *   POST   /addressbook/batch/update
 *   POST   /addressbook/batch/delete
 *   POST   /addressbook/batch/tags
 *   POST   /addressbook/batch/groups
 *   GET    /addressbook/contacts/duplicates
 *   POST   /addressbook/contacts/{id}/merge
 *   GET    /addressbook/activity
 */

import apiClient, { downloadBlob } from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import config from '../../config/runtime';

type ImportType = 'EMPLOYEE' | 'DEPARTMENT' | 'COMPANY';
type ImportStatus =
  'pending' | 'validating' | 'valid' | 'invalid' | 'importing' | 'completed' | 'failed';

export interface ImportTask {
  id: string;
  import_type: ImportType;
  file_name: string;
  file_size: number;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  status: ImportStatus;
  errors: Array<{ row: number; field: string; message: string }>;
  created_by?: string;
  created_at: string;
  completed_at?: string;
}

export interface ImportValidateResult {
  valid: boolean;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  errors: Array<{ row: number; field: string; message: string }>;
  preview: Array<Record<string, unknown>>;
}

export interface ExportTask {
  id: string;
  export_type: 'contacts' | 'groups' | 'tags';
  format: 'csv' | 'xlsx' | 'pdf';
  filters?: Record<string, unknown>;
  total_rows: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  file_url?: string;
  created_by?: string;
  created_at: string;
  completed_at?: string;
}

interface BatchUpdateRequest {
  ids: string[];
  fields: Record<string, unknown>;
}

interface BatchDeleteRequest {
  ids: string[];
  confirm: boolean;
}

export interface BatchTagRequest {
  contact_ids: string[];
  tag_ids: string[];
  action: 'add' | 'remove' | 'replace';
}

interface BatchGroupRequest {
  contact_ids: string[];
  group_id: string;
  action: 'add' | 'remove';
}

export interface DuplicateContact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  contact_type: string;
  match_reason: string;
  duplicate_ids: string[];
}

export interface MergeContactsRequest {
  primary_id: string;
  merge_ids: string[];
  field_strategy: 'keep_primary' | 'keep_latest' | 'manual';
  field_overrides?: Record<string, string>;
}

export interface ActivityLog {
  id: string;
  action: 'create' | 'update' | 'delete' | 'import' | 'export' | 'merge' | 'share';
  target_type: 'contact' | 'group' | 'tag' | 'import' | 'export';
  target_id: string;
  target_name?: string;
  details?: Record<string, unknown>;
  operator_id?: string;
  operator_name?: string;
  ip_address?: string;
  created_at: string;
}

export const addressbookImportExportApi = {
  // ==================== 导入 ====================

  downloadImportTemplate: async (type: ImportType): Promise<Blob> => {
    const baseURL = apiClient.erp.defaults?.baseURL || config.services.erp;
    return downloadBlob(baseURL, '/addressbook/import/template', {
      params: { type },
    });
  },

  validateImport: async (data: {
    file: File;
    import_type: ImportType;
  }): Promise<ApiResponse<ImportValidateResult>> => {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('import_type', data.import_type);
    return apiClient.erp.post('/addressbook/import/validate', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  executeImport: async (data: {
    task_id: string;
    import_type: ImportType;
  }): Promise<ApiResponse<ImportTask>> => {
    return apiClient.erp.post('/addressbook/import/execute', data);
  },

  listImportTasks: async (params?: {
    status?: ImportStatus;
    import_type?: ImportType;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<PaginatedResponse<ImportTask>>> => {
    return apiClient.erp.get('/addressbook/import/tasks', { params });
  },

  getImportTask: async (id: string): Promise<ApiResponse<ImportTask>> => {
    return apiClient.erp.get(`/addressbook/import/tasks/${id}`);
  },

  deleteImportTask: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.erp.delete(`/addressbook/import/tasks/${id}`);
  },

  // ==================== 导出 ====================

  createExportTask: async (data: {
    export_type: 'contacts' | 'groups' | 'tags';
    format?: 'csv' | 'xlsx' | 'pdf';
    filters?: Record<string, unknown>;
  }): Promise<ApiResponse<ExportTask>> => {
    return apiClient.erp.post('/addressbook/export/contacts', data);
  },

  listExportTasks: async (params?: {
    status?: 'pending' | 'processing' | 'completed' | 'failed';
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<PaginatedResponse<ExportTask>>> => {
    return apiClient.erp.get('/addressbook/export/tasks', { params });
  },

  getExportTask: async (id: string): Promise<ApiResponse<ExportTask>> => {
    return apiClient.erp.get(`/addressbook/export/tasks/${id}`);
  },

  downloadExportFile: async (id: string): Promise<Blob> => {
    const baseURL = apiClient.erp.defaults?.baseURL || config.services.erp;
    return downloadBlob(baseURL, `/addressbook/export/tasks/${id}/download`);
  },

  // ==================== 批量操作 ====================

  batchUpdateContacts: async (
    data: BatchUpdateRequest
  ): Promise<ApiResponse<{ updated: number }>> => {
    return apiClient.erp.post('/addressbook/batch/update', data);
  },

  batchDeleteContacts: async (
    data: BatchDeleteRequest
  ): Promise<ApiResponse<{ deleted: number }>> => {
    return apiClient.erp.post('/addressbook/batch/delete', data);
  },

  batchAddTags: async (data: BatchTagRequest): Promise<ApiResponse<{ updated: number }>> => {
    return apiClient.erp.post('/addressbook/batch/tags', data);
  },

  batchAddToGroup: async (data: BatchGroupRequest): Promise<ApiResponse<{ updated: number }>> => {
    return apiClient.erp.post('/addressbook/batch/groups', data);
  },

  // ==================== 重复检测与合并 ====================

  findDuplicates: async (params?: {
    threshold?: number;
    contact_type?: ImportType;
  }): Promise<ApiResponse<DuplicateContact[]>> => {
    return apiClient.erp.get('/addressbook/contacts/duplicates', { params });
  },

  mergeContacts: async (
    data: MergeContactsRequest
  ): Promise<ApiResponse<{ merged_id: string }>> => {
    return apiClient.erp.post('/addressbook/contacts/merge', data);
  },

  // ==================== 活动日志 ====================

  listActivity: async (params?: {
    action?: ActivityLog['action'];
    target_type?: ActivityLog['target_type'];
    start_date?: string;
    end_date?: string;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<PaginatedResponse<ActivityLog>>> => {
    return apiClient.erp.get('/addressbook/activity', { params });
  },
};

export default addressbookImportExportApi;
