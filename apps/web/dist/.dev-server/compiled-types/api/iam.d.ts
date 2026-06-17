import type { ApiResponse } from "./client";
export interface User {
    id: string;
    username: string;
    email: string;
    full_name?: string;
    role?: string;
    roles?: string[];
    permissions?: string[];
    created_at: string;
    is_active: boolean;
    is_superuser?: boolean;
    avatar_url?: string;
}
export interface AuthTokens {
    access_token: string;
    refresh_token?: string;
    token_type: string;
    expires_in: number;
    user: User;
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
    is_active?: boolean;
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
    is_active?: boolean;
}
export declare const authApi: {
    register: (data: {
        username: string;
        email: string;
        password: string;
        full_name?: string;
    }) => Promise<ApiResponse<AuthTokens>>;
    login: (data: {
        username: string;
        password: string;
    }) => Promise<ApiResponse<any>>;
    logout: () => Promise<void>;
    getCurrentUser: () => Promise<ApiResponse<User>>;
    getMyPermissions: () => Promise<ApiResponse<UserWithPermissions>>;
    checkPermission: (permission: string) => Promise<ApiResponse<PermissionCheckResponse>>;
    refreshToken: (token: string) => Promise<ApiResponse<any>>;
    health: () => Promise<ApiResponse<string>>;
    listRoles: () => Promise<ApiResponse<Role[]>>;
    getRole: (id: string) => Promise<ApiResponse<Role>>;
    createRole: (data: {
        name: string;
        description?: string;
    }) => Promise<ApiResponse<Role>>;
    updateRole: (roleId: string, data: UpdateRoleRequest) => Promise<ApiResponse<Role>>;
    deleteRole: (id: string) => Promise<ApiResponse<string>>;
    getRolePermissions: (roleId: string) => Promise<ApiResponse<Permission[]>>;
    addRolePermission: (roleId: string, permissionId: string) => Promise<ApiResponse<string>>;
    removeRolePermission: (roleId: string, permissionId: string) => Promise<ApiResponse<string>>;
    listPermissions: () => Promise<ApiResponse<Permission[]>>;
    createPermission: (data: CreatePermissionRequest) => Promise<ApiResponse<Permission>>;
    updatePermission: (permissionId: string, data: UpdatePermissionRequest) => Promise<ApiResponse<Permission>>;
    deletePermission: (permissionId: string) => Promise<ApiResponse<string>>;
    getUserPermissions: (userId: string) => Promise<ApiResponse<UserWithPermissions>>;
    getUserRoles: (userId: string) => Promise<ApiResponse<any[]>>;
    addUserRole: (userId: string, roleId: string) => Promise<ApiResponse<string>>;
    removeUserRole: (userId: string, roleId: string) => Promise<ApiResponse<string>>;
    listAccessLogs: (limit?: number, offset?: number) => Promise<ApiResponse<AccessLog[]>>;
    getUserAccessLogs: (userId: string, limit?: number, offset?: number) => Promise<ApiResponse<AccessLog[]>>;
    createAccessLog: (data: CreateAccessLogRequest) => Promise<ApiResponse<AccessLog>>;
    listUsers: (params?: {
        page?: number;
        page_size?: number;
        search?: string;
    }) => Promise<ApiResponse<{
        users: User[];
        total: number;
    }>>;
    getUser: (userId: string) => Promise<ApiResponse<User>>;
    updateUser: (userId: string, data: UpdateUserRequest) => Promise<ApiResponse<User>>;
    updateCurrentUser: (data: {
        full_name?: string;
        email?: string;
    }) => Promise<ApiResponse<User>>;
    changePassword: (data: {
        current_password: string;
        new_password: string;
    }) => Promise<ApiResponse<string>>;
    updateAvatar: (data: {
        avatar_url: string;
    }) => Promise<ApiResponse<User>>;
    getPreferences: () => Promise<ApiResponse<UserPreferences>>;
    updatePreferences: (data: {
        notification_settings?: NotificationSettings;
        shortcuts?: ShortcutItem[];
        language?: string;
        timezone?: string;
    }) => Promise<ApiResponse<UserPreferences>>;
    deleteUser: (userId: string) => Promise<ApiResponse<string>>;
    createUser: (data: {
        username: string;
        email: string;
        password: string;
        full_name?: string;
    }) => Promise<ApiResponse<User>>;
    requestPasswordReset: (data: ResetPasswordRequest) => Promise<ApiResponse<string>>;
    confirmPasswordReset: (data: SetNewPasswordRequest) => Promise<ApiResponse<string>>;
    getEffectivePermissions: (userId: string) => Promise<ApiResponse<{
        direct_permissions: Permission[];
        role_permissions: Permission[];
        all_permissions: Permission[];
        total: number;
    }>>;
    batchDeleteUsers: (data: BatchOperationRequest) => Promise<ApiResponse<BatchDeleteResponse>>;
    batchUpdateUsers: (data: BatchUpdateUsersRequest) => Promise<ApiResponse<{
        updated_count: number;
    }>>;
    checkEmailAvailability: (email: string) => Promise<ApiResponse<{
        available: boolean;
    }>>;
    checkUsernameAvailability: (username: string) => Promise<ApiResponse<{
        available: boolean;
    }>>;
    getPasswordPolicy: () => Promise<ApiResponse<{
        min_length: number;
        require_uppercase: boolean;
        require_lowercase: boolean;
        require_numbers: boolean;
        require_special: boolean;
        max_age_days: number;
        prevent_reuse: number;
    }>>;
    updatePasswordPolicy: (data: {
        min_length?: number;
        require_uppercase?: boolean;
        require_lowercase?: boolean;
        require_numbers?: boolean;
        require_special?: boolean;
        max_age_days?: number;
        prevent_reuse?: number;
    }) => Promise<ApiResponse<any>>;
    getLoginHistory: (userId: string, limit?: number) => Promise<ApiResponse<{
        logs: Array<{
            id: string;
            ip_address: string;
            user_agent: string;
            success: boolean;
            created_at: string;
        }>;
        total: number;
    }>>;
    getActiveSessions: () => Promise<ApiResponse<{
        sessions: Array<{
            id: string;
            ip_address: string;
            user_agent: string;
            created_at: string;
            expires_at: string;
            is_current: boolean;
        }>;
        total: number;
    }>>;
    revokeSession: (sessionId: string) => Promise<ApiResponse<string>>;
    revokeAllOtherSessions: () => Promise<ApiResponse<{
        revoked_count: number;
    }>>;
    getSecuritySettings: () => Promise<ApiResponse<{
        mfa_enabled: boolean;
        login_alerts: boolean;
        ip_whitelist: string[];
        session_timeout_minutes: number;
    }>>;
    updateSecuritySettings: (data: {
        mfa_enabled?: boolean;
        login_alerts?: boolean;
        ip_whitelist?: string[];
        session_timeout_minutes?: number;
    }) => Promise<ApiResponse<any>>;
};
