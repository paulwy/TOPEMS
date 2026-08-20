/**
 * @config-barrel Frontend configuration unified export
 *
 * Re-exports all config sub-modules. Business code should import from '@/config'
 * to avoid deep path dependencies:
 *   Correct: import { getEnv, isDev } from '@/config'
 *   Wrong:   import { getEnv } from '@/config/env'
 */

export * from './env';
export { getEnv as isDevelopment, isProduction } from './runtime';
export * from './types';
export * from './deployment';
export * from './permissions';
export { applySecurityHeaders } from './security';
