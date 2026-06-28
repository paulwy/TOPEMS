import type { ApiResponse } from '../client';

import { marketplaceApi } from './marketplace';
import { pluginApi } from './plugin';
import { mockMarketplaceApi } from './mock';

export * from './types';

export { SUITES, PLUGIN_SUITE_MAP, PLUGIN_REGISTRY } from './registry';
export {
  fetchPluginInfo,
  fetchAllPluginInfo,
  checkPluginHealth,
  checkAllPluginsHealth,
} from './registry';

export { marketplaceApi } from './marketplace';
export { pluginApi } from './plugin';
export { mockMarketplaceApi } from './mock';

const USE_MOCK = true;

const activeMarketplaceApi = USE_MOCK ? mockMarketplaceApi : marketplaceApi;

export const getMarketplaceSummary = activeMarketplaceApi.getSummary;
export const getPluginCategories = activeMarketplaceApi.getCategories;
export const listPlugins = activeMarketplaceApi.listPlugins;
export const getPlugin = activeMarketplaceApi.getPlugin;
export const getPluginVersions = activeMarketplaceApi.getVersions;
export const getPluginReviews = activeMarketplaceApi.getReviews;
export const submitPluginReview = activeMarketplaceApi.submitReview;

export const pluginApiAggregated = {
  marketplace: marketplaceApi,
  management: pluginApi,

  listMarketplace: pluginApi.listMarketplace,
  listInstalled: pluginApi.listInstalled,
  getDetails: pluginApi.getDetails,
  install: pluginApi.install,
  uninstall: pluginApi.uninstall,
  enable: pluginApi.enable,
  disable: pluginApi.disable,
  upgrade: pluginApi.upgrade,
  getUpgradeHistory: pluginApi.getUpgradeHistory,

  getMarketplaceSummary: marketplaceApi.getSummary,
  getPluginCategories: marketplaceApi.getCategories,
  listPlugins: marketplaceApi.listPlugins,
  getPlugin: marketplaceApi.getPlugin,
  getPluginVersions: marketplaceApi.getVersions,
  getPluginReviews: marketplaceApi.getReviews,
  submitPluginReview: marketplaceApi.submitReview,
};

export default pluginApi;
