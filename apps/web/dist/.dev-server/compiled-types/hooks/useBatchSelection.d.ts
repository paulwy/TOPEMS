export declare const useBatchSelection: <T>(items: T[], idKey?: string) => {
    selectedIds: string[];
    allItemsSelected: boolean;
    isIndeterminate: boolean;
    toggleSelect: (id: string) => void;
    selectAll: () => void;
    deselectAll: () => void;
    isSelected: (id: string) => boolean;
    clearSelection: () => void;
};
