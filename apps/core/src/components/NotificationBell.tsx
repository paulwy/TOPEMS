import React, { useState, useEffect } from 'react';
import {
  IconButton,
  Badge,
  Tooltip,
  Popover,
  Box,
} from '@mui/material';
import { Bell as NotificationsIcon } from 'lucide-react';
import NotificationPanel from './NotificationPanel';
import { useNotificationStore } from '../store/notificationStore';

interface NotificationBellProps {
  color?: 'inherit' | 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  size?: 'small' | 'medium' | 'large';
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  color = 'inherit',
  size = 'medium',
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const { unreadCount, fetchUnreadCount, wsConnected } = useNotificationStore();

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  return (
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      <Tooltip title="通知">
        <IconButton
          color={color}
          size={size}
          onClick={handleClick}
          aria-label="通知"
        >
          <Badge
            badgeContent={unreadCount > 99 ? '99+' : unreadCount}
            color="error"
            variant={unreadCount > 0 ? 'standard' : 'dot'}
          >
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>
      {wsConnected && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 2,
            right: 2,
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: 'success.main',
            border: '1px solid background.paper',
          }}
          title="已连接"
        />
      )}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        sx={{
          mt: 1,
        }}
      >
        <NotificationPanel onClose={handleClose} />
      </Popover>
    </Box>
  );
};

export default NotificationBell;
