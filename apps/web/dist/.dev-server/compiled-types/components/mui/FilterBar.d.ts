import React from "react";
export interface FilterOption {
    label: string;
    value: string | number;
}
export interface FilterConfig {
    id: string;
    label: string;
    type: "select" | "multiselect" | "date" | "dateRange" | "text" | "number" | "search";
    placeholder?: string;
    options?: FilterOption[];
    value?: any;
    defaultValue?: any;
    onChange?: (value: any, filter: FilterConfig) => void;
    width?: number | string;
    /** 是否显示搜索框（用于multiselect） */
    searchable?: boolean;
}
export interface FilterBarProps {
    filters: FilterConfig[];
    onFilterChange?: (filters: Record<string, any>) => void;
    onReset?: () => void;
    onSearch?: () => void;
    collapsible?: boolean;
    defaultExpanded?: boolean;
    dense?: boolean;
    variant?: "standard" | "outlined" | "filled";
}
export declare const FilterBar: React.FC<FilterBarProps>;
export default FilterBar;
