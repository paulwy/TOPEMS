import React from 'react';
import {
  Box,
  Typography,
  Breadcrumbs,
  Link,
  IconButton,
  Tooltip,
  Paper,
  Divider,
  Skeleton,
  TextField,
  Tabs,
  Tab,
  Chip,
  useTheme,
  useMediaQuery,
  Button,
} from '@mui/material';
import {
  ChevronRight,
  RefreshCw,
  Plus,
  Download,
  Upload,
  Filter,
  MoreHorizontal,
} from 'lucide-react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { useAutoBreadcrumbs } from '@/hooks';
import { BackButton } from '../common';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

export interface PathTabItem {
  label: string;
  href?: string;
  active?: boolean;
}

export interface PageAction {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
  disabled?: boolean;
  loading?: boolean;
  tooltip?: string;
  size?: 'small' | 'medium' | 'large';
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  /** @deprecated Use pathTabs instead for path-based tab navigation */
  breadcrumbs?: BreadcrumbItem[];
  /** Path-based navigation context - replaces breadcrumbs. If provided, auto-derivation is skipped. */
  pathTabs?: PathTabItem[];
  /** When true and breadcrumbs are provided, auto-derive pathTabs from breadcrumbs + title. Default: true */
  autoBreadcrumbs?: boolean;
  actions?: PageAction[];
  backButton?: {
    href?: string;
    onClick?: () => void;
    visible?: boolean;
  };
  onRefresh?: () => void;
  loading?: boolean;
  children?: React.ReactNode;
  /** @deprecated Hidden by default. Pass only when explicitly needed. */
  pageIcon?: React.ReactNode;
  pageColor?: string;
  pageGradient?: string;
  banner?: {
    gradient: string;
    chip?: string;
    summary?: string;
    height?: number;
  };
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    size?: 'small' | 'medium';
  };
  /** @deprecated Hidden by default. Pass only when explicitly needed. */
  stats?: {
    label: string;
    value: string | number;
    color?: string;
    icon?: React.ReactElement;
  }[];
  tabs?: {
    label: string;
    value: string;
    active?: boolean;
    disabled?: boolean;
  }[];
  onTabChange?: (value: string) => void;
  badge?: {
    label: string;
    color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning';
    variant?: 'standard' | 'dot';
  };
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  compact?: boolean;
  showDivider?: boolean;
  customToolbar?: React.ReactNode;
  /** Entity name for detail pages (e.g. employee name). Used as the last path tab label. */
  detailItemName?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  description,
  breadcrumbs: manualBreadcrumbs,
  pathTabs: manualPathTabs,
  autoBreadcrumbs = true,
  actions,
  backButton,
  onRefresh,
  loading,
  children,
  pageIcon,
  pageColor,
  pageGradient,
  banner,
  search,
  stats,
  tabs,
  onTabChange,
  badge,
  maxWidth = 'xl',
  compact = false,
  showDivider = true,
  customToolbar,
  detailItemName,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const location = useLocation();
  const navigate = useNavigate();

  const autoItems = useAutoBreadcrumbs({
    includeHome: true,
  });

  const breadcrumbs =
    manualBreadcrumbs && manualBreadcrumbs.length > 0
      ? manualBreadcrumbs
      : autoBreadcrumbs
        ? autoItems
        : undefined;

  // Determine pathTabs: explicit > auto-derived from route path > legacy breadcrumbs
  const resolvedPathTabs: PathTabItem[] | undefined = React.useMemo(() => {
    // 1. If explicit pathTabs provided, use them
    if (manualPathTabs && manualPathTabs.length > 0) {
      return manualPathTabs;
    }

    // 2. Auto-derive from current route path using NavigationRegistry
    const pathname = location.pathname;

    // Don't show path tabs for platform-level pages
    const platformPaths = ['/', '/dashboard', '/modules'];
    if (platformPaths.includes(pathname)) return;

    const autoBreadcrumbItems = autoItems;

    if (!autoBreadcrumbItems || autoBreadcrumbItems.length === 0) {
      return;
    }

    const tabs: PathTabItem[] = autoBreadcrumbItems.map((item, index) => ({
      label: item.label,
      href: item.href,
      active: index === autoBreadcrumbItems.length - 1,
    }));

    if (detailItemName && tabs.length > 0) {
      tabs[tabs.length - 1] = {
        ...tabs[tabs.length - 1],
        label: detailItemName,
      };
    }

    return tabs.length > 1 ? tabs : undefined;
  }, [manualPathTabs, location.pathname, detailItemName, autoItems]);

  const renderBreadcrumbs = () => {
    if (!breadcrumbs || breadcrumbs.length === 0) return null;

    return (
      <Breadcrumbs
        separator={<ChevronRight style={{ width: 16, height: 16 }} />}
        sx={{ mb: 2 }}
      >
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;

          if (isLast || !item.href) {
            return (
              <Typography
                key={index}
                color='text.primary'
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  fontSize: '0.875rem',
                }}
              >
                {item.icon}
                {item.label}
              </Typography>
            );
          }

          return (
            <Link
              key={index}
              component={RouterLink}
              to={item.href}
              color='inherit'
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                fontSize: '0.875rem',
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </Breadcrumbs>
    );
  };

  const renderPathTabs = () => {
    if (!resolvedPathTabs || resolvedPathTabs.length === 0) return null;

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
        {resolvedPathTabs.map((tab, index) => (
          <React.Fragment key={index}>
            {index > 0 && (
              <ChevronRight sx={{ fontSize: 14, color: 'text.disabled', flexShrink: 0 }} />
            )}
            <Box
              component='span'
              onClick={() => tab.href && navigate(tab.href)}
              sx={{
                fontSize: 13,
                color: tab.active ? 'primary.main' : 'text.secondary',
                fontWeight: tab.active ? 600 : 400,
                cursor: tab.href ? 'pointer' : 'default',
                whiteSpace: 'nowrap',
                '&:hover': tab.href && !tab.active ? { color: 'primary.main' } : {},
              }}
            >
              {tab.label}
            </Box>
          </React.Fragment>
        ))}
      </Box>
    );
  };

  const renderSearch = () => {
    if (!search) return null;
    return (
      <TextField
        size={search.size || 'small'}
        value={search.value}
        onChange={(e) => search.onChange(e.target.value)}
        placeholder={search.placeholder || '搜索...'}
        sx={{
          width: { xs: '100%', sm: 280 },
          '& .MuiOutlinedInput-root': {
            borderRadius: 1,
          },
        }}
      />
    );
  };

  const renderStats = () => {
    if (!stats || stats.length === 0) return null;
    return (
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {stats.map((stat, index) => (
          <Chip
            key={index}
            label={`${stat.label}: ${stat.value}`}
            icon={stat.icon || undefined}
            sx={{
              bgcolor: stat.color || 'primary.light',
              color: stat.color ? 'text.primary' : 'primary.main',
              fontWeight: 500,
            }}
          />
        ))}
      </Box>
    );
  };

  const renderTabs = () => {
    if (!tabs || tabs.length === 0) return null;
    const activeTab = tabs.find((t) => t.active)?.value || tabs[0]?.value;
    return (
      <Tabs
        value={activeTab}
        onChange={(_, newValue) => onTabChange?.(newValue)}
        sx={{ mt: 2, borderBottom: 1, borderColor: 'divider' }}
        variant='scrollable'
        scrollButtons='auto'
      >
        {tabs.map((tab) => (
          <Tab
            key={tab.value}
            label={tab.label}
            value={tab.value}
            disabled={tab.disabled}
          />
        ))}
      </Tabs>
    );
  };

  const renderActions = () => {
    if (!actions || actions.length === 0) return null;

    const visibleActions = isMobile ? actions.slice(0, 2) : actions;
    const hiddenActions = isMobile ? actions.slice(2) : [];

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {visibleActions.map((action, index) => {
          const buttonContent = (
            <Button
              key={index}
              variant={action.variant || 'outlined'}
              color={action.color || 'primary'}
              startIcon={action.icon}
              onClick={action.onClick}
              disabled={action.disabled || action.loading}
              href={action.href}
              component={action.href ? RouterLink : 'button'}
              size={action.size || (isMobile ? 'small' : 'medium')}
            >
              {!isMobile && action.label}
            </Button>
          );

          if (action.tooltip) {
            return (
              <Tooltip
                key={index}
                title={action.tooltip}
              >
                <span>{buttonContent}</span>
              </Tooltip>
            );
          }

          return buttonContent;
        })}

        {hiddenActions.length > 0 && (
          <Tooltip title='更多操作'>
            <IconButton size='small'>
              <MoreHorizontal style={{ width: 20, height: 20 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    );
  };

  const renderBadge = () => {
    if (!badge) return null;
    return (
      <Chip
        label={badge.label}
        color={badge.color || 'secondary'}
        variant={badge.variant === 'dot' ? 'filled' : 'filled'}
        size='small'
        sx={{
          ml: 1,
          ...(badge.variant === 'dot' && {
            borderRadius: '50%',
            minWidth: 8,
            height: 8,
            padding: 0,
            '& .MuiChip-label': { display: 'none' },
          }),
        }}
      />
    );
  };

  // Whether to show old-style breadcrumbs (only when pathTabs are not active)
  const showLegacyBreadcrumbs = !resolvedPathTabs && breadcrumbs && breadcrumbs.length > 0;

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 0,
        borderBottom: showDivider ? 1 : 0,
        borderColor: 'divider',
        mb: 3,
        ...(compact && { py: 1 }),
      }}
    >
      <Box
        sx={{
          maxWidth: maxWidth || false,
          mx: 'auto',
          px: { xs: 2, sm: 3 },
          py: compact ? 1.5 : 3,
        }}
      >
        {/* 路径标签导航（替代面包屑） */}
        {renderPathTabs()}

        {/* 面包屑导航（向后兼容，仅在 pathTabs 未激活时显示） */}
        {showLegacyBreadcrumbs && renderBreadcrumbs()}

        {/* Banner 模式 */}
        {banner && !loading && (
          <Paper
            elevation={0}
            sx={{
              background: banner.gradient,
              borderRadius: 2,
              height: banner.height || 80,
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 3,
              color: '#fff',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: '#fff' }}
              >
                {title}
              </Typography>
              {banner.chip && (
                <Chip
                  label={banner.chip}
                  size='small'
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 600, ml: 2 }}
                />
              )}
              {banner.summary && (
                <Typography
                  variant='body2'
                  sx={{ opacity: 0.9, ml: 2, color: '#fff' }}
                >
                  {banner.summary}
                </Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {actions &&
                actions.map((action, index) => (
                  <Button
                    key={index}
                    variant='outlined'
                    onClick={action.onClick}
                    disabled={action.disabled || action.loading}
                    href={action.href}
                    component={action.href ? RouterLink : 'button'}
                    size={action.size || (isMobile ? 'small' : 'medium')}
                    startIcon={action.icon}
                    sx={{
                      color: '#fff',
                      borderColor: 'rgba(255,255,255,0.5)',
                      '&:hover': {
                        borderColor: '#fff',
                        bgcolor: 'rgba(255,255,255,0.1)',
                      },
                    }}
                  >
                    {!isMobile && action.label}
                  </Button>
                ))}
            </Box>
          </Paper>
        )}

        {/* 标题栏 */}
        {!banner && (
          <Box
            sx={{
              display: 'flex',
              alignItems: { xs: 'flex-start', sm: 'center' },
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {/* 返回按钮 */}
              {backButton && backButton.visible !== false && (
                <BackButton
                  size='sm'
                  onClick={backButton.onClick}
                  href={backButton.href}
                />
              )}

              {/* 页面图标 - only render when explicitly provided */}
              {pageIcon && (
                <Box
                  sx={{
                    width: compact ? 32 : 40,
                    height: compact ? 32 : 40,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: pageColor || 'primary.main',
                    ...(pageGradient && { bgcolor: undefined, background: pageGradient }),
                    color: 'white',
                  }}
                >
                  {pageIcon}
                </Box>
              )}

              {/* 标题和副标题 */}
              <Box>
                {loading ? (
                  <>
                    <Skeleton
                      width={200}
                      height={32}
                    />
                    {subtitle && (
                      <Skeleton
                        width={150}
                        height={20}
                      />
                    )}
                  </>
                ) : (
                  <>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography
                        variant={isMobile ? 'h5' : 'h4'}
                        sx={{ fontWeight: 600 }}
                      >
                        {title}
                      </Typography>
                      {renderBadge()}
                    </Box>
                    {subtitle && (
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {subtitle}
                      </Typography>
                    )}
                    {description && !compact && (
                      <Typography
                        variant='body2'
                        color='text.secondary'
                        sx={{ mt: 0.5 }}
                      >
                        {description}
                      </Typography>
                    )}
                  </>
                )}
              </Box>
            </Box>

            {/* 搜索和操作按钮区域 */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                flexWrap: 'wrap',
              }}
            >
              {search && !isMobile && renderSearch()}
              {customToolbar}
              {!loading && renderActions()}
              {onRefresh && !loading && (
                <Tooltip title='刷新'>
                  <IconButton
                    size='small'
                    onClick={onRefresh}
                  >
                    <RefreshCw style={{ width: 18, height: 18 }} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>
        )}

        {/* 移动端搜索 */}
        {search && isMobile && <Box sx={{ mt: 2 }}>{renderSearch()}</Box>}

        {/* 统计信息 */}
        {stats && stats.length > 0 && !loading && <Box sx={{ mt: 2 }}>{renderStats()}</Box>}

        {/* 标签页 */}
        {tabs && renderTabs()}

        {/* 额外内容 */}
        {children && <Box sx={{ mt: 2 }}>{children}</Box>}
      </Box>
    </Paper>
  );
};

export default PageHeader;
