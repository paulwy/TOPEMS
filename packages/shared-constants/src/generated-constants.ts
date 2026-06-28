// Derived from @topems/tokens — single source of truth: packages/tokens/src/tokens.ts
import { designTokens } from '@topems/tokens';

export const GREY = designTokens.colors.grey;
export const SPACING = designTokens.spacing;
export const RADIUS = designTokens.borderRadius;
export const SHADOWS = {
  light: designTokens.shadows,
  dark: designTokens.darkShadows,
};
export const TYPOGRAPHY = designTokens.typography;
export const MOTION = designTokens.motion;
export const BREAKPOINTS = designTokens.breakpoints.values;
export const Z_INDEX = designTokens.zIndex;
