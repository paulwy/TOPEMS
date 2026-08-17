import { apiClient } from '../client';
import type { ApiResponse } from '../client';

export interface CustomerProfileItem {
  id: string;
  name: string;
  code?: string;
  industry?: string;
  company_size?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  country?: string;
  status: string;
  customer_type?: string;
  source?: string;
  rating?: string;
  revenue?: number;
  employee_count?: number;
  created_at?: string;
  updated_at?: string;
  score?: CustomerScoreSummary;
  opportunities?: OpportunitySummary[];
  interactions?: InteractionSummary[];
  contacts?: ContactSummary[];
  profile_tags?: string[];
}

export interface CustomerScoreSummary {
  score: number;
  level?: string;
  last_evaluated?: string;
}

export interface OpportunitySummary {
  id: string;
  title: string;
  value?: number;
  stage: string;
  created_at?: string;
}

export interface InteractionSummary {
  id: string;
  type: string;
  summary?: string;
  created_at?: string;
}

export interface ContactSummary {
  id: string;
  name: string;
  position?: string;
  phone?: string;
  email?: string;
}

export interface CustomerProfileListQuery {
  page?: number;
  page_size?: number;
  status?: string;
  industry?: string;
  customer_type?: string;
  keyword?: string;
}

export const customerProfileApi = {
  async getCustomerProfile(id: string): Promise<ApiResponse<CustomerProfileItem>> {
    return apiClient.crm.get<CustomerProfileItem>(`/customers/${id}/profile`);
  },

  async listCustomerProfiles(
    params?: CustomerProfileListQuery
  ): Promise<ApiResponse<{ items: CustomerProfileItem[]; total: number }>> {
    const qs = new URLSearchParams();
    if (params?.page !== undefined) qs.set('page', String(params.page));
    if (params?.page_size !== undefined) qs.set('page_size', String(params.page_size));
    if (params?.status) qs.set('status', params.status);
    if (params?.industry) qs.set('industry', params.industry);
    if (params?.customer_type) qs.set('customer_type', params.customer_type);
    if (params?.keyword) qs.set('q', params.keyword);
    const s = qs.toString();
    return apiClient.crm.get<{ items: CustomerProfileItem[]; total: number }>(
      `/customer-profiles${s ? `?${s}` : ''}`
    );
  },

  async addProfileTags(customerId: string, tags: string[]): Promise<ApiResponse<void>> {
    return apiClient.crm.post<void>(`/customers/${customerId}/profile/tags`, { tags });
  },

  async removeProfileTags(customerId: string, tagIds: string[]): Promise<ApiResponse<void>> {
    const qs = tagIds.map((id) => `tag_ids[]=${encodeURIComponent(id)}`).join('&');
    return apiClient.crm.delete<void>(`/customers/${customerId}/profile/tags${qs ? `?${qs}` : ''}`);
  },
};
