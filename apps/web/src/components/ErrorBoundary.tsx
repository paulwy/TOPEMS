import React, { type ErrorInfo, type ReactNode, Suspense } from 'react';
import {
  AlertTriangle,
  RefreshCw,
  Code2,
  Home,
  ArrowLeft,
  Copy,
  ChevronDown,
  ChevronUp,
  Bug,
  FileX,
  Layers,
} from 'lucide-react';
import i18n from '@/i18n';
import createLogger from '../utils/logger';
import { designTokens, semanticTokens } from '@topems/tokens';

const logger = createLogger('ErrorBoundary');

// 错误报告接口
export interface ErrorReport {
  error: Error;
  errorInfo: ErrorInfo;
  timestamp: number;
  userAgent: string;
  url: string;
  userId?: string;
  componentStack?: string;
  reactVersion?: string;
  level?: 'page' | 'module' | 'component';
}

// 错误边界配置选项
export interface ErrorBoundaryOptions {
  level?: 'page' | 'module' | 'component';
  fallback?: ReactNode;
  onError?: (report: ErrorReport) => void;
  onReport?: (report: ErrorReport) => Promise<void>;
  showDetails?: boolean;
  enableRetry?: boolean;
  reportToServer?: boolean;
  serverReportUrl?: string;
}

// Props 接口（向后兼容）
interface ErrorBoundaryProps extends ErrorBoundaryOptions {
  children: ReactNode;
}

// 状态接口
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorReport?: ErrorReport;
  showDetails: boolean;
  isReporting: boolean;
  reportSent: boolean;
}

// 错误历史记录管理
const ERROR_HISTORY_KEY = 'error_boundary_history';
const MAX_ERROR_HISTORY = 50;

class ErrorHistoryManager {
  static getHistory(): ErrorReport[] {
    try {
      const history = localStorage.getItem(ERROR_HISTORY_KEY);
      return history ? JSON.parse(history) : [];
    } catch {
      return [];
    }
  }

  static addReport(report: ErrorReport): void {
    try {
      const history = this.getHistory();
      history.unshift(report);
      const trimmed = history.slice(0, MAX_ERROR_HISTORY);
      localStorage.setItem(ERROR_HISTORY_KEY, JSON.stringify(trimmed));
    } catch {
      logger.warn('Failed to save error history');
    }
  }

  static clearHistory(): void {
    try {
      localStorage.removeItem(ERROR_HISTORY_KEY);
    } catch {
      logger.warn('Failed to clear error history');
    }
  }
}

// Sentry 集成检查
const hasSentry = (): boolean => {
  return (
    process.env.NODE_ENV === 'production' && !!(window as unknown as Record<string, unknown>).Sentry
  );
};

// 收集错误信息
const collectErrorInfo = (
  error: Error,
  errorInfo: ErrorInfo,
  level: 'page' | 'module' | 'component' = 'page'
): ErrorReport => {
  return {
    error,
    errorInfo,
    timestamp: Date.now(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent || 'unknown' : 'unknown',
    url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    componentStack: errorInfo.componentStack || undefined,
    reactVersion: typeof React !== 'undefined' ? React.version : 'unknown',
    level,
  };
};

// 上报错误到服务器
const reportToServer = async (report: ErrorReport, serverUrl?: string): Promise<boolean> => {
  const url =
    serverUrl ||
    ((window as unknown as Record<string, unknown>).__ERROR_REPORT_URL__ as string | undefined);
  if (!url) return false;

  try {
    const response = await fetch(url as string, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(report),
    });
    return response.ok;
  } catch (error) {
    logger.error('Failed to report error to server:', error);
    return false;
  }
};

// 判断错误类型
const getErrorType = (error: Error): 'network' | 'not_found' | 'generic' => {
  const message = error.message.toLowerCase();
  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('failed to fetch') ||
    message.includes('net::')
  ) {
    return 'network';
  }
  if (message.includes('404') || message.includes('not found') || message.includes('not_found')) {
    return 'not_found';
  }
  return 'generic';
};

// 获取错误友好提示
const getErrorFriendlyMessage = (
  error: Error,
  level: 'page' | 'module' | 'component'
): { title: string; description: string } => {
  const errorType = getErrorType(error);

  if (errorType === 'network') {
    return {
      title: i18n.t('components.error_boundary.k0'),
      description: i18n.t('components.error_boundary.k1'),
    };
  }

  if (errorType === 'not_found') {
    return {
      title: i18n.t('components.error_boundary.k2'),
      description: i18n.t('components.error_boundary.k3'),
    };
  }

  switch (level) {
    case 'page':
      return {
        title: i18n.t('components.error_boundary.k4'),
        description: i18n.t('components.error_boundary.k5'),
      };
    case 'module':
      return {
        title: i18n.t('components.error_boundary.k6'),
        description: i18n.t('components.error_boundary.k7'),
      };
    case 'component':
      return {
        title: i18n.t('components.error_boundary.k8'),
        description: i18n.t('components.error_boundary.k9'),
      };
    default:
      return {
        title: i18n.t('components.error_boundary.k10'),
        description: i18n.t('components.error_boundary.k11'),
      };
  }
};

// 获取级别图标
const getLevelIcon = (level: 'page' | 'module' | 'component') => {
  switch (level) {
    case 'page':
      return <FileX style={{ width: 32, height: 32, color: 'error.main' }} />;
    case 'module':
      return <Layers style={{ width: 32, height: 32, color: 'error.main' }} />;
    case 'component':
      return <Bug style={{ width: 32, height: 32, color: 'error.main' }} />;
    default:
      return <AlertTriangle style={{ width: 32, height: 32, color: 'error.main' }} />;
  }
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      showDetails: props.showDetails ?? process.env.NODE_ENV !== 'production',
      isReporting: false,
      reportSent: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const level = this.props.level || 'page';
    const report = collectErrorInfo(error, errorInfo, level);

    logger.error(`ErrorBoundary [${level}] caught error:`, error.message, errorInfo);

    // 保存错误信息到 state
    this.setState({ error, errorInfo, errorReport: report });

    // 调用自定义错误回调
    if (this.props.onError) {
      this.props.onError(report);
    }

    // Sentry 集成
    if (hasSentry()) {
      (
        window as unknown as {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          Sentry: { captureException: (error: Error, options?: Record<string, unknown>) => void };
        }
      ).Sentry.captureException(error, {
        extra: { ...errorInfo, level },
      });
    }

    // 本地存储错误历史
    ErrorHistoryManager.addReport(report);

    // 上报错误到服务器
    if (this.props.reportToServer && this.props.onReport) {
      this.props.onReport(report).catch((err) => {
        logger.error('Error report failed:', err);
      });
    } else if (this.props.serverReportUrl) {
      reportToServer(report, this.props.serverReportUrl).catch((err) => {
        logger.error('Error report to server failed:', err);
      });
    }
  }

  handleRetry = () => {
    this.resetError();
    // 如果是组件级别，只重置该组件
    if (this.props.level === 'component') {
      this.forceUpdate();
    } else {
      window.location.reload();
    }
  };

  handleGoBack = () => {
    this.resetError();
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  };

  handleGoHome = () => {
    this.resetError();
    window.location.href = '/';
  };

  handleCopyError = async () => {
    const { errorReport } = this.state;
    if (!errorReport) return;

    const errorText = [
      `Error: ${errorReport.error.message}`,
      `URL: ${errorReport.url}`,
      `Time: ${new Date(errorReport.timestamp).toISOString()}`,
      `User Agent: ${errorReport.userAgent}`,
      `React Version: ${errorReport.reactVersion}`,
      `Level: ${errorReport.level}`,
      `Component Stack:`,
      errorReport.componentStack || 'N/A',
    ].join('\n');

    try {
      await navigator.clipboard.writeText(errorText);
      logger.info('Error info copied to clipboard');
    } catch {
      logger.warn('Failed to copy error info');
    }
  };

  handleToggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  handleReport = async () => {
    const { errorReport } = this.state;
    if (!errorReport || this.state.isReporting) return;

    this.setState({ isReporting: true });

    try {
      if (this.props.onReport) {
        await this.props.onReport(errorReport);
      } else if (this.props.serverReportUrl) {
        await reportToServer(errorReport, this.props.serverReportUrl);
      }
      this.setState({ reportSent: true });
    } catch {
      logger.error('Failed to send error report');
    } finally {
      this.setState({ isReporting: false });
    }
  };

  resetError = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorReport: undefined,
      reportSent: false,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, errorReport, showDetails } = this.state;
      const level = this.props.level || 'page';
      const enableRetry = this.props.enableRetry ?? true;
      const friendlyMessage = error
        ? getErrorFriendlyMessage(error, level)
        : {
            title: i18n.t('components.error_boundary.k13'),
            description: i18n.t('components.error_boundary.k12'),
          };

      return (
        <div
          style={{
            minHeight: level === 'page' ? '100vh' : 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'grey.100',
            padding: 4,
          }}
        >
          <div
            style={{
              backgroundColor: 'common.white',
              borderRadius: 'lg',
              boxShadow: designTokens.shadows.lg,
              padding: 8,
              maxWidth: '600px',
              width: '100%',
              textAlign: 'center',
            }}
          >
            {/* 错误图标 */}
            <div
              style={{
                width: '64px',
                height: '64px',
                backgroundColor: 'error.light',
                borderRadius: 'full',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              {getLevelIcon(level)}
            </div>

            {/* 错误标题 */}
            <h2
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: 'text.primary',
                marginBottom: 2,
              }}
            >
              {friendlyMessage.title}
            </h2>

            {/* 错误描述 */}
            <p style={{ color: 'text.secondary', marginBottom: 4 }}>
              {error?.message ? (
                <span title={error.message}>{friendlyMessage.description}</span>
              ) : (
                friendlyMessage.description
              )}
            </p>

            {/* 技术详情区域 */}
            {(showDetails || process.env.NODE_ENV !== 'production') && error && errorInfo && (
              <div style={{ marginBottom: 6 }}>
                <button
                  onClick={this.handleToggleDetails}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                    width: '100%',
                    padding: 3,
                    backgroundColor: 'grey.100',
                    border: 'none',
                    borderRadius: 'md',
                    cursor: 'pointer',
                    color: 'text.secondary',
                    fontSize: '14px',
                    marginBottom: showDetails ? '12px' : 0,
                  }}
                >
                  {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  {i18n.t('components.error_boundary.k0')}
                </button>

                {showDetails && (
                  <div
                    style={{
                      backgroundColor: 'grey.800',
                      color: 'grey.50',
                      borderRadius: 'md',
                      padding: 4,
                      textAlign: 'left',
                      maxHeight: '300px',
                      overflowY: 'auto',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        marginBottom: 3,
                      }}
                    >
                      <Code2 style={{ width: 16, height: 16 }} />
                      <span style={{ fontWeight: 600, fontSize: '14px' }}>
                        {i18n.t('components.error_boundary.k14')}
                      </span>
                    </div>

                    {/* 错误信息 */}
                    <div style={{ marginBottom: 3 }}>
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'text.disabled',
                          marginBottom: 1,
                        }}
                      >
                        {i18n.t('components.error_boundary.k1')}
                      </div>
                      <div style={{ fontSize: '13px', fontFamily: 'monospace' }}>
                        {error.message}
                      </div>
                    </div>

                    {/* 错误类型 */}
                    <div style={{ marginBottom: 3 }}>
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'text.disabled',
                          marginBottom: 1,
                        }}
                      >
                        {i18n.t('components.error_boundary.k2')}
                      </div>
                      <div style={{ fontSize: '13px', fontFamily: 'monospace' }}>
                        {getErrorType(error)}
                      </div>
                    </div>

                    {/* 错误级别 */}
                    <div style={{ marginBottom: 3 }}>
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'text.disabled',
                          marginBottom: 1,
                        }}
                      >
                        {i18n.t('components.error_boundary.k3')}
                      </div>
                      <div style={{ fontSize: '13px', fontFamily: 'monospace' }}>{level}</div>
                    </div>

                    {/* 错误时间 */}
                    {errorReport && (
                      <div style={{ marginBottom: 3 }}>
                        <div
                          style={{
                            fontSize: '12px',
                            color: 'text.disabled',
                            marginBottom: 1,
                          }}
                        >
                          {i18n.t('components.error_boundary.k4')}
                        </div>
                        <div style={{ fontSize: '13px', fontFamily: 'monospace' }}>
                          {new Date(errorReport.timestamp).toLocaleString('zh-CN')}
                        </div>
                      </div>
                    )}

                    {/* 用户代理 */}
                    {errorReport && (
                      <div style={{ marginBottom: 3 }}>
                        <div
                          style={{
                            fontSize: '12px',
                            color: 'text.disabled',
                            marginBottom: 1,
                          }}
                        >
                          {i18n.t('components.error_boundary.k5')}
                        </div>
                        <div
                          style={{
                            fontSize: '11px',
                            fontFamily: 'monospace',
                            wordBreak: 'break-all',
                          }}
                        >
                          {errorReport.userAgent}
                        </div>
                      </div>
                    )}

                    {/* React 版本 */}
                    {errorReport?.reactVersion && (
                      <div style={{ marginBottom: 3 }}>
                        <div
                          style={{
                            fontSize: '12px',
                            color: 'text.disabled',
                            marginBottom: 1,
                          }}
                        >
                          {i18n.t('components.error_boundary.react_6')}
                        </div>
                        <div style={{ fontSize: '13px', fontFamily: 'monospace' }}>
                          {errorReport.reactVersion}
                        </div>
                      </div>
                    )}

                    {/* 组件栈 */}
                    <div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'text.disabled',
                          marginBottom: 1,
                        }}
                      >
                        {i18n.t('components.error_boundary.k7')}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          fontFamily: 'monospace',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}
                      >
                        {errorInfo.componentStack || 'N/A'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 操作按钮区域 */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 3,
                justifyContent: 'center',
              }}
            >
              {/* 重试按钮 */}
              {enableRetry && (
                <button
                  onClick={this.handleRetry}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: `${designTokens.spacing.md} 20px`,
                    backgroundColor: 'primary.dark',
                    color: 'common.white',
                    borderRadius: 'md',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    fontWeight: 500,
                    fontSize: '14px',
                  }}
                >
                  <RefreshCw style={{ width: 18, height: 18, marginRight: 8 }} />
                  {i18n.t('components.error_boundary.k8')}
                </button>
              )}

              {/* 返回上一页 */}
              <button
                onClick={this.handleGoBack}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: `${designTokens.spacing.md} 20px`,
                  backgroundColor: 'grey.200',
                  color: 'text.primary',
                  borderRadius: 'md',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  fontWeight: 500,
                  fontSize: '14px',
                }}
              >
                <ArrowLeft style={{ width: 18, height: 18, marginRight: 8 }} />
                {i18n.t('components.error_boundary.k9')}
              </button>

              {/* 返回首页 */}
              <button
                onClick={this.handleGoHome}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: `${designTokens.spacing.md} 20px`,
                  backgroundColor: 'grey.200',
                  color: 'text.primary',
                  borderRadius: 'md',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  fontWeight: 500,
                  fontSize: '14px',
                }}
              >
                <Home style={{ width: 18, height: 18, marginRight: 8 }} />
                {i18n.t('components.error_boundary.k10')}
              </button>

              {/* 复制错误信息 */}
              <button
                onClick={this.handleCopyError}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: `${designTokens.spacing.md} 20px`,
                  backgroundColor: 'grey.200',
                  color: 'text.primary',
                  borderRadius: 'md',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  fontWeight: 500,
                  fontSize: '14px',
                }}
              >
                <Copy style={{ width: 18, height: 18, marginRight: 8 }} />
                {i18n.t('components.error_boundary.k11')}
              </button>

              {/* 上报错误 */}
              {!this.state.reportSent && (
                <button
                  onClick={this.handleReport}
                  disabled={this.state.isReporting}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: `${designTokens.spacing.md} 20px`,
                    backgroundColor: this.state.isReporting ? 'grey.400' : 'warning.main',
                    color: 'common.white',
                    borderRadius: 'md',
                    border: 'none',
                    cursor: this.state.isReporting ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.2s',
                    fontWeight: 500,
                    fontSize: '14px',
                  }}
                >
                  <Bug style={{ width: 18, height: 18, marginRight: 8 }} />
                  {this.state.isReporting
                    ? i18n.t('components.error_boundary.k16')
                    : i18n.t('components.error_boundary.k15')}
                </button>
              )}

              {/* 已上报提示 */}
              {this.state.reportSent && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: `${designTokens.spacing.md} 20px`,
                    backgroundColor: 'success.light',
                    color: 'success.main',
                    borderRadius: 'md',
                    fontWeight: 500,
                    fontSize: '14px',
                  }}
                >
                  {i18n.t('components.error_boundary.k12')}
                </span>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

// 高阶组件：包装普通组件添加错误边界
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  options?: ErrorBoundaryOptions
): React.ComponentType<P> => {
  const {
    level = 'component',
    fallback,
    onError,
    onReport,
    showDetails,
    enableRetry,
  } = options || {};

  return (props: P) => (
    <ErrorBoundary
      level={level}
      fallback={fallback}
      onError={onError}
      onReport={onReport}
      showDetails={showDetails}
      enableRetry={enableRetry}
    >
      <Component {...props} />
    </ErrorBoundary>
  );
};

// 懒加载组件带错误边界
export const lazyWithErrorBoundary = <P extends object>(
  importFn: () => Promise<{ default: React.ComponentType<P> }>,
  options?: ErrorBoundaryOptions
): React.LazyExoticComponent<React.ComponentType<P>> => {
  const { level = 'module', fallback, onError, onReport, showDetails, enableRetry } = options || {};

  return React.lazy(() =>
    importFn().catch((error) => {
      logger.error('Lazy component import failed:', error);
      // 返回一个抛出错误的模块，让 ErrorBoundary 处理
      return Promise.reject(error);
    })
  );
};

// 页面级错误边界 Provider
export const PageErrorBoundary: React.FC<ErrorBoundaryOptions & { children: ReactNode }> = ({
  children,
  ...options
}) => {
  return (
    <ErrorBoundary
      level='page'
      {...options}
    >
      {children}
    </ErrorBoundary>
  );
};

// 模块级错误边界 Provider
export const ModuleErrorBoundary: React.FC<ErrorBoundaryOptions & { children: ReactNode }> = ({
  children,
  ...options
}) => {
  return (
    <ErrorBoundary
      level='module'
      {...options}
    >
      {children}
    </ErrorBoundary>
  );
};

// 组件级错误边界 HOC
export const withComponentErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<ErrorBoundaryOptions, 'level'>
): React.ComponentType<P> => {
  return withErrorBoundary(Component, { ...options, level: 'component' });
};

// Suspense 与错误边界组合
export const SuspenseWithErrorBoundary: React.FC<{
  children: ReactNode;
  fallback?: ReactNode;
  options?: ErrorBoundaryOptions;
}> = ({ children, fallback, options }) => {
  return (
    <ErrorBoundary
      level={options?.level || 'module'}
      {...options}
    >
      <Suspense fallback={fallback || <DefaultLoading />}>{children}</Suspense>
    </ErrorBoundary>
  );
};

// 默认加载中组件
const DefaultLoading: React.FC = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 8,
      color: 'text.secondary',
    }}
  >
    <RefreshCw
      style={{ width: 24, height: 24, marginRight: 8, animation: 'spin 1s linear infinite' }}
    />
    {i18n.t('components.error_boundary.k13')}
  </div>
);

// 错误历史工具
export const errorHistory = {
  get: ErrorHistoryManager.getHistory,
  clear: ErrorHistoryManager.clearHistory,
};

// 重新导出 ErrorBoundaryOptions 别名为 ErrorBoundaryProps（向后兼容）
export type { ErrorBoundaryOptions as ErrorBoundaryProps };
