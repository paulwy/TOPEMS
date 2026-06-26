export * from './types';

export { authModuleApi } from './auth';
export { userApi } from './user';
export { roleApi } from './role';
export { permissionApi } from './permission';

import { authModuleApi } from './auth';
import { userApi } from './user';
import { roleApi } from './role';
import { permissionApi } from './permission';

export const authApi = {
  auth: authModuleApi,
  users: userApi,
  roles: roleApi,
  permissions: permissionApi,

  register: authModuleApi.register,
  login: authModuleApi.login,
  logout: authModuleApi.logout,
  getCurrentUser: userApi.getCurrentUser,
  getMyPermissions: userApi.getMyPermissions,
  checkPermission: userApi.checkPermission,
  refreshToken: authModuleApi.refreshToken,
  health: authModuleApi.health,
  listRoles: roleApi.listRoles,
  getRole: roleApi.getRole,
  createRole: roleApi.createRole,
  updateRole: roleApi.updateRole,
  deleteRole: roleApi.deleteRole,
  getRolePermissions: roleApi.getRolePermissions,
  addRolePermission: roleApi.addRolePermission,
  removeRolePermission: roleApi.removeRolePermission,
  listPermissions: permissionApi.listPermissions,
  createPermission: permissionApi.createPermission,
  updatePermission: permissionApi.updatePermission,
  deletePermission: permissionApi.deletePermission,
  getUserPermissions: userApi.getUserPermissions,
  getUserRoles: userApi.getUserRoles,
  addUserRole: userApi.addUserRole,
  removeUserRole: userApi.removeUserRole,
  listAccessLogs: userApi.listAccessLogs,
  getUserAccessLogs: userApi.getUserAccessLogs,
  createAccessLog: userApi.createAccessLog,
  listUsers: userApi.listUsers,
  getUser: userApi.getUser,
  updateUser: userApi.updateUser,
  updateCurrentUser: userApi.updateCurrentUser,
  changePassword: userApi.changePassword,
  updateAvatar: userApi.updateAvatar,
  getPreferences: userApi.getPreferences,
  updatePreferences: userApi.updatePreferences,
  deleteUser: userApi.deleteUser,
  createUser: userApi.createUser,
  requestPasswordReset: authModuleApi.requestPasswordReset,
  confirmPasswordReset: authModuleApi.confirmPasswordReset,
  getEffectivePermissions: userApi.getEffectivePermissions,
  batchDeleteUsers: userApi.batchDeleteUsers,
  batchUpdateUsers: userApi.batchUpdateUsers,
  checkEmailAvailability: userApi.checkEmailAvailability,
  checkUsernameAvailability: userApi.checkUsernameAvailability,
  getPasswordPolicy: authModuleApi.getPasswordPolicy,
  updatePasswordPolicy: authModuleApi.updatePasswordPolicy,
  getLoginHistory: userApi.getLoginHistory,
  getActiveSessions: authModuleApi.getActiveSessions,
  revokeSession: authModuleApi.revokeSession,
  revokeAllOtherSessions: authModuleApi.revokeAllOtherSessions,
  getSecuritySettings: authModuleApi.getSecuritySettings,
  updateSecuritySettings: authModuleApi.updateSecuritySettings,
};

export const iamApi = authApi;

export default authApi;
