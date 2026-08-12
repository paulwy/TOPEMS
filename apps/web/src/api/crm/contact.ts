import { apiClient } from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type {
  Contact,
  CreateContactRequest,
  UpdateContactRequest,
  ContactQueryParams,
} from './types';
import type { ApprovalStatus } from '@/schemas/crm';
import {
  toOpenApiParams,
  toOpenApiRequestBody,
  type AdaptedQuery,
  type AdaptedRequestBody,
  type TypedApiResponse,
  type TypedPaginatedResponse,
} from '@topems/shared-types';

export const contactApi = {
  list: async (
    params?: AdaptedQuery<'list_contacts'> | ContactQueryParams,
  ): Promise<TypedPaginatedResponse<Contact>> => {
    return apiClient.crm.get('/contacts', {
      params: params ? toOpenApiParams(params as Record<string, unknown>) : undefined,
    });
  },

  create: async (
    data: AdaptedRequestBody<'create_contact'> | CreateContactRequest,
  ): Promise<TypedApiResponse<Contact, 'create_contact'>> => {
    return apiClient.crm.post(
      '/contacts',
      toOpenApiRequestBody(data as Record<string, unknown>),
    );
  },

  get: async (id: string): Promise<ApiResponse<Contact>> => {
    return apiClient.crm.get(`/contacts/${id}`);
  },

  update: async (id: string, data: UpdateContactRequest): Promise<ApiResponse<Contact>> => {
    return apiClient.crm.put(`/contacts/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.crm.delete(`/contacts/${id}`);
  },

  batchDelete: async (ids: string[]): Promise<ApiResponse<void>> => {
    return apiClient.crm.post('/contacts/batch-delete', { ids });
  },

  startApproval: async (
    id: string,
    data: { workflowId: string; comment?: string },
  ): Promise<ApiResponse<{ contactId: string; workflowId: string; approvalStatus: ApprovalStatus }>> => {
    return apiClient.crm.post(
      `/contacts/${id}/approval/start`,
      toOpenApiRequestBody(data as Record<string, unknown>),
    );
  },

  approve: async (
    id: string,
    data?: { comment?: string },
  ): Promise<ApiResponse<{ contactId: string; approvalStatus: ApprovalStatus }>> => {
    return apiClient.crm.post(
      `/contacts/${id}/approval/approve`,
      data ? toOpenApiRequestBody(data as Record<string, unknown>) : {},
    );
  },

  reject: async (
    id: string,
    data?: { comment?: string; reason?: string },
  ): Promise<ApiResponse<{ contactId: string; approvalStatus: ApprovalStatus }>> => {
    return apiClient.crm.post(
      `/contacts/${id}/approval/reject`,
      data ? toOpenApiRequestBody(data as Record<string, unknown>) : {},
    );
  },
};

export default contactApi;
