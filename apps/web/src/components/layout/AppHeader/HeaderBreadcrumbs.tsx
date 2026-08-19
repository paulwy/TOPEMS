import React, { useMemo } from 'react';
import { Box, Breadcrumbs, Link, Typography } from '@mui/material';
import { Home, ChevronRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { navigationRegistryV2 } from '@/lib/navigation';
import type { NavItem } from '@/lib/navigation/types';
import { DASHBOARD_PATHS } from '@/routes/dashboard';
import i18n from '@/i18n';

export const HeaderBreadcrumbs: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const breadcrumbItems = useMemo<NavItem[]>(() => {
    if (!navigationRegistryV2) return [];
    const hierarchy = navigationRegistryV2.getNavHierarchy(location.pathname);
    return hierarchy;
    // Re-translate breadcrumb labels when language changes
  }, [location.pathname, i18n.language]);

  if (breadcrumbItems.length === 0) return null;

  return (
    <Box
      sx={{
        px: { xs: 2, lg: 3 },
        py: 1,
        maxWidth: 1800,
        mx: 'auto',
        width: '100%',
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.default',
        display: { xs: 'none', md: 'block' },
      }}
    >
      <Breadcrumbs
        separator={<ChevronRight style={{ width: 14, height: 14 }} />}
        aria-label={i18n.t('shared.header_breadcrumbs.k0')}
        sx={{
          '& .MuiBreadcrumbs-ol': {
            flexWrap: 'nowrap',
          },
        }}
      >
        <Link
          underline='hover'
          color='inherit'
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            cursor: 'pointer',
            fontSize: '0.8125rem',
            color: 'text.secondary',
            '&:hover': {
              color: 'primary.main',
            },
          }}
          onClick={() => navigate(DASHBOARD_PATHS.dashboard)}
        >
          <Home style={{ width: 14, height: 14 }} />
          {i18n.t('components.header_breadcrumbs.k0')}
        </Link>
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          return isLast ? (
            <Typography
              key={item.code || item.path || index}
              sx={{
                fontSize: '0.8125rem',
                color: 'text.primary',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              {item.label}
            </Typography>
          ) : (
            <Link
              key={item.code || item.path || index}
              underline='hover'
              color='inherit'
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                cursor: 'pointer',
                fontSize: '0.8125rem',
                color: 'text.secondary',
                '&:hover': {
                  color: 'primary.main',
                },
              }}
              onClick={() => item.path && navigate(item.path)}
            >
              {item.label}
            </Link>
          );
        })}
      </Breadcrumbs>
    </Box>
  );
};

export default HeaderBreadcrumbs;
