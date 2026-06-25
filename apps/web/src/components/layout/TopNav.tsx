import React, { useState, useCallback, useEffect } from 'react';
import { Box, IconButton, Typography, Avatar, Badge, Tooltip } from '@mui/material';
import { Button } from '@mui/material';
import { Bell, ChevronDown } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { navigationRegistry, type NavItem } from '../../lib/NavigationRegistry';
import { ModeToggle } from '../ModeToggle';
import LanguageSelector from '../LanguageSelector';
import { NavDropdown } from './NavDropdown';
import { MobileNav } from './MobileNav';
import { useInstalledPlugins } from '../../context/PluginContext';

interface TopNavProps {
  onNavHover?: (event: React.MouseEvent<HTMLElement>, item: NavItem) => void;
  onNavLeave?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onNavHover, onNavLeave }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isPluginInstalled, isLoading } = useInstalledPlugins();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [openMenu, setOpenMenu] = useState<NavItem | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navItems, setNavItems] = useState<NavItem[]>([]);

  useEffect(() => {
    const updateNav = () => {
      const allItems = navigationRegistry.getTopNavItems();
      const filtered = allItems.filter((item) => {
        if (item.path === '/dashboard') return true;
        const pluginCode = item.code;
        if (!pluginCode) return true;
        return isPluginInstalled(pluginCode);
      });
      setNavItems(filtered);
    };

    updateNav();
    navigationRegistry.emitter.on('navigationUpdated', updateNav);
    return function cleanup() {
      navigationRegistry.emitter.off('navigationUpdated', updateNav);
    };
  }, [isPluginInstalled]);

  const handleNavHover = useCallback(
    (event: React.MouseEvent<HTMLElement>, item: NavItem) => {
      if (item.children) {
        setAnchorEl(event.currentTarget);
        setOpenMenu(item);
      } else if (item.path) {
        navigate(item.path);
      }
      if (onNavHover) {
        onNavHover(event, item);
      }
    },
    [navigate, onNavHover]
  );

  const handleNavLeave = useCallback(() => {
    setAnchorEl(null);
    setOpenMenu(null);
    if (onNavLeave) {
      onNavLeave();
    }
  }, [onNavLeave]);

  const handleCloseMenu = useCallback(() => {
    setAnchorEl(null);
    setOpenMenu(null);
  }, []);

  const handleNavClick = useCallback(
    (item: NavItem) => {
      if (item.children) {
        if (openMenu?.code === item.code) {
          setAnchorEl(null);
          setOpenMenu(null);
        } else {
          setOpenMenu(item);
        }
      } else if (item.path) {
        navigate(item.path);
      }
    },
    [navigate, openMenu]
  );

  const renderNavigationItem = (item: NavItem) => {
    const isActive =
      item.path === location.pathname ||
      (item.path && location.pathname.startsWith(item.path + '/'));
    const isMenuOpen = openMenu?.code === item.code;

    return (
      <Box
        key={item.code}
        onMouseEnter={(e) => handleNavHover(e, item)}
        onMouseLeave={handleNavLeave}
        sx={{
          position: 'relative',
        }}
      >
        <Button
          endIcon={
            item.children ? (
              <ChevronDown
                style={{
                  width: 14,
                  height: 14,
                  transform: isMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                }}
              />
            ) : null
          }
          onClick={() => handleNavClick(item)}
          sx={{
            color: isActive ? 'primary.main' : 'text.primary',
            fontWeight: isActive ? 600 : 400,
            px: 1.5,
            py: 1,
            minWidth: 'auto',
            textTransform: 'none',
            borderRadius: 1,
            backgroundColor: isActive ? 'primary.light' : 'transparent',
            '&:hover': {
              backgroundColor: isActive ? 'primary.light' : 'action.hover',
            },
          }}
        >
          {item.label}
        </Button>
      </Box>
    );
  };

  return (
    <Box
      component='header'
      sx={{
        backgroundColor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
        position: 'sticky',
        top: 0,
        zIndex: 1100,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          height: 56,
          px: 2,
          maxWidth: 1600,
          mx: 'auto',
          width: '100%',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            marginRight: 3,
            cursor: 'pointer',
          }}
          onClick={() => navigate('/dashboard')}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1.5,
              background: 'linear-gradient(135deg, primary.main 0%, secondary.main 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography sx={{ color: 'white', fontWeight: 700, fontSize: 16 }}>T</Typography>
          </Box>
          <Typography
            variant='h6'
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, primary.main, secondary.main)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: { xs: 'none', sm: 'block' },
            }}
          >
            TOPEMS
          </Typography>
        </Box>

        <Box
          sx={{
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center',
            gap: 0.5,
            flex: 1,
            overflow: 'auto',
          }}
        >
          {navItems.map((item) => renderNavigationItem(item))}
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 0.5, sm: 1 },
          }}
        >
          <Tooltip title='通知'>
            <IconButton sx={{ width: 32, height: 32 }}>
              <Badge
                badgeContent={3}
                color='error'
              >
                <Bell style={{ width: 20, height: 20 }} />
              </Badge>
            </IconButton>
          </Tooltip>
          <LanguageSelector />
          <ModeToggle />
          <Tooltip title='用户'>
            <IconButton sx={{ width: 32, height: 32 }}>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  fontSize: 14,
                  background: 'linear-gradient(135deg, primary.main, secondary.main)',
                }}
              >
                陈
              </Avatar>
            </IconButton>
          </Tooltip>
          <MobileNav
            open={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
            onOpen={() => setMobileMenuOpen(true)}
          />
        </Box>
      </Box>

      <NavDropdown
        anchorEl={anchorEl}
        openMenu={openMenu}
        setAnchorEl={setAnchorEl}
        setOpenMenu={setOpenMenu}
      />
    </Box>
  );
};

export default TopNav;
