/**
 * Features - Auth
 *
 * 认证 / 权限 / 角色 / 组织
 */

export { useAuth, AuthProvider } from '../../useAuth';
export type { User } from '../../useAuth';
export type { AuthState, LoginCredentials } from '../../useAuth';

export { usePermission } from '../../usePermission';

export { usePermissionCheck } from '../../usePermissionCheck';

export { useRole } from '../../useRole';
export type { Role } from '../../useRole';

export { useOrganization } from '../../useOrganization';
export type { OrganizationData, UseOrganizationReturn } from '../../useOrganization';
