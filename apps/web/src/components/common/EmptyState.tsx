import React from 'react';
import { Box, Typography, Button, useTheme } from '@mui/material';
import { Inbox } from 'lucide-react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  emoji?: string;
  title?: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  align?: 'center' | 'left';
  compact?: boolean;
  height?: number | string;
  sx?: React.ComponentProps<typeof Box>['sx'];
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  emoji,
  title = '暂无数据',
  description,
  action,
  actionLabel,
  onAction,
  align = 'center',
  compact = false,
  height,
  sx,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const resolvedAction =
    action ??
    (actionLabel ? (
      <Button
        variant='contained'
        color='primary'
        onClick={onAction}
        size={compact ? 'small' : 'medium'}
      >
        {actionLabel}
      </Button>
    ) : undefined);

  return (
    <Box
      role='region'
      aria-label={title}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: align === 'center' ? 'center' : 'flex-start',
        justifyContent: 'center',
        border: '1px dashed',
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'colors.cyber.glass.bgLight',
        borderRadius: 2,
        bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
        px: compact ? 2 : 3,
        py: compact ? 3 : 4,
        textAlign: align === 'center' ? 'center' : 'left',
        ...(height ? { height } : {}),
        ...sx,
      }}
    >
      <Box
        aria-hidden='true'
        sx={{
          mb: compact ? 1.5 : 2,
          color: 'text.secondary',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {emoji ? (
          <Typography
            variant={compact ? 'h5' : 'h4'}
            sx={{ lineHeight: 1 }}
          >
            {emoji}
          </Typography>
        ) : (
          (icon ?? (
            <Inbox
              size={compact ? 24 : 32}
              strokeWidth={1.5}
            />
          ))
        )}
      </Box>

      <Typography
        variant={compact ? 'subtitle2' : 'subtitle1'}
        sx={{
          fontWeight: 600,
          color: 'text.primary',
          mb: description || resolvedAction ? (compact ? 0.5 : 1) : 0,
          textAlign: align === 'center' ? 'center' : 'left',
        }}
      >
        {title}
      </Typography>

      {description && (
        <Typography
          variant='caption'
          sx={{
            color: 'text.secondary',
            textAlign: align === 'center' ? 'center' : 'left',
            mb: resolvedAction ? (compact ? 1.5 : 2) : 0,
            maxWidth: 400,
          }}
        >
          {description}
        </Typography>
      )}

      {resolvedAction}
    </Box>
  );
};

export default EmptyState;
