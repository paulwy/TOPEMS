export * from './types';

import {
  listDataModels,
  getDataModel,
  createDataModel,
  updateDataModel,
  deleteDataModel,
  addField,
  updateField,
  deleteField,
  addRelation,
  deleteRelation,
  getDataPreview,
  publishModel,
} from './dataModel';

import {
  listApps,
  getApp,
  createApp,
  updateApp,
  deleteApp,
  getAppVersions,
  publishApp,
  getAppOverview,
} from './app';

import {
  listDataSources,
  getDataSource,
  createDataSource,
  updateDataSource,
  deleteDataSource,
  testDataSource,
  listTables,
  getTableInfo,
} from './dataSource';

import {
  listWorkflows,
  getWorkflow,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  publishWorkflow,
} from './workflow';

import {
  listRolePermissions,
  getRolePermission,
  updateRolePermissions,
  listDataPermissions,
  listFieldPermissions,
  updateFieldPermission,
} from './permission';

import { formApi } from './form';
import { pageApi } from './page';
import { componentApi, formComponentCategories, pageComponentCategories } from './component';

export {
  listDataModels,
  getDataModel,
  createDataModel,
  updateDataModel,
  deleteDataModel,
  addField,
  updateField,
  deleteField,
  addRelation,
  deleteRelation,
  getDataPreview,
  publishModel,
} from './dataModel';

export {
  listApps,
  getApp,
  createApp,
  updateApp,
  deleteApp,
  getAppVersions,
  publishApp,
  getAppOverview,
} from './app';

export {
  listDataSources,
  getDataSource,
  createDataSource,
  updateDataSource,
  deleteDataSource,
  testDataSource,
  listTables,
  getTableInfo,
} from './dataSource';

export {
  listWorkflows,
  getWorkflow,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  publishWorkflow,
} from './workflow';

export {
  listRolePermissions,
  getRolePermission,
  updateRolePermissions,
  listDataPermissions,
  listFieldPermissions,
  updateFieldPermission,
} from './permission';

export { formApi } from './form';
export { pageApi } from './page';
export { componentApi, formComponentCategories, pageComponentCategories } from './component';

export const lowcodeApi = {
  listDataModels,
  getDataModel,
  createDataModel,
  updateDataModel,
  deleteDataModel,
  addField,
  updateField,
  deleteField,
  addRelation,
  deleteRelation,
  getDataPreview,
  publishModel,
  listApps,
  getApp,
  createApp,
  updateApp,
  deleteApp,
  getAppVersions,
  publishApp,
  getAppOverview,
  listDataSources,
  getDataSource,
  createDataSource,
  updateDataSource,
  deleteDataSource,
  testDataSource,
  listTables,
  getTableInfo,
  listWorkflows,
  getWorkflow,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  publishWorkflow,
  listRolePermissions,
  getRolePermission,
  updateRolePermissions,
  listDataPermissions,
  listFieldPermissions,
  updateFieldPermission,
  formApi,
  pageApi,
  componentApi,
};

export default lowcodeApi;
