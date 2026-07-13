import apiClient from '../client';
import type { ApiResponse } from '../client';
import type {
  QualityImprovement,
  CorrectiveActionBackend,
  ActionItem,
  ActionItemBackend,
} from './types';
import { adaptActionToFrontend, adaptActionItemToFrontend } from './adapters';

export const correctiveActionApi = {
  completeAction: async (
    id: string,
    data: { verificationResult?: string; verifiedBy?: string; remark?: string }
  ): Promise<ApiResponse<QualityImprovement>> => {
    const response = await apiClient.qms.post<CorrectiveActionBackend>(`/actions/${id}/complete`, {
      verification_result: data.verificationResult,
      verified_by: data.verifiedBy,
      remark: data.remark,
    });
    return {
      ...response,
      data: response.data ? adaptActionToFrontend(response.data) : ({} as QualityImprovement),
    };
  },

  getActionItems: async (actionId: string): Promise<ApiResponse<ActionItem[]>> => {
    const response = await apiClient.qms.get<{ items?: ActionItemBackend[] }>(
      `/actions/${actionId}/items`
    );
    const adaptedData = (response.data?.items || []).map(adaptActionItemToFrontend);
    return { ...response, data: adaptedData };
  },
};
