import React from 'react';
import {
  Box,
  Paper,
  Skeleton,
  Card,
  CardContent,
  LinearProgress,
  CircularProgress,
  Typography,
} from '@mui/material';

// ============ 类型定义 ============

export interface LoadingStateProps {
  // 加载类型
  type?: 'skeleton' | 'progress' | 'spinner' | 'fullscreen';

  // 文案
  message?: string;

  // 骨架屏内容
  variant?: 'table' | 'card' | 'detail' | 'list' | 'form';

  // 行数
  rows?: number;

  // 进度
  progress?: number;

  // 自定义
  children?: React.ReactNode;
}

// ============ 骨架屏预设 ============

const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <Paper sx={{ p: 2, borderRadius: 2 }}>
    {/* 表头 */}
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        mb: 2,
        pb: 2,
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Skeleton width={40} />
      <Skeleton width='30%' />
      <Skeleton width='20%' />
      <Skeleton width='15%' />
      <Skeleton width='10%' />
    </Box>

    {/* 行 */}
    {Array.from({ length: rows }).map((_, index) => (
      <Box
        key={index}
        sx={{ display: 'flex', gap: 2, mb: 2, '&:last-child': { mb: 0 } }}
      >
        <Skeleton width={40} />
        <Skeleton width='30%' />
        <Skeleton width='20%' />
        <Skeleton width='15%' />
        <Skeleton width='10%' />
      </Box>
    ))}
  </Paper>
);

const CardSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: 2,
    }}
  >
    {Array.from({ length: count }).map((_, index) => (
      <Card
        key={index}
        sx={{ borderRadius: 2 }}
      >
        <CardContent>
          <Skeleton
            variant='text'
            width='40%'
            height={24}
            sx={{ mb: 1 }}
          />
          <Skeleton
            variant='text'
            width='60%'
          />
          <Skeleton
            variant='text'
            width='80%'
          />
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
            <Skeleton
              variant='circular'
              width={32}
              height={32}
            />
            <Skeleton
              variant='text'
              width={80}
            />
          </Box>
        </CardContent>
      </Card>
    ))}
  </Box>
);

const DetailSkeleton: React.FC = () => (
  <Paper sx={{ p: 3, borderRadius: 2 }}>
    {/* 头部 */}
    <Box sx={{ display: 'flex', gap: 3, mb: 4 }}>
      <Skeleton
        variant='rectangular'
        width={80}
        height={80}
        sx={{ borderRadius: 1 }}
      />
      <Box sx={{ flex: 1 }}>
        <Skeleton
          variant='text'
          width='40%'
          height={32}
          sx={{ mb: 1 }}
        />
        <Skeleton
          variant='text'
          width='60%'
        />
        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <Skeleton
            variant='rounded'
            width={60}
            height={24}
          />
          <Skeleton
            variant='rounded'
            width={60}
            height={24}
          />
          <Skeleton
            variant='rounded'
            width={60}
            height={24}
          />
        </Box>
      </Box>
    </Box>

    {/* 标签页内容 */}
    <Skeleton
      variant='text'
      width='20%'
      height={40}
      sx={{ mb: 2 }}
    />
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
      {Array.from({ length: 6 }).map((_, index) => (
        <Box key={index}>
          <Skeleton
            variant='text'
            width='40%'
            height={20}
            sx={{ mb: 0.5 }}
          />
          <Skeleton
            variant='text'
            width='70%'
          />
        </Box>
      ))}
    </Box>
  </Paper>
);

const ListSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <Paper sx={{ borderRadius: 2 }}>
    {Array.from({ length: rows }).map((_, index) => (
      <Box
        key={index}
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          borderBottom: index < rows - 1 ? 1 : 0,
          borderColor: 'divider',
        }}
      >
        <Skeleton
          variant='circular'
          width={40}
          height={40}
        />
        <Box sx={{ flex: 1 }}>
          <Skeleton
            variant='text'
            width='40%'
          />
          <Skeleton
            variant='text'
            width='60%'
            height={16}
          />
        </Box>
        <Skeleton
          variant='rounded'
          width={80}
          height={32}
        />
      </Box>
    ))}
  </Paper>
);

const FormSkeleton: React.FC = () => (
  <Paper sx={{ p: 3, borderRadius: 2 }}>
    {/* 分组1 */}
    <Box sx={{ mb: 3 }}>
      <Skeleton
        variant='text'
        width={120}
        height={24}
        sx={{ mb: 2 }}
      />
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
        {Array.from({ length: 6 }).map((_, index) => (
          <Box key={index}>
            <Skeleton
              variant='text'
              width='40%'
              height={20}
              sx={{ mb: 0.5 }}
            />
            <Skeleton
              variant='rounded'
              width='100%'
              height={40}
            />
          </Box>
        ))}
      </Box>
    </Box>

    {/* 分组2 */}
    <Box>
      <Skeleton
        variant='text'
        width={120}
        height={24}
        sx={{ mb: 2 }}
      />
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Box
            key={index}
            sx={{ gridColumn: index < 2 ? 'span 1' : 'span 2' }}
          >
            <Skeleton
              variant='text'
              width='30%'
              height={20}
              sx={{ mb: 0.5 }}
            />
            <Skeleton
              variant='rounded'
              width='100%'
              height={80}
            />
          </Box>
        ))}
      </Box>
    </Box>
  </Paper>
);

// ============ LoadingState 组件 ============

export const LoadingState: React.FC<LoadingStateProps> = ({
  type = 'skeleton',
  message,
  variant = 'table',
  rows = 5,
  progress,
  children,
}) => {
  // 全屏加载
  if (type === 'fullscreen') {
    return (
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'rgba(255, 255, 255, 0.9)',
          zIndex: 9999,
        }}
      >
        <CircularProgress size={48} />
        {message && (
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ mt: 2 }}
          >
            {message}
          </Typography>
        )}
      </Box>
    );
  }

  // 进度条加载
  if (type === 'progress') {
    return (
      <Paper sx={{ p: 4, borderRadius: 2, textAlign: 'center' }}>
        <Box sx={{ maxWidth: 400, mx: 'auto' }}>
          <LinearProgress
            variant={progress !== undefined ? 'determinate' : 'indeterminate'}
            value={progress}
            sx={{ height: 8, borderRadius: 4 }}
          />
          {message && (
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ mt: 2 }}
            >
              {progress !== undefined ? `${progress}%` : message}
            </Typography>
          )}
        </Box>
      </Paper>
    );
  }

  // 旋转器
  if (type === 'spinner') {
    return (
      <Paper sx={{ p: 4, borderRadius: 2, textAlign: 'center' }}>
        <CircularProgress size={48} />
        {message && (
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ mt: 2 }}
          >
            {message}
          </Typography>
        )}
        {children}
      </Paper>
    );
  }

  // 骨架屏
  return (
    <>
      {variant === 'table' && <TableSkeleton rows={rows} />}
      {variant === 'card' && <CardSkeleton count={rows} />}
      {variant === 'detail' && <DetailSkeleton />}
      {variant === 'list' && <ListSkeleton rows={rows} />}
      {variant === 'form' && <FormSkeleton />}
    </>
  );
};

// ============ 内联加载 ============

export const InlineLoading: React.FC<{ message?: string }> = ({ message }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 1,
      py: 4,
    }}
  >
    <CircularProgress size={20} />
    {message && (
      <Typography
        variant='body2'
        color='text.secondary'
      >
        {message}
      </Typography>
    )}
  </Box>
);

// ============ 按钮加载 ============

export const ButtonLoading: React.FC<{ label: string; loading?: boolean }> = ({
  label,
  loading,
}) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1,
    }}
  >
    {loading && (
      <CircularProgress
        size={16}
        color='inherit'
      />
    )}
    {loading ? '处理中...' : label}
  </Box>
);

export default LoadingState;
