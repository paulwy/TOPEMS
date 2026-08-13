import React from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import { HeaderLogo } from './HeaderLogo';
import { HeaderNavTabs } from './HeaderNavTabs';
import { HeaderSearch } from './HeaderSearch';
import { HeaderNotifications } from './HeaderNotifications';
import { HeaderUserMenu } from './HeaderUserMenu';
import { HeaderBreadcrumbs } from './HeaderBreadcrumbs';

export interface AppHeaderProps {
  tabletDrawerOpen?: boolean;
  onTabletDrawerOpen?: () => void;
  mobileMenuOpen?: boolean;
  onMobileMenuOpen?: () => void;
  onMobileMenuClose?: () => void;
  mobileNavComponent?: React.ComponentType<{
    open: boolean;
    onClose: () => void;
    onOpen: () => void;
  }>;
  showCentralNav?: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
  title?: string;
  rightActions?: React.ReactNode;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  mobileMenuOpen = false,
  onMobileMenuOpen,
  onMobileMenuClose,
  mobileNavComponent: MobileNavComponent,
  showCentralNav = true,
  showBackButton = false,
  onBack,
  title,
  rightActions,
}) => {
  const headerTheme = useTheme();
  const isMobileNav = useMediaQuery(headerTheme.breakpoints.down('md'));

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
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          height: 56,
          px: { xs: 2, lg: 3 },
          maxWidth: 1800,
          mx: 'auto',
          width: '100%',
        }}
      >
        <HeaderLogo
          showBackButton={showBackButton}
          onBack={onBack}
          title={title}
          isMobileNav={isMobileNav}
          onMobileMenuOpen={onMobileMenuOpen}
        />

        <HeaderNavTabs showCentralNav={showCentralNav} />

        <HeaderSearch />

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            ml: 'auto',
          }}
        >
          {rightActions || (
            <>
              <HeaderNotifications />
              <HeaderUserMenu />
              {MobileNavComponent && onMobileMenuOpen && onMobileMenuClose && (
                <MobileNavComponent
                  open={mobileMenuOpen}
                  onClose={onMobileMenuClose}
                  onOpen={onMobileMenuOpen}
                />
              )}
            </>
          )}
        </Box>
      </Box>

      <HeaderBreadcrumbs />
    </Box>
  );
};

export default AppHeader;
