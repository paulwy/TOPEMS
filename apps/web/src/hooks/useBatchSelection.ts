import React from 'react';

export const useBatchSelection = <T>(items: T[], idKey: string = 'id') => {
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  const allItemsSelected = items.length > 0 && selectedIds.length === items.length;
  const isIndeterminate = !allItemsSelected && selectedIds.length > 0;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedIds(items.map((item) => String(item[idKey as keyof T])));
  };

  const deselectAll = () => {
    setSelectedIds([]);
  };

  const isSelected = (id: string) => selectedIds.includes(id);

  const clearSelection = () => {
    setSelectedIds([]);
  };

  return {
    selectedIds,
    allItemsSelected,
    isIndeterminate,
    toggleSelect,
    selectAll,
    deselectAll,
    isSelected,
    clearSelection,
  };
};
