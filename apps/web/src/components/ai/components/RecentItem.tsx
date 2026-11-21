import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { MessageSquare, FileText, Code, Lightbulb, CircleDot } from 'lucide-react';
import type { RecentItemData } from '../hooks/UseAiDashboard';

export const RecentItem: React.FC<RecentItemData> = ({
  title,
  description,
  status,
  type,
  onClick,
}) => {
  const theme = useTheme();

  const typeIcons = {
    chat: <MessageSquare size={16} />,
    code: <Code size={16} />,
    document: <FileText size={16} />,
    summary: <Lightbulb size={16} />,
  };

  const statusColors = {
    success: theme.palette.success.main,
    warning: theme.palette.warning.main,
    error: theme.palette.error.main,
    info: theme.palette.info.main,
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 2,
        borderRadius: 1.5,
        border: 1,
        borderColor: 'divider',
        cursor: 'pointer',
        transition: 'all 0.2s',
        '&:hover': {
          backgroundColor: 'action.hover',
          borderColor: 'primary.main',
        },
      }}
      onClick={onClick}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: 1,
          bgcolor: 'primary.light',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'primary.main',
        }}
      >
        {typeIcons[type]}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant='body2'
          sx={{
            fontWeight: 500,
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </Typography>
        <Typography
          variant='caption'
          color='text.secondary'
        >
          {description}
        </Typography>
      </Box>
      <CircleDot style={{ width: 12, height: 12, color: statusColors[status] }} />
    </Box>
  );
};
