import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
    
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="max-w-md mx-auto text-center p-6 bg-white rounded-xl shadow-lg">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              页面出现错误
            </h2>
            <p className="text-gray-600 mb-4">
              {this.state.error?.message || '未知错误'}
            </p>
            {this.state.errorInfo && (
              <details className="mb-4 text-left bg-gray-50 rounded-lg p-4">
                <summary className="text-sm font-medium text-gray-700 cursor-pointer">
                  错误详情
                </summary>
                <pre className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
            <button
              onClick={this.handleRetry}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              重试加载
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export interface HttpErrorProps {
  error: {
    status?: number;
    message?: string;
  };
  onRetry?: () => void;
}

export const HttpError: React.FC<HttpErrorProps> = ({ error, onRetry }) => {
  const status = error.status || 500;
  const message = error.message || getErrorMessage(status);

  const getErrorMessage = (status: number): string => {
    switch (status) {
      case 400:
        return '请求参数错误';
      case 401:
        return '未授权，请登录';
      case 403:
        return '无权访问';
      case 404:
        return '资源未找到';
      case 500:
        return '服务器内部错误';
      default:
        return '网络请求失败';
    }
  };

  const getErrorIcon = (status: number): React.ReactNode => {
    switch (status) {
      case 404:
        return (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 401:
      case 403:
        return (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        );
      default:
        return (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${
        status >= 500 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
      }`}>
        {getErrorIcon(status)}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        {status} 错误
      </h3>
      <p className="text-gray-600 mb-4">
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
        >
          重试
        </button>
      )}
    </div>
  );
};

export interface LoadingErrorProps {
  error?: Error | null;
  onRetry?: () => void;
}

export const LoadingError: React.FC<LoadingErrorProps> = ({ error, onRetry }) => {
  if (!error) return null;

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <p className="text-gray-600 text-sm">
        {error.message || '加载失败'}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 text-sm text-primary-600 hover:text-primary-700"
        >
          点击重试
        </button>
      )}
    </div>
  );
};

export default ErrorBoundary;
