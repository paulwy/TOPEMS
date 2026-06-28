import React from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';

export interface LoadingFallbackProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  fullHeight?: boolean;
  variant?: 'spinner' | 'skeleton' | 'dots';
  className?: string;
}

const sizeMap = {
  sm: 24,
  md: 40,
  lg: 56,
};

const DotsLoader: React.FC<{ size: 'sm' | 'md' | 'lg' }> = ({ size }) => {
  const dotSize = size === 'sm' ? 6 : size === 'md' ? 8 : 12;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: dotSize / 2 }}>
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          sx={{
            width: dotSize,
            height: dotSize,
            borderRadius: '50%',
            backgroundColor: 'primary.main',
            animation: 'bounce 1s ease-in-out infinite',
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </Box>
  );
};

const SkeletonLoader: React.FC = () => (
  <Box
    sx={{
      width: '100%',
      maxWidth: 400,
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
    }}
  >
    <Box
      sx={{
        height: 20,
        borderRadius: 1,
        backgroundColor: 'grey.200',
        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }}
    />
    <Box
      sx={{
        height: 20,
        borderRadius: 1,
        backgroundColor: 'grey.200',
        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        animationDelay: '0.1s',
        width: '80%',
      }}
    />
    <Box
      sx={{
        height: 20,
        borderRadius: 1,
        backgroundColor: 'grey.200',
        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        animationDelay: '0.2s',
        width: '60%',
      }}
    />
  </Box>
);

export const LoadingFallback: React.FC<LoadingFallbackProps> = ({
  text = '加载中...',
  size = 'md',
  fullHeight = true,
  variant = 'spinner',
  className = '',
}) => {
  const renderLoader = () => {
    switch (variant) {
      case 'dots':
        return <DotsLoader size={size} />;
      case 'skeleton':
        return <SkeletonLoader />;
      case 'spinner':
      default:
        return (
          <CircularProgress
            size={sizeMap[size]}
            color='primary'
          />
        );
    }
  };

  return (
    <Box
      className={className}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        padding: 4,
        minHeight: fullHeight ? '100%' : 'auto',
        backgroundColor: 'background.paper',
      }}
    >
      {renderLoader()}
      {text && (
        <Typography
          variant='body2'
          color='text.secondary'
        >
          {text}
        </Typography>
      )}
    </Box>
  );
};

export const PageLoadingFallback: React.FC<{ text?: string }> = ({ text = '页面加载中...' }) => (
  <Box
    sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      bgcolor: 'background.default',
    }}
  >
    <LoadingFallback
      text={text}
      size='lg'
      fullHeight={false}
    />
  </Box>
);

/**
 * 页面级骨架屏组件
 * 用于首次加载时显示页面的基本布局结构
 */
export const PageSkeleton: React.FC<{
  showHeader?: boolean;
  showSidebar?: boolean;
  contentLines?: number;
}> = ({ showHeader = true, showSidebar = true, contentLines = 6 }) => {
  const SkeletonBox: React.FC<{ width?: string | number; height?: number; delay?: string }> = ({
    width = '100%',
    height = 20,
    delay = '0s',
  }) => (
    <Box
      sx={{
        width,
        height,
        borderRadius: 1,
        backgroundColor: 'grey.200',
        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        animationDelay: delay,
      }}
    />
  );

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
      }}
    >
      {showHeader && (
        <Box
          sx={{
            height: 64,
            px: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <SkeletonBox
            width={120}
            height={24}
          />
          <Box sx={{ flex: 1 }} />
          <SkeletonBox
            width={80}
            height={32}
          />
          <SkeletonBox
            width={32}
            height={32}
          />
        </Box>
      )}

      <Box sx={{ display: 'flex', flex: 1 }}>
        {showSidebar && (
          <Box
            sx={{
              width: 240,
              borderRight: 1,
              borderColor: 'divider',
              p: 2,
              bgcolor: 'background.paper',
              display: { xs: 'none', md: 'block' },
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <SkeletonBox
                  key={i}
                  width={i === 1 ? 60 : 100}
                  height={36}
                  delay={`${i * 0.1}s`}
                />
              ))}
            </Box>
          </Box>
        )}

        <Box
          sx={{
            flex: 1,
            p: { xs: 2, sm: 3 },
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
          }}
        >
          {/* 统计卡片 */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
              gap: 2,
            }}
          >
            {[1, 2, 3, 4].map((i) => (
              <Box
                key={i}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                  border: 1,
                  borderColor: 'divider',
                }}
              >
                <SkeletonBox
                  width={80}
                  height={16}
                  delay={`${i * 0.05}s`}
                />
                <Box sx={{ mt: 1 }}>
                  <SkeletonBox
                    width={60}
                    height={32}
                    delay={`${i * 0.05 + 0.1}s`}
                  />
                </Box>
              </Box>
            ))}
          </Box>

          {/* 内容区域 */}
          <Box
            sx={{
              p: 3,
              borderRadius: 2,
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
            }}
          >
            <SkeletonBox
              width={120}
              height={24}
            />
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {Array.from({ length: contentLines }).map((_, i) => (
                <SkeletonBox
                  key={i}
                  width={i === contentLines - 1 ? '70%' : '100%'}
                  height={16}
                  delay={`${i * 0.05}s`}
                />
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default LoadingFallback;
