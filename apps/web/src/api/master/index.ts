import { schemaRegistryApi } from './schemaRegistry';
import { dictionaryApi } from './dictionary';
import { qualityApi } from './quality';

export { schemaRegistryApi } from './schemaRegistry';
export { dictionaryApi } from './dictionary';
export { qualityApi } from './quality';

export const masterApi = {
  schemaRegistry: schemaRegistryApi,
  dictionary: dictionaryApi,
  quality: qualityApi,
};

export default masterApi;
