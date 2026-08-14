import React from 'react';
import { Box, Button } from '@mui/material';
import { Home, Grid3X3, BarChart3 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import i18n from '@/i18n';

export interface HeaderNavTabsProps {
  showCentralNav?: boolean;
}

export const HeaderNavTabs: React.FC<HeaderNavTabsProps> = ({ showCentralNav = true }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const centralNavItems = [
    { label: i18n.t('shared.header_nav_tabs.k0'), path: '/', icon: <Home style={{ width: 16, height: 16 }} /> },
    { label: i18n.t('shared.header_nav_tabs.k1'), path: '/modules', icon: <Grid3X3 style={{ width: 16, height: 16 }} /> },
    {
      label: i18n.t('shared.header_nav_tabs.k2'),
      path: '/dashboard',
      icon: <BarChart3 style={{ width: 16, height: 16 }} />,
    },
  ];

  if (!showCentralNav) return null;

  return (
    <Box
      sx={{
        display: { xs: 'none', md: 'flex' },
        alignItems: 'center',
        gap: 0.5,
        flex: 1,
        justifyContent: 'center',
      }}
    >
      {centralNavItems.map((tab) => {
        const isActive = location.pathname === tab.path;
        return (
          <Box
            key={tab.path + tab.label}
            onClick={() => navigate(tab.path)}
            sx={{ position: 'relative', cursor: 'pointer' }}
          >
            <Button
              startIcon={tab.icon}
              sx={{
                color: isActive ? 'primary.main' : 'text.secondary',
                fontWeight: isActive ? 600 : 500,
                px: 2,
                py: 1,
                minWidth: 'auto',
                textTransform: 'none',
                borderRadius: 1,
                backgroundColor: 'transparent',
                transition: 'all 150ms ease',
                gap: 1,
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              }}
            >
              {tab.label}
            </Button>
            {isActive && (
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  left: 8,
                  right: 8,
                  height: 2,
                  borderRadius: '999px 999px 0 0',
                  backgroundColor: 'primary.main',
                }}
              />
            )}
          </Box>
        );
      })}
    </Box>
  );
};

export default HeaderNavTabs;
