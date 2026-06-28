/**
 * @topems/shared-constants
 * 统一常量导出
 */

// 颜色常量
export {
  COLORS,
  DARK_COLORS,
  BACKGROUNDS,
  DARK_BACKGROUNDS,
  TEXT,
  DARK_TEXT,
  BORDERS,
  DARK_BORDERS,
  STATUS_COLORS,
  MODULE_GRADIENTS,
  GRADIENTS,
  SIDEBAR,
  DARK_SIDEBAR,
  getStatusColorConfig,
  getStatusSxProps,
} from './colors';

// 设计令牌常量（从 @topems/tokens 派生）
export { GREY, SPACING, RADIUS, SHADOWS, TYPOGRAPHY, MOTION, BREAKPOINTS, Z_INDEX } from './generated-constants';

// 超时常量
export {
  API_TIMEOUT,
  PLUGIN_TIMEOUT,
  WS_TIMEOUT,
  DEBOUNCE_THROTTLE,
  CACHE_TIME,
  SESSION,
  TOAST,
  getTimeoutFromEnv,
  withTimeout,
} from './timeouts';

// 数字常量
export {
  EARTH,
  REFRESH_INTERVAL,
  PERFORMANCE,
  PAGINATION,
  FILE_UPLOAD,
  ASSET_VALUES,
  MAP,
  ANIMATION,
  VALIDATION,
  TRACK,
  DATE_FORMAT,
  formatDistance,
  formatArea,
  formatFileSize,
} from './numbers';

// 标签常量
export {
  LABELS,
  MODULE_LABELS,
  MESSAGES,
  VALIDATION_MESSAGES,
  getValidationMessage,
  getFieldLabel,
} from './labels';