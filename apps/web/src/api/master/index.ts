import { qualityApi } from './quality';
import { governanceApi } from './governance';
import { disasterRecoveryApi } from './disasterRecovery';
import { knowledgeGraphApi } from './knowledgeGraph';
import { semanticSearchApi } from './semanticSearch';
import { versioningApi } from './versioning';
import { dataAssetCatalogApiV66 } from './dataAssetCatalogV66';

export { qualityApi } from './quality';
export { governanceApi } from './governance';
export { disasterRecoveryApi } from './disasterRecovery';
export { knowledgeGraphApi } from './knowledgeGraph';
export { semanticSearchApi } from './semanticSearch';
export { versioningApi } from './versioning';
export { dataAssetCatalogApiV66 } from './dataAssetCatalogV66';

const masterApi = {
  quality: qualityApi,
  governance: governanceApi,
  disasterRecovery: disasterRecoveryApi,
  knowledgeGraph: knowledgeGraphApi,
  semanticSearch: semanticSearchApi,
  versioning: versioningApi,
  dataAssetCatalogV66: dataAssetCatalogApiV66,
};

export default masterApi;
