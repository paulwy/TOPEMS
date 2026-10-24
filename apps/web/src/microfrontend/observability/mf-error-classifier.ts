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
