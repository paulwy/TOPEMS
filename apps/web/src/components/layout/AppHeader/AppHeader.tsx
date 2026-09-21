import React from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { glassSx } from '@/theme/effects';
import { HeaderLogo } from './HeaderLogo';
import { HeaderSearch } from './HeaderSearch';
import { HeaderNotifications } from './HeaderNotifications';
import { HeaderUserMenu } from './HeaderUserMenu';
import { HeaderBreadcrumbs } from './HeaderBreadcrumbs';
import { BusinessDomainTabs } from './BusinessDomainTabs';
import LanguageSelector from '@/components/LanguageSelector';
import { TenantSwitcher } from '@/components/TenantSwitcher/TenantSwitcher';

interface AppHeaderProps {
  mobileMenuOpen?: boolean;
  onMobileMenuOpen?: () => void;
  onMobileMenuClose?: () => void;
  mobileNavComponent?: React.ComponentType<{
    open: boolean;
    onClose: () => void;
    onOpen: () => void;
  }>;
  /** @deprecated HeaderNavTabs 已移除，此 prop 不再生效，保留仅为向后兼容 */
  showCentralNav?: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
  title?: string;
  rightActions?: React.ReactNode;
  /** 权限校验函数（透传给 L1 业务域 Tabs 过滤模块） */
  checkPermission?: (permission: string) => boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  mobileMenuOpen = false,
  onMobileMenuOpen,
  onMobileMenuClose,
  mobileNavComponent: MobileNavComponent,
  showCentralNav: _showCentralNav = true,
  showBackButton = false,
  onBack,
  title,
  rightActions,
  checkPermission,
}) => {
  const headerTheme = useTheme();
  const isMobileNav = useMediaQuery(headerTheme.breakpoints.down('md'));

  return (
    <Box
      component='header'
      sx={(theme) => ({
        ...glassSx(theme),
        borderBottom: 1,
        borderColor: 'divider',
        position: 'sticky',
        top: 0,
        zIndex: 1100,
        boxShadow: `0 1px 2px 0 ${alpha(headerTheme.palette.common.black, 0.03)}`,
      })}
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

        <BusinessDomainTabs checkPermission={checkPermission} />

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
              <TenantSwitcher />
              <HeaderNotifications />
              <LanguageSelector />
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

      <HeaderBreadcrumbs checkPermission={checkPermission} />
    </Box>
  );
};

export default AppHeader;
