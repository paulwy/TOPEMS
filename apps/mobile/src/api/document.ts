import { apiClient } from './client';
import type { ApiResponse, Document } from '@/types';

export const documentApi = {
  getDocuments: async (params: {
    page?: number;
    pageSize?: number;
    search?: string;
    category?: string;
  }): Promise<ApiResponse<{ items: Document[]; total: number }>> => {
    return apiClient.get('/documents', { params });
  },

  getDocumentById: async (id: string): Promise<ApiResponse<Document>> => {
    return apiClient.get(`/documents/${id}`);
  },

  createDocument: async (data: {
    title: string;
    description?: string;
    category: string;
    file: FormData;
  }): Promise<ApiResponse<Document>> => {
    return apiClient.post('/documents', data);
  },

  updateDocument: async (
    id: string,
    data: {
      title?: string;
      description?: string;
      category?: string;
      status?: string;
    },
  ): Promise<ApiResponse<Document>> => {
    return apiClient.put(`/documents/${id}`, data);
  },

  deleteDocument: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/documents/${id}`);
  },

  getCategories: async (): Promise<ApiResponse<{ id: string; name: string }[]>> => {
    return apiClient.get('/documents/categories');
  },
};
