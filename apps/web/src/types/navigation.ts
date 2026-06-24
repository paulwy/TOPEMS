export interface NavMenuItem {
  title: string;
  path?: string;
  icon?: string;
  badge?: string | number;
}

export interface NavGroup {
  title: string;
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
