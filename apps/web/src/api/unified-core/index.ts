import { systemApi } from './system';
import { tenantApi } from './tenant';

export { systemApi } from './system';
export { tenantApi } from './tenant';

const unifiedCoreApi = {
  system: systemApi,
  tenant: tenantApi,
};

export default unifiedCoreApi;
