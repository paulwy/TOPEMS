import { schemaRegistryApi } from './schemaRegistry';
import { qualityApi } from './quality';
import { lineageApi } from './lineage';
import { governanceApi } from './governance';
import { aiGovernanceApi } from './aiGovernance';
import { metadataApi } from './metadata';
import { disasterRecoveryApi } from './disasterRecovery';
import { knowledgeGraphApi } from './knowledgeGraph';
import { governanceApiV2 } from './governanceV2';
import { semanticSearchApi } from './semanticSearch';
import { versioningApi } from './versioning';
import { metadataApiV60 } from './metadataV60';
import { dataAssetCatalogApiV66 } from './dataAssetCatalogV66';

export { qualityApi } from './quality';
export { governanceApi } from './governance';
export { aiGovernanceApi } from './aiGovernance';
export { disasterRecoveryApi } from './disasterRecovery';
export { knowledgeGraphApi } from './knowledgeGraph';
export { governanceApiV2 } from './governanceV2';
export { semanticSearchApi } from './semanticSearch';
export { versioningApi } from './versioning';
export { metadataApiV60 } from './metadataV60';
export { dataAssetCatalogApiV66 } from './dataAssetCatalogV66';

const masterApi = {
  schemaRegistry: schemaRegistryApi,
  quality: qualityApi,
  lineage: lineageApi,
  governance: governanceApi,
  aiGovernance: aiGovernanceApi,
  metadata: metadataApi,
  disasterRecovery: disasterRecoveryApi,
  knowledgeGraph: knowledgeGraphApi,
  governanceV2: governanceApiV2,
  semanticSearch: semanticSearchApi,
  versioning: versioningApi,
  metadataV60: metadataApiV60,
  dataAssetCatalogV66: dataAssetCatalogApiV66,
};

export default masterApi;
