/**
 * 部署配置
 *
 * 提供系统部署模式的配置管理，支持 SaaS 和 On-Premise 两种部署模式。
 */

import { getEnv } from './runtime';

type DeploymentMode = 'saas' | 'on-premise';

interface FeatureFlags {
  /** 配额限制开关 */
  quotaEnabled: boolean;
  /** 计费功能开关 */
  billingEnabled: boolean;
  /** 租户管理UI开关 */
  tenantManagement: boolean;
  /** SSO 单点登录开关 */
  ssoEnabled: boolean;
  /** 双因素认证开关 */
  twoFactorRequired: boolean;
  /** IP 白名单开关 */
  ipWhitelistEnabled: boolean;
  /** 插件服务开关（关闭时 PluginProvider 不发起任何 API 请求） */
  pluginServiceEnabled: boolean;
}

export interface DeploymentConfig {
  /** 部署模式 */
  mode: DeploymentMode;
  /** 多租户开关 */
  multiTenantEnabled: boolean;
  /** 默认租户ID */
  defaultTenantId: string;
  /** 功能开关 */
  features: FeatureFlags;
}

/**
 * 从环境变量获取部署配置
 *
 * V64 配置维度修正：
 *   - 部署形态（SaaS / On-Premise）使用 `VITE_DEPLOY_ENV`，值为 saas | on-premise
 *   - 微前端打包模式（static / module-federation / hybrid）使用 `VITE_DEPLOYMENT_MODE`
 *   二者为完全独立的维度，历史代码曾混用 `VITEDeploymentMode`，此处做兼容过渡。
 */
function readDeployMode(): DeploymentMode {
  const standard = getEnv('VITE_DEPLOY_ENV');
  if (standard === 'saas' || standard === 'on-premise') return standard;
  const legacy = getEnv('VITEDeploymentMode');
  if (legacy === 'saas' || legacy === 'on-premise') return legacy;
  return 'on-premise';
}

export const deploymentConfig: DeploymentConfig = {
  mode: readDeployMode(),
  multiTenantEnabled: getEnv('VITE_MULTI_TENANT_ENABLED') === 'true',
  defaultTenantId: getEnv('VITE_DEFAULT_TENANT_ID') || '00000000-0000-0000-0000-000000000001',
  features: {
    quotaEnabled: getEnv('VITE_QUOTA_ENABLED') === 'true',
    billingEnabled: getEnv('VITE_BILLING_ENABLED') === 'true',
    tenantManagement: getEnv('VITE_TENANT_MANAGEMENT') === 'true',
    ssoEnabled: getEnv('VITE_SSO_ENABLED') === 'true',
    twoFactorRequired: getEnv('VITE_TWO_FACTOR_REQUIRED') === 'true',
    ipWhitelistEnabled: getEnv('VITE_IP_WHITELIST_ENABLED') === 'true',
    pluginServiceEnabled: getEnv('VITE_PLUGIN_SERVICE_ENABLED') !== 'false', // 默认开启，显式设 false 才禁用
  },
};

deploymentConfig.features.quotaEnabled && deploymentConfig.multiTenantEnabled;

deploymentConfig.features.tenantManagement && deploymentConfig.multiTenantEnabled;

export default deploymentConfig;
