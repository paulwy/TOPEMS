import React from 'react';
import { Divider } from '@mui/material';
import { ThemeSelector } from '../../ThemeSelector';
import { GlobalActions, UserMenu } from '@/layouts/components';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { DASHBOARD_PATHS } from '@/routes/dashboard';
import { AUTH_PATHS } from '@/routes/auth';

export const HeaderUserMenu: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <>
      <GlobalActions />
      <ThemeSelector showMenu={true} />
      <Divider
        orientation='vertical'
        flexItem
        sx={{ mx: 0.5, my: 1 }}
      />
      <UserMenu
        user={user}
        onProfileClick={() => navigate(DASHBOARD_PATHS.profile)}
        onAccountSettingsClick={() => navigate(DASHBOARD_PATHS.profile)}
        onHelpCenterClick={() => navigate(DASHBOARD_PATHS.helpCenter)}
        onLogout={() => {
          logout();
          navigate(AUTH_PATHS.login);
        }}
      />
    </>
  );
};

export default HeaderUserMenu;
