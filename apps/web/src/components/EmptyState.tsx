/**
 * @deprecated 此组件已弃用，请使用 @/components/mui/EmptyState 中的 EmptyState 组件
 * 该组件将保留作为向后兼容，预计在未来的版本中移除
 */
import React from 'react';
import { FileText, Inbox, Search, Folder, AlertTriangle } from 'lucide-react';
import { Box, Typography } from '@mui/material';
import { Button } from '@mui/material';

interface EmptyStateProps {
  icon?: 'file' | 'folder' | 'search' | 'inbox';
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'inbox',
  title,
  description,
  action,
}) => {
  const icons = {
    file: FileText,
    folder: Folder,
    search: Search,
    inbox: Inbox,
  };

  const Icon = icons[icon];

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 6,
        px: 2,
        textAlign: 'center',
      }}
    >
      <Box
        sx={{
          width: 64,
          height: 64,
          backgroundColor: 'grey.100',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 2,
        }}
      >
        <Icon style={{ width: 32, height: 32, color: 'text.disabled' }} />
      </Box>
      <Typography
        variant='h6'
        sx={{ fontWeight: 500, color: 'text.primary', mb: 1 }}
      >
        {title}
      </Typography>
      {description && (
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary', mb: 3, maxWidth: 280 }}
        >
          {description}
        </Typography>
      )}
      {action && <Button onClick={action.onClick}>{action.label}</Button>}
    </Box>
  );
};

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = '出错了',
  message = '加载数据时出现错误，请稍后重试',
  onRetry,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 6,
        px: 2,
        textAlign: 'center',
      }}
    >
      <Box
        sx={{
          width: 64,
          height: 64,
          backgroundColor: 'error.light',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 2,
        }}
      >
        <AlertTriangle style={{ width: 32, height: 32, color: 'error.dark' }} />
      </Box>
      <Typography
        variant='h6'
        sx={{ fontWeight: 500, color: 'text.primary', mb: 1 }}
      >
        {title}
      </Typography>
      <Typography
        variant='body2'
        sx={{ color: 'text.secondary', mb: 3, maxWidth: 280 }}
      >
        {message}
      </Typography>
      {onRetry && (
        <Button
          variant='outlined'
          onClick={onRetry}
        >
          重新加载
        </Button>
      )}
    </Box>
  );
};

export default EmptyState;
