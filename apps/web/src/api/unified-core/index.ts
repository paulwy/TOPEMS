import { systemApi } from './system';
import { tenantApi } from './tenant';
import { unifiedSearchApi } from './search';
import { iamAuthApi } from './iamAuth';
import { businessMetricApi } from './businessMetric';

export { systemApi } from './system';
export { tenantApi } from './tenant';
export { iamAuthApi } from './iamAuth';
export { businessMetricApi } from './businessMetric';

const unifiedCoreApi = {
  system: systemApi,
  tenant: tenantApi,
  search: unifiedSearchApi,
  iamAuth: iamAuthApi,
  businessMetric: businessMetricApi,
};

export default unifiedCoreApi;
