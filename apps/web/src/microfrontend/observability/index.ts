export {
  modulePerformanceMetrics,
  type ModulePerformanceMetrics,
  type ResourceLoadDetail,
} from './module-performance-metrics';

export {
  errorTracker,
  type TrackedError,
  type ErrorContext,
  type ErrorStats,
} from './error-tracker';

export {
  userBehaviorAnalytics,
  type ModuleVisit,
  type ModuleAction,
  type ModuleVisitStats,
  type NavigationPath,
} from './user-behavior-analytics';

export { ObservabilityPanel } from './ObservabilityPanel';

// V217: MF 运行时可观测性埋点
export {
  initMFObservability,
  getMFErrorEvents,
  getMFErrorStats,
  clearMFErrorEvents,
  mfObservabilityPlugin,
} from './mf-runtime-plugin';

export {
  classifyMFError,
  getUserMessage,
  shouldShowToast,
  shouldSuppressToast,
  type MFErrorType,
  type MFErrorSeverity,
  type MFErrorEvent,
} from './mf-error-classifier';
