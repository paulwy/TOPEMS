import type { IamTypes } from '@topems/shared-types';

// ============================================================================
// OpenAPI 生成类型别名（试点）
// ============================================================================
// 当前策略：保留手写类型作为主类型，生成类型作为参考
// 后续待 OpenAPI 规范完善后，可逐步替换手写类型
//
// 已知差异：
// 1. 生成类型字段全可选（openapi-typescript 默认行为）
// 2. User 字段命名差异：生成类型用 isActive，手写类型用 isactive
// 3. User 生成类型缺少多租户相关字段（tenant_id/tenants/current_tenant_id）
// 4. Role 生成类型有 code 字段，手写类型（旧版）暂无
// 5. Permission 生成类型用 module 字段，手写类型用 category 字段

export type GeneratedUser = IamTypes.User;
export type GeneratedRole = IamTypes.Role;
export type GeneratedPermission = IamTypes.Permission;

// ============================================================================
// 适配类型：将生成类型字段重映射到手写命名（任务 2）
// ============================================================================
// 通过 Omit + 交叉类型，把生成类型的字段名重映射为手写类型使用的命名，
// 这样业务代码可继续使用 isactive / category，而类型源真相仍来自生成类型。
// 注意：生成类型字段全可选，因此适配类型字段也全可选；手写类型仍作为
// 主类型保留必填字段约束，适配类型用于新代码或与后端对接时。

/** 生成类型 User 的字段重映射：isActive → isactive */
export type AdaptedUser = Omit<IamTypes.User, 'isActive'> & {
  isactive?: IamTypes.User['isActive'];
};

/** 生成类型 Permission 的字段重映射：module → category */
export type AdaptedPermission = Omit<IamTypes.Permission, 'module'> & {
  category?: IamTypes.Permission['module'];
};

// ============================================================================
// 字段适配函数：生成类型实例 → 手写类型实例
// ============================================================================

/**
 * 将生成类型 User（含 isActive）转换为手写命名（含 isactive）。
 * 用于从后端响应到前端业务类型的边界转换。
 */
export const adaptUserFromGenerated = (generated: IamTypes.User): AdaptedUser => {
  // 显式剔除 isActive，映射到 isactive
  const { isActive, ...rest } = generated;
  return {
    ...rest,
    isactive: isActive,
  };
};

/**
 * 将生成类型 Permission（含 module）转换为手写命名（含 category）。
 */
export const adaptPermissionFromGenerated = (generated: IamTypes.Permission): AdaptedPermission => {
  const { module, ...rest } = generated;
  return {
    ...rest,
    category: module,
  };
};

/**
 * 将手写命名 User（含 isactive）转换为生成类型（含 isActive）。
 * 用于向前端发送请求时，将业务字段名映射回后端字段名。
 */
export const adaptUserToGenerated = (
  user: Pick<AdaptedUser, 'isactive'> & Omit<AdaptedUser, 'isactive'>
): IamTypes.User => {
  const { isactive, ...rest } = user;
  return {
    ...rest,
    isActive: isactive,
  };
};

// ============================================================================
// 手写类型（当前主类型）
// ============================================================================

export interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  role?: string;
  roles?: string[];
  permissions?: string[];
  created_at: string;
  isactive: boolean;
  is_superuser?: boolean;
  avatar_url?: string;
  tenant_id?: string;
  tenants?: UserTenantInfo[];
  current_tenant_id?: string;
}

export interface UserTenantInfo {
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  role: string;
  status: string;
  joined_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface LoginResponseData {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface RefreshTokenResponseData {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
  username: string;
  is_superuser: boolean;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface Permission {
  id: string;
  name: string;
  code: string;
  category: string;
  description?: string;
  resource?: string;
  action?: string;
}

export interface UserPreferences {
  notification_settings: NotificationSettings;
  shortcuts: ShortcutItem[];
  language: string;
  timezone: string;
}

export interface NotificationSettings {
  email_enabled: boolean;
  system_enabled: boolean;
  workflow_enabled: boolean;
  document_enabled: boolean;
  security_enabled: boolean;
}

export interface ShortcutItem {
  id: string;
  title: string;
  path: string;
  icon?: string;
}

export interface UserWithPermissions {
  user: User;
  roles: Role[];
  permissions: Permission[];
}

export interface PermissionCheckRequest {
  permission: string;
}

export interface PermissionCheckResponse {
  allowed: boolean;
  permission: string;
  user_id: string;
  username: string;
}

export interface AccessLog {
  id: string;
  user_id: string;
  username: string;
  action: string;
  resource: string;
  resource_id?: string;
  ip_address?: string;
  user_agent?: string;
  success: boolean;
  error_message?: string;
  created_at: string;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface SetNewPasswordRequest {
  reset_token: string;
  new_password: string;
}

export interface BatchOperationRequest {
  user_ids: string[];
}

export interface BatchDeleteResponse {
  deleted_count: number;
  failed_ids: string[];
}

export interface BatchUpdateUsersRequest {
  user_ids: string[];
  isactive?: boolean;
}

export interface CreateAccessLogRequest {
  user_id: string;
  username: string;
  action: string;
  resource: string;
  resource_id?: string;
  ip_address?: string;
  user_agent?: string;
  success: boolean;
  error_message?: string;
}

export interface CreatePermissionRequest {
  name: string;
  code: string;
  category: string;
  module: string;
  description?: string;
}

export interface UpdatePermissionRequest {
  name?: string;
  description?: string;
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
}

export interface UpdateUserRequest {
  full_name?: string;
  email?: string;
  isactive?: boolean;
}
