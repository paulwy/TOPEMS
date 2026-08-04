import { navigationRegistryV2 } from './NavigationRegistryV2';
import {
  adminNavConfig,
  iamNavConfig,
  workflowNavConfig,
  notificationNavConfig,
  docNavConfig,
  monitorNavConfig,
  assetNavConfig,
  lowcodeNavConfig,
  oaNavConfig,
} from './modules';

const essentialModules = [
  adminNavConfig,
  iamNavConfig,
  workflowNavConfig,
  notificationNavConfig,
  docNavConfig,
  monitorNavConfig,
  assetNavConfig,
  lowcodeNavConfig,
  oaNavConfig,
];

essentialModules.forEach((config) => {
  navigationRegistryV2.registerModule(config);
});

export { navigationRegistryV2 };
export * from './types';
export * from './hooks';
export { default as SidebarNavGroup } from './components/SidebarNavGroup';
export {
  lazyLoadModuleConfig,
  preloadModuleConfigs,
  getAvailableModuleCodes,
} from './modules/lazy';
