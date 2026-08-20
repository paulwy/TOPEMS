/**
 * @config-barrel Frontend configuration unified export
 *
 * Re-exports all config sub-modules. Business code should import from '@/config'
 * to avoid deep path dependencies:
 *   Correct: import { getEnv, isDev } from '@/config'
 *   Wrong:   import { getEnv } from '@/config/env'
 */

export * from './env';
export {    
  default as getEnv as isDevelopment,
  isProduction } from './runtime';
export * from './types';
export * from './deployment';
export * from './permissions';
export type { CspConfig } from './security';
export { securityConfig, applySecurityHeaders } from './security';
