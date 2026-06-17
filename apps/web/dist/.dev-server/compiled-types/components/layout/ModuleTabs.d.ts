import React from "react";
export interface TabItem {
    label: string;
    path: string;
    closable?: boolean;
    pinned?: boolean;
}
interface ModuleTabsProps {
    tabs: TabItem[];
    onTabsChange?: (tabs: TabItem[]) => void;
}
export declare const ModuleTabs: React.FC<ModuleTabsProps>;
export default ModuleTabs;
