import type { ApiResponse } from '../client';
import { userApi, roleApi, permissionApi, authModuleApi } from '../iam';
import type { User, Role, Permission, AccessLog } from '../iam/types';
import { tenantApi } from '../tenant';
import type { Tenant, TenantUser, TenantStats } from '../tenant/types';
import { dictTypeApi, dictItemApi, dbStructureApi } from '../system';
import type { DictType, DictItem, TableInfo, TableDetail } from '../system';
import { monitorApi } from '../monitor';
import type {
  SystemMetrics,
  ServiceHealth,
  ApiPerformance,
  DatabaseMetrics,
  Alert,
} from '../monitor';
import { migrationApi } from '../migration';
import type {
  MigrationService,
  MigrationStatus,
  MigrationApplyResult,
  RollbackResult,
} from '../migration';
import { systemSettingApi } from './systemSetting';
import { auditLogApi } from './auditLog';
import { permissionAuditApi } from './permissionAudit';
import { monitoringApi } from './monitoring';
import type { SystemSetting, SystemConfig, AuditLog, AuditLogQueryParams } from './types';

export * from './types';
export { systemSettingApi } from './systemSetting';
export { auditLogApi } from './auditLog';
export { permissionAuditApi } from './permissionAudit';
export { monitoringApi } from './monitoring';

export const adminApi = {
  users: userApi,
  roles: roleApi,
  permissions: permissionApi,
  auth: authModuleApi,
  tenants: tenantApi,
  dictTypes: dictTypeApi,
  dictItems: dictItemApi,
  dbStructure: dbStructureApi,
  monitor: monitorApi,
  migration: migrationApi,
  systemSettings: systemSettingApi,
  auditLogs: auditLogApi,
  permissionAudit: permissionAuditApi,
  monitoring: monitoringApi,

  listUsers: userApi.listUsers,
  getUser: userApi.getUser,
  createUser: userApi.createUser,
  updateUser: userApi.updateUser,
  deleteUser: userApi.deleteUser,
  batchDeleteUsers: userApi.batchDeleteUsers,
  batchUpdateUsers: userApi.batchUpdateUsers,
  getUserRoles: userApi.getUserRoles,
  addUserRole: userApi.addUserRole,
  removeUserRole: userApi.removeUserRole,
  getUserPermissions: userApi.getUserPermissions,
  getEffectivePermissions: userApi.getEffectivePermissions,
  checkEmailAvailability: userApi.checkEmailAvailability,
  checkUsernameAvailability: userApi.checkUsernameAvailability,
  getLoginHistory: userApi.getLoginHistory,

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

  listTenants: tenantApi.listTenants,
  getTenant: tenantApi.getTenant,
  createTenant: tenantApi.createTenant,
  updateTenant: tenantApi.updateTenant,
  deleteTenant: tenantApi.deleteTenant,
  activateTenant: tenantApi.activateTenant,
  suspendTenant: tenantApi.suspendTenant,
  getTenantUsers: tenantApi.getTenantUsers,
  inviteMember: tenantApi.inviteMember,
  removeMember: tenantApi.removeMember,
  updateMemberRole: tenantApi.updateMemberRole,
  getTenantStats: tenantApi.getTenantStats,
  getUsageMetrics: tenantApi.getUsageMetrics,
  getBillingInfo: tenantApi.getBillingInfo,
  getInvoices: tenantApi.getInvoices,

  listDictTypes: dictTypeApi.list,
  getDictType: dictTypeApi.get,
  createDictType: dictTypeApi.create,
  updateDictType: dictTypeApi.update,
  deleteDictType: dictTypeApi.delete,

  listDictItems: dictItemApi.list,
  getDictItem: dictItemApi.get,
  createDictItem: dictItemApi.create,
  updateDictItem: dictItemApi.update,
  deleteDictItem: dictItemApi.delete,
  batchCreateDictItems: dictItemApi.batchCreate,
  exportDictItems: dictItemApi.export,

  listDbTables: dbStructureApi.listTables,
  getTableDetail: dbStructureApi.getTableDetail,
  previewAddColumn: dbStructureApi.previewAddColumn,
  addColumn: dbStructureApi.addColumn,
  modifyColumn: dbStructureApi.modifyColumn,
  dropColumn: dbStructureApi.dropColumn,
  listDbChanges: dbStructureApi.listChanges,

  getSystemMetrics: monitorApi.getSystemMetrics,
  getServiceHealth: monitorApi.getServiceHealth,
  getApiPerformance: monitorApi.getApiPerformance,
  getDatabaseMetrics: monitorApi.getDatabaseMetrics,
  listAlerts: monitorApi.listAlerts,
  getAlert: monitorApi.getAlert,
  acknowledgeAlert: monitorApi.acknowledgeAlert,
  resolveAlert: monitorApi.resolveAlert,
  getPerformanceReport: monitorApi.getPerformanceReport,
  getRealtimeMetrics: monitorApi.getRealtimeMetrics,

  listMigrationServices: migrationApi.listServices,
  applyMigration: migrationApi.applyMigration,
  rollbackMigration: migrationApi.rollbackMigration,
  getMigrationStatus: migrationApi.getMigrationStatus,

  listSettings: systemSettingApi.listSettings,
  getSetting: systemSettingApi.getSetting,
  createSetting: systemSettingApi.createSetting,
  updateSetting: systemSettingApi.updateSetting,
  deleteSetting: systemSettingApi.deleteSetting,
  batchUpdateSettings: systemSettingApi.batchUpdateSettings,
  getSystemConfig: systemSettingApi.getSystemConfig,
  updateSystemConfig: systemSettingApi.updateSystemConfig,

  listAuditLogs: auditLogApi.listAuditLogs,
  getAuditLog: auditLogApi.getAuditLog,
  exportAuditLogs: auditLogApi.exportAuditLogs,
  getAuditLogStats: auditLogApi.getAuditLogStats,

  listAccessLogs: userApi.listAccessLogs,
  getUserAccessLogs: userApi.getUserAccessLogs,
  createAccessLog: userApi.createAccessLog,

  listPermissionChanges: permissionAuditApi.listPermissionChanges,
  getPermissionChange: permissionAuditApi.getPermissionChange,
  getPermissionChangeStats: permissionAuditApi.getPermissionChangeStats,
  exportPermissionChanges: permissionAuditApi.exportPermissionChanges,
  listAccessControlLogs: permissionAuditApi.listAccessLogs,
  getAccessControlLog: permissionAuditApi.getAccessLog,
  getAccessControlStats: permissionAuditApi.getAccessControlStats,
  exportAccessControlLogs: permissionAuditApi.exportAccessLogs,

  listMonitoringAlerts: monitoringApi.listAlerts,
  getMonitoringAlert: monitoringApi.getAlert,
  acknowledgeMonitoringAlert: monitoringApi.acknowledgeAlert,
  resolveMonitoringAlert: monitoringApi.resolveAlert,
  escalateMonitoringAlert: monitoringApi.escalateAlert,
  dismissMonitoringAlert: monitoringApi.dismissAlert,
  getAlertStats: monitoringApi.getAlertStats,
  exportMonitoringAlerts: monitoringApi.exportAlerts,
  listAlertRules: monitoringApi.listAlertRules,
  getAlertRule: monitoringApi.getAlertRule,
  createAlertRule: monitoringApi.createAlertRule,
  updateAlertRule: monitoringApi.updateAlertRule,
  deleteAlertRule: monitoringApi.deleteAlertRule,
  enableAlertRule: monitoringApi.enableAlertRule,
  disableAlertRule: monitoringApi.disableAlertRule,
  getSystemHealth: monitoringApi.getSystemHealth,
};

export default adminApi;
