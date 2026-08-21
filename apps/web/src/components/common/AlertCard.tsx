/**
 * 统一的AlertCard组件
 * 整合了common和根目录两个版本的AlertCard组件
 * 支持卡片模式和面板模式，多种样式变体，操作按钮等
 */
import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Divider,
  Alert,
  AlertTitle,
  Button,
} from '@mui/material';
import i18n from '@/i18n';
import type { SxProps, Theme } from '@mui/material/styles';
import { AlertTriangle, AlertCircle, CheckCircle, Info, X, RefreshCw } from 'lucide-react';
import { designTokens } from '@topems/tokens';

// ============ 类型定义 ============

/**
 * 警告级别类型
 */
export type AlertLevel = 'success' | 'warning' | 'error' | 'info';

/**
 * 展示模式类型
 */
type AlertDisplayMode = 'card' | 'alert' | 'inline';

/**
 * 尺寸类型
 */
type AlertSize = 'sm' | 'md' | 'lg';

/**
 * 操作按钮配置
 */
interface AlertAction {
  /** 按钮文本 */
  label: string;
  /** 点击事件 */
  onClick: () => void;
  /** 是否为主要按钮 */
  primary?: boolean;
  /** 是否显示加载状态 */
  loading?: boolean;
}

/**
 * 警告配置接口
 */
interface AlertConfig {
  /** 警告级别 */
  level: AlertLevel;
  /** 标题 */
  title?: string;
  /** 消息内容 */
  message: string;
  /** 是否可关闭 */
  closable?: boolean;
  /** 是否可展开 */
  expandable?: boolean;
  /** 操作按钮列表 */
  actions?: AlertAction[];
  /** 自定义图标 */
  icon?: React.ReactNode;
  /** 自定义样式 */
  sx?: SxProps<Theme>;
}

/**
 * AlertCard组件属性
 */
interface AlertCardProps {
  /** 警告级别 */
  level: AlertLevel;

  /** 标题 */
  title?: string;

  /** 消息内容 */
  message: string;

  /** 展示模式 */
  displayMode?: AlertDisplayMode;

  /** 尺寸 */
  size?: AlertSize;

  /** 是否可关闭 */
  closable?: boolean;

  /** 是否可展开 */
  expandable?: boolean;

  /** 展开状态（受控） */
  expanded?: boolean;

  /** 展开状态变化回调 */
  onExpandedChange?: (expanded: boolean) => void;

  /** 关闭回调 */
  onClose?: () => void;

  /** 点击回调 */
  onClick?: () => void;

  /** 操作按钮列表 */
  actions?: AlertAction[];

  /** 自定义图标 */
  icon?: React.ReactNode;

  /** 关闭图标 */
  closeIcon?: React.ReactNode;

  /** 自定义样式 */
  sx?: SxProps<Theme>;

  /** 使用Card包装 */
  useCard?: boolean;

  /** 使用Alert组件（默认true） */
  useAlert?: boolean;

  /** 显示分隔线 */
  showDivider?: boolean;

  /** 自定义渲染函数 */
  render?: (config: AlertConfig) => React.ReactNode;
}

// ============ 级别配置 ============

/**
 * 级别配置映射
 */
const LEVEL_CONFIG = {
  success: {
    icon: CheckCircle,
    color: 'success.dark',
    bgColor: 'success.light',
    borderColor: 'success.light',
    titleColor: 'success.800',
    messageColor: 'success.700',
    alertColor: 'success' as const,
  },
  warning: {
    icon: AlertTriangle,
    color: 'warning.main',
    bgColor: 'warning.light',
    borderColor: 'warning.light',
    titleColor: 'warning.800',
    messageColor: 'warning.700',
    alertColor: 'warning' as const,
  },
  error: {
    icon: AlertCircle,
    color: 'error.main',
    bgColor: 'error.light',
    borderColor: 'error.light',
    titleColor: 'error.800',
    messageColor: 'error.darker',
    alertColor: 'error' as const,
  },
  info: {
    icon: Info,
    color: 'primary.main',
    bgColor: 'primary.light',
    borderColor: 'primary.light',
    titleColor: 'primary.800',
    messageColor: 'primary.dark',
    alertColor: 'info' as const,
  },
};

/**
 * 尺寸样式映射
 */
const SIZE_STYLES = {
  sm: {
    padding: `${designTokens.spacing.sm} 12px`,
    iconSize: 16,
    titleSize: '0.875rem',
    messageSize: '0.75rem',
    gap: 2,
  },
  md: {
    padding: `${designTokens.spacing.md} 16px`,
    iconSize: 20,
    titleSize: '0.875rem',
    messageSize: '0.875rem',
    gap: 3,
  },
  lg: {
    padding: `${designTokens.spacing.md} 20px`,
    iconSize: 24,
    titleSize: '1rem',
    messageSize: '1rem',
    gap: 4,
  },
};

// ============ AlertCard组件 ============

/**
 * 统一的AlertCard组件
 * 支持卡片模式和面板模式，多种样式变体，操作按钮等
 *
 * @example
 * ```tsx
 * // 基础使用
 * <AlertCard
 *   level="success"
 *   title="操作成功"
 *   message="数据已保存"
 * />
 *
 * // 使用Card模式
 * <AlertCard
 *   level="warning"
 *   title="注意"
 *   message="您的账户即将过期"
 *   displayMode="card"
 *   useCard={true}
 * />
 *
 * // 使用Alert模式
 * <AlertCard
 *   level="error"
 *   title="错误"
 *   message="操作失败"
 *   displayMode="alert"
 *   useAlert={true}
 * />
 *
 * // 可关闭
 * <AlertCard
 *   level="info"
 *   message="欢迎使用系统"
 *   closable
 *   onClose={handleClose}
 * />
 *
 * // 可展开
 * <AlertCard
 *   level="warning"
 *   title="详细信息"
 *   message="这是一段很长的详细信息..."
 *   expandable
 *   expanded={isExpanded}
 *   onExpandedChange={setExpanded}
 * />
 *
 * // 带操作按钮
 * <AlertCard
 *   level="success"
 *   title="操作成功"
 *   message="是否继续其他操作？"
 *   actions={[
 *     { label: "查看详情", onClick: handleView },
 *     { label: "关闭", onClick: handleClose, primary: true }
 *   ]}
 * />
 *
 * // 自定义图标
 * <AlertCard
 *   level="info"
 *   message="自定义消息"
 *   icon={<HelpCircle />}
 * />
 *
 * // 可点击
 * <AlertCard
 *   level="success"
 *   message="点击查看详情"
 *   onClick={handleClick}
 * />
 * ```
 */
export const AlertCard: React.FC<AlertCardProps> = ({
  level,
  title,
  message,
  displayMode = 'card',
  size = 'md',
  closable = false,
  expandable = false,
  expanded,
  onExpandedChange,
  onClose,
  onClick,
  actions,
  icon,
  closeIcon,
  sx,
  useCard = false,
  useAlert = false,
  showDivider = true,
  render,
}) => {
  const [internalExpanded, setInternalExpanded] = React.useState(expanded ?? true);

  const isExpanded = expanded !== undefined ? expanded : internalExpanded;
  const handleExpandedChange = (newExpanded: boolean) => {
    if (expanded === undefined) {
      setInternalExpanded(newExpanded);
    }
    onExpandedChange?.(newExpanded);
  };

  // 如果提供了自定义渲染函数，使用它
  if (render) {
    return render({
      level,
      title,
      message,
      closable,
      expandable,
      actions,
      icon,
      sx,
    });
  }

  const config = LEVEL_CONFIG[level];
  const sizeStyles = SIZE_STYLES[size];
  // 使用 lucide-react 图标组件
  const IconComponent = (icon || config.icon) as React.ComponentType<{
    size?: number | string;
    className?: string;
    style?: React.CSSProperties;
  }>;

  // Alert模式
  if (useAlert) {
    return (
      <Alert
        severity={config.alertColor}
        title={title}
        action={
          closable ? (
            <IconButton
              size='small'
              onClick={onClose}
              sx={{ color: 'inherit' }}
              aria-label={i18n.t('shared.alert_card.k0')}
            >
              {closeIcon || <X size={16} />}
            </IconButton>
          ) : undefined
        }
        sx={{
          borderRadius: 3,
          alignItems: 'center',
          ...sx,
        }}
      >
        {title && <AlertTitle sx={{ fontWeight: 600 }}>{title}</AlertTitle>}
        {message}
        {actions && actions.length > 0 && (
          <>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {actions.map((action, index) => (
                <Button
                  key={index}
                  size='small'
                  variant={action.primary ? 'contained' : 'outlined'}
                  color={config.alertColor}
                  onClick={action.onClick}
                  disabled={action.loading}
                  startIcon={
                    action.loading ? (
                      <RefreshCw
                        size={14}
                        className='animate-spin'
                      />
                    ) : undefined
                  }
                >
                  {action.label}
                </Button>
              ))}
            </Box>
          </>
        )}
      </Alert>
    );
  }

  // Card模式
  if (useCard || displayMode === 'card') {
    return (
      <Card
        onClick={onClick}
        sx={{
          borderRadius: 3,
          border: '1px solid',
          borderColor: config.borderColor,
          bgcolor: config.bgColor,
          cursor: onClick ? 'pointer' : 'default',
          transition: 'all 0.2s',
          '&:hover': onClick
            ? {
                boxShadow: 2,
                transform: 'translateY(-1px)',
              }
            : {},
          ...sx,
        }}
      >
        <CardContent
          sx={{
            p: `${sizeStyles.padding} !important`,
            '&:last-child': { pb: `${sizeStyles.padding} !important` },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: sizeStyles.gap,
            }}
          >
            <Box
              sx={{
                color: config.color,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <IconComponent size={sizeStyles.iconSize} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {title && (
                <Typography
                  sx={{
                    fontWeight: 600,
                    color: config.titleColor,
                    fontSize: sizeStyles.titleSize,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {title}
                </Typography>
              )}
              {(!expandable || isExpanded) && (
                <Typography
                  sx={{
                    color: config.messageColor,
                    fontSize: sizeStyles.messageSize,
                    mt: title ? 0.5 : 0,
                  }}
                >
                  {message}
                </Typography>
              )}
              {expandable && (
                <Button
                  size='small'
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExpandedChange(!isExpanded);
                  }}
                  sx={{
                    mt: title ? 0.5 : 0,
                    p: 0,
                    minWidth: 'auto',
                    color: config.messageColor,
                    fontSize: sizeStyles.messageSize,
                    textTransform: 'none',
                  }}
                >
                  {isExpanded ? i18n.t('shared.alert_card.k2') : i18n.t('shared.alert_card.k1')}
                </Button>
              )}
              {actions && actions.length > 0 && (!expandable || isExpanded) && showDivider && (
                <>
                  <Divider sx={{ my: 1, borderColor: config.borderColor }} />
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {actions.map((action, index) => (
                      <Button
                        key={index}
                        size='small'
                        variant={action.primary ? 'contained' : 'outlined'}
                        onClick={(e) => {
                          e.stopPropagation();
                          action.onClick();
                        }}
                        disabled={action.loading}
                        startIcon={action.loading ? <RefreshCw size={14} /> : undefined}
                        sx={{
                          borderColor: config.borderColor,
                          color: action.primary
                            ? 'var(--color-primary-foreground)'
                            : config.titleColor,
                          bgcolor: action.primary ? config.color : 'transparent',
                          '&:hover': {
                            bgcolor: action.primary ? config.color : config.bgColor,
                            borderColor: config.borderColor,
                          },
                          fontSize: sizeStyles.messageSize,
                          py: 0.5,
                        }}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </Box>
                </>
              )}
            </Box>
            {closable && (
              <IconButton
                size='small'
                onClick={(e) => {
                  e.stopPropagation();
                  onClose?.();
                }}
                sx={{
                  color: config.messageColor,
                  flexShrink: 0,
                  p: 0.5,
                }}
                aria-label={i18n.t('shared.alert_card.k3')}
              >
                {closeIcon || <X size={16} />}
              </IconButton>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Inline模式（默认）
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: sizeStyles.gap,
        p: sizeStyles.padding,
        borderRadius: 3,
        border: '1px solid',
        borderColor: config.borderColor,
        bgcolor: config.bgColor,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s',
        '&:hover': onClick
          ? {
              boxShadow: 1,
            }
          : {},
        ...sx,
      }}
    >
      <Box
        sx={{
          color: config.color,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <IconComponent size={sizeStyles.iconSize} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {title && (
          <Typography
            sx={{
              fontWeight: 600,
              color: config.titleColor,
              fontSize: sizeStyles.titleSize,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {title}
          </Typography>
        )}
        {(!expandable || isExpanded) && (
          <Typography
            sx={{
              color: config.messageColor,
              fontSize: sizeStyles.messageSize,
              mt: title ? 0.5 : 0,
            }}
          >
            {message}
          </Typography>
        )}
        {expandable && (
          <Button
            size='small'
            onClick={(e) => {
              e.stopPropagation();
              handleExpandedChange(!isExpanded);
            }}
            sx={{
              mt: title ? 0.5 : 0,
              p: 0,
              minWidth: 'auto',
              color: config.messageColor,
              fontSize: sizeStyles.messageSize,
              textTransform: 'none',
            }}
          >
            {isExpanded ? i18n.t('shared.alert_card.k5') : i18n.t('shared.alert_card.k4')}
          </Button>
        )}
        {actions && actions.length > 0 && (!expandable || isExpanded) && showDivider && (
          <>
            <Divider sx={{ my: 1, borderColor: config.borderColor }} />
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {actions.map((action, index) => (
                <Button
                  key={index}
                  size='small'
                  variant={action.primary ? 'contained' : 'outlined'}
                  onClick={(e) => {
                    e.stopPropagation();
                    action.onClick();
                  }}
                  disabled={action.loading}
                  startIcon={action.loading ? <RefreshCw size={14} /> : undefined}
                  sx={{
                    borderColor: config.borderColor,
                    color: action.primary
                      ? 'var(--color-primary-foreground)'
                      : config.titleColor,
                    bgcolor: action.primary ? config.color : 'transparent',
                    '&:hover': {
                      bgcolor: action.primary ? config.color : config.bgColor,
                      borderColor: config.borderColor,
                    },
                    fontSize: sizeStyles.messageSize,
                    py: 0.5,
                  }}
                >
                  {action.label}
                </Button>
              ))}
            </Box>
          </>
        )}
      </Box>
      {closable && (
        <IconButton
          size='small'
          onClick={(e) => {
            e.stopPropagation();
            onClose?.();
          }}
          sx={{
            color: config.messageColor,
            flexShrink: 0,
            p: 0.5,
          }}
          aria-label={i18n.t('shared.alert_card.k6')}
        >
          {closeIcon || <X size={16} />}
        </IconButton>
      )}
    </Box>
  );
};

// ============ 便捷组件导出 ============

/**
 * 成功警告卡片
 */
const SuccessAlertCard: React.FC<Omit<AlertCardProps, 'level'>> = (props) => (
  <AlertCard
    {...props}
    level='success'
  />
);

/**
 * 警告警告卡片
 */
const WarningAlertCard: React.FC<Omit<AlertCardProps, 'level'>> = (props) => (
  <AlertCard
    {...props}
    level='warning'
  />
);

/**
 * 错误警告卡片
 */
const ErrorAlertCard: React.FC<Omit<AlertCardProps, 'level'>> = (props) => (
  <AlertCard
    {...props}
    level='error'
  />
);

/**
 * 信息警告卡片
 */
const InfoAlertCard: React.FC<Omit<AlertCardProps, 'level'>> = (props) => (
  <AlertCard
    {...props}
    level='info'
  />
);

// ============ 默认导出 ============

export default AlertCard;
