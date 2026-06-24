import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';
import { AlertTriangle, RefreshCw, Code2 } from 'lucide-react';
import createLogger from '../utils/logger';

const logger = createLogger('ErrorBoundary');

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('ErrorBoundary caught error:', error.message, errorInfo);

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    if (process.env.NODE_ENV === 'production' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, { extra: errorInfo });
    }

    this.setState({ error, errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const showDetails = this.props.showDetails ?? process.env.NODE_ENV !== 'production';

      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'grey.100',
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              padding: '32px',
              maxWidth: '600px',
              width: '100%',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                backgroundColor: 'error.light',
                borderRadius: '9999px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <AlertTriangle sx={{ width: 32, height: 32, color: 'error.main' }} />
            </div>
            <h2
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: 'text.primary',
                marginBottom: '8px',
              }}
            >
              页面出现错误
            </h2>
            <p style={{ color: 'text.secondary', marginBottom: '16px' }}>
              {this.state.error?.message || '发生了未知错误，请重试'}
            </p>

            {showDetails && this.state.error && this.state.errorInfo && (
              <div
                style={{
                  backgroundColor: 'grey.800',
                  color: 'grey.50',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '24px',
                  textAlign: 'left',
                  maxHeight: '200px',
                  overflowY: 'auto',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '12px',
                  }}
                >
                  <Code2 style={{ width: 16, height: 16 }} />
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>错误详情</span>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'text.disabled',
                      marginBottom: '4px',
                    }}
                  >
                    错误信息
                  </div>
                  <div style={{ fontSize: '13px', fontFamily: 'monospace' }}>
                    {this.state.error.message}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'text.disabled',
                      marginBottom: '4px',
                    }}
                  >
                    组件栈
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {this.state.errorInfo.componentStack}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={this.handleRetry}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '12px 24px',
                backgroundColor: 'primary.dark',
                color: 'white',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                fontWeight: 500,
              }}
            >
              <RefreshCw sx={{ width: 20, height: 20, marginRight: 8 }} />
              刷新页面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
  }
): React.ComponentType<P> => {
  return (props: P) => (
    <ErrorBoundary
      fallback={options?.fallback}
      onError={options?.onError}
    >
      <Component {...props} />
    </ErrorBoundary>
  );
};
