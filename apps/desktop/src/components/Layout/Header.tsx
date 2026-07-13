import { Toolbar, IconButton, Typography, Box, Menu as MenuMUI, MenuItem } from '@mui/material';
import { Menu, Search, HelpCircle, Bell, User, ChevronDown, X, Minus, Square } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { hideWindow, quitApp } from '../../utils/tray';
import { windowApi } from '../../utils/tauri';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header = ({ onMenuClick }: HeaderProps) => {
  const [searchValue, setSearchValue] = useState('');
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotificationStore();

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  return (
    <Toolbar sx={{ justifyContent: 'space-between' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton edge="start" onClick={onMenuClick}>
          <Menu size={20} />
        </IconButton>
        <Typography variant="h6" component="h1">
          {user ? `欢迎, ${user.name}` : '欢迎使用 TOPEMS'}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
          <input
            type="text"
            placeholder="搜索..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            style={{
              padding: '8px 12px 8px 36px',
              borderRadius: '8px',
              border: '1px solid #e0e0e0',
              fontSize: '14px',
              width: '200px',
            }}
          />
        </Box>
        <IconButton>
          <HelpCircle size={20} />
        </IconButton>
        <IconButton>
          <Bell size={20} />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute',
              top: 4,
              right: 4,
              background: '#f44336',
              color: 'white',
              fontSize: '10px',
              borderRadius: '50%',
              width: '16px',
              height: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {unreadCount}
            </span>
          )}
        </IconButton>
        <IconButton onClick={handleUserMenuOpen}>
          <User size={20} />
          <ChevronDown size={16} />
        </IconButton>
        <MenuMUI
          anchorEl={userMenuAnchor}
          open={Boolean(userMenuAnchor)}
          onClose={handleUserMenuClose}
        >
          <MenuItem onClick={() => { hideWindow(); handleUserMenuClose(); }}>
            <X size={16} style={{ marginRight: 8 }} />
            最小化到托盘
          </MenuItem>
          <MenuItem onClick={() => { quitApp(); handleUserMenuClose(); }}>
            <X size={16} style={{ marginRight: 8 }} />
            退出
          </MenuItem>
          <MenuItem onClick={() => { logout(); handleUserMenuClose(); }}>
            <X size={16} style={{ marginRight: 8 }} />
            退出登录
          </MenuItem>
        </MenuMUI>
        <Box sx={{ borderLeft: '1px solid #e0e0e0', ml: 1, pl: 1, display: 'flex', gap: 0 }}>
          <IconButton onClick={windowApi.minimize} sx={{ p: 1, minWidth: '32px' }}>
            <Minus size={14} />
          </IconButton>
          <IconButton onClick={windowApi.toggleMaximize} sx={{ p: 1, minWidth: '32px' }}>
            <Square size={14} />
          </IconButton>
          <IconButton onClick={hideWindow} sx={{ p: 1, minWidth: '32px' }}>
            <X size={14} />
          </IconButton>
        </Box>
      </Box>
    </Toolbar>
  );
};

export default Header;