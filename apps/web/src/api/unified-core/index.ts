import apiClient from '../client';
import type { ApiResponse } from '../client';
import { systemApi } from './system';
import { tenantApi } from './tenant';
import { unifiedSearchApi } from './search';
import { iamAuthApi } from './iamAuth';
import { businessMetricApi } from './businessMetric';

export { systemApi } from './system';
export { tenantApi } from './tenant';
export { unifiedSearchApi } from './search';
export { iamAuthApi } from './iamAuth';
export { businessMetricApi } from './businessMetric';

export const unifiedCoreApi = {
  system: systemApi,
  tenant: tenantApi,
  search: unifiedSearchApi,
  iamAuth: iamAuthApi,
  businessMetric: businessMetricApi,
};

export default unifiedCoreApi;
