import i18n from '@/i18n';
/**
 * V217 MF 运行时错误分类器
 *
 * 将 @module-federation/runtime 钩子捕获的原始错误
 * 分类为结构化的 MFErrorEvent，供 errorTracker / logger / toast 使用。
 */

export type MFErrorType =
  | 'chunk_404'
  | 'content_type_missing'
  | 'loadShare_failure'
  | 'loadRemote_failure'
  | 'remote_entry_error'
  | 'init_container_error'
  | 'script_load_error'
  | 'fetch_error'
  | 'timeout'
  | 'unknown';

export type MFErrorSeverity = 'critical' | 'warning' | 'info';

export interface MFErrorEvent {
  type: MFErrorType;
  severity: MFErrorSeverity;
  moduleName: string;
  expose?: string;
  chunkUrl?: string;
  httpStatus?: number;
  contentType?: string;
  errorMessage: string;
  errorStack?: string;
  recovered: boolean;
  lifecycle: string;
  timestamp: number;
  rawError?: unknown;
}

const SEVERITY_MAP: Record<MFErrorType, MFErrorSeverity> = {
  chunk_404: 'critical',
  content_type_missing: 'warning',
  loadShare_failure: 'critical',
  loadRemote_failure: 'critical',
  remote_entry_error: 'critical',
  init_container_error: 'critical',
  script_load_error: 'warning',
  fetch_error: 'warning',
  timeout: 'warning',
  unknown: 'warning',
};

const USER_MESSAGES: Record<MFErrorType, string> = {
  chunk_404: i18n.t('microfrontend.mf-error-classifier.k0'),
  content_type_missing: i18n.t('microfrontend.mf-error-classifier.k1'),
  loadShare_failure: i18n.t('microfrontend.mf-error-classifier.k2'),
  loadRemote_failure: i18n.t('microfrontend.mf-error-classifier.k3'),
  remote_entry_error: i18n.t('microfrontend.mf-error-classifier.k4'),
  init_container_error: i18n.t('microfrontend.mf-error-classifier.k5'),
  script_load_error: i18n.t('microfrontend.mf-error-classifier.k6'),
  fetch_error: i18n.t('microfrontend.mf-error-classifier.k7'),
  timeout: i18n.t('microfrontend.mf-error-classifier.k8'),
  unknown: i18n.t('microfrontend.mf-error-classifier.k9'),
};

function extractModuleName(
  remoteInfo?: { name?: string; alias?: string } | null
): string | undefined {
  if (!remoteInfo) return undefined;
  return remoteInfo.alias || remoteInfo.name || undefined;
}

function extractHttpStatus(error: unknown): number | undefined {
  if (!error) return undefined;
  const text = String(
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? `${error.message} ${error.stack ?? ''}`
        : JSON.stringify(error)
  );
  const match = text.match(/\b(40[0489]|500|502|503)\b/);
  return match ? parseInt(match[1], 10) : undefined;
}

function extractChunkUrl(error: unknown): string | undefined {
  if (!error) return undefined;
  const text = String(
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? `${error.message} ${error.stack ?? ''}`
        : JSON.stringify(error)
  );
  const match = text.match(/https?:\/\/[^\s"'<>]+|\/remote\/[^\s"'<>]+|\/assets\/[^\s"'<>]+/i);
  return match ? match[0] : undefined;
}

function extractContentType(error: unknown): string | undefined {
  if (!error) return undefined;
  const text = String(
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? `${error.message} ${error.stack ?? ''}`
        : JSON.stringify(error)
  );
  const match = text.match(/content-type[:\s]+["']?([^\s"';]+)/i);
  return match ? match[1] : undefined;
}

function isTimeoutError(error: unknown): boolean {
  const text = String(error instanceof Error ? error.message : error);
  return /timeout|timed?\s*out|abort/i.test(text);
}

function isContentTypeError(error: unknown): boolean {
  const text = String(error instanceof Error ? error.message : error);
  return /content.?type|MIME|unexpected.*token|<.*>.*expected|syntaxerror/i.test(text);
}

function is404Error(error: unknown, httpStatus?: number): boolean {
  if (httpStatus === 404) return true;
  const text = String(error instanceof Error ? error.message : error);
  return /404|not\s*found|failed\s*to\s*fetch/i.test(text);
}

export function classifyMFError(params: {
  error?: unknown;
  remoteInfo?: { name?: string; alias?: string } | null;
  expose?: string;
  lifecycle: string;
  recovered?: boolean;
  pkgName?: string;
}): MFErrorEvent {
  const { error, remoteInfo, expose, lifecycle, recovered = false, pkgName } = params;
  const moduleName = extractModuleName(remoteInfo) || pkgName || 'unknown';
  const httpStatus = extractHttpStatus(error);
  const chunkUrl = extractChunkUrl(error);
  const contentType = extractContentType(error);
  const errorMessage = error instanceof Error ? error.message : String(error ?? 'Unknown error');
  const errorStack = error instanceof Error ? error.stack : undefined;

  let type: MFErrorType;
  if (is404Error(error, httpStatus)) {
    type = 'chunk_404';
  } else if (isContentTypeError(error)) {
    type = 'content_type_missing';
  } else if (isTimeoutError(error)) {
    type = 'timeout';
  } else if (/init.*container|container.*init/i.test(lifecycle)) {
    type = 'init_container_error';
  } else if (/loadEntry|afterLoadEntry|remoteEntry/i.test(lifecycle)) {
    type = 'remote_entry_error';
  } else if (/loadShare|errorLoadShare/i.test(lifecycle)) {
    type = 'loadShare_failure';
  } else if (/loadRemote|errorLoadRemote/i.test(lifecycle)) {
    type = 'loadRemote_failure';
  } else if (/script|createScript/i.test(lifecycle)) {
    type = 'script_load_error';
  } else if (/fetch/i.test(lifecycle)) {
    type = 'fetch_error';
  } else {
    type = 'unknown';
  }

  return {
    type,
    severity: SEVERITY_MAP[type],
    moduleName,
    expose,
    chunkUrl,
    httpStatus,
    contentType,
    errorMessage,
    errorStack,
    recovered,
    lifecycle,
    timestamp: Date.now(),
    rawError: error,
  };
}

export function getUserMessage(event: MFErrorEvent): string {
  const base = USER_MESSAGES[event.type];
  if (event.moduleName !== 'unknown') {
    return `[${event.moduleName}] ${base}`;
  }
  return base;
}

export function shouldShowToast(event: MFErrorEvent): boolean {
  if (event.recovered) return false;
  return event.severity === 'critical' || event.severity === 'warning';
}

export function shouldSuppressToast(event: MFErrorEvent, recentEvents: MFErrorEvent[]): boolean {
  const window = 10_000;
  const now = Date.now();
  const similar = recentEvents.filter(
    (e) => e.type === event.type && e.moduleName === event.moduleName && now - e.timestamp < window
  );
  return similar.length >= 2;
}
