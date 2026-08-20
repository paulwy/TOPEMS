/* FE_ROUTES_JSON
[
  ["GET","/crm/customers"],["POST","/crm/customers"],
  ["GET","/crm/customers/:id"],["PUT","/crm/customers/:id"],["DELETE","/crm/customers/:id"],
  ["POST","/crm/customers/batch-delete"],
  ["POST","/crm/customers/:id/approval/start"],
  ["POST","/crm/customers/:id/approval/approve"],
  ["POST","/crm/customers/:id/approval/reject"],
  ["GET","/crm/contacts"],["POST","/crm/contacts"],
  ["GET","/crm/contacts/:id"],["PUT","/crm/contacts/:id"],["DELETE","/crm/contacts/:id"],
  ["POST","/crm/contacts/batch-delete"],
  ["POST","/crm/contacts/:id/approval/start"],
  ["POST","/crm/contacts/:id/approval/approve"],
  ["POST","/crm/contacts/:id/approval/reject"],
  ["GET","/crm/opportunities"],["POST","/crm/opportunities"],
  ["GET","/crm/opportunities/:id"],["PUT","/crm/opportunities/:id"],["DELETE","/crm/opportunities/:id"],
  ["POST","/crm/opportunities/batch-delete"],
  ["POST","/crm/opportunities/:id/advance"],
  ["POST","/crm/opportunities/:id/rollback"],
  ["GET","/crm/opportunities/funnel"],
  ["GET","/crm/opportunities/stats"],
  ["GET","/crm/opportunities/forecast"],
  ["GET","/crm/interactions"],["GET","/crm/interactions/:id"],
  ["GET","/crm/billing"],["GET","/crm/billing/:id"],
  ["GET","/crm/returns"],["POST","/crm/returns"],
  ["GET","/crm/returns/:id"],["PUT","/crm/returns/:id"],["DELETE","/crm/returns/:id"],
  ["POST","/crm/returns/:id/approve"],["POST","/crm/returns/:id/reject"],
  ["POST","/crm/returns/:id/receive"],["POST","/crm/returns/:id/complete"],
  ["POST","/crm/returns/:id/cancel"],
  ["POST","/crm/returns/:id/accept"],["POST","/crm/returns/:id/process"],
  ["POST","/crm/returns/:id/resolve"],["POST","/crm/returns/:id/confirm"],
  ["GET","/crm/returns/:id/items"],["POST","/crm/returns/:id/items"],
  ["GET","/crm/returns/:id/finance-status"],
  ["GET","/crm/returns/:id/inventory-status"],
  ["POST","/crm/rfm/analyze"],
  ["GET","/crm/rfm/segments"],
  ["GET","/crm/rfm/customer/:id"],
  ["POST","/crm/forecast/predict"],
  ["GET","/crm/forecast/methods"],
  ["POST","/crm/forecast/evaluate"]
]
*/

import { apiClient } from '../client';
import type { ApiResponse } from '../client';

import { crmDashboardApi } from './dashboard';
import { customerApi, tagApi } from './customer';
import { contactApi } from './contact';
import { opportunityApi } from './opportunity';
import { interactionApi } from './interaction';
import { customerScoringApi } from './scoring';
import { salesForecastApi, forecastApi } from './forecast';
import { rfmApi } from './rfm';
import { billingApi } from './billing';
import { customerSegmentationApi, customerRecommendationApi } from './segmentation';
import { returnsApi } from './returns';
import { crmAuditApi } from './crmAudit';
import { salesFunnelApi } from './salesFunnel';
export * from './types';
export { useCrmMock, default as useCrmMockDefault } from './_mock';
export type {
  Period,
  CrmKpis,
  ForecastPoint,
  ForecastSeries,
  ScoreBuckets,
  RfmBuckets,
  SegmentPoint,
  BillingTopItem,
  BillingStatusSlice,
  AgingBucket,
  DashboardData,
  FunnelData,
  ScoringData,
  ForecastData,
  SegmentationData,
  BillingAnalyticsData,
  RecommendationData,
  CrmMockShape,
} from './_mock';

export { customerApi, tagApi } from './customer';
export { crmDashboardApi } from './dashboard';
export { contactApi } from './contact';
export { interactionApi } from './interaction';
export { salesForecastApi, forecastApi } from './forecast';
export { rfmApi } from './rfm';
export { billingApi } from './billing';
export { returnsApi } from './returns';
export { crmAuditApi } from './crmAudit';

export const crmApi = {
  dashboard: crmDashboardApi,
  customers: customerApi,
  tags: tagApi,
  contacts: contactApi,
  opportunities: opportunityApi,
  interactions: interactionApi,
  customerScoring: customerScoringApi,
  salesForecast: salesForecastApi,
  forecast: forecastApi,
  rfm: rfmApi,
  billing: billingApi,
  customerSegmentation: customerSegmentationApi,
  customerRecommendation: customerRecommendationApi,
  returns: returnsApi,
  audit: crmAuditApi,
  salesFunnel: salesFunnelApi,

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.crm.get('/health');
  },
};

export default crmApi;
