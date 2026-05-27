import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  containerHeight?: number;
}

export const VirtualList = <T extends any>({
  items,
  itemHeight,
  renderItem,
  containerHeight = 400,
}: VirtualListProps<T>) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const totalItems = items.length;
  const totalHeight = totalItems * itemHeight;
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(startIndex + visibleCount + 2, totalItems);
  
  const paddingTop = startIndex * itemHeight;
  const paddingBottom = totalHeight - endIndex * itemHeight;
  
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);
  
  const visibleItems = items.slice(startIndex, endIndex);
  
  useEffect(() => {
    setScrollTop(0);
  }, [items.length]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative',
      }}
      className="w-full"
    >
      <div style={{ height: totalHeight }}>
        <div style={{ height: paddingTop }} />
        {visibleItems.map((item, index) => (
          <div
            key={`${startIndex + index}`}
            style={{ height: itemHeight }}
          >
            {renderItem(item, startIndex + index)}
          </div>
        ))}
        <div style={{ height: paddingBottom }} />
      </div>
    </div>
  );
};

export interface VirtualTableProps<T> {
  columns: { key: string; label: string; width?: string }[];
  data: T[];
  rowHeight?: number;
  containerHeight?: number;
}

export const VirtualTable = <T extends Record<string, any>>({
  columns,
  data,
  rowHeight = 48,
  containerHeight = 400,
}: VirtualTableProps<T>) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const totalRows = data.length;
  const totalHeight = totalRows * rowHeight;
  const visibleCount = Math.ceil(containerHeight / rowHeight);
  const startIndex = Math.floor(scrollTop / rowHeight);
  const endIndex = Math.min(startIndex + visibleCount + 2, totalRows);
  
  const paddingTop = startIndex * rowHeight;
  const paddingBottom = totalHeight - endIndex * rowHeight;
  
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);
  
  const visibleData = data.slice(startIndex, endIndex);

  useEffect(() => {
    setScrollTop(0);
  }, [data.length]);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width }}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
      </table>
      
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          height: containerHeight,
          overflow: 'auto',
          position: 'relative',
        }}
        className="w-full"
      >
        <table className="w-full">
          <tbody>
            <tr>
              <td colSpan={columns.length} style={{ height: paddingTop }} />
            </tr>
            {visibleData.map((row, index) => (
              <tr
                key={`${startIndex + index}`}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                style={{ height: rowHeight }}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{ width: col.width }}
                    className="px-4 py-3 text-sm text-gray-900"
                  >
                    {row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td colSpan={columns.length} style={{ height: paddingBottom }} />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VirtualList;
