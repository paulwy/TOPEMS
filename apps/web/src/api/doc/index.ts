import apiClient, { downloadBlob } from '../client';
import type { ApiResponse } from '../client';
import config from '../../config/runtime';

import { docWorkspaceApi } from './workspace';
import type {
  DocWorkspace,
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  DocTreeNode,
  MoveItemsRequest,
  CopyItemsRequest,
  TrashItem,
  WorkspaceStats,
} from './workspace';

import { docCollaborationApi } from './collaboration';
import type {
  CollaboratorPermission,
  Collaborator,
  AddCollaboratorRequest,
  UpdateCollaboratorRequest,
  Comment,
  CreateCommentRequest,
  ActivityRecord,
  ShareLink,
  CreateShareLinkRequest,
} from './collaboration';

import { docVersionApi } from './versionControl';
import type {
  DocumentStatus,
  DocumentVersion,
  CreateVersionRequest as CreateDocVersionRequest,
  UpdateVersionRequest as UpdateDocVersionRequest,
  DocumentDiff,
  DocumentLock,
} from './versionControl';

export interface FileMetadata {
  id: string;
  name: string;
  folder_id: string | null;
  size: number;
  content_type: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  version?: number;
}

export interface FileVersion {
  id: string;
  file_id: string;
  version: number;
  size: number;
  content_type: string;
  created_at: string;
  created_by: string;
  change_note?: string;
  download_url?: string;
}

interface FileListResponse {
  files?: FileMetadata[];
  items?: FileMetadata[];
  total: number;
  page: number;
  page_size: number;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface ListFoldersData {
  folders?: Folder[];
  items?: Folder[];
  total: number;
  page: number;
  page_size: number;
}

interface CreateFolderRequest {
  name: string;
  parentId?: string;
}

export interface DocDashboardStats {
  total_documents: number;
  published_documents: number;
  draft_documents: number;
  archived_documents: number;
  total_folders: number;
  total_templates: number;
  active_templates: number;
  this_month_created: number;
  this_month_updated: number;
}

export const docApi = {
  // ==================== 核心 CRUD ====================

  list: async (folderId?: string): Promise<ApiResponse<FileListResponse>> => {
    const params = folderId ? { folder_id: folderId } : {};
    return apiClient.doc.get<FileListResponse>('/documents', { params });
  },

  get: async (id: string): Promise<ApiResponse<FileMetadata>> => {
    return apiClient.doc.get<FileMetadata>(`/documents/${id}`);
  },

  upload: async (file: File, folderId?: string): Promise<ApiResponse<FileMetadata>> => {
    const formData = new FormData();
    formData.append('file', file);
    if (folderId) {
      formData.append('folder_id', folderId);
    }
    return apiClient.file.post<FileMetadata>('/upload', formData);
  },

  download: async (id: string): Promise<Blob> => {
    return downloadBlob(config.services.file, `/download/${id}`);
  },

  preview: async (id: string): Promise<string> => {
    return `${config.services.file}/files/${id}/preview`;
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.doc.delete<void>(`/documents/${id}`);
  },

  // ==================== 文件夹 ====================

  listFolders: async (parentId?: string): Promise<ApiResponse<ListFoldersData>> => {
    const params = parentId ? { parentId } : {};
    return apiClient.doc.get<ListFoldersData>('/folders', { params });
  },

  createFolder: async (request: CreateFolderRequest): Promise<ApiResponse<Folder>> => {
    return apiClient.doc.post<Folder>('/folders', request);
  },

  getFolder: async (id: string): Promise<ApiResponse<Folder>> => {
    return apiClient.doc.get<Folder>(`/folders/${id}`);
  },

  updateFolder: async (id: string, request: CreateFolderRequest): Promise<ApiResponse<Folder>> => {
    return apiClient.doc.put<Folder>(`/folders/${id}`, request);
  },

  deleteFolder: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.doc.delete<void>(`/folders/${id}`);
  },

  // ==================== 版本（兼容保留） ====================

  getVersions: async (fileId: string): Promise<ApiResponse<FileVersion[]>> => {
    return apiClient.doc.get<FileVersion[]>(`/documents/${fileId}/versions`);
  },

  getVersion: async (fileId: string, version: number): Promise<ApiResponse<FileVersion>> => {
    return apiClient.doc.get<FileVersion>(`/documents/${fileId}/versions/${version}`);
  },

  restoreVersion: async (fileId: string, version: number): Promise<ApiResponse<FileMetadata>> => {
    return apiClient.doc.post<FileMetadata>(`/documents/${fileId}/versions/${version}/restore`);
  },

  // ==================== 子域：工作区 ====================

  workspaces: docWorkspaceApi,

  // ==================== 子域：协作 ====================

  collaboration: docCollaborationApi,

  // ==================== 子域：版本控制 ====================

  versionControl: docVersionApi,

  // ==================== 顶层快捷方法 ====================

  // 工作区快捷方法
  listWorkspaces: docWorkspaceApi.listWorkspaces,
  createWorkspace: docWorkspaceApi.createWorkspace,
  getWorkspaceTree: docWorkspaceApi.getWorkspaceTree,
  moveItems: docWorkspaceApi.moveItems,
  emptyTrash: docWorkspaceApi.emptyTrash,
  searchWorkspace: docWorkspaceApi.searchWorkspace,

  // 协作快捷方法
  addCollaborators: docCollaborationApi.addCollaborators,
  listComments: docCollaborationApi.listComments,
  createComment: docCollaborationApi.createComment,
  createShareLink: docCollaborationApi.createShareLink,
  listActivities: docCollaborationApi.listActivities,

  // 版本控制快捷方法
  listDocVersions: docVersionApi.listVersions,
  createDocVersion: docVersionApi.createVersion,
  publishVersion: docVersionApi.publishVersion,
  getDiff: docVersionApi.getDiff,
  acquireLock: docVersionApi.acquireLock,
  releaseLock: docVersionApi.releaseLock,

  // ==================== 仪表盘 ====================

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.doc.get<string>('/health');
  },

  getDashboard: async (): Promise<ApiResponse<DocDashboardStats>> => {
    return apiClient.doc.get<DocDashboardStats>('/dashboard');
  },
};

// ==================== 类型导出 ====================

export type {
  DocWorkspace,
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  DocTreeNode,
  MoveItemsRequest,
  CopyItemsRequest,
  TrashItem,
  WorkspaceStats,
  CollaboratorPermission,
  Collaborator,
  AddCollaboratorRequest,
  UpdateCollaboratorRequest,
  Comment,
  CreateCommentRequest,
  ActivityRecord,
  ShareLink,
  CreateShareLinkRequest,
  DocumentStatus,
  DocumentVersion,
  CreateDocVersionRequest,
  UpdateDocVersionRequest,
  DocumentDiff,
  DocumentLock,
};

export default docApi;
