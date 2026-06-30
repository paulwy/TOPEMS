import { navigationRegistry } from '../NavigationRegistry';
import { registerDefaultModules } from './moduleRegistrations';
import { navigationRegistryV2 } from './NavigationRegistryV2';
import { coreModuleNavConfigs } from './modules';

registerDefaultModules();

coreModuleNavConfigs.forEach((config) => {
  navigationRegistryV2.registerModule(config);
});

export { navigationRegistry, registerDefaultModules, navigationRegistryV2 };
export type { NavItem, ModuleCardConfig, PluginNavConfig } from '../NavigationRegistry';
export * from './types';
export * from './hooks';
export { default as SidebarNavGroup } from './components/SidebarNavGroup';
