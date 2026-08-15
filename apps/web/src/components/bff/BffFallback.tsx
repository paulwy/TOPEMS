/**
 * V45.0 Track D: BFF 降级 UI 组件
 *
 * 统一的降级视觉组件，用于不同降级场景：
 * - BffLoadingFallback：加载中降级（骨架屏 / Spinner）
 * - BffErrorFallback：错误降级（错误提示 + 重试）
 * - BffOfflineFallback：离线降级（离线提示 + 本地数据）
 * - BffCacheFallback：缓存数据降级（缓存标记 + 刷新）
 *
 * 与 fallback-strategy.ts 的 FallbackLevel 对应：
 * - Primary → BffLoadingFallback
 * - Secondary → BffErrorFallback（可重试）
 * - Tertiary → BffCacheFallback（展示缓存）
 * - Offline → BffOfflineFallback
 */

import React from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  CircularProgress,
  Chip,
  Skeleton,
  Alert,
  AlertTitle,
} from '@mui/material';
import i18n from '@/i18n';
import { RefreshCw, WifiOff, Database, AlertCircle, CloudOff, History } from 'lucide-react';
import { FallbackLevel } from '@/utils/bff/fallback-strategy';
import { designTokens, semanticTokens } from '@topems/tokens';

// ==================== 公共类型 ====================

/** 统一的降级 UI Props 基础 */
export interface BffFallbackBaseProps {
  /** 提示文案 */
  message?: string;
  /** 是否全屏展示，默认 false */
  fullScreen?: boolean;
  /** 最小高度（px），默认 200 */
  minHeight?: number;
  /** 刷新回调 */
  onRefresh?: () => void;
}

// ==================== BffLoadingFallback ====================

/** BffLoadingFallback Props */
export interface BffLoadingFallbackProps extends BffFallbackBaseProps {
  /** 骨架屏行数（>0 时展示骨架屏，否则展示 Spinner） */
  skeletonRows?: number;
  /** 骨架屏高度（px），默认 32 */
  skeletonHeight?: number;
}

/**
 * 加载中降级 UI
 *
 * - skeletonRows > 0：展示骨架屏列表
 * - 否则：展示 Spinner + 提示
 *
 * @example
 * ```tsx
 * <BffLoadingFallback message="加载仪表盘..." skeletonRows={5} />
 * ```
 */
export const BffLoadingFallback: React.FC<BffLoadingFallbackProps> = ({
  message = i18n.t('components.bff_fallback.k0'),
  fullScreen = false,
  minHeight = 200,
  skeletonRows = 0,
  skeletonHeight = 32,
}) => {
  const content = (
    <Stack
      spacing={1.5}
      sx={{ minHeight, width: '100%', alignItems: 'center', justifyContent: 'center' }}
    >
      {skeletonRows > 0 ? (
        <Box sx={{ width: '100%', px: 1 }}>
          {Array.from({ length: skeletonRows }).map((_, idx) => (
            <Skeleton
              key={idx}
              variant='rounded'
              height={skeletonHeight}
              sx={{ mb: 1.5, width: '100%' }}
            />
          ))}
        </Box>
      ) : (
        <>
          <CircularProgress
            size={32}
            thickness={4}
          />
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {message}
          </Typography>
        </>
      )}
    </Stack>
  );

  if (fullScreen) {
    return (
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.paper',
          zIndex: 1300,
        }}
      >
        {content}
      </Box>
    );
  }

  return content;
};

// ==================== BffErrorFallback ====================

/** BffErrorFallback Props */
export interface BffErrorFallbackProps extends BffFallbackBaseProps {
  /** 错误对象 */
  error?: Error;
  /** 错误标题 */
  title?: string;
  /** 是否展示错误详情，默认 true */
  showDetails?: boolean;
  /** 重试回调 */
  onRetry?: () => void;
  /** 最大重试次数（用于展示） */
  maxRetries?: number;
  /** 当前重试次数 */
  retryCount?: number;
}

/**
 * 错误降级 UI
 *
 * 展示错误信息 + 重试按钮，可配置是否展示错误详情。
 *
 * @example
 * ```tsx
 * <BffErrorFallback
 *   error={error}
 *   title="数据加载失败"
 *   onRetry={() => refetch()}
 * />
 * ```
 */
export const BffErrorFallback: React.FC<BffErrorFallbackProps> = ({
  error,
  message,
  title = i18n.t('components.bff_fallback.k0'),
  showDetails = true,
  fullScreen = false,
  minHeight = 200,
  onRetry,
  onRefresh,
  maxRetries,
  retryCount = 0,
}) => {
  const handleAction = onRetry ?? onRefresh;
  const actionLabel = onRetry ? i18n.t('components.bff_fallback.k2') : onRefresh ? i18n.t('components.bff_fallback.k1') : null;
  const canRetry = maxRetries === undefined || retryCount < maxRetries;

  const content = (
    <Box
      sx={{
        p: 2.5,
        borderRadius: 2,
        bgcolor: 'error.50',
        border: '1px solid',
        borderColor: 'error.main',
        width: '100%',
      }}
    >
      <Stack spacing={1.5}>
        <Stack
          direction='row'
          spacing={1}
          sx={{ alignItems: 'center' }}
        >
          <AlertCircle
            size={20}
            color={designTokens.colors.error.dark}
          />
          <Typography
            variant='subtitle2'
            color='error.main'
            sx={{ fontWeight: 600 }}
          >
            {title}
          </Typography>
          <Chip
            size='small'
            label={FallbackLevel.SECONDARY}
            variant='outlined'
            color='error'
          />
        </Stack>

        {message && (
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {message}
          </Typography>
        )}

        {showDetails && error && (
          <Typography
            variant='caption'
            color='text.secondary'
            sx={{ wordBreak: 'break-word' }}
          >
            {error.message}
          </Typography>
        )}

        {maxRetries !== undefined && retryCount > 0 && (
          <Typography
            variant='caption'
            color='text.secondary'
          >
            {i18n.t('components.bff_fallback.k0')} {retryCount} / {maxRetries} {i18n.t('components.bff_fallback.k1')}
          </Typography>
        )}

        {handleAction && canRetry && actionLabel && (
          <Button
            size='small'
            variant='outlined'
            color='error'
            startIcon={<RefreshCw size={16} />}
            onClick={handleAction}
          >
            {actionLabel}
          </Button>
        )}
      </Stack>
    </Box>
  );

  if (fullScreen) {
    return (
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.paper',
          zIndex: 1300,
          p: 3,
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 480 }}>{content}</Box>
      </Box>
    );
  }

  return <Box sx={{ minHeight, display: 'flex', alignItems: 'center' }}>{content}</Box>;
};

// ==================== BffOfflineFallback ====================

/** BffOfflineFallback Props */
export interface BffOfflineFallbackProps extends BffFallbackBaseProps {
  /** 是否展示本地数据提示，默认 true */
  showLocalHint?: boolean;
  /** 本地数据可用时回调（如展示 IndexedDB 数据） */
  onShowLocalData?: () => void;
}

/**
 * 离线降级 UI
 *
 * 检测到 navigator.onLine === false 时展示，
 * 提示用户当前离线，可查看本地缓存数据。
 *
 * @example
 * ```tsx
 * <BffOfflineFallback
 *   message="您当前处于离线状态"
 *   onShowLocalData={() => loadFromIndexedDB()}
 * />
 * ```
 */
export const BffOfflineFallback: React.FC<BffOfflineFallbackProps> = ({
  message = i18n.t('components.bff_fallback.k3'),
  fullScreen = false,
  minHeight = 200,
  showLocalHint = true,
  onShowLocalData,
  onRefresh,
}) => {
  const content = (
    <Box
      sx={{
        p: 2.5,
        borderRadius: 2,
        bgcolor: 'warning.50',
        border: '1px solid',
        borderColor: 'warning.main',
        width: '100%',
      }}
    >
      <Stack spacing={1.5}>
        <Stack
          direction='row'
          spacing={1}
          sx={{ alignItems: 'center' }}
        >
          <WifiOff
            size={20}
            color='colors.orange.700'
          />
          <Typography
            variant='subtitle2'
            color='warning.main'
            sx={{ fontWeight: 600 }}
          >
            {i18n.t('components.bff_fallback.k1')}
          </Typography>
          <Chip
            size='small'
            label={FallbackLevel.OFFLINE}
            variant='outlined'
            color='warning'
          />
        </Stack>

        <Typography
          variant='body2'
          color='text.secondary'
        >
          {message}
        </Typography>

        {showLocalHint && (
          <Alert
            severity='info'
            icon={<History size={18} />}
            sx={{ py: 0.5 }}
          >
            <AlertTitle sx={{ mb: 0 }}>{i18n.t('components.bff_fallback.k4')}</AlertTitle>
            {i18n.t('components.bff_fallback.k2')}
          </Alert>
        )}

        <Stack
          direction='row'
          spacing={1}
        >
          {onShowLocalData && (
            <Button
              size='small'
              variant='outlined'
              color='warning'
              startIcon={<Database size={16} />}
              onClick={onShowLocalData}
            >
              {i18n.t('components.bff_fallback.k3')}
            </Button>
          )}
          {onRefresh && (
            <Button
              size='small'
              variant='text'
              startIcon={<RefreshCw size={16} />}
              onClick={onRefresh}
            >
              {i18n.t('components.bff_fallback.k4')}
            </Button>
          )}
        </Stack>
      </Stack>
    </Box>
  );

  if (fullScreen) {
    return (
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.paper',
          zIndex: 1300,
          p: 3,
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 480 }}>{content}</Box>
      </Box>
    );
  }

  return <Box sx={{ minHeight, display: 'flex', alignItems: 'center' }}>{content}</Box>;
};

// ==================== BffCacheFallback ====================

/** BffCacheFallback Props */
export interface BffCacheFallbackProps extends BffFallbackBaseProps {
  /** 缓存数据时间戳（ISO） */
  cachedAt?: string;
  /** 是否展示缓存数据预览 */
  showCachePreview?: boolean;
  /** 缓存数据预览内容 */
  cachePreview?: React.ReactNode;
}

/**
 * 缓存数据降级 UI
 *
 * 当网络请求失败但缓存可用时，展示缓存数据并标记为"缓存数据"。
 *
 * @example
 * ```tsx
 * <BffCacheFallback
 *   cachedAt="2026-07-23T10:00:00Z"
 *   cachePreview={<DataTable data={cachedData} />}
 *   onRefresh={() => refetch()}
 * />
 * ```
 */
export const BffCacheFallback: React.FC<BffCacheFallbackProps> = ({
  message = i18n.t('components.bff_fallback.k5'),
  cachedAt,
  showCachePreview = false,
  cachePreview,
  minHeight = 120,
  onRefresh,
}) => {
  const formattedTime = cachedAt ? new Date(cachedAt).toLocaleString('zh-CN') : null;

  return (
    <Box sx={{ width: '100%' }}>
      <Alert
        severity='info'
        icon={<Database size={18} />}
        sx={{
          mb: showCachePreview ? 1.5 : 0,
          borderRadius: 2,
        }}
        action={
          onRefresh ? (
            <Button
              color='inherit'
              size='small'
              startIcon={<RefreshCw size={14} />}
              onClick={onRefresh}
            >
              {i18n.t('components.bff_fallback.k5')}
            </Button>
          ) : undefined
        }
      >
        <AlertTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0 }}>
          <CloudOff size={16} />
          <span>{i18n.t('components.bff_fallback.k6')}</span>
          <Chip
            size='small'
            label={FallbackLevel.TERTIARY}
            variant='outlined'
            color='info'
            sx={{ ml: 1 }}
          />
        </AlertTitle>
        <Typography variant='caption'>{message}</Typography>
        {formattedTime && (
          <Typography
            variant='caption'
            color='text.secondary'
            sx={{ display: 'block', mt: 0.5 }}
          >
            {i18n.t('components.bff_fallback.k2')}{formattedTime}
          </Typography>
        )}
      </Alert>
      {showCachePreview && cachePreview && <Box sx={{ minHeight }}>{cachePreview}</Box>}
    </Box>
  );
};

// ==================== 通用降级容器 ====================

/** 通用降级容器 Props */
export interface BffFallbackContainerProps {
  /** 降级级别 */
  level: FallbackLevel;
  /** 错误对象 */
  error?: Error;
  /** 缓存数据 */
  cachedData?: unknown;
  /** 缓存时间 */
  cachedAt?: string;
  /** 刷新回调 */
  onRefresh?: () => void;
  /** 重试回调 */
  onRetry?: () => void;
  /** 查看本地数据回调 */
  onShowLocalData?: () => void;
  /** 最小高度 */
  minHeight?: number;
}

/**
 * 通用降级容器
 *
 * 根据降级级别自动选择对应的降级 UI 组件。
 *
 * @example
 * ```tsx
 * <BffFallbackContainer
 *   level={fallbackManager.getFallbackLevel(error)}
 *   error={error}
 *   onRetry={() => refetch()}
 * />
 * ```
 */
export const BffFallbackContainer: React.FC<BffFallbackContainerProps> = ({
  level,
  error,
  cachedAt,
  onRefresh,
  onRetry,
  onShowLocalData,
  minHeight = 200,
}) => {
  switch (level) {
    case FallbackLevel.OFFLINE:
      return (
        <BffOfflineFallback
          minHeight={minHeight}
          onRefresh={onRefresh}
          onShowLocalData={onShowLocalData}
        />
      );
    case FallbackLevel.TERTIARY:
      return (
        <BffCacheFallback
          cachedAt={cachedAt}
          onRefresh={onRefresh ?? onRetry}
          minHeight={minHeight}
        />
      );
    case FallbackLevel.SECONDARY:
      return (
        <BffErrorFallback
          error={error}
          minHeight={minHeight}
          onRetry={onRetry ?? onRefresh}
        />
      );
    case FallbackLevel.PRIMARY:
    default:
      return (
        <BffLoadingFallback
          message={i18n.t('components.bff_fallback.k6')}
          minHeight={minHeight}
        />
      );
  }
};

export default BffFallbackContainer;
