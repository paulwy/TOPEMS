import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box, Typography, Paper, Chip, Button } from '@mui/material';
import { SIDEBAR, COLORS } from '@/constants/colors';

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
  className = '',
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
        case 'ArrowDown':
          e.preventDefault();
          const nextIndex = Math.min(targetIndex + 1, allItems.length - 1);
          setFocusedIndex(nextIndex);
          itemRefs.current.get(allItems[nextIndex]?.id)?.focus();
          break;
        case 'ArrowUp':
          e.preventDefault();
          const prevIndex = Math.max(targetIndex - 1, 0);
          setFocusedIndex(prevIndex);
          itemRefs.current.get(allItems[prevIndex]?.id)?.focus();
          break;
        case 'Enter':
        case 'Space':
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
        case 'ArrowRight':
          e.preventDefault();
          const item = allItems[targetIndex];
          if (item?.children && item.children.length > 0 && !expandedItems.has(item.id)) {
            toggleExpand(item.id);
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          const currentItem = allItems[targetIndex];
          if (
            currentItem?.children &&
            currentItem.children.length > 0 &&
            expandedItems.has(currentItem.id)
          ) {
            toggleExpand(currentItem.id);
          }
          break;
        case 'Home':
          e.preventDefault();
          setFocusedIndex(0);
          itemRefs.current.get(allItems[0]?.id)?.focus();
          break;
        case 'End':
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
      ...(item.children && expandedItems.has(item.id) ? flattenItems(item.children, item.id) : []),
    ]);
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setExpandedItems(new Set());
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const renderItem = (item: SidebarItem, depth: number = 0, parentExpanded: boolean = true) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const isActive = activeItemId === item.id;
    const isFocused = flattenItems(items).findIndex((i) => i.id === item.id) === focusedIndex;

    return (
      <Box key={item.id}>
        <Button
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
          aria-current={isActive ? 'page' : undefined}
          aria-expanded={hasChildren ? isExpanded : undefined}
          aria-haspopup={hasChildren ? true : undefined}
          sx={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 1.5,
            py: 1.25,
            borderRadius: 1,
            transition: 'all 0.2s',
            textAlign: 'left',
            bgcolor: isActive ? 'rgba(96, 165, 250, 0.1)' : 'transparent',
            color: isActive ? SIDEBAR.active.color : SIDEBAR.default.color,
            fontWeight: isActive ? 500 : 400,
            '&:hover': {
              bgcolor: isActive ? 'rgba(96, 165, 250, 0.1)' : SIDEBAR.default.hover.bgcolor,
              color: isActive ? SIDEBAR.active.color : SIDEBAR.default.hover.color,
            },
            ...(isFocused && {
              boxShadow: `0 0 0 2px ${COLORS.primary.DEFAULT}`,
              outline: `2px solid ${COLORS.primary.DEFAULT}`,
              outlineOffset: '2px',
            }),
            pl: depth * 1.5 + 1.5,
          }}
          tabIndex={parentExpanded ? 0 : -1}
        >
          <Box sx={{ flexShrink: 0 }}>{item.icon}</Box>
          {!collapsed && (
            <Typography
              sx={{
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {item.label}
            </Typography>
          )}
          {!collapsed && item.badge !== undefined && (
            <Chip
              label={item.badge}
              size='small'
              sx={{
                flexShrink: 0,
                px: 1,
                py: 0.25,
                fontSize: '0.75rem',
                fontWeight: 500,
                bgcolor: 'rgb(239, 68, 68)',
                color: 'white',
                borderRadius: '9999px',
                height: 'auto',
              }}
            />
          )}
          {hasChildren && (
            <Box
              sx={{
                flexShrink: 0,
                transition: 'transform 0.2s',
                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              }}
            >
              <svg
                width='16'
                height='16'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
              >
                <polyline points='9 18 15 12 9 6' />
              </svg>
            </Box>
          )}
        </Button>
        {hasChildren && isExpanded && !collapsed && (
          <Box sx={{ mt: 0.25 }}>
            {item.children!.map((child) => renderItem(child, depth + 1, isExpanded))}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Paper
      component='aside'
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: SIDEBAR.default.bgcolor,
        borderRight: `1px solid ${COLORS.secondary.DEFAULT}`,
        transition: 'all 0.3s',
        width: collapsed ? '4rem' : '16rem',
      }}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <Box sx={{ flex: 1, overflowY: 'auto', py: 2, px: 1 }}>
        {items.map((item) => renderItem(item))}
      </Box>
      {onCollapseChange && (
        <Button
          onClick={() => onCollapseChange(!collapsed)}
          sx={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            py: 1.5,
            color: 'rgb(156, 163, 175)',
            '&:hover': {
              color: 'rgb(229, 231, 235)',
              bgcolor: 'rgba(255, 255, 255, 0.05)',
            },
            transition: 'color 0.2s',
          }}
          aria-label={collapsed ? '展开侧边栏' : '折叠侧边栏'}
        >
          <Box
            sx={{
              width: '1.25rem',
              height: '1.25rem',
              transition: 'transform 0.2s',
              transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
              style={{ width: '100%', height: '100%' }}
            >
              <polyline points='15 18 9 12 15 6' />
            </svg>
          </Box>
        </Button>
      )}
    </Paper>
  );
};

export default Sidebar;
