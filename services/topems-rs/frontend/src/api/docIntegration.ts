import { apiClient, ApiResponse, PaginatedResponse } from './client';

export interface DocumentRelation {
  id: string;
  entity_type: string;
  entity_id: string;
  doc_service_file_id: string;
  doc_service_url?: string;
  file_name: string;
  file_size?: number;
  file_type?: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDocumentRelationRequest {
  entity_type: string;
  entity_id: string;
  doc_service_file_id: string;
  doc_service_url?: string;
  file_name: string;
  file_size?: number;
  file_type?: string;
  description?: string;
  created_by: string;
}

export const docIntegrationApi = {
  async listDocuments(params?: { page?: number; page_size?: number }): Promise<ApiResponse<PaginatedResponse<DocumentRelation>>> {
    const response = await apiClient.get('/api/v1/documents', { params });
    return response.data;
  },

  async createDocument(data: CreateDocumentRelationRequest): Promise<ApiResponse<DocumentRelation>> {
    const response = await apiClient.post('/api/v1/documents', data);
    return response.data;
  },

  async getDocument(id: string): Promise<ApiResponse<DocumentRelation>> {
    const response = await apiClient.get(`/api/v1/documents/${id}`);
    return response.data;
  },

  async deleteDocument(id: string): Promise<ApiResponse<void>> {
    const response = await apiClient.delete(`/api/v1/documents/${id}`);
    return response.data;
  },

  async getEntityDocuments(entityType: string, entityId: string): Promise<ApiResponse<DocumentRelation[]>> {
    const response = await apiClient.get(`/api/v1/entities/${entityType}/${entityId}/documents`);
    return response.data;
  }
};

export const listDocuments = async (entityType?: string, entityId?: string) => {
  if (entityType && entityId) {
    return docIntegrationApi.getEntityDocuments(entityType, entityId);
  }
  return docIntegrationApi.listDocuments();
};

export const createDocumentRelation = (data: CreateDocumentRelationRequest) => {
  return docIntegrationApi.createDocument(data);
};

export const deleteDocumentRelation = (id: string) => {
  return docIntegrationApi.deleteDocument(id);
};
