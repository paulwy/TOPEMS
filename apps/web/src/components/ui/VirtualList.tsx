import React, {
  useRef,
  useMemo,
  useCallback,
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';

export interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  containerHeight?: number;
  className?: string;
  style?: React.CSSProperties;
  getItemKey?: (item: T, index: number) => string | number;
  overscan?: number;
  onScroll?: (scrollTop: number) => void;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
}

export interface VirtualListHandle {
  scrollToIndex: (index: number, align?: 'auto' | 'start' | 'center' | 'end') => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
  getScrollTop: () => number;
}

function VirtualListInner<T extends unknown>(
  props: VirtualListProps<T>,
  ref: React.ForwardedRef<VirtualListHandle>
) {
  const {
    items,
    itemHeight,
    renderItem,
    containerHeight = 500,
    className = '',
    style,
    getItemKey,
    overscan = 5,
    onScroll,
    onEndReached,
    onEndReachedThreshold = 200,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastEndReachedIndex = useRef<number>(-1);

  const totalHeight = useMemo(() => items.length * itemHeight, [items.length, itemHeight]);

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + overscan * 2,
      items.length
    );
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const offsetY = useMemo(
    () => visibleRange.startIndex * itemHeight,
    [visibleRange.startIndex, itemHeight]
  );

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.target as HTMLDivElement;
      const currentScrollTop = target.scrollTop;

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        setScrollTop(currentScrollTop);
        onScroll?.(currentScrollTop);

        if (onEndReached && items.length > 0) {
          const scrollBottom = currentScrollTop + containerHeight;
          const threshold = totalHeight - onEndReachedThreshold;

          if (scrollBottom >= threshold && lastEndReachedIndex.current !== items.length - 1) {
            lastEndReachedIndex.current = items.length - 1;
            onEndReached();
          }
        }
      });
    },
    [containerHeight, totalHeight, onEndReachedThreshold, onScroll, onEndReached, items.length]
  );

  const getKey = useCallback(
    (item: T, index: number) => {
      if (getItemKey) {
        return getItemKey(item, index);
      }
      return index;
    },
    [getItemKey]
  );

  const scrollToIndex = useCallback(
    (index: number, align: 'auto' | 'start' | 'center' | 'end' = 'auto') => {
      if (!containerRef.current || items.length === 0) return;

      const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
      const itemTop = clampedIndex * itemHeight;
      const itemBottom = itemTop + itemHeight;
      const viewportTop = scrollTop;
      const viewportBottom = scrollTop + containerHeight;

      let targetScrollTop = scrollTop;

      switch (align) {
        case 'start':
          targetScrollTop = itemTop;
          break;
        case 'end':
          targetScrollTop = itemBottom - containerHeight;
          break;
        case 'center':
          targetScrollTop = itemTop - (containerHeight - itemHeight) / 2;
          break;
        case 'auto':
        default:
          if (itemTop < viewportTop) {
            targetScrollTop = itemTop;
          } else if (itemBottom > viewportBottom) {
            targetScrollTop = itemBottom - containerHeight;
          }
          break;
      }

      containerRef.current.scrollTop = Math.max(0, targetScrollTop);
    },
    [itemHeight, containerHeight, scrollTop, items.length]
  );

  const scrollToTop = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = totalHeight;
    }
  }, [totalHeight]);

  const getScrollTop = useCallback(() => scrollTop, [scrollTop]);

  useImperativeHandle(
    ref,
    () => ({
      scrollToIndex,
      scrollToTop,
      scrollToBottom,
      getScrollTop,
    }),
    [scrollToIndex, scrollToTop, scrollToBottom, getScrollTop]
  );

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    lastEndReachedIndex.current = -1;
  }, [items.length]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex);
  }, [items, visibleRange.startIndex, visibleRange.endIndex]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        height: containerHeight,
        overflowY: 'auto',
        overflowX: 'hidden',
        position: 'relative',
        willChange: 'transform',
        ...style,
      }}
      onScroll={handleScroll}
    >
      <div
        style={{
          height: totalHeight,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            transform: `translateY(${offsetY}px)`,
          }}
        >
          {visibleItems.map((item, relativeIndex) => {
            const absoluteIndex = visibleRange.startIndex + relativeIndex;
            return (
              <div
                key={getKey(item, absoluteIndex)}
                style={{
                  height: itemHeight,
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  transform: `translateY(${relativeIndex * itemHeight}px)`,
                }}
              >
                {renderItem(item, absoluteIndex)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const VirtualList = forwardRef(VirtualListInner) as <T>(
  props: VirtualListProps<T> & { ref?: React.ForwardedRef<VirtualListHandle> }
) => React.ReactElement;

export default VirtualList;
