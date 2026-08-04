/**
 * @env-entry Singleton environment variable access
 *
 * Unified frontend environment variable access point.
 * Eliminates scattered typeof import.meta !== 'undefined' checks.
 * All frontend code should use the APIs exposed here to read env vars.
 *
 * @todo V79+
 *   - This singleton covers 100% of frontend import.meta.env reads
 *   - Global search for import.meta.env and replace with getEnv/isDev/isProd
 *   - Align with backend Node-side lib/config-env singleton
 */

function getImportMetaEnvSafe(): Record<string, string | boolean | undefined> {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return import.meta.env as unknown as Record<string, string | boolean | undefined>;
    }
  } catch {
    // ignore
  }
  return {};
}

/**
 * Safely read environment variable (generic support, return type matches defaultValue)
 * @param key Environment variable key (e.g. VITEApiBaseUrl)
 * @param defaultValue Default value when not set (undefined if not provided)
 */
export function getEnv<T = string>(key: string, defaultValue?: T): T | undefined {
  const env = getImportMetaEnvSafe();
  if (env && typeof env[key] !== 'undefined') {
    const raw = env[key];
    if (typeof defaultValue === 'boolean') {
      return (String(raw) === 'true') as unknown as T;
    }
    if (typeof defaultValue === 'number') {
      const n = Number(raw);
      return (isNaN(n) ? defaultValue : n) as unknown as T;
    }
    return String(raw) as unknown as T;
  }
  return defaultValue;
}

/** Whether development mode (equivalent to import.meta.env.DEV) */
export function isDev(): boolean {
  return getEnv<boolean>('DEV', true) ?? true;
}

/** Whether production mode (equivalent to import.meta.env.PROD) */
export function isProd(): boolean {
  return getEnv<boolean>('PROD', false) ?? false;
}

/** Deployment mode: static | module-federation | standalone */
export const VITEDeploymentMode = (): string => getEnv('VITEDeploymentMode', 'static') as string;

/** Common quick getters (lazy evaluation via functions) */
export const VITEApiBaseUrl = (): string => getEnv('VITEApiBaseUrl', '/api') as string;

export const VITEEnableDebugMode = (): boolean =>
  getEnv<boolean>('VITEEnableDebugMode', false) ?? false;

export const VITELogLevel = (): string => getEnv('VITELogLevel', 'info') as string;
