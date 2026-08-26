import type { ReactNode } from 'react';
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePermission } from '../../hooks/usePermission';
import { useRole } from '../../hooks/useRole';
import { Button, Box, Typography } from '@mui/material';
import { AUTH_PATHS } from '../../routes/auth';
import { designTokens } from '@topems/tokens';
import i18n from '@/i18n';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermissions?: string[];
  requiredRoles?: string[];
  requireAllPermissions?: boolean;
  fallbackPath?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermissions = [],
  requiredRoles = [],
  requireAllPermissions = false,
  fallbackPath = AUTH_PATHS.login,
}) => {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const { checkAnyPermission, checkAllPermissions } = usePermission();
  const { checkAnyRole } = useRole();
  const location = useLocation();

  if (isLoading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Box
            sx={{
              width: designTokens.spacing['2xl'],
              height: designTokens.spacing['2xl'],
              border: '4px solid',
              borderColor: 'primary.main',
              borderBottom: '4px solid transparent',
              borderRadius: 'full',
              animation: 'spin 1s linear infinite',
              margin: 'auto',
              marginBottom: 2,
            }}
          ></Box>
          <Typography sx={{ color: 'text.secondary' }}>
            {i18n.t('components.protected_route.k0')}
          </Typography>
        </Box>
      </Box>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to={fallbackPath}
        state={{ from: location }}
        replace
      />
    );
  }

  if (requiredPermissions.length > 0) {
    const hasPermissions = requireAllPermissions
      ? checkAllPermissions(requiredPermissions)
      : checkAnyPermission(requiredPermissions);

    if (!hasPermissions) {
      return (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <Box sx={{ fontSize: '48px', mb: 2 }}>🔒</Box>
            <Typography
              variant='h5'
              sx={{ fontWeight: 700, color: 'grey.900', mb: 1 }}
            >
              {i18n.t('components.protected_route.k0')}
            </Typography>
            <Typography
              variant='body2'
              sx={{ color: 'var(--mui-palette-text-secondary)', mb: 3 }}
            >
              {i18n.t('components.protected_route.k1')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                onClick={() => window.history.back()}
                variant='outlined'
              >
                {i18n.t('components.protected_route.k2')}
              </Button>
              <Button
                onClick={() => {
                  logout();
                  window.location.href = AUTH_PATHS.login;
                }}
                variant='contained'
                color='primary'
              >
                {i18n.t('components.protected_route.k3')}
              </Button>
            </Box>
          </Box>
        </Box>
      );
    }
  }

  if (requiredRoles.length > 0) {
    const hasRoles = checkAnyRole(requiredRoles);

    if (!hasRoles) {
      return (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <Box sx={{ fontSize: '48px', mb: 2 }}>🔒</Box>
            <Typography
              variant='h5'
              sx={{ fontWeight: 700, color: 'grey.900', mb: 1 }}
            >
              {i18n.t('components.protected_route.k4')}
            </Typography>
            <Typography
              variant='body2'
              sx={{ color: 'var(--mui-palette-text-secondary)', mb: 3 }}
            >
              {i18n.t('components.protected_route.k5')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                onClick={() => window.history.back()}
                variant='outlined'
              >
                {i18n.t('components.protected_route.k6')}
              </Button>
              <Button
                onClick={() => {
                  logout();
                  window.location.href = AUTH_PATHS.login;
                }}
                variant='contained'
                color='primary'
              >
                {i18n.t('components.protected_route.k7')}
              </Button>
            </Box>
          </Box>
        </Box>
      );
    }
  }

  return <>{children}</>;
};

interface GuestRouteProps {
  children: ReactNode;
}

export const GuestRoute: React.FC<GuestRouteProps> = ({ children }) => {
  return <>{children}</>;
};

export default ProtectedRoute;
