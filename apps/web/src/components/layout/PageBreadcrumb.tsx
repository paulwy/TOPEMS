import React from 'react';
import { Box, Breadcrumbs, Link, Typography } from '@mui/material';
import { Home, ChevronRight } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';
import { useAutoBreadcrumbs, type AutoBreadcrumbItem } from '@/hooks';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}

export interface PageBreadcrumbProps {
  items?: BreadcrumbItem[];
  auto?: boolean;
  showHome?: boolean;
  homeHref?: string;
  homeLabel?: string;
  onHomeClick?: () => void;
  separator?: React.ReactNode;
  maxItems?: number;
  sx?: object;
  customItems?: BreadcrumbItem[];
  dynamicTitleResolver?: (paramName: string, paramValue: string) => string | undefined;
  fallbackToPath?: boolean;
}

export const PageBreadcrumb: React.FC<PageBreadcrumbProps> = ({
  items: manualItems,
  auto = true,
  showHome = true,
  homeHref = '/dashboard',
  homeLabel = '首页',
  onHomeClick,
  separator,
  maxItems = 8,
  sx,
  customItems,
  dynamicTitleResolver,
  fallbackToPath = true,
}) => {
  const autoItems = useAutoBreadcrumbs({
    includeHome: false,
    homePath: homeHref,
    homeLabel,
    customItems: customItems as AutoBreadcrumbItem[],
    dynamicTitleResolver,
    fallbackToPath,
  });

  const hasManualItems = manualItems && manualItems.length > 0;
  const items = hasManualItems ? manualItems : autoItems;

  const defaultSeparator = separator || (
    <ChevronRight style={{ width: 16, height: 16, opacity: 0.5 }} />
  );

  const renderBreadcrumbItem = (item: BreadcrumbItem, index: number, isLast: boolean) => {
    if (isLast || (!item.href && !item.onClick)) {
      return (
        <Typography
          key={index}
          color='primary.main'
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            fontSize: '0.875rem',
            fontWeight: 600,
            py: 0.5,
            px: 1,
            borderRadius: 1,
            backgroundColor: 'primary.light',
          }}
        >
          {item.icon}
          {item.label}
        </Typography>
      );
    }

    return (
      <Link
        key={index}
        component={item.href ? RouterLink : 'button'}
        to={item.href}
        onClick={item.onClick}
        color='inherit'
        underline='hover'
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          fontSize: '0.875rem',
          fontWeight: 400,
          cursor: 'pointer',
          py: 0.5,
          px: 1,
          borderRadius: 1,
          transition: 'all 0.15s ease-in-out',
          '&:hover': {
            color: 'primary.main',
            backgroundColor: 'action.hover',
          },
        }}
      >
        {item.icon}
        {item.label}
      </Link>
    );
  };

  const breadcrumbItems: React.ReactNode[] = [];

  if (showHome) {
    breadcrumbItems.push(
      <Link
        key='home'
        component={homeHref ? RouterLink : 'button'}
        to={homeHref}
        onClick={onHomeClick}
        color='inherit'
        underline='hover'
        sx={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          '&:hover': {
            color: 'primary.main',
          },
        }}
      >
        <Home style={{ width: 16, height: 16 }} />
      </Link>
    );
  }

  items.forEach((item, index) => {
    const isLast = index === items.length - 1;
    breadcrumbItems.push(renderBreadcrumbItem(item, index, isLast));
  });

  return (
    <Box sx={{ mb: 2, ...sx }}>
      <Breadcrumbs
        separator={defaultSeparator}
        maxItems={maxItems}
        itemsAfterCollapse={2}
        sx={{
          '& .MuiBreadcrumbs-ol': {
            flexWrap: 'nowrap',
          },
        }}
      >
        {breadcrumbItems}
      </Breadcrumbs>
    </Box>
  );
};

export default PageBreadcrumb;