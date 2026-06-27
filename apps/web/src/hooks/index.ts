export { useCrud } from './useCrud';
export type { UseCrudOptions, UseCrudResult } from './useCrud';

export { useBackNavigation } from './useBackNavigation';
export type { FromState, BackNavigationResult } from './useBackNavigation';

export { useAuth } from './useAuth';
export { usePermission } from './usePermission';
export { usePermissionCheck } from './usePermissionCheck';
export { useRole } from './useRole';
export { useOrganization } from './useOrganization';

export { useNotification } from './useNotification';
export { useNotificationState } from './useNotificationState';
export { useNotificationWebSocket } from './useNotificationWebSocket';
export { useNotificationSettings } from './useNotificationSettings';

export { useAIHelper } from './useAIHelper';
export { useAIContext } from './useAIContext';
export type { AIRecommendation, AIContextState, QuickCommand } from './useAIContext';
export { useBatchSelection } from './useBatchSelection';
export { useAutoBreadcrumbs } from './useAutoBreadcrumbs';
export type { AutoBreadcrumbItem, UseAutoBreadcrumbsOptions } from './useAutoBreadcrumbs';
export { useDataTable, useExportData } from './useDataTable';
export type { UseDataTableOptions, UseDataTableResult } from './useDataTable';
export { useImportExport } from './useImportExport';
export { useWebSocket } from './useWebSocket';
export { usePerformanceMonitor } from './usePerformanceMonitor';
export { useResponsive } from './useResponsive';
export type { Breakpoint } from './useResponsive';

export { useDebounce, useDebouncedValue, useDebouncedCallback } from './useDebounce';
export { useThrottle, useThrottledValue, useThrottledCallback } from './useThrottle';
export {
  useIntersectionObserver,
  useInView,
} from './useIntersectionObserver';
export type {
  UseIntersectionObserverOptions,
  UseIntersectionObserverResult,
} from './useIntersectionObserver';

export {
  useAssets,
  useExpenses,
  useBudgets,
  useReceivables,
  usePayables,
  useAccountingSubjects,
  useVouchers,
  useOfficeSupplies,
  useMeetingRooms,
  useMeetingBookings,
  useVehicles,
  useVehicleRequests,
  useAnnouncements,
  useFinanceReports,
} from './useErp';
export type { UseErpResult } from './useErp';
