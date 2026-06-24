import { useState, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { navigationRegistry, type NavItem } from '@/lib/NavigationRegistry';
import type { TabItem } from '@/types/navigation';

// 从路径解析模块名的辅助函数
function getModuleFromPath(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return null;
  // 第一个路径段即为模块名
  return segments[0];
}

interface NavState {
  activeModule: string | null;
  activeTab: string | null;
  openMenu: NavItem | null;
  customTabs: Record<string, TabItem[]>;
}

interface UseTopNavReturn {
  activeModule: string | null;
  activeTab: string | null;
  openMenu: NavItem | null;
  navItems: NavItem[];
  currentModuleTabs: TabItem[];
  setOpenMenu: (menu: NavItem | null) => void;
  navigateTo: (path: string) => void;
  toggleTabPin: (tab: TabItem) => void;
  closeTab: (tab: TabItem) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
}

const STORAGE_KEY = 'topems_nav_tabs';

export function useTopNav(): UseTopNavReturn {
  const location = useLocation();
  const navigate = useNavigate();

  // 从 NavigationRegistry 动态获取导航项
  const [navItems, setNavItems] = useState<NavItem[]>(() => {
    return navigationRegistry.getTopNavItems();
  });

  const [state, setState] = useState<NavState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return {
          activeModule: null,
          activeTab: null,
          openMenu: null,
          customTabs: JSON.parse(saved),
        };
      } catch {
        return {
          activeModule: null,
          activeTab: null,
          openMenu: null,
          customTabs: {},
        };
      }
    }
    return {
      activeModule: null,
      activeTab: null,
      openMenu: null,
      customTabs: {},
    };
  });

  // 监听 NavigationRegistry 更新事件
  useEffect(() => {
    const updateNavItems = () => {
      setNavItems(navigationRegistry.getTopNavItems());
    };
    navigationRegistry.emitter.on('navigationUpdated', updateNavItems);
    return function cleanup() {
      navigationRegistry.emitter.off('navigationUpdated', updateNavItems);
    };
  }, []);

  useEffect(() => {
    const module = getModuleFromPath(location.pathname);
    setState((prev) => ({
      ...prev,
      activeModule: module,
      activeTab: location.pathname,
    }));
  }, [location.pathname]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.customTabs));
  }, [state.customTabs]);

  const setOpenMenu = useCallback((menu: NavItem | null) => {
    setState((prev) => ({ ...prev, openMenu: menu }));
  }, []);

  const navigateTo = useCallback(
    (path: string) => {
      navigate(path);
      setState((prev) => ({ ...prev, openMenu: null }));
    },
    [navigate]
  );

  const currentModuleTabs = (): TabItem[] => {
    if (!state.activeModule) return [];

    // 从 NavigationRegistry 获取模块 Tabs
    const configTabs = navigationRegistry.getModuleTabs(state.activeModule) || [];

    const customTabs = state.customTabs[state.activeModule] || [];

    if (customTabs.length > 0) {
      const pinnedTabs = customTabs.filter((t) => t.pinned);
      const unpinnedTabs = customTabs.filter((t) => !t.pinned);
      return [...pinnedTabs, ...unpinnedTabs];
    }

    return configTabs;
  };

  const toggleTabPin = useCallback(
    (tab: TabItem) => {
      if (!state.activeModule) return;

      const module = state.activeModule;
      setState((prev) => {
        const currentTabs = prev.customTabs[module] || [];
        const updatedTabs = currentTabs.map((t: TabItem) =>
          t.path === tab.path ? { ...t, pinned: !t.pinned } : t
        );
        return {
          ...prev,
          customTabs: {
            ...prev.customTabs,
            [module]: updatedTabs,
          },
        };
      });
    },
    [state.activeModule]
  );

  const closeTab = useCallback(
    (tab: TabItem) => {
      if (!state.activeModule || tab.pinned) return;

      const module = state.activeModule;
      setState((prev) => {
        const currentTabs = prev.customTabs[module] || [];
        const updatedTabs = currentTabs.filter((t: TabItem) => t.path !== tab.path);
        return {
          ...prev,
          customTabs: {
            ...prev.customTabs,
            [module]: updatedTabs,
          },
        };
      });
    },
    [state.activeModule]
  );

  const reorderTabs = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (!state.activeModule) return;

      const module = state.activeModule;
      setState((prev) => {
        const currentTabs = [...(prev.customTabs[module] || [])];
        const [removed] = currentTabs.splice(fromIndex, 1);
        currentTabs.splice(toIndex, 0, removed);
        return {
          ...prev,
          customTabs: {
            ...prev.customTabs,
            [module]: currentTabs,
          },
        };
      });
    },
    [state.activeModule]
  );

  return {
    activeModule: state.activeModule,
    activeTab: state.activeTab,
    openMenu: state.openMenu,
    navItems,
    currentModuleTabs: currentModuleTabs(),
    setOpenMenu,
    navigateTo,
    toggleTabPin,
    closeTab,
    reorderTabs,
  };
}

export default useTopNav;
