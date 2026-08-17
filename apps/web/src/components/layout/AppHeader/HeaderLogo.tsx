import React from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { Menu as MenuIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DASHBOARD_PATHS } from '@/routes/dashboard';
import i18n from '@/i18n';

export interface HeaderLogoProps {
  showBackButton?: boolean;
  onBack?: () => void;
  title?: string;
  isMobileNav?: boolean;
  onMobileMenuOpen?: () => void;
}

export const HeaderLogo: React.FC<HeaderLogoProps> = ({
  showBackButton = false,
  onBack,
  title,
  isMobileNav = false,
  onMobileMenuOpen,
}) => {
  const navigate = useNavigate();

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      {showBackButton && onBack && (
        <IconButton
          size='small'
          onClick={onBack}
          sx={{ display: { sm: 'none' } }}
          aria-label={i18n.t('shared.header_logo.k0')}
        >
          <MenuIcon style={{ width: 20, height: 20 }} />
        </IconButton>
      )}

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          marginRight: 3,
          cursor: 'pointer',
        }}
        onClick={() => navigate(DASHBOARD_PATHS.dashboard)}
      >
        <Box
          className='app-header-logo'
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
          <Typography
            sx={{
              color: 'common.white',
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            T
          </Typography>
        </Box>
        <Typography
          variant='h6'
          className='app-header-title'
          sx={{
            fontWeight: 700,
            background: 'linear-gradient(135deg, primary.main, secondary.main)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: { xs: 'none', sm: 'block' },
          }}
        >
          {title || 'TOPEMS'}
        </Typography>
      </Box>

      {isMobileNav && onMobileMenuOpen && (
        <IconButton
          onClick={onMobileMenuOpen}
          aria-label={i18n.t('shared.header_logo.k1')}
          sx={{
            width: 36,
            height: 36,
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <MenuIcon style={{ width: 20, height: 20 }} />
        </IconButton>
      )}
    </Box>
  );
};

export default HeaderLogo;
