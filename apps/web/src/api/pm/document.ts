import { apiClient } from '../client';
import type { ProjectDocument, DocumentVersion, DocumentFolder } from './types';

export const documentApi = {
  list: async (projectId: string) => {
    return apiClient.pm.get(`/api/pm/projects/${projectId}/documents`);
  },

  get: async (id: string) => {
    return apiClient.pm.get(`/api/pm/documents/${id}`);
  },

  create: async (
    projectId: string,
    data: {
      document_code?: string;
      document_name: string;
      document_type: string;
      file_path: string;
      filesize: number;
      file_hash?: string;
      description?: string;
      tags?: string[];
      created_by?: string;
    }
  ) => {
    return apiClient.pm.post(`/api/pm/projects/${projectId}/documents`, data);
  },

  update: async (
    id: string,
    data: {
      document_name?: string;
      document_type?: string;
      status?: string;
      description?: string;
      tags?: string[];
    }
  ) => {
    return apiClient.pm.put(`/api/pm/documents/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.pm.delete(`/api/pm/documents/${id}`);
  },
};

export const documentVersionApi = {
  list: async (documentId: string) => {
    return apiClient.pm.get(`/api/pm/documents/${documentId}/versions`);
  },

  create: async (
    documentId: string,
    data: {
      file_path: string;
      file_hash?: string;
      change_note?: string;
      created_by?: string;
    }
  ) => {
    return apiClient.pm.post(`/api/pm/documents/${documentId}/versions`, data);
  },
};

export const documentFolderApi = {
  list: async (projectId: string) => {
    return apiClient.pm.get(`/api/pm/projects/${projectId}/folders`);
  },

  get: async (id: string) => {
    return apiClient.pm.get(`/api/pm/folders/${id}`);
  },

  create: async (
    projectId: string,
    data: {
      parent_id?: string;
      folder_name: string;
      description?: string;
      created_by?: string;
    }
  ) => {
    return apiClient.pm.post(`/api/pm/projects/${projectId}/folders`, data);
  },

  update: async (
    id: string,
    data: {
      folder_name?: string;
      description?: string;
    }
  ) => {
    return apiClient.pm.put(`/api/pm/folders/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.pm.delete(`/api/pm/folders/${id}`);
  },
};

export default documentApi;
