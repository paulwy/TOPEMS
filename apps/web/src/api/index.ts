/**
 * API Module - Unified Barrel Export
 *
 * 本文件作为整个 API 模块的统一入口，汇聚所有子模块导出。
 * 使用方式：
 *   import { apiClient, useApi, authApi } from '@/api';
 *   import type { ApiResponse } from '@/api';
 */

// Core client and types
export { apiClient, downloadBlob, createBaseAxiosClient } from './client';
export type { ApiResponse, PaginatedResponse, PaginationParams } from './client';

// Request utilities
export { handleResponse, safeRequest, paginatedRequest, handleRequestError } from './client';
export type { RequestOptions, PaginatedRequestParams } from './client';

// Permission interceptor
export { createPermissionInterceptor } from './permissionInterceptor';

// Domain modules - Business APIs
export { authApi, iamApi } from './iam';
export { adminApi } from './admin';
export { crmApi } from './crm';
export { hrmApi } from './hrm';
export { scmApi } from './scm';
export { wmsApi } from './wms';
export { mesApi } from './mes';
export { qmsApi } from './qms';
export { limsApi } from './lims';
export { ehsApi } from './ehs';
export { pdmApi } from './pdm';
export { pmApi } from './pm';
export { biApi } from './bi';
export { erpApi } from './erp';
export { rdApi } from './rd';
export { gisApi } from './gis';
export { srmApi } from './srm';
export { searchApi } from './search';
export { ticketApi } from './ticket';
export { tenantApi } from './tenant';
export { addressbookApi } from './addressbook';
export { crmFinanceApi } from './crmFinance';
export { financialReportApi } from './financialReport';
export { templateApi } from './template';
export { integrationApi } from './integration';
export { automationApi } from './automation';
export { externalErpApi } from './external-erp';
export { lowcodeApi } from './lowcode';
export { consolidationContractApi as consolidationContract } from './consolidation-contract';
export * as consolidationApi from './consolidation';

// Domain modules - Platform APIs
export * as aiApi from './ai';
export * as docApi from './doc';
export * as fileApi from './file';
export * as mailApi from './mail';
export * as emailApi from './email';
export * as imApi from './im';
export * as notificationApi from './notification';
export * as workflowApi from './workflow';
export * as systemApi from './system';
export * as mobileApi from './mobile';
export * as monitorApi from './monitor';
export * as reportApi from './report';
export * as migrationApi from './migration';
export * as financeApi from './finance';
export { helpApi } from './help';
export { feedbackApi } from './feedback';

// V33.0/V34.0 Portal BFF 聚合 API
export {
  bffApi,
  bffGraphQL,
  getDashboard,
  completeTodoGql,
  subscribeServiceHealth,
  masterDataApi,
} from './bff';
export type { ServiceStats, UnifiedTodo, MasterDataRef } from './bff';

// Plugin system
export * as pluginApi from './plugin';
