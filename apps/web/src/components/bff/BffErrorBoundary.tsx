/**
 * V45.0 Track D: BFF 生产化错误边界
 *
 * 组件级错误边界 + 错误分类 + 错误上报 + 恢复策略。
 *
 * - BffErrorBoundary：类组件错误边界，捕获子树错误并分类展示降级 UI
 * - DefaultBffErrorFallback：默认错误回退 UI（错误类型徽标 + 重试）
 * - classifyError：将 Error 分类为 BffErrorType
 * - reportError / onErrorReport / getErrorReports / clearErrorReports：
 *   错误上报事件总线 + localStorage 持久化报告记录
 *
 * 与 hooks/bff/useBffErrorHandling 配合，实现 BFF 全链路错误治理。
 */

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  Chip,
  Alert,
  AlertTitle,
  Paper,
} from '@mui/material';
import {
  WifiOff,
  Clock,
  ShieldAlert,
  Server,
  Database,
  AlertTriangle,
  RefreshCw,
  Ban,
} from 'lucide-react';
import i18n from '@/i18n';
import { FallbackLevel } from '@/utils/bff/fallbackStrategy';

// ==================== 错误类型 ====================

/** BFF 错误类型枚举 */
export enum BffErrorType {
  /** 网络请求失败 */
  Network = 'network',
  /** 请求超时 */
  Timeout = 'timeout',
  /** 客户端校验失败 */
  Validation = 'validation',
  /** 服务端错误（5xx） */
  Server = 'server',
  /** 认证/授权失败 */
  Auth = 'auth',
  /** 资源不存在（404） */
  NotFound = 'not_found',
  /** 缓存相关 */
  Cache = 'cache',
  /** 离线 */
  Offline = 'offline',
  /** 未知错误 */
  Unknown = 'unknown',
}

/** 推荐的错误恢复策略 */
export enum ErrorRecoveryStrategy {
  /** 自动重试 */
  Retry = 'retry',
  /** 降级到备用数据源 */
  Fallback = 'fallback',
  /** 刷新页面/重新加载 */
  Refresh = 'refresh',
  /** 清除错误并重试 */
  Clear = 'clear',
  /** 切换到离线模式 */
  Offline = 'offline',
  /** 无自动恢复，需人工介入 */
  None = 'none',
}

// ==================== 类型定义 ====================

/** 分类后的错误信息 */
export interface ClassifiedError {
  /** 错误类型 */
  type: BffErrorType;
  /** 人类可读消息 */
  message: string;
  /** 是否可重试 */
  retryable: boolean;
  /** 推荐的恢复策略 */
  recovery: ErrorRecoveryStrategy;
  /** HTTP 状态码（如有） */
  status?: number;
  /** 原始错误 */
  cause?: unknown;
  /** 发生时间 */
  timestamp: string;
  /** 推荐的恢复策略（兼容 useBffErrorHandling） */
  recommendedStrategy: ErrorRecoveryStrategy;
  /** 推荐的降级级别（兼容 fallbackStrategy） */
  fallbackLevel: FallbackLevel;
}

/** 错误上报记录 */
export interface ErrorReportRecord {
  /** 记录 id */
  id: string;
  /** 错误类型 */
  type: BffErrorType;
  /** 错误消息 */
  message: string;
  /** 上报时间（ISO） */
  timestamp: string;
  /** 重试次数 */
  retryCount: number;
  /** 来源（组件名 / hook 名） */
  source?: string;
  /** HTTP 状态码 */
  status?: number;
}

/** BffErrorBoundary Props */
export interface BffErrorBoundaryProps {
  children: ReactNode;
  /** 错误回退渲染函数（优先级高于 fallback 节点） */
  errorFallback?: (error: Error, reset: () => void) => ReactNode;
  /** 错误回退节点（当 errorFallback 未提供时使用） */
  fallback?: ReactNode;
  /** 错误回调 */
  onError?: (error: Error, info: ErrorInfo) => void;
  /** 重置回调 */
  onReset?: () => void;
  /** 是否显示错误详情，默认 true */
  showDetails?: boolean;
  /** 边界名称（用于上报 source） */
  name?: string;
}

/** BffErrorBoundary 错误回退 Props */
export interface BffErrorBoundaryFallbackProps {
  /** 原始错误 */
  error: Error;
  /** 分类错误 */
  classified: ClassifiedError;
  /** 重置函数（清除边界状态） */
  reset: () => void;
  /** 是否显示详情 */
  showDetails?: boolean;
}

// ==================== 错误分类 ====================

/** 从 Error 消息中推断 HTTP 状态码 */
function inferStatus(error: Error): number | undefined {
  const msg = error.message;
  const m = msg.match(/(\d{3})/);
  if (m) return Number(m[1]);
  // axios / fetch 风格
  const anyErr = error as Error & { status?: number; response?: { status?: number } };
  return anyErr.status ?? anyErr.response?.status ?? undefined;
}

/** 将任意 Error 分类为 ClassifiedError */
export function classifyError(error: Error): ClassifiedError {
  const status = inferStatus(error);
  const msg = error?.message ?? '';
  const lower = msg.toLowerCase();

  let type: BffErrorType;
  let retryable = true;
  let recovery: ErrorRecoveryStrategy;

  if (status === 401 || status === 403) {
    type = BffErrorType.Auth;
    retryable = false;
    recovery = ErrorRecoveryStrategy.Refresh;
  } else if (status === 404) {
    type = BffErrorType.NotFound;
    retryable = false;
    recovery = ErrorRecoveryStrategy.None;
  } else if (status !== undefined && status >= 500) {
    type = BffErrorType.Server;
    retryable = true;
    recovery = ErrorRecoveryStrategy.Retry;
  } else if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('abort')) {
    type = BffErrorType.Timeout;
    retryable = true;
    recovery = ErrorRecoveryStrategy.Retry;
  } else if (lower.includes('network') || lower.includes('failed to fetch') || lower.includes('enotfound') || lower.includes('econnrefused')) {
    type = BffErrorType.Network;
    retryable = true;
    recovery = ErrorRecoveryStrategy.Retry;
  } else if (lower.includes('offline') || lower.includes('navigator.online') === false && typeof navigator !== 'undefined' && !navigator.onLine) {
    type = BffErrorType.Offline;
    retryable = false;
    recovery = ErrorRecoveryStrategy.Offline;
  } else if (lower.includes('validation') || lower.includes('validate') || lower.includes('invalid')) {
    type = BffErrorType.Validation;
    retryable = false;
    recovery = ErrorRecoveryStrategy.Clear;
  } else if (lower.includes('cache')) {
    type = BffErrorType.Cache;
    retryable = true;
    recovery = ErrorRecoveryStrategy.Fallback;
  } else {
    type = BffErrorType.Unknown;
    retryable = false;
    recovery = ErrorRecoveryStrategy.None;
  }

  return {
    type,
    message: msg || i18n.t('bff.error_unknown', '未知错误'),
    retryable,
    recovery,
    recommendedStrategy: recovery,
    fallbackLevel:
      type === BffErrorType.Offline
        ? FallbackLevel.OFFLINE
        : type === BffErrorType.Cache
          ? FallbackLevel.TERTIARY
          : type === BffErrorType.Network ||
              type === BffErrorType.Timeout ||
              type === BffErrorType.Server
            ? FallbackLevel.SECONDARY
            : FallbackLevel.PRIMARY,
    status,
    cause: error,
    timestamp: new Date().toISOString(),
  };
}

// ==================== 错误上报 ====================

const REPORT_KEY = 'bff_error_reports';
const MAX_REPORTS = 200;
type ErrorReportHandler = (record: ErrorReportRecord) => void;
const listeners = new Set<ErrorReportHandler>();

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function loadReports(): ErrorReportRecord[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(REPORT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ErrorReportRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistReports(reports: ErrorReportRecord[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(REPORT_KEY, JSON.stringify(reports.slice(0, MAX_REPORTS)));
  } catch {
    // 存储失败时静默（如隐私模式）
  }
}

/** 上报错误（接受 Error 或已分类的 ClassifiedError） */
export function reportError(input: Error | ClassifiedError, retryCount = 0, source?: string): void {
  const classified: ClassifiedError =
    input instanceof Error ? classifyError(input) : input;
  const record: ErrorReportRecord = {
    id: makeId(),
    type: classified.type,
    message: classified.message,
    timestamp: classified.timestamp || new Date().toISOString(),
    retryCount,
    source,
    status: classified.status,
  };
  const reports = loadReports();
  reports.unshift(record);
  persistReports(reports);
  listeners.forEach((fn) => {
    try {
      fn(record);
    } catch {
      // 忽略监听器异常
    }
  });
}

/** 订阅错误上报事件，返回取消订阅函数 */
export function onErrorReport(handler: ErrorReportHandler): () => void {
  listeners.add(handler);
  return () => {
    listeners.delete(handler);
  };
}

/** 获取历史错误报告 */
export function getErrorReports(): ErrorReportRecord[] {
  return loadReports();
}

/** 清空错误报告 */
export function clearErrorReports(): void {
  persistReports([]);
  // 通知监听器（空记录也可用于 UI 清空）
  listeners.forEach((fn) => {
    try {
      fn({
        id: makeId(),
        type: BffErrorType.Unknown,
        message: '__clear__',
        timestamp: new Date().toISOString(),
        retryCount: 0,
      });
    } catch {
      // ignore
    }
  });
}

// ==================== 错误回退 UI ====================

const ERROR_META: Record<BffErrorType, { icon: ReactNode; color: 'error' | 'warning' | 'info'; label: string }> = {
  [BffErrorType.Network]: { icon: <WifiOff size={18} />, color: 'error', label: i18n.t('bff.type_network', '网络错误') },
  [BffErrorType.Timeout]: { icon: <Clock size={18} />, color: 'warning', label: i18n.t('bff.type_timeout', '请求超时') },
  [BffErrorType.Validation]: { icon: <AlertTriangle size={18} />, color: 'warning', label: i18n.t('bff.type_validation', '校验失败') },
  [BffErrorType.Server]: { icon: <Server size={18} />, color: 'error', label: i18n.t('bff.type_server', '服务端错误') },
  [BffErrorType.Auth]: { icon: <ShieldAlert size={18} />, color: 'error', label: i18n.t('bff.type_auth', '权限不足') },
  [BffErrorType.NotFound]: { icon: <Ban size={18} />, color: 'info', label: i18n.t('bff.type_not_found', '资源不存在') },
  [BffErrorType.Cache]: { icon: <Database size={18} />, color: 'info', label: i18n.t('bff.type_cache', '缓存错误') },
  [BffErrorType.Offline]: { icon: <WifiOff size={18} />, color: 'warning', label: i18n.t('bff.type_offline', '离线模式') },
  [BffErrorType.Unknown]: { icon: <AlertTriangle size={18} />, color: 'warning', label: i18n.t('bff.type_unknown', '未知错误') },
};

/** 默认错误回退组件 */
export function DefaultBffErrorFallback({ error, classified, reset, showDetails = true }: BffErrorBoundaryFallbackProps) {
  const meta = ERROR_META[classified.type] ?? ERROR_META[BffErrorType.Unknown];
  return (
    <Paper sx={{ p: 3, m: 2, maxWidth: 640, mx: 'auto' }} role="alert">
      <Alert severity={meta.color} icon={meta.icon}>
        <AlertTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {meta.label}
          <Chip label={classified.type} size="small" variant="outlined" color={meta.color} />
        </AlertTitle>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          {classified.message}
        </Typography>
        {showDetails && classified.status !== undefined && (
          <Typography variant="caption" color="text.secondary">
            HTTP {classified.status} · {classified.timestamp}
          </Typography>
        )}
        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
          {classified.retryable && (
            <Button size="small" startIcon={<RefreshCw size={14} />} variant="contained" onClick={reset}>
              {i18n.t('bff.retry', '重试')}
            </Button>
          )}
        </Stack>
      </Alert>
    </Paper>
  );
}

// ==================== 错误边界 ====================

interface BffErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * BFF 错误边界（类组件）
 *
 * 捕获子树抛出的错误，分类后展示 DefaultBffErrorFallback，
 * 同时自动上报（含重试来源）。
 */
export class BffErrorBoundary extends Component<BffErrorBoundaryProps, BffErrorBoundaryState> {
  state: BffErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): BffErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    const { onError, name } = this.props;
    const classified = classifyError(error);
    reportError(classified, 0, name);
    onError?.(error, info);
  }

  private handleReset = (): void => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  override render(): ReactNode {
    const { children, errorFallback, fallback, showDetails = true } = this.props;
    if (!this.state.hasError || !this.state.error) return children;
    const error = this.state.error;
    if (errorFallback) return errorFallback(error, this.handleReset);
    if (fallback) return fallback;
    const classified = classifyError(error);
    return (
      <DefaultBffErrorFallback
        error={error}
        classified={classified}
        reset={this.handleReset}
        showDetails={showDetails}
      />
    );
  }
}

// 兼容默认导入
export default BffErrorBoundary;
