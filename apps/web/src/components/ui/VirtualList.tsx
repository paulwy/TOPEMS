import React, { useRef, useMemo, useCallback, useEffect, useState } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  containerHeight?: number;
  className?: string;
  getItemKey?: (item: T, index: number) => string | number;
}

export const VirtualList = React.memo(
  <T extends unknown>({
    items,
    itemHeight,
    renderItem,
    containerHeight = 500,
    className = '',
    getItemKey,
  }: VirtualListProps<T>) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);

    const totalHeight = useMemo(() => items.length * itemHeight, [items.length, itemHeight]);

    const visibleRange = useMemo(() => {
      const startIndex = Math.floor(scrollTop / itemHeight);
      const endIndex = Math.min(
        startIndex + Math.ceil(containerHeight / itemHeight) + 2,
        items.length
      );
      return { startIndex, endIndex };
    }, [scrollTop, itemHeight, containerHeight, items.length]);

    const paddingTop = visibleRange.startIndex * itemHeight;

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop((e.target as HTMLDivElement).scrollTop);
    }, []);

    // Generate stable key for each item
    const getKey = useCallback(
      (item: T, absoluteIndex: number) => {
        if (getItemKey) {
          return getItemKey(item, absoluteIndex);
        }
        return absoluteIndex;
      },
      [getItemKey]
    );

    return (
      <div
        ref={containerRef}
        className={className}
        style={{
          height: containerHeight,
          overflow: 'auto',
          position: 'relative',
        }}
        onScroll={handleScroll}
      >
        <div
          ref={scrollRef}
          style={{
            height: totalHeight,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        />
        <div
          style={{
            position: 'relative',
            top: paddingTop,
          }}
        >
          {items
            .slice(visibleRange.startIndex, visibleRange.endIndex)
            .map((item, relativeIndex) => {
              const absoluteIndex = visibleRange.startIndex + relativeIndex;
              return (
                <div
                  key={getKey(item, absoluteIndex)}
                  style={{ height: itemHeight }}
                >
                  {renderItem(item, absoluteIndex)}
                </div>
              );
            })}
        </div>
      </div>
    );
  }
);

export default VirtualList;
