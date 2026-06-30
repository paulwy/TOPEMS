/**
 * useVirtualScroll - Virtual scrolling hook for large list/table rendering.
 *
 * Only renders visible rows (+ overscan buffer) to dramatically reduce
 * DOM node count and improve scrolling performance on large datasets.
 *
 * @example
 * ```tsx
 * const { containerProps, innerProps, visibleItems, offsetY } = useVirtualScroll({
 *   itemCount: rows.length,
 *   itemHeight: 52,
 * });
 *
 * <div {...containerProps}>
 *   <div {...innerProps}>
 *     {visibleItems.map((index) => (
 *       <div key={index} style={{ position: 'absolute', top: index * itemHeight, height: itemHeight }}>
 *         {renderRow(rows[index])}
 *       </div>
 *     ))}
 *   </div>
 * </div>
 * ```
 */
import { useState, useEffect, useRef, useCallback, type RefObject } from 'react';

export interface UseVirtualScrollOptions {
  /** Total number of items */
  itemCount: number;
  /** Fixed height of each item in pixels */
  itemHeight: number;
  /** Number of extra items to render above/below the visible area */
  overscan?: number;
}

export interface UseVirtualScrollResult {
  /** Ref to attach to the scroll container */
  containerRef: RefObject<HTMLDivElement | null>;
  /** Total height of all items - apply to inner spacer div */
  totalHeight: number;
  /** Vertical offset (padding-top) for the first visible item */
  offsetY: number;
  /** Array of indices that should be rendered */
  visibleItems: number[];
  /** Scroll event handler to attach to the container */
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  /** Props to spread directly onto the scroll container element */
  containerProps: {
    ref: RefObject<HTMLDivElement | null>;
    onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
    style: React.CSSProperties;
  };
  /** Props to spread onto the inner positioned container */
  innerProps: {
    style: React.CSSProperties;
  };
}

export function useVirtualScroll(options: UseVirtualScrollOptions): UseVirtualScrollResult {
  const { itemCount, itemHeight, overscan = 5 } = options;
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const containerHeight = containerRef.current?.clientHeight || 0;

  const totalHeight = itemCount * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    itemCount,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );
  const visibleItems = Array.from({ length: endIndex - startIndex }, (_, i) => startIndex + i);
  const offsetY = startIndex * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Recalculate when container is resized
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      // Force re-render by toggling scrollTop slightly
      setScrollTop(container.scrollTop);
    });
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  return {
    containerRef,
    totalHeight,
    offsetY,
    visibleItems,
    handleScroll,
    containerProps: {
      ref: containerRef,
      onScroll: handleScroll,
      style: {
        overflow: 'auto',
        position: 'relative' as const,
      },
    },
    innerProps: {
      style: {
        position: 'relative' as const,
        height: `${totalHeight}px`,
        overflow: 'hidden',
      },
    },
  };
}
