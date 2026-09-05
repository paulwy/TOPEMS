import type { PdmDocument } from './document';
import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface ApprovalRecord {
  id: string;
  document_id: string;
  action: 'created' | 'submitted' | 'approved' | 'rejected' | 'commented';
  approver_id?: string;
  approver_name?: string;
  comment?: string;
  created_at: string;
}

export const documentApprovalApi = {
  listPendingApproval: (params?: {
    page?: number;
    pagesize?: number;
    type?: string;
  }): Promise<
    ApiResponse<Pick<PdmDocument, 'id' | 'document_no' | 'name' | 'type' | 'status' | 'created_at'>>
  > => {
    return apiClient.pdm.get('/documents/pending-approval', { params });
  },

  getApprovalHistory: (documentId: string): Promise<ApiResponse<ApprovalRecord[]>> => {
    return apiClient.pdm.get(`/documents/${documentId}/approval-history`);
  },

  approveDocument: (
    documentId: string,
    data?: { comment?: string }
  ): Promise<ApiResponse<PdmDocument>> => {
    return apiClient.pdm.post(`/documents/${documentId}/approve`, data || {});
  },
};

export default documentApprovalApi;
