export interface NavMenuItem {
    label: string;
    path?: string;
    icon?: string;
    badge?: string | number;
}
export interface NavGroup {
    label: string;
    path?: string;
    isGroup?: boolean;
    children?: NavMenuItem[] | NavGroup[];
}
export interface TabItem {
    label: string;
    path: string;
    closable?: boolean;
    pinned?: boolean;
}
export interface ModuleTabsConfig {
    module: string;
    tabs: TabItem[];
}
