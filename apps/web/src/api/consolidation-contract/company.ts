import { apiClient } from '../client';
import type { ApiResponse } from '../client';
import type {
  CompanyRelation,
  CreateCompanyRelationRequest,
  UpdateCompanyRelationRequest,
  CompanyRelationQuery,
  CompanyTreeNode,
  CompanyFinancialData,
  ConsolidationPaginatedResponse,
} from './types';

export const companyRelationApi = {
  list: (query?: CompanyRelationQuery): Promise<ConsolidationPaginatedResponse<CompanyRelation>> => {
    return apiClient.erp.get('/consolidation/company-relations', { params: query });
  },

  getTree: (): Promise<ApiResponse<CompanyTreeNode>> => {
    return apiClient.erp.get('/consolidation/company-tree');
  },

  create: (data: CreateCompanyRelationRequest): Promise<ApiResponse<CompanyRelation>> => {
    return apiClient.erp.post('/consolidation/company-relations', data);
  },

  update: (relationId: string, data: UpdateCompanyRelationRequest): Promise<ApiResponse<CompanyRelation>> => {
    return apiClient.erp.put(`/consolidation/company-relations/${relationId}`, data);
  },

  delete: (relationId: string): Promise<ApiResponse<void>> => {
    return apiClient.erp.delete(`/consolidation/company-relations/${relationId}`);
  },

  getFinancialData: (companyId: string, period: string): Promise<ApiResponse<CompanyFinancialData>> => {
    return apiClient.erp.get(`/consolidation/companies/${companyId}/financial-data`, {
      params: { period },
    });
  },
};

export default companyRelationApi;