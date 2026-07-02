import React from 'react';
import { Box, Skeleton, Stack } from '@mui/material';

interface SkeletonScreenProps {
  variant?: 'dashboard' | 'list' | 'form' | 'detail';
}

export const SkeletonScreen: React.FC<SkeletonScreenProps> = ({ variant = 'dashboard' }) => {
  if (variant === 'list') {
    return (
      <Box sx={{ p: 4 }}>
        <Stack spacing={3}>
          {[...Array(5)].map((_, i) => (
            <Box
              key={i}
              sx={{ display: 'flex', gap: 2, alignItems: 'center' }}
            >
              <Skeleton
                variant='circular'
                width={40}
                height={40}
              />
              <Box sx={{ flex: 1 }}>
                <Skeleton
                  variant='text'
                  height={20}
                  width='60%'
                />
                <Skeleton
                  variant='text'
                  height={16}
                  width='40%'
                />
              </Box>
              <Skeleton
                variant='text'
                height={20}
                width='20%'
              />
            </Box>
          ))}
        </Stack>
      </Box>
    );
  }

  if (variant === 'form') {
    return (
      <Box sx={{ p: 4 }}>
        <Stack spacing={4}>
          <Skeleton
            variant='text'
            height={24}
            width='30%'
          />
          <Skeleton
            variant='rectangular'
            height={56}
          />
          <Skeleton
            variant='rectangular'
            height={56}
          />
          <Skeleton
            variant='rectangular'
            height={56}
          />
          <Skeleton
            variant='rectangular'
            height={56}
          />
          <Skeleton
            variant='rectangular'
            height={120}
          />
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Skeleton
              variant='rectangular'
              width={100}
              height={36}
            />
            <Skeleton
              variant='rectangular'
              width={100}
              height={36}
            />
          </Box>
        </Stack>
      </Box>
    );
  }

  if (variant === 'detail') {
    return (
      <Box sx={{ p: 4 }}>
        <Stack spacing={4}>
          <Skeleton
            variant='text'
            height={32}
            width='50%'
          />
          <Skeleton
            variant='text'
            height={16}
            width='30%'
          />
          <Box sx={{ display: 'flex', gap: 4 }}>
            <Skeleton
              variant='rectangular'
              width={200}
              height={150}
            />
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Skeleton
                variant='rectangular'
                height={40}
              />
              <Skeleton
                variant='rectangular'
                height={40}
              />
              <Skeleton
                variant='rectangular'
                height={40}
              />
            </Box>
          </Box>
          <Skeleton
            variant='rectangular'
            height={200}
          />
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      <Stack spacing={4}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Skeleton
            variant='rectangular'
            width={250}
            height={120}
          />
          <Skeleton
            variant='rectangular'
            width={250}
            height={120}
          />
          <Skeleton
            variant='rectangular'
            width={250}
            height={120}
          />
          <Skeleton
            variant='rectangular'
            width={250}
            height={120}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Skeleton
            variant='rectangular'
            width='65%'
            height={200}
          />
          <Skeleton
            variant='rectangular'
            width='33%'
            height={200}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Skeleton
            variant='rectangular'
            width='48%'
            height={150}
          />
          <Skeleton
            variant='rectangular'
            width='48%'
            height={150}
          />
        </Box>
      </Stack>
    </Box>
  );
};

export default SkeletonScreen;
