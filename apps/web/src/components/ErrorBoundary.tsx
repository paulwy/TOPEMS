import type { ErrorInfo, ReactNode } from 'react';
import React, { Component } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className='min-h-screen flex items-center justify-center bg-gray-50'>
          <div className='max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center'>
            <div className='w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4'>
              <AlertCircle className='w-8 h-8 text-red-600' />
            </div>
            <h1 className='text-2xl font-bold text-gray-900 mb-2'>应用程序出错</h1>
            <p className='text-gray-600 mb-6'>抱歉，应用程序遇到了一个错误。请尝试重新加载页面。</p>
            <div className='bg-gray-50 rounded-lg p-4 mb-6 text-left'>
              <p className='text-sm text-gray-700 font-mono'>{this.state.error?.message || '未知错误'}</p>
            </div>
            <button
              onClick={this.handleReload}
              className='inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
            >
              <RefreshCw className='w-5 h-5 mr-2' />
              重新加载
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
