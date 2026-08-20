import React, { useRef, useState, useMemo } from 'react';
import { Box, Typography, Tooltip, Chip, Badge as MuiBadge, Popover } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home } from 'lucide-react';
import { renderIcon } from '@/lib/iconMapping';
import { navigationRegistryV2 } from '@/lib/navigation';
import type { NavItem, NavGroup } from '@/lib/navigation/types';
import { NAV_GROUPS, SUITE_GROUPS } from '@/lib/navigation/types';
import { DASHBOARD_PATHS } from '@/routes/dashboard';
import { navItemSx, getNavigablePath } from './shared';
import { SidebarServiceStatus } from './SidebarServiceStatus';
import i18n from '@/i18n';

interface SidebarModuleTreeProps {
  collapsed: boolean;
  currentModule: string | null;
  moduleName: string;
  groupedModules: Record<string, NavItem[]>;
  suiteOrder: string[];
  moduleNavItems: NavItem[];
  serviceStatuses: Record<string, boolean>;
  checkPermission: (permission: string) => boolean;
}

export const SidebarModuleTree: React.FC<SidebarModuleTreeProps> = ({
  collapsed,
  currentModule,
  moduleName,
  groupedModules,
  suiteOrder,
  moduleNavItems,
  serviceStatuses,
  checkPermission,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsedModuleAnchorEl, setCollapsedModuleAnchorEl] = useState<HTMLElement | null>(null);
  const [collapsedModuleCode, setCollapsedModuleCode] = useState<string | null>(null);
  const collapsedPopoverCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isModuleMode = currentModule !== null;
  const displayNavItems = isModuleMode ? moduleNavItems : [];

  const collapsedModule = useMemo(() => {
    if (!collapsedModuleCode) return null;
    return navigationRegistryV2.getModule(collapsedModuleCode);
  }, [collapsedModuleCode]);

  const translatedNavGroups = useMemo(() => {
    const result: Record<string, { label: string; icon: string; order: number }> = {};
    for (const [key, info] of Object.entries(NAV_GROUPS)) {
      result[key] = {
        ...info,
        label: info.labelKey ? i18n.t(info.labelKey) : info.label,
      };
    }
    return result;
  }, [i18n.language]);

  const translatedSuiteGroups = useMemo(() => {
    const result: Record<string, { label: string; emoji: string; icon: string; order: number }> =
      {};
    for (const [key, info] of Object.entries(SUITE_GROUPS)) {
      result[key] = {
        ...info,
        label: info.labelKey ? i18n.t(info.labelKey) : info.label,
      };
    }
    return result;
  }, [i18n.language]);

  const collapsedModuleGroups = useMemo(() => {
    if (!collapsedModuleCode) return [] as Array<[NavGroup, NavItem[]]>;
    const grouped = navigationRegistryV2.getSidebarNavGrouped(collapsedModuleCode, checkPermission);
    return Object.entries(NAV_GROUPS)
      .map(([groupKey]) => [groupKey as NavGroup, grouped[groupKey as NavGroup] || []] as const)
      .filter(([, items]) => items.length > 0);
  }, [collapsedModuleCode, checkPermission]);

  const clearCollapsedPopoverCloseTimer = () => {
    if (collapsedPopoverCloseTimer.current) {
      clearTimeout(collapsedPopoverCloseTimer.current);
      collapsedPopoverCloseTimer.current = null;
    }
  };

  const openCollapsedModulePopover = (moduleCode: string, anchorEl: HTMLElement) => {
    clearCollapsedPopoverCloseTimer();
    setCollapsedModuleCode(moduleCode);
    setCollapsedModuleAnchorEl(anchorEl);
  };

  const scheduleCollapsedModulePopoverClose = () => {
    clearCollapsedPopoverCloseTimer();
    collapsedPopoverCloseTimer.current = setTimeout(() => {
      setCollapsedModuleAnchorEl(null);
      setCollapsedModuleCode(null);
    }, 140);
  };

  const navigateFromCollapsedPopover = (path?: string) => {
    if (!path) return;
    const navigablePath = getNavigablePath(path);
    if (!navigablePath) return;
    navigate(navigablePath);
    setCollapsedModuleAnchorEl(null);
    setCollapsedModuleCode(null);
  };

  return (
    <>
      <Popover
        open={collapsed && Boolean(collapsedModuleAnchorEl) && collapsedModuleGroups.length > 0}
        anchorEl={collapsedModuleAnchorEl}
        onClose={() => {
          setCollapsedModuleAnchorEl(null);
          setCollapsedModuleCode(null);
        }}
        anchorOrigin={{ vertical: 'center', horizontal: 'right' }}
        transformOrigin={{ vertical: 'center', horizontal: 'left' }}
        disableRestoreFocus
        sx={{
          pointerEvents: 'none',
          '& .MuiPaper-root': {
            pointerEvents: 'auto',
            width: 320,
            maxHeight: 'min(72vh, 640px)',
            ml: 1,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 12px 36px rgba(15, 23, 42, 0.16)',
            overflow: 'hidden',
          },
        }}
        slotProps={{
          paper: {
            onMouseEnter: clearCollapsedPopoverCloseTimer,
            onMouseLeave: scheduleCollapsedModulePopoverClose,
          },
        }}
      >
        <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {collapsedModule?.icon && renderIcon(collapsedModule.icon, 18)}
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.9375rem', fontWeight: 700, color: 'text.primary' }}>
                {collapsedModule?.nameKey
                  ? i18n.t(collapsedModule.nameKey)
                  : collapsedModule?.name || collapsedModuleCode}
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                {i18n.t('components.sidebar_module_tree.k0')}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            maxHeight: 'calc(min(72vh, 640px) - 64px)',
            overflowY: 'auto',
            py: 1,
            scrollbarWidth: 'thin',
            scrollbarColor: 'divider transparent',
          }}
        >
          {collapsedModuleGroups.map(([groupKey, items]) => {
            const groupInfo = translatedNavGroups[groupKey] || NAV_GROUPS[groupKey];
            return (
              <Box
                key={groupKey}
                sx={{ px: 1, '& + &': { mt: 0.75 } }}
              >
                <Typography
                  sx={{
                    px: 1,
                    py: 0.75,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'text.secondary',
                    letterSpacing: '0.04em',
                  }}
                >
                  {groupInfo.label}
                </Typography>
                {items.map((navItem) => {
                  const itemActive = Boolean(
                    navItem.path === location.pathname ||
                    (navItem.path && location.pathname.startsWith(`${navItem.path}/`))
                  );
                  return (
                    <Box
                      key={navItem.code}
                      component='button'
                      type='button'
                      role='menuitem'
                      onClick={() => navigateFromCollapsedPopover(navItem.path)}
                      sx={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 1,
                        py: 0.875,
                        border: 0,
                        borderRadius: 1,
                        bgcolor: itemActive ? 'primary.50' : 'transparent',
                        color: itemActive ? 'primary.main' : 'text.primary',
                        textAlign: 'left',
                        cursor: navItem.path ? 'pointer' : 'default',
                        '&:hover': {
                          bgcolor: itemActive ? 'primary.50' : 'action.hover',
                        },
                      }}
                    >
                      {navItem.icon ? (
                        renderIcon(navItem.icon, 16)
                      ) : (
                        <Box
                          sx={{
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            bgcolor: itemActive ? 'primary.main' : 'divider',
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography
                          sx={{
                            fontSize: '0.875rem',
                            fontWeight: itemActive ? 700 : 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {navItem.label}
                        </Typography>
                        {navItem.path && (
                          <Typography
                            sx={{
                              fontSize: '0.6875rem',
                              color: 'text.secondary',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {navItem.path}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            );
          })}
        </Box>
      </Popover>

      <Box
        sx={{
          py: 1,
          px: 1,
          overflowY: 'auto',
          flex: 1,
          scrollbarWidth: 'thin',
          scrollbarColor: 'divider transparent',
          '&::-webkit-scrollbar': {
            width: 4,
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'divider',
            borderRadius: 99,
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'transparent',
          },
        }}
      >
        {isModuleMode && (
          <>
            <Box
              component='button'
              role='menuitem'
              tabIndex={0}
              onClick={() => navigate(DASHBOARD_PATHS.dashboard)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(DASHBOARD_PATHS.dashboard);
                }
              }}
              sx={navItemSx(collapsed, false, true)}
            >
              <Home style={{ width: 18, height: 18, flexShrink: 0 }} />
              {!collapsed && (
                <Typography sx={{ fontSize: 14, fontWeight: 500 }}>
                  {i18n.t('shared.sidebar_module_tree.k0')}
                </Typography>
              )}
            </Box>

            {!collapsed && (
              <Typography
                sx={{
                  px: 2,
                  py: 1.5,
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  userSelect: 'none',
                }}
              >
                {moduleName}
              </Typography>
            )}
          </>
        )}

        {!isModuleMode && (
          <>
            {suiteOrder.map((suiteKey, groupIndex) => {
              const items = groupedModules[suiteKey] || [];
              if (items.length === 0) return null;
              const suiteInfo =
                translatedSuiteGroups[suiteKey] ||
                translatedSuiteGroups.other ||
                SUITE_GROUPS.other;
              const isFirstGroup = groupIndex === 0;

              return (
                <React.Fragment key={suiteKey}>
                  {!isFirstGroup && (
                    <Box sx={{ my: 1, mx: 1, borderBottom: 1, borderColor: 'divider' }} />
                  )}
                  {!collapsed && (
                    <Typography
                      sx={{
                        px: 2,
                        py: 1,
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'text.secondary',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        userSelect: 'none',
                      }}
                    >
                      {suiteInfo.label}
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {items.map((item: NavItem, index: number) => {
                      const itemModuleCode = item.moduleCode || item.code;
                      const itemHasPopoverTree =
                        navigationRegistryV2.getSidebarNavItems(itemModuleCode, checkPermission)
                          .length > 0;
                      const isActive = Boolean(
                        item.path === location.pathname ||
                        (item.path && location.pathname.startsWith(`${item.path}/`))
                      );
                      const NavButton = (
                        <Box
                          component='button'
                          role='menuitem'
                          tabIndex={0}
                          key={item.code || `${item.label}-${index}`}
                          onClick={() => item.path && navigate(item.path)}
                          onMouseEnter={(e) => {
                            if (collapsed && itemHasPopoverTree) {
                              openCollapsedModulePopover(itemModuleCode, e.currentTarget);
                            }
                          }}
                          onMouseLeave={() => {
                            if (collapsed && itemHasPopoverTree) {
                              scheduleCollapsedModulePopoverClose();
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              item.path && navigate(item.path);
                            }
                          }}
                          aria-current={isActive ? 'page' : undefined}
                          sx={navItemSx(collapsed, isActive, true)}
                        >
                          {renderIcon(item.icon, 18) || (
                            <Typography sx={{ width: 18, height: 18, fontSize: 18 }} />
                          )}
                          {!collapsed && (
                            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography sx={{ fontSize: 14, fontWeight: isActive ? 600 : 500 }}>
                                {item.label}
                              </Typography>
                              {item.badge && (
                                <Chip
                                  size='small'
                                  label={item.badge}
                                  sx={{
                                    height: 16,
                                    fontSize: '0.625rem',
                                    fontWeight: 600,
                                    bgcolor: 'error.main',
                                    color: 'common.white',
                                    '& .MuiChip-label': {
                                      px: 0.5,
                                    },
                                  }}
                                />
                              )}
                            </Box>
                          )}
                          {!collapsed && (
                            <SidebarServiceStatus
                              moduleCode={item.moduleCode || item.code}
                              serviceStatuses={serviceStatuses}
                            />
                          )}
                          {collapsed && item.badge && (
                            <MuiBadge
                              badgeContent={item.badge}
                              color='error'
                              sx={{
                                position: 'absolute',
                                top: 4,
                                right: 4,
                                '& .MuiBadge-badge': {
                                  fontSize: '0.625rem',
                                  height: 14,
                                  minWidth: 14,
                                },
                              }}
                            />
                          )}
                        </Box>
                      );
                      return collapsed ? (
                        <Tooltip
                          key={item.code || `${item.label}-${index}`}
                          title={item.label}
                          placement='right'
                          arrow
                          disableHoverListener={itemHasPopoverTree}
                        >
                          {NavButton}
                        </Tooltip>
                      ) : (
                        NavButton
                      );
                    })}
                  </Box>
                </React.Fragment>
              );
            })}
          </>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {displayNavItems.map((item: NavItem, index: number) => {
            const isActive = Boolean(
              item.path === location.pathname ||
              (item.path && location.pathname.startsWith(`${item.path}/`))
            );
            const NavButton = (
              <Box
                component='button'
                role='menuitem'
                tabIndex={0}
                key={item.code || `${item.label}-${index}`}
                onClick={() => item.path && navigate(item.path)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    item.path && navigate(item.path);
                  }
                }}
                aria-current={isActive ? 'page' : undefined}
                sx={navItemSx(collapsed, isActive, item.path ? true : false)}
              >
                {item.icon ? (
                  renderIcon(item.icon, 18)
                ) : (
                  <Typography
                    sx={{
                      width: 18,
                      height: 18,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    {item.label.charAt(0)}
                  </Typography>
                )}
                {!collapsed && (
                  <Typography sx={{ fontSize: 14, fontWeight: 500 }}>{item.label}</Typography>
                )}
              </Box>
            );
            return collapsed ? (
              <Tooltip
                key={item.code || `${item.label}-${index}`}
                title={item.label}
                placement='right'
                arrow
              >
                {NavButton}
              </Tooltip>
            ) : (
              NavButton
            );
          })}
        </Box>
      </Box>
    </>
  );
};

export default SidebarModuleTree;
