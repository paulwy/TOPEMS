/**
 * V42.0 Track F: 微前端企业级 — 沙箱隔离统一导出
 *
 * 导出:
 * - JavaScriptSandbox: JS 运行时沙箱（Proxy 代理 window/document）
 * - StyleIsolation: 样式隔离（Shadow DOM / Scoped CSS / CSS Modules）
 * - EventIsolation: 事件隔离（事件/定时器拦截与清理）
 * - SandboxManager: 沙箱管理器（单例，统一管理三种隔离）
 * - SandboxedRemoteLoader: 沙箱化远程模块加载器
 * - ConflictDetector: 冲突检测器（单例）
 *
 * @example
 * import {
 *   JavaScriptSandbox,
 *   StyleIsolation,
 *   EventIsolation,
 *   sandboxManager,
 *   SandboxedRemoteLoader,
 *   conflictDetector,
 * } from '@/microfrontend/sandbox';
 */

// ==================== JS 沙箱 ====================
export {
  JavaScriptSandbox,
  isBuiltinGlobal,
  type SandboxOptions,
  type GlobalVarConflict,
} from './js-sandbox';

// ==================== 样式隔离 ====================
export {
  StyleIsolation,
  type StyleIsolationMode,
  type StyleIsolationOptions,
  type StyleConflict,
  type CSSSpecificity,
} from './style-isolation';

// ==================== 事件隔离 ====================
export {
  EventIsolation,
  type TimerType,
  type RegisteredEvent,
  type RegisteredTimer,
  type EventLeakReport,
  type EventConflict,
} from './event-isolation';

// ==================== 冲突检测器 ====================
export {
  conflictDetector,
  ConflictDetector,
  type ConflictSeverity,
  type GlobalVarConflict as DetectorGlobalVarConflict,
  type StyleConflict as DetectorStyleConflict,
  type EventConflict as DetectorEventConflict,
  type ConflictReport,
} from './conflict-detector';

// ==================== 沙箱管理器 ====================
export {
  sandboxManager,
  SandboxManager,
  type SandboxBundle,
  type SandboxStatus,
  type SandboxManagerOptions,
  type HealthCheckResult,
  type GlobalLeakReport,
} from './sandbox-manager';

// ==================== 沙箱化加载器 ====================
export {
  SandboxedRemoteLoader,
  default,
  type SandboxedRemoteLoaderProps,
  type SandboxedRemoteLoaderIsolation,
} from './SandboxedRemoteLoader';
