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
  token: string;
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
