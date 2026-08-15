/**
 * V45.0 Track D: BFF 错误边界
 *
 * 基于 React Error Boundary 的 BFF 错误处理组件（必须是类组件）。
 *
 * 功能:
 * - 错误分类：NetworkError / GraphqlError / TimeoutError / AuthError / ServerError / ValidationError
 * - 恢复策略：Retry / Fallback / Redirect / ShowError
 * - 错误上报：上报到监控系统 + localStorage 记录
 * - 错误 UI：友好的错误页面 + 重试按钮 + 降级提示
 *
 * @example
 * ```tsx
 * <BffErrorBoundary
 *   recoveryStrategy={ErrorRecoveryStrategy.RETRY}
 *   maxRetries={3}
 *   onError={(classified) => reportToMonitor(classified)}
 * >
 *   <Dashboard />
 * </BffErrorBoundary>
 * ```
 */

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  Chip,
  Collapse,
  IconButton,
  Alert,
  AlertTitle,
} from '@mui/material';
import i18n from '@/i18n';
import {
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  WifiOff,
  Clock,
  Lock,
  Server,
  AlertTriangle,
  Home,
} from 'lucide-react';
import { logger } from '@/utils/logger';
import type { FallbackLevel } from '@/utils/bff/fallback-strategy';
import { fallbackManager } from '@/utils/bff/fallback-strategy';
import { designTokens, semanticTokens } from '@topems/tokens';

const boundaryLogger = logger.child({ prefix: 'BFF-ErrorBoundary' });

// ==================== 错误分类 ====================

/** BFF 错误类型 */
export enum BffErrorType {
  NETWORKERROR = 'NetworkError',
  GRAPHQLERROR = 'GraphqlError',
  TIMEOUTERROR = 'TimeoutError',
  AUTHERROR = 'AuthError',
  SERVERERROR = 'ServerError',
  VALIDATIONERROR = 'ValidationError',
  UNKNOWNERROR = 'UnknownError',
}

/** 错误恢复策略 */
export enum ErrorRecoveryStrategy {
  /** 自动重试 */
  RETRY = 'retry',
  /** 降级到备选方案 */
  FALLBACK = 'fallback',
  /** 重定向到其他页面 */
  REDIRECT = 'redirect',
  /** 仅展示错误 */
  SHOWERROR = 'show_error',
}

/** 分类后的错误信息 */
export interface ClassifiedError {
  /** 错误类型 */
  type: BffErrorType;
  /** 原始错误 */
  error: Error;
  /** 错误消息 */
  message: string;
  /** 推荐的恢复策略 */
  recommendedStrategy: ErrorRecoveryStrategy;
  /** 是否可重试 */
  retryable: boolean;
  /** 错误发生时间 */
  timestamp: string;
  /** 组件栈 */
  componentStack?: string;
  /** 降级级别 */
  fallbackLevel: FallbackLevel;
}

/** 错误上报记录 */
export interface ErrorReportRecord {
  id: string;
  timestamp: string;
  type: BffErrorType;
  message: string;
  stack?: string;
  componentStack?: string;
  recoveryStrategy: ErrorRecoveryStrategy;
  retryCount: number;
  resolved: boolean;
}

// ==================== 错误分类器 ====================

/**
 * 根据错误特征分类 BFF 错误
 */
export function classifyError(error: Error, componentStack?: string): ClassifiedError {
  const msg = error.message || String(error);
  const lowerMsg = msg.toLowerCase();
  const timestamp = new Date().toISOString();

  let type: BffErrorType;
  let recommendedStrategy: ErrorRecoveryStrategy;
  let retryable: boolean;

  if (
    lowerMsg.includes('network') ||
    lowerMsg.includes('failed to fetch') ||
    lowerMsg.includes('err_network') ||
    lowerMsg.includes('connection refused')
  ) {
    type = BffErrorType.NETWORKERROR;
    recommendedStrategy = ErrorRecoveryStrategy.RETRY;
    retryable = true;
  } else if (lowerMsg.includes('graphql') || lowerMsg.includes('persistedquerynotfound')) {
    type = BffErrorType.GRAPHQLERROR;
    recommendedStrategy = ErrorRecoveryStrategy.FALLBACK;
    retryable = true;
  } else if (
    lowerMsg.includes('timeout') ||
    lowerMsg.includes('timed out') ||
    lowerMsg.includes('deadline exceeded')
  ) {
    type = BffErrorType.TIMEOUTERROR;
    recommendedStrategy = ErrorRecoveryStrategy.RETRY;
    retryable = true;
  } else if (
    lowerMsg.includes('unauthorized') ||
    lowerMsg.includes('401') ||
    lowerMsg.includes('forbidden') ||
    lowerMsg.includes('403') ||
    lowerMsg.includes('authentication')
  ) {
    type = BffErrorType.AUTHERROR;
    recommendedStrategy = ErrorRecoveryStrategy.REDIRECT;
    retryable = false;
  } else if (
    lowerMsg.includes('500') ||
    lowerMsg.includes('502') ||
    lowerMsg.includes('503') ||
    lowerMsg.includes('504') ||
    lowerMsg.includes('internal server error') ||
    lowerMsg.includes('bad gateway') ||
    lowerMsg.includes('service unavailable')
  ) {
    type = BffErrorType.SERVERERROR;
    recommendedStrategy = ErrorRecoveryStrategy.FALLBACK;
    retryable = true;
  } else if (
    lowerMsg.includes('validation') ||
    lowerMsg.includes('invalid') ||
    lowerMsg.includes('400') ||
    lowerMsg.includes('bad request')
  ) {
    type = BffErrorType.VALIDATIONERROR;
    recommendedStrategy = ErrorRecoveryStrategy.SHOWERROR;
    retryable = false;
  } else {
    type = BffErrorType.UNKNOWNERROR;
    recommendedStrategy = ErrorRecoveryStrategy.SHOWERROR;
    retryable = false;
  }

  return {
    type,
    error,
    message: msg,
    recommendedStrategy,
    retryable,
    timestamp,
    componentStack,
    fallbackLevel: fallbackManager.getFallbackLevel(error),
  };
}

// ==================== 错误上报 ====================

const ERROR_STORAGE_KEY = 'topems:bff:error-reports';
const MAX_ERROR_RECORDS = 200;
const errorListeners = new Set<(record: ErrorReportRecord) => void>();

/** 错误上报：写入 localStorage + 通知监听器 */
export function reportError(classified: ClassifiedError, retryCount = 0, resolved = false): void {
  const record: ErrorReportRecord = {
    id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: classified.timestamp,
    type: classified.type,
    message: classified.message,
    stack: classified.error.stack,
    componentStack: classified.componentStack,
    recoveryStrategy: classified.recommendedStrategy,
    retryCount,
    resolved,
  };

  // 写入 localStorage
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(ERROR_STORAGE_KEY);
      const records: ErrorReportRecord[] = raw ? JSON.parse(raw) : [];
      records.unshift(record);
      const trimmed = records.slice(0, MAX_ERROR_RECORDS);
      localStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(trimmed));
    } catch (err) {
      boundaryLogger.warn(i18n.t('components.bff_error_boundary.k0'), err);
    }
  }

  // 通知监听器（监控系统可订阅）
  errorListeners.forEach((listener) => {
    try {
      listener(record);
    } catch (err) {
      boundaryLogger.error(i18n.t('components.bff_error_boundary.k1'), err);
    }
  });

  // 上报到日志系统
  boundaryLogger.error(`[${classified.type}] ${classified.message}`, classified.error);
}

/** 获取错误上报记录 */
export function getErrorReports(): ErrorReportRecord[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ERROR_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ErrorReportRecord[]) : [];
  } catch {
    return [];
  }
}

/** 清空错误上报记录 */
export function clearErrorReports(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(ERROR_STORAGE_KEY);
}

/** 订阅错误上报事件 */
export function onErrorReport(callback: (record: ErrorReportRecord) => void): () => void {
  errorListeners.add(callback);
  return () => {
    errorListeners.delete(callback);
  };
}

// ==================== 错误图标映射 ====================

const ERROR_ICONS: Record<BffErrorType, React.ElementType> = {
  [BffErrorType.NETWORKERROR]: WifiOff,
  [BffErrorType.GRAPHQLERROR]: AlertCircle,
  [BffErrorType.TIMEOUTERROR]: Clock,
  [BffErrorType.AUTHERROR]: Lock,
  [BffErrorType.SERVERERROR]: Server,
  [BffErrorType.VALIDATIONERROR]: AlertTriangle,
  [BffErrorType.UNKNOWNERROR]: AlertCircle,
};

const ERROR_LABELS: Record<BffErrorType, string> = {
  [BffErrorType.NETWORKERROR]: i18n.t('components.bff_error_boundary.k0'),
  [BffErrorType.GRAPHQLERROR]: i18n.t('components.bff_error_boundary.graphql_2'),
  [BffErrorType.TIMEOUTERROR]: i18n.t('components.bff_error_boundary.k1'),
  [BffErrorType.AUTHERROR]: i18n.t('components.bff_error_boundary.k2'),
  [BffErrorType.SERVERERROR]: i18n.t('components.bff_error_boundary.k3'),
  [BffErrorType.VALIDATIONERROR]: i18n.t('components.bff_error_boundary.k4'),
  [BffErrorType.UNKNOWNERROR]: i18n.t('components.bff_error_boundary.k5'),
};

const ERROR_COLORS: Record<BffErrorType, 'error' | 'warning' | 'info'> = {
  [BffErrorType.NETWORKERROR]: 'warning',
  [BffErrorType.GRAPHQLERROR]: 'error',
  [BffErrorType.TIMEOUTERROR]: 'warning',
  [BffErrorType.AUTHERROR]: 'error',
  [BffErrorType.SERVERERROR]: 'error',
  [BffErrorType.VALIDATIONERROR]: 'warning',
  [BffErrorType.UNKNOWNERROR]: 'error',
};

// ==================== 默认错误 UI ====================

/** 默认错误回退 UI 的 Props */
export interface BffErrorBoundaryFallbackProps {
  /** 分类后的错误 */
  classified: ClassifiedError;
  /** 当前重试次数 */
  retryCount: number;
  /** 最大重试次数 */
  maxRetries: number;
  /** 重试回调 */
  onRetry: () => void;
  /** 重置回调（清除错误状态） */
  onReset: () => void;
}

/**
 * 默认错误回退 UI
 *
 * 展示错误类型、错误消息、重试按钮与降级提示。
 */
export const DefaultBffErrorFallback: React.FC<BffErrorBoundaryFallbackProps> = ({
  classified,
  retryCount,
  maxRetries,
  onRetry,
  onReset,
}) => {
  const [showDetails, setShowDetails] = React.useState(false);
  const Icon = ERROR_ICONS[classified.type] ?? AlertCircle;
  const color = ERROR_COLORS[classified.type] ?? 'error';
  const canRetry = classified.retryable && retryCount < maxRetries;

  return (
    <Box
      sx={{
        p: 3,
        borderRadius: 2,
        bgcolor: `${color}.50`,
        border: '1px solid',
        borderColor: `${color}.main`,
        width: '100%',
      }}
    >
      <Stack spacing={2}>
        <Stack
          direction='row'
          spacing={1.5}
          sx={{ alignItems: 'center' }}
        >
          <Box
            sx={{
              fontSize: 22,
              color: color === 'error' ? designTokens.colors.error.dark : color === 'warning' ? 'colors.orange.700' : designTokens.colors.info['700'],
            }}
          >
            {React.createElement(Icon)}
          </Box>
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600, color: `${color}.main` }}
          >
            {ERROR_LABELS[classified.type]}
          </Typography>
          <Chip
            size='small'
            label={classified.fallbackLevel}
            variant='outlined'
            color={color}
          />
        </Stack>

        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ wordBreak: 'break-word' }}
        >
          {classified.message}
        </Typography>

        {retryCount > 0 && (
          <Alert
            severity='info'
            icon={false}
            sx={{ py: 0.5 }}
          >
            <AlertTitle sx={{ mb: 0 }}>
              {i18n.t('components.bff_error_boundary.k0')} {retryCount} / {maxRetries} {i18n.t('components.bff_error_boundary.k1')}
            </AlertTitle>
          </Alert>
        )}

        {/* 降级提示 */}
        {classified.recommendedStrategy === ErrorRecoveryStrategy.FALLBACK && (
          <Alert
            severity='warning'
            icon={false}
            sx={{ py: 0.5 }}
          >
            {i18n.t('components.bff_error_boundary.k3')}
          </Alert>
        )}

        <Stack
          direction='row'
          spacing={1}
          sx={{ alignItems: 'center' }}
        >
          {canRetry && (
            <Button
              size='small'
              variant='contained'
              color={color}
              startIcon={<RefreshCw size={16} />}
              onClick={onRetry}
            >
              {i18n.t('components.bff_error_boundary.k4')}
            </Button>
          )}
          <Button
            size='small'
            variant='outlined'
            startIcon={<Home size={16} />}
            onClick={onReset}
          >
            {i18n.t('components.bff_error_boundary.k5')}
          </Button>
          <IconButton
            size='small'
            onClick={() => setShowDetails((v) => !v)}
            aria-label={i18n.t('components.bff_error_boundary.k6')}
          >
            {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </IconButton>
        </Stack>

        <Collapse in={showDetails}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 1,
              bgcolor: 'background.paper',
              border: '1px dashed',
              borderColor: 'divider',
            }}
          >
            <Typography
              variant='caption'
              color='text.secondary'
              component='pre'
              sx={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                fontFamily: 'monospace',
                margin: 0,
              }}
            >
              {classified.error.stack ?? classified.message}
              {classified.componentStack ? `${i18n.t('components.bff_error_boundary.nnn_6')}${classified.componentStack}` : ''}
            </Typography>
          </Box>
        </Collapse>
      </Stack>
    </Box>
  );
};

// ==================== BffErrorBoundary 类组件 ====================

/** BffErrorBoundary Props */
export interface BffErrorBoundaryProps {
  children: ReactNode;
  /** 自定义错误回退渲染 */
  fallback?: (props: BffErrorBoundaryFallbackProps) => ReactNode;
  /** 错误回调（上报用） */
  onError?: (classified: ClassifiedError) => void;
  /** 恢复策略（默认使用错误分类推荐策略） */
  recoveryStrategy?: ErrorRecoveryStrategy;
  /** 最大重试次数，默认 3 */
  maxRetries?: number;
  /** 重定向目标（recoveryStrategy=Redirect 时使用） */
  redirectUrl?: string;
  /** 重试前的延迟（毫秒），默认 1000 */
  retryDelay?: number;
  /** 边界名称（用于调试） */
  name?: string;
}

interface BffErrorBoundaryState {
  hasError: boolean;
  classified: ClassifiedError | null;
  retryCount: number;
}

/**
 * BFF 错误边界（类组件）
 *
 * 捕获子树抛出的错误，按 BFF 错误类型分类，
 * 根据恢复策略自动重试或展示降级 UI。
 */
export class BffErrorBoundary extends Component<BffErrorBoundaryProps, BffErrorBoundaryState> {
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(props: BffErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, classified: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<BffErrorBoundaryState> {
    const classified = classifyError(error);
    return { hasError: true, classified };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    const { name, onError } = this.props;
    const classified = classifyError(error, info.componentStack ?? undefined);

    boundaryLogger.error(
      `错误边界${name ? ` [${name}]` : ''} ${i18n.t('components.bff_error_boundary.k9')} [${classified.type}]:`,
      error,
      info.componentStack
    );

    // 上报错误
    reportError(classified, this.state.retryCount);

    // 通知外部
    onError?.(classified);

    // 更新状态（确保 componentStack 存在）
    this.setState({ classified });
  }

  override componentWillUnmount(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
  }

  private handleRetry = (): void => {
    const { retryDelay = 1000 } = this.props;
    this.setState((prev) => ({ retryCount: prev.retryCount + 1 }));

    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => {
      this.setState({ hasError: false, classified: null });
    }, retryDelay);
  };

  private handleReset = (): void => {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.setState({ hasError: false, classified: null, retryCount: 0 });
  };

  private handleRedirect = (): void => {
    const { redirectUrl = '/login' } = this.props;
    if (typeof window !== 'undefined') {
      window.location.href = redirectUrl;
    }
  };

  override render(): ReactNode {
    const { children, fallback, recoveryStrategy, maxRetries = 3 } = this.props;
    const { hasError, classified, retryCount } = this.state;

    if (!hasError || !classified) {
      return children;
    }

    // 确定最终使用的恢复策略
    const strategy = recoveryStrategy ?? classified.recommendedStrategy;

    // Redirect 策略：渲染重定向提示并触发跳转
    if (strategy === ErrorRecoveryStrategy.REDIRECT) {
      if (typeof window !== 'undefined') {
        // 异步触发跳转，避免渲染期间副作用
        setTimeout(() => {
          window.location.href = this.props.redirectUrl ?? '/login';
        }, 0);
      }
      return (
        <Box
          sx={{
            p: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 200,
          }}
        >
          <Stack
            spacing={1}
            sx={{ alignItems: 'center' }}
          >
            <Lock
              size={24}
              color={designTokens.colors.error.dark}
            />
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {i18n.t('components.bff_error_boundary.k10')}
            </Typography>
          </Stack>
        </Box>
      );
    }

    // Retry 策略：自动重试（未超过最大次数时）
    // 自动触发重试（仅一次，避免循环）
    if (
      strategy === ErrorRecoveryStrategy.RETRY &&
      classified.retryable &&
      retryCount < maxRetries &&
      this.retryTimer === null
    ) {
      this.retryTimer = setTimeout(() => {
        this.setState((prev) => ({
          hasError: false,
          classified: null,
          retryCount: prev.retryCount + 1,
        }));
        this.retryTimer = null;
      }, this.props.retryDelay ?? 1000);
    }

    const fallbackProps: BffErrorBoundaryFallbackProps = {
      classified,
      retryCount,
      maxRetries,
      onRetry: this.handleRetry,
      onReset: this.handleReset,
    };

    if (fallback) {
      return fallback(fallbackProps);
    }

    return <DefaultBffErrorFallback {...fallbackProps} />;
  }
}

export default BffErrorBoundary;
