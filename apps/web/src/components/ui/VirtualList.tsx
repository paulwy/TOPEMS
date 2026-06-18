import React, { useRef, useMemo, useCallback } from "react";

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  containerHeight?: number;
  className?: string;
}

export const VirtualList = React.memo(<T extends unknown>({
  items,
  itemHeight,
  renderItem,
  containerHeight = 500,
  className = "",
}: VirtualListProps<T>) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = React.useState(0);

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

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        height: containerHeight,
        overflow: "auto",
        position: "relative",
      }}
      onScroll={handleScroll}
    >
      <div
        ref={scrollRef}
        style={{
          height: totalHeight,
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
        }}
      />
      <div
        style={{
          position: "relative",
          top: paddingTop,
        }}
      >
        {items.slice(visibleRange.startIndex, visibleRange.endIndex).map((item, index) => (
          <div
            key={`${visibleRange.startIndex}-${index}`}
            style={{ height: itemHeight }}
          >
            {renderItem(item, visibleRange.startIndex + index)}
          </div>
        ))}
      </div>
    </div>
  );
});

export default VirtualList;