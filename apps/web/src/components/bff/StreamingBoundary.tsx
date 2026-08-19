/**
 * V42.0 Track D: 流式渲染边界组件
 *
 * 包裹组件树，支持流式数据注入与分层渲染：
 * - 多层 Suspense 嵌套
 * - 按数据优先级分层渲染（critical / secondary / tertiary）
 * - 错误恢复（每层独立错误边界，互不影响）
 * - 流式数据注入回调
 *
 * @example
 * ```tsx
 * <StreamingBoundary>
 *   <CriticalData />      // 优先渲染，无 Suspense 包裹
 *   <Suspense fallback={<Skeleton />}>
 *     <SecondaryData />   // 次要数据
 *   </Suspense>
 *   <Suspense fallback={<Skeleton />}>
 *     <TertiaryData />    // 三级数据
 *   </Suspense>
 * </StreamingBoundary>
 * ```
 */

import React, {
  Component,
  Suspense,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
  type ErrorInfo,
} from 'react';
import i18n from '@/i18n';
import { Box, Stack, Skeleton, Typography, Button, LinearProgress } from '@mui/material';
import { AlertCircle, RefreshCw, Layers } from 'lucide-react';
import { logger } from '@/utils/logger';

const boundaryLogger = logger.child({ prefix: 'StreamingBoundary' });

// ==================== 层级错误边界 ====================

/** LayerErrorBoundary Props */
interface LayerErrorBoundaryProps {
  children: ReactNode;
  /** 层级名称（用于日志） */
  layerName: string;
  /** 错误回退渲染函数 */
  fallback?: (error: Error, reset: () => void) => ReactNode;
  /** 错误回调 */
  onError?: (error: Error, layerName: string) => void;
  /** 重置 key（变化时清除错误） */
  resetKey?: string | number;
}

/** LayerErrorBoundary State */
interface LayerErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * 单层错误边界
 *
 * 捕获某一渲染层的错误，不向上冒泡，实现错误隔离：
 * 某一层失败时，其他层仍可正常渲染。
 */
class LayerErrorBoundary extends Component<LayerErrorBoundaryProps, LayerErrorBoundaryState> {
  constructor(props: LayerErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): LayerErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    boundaryLogger.error(
      `${i18n.t('components.streaming_boundary.k0')}${this.props.layerName}${i18n.t('components.streaming_boundary.k1')}`,
      error,
      info.componentStack
    );
    this.props.onError?.(error, this.props.layerName);
  }

  override componentDidUpdate(prevProps: Readonly<LayerErrorBoundaryProps>): void {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  override render(): ReactNode {
    const { children, fallback, layerName } = this.props;
    const { hasError, error } = this.state;

    if (hasError && error) {
      if (fallback) {
        return fallback(error, this.handleReset);
      }
      return (
        <DefaultLayerErrorFallback
          error={error}
          layerName={layerName}
          onReset={this.handleReset}
        />
      );
    }

    return children;
  }
}

/** 默认层级错误回退 */
const DefaultLayerErrorFallback: React.FC<{
  error: Error;
  layerName: string;
  onReset: () => void;
}> = ({ error, layerName, onReset }) => (
  <Box
    sx={{
      p: 2,
      borderRadius: 1,
      bgcolor: 'error.50',
      border: '1px solid',
      borderColor: 'error.light',
    }}
  >
    <Stack
      direction='row'
      spacing={1}
      sx={{ mb: 1, alignItems: 'center' }}
    >
      <AlertCircle
        size={16}
        color='error'
      />
      <Typography
        variant='caption'
        color='error.main'
        sx={{ fontWeight: 600 }}
      >
        {i18n.t('components.streaming_boundary.k0')}
        {layerName}
        {i18n.t('components.streaming_boundary.k1')}
      </Typography>
    </Stack>
    <Typography
      variant='caption'
      color='text.secondary'
      sx={{ display: 'block', mb: 1, wordBreak: 'break-word' }}
    >
      {error.message}
    </Typography>
    <Button
      size='small'
      variant='outlined'
      color='error'
      startIcon={<RefreshCw size={14} />}
      onClick={onReset}
    >
      {i18n.t('components.streaming_boundary.k0')}
    </Button>
  </Box>
);

// ==================== 默认骨架屏 ====================

/** 分层骨架屏 */
const LayerSkeleton: React.FC<{ layer: string; height?: number }> = ({ layer, height = 120 }) => (
  <Box
    data-streaming-layer={layer}
    sx={{ width: '100%' }}
  >
    <Skeleton
      variant='rectangular'
      height={height}
      sx={{ borderRadius: 1 }}
    />
  </Box>
);

// ==================== StreamingBoundary ====================

/** StreamingBoundary Props */
export interface StreamingBoundaryProps {
  children: ReactNode;
  /** 是否启用流式数据注入追踪 */
  trackStreaming?: boolean;
  /** 错误回调（任意层出错时触发） */
  onError?: (error: Error, layerName: string) => void;
  /** 任意层就绪回调 */
  onLayerReady?: (layerName: string) => void;
  /** 全部就绪回调 */
  onAllReady?: () => void;
  /** 重置 key（变化时清除所有层错误） */
  resetKey?: string | number;
  /** 整体加载进度（0-100，外部控制） */
  progress?: number;
}

/** 内部追踪状态 */
interface StreamingTrackState {
  layers: Record<string, 'pending' | 'resolved' | 'rejected'>;
  errors: Record<string, Error>;
}

/**
 * 流式渲染边界组件
 *
 * 设计原则:
 * 1. 子树中的 <Suspense> 会被自动识别为分层边界
 * 2. 每层独立错误恢复（LayerErrorBoundary 包裹）
 * 3. 按数据优先级分层：直接子节点 = critical（无 fallback），
 *    Suspense 包裹 = secondary/tertiary（流式填充）
 * 4. 提供整体进度条 + 层级状态追踪
 *
 * @example
 * ```tsx
 * <StreamingBoundary
 *   onAllReady={() => console.log('全部就绪')}
 *   progress={60}
 * >
 *   <CriticalHeader />  // 优先渲染
 *   <Suspense fallback={<Skeleton />}>
 *     <DashboardStats />  // 次要数据，流式填充
 *   </Suspense>
 *   <Suspense fallback={<Skeleton />}>
 *     <ChartPanel />  // 三级数据
 *   </Suspense>
 * </StreamingBoundary>
 * ```
 */
export const StreamingBoundary: React.FC<StreamingBoundaryProps> = ({
  children,
  trackStreaming = true,
  onError,
  onLayerReady,
  onAllReady,
  resetKey,
  progress,
}) => {
  const [trackState, setTrackState] = useState<StreamingTrackState>({
    layers: {},
    errors: {},
  });
  const layerCount = useRef(0);
  const readyCount = useRef(0);

  const handleLayerError = useCallback(
    (error: Error, layerName: string) => {
      setTrackState((prev) => ({
        ...prev,
        layers: { ...prev.layers, [layerName]: 'rejected' },
        errors: { ...prev.errors, [layerName]: error },
      }));
      onError?.(error, layerName);
    },
    [onError]
  );

  const handleLayerReady = useCallback(
    (layerName: string) => {
      setTrackState((prev) => {
        if (prev.layers[layerName] === 'resolved') return prev;
        const newLayers: StreamingTrackState['layers'] = {
          ...prev.layers,
          [layerName]: 'resolved',
        };
        const newReady = Object.values(newLayers).filter((s) => s === 'resolved').length;
        readyCount.current = newReady;
        onLayerReady?.(layerName);
        if (newReady === layerCount.current && layerCount.current > 0) {
          onAllReady?.();
        }
        return { ...prev, layers: newLayers };
      });
    },
    [onLayerReady, onAllReady]
  );

  // 渲染 children，自动为 Suspense 子树包裹错误边界
  const enhancedChildren = React.useMemo(() => {
    if (!trackStreaming) return children;

    const childArray = React.Children.toArray(children);
    layerCount.current = 0;

    return childArray.map((child, index) => {
      if (!React.isValidElement(child)) return child;

      const childType = child.type;
      // 检测 Suspense 组件（按 displayName 或类型名）
      const isSuspense =
        (typeof childType === 'function' || typeof childType === 'object') &&
        ((childType as { displayName?: string }).displayName === 'Suspense' ||
          childType === Suspense);

      if (!isSuspense) {
        // 非 Suspense 子节点视为 critical 层，无需包裹
        return child;
      }

      const layerName = `layer-${index}`;
      layerCount.current += 1;

      return (
        <LayerErrorBoundary
          key={`layer-${index}`}
          layerName={layerName}
          onError={handleLayerError}
          resetKey={resetKey}
        >
          <LayerReadyTracker
            layerName={layerName}
            onReady={handleLayerReady}
          >
            {child}
          </LayerReadyTracker>
        </LayerErrorBoundary>
      );
    });
  }, [children, trackStreaming, resetKey, handleLayerError, handleLayerReady]);

  const hasErrors = Object.keys(trackState.errors).length > 0;
  const readyLayers = Object.values(trackState.layers).filter((s) => s === 'resolved').length;
  const totalLayers = layerCount.current;

  return (
    <Box
      data-streaming-boundary
      sx={{ width: '100%' }}
    >
      {trackStreaming && totalLayers > 0 && (
        <Box sx={{ mb: 1 }}>
          <Stack
            direction='row'
            spacing={1}
            sx={{ mb: 0.5, alignItems: 'center' }}
          >
            <Layers
              size={14}
              color='primary'
            />
            <Typography
              variant='caption'
              color='text.secondary'
            >
              [i18n.t('components.streaming_boundary.k1')]: {readyLayers}/{totalLayers}{' '}
              {i18n.t('components.streaming_boundary.k2')}
              {hasErrors && (
                <Typography
                  component='span'
                  variant='caption'
                  color='error.main'
                  sx={{ ml: 1 }}
                >
                  ({Object.keys(trackState.errors).length}{' '}
                  {i18n.t('components.streaming_boundary.k2')}
                </Typography>
              )}
            </Typography>
          </Stack>
          <LinearProgress
            variant='determinate'
            value={progress ?? (totalLayers > 0 ? (readyLayers / totalLayers) * 100 : 0)}
            color={hasErrors ? 'warning' : 'primary'}
            sx={{ height: 4, borderRadius: 2 }}
          />
        </Box>
      )}
      {enhancedChildren}
    </Box>
  );
};

/**
 * 层级就绪追踪器
 *
 * 在子树挂载后触发 onReady，标识该层流式填充完成。
 */
const LayerReadyTracker: React.FC<{
  layerName: string;
  onReady: (layerName: string) => void;
  children: ReactNode;
}> = ({ layerName, onReady, children }) => {
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      // 延迟一帧，确保 Suspense 内部内容真正渲染
      const timer = requestAnimationFrame(() => {
        onReady(layerName);
      });
      return () => cancelAnimationFrame(timer);
    }
    return;
  }, [layerName, onReady]);

  return <>{children}</>;
};

// ==================== 流式层级便捷组件 ====================

/** StreamingLayer Props */
export interface StreamingLayerProps {
  children: ReactNode;
  /** 层级名称 */
  name: string;
  /** 优先级（数字越小越优先） */
  priority?: 1 | 2 | 3;
  /** 加载回退 */
  fallback?: ReactNode;
  /** 错误回退 */
  errorFallback?: (error: Error, reset: () => void) => ReactNode;
  /** 就绪回调 */
  onReady?: () => void;
  /** 错误回调 */
  onError?: (error: Error) => void;
}

/**
 * 流式渲染层便捷组件
 *
 * 封装 Suspense + LayerErrorBoundary，提供命名层级与优先级标记。
 * 适合手动声明分层结构（而非依赖 StreamingBoundary 自动检测）。
 *
 * @example
 * ```tsx
 * <StreamingLayer name="stats" priority={1} fallback={<Skeleton />}>
 *   <Stats />
 * </StreamingLayer>
 * <StreamingLayer name="chart" priority={2} fallback={<Skeleton />}>
 *   <Chart />
 * </StreamingLayer>
 * ```
 */
export const StreamingLayer: React.FC<StreamingLayerProps> = ({
  children,
  name,
  priority = 2,
  fallback,
  errorFallback,
  onReady,
  onError,
}) => {
  const [resetKey, setResetKey] = useState(0);

  const handleReset = useCallback(() => {
    setResetKey((k) => k + 1);
  }, []);

  const handleError = useCallback(
    (error: Error) => {
      onError?.(error);
    },
    [onError]
  );

  const defaultFallback = fallback ?? <LayerSkeleton layer={name} />;

  return (
    <Box
      data-streaming-layer={name}
      data-streaming-priority={priority}
    >
      <LayerErrorBoundary
        layerName={name}
        fallback={errorFallback}
        onError={handleError}
        resetKey={resetKey}
      >
        <Suspense
          fallback={defaultFallback as any}
          {...({ name: `layer-${name}` } as any)}
        >
          <LayerReadyTracker
            layerName={name}
            onReady={() => onReady?.()}
          >
            {children}
          </LayerReadyTracker>
        </Suspense>
      </LayerErrorBoundary>
    </Box>
  );
};

export default StreamingBoundary;
