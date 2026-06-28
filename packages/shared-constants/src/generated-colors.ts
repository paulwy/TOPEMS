// DEPRECATED: This file is kept for backward compatibility.
// Import from './colors' instead, which now derives from @topems/tokens.
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

// Re-export additional generated constants that don't exist in colors.ts
export { GREY, SPACING, RADIUS, SHADOWS, TYPOGRAPHY, MOTION, BREAKPOINTS, Z_INDEX } from './generated-constants';
