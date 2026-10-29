import apiClient from '../client';
import type { ApiResponse } from '../client';

// ── v74 待确认-疑似接入 erp 28 条（2026-10-29）──
export const erpReadOps2 = {
  listDataDomains: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/erp/master-data/domains'),
  getArchiveRecord: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/erp/mdm-v49/get-archive-record'),
  classificationListCategories: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/erp/master-data/classification/categories'),
  queryRecords: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/erp/master-data-refs/query-records-handler'),
  listInferenceRules: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/erp/master-data/knowledge/inference-rules'),
  listDictItems: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/system/dict-types/{id}/items'),
  mdmServiceList: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/erp/master-data/services'),
  listComplianceRules: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/erp/master-data-refs/list-compliance-rules-handler'),
  listDepartmentsFromHrm: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/erp/hrm-integration-example/list-departments-from-hrm'),
  listCompaniesFromHrm: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/erp/hrm-integration-example/list-companies-from-hrm'),
  listArchiveRecords: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/mdm-v49/archive/records'),
  listConflicts: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/master-data-refs/conflicts'),
  listArchived: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/master-data-refs/archived'),
  listPendingDestruction: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/master-data-refs/pending-destruction'),
  listDataAssets: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/master-data-refs/governance/assets'),
  listConcepts: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/master-data/knowledge/concepts'),
  listTriples: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/master-data/knowledge/triples'),
  listInferenceRules2: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/master-data/knowledge/inference-rules'),
  mdmServiceList2: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/master-data/services'),
  classificationListCategories2: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/master-data/classification/categories'),
  proxyListDepartments2: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/hr/departments'),
  proxyListCompanies2: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/hr/companies'),
  proxyListPayrolls2: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/hr/payrolls'),
  listDepartmentsFromHrm2: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/example/departments'),
  listCompaniesFromHrm2: async (): Promise<ApiResponse<Record<string, unknown>>> =>
    apiClient.erp.get('/example/companies'),
};
