'use client';

import { useState } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { Menu, MenuItem, Button } from '@mui/material';
import { useThemeStore } from '@/store';
import i18n from '@/i18n';

export function ModeToggle() {
  const setTheme = useThemeStore((state) => state.setTheme);
  const theme = useThemeStore((state) => state.theme);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const getIcon = () => {
    switch (theme) {
      case 'dark':
        return <Moon style={{ width: 18, height: 18 }} />;
      case 'light':
        return <Sun style={{ width: 18, height: 18 }} />;
      default:
        return <Monitor style={{ width: 18, height: 18 }} />;
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    handleMenuClose();
  };

  return (
    <>
      <Button
        variant='outlined'
        size='small'
        className='theme-toggle-btn'
        onClick={handleMenuOpen}
      >
        {getIcon()}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={() => handleThemeChange('light')}>
          <Sun style={{ width: 16, height: 16, marginRight: 8 }} />
          {i18n.t('components.mode_toggle.k0')}
        </MenuItem>
        <MenuItem onClick={() => handleThemeChange('dark')}>
          <Moon style={{ width: 16, height: 16, marginRight: 8 }} />
          {i18n.t('components.mode_toggle.k1')}
        </MenuItem>
        <MenuItem onClick={() => handleThemeChange('system')}>
          <Monitor style={{ width: 16, height: 16, marginRight: 8 }} />
          {i18n.t('components.mode_toggle.k2')}
        </MenuItem>
      </Menu>
    </>
  );
}
