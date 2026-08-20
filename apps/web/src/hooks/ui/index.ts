/**
 * UI layer - UI交互层
 *
 * 通用 UI 交互逻辑（弹窗、表格、窗口、面包屑、快捷键等）。
 * 依赖规则：可调用 foundation 层；禁止调用 domain / features 层。
 */

// ConfirmDialog
export { useConfirmDialog } from '../useConfirmDialog';
export type { ConfirmDialogConfig } from '../useConfirmDialog';

// DialogForm

// DataTable
export { useDataTable, useExportData } from '../useDataTable';

// WindowManager
export { useWindowManager } from '../useWindowManager';
export type { WindowState } from '../useWindowManager';

// BackNavigation
export { useBackNavigation } from '../useBackNavigation';

// AutoBreadcrumbs
export { useAutoBreadcrumbs } from '../useAutoBreadcrumbs';

// BatchSelection

// ImportExport

// PerformanceMonitor
export { usePerformanceMonitor } from '../usePerformanceMonitor';

// Shortcuts
export {
  matchShortcut,
  getShortcutKeyLabel,
  getShortcutsByCategory,
  GLOBAL_SHORTCUTS,
  SEARCH_SHORTCUTS,
} from '../shortcuts';
