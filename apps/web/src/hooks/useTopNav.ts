import { useState, useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  topNavItems,
  moduleTabsConfig,
  getModuleFromPath,
  type NavItem,
  type TabItem,
} from "../config/navigation";

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

const STORAGE_KEY = "topems_nav_tabs";

export function useTopNav(): UseTopNavReturn {
  const location = useLocation();
  const navigate = useNavigate();

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
    [navigate],
  );

  const currentModuleTabs = (): TabItem[] => {
    if (!state.activeModule) return [];

    const configTabs =
      moduleTabsConfig.find((c) => c.module === state.activeModule)?.tabs || [];

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
          t.path === tab.path ? { ...t, pinned: !t.pinned } : t,
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
    [state.activeModule],
  );

  const closeTab = useCallback(
    (tab: TabItem) => {
      if (!state.activeModule || tab.pinned) return;

      const module = state.activeModule;
      setState((prev) => {
        const currentTabs = prev.customTabs[module] || [];
        const updatedTabs = currentTabs.filter(
          (t: TabItem) => t.path !== tab.path,
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
    [state.activeModule],
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
    [state.activeModule],
  );

  return {
    activeModule: state.activeModule,
    activeTab: state.activeTab,
    openMenu: state.openMenu,
    navItems: topNavItems,
    currentModuleTabs: currentModuleTabs(),
    setOpenMenu,
    navigateTo,
    toggleTabPin,
    closeTab,
    reorderTabs,
  };
}

export default useTopNav;
