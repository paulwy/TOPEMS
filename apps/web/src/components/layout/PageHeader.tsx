import React from 'react';
import {
  Box,
  Button,
  Typography,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  useTheme,
  useMediaQuery,
  Link,
  Paper,
  Skeleton,
  Chip,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import { Search, Plus, ChevronRight, RefreshCw, MoreHorizontal } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';
import { HelpButton, BackButton } from '../common';
import { useAutoBreadcrumbs } from '@/hooks';

// ============ 类型定义 ============

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

export interface PageHeaderAction {
  /** 按钮标签 */
  label: string;
  /** 按钮图标 */
  icon?: React.ReactNode;
  /** 点击回调 */
  onClick?: () => void;
  /** 跳转链接 */
  href?: string;
  /** 按钮变体 */
  variant?: 'contained' | 'outlined' | 'text';
  /** 按钮颜色 */
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否加载中 */
  loading?: boolean;
  /** 提示文字 */
  tooltip?: string;
  /** 按钮尺寸 */
  size?: 'small' | 'medium' | 'large';
}

export interface PageHeaderProps {
  /** 页面标题 */
  title: string;
  /** 副标题 */
  subtitle?: string;
  /** 描述 */
  description?: string;
  /** 面包屑导航 */
  breadcrumbs?: BreadcrumbItem[];
  /** 是否自动生成面包屑 */
  autoBreadcrumbs?: boolean;
  /**
   * 自定义图标（仅用于展示，兼容旧 API）
   * @deprecated 该字段当前未在头部渲染，如需图标请使用 actions 中的按钮
   */
  icon?: React.ReactNode;
  /** 页面图标（用于标题左侧展示） */
  pageIcon?: React.ReactNode;
  /** 页面图标颜色 */
  pageColor?: string;
  /** 返回按钮配置 */
  backButton?: {
    href?: string;
    onClick?: () => void;
    tooltip?: string;
    visible?: boolean;
  };
  /**
   * 是否显示返回按钮（兼容旧 API，等价于 backButton）
   * @deprecated 请使用 backButton
   */
  showBack?: boolean;
  /**
   * 返回按钮点击回调（兼容旧 API，等价于 backButton.onClick）
   * @deprecated 请使用 backButton.onClick
   */
  onBack?: () => void;
  /** 搜索框配置 */
  searchBox?: {
    value?: string;
    onChange?: (value: string) => void;
    onSearch?: (value: string) => void;
    placeholder?: string;
    size?: 'small' | 'medium';
  };
  /** 新建按钮配置 */
  createButton?: {
    label?: string;
    onClick?: () => void;
    href?: string;
    disabled?: boolean;
  };
  /** 操作按钮列表（支持配置对象数组或自定义 JSX） */
  actions?: PageHeaderAction[] | React.ReactNode;
  /** 帮助内容 */
  helpContent?: React.ReactNode;
  /** 帮助标题 */
  helpTitle?: string;
  /** 自定义右侧内容 */
  rightContent?: React.ReactNode;
  /** 自定义工具栏 */
  customToolbar?: React.ReactNode;
  /** 是否显示加载状态 */
  loading?: boolean;
  /** 刷新回调 */
  onRefresh?: () => void;
  /** 统计信息 */
  stats?: {
    label: string;
    value: string | number;
    color?: string;
    icon?: React.ReactElement;
  }[];
  /** 标签页配置 */
  tabs?: {
    label: string;
    value: string;
    active?: boolean;
    disabled?: boolean;
  }[];
  /** 标签页切换回调 */
  onTabChange?: (value: string) => void;
  /** 徽章配置 */
  badge?: {
    label: string;
    color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning';
    variant?: 'standard' | 'dot';
  };
  /** 最大宽度 */
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  /** 是否紧凑模式 */
  compact?: boolean;
  /** 是否显示分隔线 */
  showDivider?: boolean;
  /** 自定义样式 */
  sx?: object;
  /** 额外内容 */
  children?: React.ReactNode;
}

// ============ PageHeader 组件 ============

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  description,
  breadcrumbs: manualBreadcrumbs,
  autoBreadcrumbs = false,
  icon: _icon,
  pageIcon,
  pageColor,
  backButton: backButtonProp,
  showBack,
  onBack,
  searchBox,
  createButton,
  actions,
  helpContent,
  helpTitle,
  rightContent,
  customToolbar,
  loading = false,
  onRefresh,
  stats,
  tabs,
  onTabChange,
  badge,
  maxWidth = false,
  compact = false,
  showDivider = false,
  sx,
  children,
}) => {
  // 兼容旧 API：showBack + onBack → backButton
  const backButton = backButtonProp || (showBack ? { onClick: onBack } : undefined);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // 自动生成面包屑
  const autoItems = useAutoBreadcrumbs({
    includeHome: true,
  });

  const breadcrumbs = manualBreadcrumbs && manualBreadcrumbs.length > 0
    ? manualBreadcrumbs
    : autoBreadcrumbs
    ? autoItems
    : undefined;

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchBox?.onSearch) {
      searchBox.onSearch((e.target as HTMLInputElement).value);
    }
  };

  // 渲染面包屑
  const renderBreadcrumbs = () => {
    if (!breadcrumbs || breadcrumbs.length === 0) return null;

    return (
      <Box sx={{ width: '100%', mb: 1 }}>
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;
          return (
            <span
              key={index}
              style={{ display: 'inline-flex', alignItems: 'center' }}
            >
              {item.href ? (
                <Link
                  component={RouterLink}
                  to={item.href}
                  color='text.secondary'
                  sx={{
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' },
                    fontSize: '0.875rem',
                  }}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ) : (
                <Typography
                  variant='body2'
                  color={isLast ? 'text.primary' : 'text.secondary'}
                >
                  {item.icon}
                  {item.label}
                </Typography>
              )}
              {!isLast && (
                <ChevronRight
                  style={{
                    width: 16,
                    height: 16,
                    color: 'text.disabled',
                    marginLeft: 4,
                    marginRight: 4,
                  }}
                />
              )}
            </span>
          );
        })}
      </Box>
    );
  };

  // 渲染统计信息
  const renderStats = () => {
    if (!stats || stats.length === 0) return null;

    return (
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
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

  // 渲染标签页
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

  // 渲染徽章
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

  // 渲染操作按钮
  const renderActions = () => {
    if (!actions) return null;

    if (!Array.isArray(actions)) return actions;

    const visibleActions = isMobile ? actions.slice(0, 2) : actions;
    const hiddenActions = isMobile ? actions.slice(2) : [];

    return (
      <>
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
      </>
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
        ...sx,
      }}
    >
      <Box
        sx={{
          maxWidth: maxWidth || false,
          mx: maxWidth ? 'auto' : undefined,
          px: maxWidth ? { xs: 2, sm: 3 } : undefined,
          py: compact ? 1.5 : 3,
        }}
      >
        {/* 面包屑导航 */}
        {renderBreadcrumbs()}

        {/* 标题栏 */}
        <Box
          sx={{
            display: 'flex',
            alignItems: { xs: 'flex-start', sm: 'center' },
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          {/* 左侧：返回按钮 + 页面图标 + 标题 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* 返回按钮 */}
            {backButton && backButton.visible !== false && (
              <BackButton
                size='small'
                onClick={backButton.onClick}
                href={backButton.href}
                tooltip={backButton.tooltip}
              />
            )}

            {/* 页面图标 */}
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
                  <Skeleton width={200} height={32} />
                  {subtitle && <Skeleton width={150} height={20} />}
                </>
              ) : (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography
                      variant={isMobile ? 'h5' : 'h4'}
                      sx={{ fontWeight: 600, lineHeight: 1.3 }}
                    >
                      {title}
                    </Typography>
                    {renderBadge()}
                  </Box>
                  {subtitle && (
                    <Typography
                      variant='body2'
                      color='text.secondary'
                      sx={{ mt: 0.5 }}
                    >
                      {subtitle}
                    </Typography>
                  )}
                  {description && (
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

          {/* 右侧：搜索框 + 操作按钮 + 帮助按钮 */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              flexWrap: 'wrap',
            }}
          >
            {/* 搜索框 */}
            {searchBox && !isMobile && (
              <TextField
                size={searchBox.size || 'small'}
                placeholder={searchBox.placeholder || '搜索...'}
                value={searchBox.value}
                onChange={(e) => searchBox.onChange?.(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                sx={{
                  minWidth: 200,
                  maxWidth: 300,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position='start'>
                        <Search style={{ width: 18, height: 18, opacity: 0.5 }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />
            )}

            {/* 新建按钮 */}
            {createButton && (
              <Button
                variant='contained'
                color='primary'
                startIcon={<Plus style={{ width: 18, height: 18 }} />}
                onClick={createButton.onClick}
                disabled={createButton.disabled}
                size={isMobile ? 'small' : 'medium'}
              >
                {createButton.label || '新建'}
              </Button>
            )}

            {/* 自定义工具栏 */}
            {customToolbar}

            {/* 其他操作按钮 */}
            {!loading && renderActions()}

            {/* 刷新按钮 */}
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

            {/* 自定义右侧内容 */}
            {rightContent}

            {/* 帮助按钮 */}
            {helpContent && (
              <HelpButton
                title={helpTitle}
                content={helpContent}
                size='small'
              />
            )}
          </Box>
        </Box>

        {/* 移动端搜索 */}
        {searchBox && isMobile && (
          <Box sx={{ mt: 2 }}>
            <TextField
              size={searchBox.size || 'small'}
              placeholder={searchBox.placeholder || '搜索...'}
              value={searchBox.value}
              onChange={(e) => searchBox.onChange?.(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position='start'>
                      <Search style={{ width: 18, height: 18, opacity: 0.5 }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>
        )}

        {/* 统计信息 */}
        {!loading && renderStats()}

        {/* 标签页 */}
        {renderTabs()}

        {/* 额外内容 */}
        {children && <Box sx={{ mt: 2 }}>{children}</Box>}
      </Box>
    </Paper>
  );
};

export default PageHeader;
