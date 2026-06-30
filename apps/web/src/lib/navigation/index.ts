import { navigationRegistryV2 } from './NavigationRegistryV2';
import { coreModuleNavConfigs } from './modules';

coreModuleNavConfigs.forEach((config) => {
  navigationRegistryV2.registerModule(config);
});

export { navigationRegistryV2 };
export * from './types';
export * from './hooks';
export { default as SidebarNavGroup } from './components/SidebarNavGroup';
