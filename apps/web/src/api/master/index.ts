import { schemaRegistryApi } from './schemaRegistry';
import { dictionaryApi } from './dictionary';
import { qualityApi } from './quality';
import { lineageApi } from './lineage';
import { governanceApi } from './governance';
import { aiGovernanceApi } from './aiGovernance';
import { metadataApi } from './metadata';

export { schemaRegistryApi } from './schemaRegistry';
export { dictionaryApi } from './dictionary';
export { qualityApi } from './quality';
export { lineageApi } from './lineage';
export { governanceApi } from './governance';
export { aiGovernanceApi } from './aiGovernance';
export { metadataApi } from './metadata';

export const masterApi = {
  schemaRegistry: schemaRegistryApi,
  dictionary: dictionaryApi,
  quality: qualityApi,
  lineage: lineageApi,
  governance: governanceApi,
  aiGovernance: aiGovernanceApi,
  metadata: metadataApi,
};

export default masterApi;
