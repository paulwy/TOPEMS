import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';
import { Alert, AlertTitle, Button, Box } from '@mui/material';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { logger } from '@/utils/logger';
import i18n from '@/i18n';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      error,
      errorInfo,
    });

    logger.error('ErrorBoundary caught error:', error);
    logger.error('Error info:', errorInfo);
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    this.props.onRetry?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
          <Alert
            severity='error'
            sx={{ maxWidth: 600 }}
          >
            <AlertTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <AlertTriangle sx={{ width: 24, height: 24 }} />
                {i18n.t('components.error_boundary.k0')}
              </Box>
            </AlertTitle>
            <p>{this.state.error?.message || i18n.t('shared.error_boundary.k0')}</p>
            <Button
              onClick={this.handleRetry}
              startIcon={<RefreshCw />}
              color='inherit'
              sx={{ mt: 2 }}
            >
              {i18n.t('components.error_boundary.k1')}
            </Button>
          </Alert>
        </Box>
      );
    }

    return this.props.children;
  }
}

export { ErrorBoundary };
export default ErrorBoundary;
