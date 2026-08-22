import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
  Typography,
} from '@mui/material';
import i18n from '@/i18n';
import { Pin, PinOff, X, GripVertical, ChevronLeft, ChevronRight, Home } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { navigationRegistryV2 } from '../../lib/navigation';
import type { NavItem } from '../../lib/navigation/types';
import { designTokens } from '@topems/tokens';

// ─── Legacy Types (kept for backward compatibility) ─────────────────────────

export interface TabItem {
  label: string;
  path: string;
  closable?: boolean;
  pinned?: boolean;
}

interface LegacyModuleTabsProps {
  tabs: TabItem[];
  pluginCode?: string;
  onTabsChange?: (tabs: TabItem[]) => void;
}

// ─── New Types ─────────────────────────────────────────────────────────────

interface ModuleTabItem {
  label: string;
  path: string;
  icon?: React.ReactNode;
}

interface ModuleTabsProps {
  /** Navigation items to display as tabs */
  items?: ModuleTabItem[];
  /** Whether to show the module home tab (navigates to /dashboard) */
  showHomeTab?: boolean; // default true
  /** Plugin code for fetching tabs from NavigationRegistry */
  pluginCode?: string;
  /** Tab change callback */
  onTabChange?: (path: string) => void;
  /** Whether to show the legacy draggable mode */
  legacyMode?: boolean; // default false

  // ── Legacy props (backward compatible) ──
  /** @deprecated Use `items` + new props instead. Triggers legacy mode automatically. */
  tabs?: TabItem[];
  /** @deprecated */
  onTabsChange?: (tabs: TabItem[]) => void;
}

// ─── New Mode: Simple Tab Bar ──────────────────────────────────────────────

const SimpleTabBar: React.FC<{
  items: ModuleTabItem[];
  showHomeTab: boolean;
  onTabChange?: (path: string) => void;
}> = ({ items, showHomeTab, onTabChange }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const allItems = useMemo(() => {
    const list: ModuleTabItem[] = [];
    if (showHomeTab) {
      list.push({
        label: i18n.t('shared.module_tabs.k0'),
        path: '/dashboard',
        icon: <Home style={{ width: 16, height: 16 }} />,
      });
    }
    list.push(...items);
    return list;
  }, [items, showHomeTab]);

  if (allItems.length === 0) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        px: { xs: 2, lg: 3 },
        py: 0.5,
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
        overflowX: 'auto',
        overflowY: 'hidden',
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': {
          display: 'none',
        },
      }}
    >
      {allItems.map((tab) => {
        const isActive = location.pathname === tab.path;

        return (
          <Box
            key={tab.path}
            onClick={() => {
              onTabChange?.(tab.path);
              navigate(tab.path);
            }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              px: 2,
              py: 1,
              borderRadius: '4px 4px 0 0',
              color: isActive ? 'primary.main' : 'text.secondary',
              fontWeight: isActive ? 600 : 400,
              borderBottom: isActive ? '2px solid' : '2px solid transparent',
              borderColor: isActive ? 'primary.main' : 'transparent',
              textTransform: 'none',
              fontSize: designTokens.typography.fontSize.scale['0.875rem'],
              cursor: 'pointer',
              transition: 'all 150ms ease',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              userSelect: 'none',
              '&:hover': {
                color: 'text.primary',
                bgcolor: 'action.hover',
              },
            }}
          >
            {tab.icon && (
              <Box
                component='span'
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  '& svg': { width: 16, height: 16 },
                }}
              >
                {tab.icon}
              </Box>
            )}
            <Typography
              component='span'
              sx={{
                fontWeight: 'inherit',
                fontSize: 'inherit',
                color: 'inherit',
                lineHeight: 1,
              }}
            >
              {tab.label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
};

// ─── Legacy Mode: Draggable Chrome-like Tabs ────────────────────────────────

const LegacyModuleTabs: React.FC<LegacyModuleTabsProps> = ({ tabs, pluginCode, onTabsChange }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [localTabs, setLocalTabs] = useState<TabItem[]>(tabs);

  useEffect(() => {
    if (pluginCode) {
      const registryTabs = navigationRegistryV2.getModuleTabs(pluginCode);
      if (registryTabs) {
        setLocalTabs(
          registryTabs.map((tab: NavItem) => ({
            label: tab.label,
            path: tab.path,
            closable: true,
            pinned: false,
          }))
        );
      }
    }
  }, [pluginCode]);
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    tab: TabItem;
  } | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 同步外部tabs变化
  React.useEffect(() => {
    setLocalTabs(tabs);
  }, [tabs]);

  // 右键菜单
  const handleContextMenu = useCallback((event: React.MouseEvent, tab: TabItem) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
      tab,
    });
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // 固定/取消固定
  const handleTogglePin = useCallback(
    (tab: TabItem) => {
      const newTabs = localTabs.map((t) => (t.path === tab.path ? { ...t, pinned: !t.pinned } : t));
      setLocalTabs(newTabs);
      onTabsChange?.(newTabs);
      handleCloseContextMenu();
    },
    [localTabs, onTabsChange, handleCloseContextMenu]
  );

  // 关闭标签
  const handleCloseTab = useCallback(
    (tab: TabItem) => {
      const newTabs = localTabs.filter((t) => t.path !== tab.path);
      setLocalTabs(newTabs);
      onTabsChange?.(newTabs);

      // 如果关闭的是当前页，跳转到其他页
      if (location.pathname === tab.path && newTabs.length > 0) {
        navigate(newTabs[0].path);
      }
      handleCloseContextMenu();
    },
    [localTabs, location.pathname, navigate, onTabsChange, handleCloseContextMenu]
  );

  // 关闭其他标签
  const handleCloseOthers = useCallback(
    (tab: TabItem) => {
      const pinnedTabs = localTabs.filter((t) => t.pinned);
      const newTabs = [...pinnedTabs, tab];
      setLocalTabs(newTabs);
      onTabsChange?.(newTabs);

      if (
        !localTabs.find((t) => t.path === location.pathname)?.pinned &&
        location.pathname !== tab.path
      ) {
        navigate(tab.path);
      }
      handleCloseContextMenu();
    },
    [localTabs, location.pathname, navigate, onTabsChange, handleCloseContextMenu]
  );

  // 关闭所有标签（只保留固定的）
  const handleCloseAll = useCallback(() => {
    const newTabs = localTabs.filter((t) => t.pinned);
    setLocalTabs(newTabs);
    onTabsChange?.(newTabs);

    const firstPinned = newTabs[0];
    if (firstPinned && location.pathname !== firstPinned.path) {
      navigate(firstPinned.path);
    }
    handleCloseContextMenu();
  }, [localTabs, location.pathname, navigate, onTabsChange, handleCloseContextMenu]);

  // 拖拽开始
  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  // 拖拽进入
  const handleDragOver = useCallback(
    (event: React.DragEvent, index: number) => {
      event.preventDefault();
      if (draggedIndex === null || draggedIndex === index) return;

      const newTabs = [...localTabs];
      const draggedTab = newTabs[draggedIndex];
      newTabs.splice(draggedIndex, 1);
      newTabs.splice(index, 0, draggedTab);

      setLocalTabs(newTabs);
      setDraggedIndex(index);
    },
    [draggedIndex, localTabs]
  );

  // 拖拽结束
  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    onTabsChange?.(localTabs);
  }, [localTabs, onTabsChange]);

  // 滚动
  const handleScroll = useCallback((direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  }, []);

  // 渲染标签
  const renderTab = (tab: TabItem, index: number) => {
    const isActive = location.pathname === tab.path;
    const isDragging = draggedIndex === index;

    return (
      <Box
        key={`${tab.path}-${index}`}
        draggable={!isMobile}
        onDragStart={() => handleDragStart(index)}
        onDragOver={(e) => handleDragOver(e, index)}
        onDragEnd={handleDragEnd}
        onContextMenu={(e) => handleContextMenu(e, tab)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          px: 2,
          py: 1.25,
          minWidth: 120,
          maxWidth: 220,
          borderRadius: '8px 8px 0 0',
          cursor: isMobile ? 'pointer' : 'grab',
          opacity: isDragging ? 0.5 : 1,
          backgroundColor: isActive ? 'background.paper' : 'transparent',
          color: isActive ? 'primary.main' : 'text.secondary',
          fontWeight: isActive ? 600 : 400,
          fontSize: designTokens.typography.fontSize.scale['0.875rem'],
          position: 'relative',
          transition: 'all 0.2s ease',
          // 顶部激活指示条
          '&::before': isActive
            ? {
                content: '""',
                position: 'absolute',
                top: 0,
                left: '20%',
                width: '60%',
                height: 3,
                borderRadius: '0 0 3px 3px',
                backgroundColor: 'primary.main',
              }
            : {},
          // 底部边框隐藏
          borderBottom: isActive ? 'none' : 'none',
          marginBottom: isActive ? 0 : 0,
          // 阴影效果
          boxShadow: isActive ? `0 -2px 8px ${designTokens.colors.action.hover}` : 'none',
          '&:hover': {
            backgroundColor: isActive ? 'background.paper' : 'action.hover',
            color: isActive ? 'primary.main' : 'text.primary',
            transform: 'translateY(-1px)',
          },
          '&:active': {
            cursor: isMobile ? 'pointer' : 'grabbing',
          },
        }}
        onClick={() => navigate(tab.path)}
      >
        {!isMobile && (
          <GripVertical style={{ width: 14, height: 14, opacity: 0.5, flexShrink: 0 }} />
        )}
        <Box
          component='span'
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}
        >
          {tab.label}
        </Box>
        {tab.pinned && <Pin style={{ width: 12, height: 12, flexShrink: 0, opacity: 0.7 }} />}
        {tab.closable !== false && !tab.pinned && (
          <IconButton
            size='small'
            onClick={(e) => {
              e.stopPropagation();
              handleCloseTab(tab);
            }}
            sx={{
              p: 0.25,
              ml: 0.5,
              opacity: 0.7,
              '&:hover': {
                opacity: 1,
                backgroundColor: theme.palette.action.hover,
              },
            }}
            aria-label={i18n.t('shared.module_tabs.k1')}
          >
            <X style={{ width: 12, height: 12 }} />
          </IconButton>
        )}
      </Box>
    );
  };

  // 分离固定和非固定标签
  const pinnedTabs = localTabs.filter((t) => t.pinned);
  const unpinnedTabs = localTabs.filter((t) => !t.pinned);
  const orderedTabs = [...pinnedTabs, ...unpinnedTabs];

  if (localTabs.length === 0) return null;

  return (
    <Box
      sx={{
        backgroundColor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
        position: 'relative',
      }}
    >
      {/* 滚动按钮 - 移动端 */}
      {isMobile && (
        <>
          <IconButton
            size='small'
            onClick={() => handleScroll('left')}
            sx={{
              position: 'absolute',
              left: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 2,
              backgroundColor: 'background.paper',
              boxShadow: 1,
            }}
            aria-label={i18n.t('shared.module_tabs.k2')}
          >
            <ChevronLeft style={{ width: 16, height: 16 }} />
          </IconButton>
          <IconButton
            size='small'
            onClick={() => handleScroll('right')}
            sx={{
              position: 'absolute',
              right: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 2,
              backgroundColor: 'background.paper',
              boxShadow: 1,
            }}
            aria-label={i18n.t('shared.module_tabs.k3')}
          >
            <ChevronRight style={{ width: 16, height: 16 }} />
          </IconButton>
        </>
      )}

      {/* Tabs容器 */}
      <Box
        ref={scrollRef}
        sx={{
          display: 'flex',
          alignItems: 'center',
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
          px: isMobile ? 4 : 2,
        }}
      >
        {orderedTabs.map((tab, index) => renderTab(tab, index))}
      </Box>

      {/* 右键菜单 */}
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference='anchorPosition'
        anchorPosition={
          contextMenu !== null ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined
        }
      >
        <MenuItem onClick={() => contextMenu && handleTogglePin(contextMenu.tab)}>
          <ListItemIcon>
            {contextMenu?.tab.pinned ? (
              <PinOff style={{ width: 18, height: 18 }} />
            ) : (
              <Pin style={{ width: 18, height: 18 }} />
            )}
          </ListItemIcon>
          <ListItemText>
            {contextMenu?.tab.pinned
              ? i18n.t('shared.module_tabs.k5')
              : i18n.t('shared.module_tabs.k4')}
          </ListItemText>
        </MenuItem>
        {contextMenu?.tab.closable !== false && (
          <MenuItem onClick={() => contextMenu && handleCloseTab(contextMenu.tab)}>
            <ListItemIcon>
              <X style={{ width: 18, height: 18 }} />
            </ListItemIcon>
            <ListItemText>{i18n.t('shared.module_tabs.k6')}</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={() => contextMenu && handleCloseOthers(contextMenu.tab)}>
          {i18n.t('components.module_tabs.k0')}
        </MenuItem>
        <MenuItem onClick={handleCloseAll}>{i18n.t('shared.module_tabs.k7')}</MenuItem>
      </Menu>
    </Box>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const ModuleTabs: React.FC<ModuleTabsProps> = ({
  items,
  showHomeTab = true,
  pluginCode,
  onTabChange,
  legacyMode = false,

  // Legacy props
  tabs: legacyTabs,
  onTabsChange,
}) => {
  // 自动检测向后兼容模式：如果传入了旧版 tabs prop，则启用 legacy 模式
  const isLegacy = legacyMode || !!legacyTabs;

  // ── 新模式：从 items 或 pluginCode 获取数据 ──
  // 注意：useMemo 必须在所有条件 return 之前调用
  const resolvedItems = useMemo<ModuleTabItem[]>(() => {
    // 优先级 1：直接使用 items prop
    if (items && items.length > 0) {
      return items;
    }

    if (pluginCode) {
      const registryTabs = navigationRegistryV2.getModuleTabs(pluginCode);
      const sidebarItems = navigationRegistryV2.getSidebarNavItems(pluginCode);

      const pathMap = new Map<string, ModuleTabItem>();

      const addItems = (navItems: NavItem[] | undefined) => {
        if (!navItems) return;
        for (const item of navItems) {
          if (!pathMap.has(item.path)) {
            pathMap.set(item.path, {
              label: item.label,
              path: item.path,
            });
          }
        }
      };

      addItems(registryTabs);
      addItems(sidebarItems);

      const orderedPaths = new Set<string>();
      if (sidebarItems) sidebarItems.forEach((item) => orderedPaths.add(item.path));
      if (registryTabs) registryTabs.forEach((item) => orderedPaths.add(item.path));

      return Array.from(orderedPaths)
        .filter((path) => pathMap.has(path))
        .map((path) => pathMap.get(path)!);
    }

    // 优先级 3：无数据源，不渲染
    return [];
  }, [items, pluginCode]);

  // ── Legacy 模式 ──
  if (isLegacy) {
    return (
      <LegacyModuleTabs
        tabs={legacyTabs || []}
        pluginCode={pluginCode}
        onTabsChange={onTabsChange}
      />
    );
  }

  return (
    <SimpleTabBar
      items={resolvedItems}
      showHomeTab={showHomeTab}
      onTabChange={onTabChange}
    />
  );
};

export default ModuleTabs;
