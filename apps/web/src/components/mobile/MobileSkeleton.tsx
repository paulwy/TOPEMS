import React from 'react';
import { Box, Skeleton, useTheme } from '@mui/material';

export interface MobileSkeletonProps {
  type?: 'list' | 'card' | 'detail' | 'dashboard';
  count?: number;
  avatar?: boolean;
}

export const MobileSkeleton: React.FC<MobileSkeletonProps> = ({
  type = 'list',
  count = 5,
  avatar = true,
}) => {
  const theme = useTheme();

  const renderListSkeleton = () => (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <Box
          key={index}
          sx={{
            display: 'flex',
            gap: 2,
            p: 2,
            borderBottom: 1,
            borderColor: 'divider',
            backgroundColor: theme.palette.background.paper,
          }}
        >
          {avatar && (
            <Skeleton
              variant='circular'
              width={44}
              height={44}
            />
          )}
          <Box sx={{ flex: 1 }}>
            <Skeleton
              variant='text'
              width='60%'
              height={20}
              sx={{ mb: 1 }}
            />
            <Skeleton
              variant='text'
              width='100%'
              height={16}
              sx={{ mb: 0.5 }}
            />
            <Skeleton
              variant='text'
              width='40%'
              height={14}
            />
          </Box>
        </Box>
      ))}
    </>
  );

  const renderCardSkeleton = () => (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {Array.from({ length: Math.ceil(count / 2) }).map((_, rowIndex) => (
        <Box
          key={rowIndex}
          sx={{ display: 'flex', gap: 2 }}
        >
          {[0, 1].map((colIndex) => (
            <Box
              key={colIndex}
              sx={{
                flex: 1,
                borderRadius: 2,
                overflow: 'hidden',
                backgroundColor: theme.palette.background.paper,
              }}
            >
              <Skeleton
                variant='rectangular'
                width='100%'
                height={100}
              />
              <Box sx={{ p: 1.5 }}>
                <Skeleton
                  variant='text'
                  width='80%'
                  height={18}
                  sx={{ mb: 0.5 }}
                />
                <Skeleton
                  variant='text'
                  width='50%'
                  height={14}
                />
              </Box>
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  );

  const renderDetailSkeleton = () => (
    <Box sx={{ p: 2 }}>
      <Skeleton
        variant='text'
        width='80%'
        height={28}
        sx={{ mb: 2 }}
      />
      <Skeleton
        variant='rectangular'
        width='100%'
        height={200}
        sx={{ borderRadius: 2, mb: 2 }}
      />
      {Array.from({ length: count }).map((_, index) => (
        <Box
          key={index}
          sx={{ mb: 2 }}
        >
          <Skeleton
            variant='text'
            width='30%'
            height={16}
            sx={{ mb: 0.5 }}
          />
          <Skeleton
            variant='rectangular'
            width='100%'
            height={44}
            sx={{ borderRadius: 1 }}
          />
        </Box>
      ))}
    </Box>
  );

  const renderDashboardSkeleton = () => (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        {[0, 1].map((i) => (
          <Box
            key={i}
            sx={{
              flex: 1,
              p: 2,
              borderRadius: 2,
              backgroundColor: theme.palette.background.paper,
            }}
          >
            <Skeleton
              variant='text'
              width='60%'
              height={14}
              sx={{ mb: 1 }}
            />
            <Skeleton
              variant='text'
              width='80%'
              height={24}
            />
          </Box>
        ))}
      </Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            sx={{
              flex: 1,
              p: 2,
              borderRadius: 2,
              backgroundColor: theme.palette.background.paper,
            }}
          >
            <Skeleton
              variant='text'
              width='70%'
              height={14}
              sx={{ mb: 1 }}
            />
            <Skeleton
              variant='text'
              width='50%'
              height={20}
            />
          </Box>
        ))}
      </Box>
      <Skeleton
        variant='rectangular'
        width='100%'
        height={180}
        sx={{ borderRadius: 2, mb: 2 }}
      />
      <Skeleton
        variant='rectangular'
        width='100%'
        height={150}
        sx={{ borderRadius: 2 }}
      />
    </Box>
  );

  switch (type) {
    case 'card':
      return renderCardSkeleton();
    case 'detail':
      return renderDetailSkeleton();
    case 'dashboard':
      return renderDashboardSkeleton();
    case 'list':
    default:
      return renderListSkeleton();
  }
};

export default MobileSkeleton;
