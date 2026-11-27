import { iconMd, iconLg } from '../sharedStyles';
import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Paper,
  Skeleton,
  TextField,
  Tabs,
  Tab,
  Chip,
  useTheme,
  useMediaQuery,
  Button,
} from '@mui/material';
import i18n from '@/i18n';
import { analyzeGradient } from '@/theme/gradient';
import { ChevronRight, RefreshCw, MoreHorizontal } from 'lucide-react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { BackButton } from '@topems/shared-components';

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
  breadcrumbs: _manualBreadcrumbs, // G1: 面包屑统一由 AppShell 自动面包屑渲染
  pathTabs: manualPathTabs,
  autoBreadcrumbs: _autoBreadcrumbs,
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
  detailItemName: _detailItemName, // pathTabs 停用自动派生后不再使用，保留接口
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();

  // 页面图标底色/前景：gradient 里出现 undefined（令牌路径不存在）时整条 background 会被浏览器丢弃，
  // 只剩 color:white 压在卡片白底上（1:1 不可见）。这里做可用性判定 + 按底色取对比文字色。
  const resolveColorToken = (token?: string): string | undefined => {
    if (!token) return undefined;
    const resolved = token
      .split('.')
      .reduce<unknown>(
        (acc, key) => (acc == null ? acc : (acc as Record<string, unknown>)[key]),
        theme.palette
      );
    return typeof resolved === 'string' ? resolved : undefined;
  };
  const gradient = React.useMemo(() => analyzeGradient(pageGradient), [pageGradient]);
  const gradientUsable = gradient.usable;
  const iconBgColor = resolveColorToken(pageColor) ?? theme.palette.primary.main;
  const iconForeground = gradientUsable
    ? theme.palette.getContrastText(gradient.average ?? iconBgColor)
    : theme.palette.getContrastText(iconBgColor);

  // G1: pathTabs 仅接受显式传入，不再从路由自动派生（层级导航统一由 AppShell 面包屑渲染）
  const resolvedPathTabs: PathTabItem[] | undefined = React.useMemo(() => {
    if (manualPathTabs && manualPathTabs.length > 0) {
      return manualPathTabs;
    }
    return;
  }, [manualPathTabs]);

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
        placeholder={search.placeholder || i18n.t('components.page_header.k0')}
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
          <Tooltip title={i18n.t('templates.page_header.k0')}>
            <IconButton
              size='small'
              aria-label={i18n.t('templates.page_header.k1')}
            >
              <MoreHorizontal style={iconLg} />
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

        {/* Banner 模式 */}
        {banner && !loading && (
          <Paper
            elevation={0}
            sx={{
              background: banner.gradient,
              borderRadius: 3,
              height: banner.height || 80,
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 3,
              color: 'common.white',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {title && (
                <Typography
                  variant='h5'
                  component='h1'
                  sx={{ fontWeight: 700, color: 'common.white' }}
                >
                  {title}
                </Typography>
              )}
              {banner.chip && (
                <Chip
                  label={banner.chip}
                  size='small'
                  sx={{
                    bgcolor: 'action.disabledBackground',
                    color: 'common.white',
                    fontWeight: 600,
                    ml: 2,
                  }}
                />
              )}
              {banner.summary && (
                <Typography
                  variant='body2'
                  sx={{
                    opacity: 0.9,
                    ml: 2,
                    color: 'common.white',
                  }}
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
                      color: 'common.white',
                      borderColor: 'common.white',
                      '&:hover': {
                        borderColor: 'common.white',
                        bgcolor: 'action.disabledBackground',
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
                  size='small'
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
                    borderRadius: 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    ...(gradientUsable
                      ? { background: pageGradient }
                      : { bgcolor: pageColor || 'primary.main' }),
                    color: iconForeground,
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
                      {title && (
                        <Typography
                          variant={isMobile ? 'h5' : 'h4'}
                          component='h1'
                          sx={{ fontWeight: 600 }}
                        >
                          {title}
                        </Typography>
                      )}
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
                <Tooltip title={i18n.t('templates.page_header.k2')}>
                  <IconButton
                    size='small'
                    onClick={onRefresh}
                    aria-label={i18n.t('templates.page_header.k3')}
                  >
                    <RefreshCw style={iconMd} />
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
