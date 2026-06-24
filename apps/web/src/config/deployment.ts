/**
 * 部署配置
 *
 * 提供系统部署模式的配置管理，支持 SaaS 和 On-Premise 两种部署模式。
 */

export type DeploymentMode = 'saas' | 'on-premise';

export interface FeatureFlags {
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
 */
export const deploymentConfig: DeploymentConfig = {
  mode: (import.meta.env.VITE_DEPLOYMENT_MODE as DeploymentMode) || 'on-premise',
  multiTenantEnabled: import.meta.env.VITE_MULTI_TENANT_ENABLED === 'true',
  defaultTenantId: import.meta.env.VITE_DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001',
  features: {
    quotaEnabled: import.meta.env.VITE_QUOTA_ENABLED === 'true',
    billingEnabled: import.meta.env.VITE_BILLING_ENABLED === 'true',
    tenantManagement: import.meta.env.VITE_TENANT_MANAGEMENT === 'true',
    ssoEnabled: import.meta.env.VITE_SSO_ENABLED === 'true',
    twoFactorRequired: import.meta.env.VITE_TWO_FACTOR_REQUIRED === 'true',
    ipWhitelistEnabled: import.meta.env.VITE_IP_WHITELIST_ENABLED === 'true',
  },
};

/**
 * 是否为 SaaS 模式
 */
export const isSaaS = (): boolean => deploymentConfig.mode === 'saas';

/**
 * 是否为 On-Premise 模式
 */
export const isOnPremise = (): boolean => deploymentConfig.mode === 'on-premise';

/**
 * 是否启用多租户
 */
export const isMultiTenant = (): boolean => deploymentConfig.multiTenantEnabled;

/**
 * 检查租户访问权限
 *
 * On-Premise 模式下跳过租户检查
 */
export const checkTenantAccess = (userTenantId: string, resourceTenantId: string): boolean => {
  if (!deploymentConfig.multiTenantEnabled) {
    return true;
  }
  return userTenantId === resourceTenantId;
};

/**
 * 是否应该检查配额
 *
 * On-Premise 模式下跳过配额检查
 */
export const shouldCheckQuota = (): boolean =>
  deploymentConfig.features.quotaEnabled && deploymentConfig.multiTenantEnabled;

/**
 * 是否显示租户管理UI
 */
export const showTenantManagement = (): boolean =>
  deploymentConfig.features.tenantManagement && deploymentConfig.multiTenantEnabled;

/**
 * 获取功能开关状态
 */
export const getFeatureFlag = (flag: keyof FeatureFlags): boolean =>
  deploymentConfig.features[flag];

export default deploymentConfig;
