import React from 'react';
import { Box, Typography, LinearProgress, CircularProgress, keyframes } from '@mui/material';
import { styled } from '@mui/material/styles';

// 渐变颜色配置
const GRADIENT_COLORS = {
  primary: 'linear-gradient(90deg, primary.main, primary.dark)',
  success: 'linear-gradient(90deg, #22c55e, #16a34a)',
  warning: 'linear-gradient(90deg, warning.main, warning.dark)',
  error: 'linear-gradient(90deg, error.main, error.dark)',
  gradient: 'linear-gradient(90deg, primary.main, secondary.main, #ec4899)',
};

// 实色配置（用于 MUI 组件的 color 属性）
const _SOLID_COLORS = {
  primary: 'primary',
  success: 'success',
  warning: 'warning',
  error: 'error',
  gradient: 'primary', // gradient 使用 primary 作为基础色
} as const;

// 尺寸配置
const SIZE_CONFIG = {
  small: {
    linear: { height: 6, fontSize: '0.75rem' },
    circular: { size: 40, fontSize: '0.75rem' },
    segmented: { height: 8, fontSize: '0.75rem' },
  },
  medium: {
    linear: { height: 10, fontSize: '0.875rem' },
    circular: { size: 60, fontSize: '0.875rem' },
    segmented: { height: 12, fontSize: '0.875rem' },
  },
  large: {
    linear: { height: 14, fontSize: '1rem' },
    circular: { size: 80, fontSize: '1rem' },
    segmented: { height: 16, fontSize: '1rem' },
  },
};

// 流动动画
const flowAnimation = keyframes`
  0% {
    background-position: 0% 50%;
  }
  100% {
    background-position: 200% 50%;
  }
`;

// 条纹动画
const stripeAnimation = keyframes`
  0% {
    background-position: 1rem 0;
  }
  100% {
    background-position: 0 0;
  }
`;

// 样式化组件
const GradientLinearProgress = styled(LinearProgress, {
  shouldForwardProp: (prop) =>
    prop !== 'gradientColor' && prop !== 'animated' && prop !== 'striped',
})<{
  gradientColor?: string;
  animated?: boolean;
  striped?: boolean;
}>(({ gradientColor, animated, striped, theme }) => ({
  height: '100%',
  borderRadius: 4,
  backgroundColor: theme.palette.grey[200],
  '& .MuiLinearProgress-bar': {
    borderRadius: 4,
    background: gradientColor || theme.palette.primary.main,
    backgroundSize: animated ? '200% 200%' : '100% 100%',
    animation: animated ? `${flowAnimation} 3s linear infinite` : 'none',
    ...(striped && {
      backgroundImage: `linear-gradient(
        45deg,
        rgba(255, 255, 255, 0.15) 25%,
        transparent 25%,
        transparent 50%,
        rgba(255, 255, 255, 0.15) 50%,
        rgba(255, 255, 255, 0.15) 75%,
        transparent 75%,
        transparent
      )`,
      backgroundSize: '1rem 1rem',
      animation: `${stripeAnimation} 1s linear infinite`,
    }),
  },
}));

const _GradientCircularProgress = styled(CircularProgress, {
  shouldForwardProp: (prop) => prop !== 'gradientColor',
})<{ gradientColor?: string }>(({ gradientColor, theme }) => ({
  color: theme.palette.primary.main,
  ...(gradientColor && {
    '& .MuiCircularProgress-svg': {
      background: gradientColor,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
  }),
}));

const CircularContainer = styled(Box)({
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const _CircularValue = styled(Box)({
  position: 'absolute',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const SegmentedContainer = styled(Box)({
  display: 'flex',
  gap: 4,
  alignItems: 'center',
});

const Segment = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'filled' && prop !== 'gradientColor' && prop !== 'animated',
})<{
  filled?: boolean;
  gradientColor?: string;
  animated?: boolean;
}>(({ filled, gradientColor, animated, theme }) => ({
  flex: 1,
  height: '100%',
  borderRadius: 4,
  backgroundColor: filled ? 'transparent' : theme.palette.grey[200],
  transition: 'all 0.3s ease',
  ...(filled && {
    background: gradientColor || theme.palette.primary.main,
    backgroundSize: animated ? '200% 200%' : '100% 100%',
    animation: animated ? `${flowAnimation} 3s linear infinite` : 'none',
  }),
}));

export interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  label?: string;
  showValue?: boolean;
  variant?: 'linear' | 'circular' | 'segmented';
  color?: 'primary' | 'success' | 'warning' | 'error' | 'gradient';
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
  striped?: boolean;
  segments?: number; // 仅用于 segmented 变体
}

export default function ProgressBar({
  value,
  max = 100,
  label,
  showValue = false,
  variant = 'linear',
  color = 'primary',
  size = 'medium',
  animated = false,
  striped = false,
  segments = 10,
}: ProgressBarProps) {
  // 计算百分比
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const displayValue = Math.round(percentage);

  // 获取渐变颜色
  const gradientColor = GRADIENT_COLORS[color];
  const sizeConfig = SIZE_CONFIG[size];

  // 渲染线性进度条
  const renderLinear = () => (
    <Box sx={{ width: '100%' }}>
      {(label || showValue) && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 0.5,
          }}
        >
          {label && (
            <Typography
              variant='body2'
              sx={{ fontSize: sizeConfig.linear.fontSize }}
            >
              {label}
            </Typography>
          )}
          {showValue && (
            <Typography
              variant='body2'
              sx={{ fontSize: sizeConfig.linear.fontSize }}
            >
              {displayValue}%
            </Typography>
          )}
        </Box>
      )}
      <Box sx={{ height: sizeConfig.linear.height, borderRadius: 1 }}>
        <GradientLinearProgress
          variant='determinate'
          value={percentage}
          gradientColor={gradientColor}
          animated={animated}
          striped={striped}
        />
      </Box>
    </Box>
  );

  // 渲染圆形进度条
  const renderCircular = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <CircularContainer>
        <Box
          sx={{
            position: 'relative',
            width: sizeConfig.circular.size,
            height: sizeConfig.circular.size,
          }}
        >
          <svg
            width={sizeConfig.circular.size}
            height={sizeConfig.circular.size}
            style={{ transform: 'rotate(-90deg)' }}
          >
            {/* 背景圆 */}
            <circle
              cx={sizeConfig.circular.size / 2}
              cy={sizeConfig.circular.size / 2}
              r={(sizeConfig.circular.size - 8) / 2}
              fill='none'
              stroke='currentColor'
              strokeWidth={8}
              style={{ opacity: 0.2 }}
            />
            {/* 进度圆 */}
            <circle
              cx={sizeConfig.circular.size / 2}
              cy={sizeConfig.circular.size / 2}
              r={(sizeConfig.circular.size - 8) / 2}
              fill='none'
              stroke='url(#gradient)'
              strokeWidth={8}
              strokeLinecap='round'
              strokeDasharray={`${2 * Math.PI * ((sizeConfig.circular.size - 8) / 2)}`}
              strokeDashoffset={
                2 * Math.PI * ((sizeConfig.circular.size - 8) / 2) * (1 - percentage / 100)
              }
              style={{
                transition: 'stroke-dashoffset 0.3s ease',
              }}
            />
            <defs>
              <linearGradient
                id='gradient'
                x1='0%'
                y1='0%'
                x2='100%'
                y2='0%'
              >
                {color === 'gradient' ? (
                  <>
                    <stop
                      offset='0%'
                      stopColor='primary.main'
                    />
                    <stop
                      offset='50%'
                      stopColor='secondary.main'
                    />
                    <stop
                      offset='100%'
                      stopColor='#ec4899'
                    />
                  </>
                ) : (
                  <>
                    <stop
                      offset='0%'
                      stopColor={
                        GRADIENT_COLORS[color].match(/#[a-f0-9]{6}/gi)?.[0] || 'primary.main'
                      }
                    />
                    <stop
                      offset='100%'
                      stopColor={
                        GRADIENT_COLORS[color].match(/#[a-f0-9]{6}/gi)?.[1] || 'primary.dark'
                      }
                    />
                  </>
                )}
              </linearGradient>
            </defs>
          </svg>
          {showValue && (
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography
                variant='caption'
                sx={{
                  fontSize: sizeConfig.circular.fontSize,
                  fontWeight: 'medium',
                }}
              >
                {displayValue}%
              </Typography>
            </Box>
          )}
        </Box>
      </CircularContainer>
      {label && (
        <Typography
          variant='body2'
          sx={{ mt: 1, fontSize: sizeConfig.circular.fontSize }}
        >
          {label}
        </Typography>
      )}
    </Box>
  );

  // 渲染分段进度条
  const renderSegmented = () => {
    const filledSegments = Math.round((percentage / 100) * segments);
    const segmentArray = Array.from({ length: segments }, (_, i) => i);

    return (
      <Box sx={{ width: '100%' }}>
        {(label || showValue) && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 0.5,
            }}
          >
            {label && (
              <Typography
                variant='body2'
                sx={{ fontSize: sizeConfig.segmented.fontSize }}
              >
                {label}
              </Typography>
            )}
            {showValue && (
              <Typography
                variant='body2'
                sx={{ fontSize: sizeConfig.segmented.fontSize }}
              >
                {displayValue}%
              </Typography>
            )}
          </Box>
        )}
        <SegmentedContainer sx={{ height: sizeConfig.segmented.height }}>
          {segmentArray.map((index) => (
            <Segment
              key={index}
              filled={index < filledSegments}
              gradientColor={gradientColor}
              animated={animated && index < filledSegments}
            />
          ))}
        </SegmentedContainer>
      </Box>
    );
  };

  // 根据变体渲染不同的进度条
  switch (variant) {
    case 'circular':
      return renderCircular();
    case 'segmented':
      return renderSegmented();
    case 'linear':
    default:
      return renderLinear();
  }
}

export { ProgressBar };
