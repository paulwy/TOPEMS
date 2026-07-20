import React, { Component, ReactNode, Suspense, lazy } from 'react';
import { Box, CircularProgress, Typography, Button } from '@mui/material';
import { AlertTriangle as ErrorIcon, RefreshCw as RefreshIcon } from 'lucide-react';

/**
 * 远程模块加载状态
 */
interface RemoteLoaderState {
  loading: boolean;
  error: Error | null;
  retryCount: number;
}

/**
 * 远程模块错误边界
 */
class RemoteErrorBoundary extends Component<
  { children: ReactNode; moduleName: string; onError?: (error: Error) => void },
  { error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[RemoteErrorBoundary] 模块 ${this.props.moduleName} 加载失败:`, error, errorInfo);
    this.props.onError?.(error);
  }

  handleRetry = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 400,
            gap: 2,
          }}
        >
          <ErrorIcon color="error" style={{ width: 48, height: 48 }} />
          <Typography variant="h6" color="error">
            模块 {this.props.moduleName} 加载失败
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {this.state.error.message}
          </Typography>
          <Button
            startIcon={<RefreshIcon />}
            variant="contained"
            onClick={this.handleRetry}
          >
            重试
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

/**
 * 加载中占位组件
 */
const LoadingFallback: React.FC<{ moduleName: string }> = ({ moduleName }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 300,
      gap: 2,
    }}
  >
    <CircularProgress />
    <Typography variant="body2" color="text.secondary">
      正在加载 {moduleName}...
    </Typography>
  </Box>
);

/**
 * RemoteLoader 属性
 */
export interface RemoteLoaderProps {
  /** 远程模块名（如 'topems_erp'） */
  moduleName: string;
  /** 远程模块导出的组件名（如 './ErpApp'） */
  component: string;
  /** 传递给远程组件的 props */
  props?: Record<string, any>;
  /** 加载失败回调 */
  onError?: (error: Error) => void;
  /** 自定义加载占位 */
  fallback?: React.ReactNode;
}

/**
 * 远程模块加载器
 *
 * 使用 React.lazy 动态加载远程模块，配合 ErrorBoundary 提供错误恢复。
 *
 * @example
 * <RemoteLoader moduleName="topems_erp" component="./ErpApp" />
 */
export const RemoteLoader: React.FC<RemoteLoaderProps> = ({
  moduleName,
  component,
  props,
  onError,
  fallback,
}) => {
  const LazyComponent = React.useMemo(
    () =>
      lazy(async () => {
        try {
          // 动态加载远程模块
          const module = await loadRemoteModule(moduleName, component);
          return { default: module.default || module };
        } catch (err) {
          console.error(`[RemoteLoader] 加载 ${moduleName}/${component} 失败:`, err);
          throw err;
        }
      }),
    [moduleName, component]
  );

  return (
    <RemoteErrorBoundary moduleName={moduleName} onError={onError}>
      <Suspense fallback={fallback || <LoadingFallback moduleName={moduleName} />}>
        <LazyComponent {...props} />
      </Suspense>
    </RemoteErrorBoundary>
  );
};

/**
 * 动态加载远程模块
 *
 * 优先使用 module-federation 的 import动态导入，
 * 失败时尝试降级入口。
 */
async function loadRemoteModule(moduleName: string, component: string): Promise<any> {
  // 使用动态 import 加载远程模块
  // @ts-ignore - vite-plugin-federation 注入的虚拟模块
  const module = await import(/* @vite-ignore */ `${moduleName}/${component}`);
  return module;
}

/**
 * 批量预加载远程模块
 *
 * @param moduleNames 要预加载的模块名列表
 */
export async function preloadRemoteModules(moduleNames: string[]): Promise<void> {
  const promises = moduleNames.map(async (name) => {
    try {
      // 预加载模块的所有 chunk
      await loadRemoteModule(name, './preload');
    } catch {
      // 预加载失败不阻塞主流程
      console.warn(`[preloadRemoteModules] 预加载 ${name} 失败`);
    }
  });
  await Promise.allSettled(promises);
}

export default RemoteLoader;
