export { SpanStatusCode } from './e2eTracing';

export type { Span, Trace } from './e2eTracing';

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
} from './sessionReplay';

export type {
  BottleneckInfo,
  WebVitalsMetrics,
  NetworkMetrics,
  MemoryMetrics,
  LongTaskInfo,
  ComponentRenderInfo,
  PerformanceReport,
  BottleneckConfig,
} from './performanceBottleneck';
