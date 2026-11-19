import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { Permission } from './types';

export const permissionApi = {
  listPermissions: async (): Promise<ApiResponse<Permission[]>> => {
    // 平台管理员得到全量，租户管理员只得到自身可授予集合；避免租户侧调用
    // 平台专属的 /permissions 被 403 后角色授权抽屉不可用。
    return apiClient.iam.get<Permission[]>('/permissions/grantable');
  },

  // 权限定义为迁移种子数据：后端 PUT/DELETE /permissions/{id} 与 POST /permissions 固定 501
  // （见 svc/unified-core/src/modules/iam/permission.rs:183-210），前端不暴露写方法。
};

export default permissionApi;
