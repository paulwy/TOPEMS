/**
 * Shared PageContainer component
 * Extracted from apps/web with dependency decoupling.
 * Provides unified page layout with max-width container, padding, breadcrumbs slot.
 *
 * Decoupled from:
 * - ../templates/PageHeader (depends on react-router-dom, @/hooks) -> replaced with header slot prop
 * - All @/hooks and @/ imports removed
 */
import React from 'react';
import { Box, Paper, Skeleton } from '@mui/material';

/**
 * Page container props
 */
export interface PageContainerProps {
  /** Page content */
  children: React.ReactNode;

  /**
   * Custom header slot (replaces internal PageHeader rendering).
   * Pass your own header component here to avoid react-router-dom dependency.
   * When provided, title/subtitle/description/headerProps are ignored.
   */
  header?: React.ReactNode;

  /** Page title (kept for convenience; render via header slot for full control) */
  title?: string;

  /** Page subtitle (kept for convenience) */
  subtitle?: string;

  /** Page description (kept for convenience) */
  description?: string;

  /**
   * Content area max width
   * @default 'xl'
   */
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;

  /**
   * Show page padding
   * - true: horizontal padding (xs: 16px, sm+: 24px) and bottom padding (32px)
   * - false: no padding, content fills full width
   * @default true
   */
  padding?: boolean;

  /**
   * Wrap content in Paper component
   * @default false
   */
  paper?: boolean;

  /** Show loading skeleton */
  loading?: boolean;

  /** Custom background color */
  bgcolor?: string;

  /** Custom className */
  className?: string;

  /** Custom root container styles */
  sx?: React.ComponentProps<typeof Box>['sx'];

  /** Custom content area styles */
  contentSx?: React.ComponentProps<typeof Box>['sx'];
}

/**
 * Page container component
 * Serves as the outermost page wrapper, providing unified page layout,
 * background, max-width, and padding.
 *
 * @example
 * ```tsx
 * // With custom header slot (recommended for decoupled usage)
 * <PageContainer header={<MyPageHeader title="Users" />}>
 *   <DataTable ... />
 * </PageContainer>
 *
 * // Dashboard page
 * <PageContainer padding={false} maxWidth={false}>
 *   <DashboardContent />
 * </PageContainer>
 * ```
 */
export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  header,
  maxWidth = 'xl',
  padding = true,
  paper = false,
  loading = false,
  bgcolor,
  className,
  sx,
  contentSx,
}) => {
  const ContentWrapper = paper ? Paper : Box;
  const contentWrapperProps = paper
    ? {
        elevation: 0,
        sx: {
          borderRadius: 2,
          ...contentSx,
        },
      }
    : {
        sx: contentSx,
      };

  return (
    <Box
      className={className}
      sx={{
        width: '100%',
        minHeight: '100%',
        bgcolor: bgcolor || 'background.default',
        ...sx,
      }}
    >
      {/* Header slot */}
      {header}

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
            <Skeleton
              variant='rectangular'
              height={200}
              sx={{ borderRadius: 1 }}
            />
            <Skeleton
              variant='rectangular'
              height={300}
              sx={{ borderRadius: 1 }}
            />
          </Box>
        ) : (
          <ContentWrapper {...contentWrapperProps}>{children}</ContentWrapper>
        )}
      </Box>
    </Box>
  );
};

export default PageContainer;
