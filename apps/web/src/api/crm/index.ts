import { apiClient } from '../client';
import type { ApiResponse } from '../client';

import { crmDashboardApi } from './dashboard';
import { customerApi, tagApi } from './customer';
import { contactApi } from './contact';
import { opportunityApi } from './opportunity';
import { interactionApi } from './interaction';
import { customerScoringApi } from './scoring';
import { salesForecastApi } from './forecast';
import { billingApi } from './billing';
import { customerSegmentationApi, customerRecommendationApi } from './segmentation';
import { returnsApi } from './returns';
import { crmAuditApi } from './crmAudit';
import { salesFunnelApi } from './salesFunnel';
import { customerProfileApi } from './customerProfile';

export * from './types';

export { customerApi, tagApi } from './customer';
export { crmDashboardApi } from './dashboard';
export { contactApi } from './contact';
export { opportunityApi } from './opportunity';
export { interactionApi } from './interaction';
export { customerScoringApi } from './scoring';
export { salesForecastApi } from './forecast';
export { billingApi } from './billing';
export { customerSegmentationApi, customerRecommendationApi } from './segmentation';
export { returnsApi } from './returns';
export { crmAuditApi } from './crmAudit';
export { salesFunnelApi } from './salesFunnel';
export { customerProfileApi } from './customerProfile';

export const crmApi = {
  dashboard: crmDashboardApi,
  customers: customerApi,
  tags: tagApi,
  contacts: contactApi,
  opportunities: opportunityApi,
  interactions: interactionApi,
  customerScoring: customerScoringApi,
  salesForecast: salesForecastApi,
  billing: billingApi,
  customerSegmentation: customerSegmentationApi,
  customerRecommendation: customerRecommendationApi,
  returns: returnsApi,
  audit: crmAuditApi,
  salesFunnel: salesFunnelApi,
  customerProfile: customerProfileApi,

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.crm.get('/health');
  },
};

export default crmApi;
