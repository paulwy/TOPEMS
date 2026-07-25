export { E2ETracer, e2eTracer, SpanStatusCode } from './e2e-tracing';

export type { Span, SpanEvent, SpanStatus, Trace, TracingConfig } from './e2e-tracing';

export { SessionReplayer, sessionReplayer, ReplayEventType } from './session-replay';

export type {
  ReplaySession,
  ReplayEvent,
  SnapshotData,
  ClickData,
  InputData,
  ScrollData,
  MouseMoveData,
  NavigationData,
  NetworkData,
  ConsoleData,
  ResizeData,
  ReplayConfig,
} from './session-replay';

export {
  PerformanceBottleneckDetector,
  performanceBottleneckDetector,
  BottleneckType,
  BottleneckSeverity,
} from './performance-bottleneck';

export type {
  BottleneckInfo,
  WebVitalsMetrics,
  NetworkMetrics,
  MemoryMetrics,
  LongTaskInfo,
  ComponentRenderInfo,
  PerformanceReport,
  BottleneckConfig,
} from './performance-bottleneck';
