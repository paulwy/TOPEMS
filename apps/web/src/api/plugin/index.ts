import type { ApiResponse } from '../client';

import { marketplaceApi } from './marketplace';
import { pluginApi } from './plugin';

export * from './types';

export { getSuites as SUITES, PLUGIN_SUITE_MAP, getPluginRegistry as PLUGIN_REGISTRY } from './registry';
export {
  fetchPluginInfo,
  fetchAllPluginInfo,
  checkPluginHealth,
  checkAllPluginsHealth,
} from './registry';

export { marketplaceApi } from './marketplace';
export { pluginApi } from './plugin';

export const getMarketplaceSummary = marketplaceApi.getSummary;
const getPluginCategories = marketplaceApi.getCategories;
export const listPlugins = marketplaceApi.listPlugins;
export const getPlugin = marketplaceApi.getPlugin;
export const getPluginVersions = marketplaceApi.getVersions;
export const getPluginReviews = marketplaceApi.getReviews;
export const submitPluginReview = marketplaceApi.submitReview;

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
