import React, { useState, useCallback, useEffect, createContext, useContext } from 'react';
import { Box, Typography, Popover, Fade, useMediaQuery, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { NavItem } from '../../lib/NavigationRegistry';

interface DropdownContextType {
  anchorEl: HTMLElement | null;
  openMenu: NavItem | null;
  setAnchorEl: (el: HTMLElement | null) => void;
  setOpenMenu: (menu: NavItem | null) => void;
}

const DropdownContext = createContext<DropdownContextType | null>(null);

export const useDropdown = () => {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error('useDropdown must be used within a DropdownProvider');
  }
  return context;
};

export const DropdownProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [openMenu, setOpenMenu] = useState<NavItem | null>(null);

  return (
    <DropdownContext.Provider value={{ anchorEl, openMenu, setAnchorEl, setOpenMenu }}>
      {children}
    </DropdownContext.Provider>
  );
};

interface NavDropdownProps {
  anchorEl: HTMLElement | null;
  openMenu: NavItem | null;
  setAnchorEl: (el: HTMLElement | null) => void;
  setOpenMenu: (menu: NavItem | null) => void;
}

export const NavDropdown: React.FC<NavDropdownProps> = ({
  anchorEl,
  openMenu,
  setAnchorEl,
  setOpenMenu,
}) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (anchorEl && !anchorEl.contains(event.target as Node)) {
        const popoverElement = document.querySelector('.MuiPopover-paper');
        if (popoverElement && !popoverElement.contains(event.target as Node)) {
          handleCloseMenu();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorEl]);

  const handleCloseMenu = useCallback(() => {
    setAnchorEl(null);
    setOpenMenu(null);
  }, [setAnchorEl, setOpenMenu]);

  const handleMenuItemClick = useCallback(
    (item: NavItem) => {
      if (item.path) {
        navigate(item.path);
      }
      handleCloseMenu();
    },
    [navigate, handleCloseMenu]
  );

  const isMenuOpen = Boolean(anchorEl) && Boolean(openMenu?.children);

  const renderDropdownContent = (item: NavItem) => {
    if (!item.children) return null;

    const menuItems = item.children as NavItem[];
    return (
      <Box
        sx={{
          minWidth: 200,
          maxWidth: 500,
          p: 1,
          maxHeight: isMobile ? '60vh' : '70vh',
          overflowY: 'auto',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
        }}
        onMouseEnter={() => {
          if (anchorEl) setAnchorEl(anchorEl);
        }}
        onMouseLeave={handleCloseMenu}
      >
        {menuItems.map((child) => (
          <Box
            key={child.code}
            onClick={() => handleMenuItemClick(child)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              p: 1,
              borderRadius: 1,
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
              minWidth: 140,
            }}
          >
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: 1,
                backgroundColor: 'primary.light',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.8,
              }}
            >
              <Typography
                variant='caption'
                sx={{ color: 'primary.main', fontWeight: 600 }}
              >
                {child.label.charAt(0)}
              </Typography>
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                {child.label}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    );
  };

  return (
    <Popover
      open={isMenuOpen}
      anchorEl={anchorEl}
      onClose={handleCloseMenu}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'left',
      }}
      slotProps={{
        paper: {
          elevation: 3,
          sx: {
            borderRadius: 2,
            mt: 0.5,
            overflow: 'hidden',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
          },
        },
      }}
    >
      {openMenu && <Fade in={isMenuOpen}>{renderDropdownContent(openMenu) || <Box />}</Fade>}
    </Popover>
  );
};

export default NavDropdown;
