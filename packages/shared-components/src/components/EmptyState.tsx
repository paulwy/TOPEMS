import React from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import { Info } from 'lucide-react';
import { zh } from '../i18n/zh';

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
          width: 64,
          height: 64,
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
          <Box sx={{ color: 'text.secondary' }}><Info size={compact ? 24 : 32} /></Box>
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
}> = ({ title = zh['empty_state.list_title'], description, actionLabel, onAction }) => (
  <Paper sx={{ borderRadius: 2, py: 8 }}>
    <EmptyState
      emoji='📋'
      title={title}
      description={description || zh['empty_state.list_description']}
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
      title={zh['empty_state.search_title']}
      description={
        keyword
          ? `${zh['empty_state.search_kw_prefix']}${keyword}${zh['empty_state.search_kw_suffix']}`
          : zh['empty_state.search_no_result']
      }
      action={
        onClear
          ? {
              label: zh['empty_state.search_clear'],
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
      title={zh['empty_state.permission_title']}
      description={zh['empty_state.permission_description']}
      action={
        onRequest
          ? {
              label: zh['empty_state.permission_request'],
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
      title={zh['empty_state.error_title']}
      description={error || zh['empty_state.error_description']}
      action={
        onRetry
          ? {
              label: zh['empty_state.error_retry'],
              onClick: onRetry,
            }
          : undefined
      }
    />
  </Paper>
);

export default EmptyState;
