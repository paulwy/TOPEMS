/**
 * Foundation layer - 基础原语层
 *
 * 纯工具型 hooks，无业务依赖，可在任意场景下复用。
 * 依赖规则：禁止调用 ui / domain / features 层。
 */

// Debounce - 来自 shared-hooks
export { useDebounce } from '@topems/shared-hooks';

// Throttle

// IntersectionObserver
export type {
  UseIntersectionObserverOptions,
  UseIntersectionObserverResult,
} from '../useIntersectionObserver';

// CountUp
export { useCountUp, countUpEasings } from '../useCountUp';

// Responsive
export { useResponsive } from '../useResponsive';
export type { Breakpoint } from '../useResponsive';

// IsMobile
export { useIsMobile } from '../useIsMobile';

// TouchFeedback
export { useTouchFeedback, useSwipeGesture } from '../useTouchFeedback';
export type { TouchFeedbackOptions, TouchRipple } from '../useTouchFeedback';

// VirtualScroll

// UrlState
export { useUrlState } from '../useUrlState';

// UrlListState
export { useUrlListState } from '../useUrlListState';

// ColumnConfig
export { useColumnConfig } from '../useColumnConfig';

// ColumnWidth
export { useColumnWidth } from '../useColumnWidth';

// Web Vitals (V26.0)
export type { WebVitalsMetrics } from './useWebVitals';
