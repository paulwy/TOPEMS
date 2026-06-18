import React, { useState, useRef, useEffect, useCallback } from "react";

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  badge?: number | string;
  children?: SidebarItem[];
}

interface SidebarProps {
  items: SidebarItem[];
  activeItemId?: string;
  onItemClick?: (item: SidebarItem) => void;
  collapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  items,
  activeItemId,
  onItemClick,
  collapsed = false,
  onCollapseChange,
  className = "",
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState(0);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const toggleExpand = useCallback((itemId: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const allItems = flattenItems(items);
      const currentIndex = allItems.findIndex((item) => item.id === activeItemId);
      const targetIndex = focusedIndex >= 0 ? focusedIndex : currentIndex >= 0 ? currentIndex : 0;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          const nextIndex = Math.min(targetIndex + 1, allItems.length - 1);
          setFocusedIndex(nextIndex);
          itemRefs.current.get(allItems[nextIndex]?.id)?.focus();
          break;
        case "ArrowUp":
          e.preventDefault();
          const prevIndex = Math.max(targetIndex - 1, 0);
          setFocusedIndex(prevIndex);
          itemRefs.current.get(allItems[prevIndex]?.id)?.focus();
          break;
        case "Enter":
        case "Space":
          e.preventDefault();
          const focusedItem = allItems[targetIndex];
          if (focusedItem) {
            if (focusedItem.children && focusedItem.children.length > 0) {
              toggleExpand(focusedItem.id);
            } else {
              onItemClick?.(focusedItem);
              if (focusedItem.onClick) {
                focusedItem.onClick();
              }
            }
          }
          break;
        case "ArrowRight":
          e.preventDefault();
          const item = allItems[targetIndex];
          if (item?.children && item.children.length > 0 && !expandedItems.has(item.id)) {
            toggleExpand(item.id);
          }
          break;
        case "ArrowLeft":
          e.preventDefault();
          const currentItem = allItems[targetIndex];
          if (currentItem?.children && currentItem.children.length > 0 && expandedItems.has(currentItem.id)) {
            toggleExpand(currentItem.id);
          }
          break;
        case "Home":
          e.preventDefault();
          setFocusedIndex(0);
          itemRefs.current.get(allItems[0]?.id)?.focus();
          break;
        case "End":
          e.preventDefault();
          setFocusedIndex(allItems.length - 1);
          itemRefs.current.get(allItems[allItems.length - 1]?.id)?.focus();
          break;
        default:
          break;
      }
    },
    [items, activeItemId, focusedIndex, expandedItems, onItemClick, toggleExpand]
  );

  const flattenItems = (items: SidebarItem[], parentId?: string): SidebarItem[] => {
    return items.flatMap((item) => [
      { ...item, parentId },
      ...(item.children && expandedItems.has(item.id)
        ? flattenItems(item.children, item.id)
        : []),
    ]);
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setExpandedItems(new Set());
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  const renderItem = (
    item: SidebarItem,
    depth: number = 0,
    parentExpanded: boolean = true
  ) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const isActive = activeItemId === item.id;
    const isFocused = flattenItems(items).findIndex((i) => i.id === item.id) === focusedIndex;

    return (
      <div key={item.id}>
        <button
          ref={(el) => {
            if (el) itemRefs.current.set(item.id, el);
          }}
          onClick={() => {
            if (hasChildren) {
              toggleExpand(item.id);
            }
            onItemClick?.(item);
            if (item.onClick && !hasChildren) {
              item.onClick();
            }
          }}
          onMouseEnter={() => {
            const index = flattenItems(items).findIndex((i) => i.id === item.id);
            setFocusedIndex(index);
          }}
          onFocus={() => {
            const index = flattenItems(items).findIndex((i) => i.id === item.id);
            setFocusedIndex(index);
          }}
          aria-current={isActive ? "page" : undefined}
          aria-expanded={hasChildren ? isExpanded : undefined}
          aria-haspopup={hasChildren ? true : undefined}
          className={`
            w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
            transition-all duration-200 text-left
            ${isActive
              ? "bg-blue-500/10 text-blue-400 font-medium"
              : "text-gray-300 hover:bg-white/5 hover:text-gray-100"
            }
            ${isFocused ? "ring-2 ring-blue-500/50 ring-offset-2 ring-offset-gray-900" : ""}
            focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-gray-900
          `}
          style={{ paddingLeft: `${depth * 12 + 12}px` }}
          tabIndex={parentExpanded ? 0 : -1}
        >
          <span className="flex-shrink-0">{item.icon}</span>
          {!collapsed && (
            <span className="flex-1 truncate">{item.label}</span>
          )}
          {!collapsed && item.badge !== undefined && (
            <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full">
              {item.badge}
            </span>
          )}
          {hasChildren && (
            <span
              className={`
                flex-shrink-0 transition-transform duration-200
                ${isExpanded ? "rotate-90" : ""}
              `}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </span>
          )}
        </button>
        {hasChildren && isExpanded && !collapsed && (
          <div className="mt-1">
            {item.children!.map((child) => renderItem(child, depth + 1, isExpanded))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      className={`
        flex flex-col h-full bg-gray-900 border-r border-gray-800
        transition-all duration-300
        ${collapsed ? "w-16" : "w-64"}
        ${className}
      `}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="flex-1 overflow-y-auto py-4 px-2">
        {items.map((item) => renderItem(item))}
      </div>
      {onCollapseChange && (
        <button
          onClick={() => onCollapseChange(!collapsed)}
          className="
            w-full flex items-center justify-center py-3
            text-gray-400 hover:text-gray-200 hover:bg-white/5
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-blue-500/50
          "
          aria-label={collapsed ? "展开侧边栏" : "折叠侧边栏"}
        >
          <svg
            className={`w-5 h-5 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}
    </aside>
  );
};

export default Sidebar;