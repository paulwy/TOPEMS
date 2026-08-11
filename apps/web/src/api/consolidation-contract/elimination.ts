import { apiClient } from '../client';
import type { ApiResponse } from '../client';
import type {
  EliminationRule,
  CreateEliminationRuleRequest,
  UpdateEliminationRuleRequest,
  EliminationRuleQuery,
  ConsolidationPaginatedResponse,
} from './types';

export const eliminationRuleApi = {
  list: (query: EliminationRuleQuery): Promise<ConsolidationPaginatedResponse<EliminationRule>> => {
    return apiClient.erp.get('/consolidation/elimination-rules', { params: query });
  },

  get: (ruleId: string): Promise<ApiResponse<EliminationRule>> => {
    return apiClient.erp.get(`/consolidation/elimination-rules/${ruleId}`);
  },

  create: (data: CreateEliminationRuleRequest): Promise<ApiResponse<EliminationRule>> => {
    return apiClient.erp.post('/consolidation/elimination-rules', data);
  },

  update: (ruleId: string, data: UpdateEliminationRuleRequest): Promise<ApiResponse<EliminationRule>> => {
    return apiClient.erp.put(`/consolidation/elimination-rules/${ruleId}`, data);
  },

  delete: (ruleId: string): Promise<ApiResponse<void>> => {
    return apiClient.erp.delete(`/consolidation/elimination-rules/${ruleId}`);
  },
};

export default eliminationRuleApi;