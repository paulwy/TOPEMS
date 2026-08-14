import React from 'react';
import { Skeleton, Box, useTheme } from '@mui/material';

const useSkeletonSx = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return {
    bg: isDark ? 'rgba(255, 255, 255, 0.04)' : 'background.paper',
    border: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0,0,0,0.06)',
    shadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.1)',
    subtleBorder: isDark ? 'glass.bgLight' : 'colors.action.hover',
    pageBg: isDark ? 'background.default' : 'grey.50',
    gradientFrom: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f8fafc',
    gradientTo: isDark ? 'rgba(255, 255, 255, 0.02)' : theme.palette.grey[100],
  };
};

export const MetricCardSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  const sx = useSkeletonSx();
  return (
    <Box
      className={className}
      sx={{
        backgroundColor: sx.bg,
        borderRadius: 3,
        boxShadow: sx.shadow,
        p: 3,
        border: `1px solid ${sx.border}`,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          mb: 2,
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Skeleton sx={{ height: 16, width: 96, mb: 1 }} />
          <Skeleton sx={{ height: 32, width: 128, mb: 1 }} />
          <Skeleton sx={{ height: 16, width: 80 }} />
        </Box>
        <Skeleton sx={{ width: 48, height: 48, borderRadius: 1.5 }} />
      </Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Skeleton sx={{ height: 16, width: 64 }} />
        <Skeleton sx={{ height: 32, width: 80 }} />
      </Box>
    </Box>
  );
};

export const ChartCardSkeleton: React.FC<{
  height?: number;
  className?: string;
}> = ({ height = 280, className }) => {
  const sx = useSkeletonSx();
  return (
    <Box
      className={className}
      sx={{
        backgroundColor: sx.bg,
        borderRadius: 3,
        boxShadow: sx.shadow,
        border: `1px solid ${sx.border}`,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${sx.subtleBorder}` }}>
        <Skeleton sx={{ height: 20, width: 128, mb: 0.5 }} />
        <Skeleton sx={{ height: 16, width: 96 }} />
      </Box>
      <Box sx={{ p: 3 }}>
        <Skeleton
          sx={{ width: '100%', borderRadius: 1 }}
          style={{ height: height - 60 }}
        />
      </Box>
    </Box>
  );
};

export const ModuleCardSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  const sx = useSkeletonSx();
  return (
    <Box
      className={className}
      sx={{
        backgroundColor: sx.bg,
        borderRadius: 3,
        boxShadow: sx.shadow,
        border: `1px solid ${sx.border}`,
        p: 3,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Skeleton sx={{ width: 40, height: 40, borderRadius: 1.5 }} />
          <Box>
            <Skeleton sx={{ height: 20, width: 80, mb: 0.5 }} />
            <Skeleton sx={{ height: 16, width: 64 }} />
          </Box>
        </Box>
        <Skeleton sx={{ width: 20, height: 20 }} />
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 2,
          pt: 2,
          borderTop: `1px solid ${sx.subtleBorder}`,
        }}
      >
        {[1, 2, 3].map((i) => (
          <Box
            key={i}
            sx={{ textAlign: 'center' }}
          >
            <Skeleton sx={{ height: 24, width: 48, mx: 'auto', mb: 0.5 }} />
            <Skeleton sx={{ height: 16, width: 32, mx: 'auto' }} />
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export const VisualizationCardSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  const sx = useSkeletonSx();
  return (
    <Box
      className={className}
      sx={{
        backgroundColor: sx.bg,
        borderRadius: 3,
        boxShadow: sx.shadow,
        border: `1px solid ${sx.border}`,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          height: 160,
          background: `linear-gradient(135deg, ${sx.gradientFrom} 0%, ${sx.gradientTo} 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Skeleton sx={{ width: 64, height: 64, borderRadius: 1.5 }} />
      </Box>
      <Box sx={{ p: 2.5 }}>
        <Skeleton sx={{ height: 20, width: 128, mb: 1 }} />
        <Skeleton sx={{ height: 16, width: '100%', mb: 0.5 }} />
        <Skeleton sx={{ height: 16, width: '75%', mb: 1.5 }} />
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Skeleton sx={{ height: 16, width: 80 }} />
          <Skeleton sx={{ height: 16, width: 64 }} />
        </Box>
      </Box>
    </Box>
  );
};

export const ActivityItemSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <Box
    className={className}
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      p: 1.5,
      borderRadius: 1.5,
      border: '1px solid rgba(0,0,0,0.08)',
    }}
  >
    <Skeleton sx={{ width: 40, height: 40, borderRadius: 1.5 }} />
    <Box sx={{ flex: 1 }}>
      <Skeleton sx={{ height: 16, width: 128, mb: 0.5 }} />
      <Skeleton sx={{ height: 12, width: 64 }} />
    </Box>
  </Box>
);

export const TableSkeleton: React.FC<{
  rows?: number;
  columns?: number;
  className?: string;
}> = ({ rows = 5, columns = 4, className }) => {
  const sx = useSkeletonSx();
  return (
    <Box
      className={className}
      sx={{
        backgroundColor: sx.bg,
        borderRadius: 1.5,
        boxShadow: sx.shadow,
        border: `1px solid ${sx.border}`,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${sx.subtleBorder}` }}>
        <Skeleton sx={{ height: 20, width: 128 }} />
      </Box>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton
              key={i}
              sx={{ height: 16, flex: 1 }}
            />
          ))}
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {Array.from({ length: rows }).map((_, i) => (
            <Box
              key={i}
              sx={{ display: 'flex', gap: 2, py: 1 }}
            >
              {Array.from({ length: columns }).map((_, j) => (
                <Skeleton
                  key={j}
                  sx={{ height: 16, flex: 1 }}
                />
              ))}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export const DashboardSkeleton: React.FC = () => {
  const sx = useSkeletonSx();
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: sx.pageBg, p: 3 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
        }}
      >
        <Box>
          <Skeleton sx={{ height: 32, width: 128, mb: 1 }} />
          <Skeleton sx={{ height: 16, width: 96 }} />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Skeleton sx={{ height: 16, width: 128 }} />
          <Skeleton sx={{ height: 40, width: 96, borderRadius: 1 }} />
        </Box>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(2, 1fr)',
            lg: 'repeat(4, 1fr)',
          },
          gap: 2,
          mb: 3,
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '3fr 1fr' },
          gap: 3,
          mb: 3,
        }}
      >
        <ChartCardSkeleton height={280} />
        <ChartCardSkeleton height={280} />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, 1fr)' },
          gap: 3,
        }}
      >
        {[1, 2, 3].map((i) => (
          <ChartCardSkeleton
            key={i}
            height={260}
          />
        ))}
      </Box>
    </Box>
  );
};

export const AnalyticsSkeleton: React.FC = () => {
  const sx = useSkeletonSx();
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: sx.pageBg, p: 3 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
        }}
      >
        <Box>
          <Skeleton sx={{ height: 32, width: 128, mb: 1 }} />
          <Skeleton sx={{ height: 16, width: 96 }} />
        </Box>
      </Box>

      <Skeleton sx={{ height: 64, width: '100%', borderRadius: 1.5, mb: 3 }} />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '3fr 1fr' },
          gap: 3,
          mb: 3,
        }}
      >
        <ChartCardSkeleton height={300} />
        <ChartCardSkeleton height={300} />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(2, 1fr)',
            lg: 'repeat(3, 1fr)',
          },
          gap: 2,
          mb: 3,
        }}
      >
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <ModuleCardSkeleton key={i} />
        ))}
      </Box>

      <Box
        sx={{
          backgroundColor: sx.bg,
          borderRadius: 1.5,
          boxShadow: sx.shadow,
          border: `1px solid ${sx.border}`,
          p: 3,
        }}
      >
        <Skeleton sx={{ height: 20, width: 96, mb: 2 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
          {[1, 2, 3].map((i) => (
            <Box
              key={i}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                py: 1.5,
              }}
            >
              <Skeleton sx={{ height: 16, width: 80 }} />
              <Skeleton sx={{ height: 24, width: 64 }} />
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export const VisualizationSkeleton: React.FC = () => {
  const sx = useSkeletonSx();
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: sx.pageBg, p: 3 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
        }}
      >
        <Box>
          <Skeleton sx={{ height: 32, width: 128, mb: 1 }} />
          <Skeleton sx={{ height: 16, width: 96 }} />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Skeleton sx={{ height: 40, width: 96 }} />
          <Skeleton sx={{ height: 40, width: 112 }} />
        </Box>
      </Box>

      <Skeleton sx={{ height: 56, width: '100%', borderRadius: 1.5, mb: 3 }} />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(2, 1fr)',
            lg: 'repeat(3, 1fr)',
          },
          gap: 2,
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <VisualizationCardSkeleton key={i} />
        ))}
      </Box>
    </Box>
  );
};

export default {
  MetricCardSkeleton,
  ChartCardSkeleton,
  ModuleCardSkeleton,
  VisualizationCardSkeleton,
  ActivityItemSkeleton,
  TableSkeleton,
  DashboardSkeleton,
  AnalyticsSkeleton,
  VisualizationSkeleton,
};
