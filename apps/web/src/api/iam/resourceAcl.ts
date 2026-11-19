import apiClient from '../client';
import type { ApiResponse } from '../client';

// 资源级 ACL 只读查询（契约见 docs/api/API_IAM_RESOURCE_ACL_READ_DRAFT.md）

export type ResourceAclSubjectType = 'role' | 'user';
export type ResourceAclEffect = 'allow' | 'deny';
export type ResourceAclScope = 'platform' | 'tenant';

export interface ResourceAclItem {
  id: string;
  resource_type: string;
  resource_id: string | null;
  subject_type: ResourceAclSubjectType;
  subject_id: string;
  subject_name: string | null;
  permission: string;
  effect: ResourceAclEffect;
  scope: ResourceAclScope;
  tenant_id: string | null;
  tenant_name: string | null;
  created_at: string;
}

export interface ResourceAclListQuery {
  page?: number;
  page_size?: number;
  resource_type?: string;
  resource_id?: string;
  permission?: string;
  effect?: ResourceAclEffect;
  scope?: ResourceAclScope;
  tenant_id?: string;
  subject_type?: ResourceAclSubjectType;
}

export interface ResourceAclListData {
  items: ResourceAclItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// 空串表示「不过滤」，不向后端发送空参数
const toParams = (query: ResourceAclListQuery): Record<string, string | number> => {
  const params: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params[key] = value;
  }
  return params;
};

export const resourceAclApi = {
  listRoleResourcePermissions: async (
    roleId: string,
    query: ResourceAclListQuery = {}
  ): Promise<ApiResponse<ResourceAclListData>> => {
    return apiClient.iam.get<ResourceAclListData>(`/roles/${roleId}/resource-permissions`, {
      params: toParams(query),
    });
  },

  listUserResourcePermissions: async (
    userId: string,
    query: ResourceAclListQuery = {}
  ): Promise<ApiResponse<ResourceAclListData>> => {
    return apiClient.iam.get<ResourceAclListData>(`/users/${userId}/resource-permissions`, {
      params: toParams(query),
    });
  },

  listResourcePermissions: async (
    query: ResourceAclListQuery & { resource_type: string; resource_id: string }
  ): Promise<ApiResponse<ResourceAclListData>> => {
    return apiClient.iam.get<ResourceAclListData>('/resource-permissions', {
      params: toParams(query),
    });
  },
};

export default resourceAclApi;
