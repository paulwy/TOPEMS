import React from 'react';
import {
  Box,
  Paper,
  Typography,
  useTheme,
  type SxProps,
  type Theme,
} from '@mui/material';
import {
  ChevronRight,
} from 'lucide-react';

export interface MobileCardProps {
  title?: string;
  subtitle?: string;
  leftIcon?: React.ReactNode;
  rightContent?: React.ReactNode;
  showArrow?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
  sx?: SxProps<Theme>;
  divider?: boolean;
  badge?: React.ReactNode;
}

export const MobileCard: React.FC<MobileCardProps> = ({
  title,
  subtitle,
  leftIcon,
  rightContent,
  showArrow = false,
  onClick,
  children,
  sx,
  divider = false,
  badge,
}) => {
  const theme = useTheme();

  const content = (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        minHeight: 56,
        p: 2,
      }}
    >
      {leftIcon && (
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'primary.lighter',
            color: 'primary.main',
            flexShrink: 0,
          }}
        >
          {leftIcon}
        </Box>
      )}

      <Box sx={{ flex: 1, minWidth: 0 }}>
        {title && (
          <Typography
            variant='subtitle2'
            sx={{
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {title}
          </Typography>
        )}
        {subtitle && (
          <Typography
            variant='caption'
            color='text.secondary'
            sx={{
              display: 'block',
              mt: 0.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>

      {badge && <Box sx={{ flexShrink: 0 }}>{badge}</Box>}

      {rightContent && <Box sx={{ flexShrink: 0 }}>{rightContent}</Box>}

      {showArrow && (
        <ChevronRight
          style={{
            width: 20,
            height: 20,
            color: theme.palette.text.secondary,
            flexShrink: 0,
          }}
        />
      )}
    </Box>
  );

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 0,
        borderBottom: divider ? 1 : 0,
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background-color 0.2s',
        '&:hover': {
          backgroundColor: onClick ? 'action.hover' : 'inherit',
        },
        '&:active': {
          backgroundColor: onClick ? 'action.selected' : 'inherit',
        },
        ...sx,
      }}
      onClick={onClick}
    >
      {children || content}
    </Paper>
  );
};

export default MobileCard;
