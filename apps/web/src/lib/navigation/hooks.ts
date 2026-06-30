import { useState, useEffect, useCallback, useMemo } from 'react';
import { navigationRegistryV2 } from './NavigationRegistryV2';
import type { NavItem, ModuleNavConfig, ModuleCardConfig, NavGroup } from './types';
import { useLocation } from 'react-router-dom';

export function useNavigation() {
  const [, setUpdateKey] = useState(0);

  useEffect(() => {
    const handler = () => setUpdateKey((k) => k + 1);
    navigationRegistryV2.emitter.on('navigationUpdated', handler);
    return () => navigationRegistryV2.emitter.off('navigationUpdated', handler);
  }, []);

  const getTopNavItems = useCallback((hasPermission?: (perm: string) => boolean) => {
    return navigationRegistryV2.getTopNavItems(hasPermission);
  }, []);

  const getCoreModules = useCallback((hasPermission?: (perm: string) => boolean) => {
    return navigationRegistryV2.getCoreModules(hasPermission);
  }, []);

  const getBusinessModules = useCallback((hasPermission?: (perm: string) => boolean) => {
    return navigationRegistryV2.getBusinessModules(hasPermission);
  }, []);

  const getModuleCards = useCallback((hasPermission?: (perm: string) => boolean) => {
    return navigationRegistryV2.getModuleCards(hasPermission);
  }, []);

  const getSidebarNavItems = useCallback(
    (moduleCode: string, hasPermission?: (perm: string) => boolean) => {
      return navigationRegistryV2.getSidebarNavItems(moduleCode, hasPermission);
    },
    []
  );

  const getSidebarNavGrouped = useCallback(
    (moduleCode: string, hasPermission?: (perm: string) => boolean) => {
      return navigationRegistryV2.getSidebarNavGrouped(moduleCode, hasPermission);
    },
    []
  );

  const getModuleTabs = useCallback(
    (moduleCode: string, hasPermission?: (perm: string) => boolean) => {
      return navigationRegistryV2.getModuleTabs(moduleCode, hasPermission);
    },
    []
  );

  const getModule = useCallback((moduleCode: string): ModuleNavConfig | undefined => {
    return navigationRegistryV2.getModule(moduleCode);
  }, []);

  const getAllModules = useCallback((): ModuleNavConfig[] => {
    return navigationRegistryV2.getAllModules();
  }, []);

  return {
    getTopNavItems,
    getCoreModules,
    getBusinessModules,
    getModuleCards,
    getSidebarNavItems,
    getSidebarNavGrouped,
    getModuleTabs,
    getModule,
    getAllModules,
  };
}

export function useCurrentModule() {
  const location = useLocation();

  return useMemo(() => {
    return navigationRegistryV2.findModuleByPath(location.pathname);
  }, [location.pathname]);
}

export function useNavHierarchy(): NavItem[] {
  const location = useLocation();

  return useMemo(() => {
    return navigationRegistryV2.getNavHierarchy(location.pathname);
  }, [location.pathname]);
}

export function useCurrentNavItem(): NavItem | undefined {
  const location = useLocation();

  return useMemo(() => {
    return navigationRegistryV2.findNavItemByPath(location.pathname);
  }, [location.pathname]);
}

export function useSidebarNav(moduleCode?: string) {
  const [, setUpdateKey] = useState(0);
  const currentModule = useCurrentModule();
  const effectiveModule = moduleCode || currentModule?.code || '';

  useEffect(() => {
    const handler = () => setUpdateKey((k) => k + 1);
    navigationRegistryV2.emitter.on('navigationUpdated', handler);
    return () => navigationRegistryV2.emitter.off('navigationUpdated', handler);
  }, []);

  const items = useMemo(() => {
    if (!effectiveModule) return [];
    return navigationRegistryV2.getSidebarNavItems(effectiveModule);
  }, [effectiveModule]);

  const grouped = useMemo(() => {
    if (!effectiveModule) return {} as Record<NavGroup | 'other', NavItem[]>;
    return navigationRegistryV2.getSidebarNavGrouped(effectiveModule);
  }, [effectiveModule]);

  return { items, grouped, moduleCode: effectiveModule };
}

export function useModuleTabs(moduleCode?: string) {
  const [, setUpdateKey] = useState(0);
  const currentModule = useCurrentModule();
  const effectiveModule = moduleCode || currentModule?.code || '';

  useEffect(() => {
    const handler = () => setUpdateKey((k) => k + 1);
    navigationRegistryV2.emitter.on('navigationUpdated', handler);
    return () => navigationRegistryV2.emitter.off('navigationUpdated', handler);
  }, []);

  const tabs = useMemo(() => {
    if (!effectiveModule) return [];
    return navigationRegistryV2.getModuleTabs(effectiveModule);
  }, [effectiveModule]);

  return { tabs, moduleCode: effectiveModule };
}
