import { connectionApi } from './connection';
import { mappingApi } from './mapping';
import { syncApi } from './sync';
import { syncLogsApi } from './syncLogs';
import { previewApi } from './preview';
import { exportApi } from './export';

export * from './types';

export { connectionApi } from './connection';
export { syncApi } from './sync';
export { exportApi } from './export';

export const externalErpApi = {
  connection: connectionApi,
  mapping: mappingApi,
  sync: syncApi,
  syncLogs: syncLogsApi,
  preview: previewApi,
  export: exportApi,

  getConnections: connectionApi.getConnections,
  getConnection: connectionApi.getConnection,
  createConnection: connectionApi.createConnection,
  updateConnection: connectionApi.updateConnection,
  deleteConnection: connectionApi.deleteConnection,
  toggleConnection: connectionApi.toggleConnection,
  testConnection: connectionApi.testConnection,
  syncConnectionStatus: connectionApi.syncConnectionStatus,

  getCompanyMappings: connectionApi.getCompanyMappings,
  addCompanyMapping: connectionApi.addCompanyMapping,
  updateCompanyMapping: connectionApi.updateCompanyMapping,
  deleteCompanyMapping: connectionApi.deleteCompanyMapping,

  getAccountMappings: mappingApi.getAccountMappings,
  importAccountMappings: mappingApi.importAccountMappings,
  updateAccountMapping: mappingApi.updateAccountMapping,
  deleteAccountMapping: mappingApi.deleteAccountMapping,
  autoMatchAccountMappings: mappingApi.autoMatchAccountMappings,

  getCustomerMappings: mappingApi.getCustomerMappings,
  importCustomerMappings: mappingApi.importCustomerMappings,
  updateCustomerMapping: mappingApi.updateCustomerMapping,
  deleteCustomerMapping: mappingApi.deleteCustomerMapping,

  getSupplierMappings: mappingApi.getSupplierMappings,
  importSupplierMappings: mappingApi.importSupplierMappings,
  updateSupplierMapping: mappingApi.updateSupplierMapping,
  deleteSupplierMapping: mappingApi.deleteSupplierMapping,

  getProjectMappings: mappingApi.getProjectMappings,
  importProjectMappings: mappingApi.importProjectMappings,
  updateProjectMapping: mappingApi.updateProjectMapping,
  deleteProjectMapping: mappingApi.deleteProjectMapping,

  getDepartmentMappings: mappingApi.getDepartmentMappings,
  importDepartmentMappings: mappingApi.importDepartmentMappings,
  updateDepartmentMapping: mappingApi.updateDepartmentMapping,
  deleteDepartmentMapping: mappingApi.deleteDepartmentMapping,

  getEmployeeMappings: mappingApi.getEmployeeMappings,
  importEmployeeMappings: mappingApi.importEmployeeMappings,
  updateEmployeeMapping: mappingApi.updateEmployeeMapping,
  deleteEmployeeMapping: mappingApi.deleteEmployeeMapping,

  syncAccounts: syncApi.syncAccounts,
  syncCustomers: syncApi.syncCustomers,
  syncSuppliers: syncApi.syncSuppliers,
  syncProjects: syncApi.syncProjects,
  syncDepartments: syncApi.syncDepartments,
  syncEmployees: syncApi.syncEmployees,
  syncVouchers: syncApi.syncVouchers,
  syncInvoices: syncApi.syncInvoices,
  fullSync: syncApi.fullSync,
  cancelSync: syncApi.cancelSync,

  getSyncLogs: syncLogsApi.getSyncLogs,
  getSyncLog: syncLogsApi.getSyncLog,
  getSyncStatistics: syncLogsApi.getSyncStatistics,

  previewExternalAccounts: previewApi.previewExternalAccounts,
  previewExternalCustomers: previewApi.previewExternalCustomers,
  previewExternalSuppliers: previewApi.previewExternalSuppliers,
  previewExternalVouchers: previewApi.previewExternalVouchers,

  exportSyncLogs: exportApi.exportSyncLogs,
  exportMappingRules: exportApi.exportMappingRules,
};

export default externalErpApi;
