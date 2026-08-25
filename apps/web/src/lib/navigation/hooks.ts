import { useMemo } from 'react';
import { navigationRegistryV2 } from './NavigationRegistryV2';
import type { NavItem } from './types';
import { useLocation } from 'react-router-dom';

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
