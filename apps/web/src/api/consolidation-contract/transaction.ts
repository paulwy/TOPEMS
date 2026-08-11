import { apiClient } from '../client';
import type { ApiResponse } from '../client';
import type {
  InternalTransaction,
  InternalTransactionQuery,
  ExecuteEliminationRequest,
  ExecuteEliminationResult,
  ConsolidationPaginatedResponse,
} from './types';

export const internalTransactionApi = {
  list: (query?: InternalTransactionQuery): Promise<ConsolidationPaginatedResponse<InternalTransaction>> => {
    return apiClient.erp.get('/consolidation/internal-transactions', { params: query });
  },

  get: (transactionId: string): Promise<ApiResponse<InternalTransaction>> => {
    return apiClient.erp.get(`/consolidation/internal-transactions/${transactionId}`);
  },

  executeElimination: (data: ExecuteEliminationRequest): Promise<ApiResponse<ExecuteEliminationResult>> => {
    return apiClient.erp.post('/consolidation/execute-elimination', data);
  },
};

export default internalTransactionApi;