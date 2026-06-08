import React, { useState, useContext, createContext, useCallback } from 'react';

export interface ChartSelection {
  chartId: string;
  selectedData: any[];
}

interface ChartLinkerContextType {
  selections: ChartSelection[];
  selectData: (chartId: string, data: any[]) => void;
  clearSelection: (chartId: string) => void;
  clearAllSelections: () => void;
  isSelected: (chartId: string, dataItem: any) => boolean;
}

const ChartLinkerContext = createContext<ChartLinkerContextType | undefined>(undefined);

export const ChartLinkerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selections, setSelections] = useState<ChartSelection[]>([]);

  const selectData = useCallback((chartId: string, data: any[]) => {
    setSelections(prev => {
      const existingIndex = prev.findIndex(s => s.chartId === chartId);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { chartId, selectedData: data };
        return updated;
      }
      return [...prev, { chartId, selectedData: data }];
    });
  }, []);

  const clearSelection = useCallback((chartId: string) => {
    setSelections(prev => prev.filter(s => s.chartId !== chartId));
  }, []);

  const clearAllSelections = useCallback(() => {
    setSelections([]);
  }, []);

  const isSelected = useCallback((chartId: string, dataItem: any) => {
    const selection = selections.find(s => s.chartId === chartId);
    if (!selection) return false;
    return selection.selectedData.some(d => JSON.stringify(d) === JSON.stringify(dataItem));
  }, [selections]);

  return (
    <ChartLinkerContext.Provider
      value={{
        selections,
        selectData,
        clearSelection,
        clearAllSelections,
        isSelected,
      }}
    >
      {children}
    </ChartLinkerContext.Provider>
  );
};

export const useChartLinker = () => {
  const context = useContext(ChartLinkerContext);
  if (context === undefined) {
    throw new Error('useChartLinker must be used within a ChartLinkerProvider');
  }
  return context;
};

export default ChartLinkerProvider;
