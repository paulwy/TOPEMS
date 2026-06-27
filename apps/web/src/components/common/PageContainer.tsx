import React from 'react';
import { Box, Paper, useTheme, useMediaQuery, Skeleton } from '@mui/material';
import { PageHeader } from '../templates/PageHeader';
import type { PageHeaderProps } from '../templates/PageHeader';

export interface PageContainerProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  description?: string;
  headerProps?: Omit<PageHeaderProps, 'title' | 'subtitle' | 'description'>;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  padding?: boolean;
  paper?: boolean;
  loading?: boolean;
  bgcolor?: string;
  className?: string;
  sx?: React.ComponentProps<typeof Box>['sx'];
  contentSx?: React.ComponentProps<typeof Box>['sx'];
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  title,
  subtitle,
  description,
  headerProps,
  maxWidth = 'xl',
  padding = true,
  paper = false,
  loading = false,
  bgcolor,
  className,
  sx,
  contentSx,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const hasHeader = Boolean(title || headerProps);

  const ContentWrapper = paper ? Paper : Box;
  const contentWrapperProps = paper ? {
    elevation: 0,
    sx: {
      borderRadius: 2,
      ...contentSx,
    },
  } : {
    sx: contentSx,
  };

  return (
    <Box
      className={className}
      sx={{
        width: '100%',
        minHeight: '100%',
        bgcolor: bgcolor || 'grey.50',
        ...sx,
      }}
    >
      {hasHeader && (
        <PageHeader
          title={title || ''}
          subtitle={subtitle}
          description={description}
          loading={loading}
          {...headerProps}
        />
      )}

      <Box
        sx={{
          ...(maxWidth && { maxWidth }),
          mx: 'auto',
          px: padding ? { xs: 2, sm: 3 } : 0,
          pb: padding ? 4 : 0,
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1 }} />
            <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 1 }} />
          </Box>
        ) : (
          <ContentWrapper {...contentWrapperProps}>{children}</ContentWrapper>
        )}
      </Box>
    </Box>
  );
};

export default PageContainer;
