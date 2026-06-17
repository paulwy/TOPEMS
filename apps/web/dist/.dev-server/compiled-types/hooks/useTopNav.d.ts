import { type NavItem, type TabItem } from "../config/navigation";
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
export declare function useTopNav(): UseTopNavReturn;
export default useTopNav;
