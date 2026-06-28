import React from 'react';
import { Box, Typography, Paper, useTheme, Button } from '@mui/material';

// ============ 类型定义 ============

export interface EmptyStateProps {
  // 图标
  icon?: React.ReactNode;
  emoji?: string;

  // 文案
  title: string;
  description?: string;

  // 操作
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };

  // ======== 向后兼容属性 ========
  /** @deprecated 请使用 action 对象 */
  actionLabel?: string;
  /** @deprecated 请使用 action.onClick */
  onAction?: () => void;

  // 布局
  align?: 'center' | 'left';
  compact?: boolean;

  // 自定义
  children?: React.ReactNode;
}

// ============ EmptyState 组件 ============

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  emoji,
  title,
  description,
  action,
  actionLabel,
  onAction,
  align = 'center',
  compact = false,
  children,
}) => {
  const resolvedAction =
    action || (actionLabel ? { label: actionLabel, onClick: onAction } : undefined);
  const _theme = useTheme();

  return (
    <Box
      role='status'
      aria-live='polite'
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: align === 'center' ? 'center' : 'flex-start',
        justifyContent: 'center',
        py: compact ? 4 : 8,
        px: compact ? 2 : 4,
        textAlign: align === 'center' ? 'center' : 'left',
      }}
    >
      {/* 图标 */}
      <Box
        aria-hidden='true'
        sx={{
          width: compact ? 64 : 80,
          height: compact ? 64 : 80,
          borderRadius: '50%',
          bgcolor: 'action.hover',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: compact ? 2 : 3,
        }}
      >
        {emoji ? (
          <Typography variant={compact ? 'h4' : 'h3'}>{emoji}</Typography>
        ) : icon ? (
          <Box sx={{ color: 'text.secondary' }}>{icon}</Box>
        ) : (
          <Typography variant={compact ? 'h4' : 'h3'}>📋</Typography>
        )}
      </Box>

      {/* 标题 */}
      <Typography
        variant={compact ? 'subtitle1' : 'h6'}
        sx={{ fontWeight: 600, mb: compact ? 1 : 0.5 }}
      >
        {title}
      </Typography>

      {/* 描述 */}
      {description && (
        <Typography
          variant='body2'
          color='text.secondary'
          sx={{
            maxWidth: 400,
            mb: resolvedAction ? 2 : 0,
          }}
        >
          {description}
        </Typography>
      )}

      {/* 操作按钮 */}
      {resolvedAction && (
        <Button
          variant='contained'
          color='primary'
          onClick={resolvedAction.onClick}
          href={resolvedAction.href}
          sx={{ mt: 1 }}
        >
          {resolvedAction.label}
        </Button>
      )}

      {/* 自定义内容 */}
      {children}
    </Box>
  );
};

// ============ 列表空状态预设 ============

export const ListEmptyState: React.FC<{
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ title = '暂无数据', description, actionLabel, onAction }) => (
  <Paper sx={{ borderRadius: 2, py: 8 }}>
    <EmptyState
      emoji='📋'
      title={title}
      description={description || '当前列表为空，没有可显示的内容'}
      action={
        actionLabel
          ? {
              label: actionLabel,
              onClick: onAction,
            }
          : undefined
      }
    />
  </Paper>
);

// ============ 搜索空状态预设 ============

export const SearchEmptyState: React.FC<{
  keyword?: string;
  onClear?: () => void;
}> = ({ keyword, onClear }) => (
  <Paper sx={{ borderRadius: 2, py: 8 }}>
    <EmptyState
      emoji='🔍'
      title='未找到结果'
      description={
        keyword ? `未找到与"${keyword}"相关的内容，请尝试其他关键词` : '未找到匹配的搜索结果'
      }
      action={
        onClear
          ? {
              label: '清除搜索',
              onClick: onClear,
            }
          : undefined
      }
    />
  </Paper>
);

// ============ 权限空状态预设 ============

export const PermissionEmptyState: React.FC<{
  onRequest?: () => void;
}> = ({ onRequest }) => (
  <Paper sx={{ borderRadius: 2, py: 8 }}>
    <EmptyState
      emoji='🔒'
      title='暂无权限'
      description='您没有访问此页面的权限，请联系管理员申请权限'
      action={
        onRequest
          ? {
              label: '申请权限',
              onClick: onRequest,
            }
          : undefined
      }
    />
  </Paper>
);

// ============ 错误空状态预设 ============

export interface ErrorEmptyStateProps {
  error?: string;
  onRetry?: () => void;
}

export const ErrorEmptyState: React.FC<ErrorEmptyStateProps> = ({ error, onRetry }) => (
  <Paper sx={{ borderRadius: 2, py: 8 }}>
    <EmptyState
      emoji='❌'
      title='加载失败'
      description={error || '数据加载失败，请稍后重试'}
      action={
        onRetry
          ? {
              label: '重新加载',
              onClick: onRetry,
            }
          : undefined
      }
    />
  </Paper>
);

export default EmptyState;
