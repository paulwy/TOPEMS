import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * V207 测试：pluginServiceEnabled feature flag 与 deployment config 行为验证
 *
 * 注意：deployment.ts 在模块加载时读取 VITE_PLUGIN_SERVICE_ENABLED，
 * 因此需要在 import 前通过 vi.stubEnv 设置环境变量，并 vi.resetModules 重新加载模块。
 */
describe('deployment config — pluginServiceEnabled feature flag', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('defaults to true when VITE_PLUGIN_SERVICE_ENABLED is not set', async () => {
    vi.stubEnv('VITE_PLUGIN_SERVICE_ENABLED', '');
    const { deploymentConfig } = await import('../deployment');
    expect(deploymentConfig.features.pluginServiceEnabled).toBe(true);
  });

  it('is true when VITE_PLUGIN_SERVICE_ENABLED="true"', async () => {
    vi.stubEnv('VITE_PLUGIN_SERVICE_ENABLED', 'true');
    const { deploymentConfig } = await import('../deployment');
    expect(deploymentConfig.features.pluginServiceEnabled).toBe(true);
  });

  it('is false when VITE_PLUGIN_SERVICE_ENABLED="false" (explicit opt-out)', async () => {
    vi.stubEnv('VITE_PLUGIN_SERVICE_ENABLED', 'false');
    const { deploymentConfig } = await import('../deployment');
    expect(deploymentConfig.features.pluginServiceEnabled).toBe(false);
  });

  it('getFeatureFlag("pluginServiceEnabled") returns same value as features object', async () => {
    vi.stubEnv('VITE_PLUGIN_SERVICE_ENABLED', 'false');
    const { getFeatureFlag, deploymentConfig } = await import('../deployment');
    expect(getFeatureFlag('pluginServiceEnabled')).toBe(
      deploymentConfig.features.pluginServiceEnabled
    );
    expect(getFeatureFlag('pluginServiceEnabled')).toBe(false);
  });
});

describe('deployment config — other feature flags sanity', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('all FeatureFlags keys are accessible via getFeatureFlag', async () => {
    const { getFeatureFlag } = await import('../deployment');
    const keys = [
      'quotaEnabled',
      'tenantManagement',
      'ssoEnabled',
      'twoFactorRequired',
      'ipWhitelistEnabled',
      'pluginServiceEnabled',
    ] as const;
    for (const key of keys) {
      expect(typeof getFeatureFlag(key)).toBe('boolean');
    }
  });
});
