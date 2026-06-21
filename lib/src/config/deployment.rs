//! 部署配置模块
//! 
//! 提供系统部署模式的配置管理，支持 SaaS 和 On-Premise 两种部署模式。

use serde::{Deserialize, Serialize};
use std::env;
use uuid::Uuid;

/// 部署模式
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum DeploymentMode {
    /// SaaS 多租户模式
    SaaS,
    /// On-Premise 单租户私有化部署模式
    OnPremise,
}

impl Default for DeploymentMode {
    fn default() -> Self {
        Self::OnPremise
    }
}

impl std::fmt::Display for DeploymentMode {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DeploymentMode::SaaS => write!(f, "saas"),
            DeploymentMode::OnPremise => write!(f, "on-premise"),
        }
    }
}

/// 功能开关配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeatureFlags {
    /// 配额限制开关
    pub quota_enabled: bool,
    /// 计费功能开关
    pub billing_enabled: bool,
    /// 租户管理UI开关
    pub tenant_management: bool,
    /// SSO 单点登录开关
    pub sso_enabled: bool,
    /// 双因素认证开关
    pub two_factor_required: bool,
    /// IP 白名单开关
    pub ip_whitelist_enabled: bool,
}

impl Default for FeatureFlags {
    fn default() -> Self {
        Self {
            quota_enabled: false,
            billing_enabled: false,
            tenant_management: false,
            sso_enabled: false,
            two_factor_required: false,
            ip_whitelist_enabled: false,
        }
    }
}

/// 部署配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeploymentConfig {
    /// 部署模式
    pub mode: DeploymentMode,
    /// 多租户开关
    pub multi_tenant_enabled: bool,
    /// 默认租户ID
    pub default_tenant_id: Uuid,
    /// 功能开关
    pub features: FeatureFlags,
}

impl Default for DeploymentConfig {
    fn default() -> Self {
        Self {
            mode: DeploymentMode::OnPremise,
            multi_tenant_enabled: false,
            default_tenant_id: Uuid::nil(),
            features: FeatureFlags::default(),
        }
    }
}

impl DeploymentConfig {
    /// 从环境变量加载配置
    pub fn from_env() -> Self {
        let mode = match env::var("DEPLOYMENT_MODE")
            .unwrap_or_else(|_| "on-premise".to_string())
            .to_lowercase()
            .as_str()
        {
            "saas" => DeploymentMode::SaaS,
            _ => DeploymentMode::OnPremise,
        };

        let multi_tenant_enabled = env::var("MULTI_TENANT_ENABLED")
            .map(|v| v.to_lowercase() == "true")
            .unwrap_or(false);

        let default_tenant_id = env::var("DEFAULT_TENANT_ID")
            .ok()
            .and_then(|v| Uuid::parse_str(&v).ok())
            .unwrap_or_else(|| {
                Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
            });

        let features = FeatureFlags {
            quota_enabled: env::var("QUOTA_ENABLED")
                .map(|v| v.to_lowercase() == "true")
                .unwrap_or(false),
            billing_enabled: env::var("BILLING_ENABLED")
                .map(|v| v.to_lowercase() == "true")
                .unwrap_or(false),
            tenant_management: env::var("TENANT_MANAGEMENT")
                .map(|v| v.to_lowercase() == "true")
                .unwrap_or(false),
            sso_enabled: env::var("SSO_ENABLED")
                .map(|v| v.to_lowercase() == "true")
                .unwrap_or(false),
            two_factor_required: env::var("TWO_FACTOR_REQUIRED")
                .map(|v| v.to_lowercase() == "true")
                .unwrap_or(false),
            ip_whitelist_enabled: env::var("IP_WHITELIST_ENABLED")
                .map(|v| v.to_lowercase() == "true")
                .unwrap_or(false),
        };

        Self {
            mode,
            multi_tenant_enabled,
            default_tenant_id,
            features,
        }
    }

    /// 是否为 SaaS 模式
    pub fn is_saas(&self) -> bool {
        self.mode == DeploymentMode::SaaS
    }

    /// 是否为 On-Premise 模式
    pub fn is_on_premise(&self) -> bool {
        self.mode == DeploymentMode::OnPremise
    }

    /// 是否启用多租户
    pub fn is_multi_tenant(&self) -> bool {
        self.multi_tenant_enabled
    }

    /// 检查租户访问权限
    /// 
    /// On-Premise 模式下跳过租户检查
    pub fn check_tenant_access(
        &self,
        user_tenant_id: Uuid,
        resource_tenant_id: Uuid,
    ) -> Result<(), String> {
        if !self.multi_tenant_enabled {
            return Ok(());
        }

        if user_tenant_id != resource_tenant_id {
            return Err("Tenant mismatch".to_string());
        }

        Ok(())
    }

    /// 检查配额
    /// 
    /// On-Premise 模式下跳过配额检查
    pub fn should_check_quota(&self) -> bool {
        self.features.quota_enabled && self.multi_tenant_enabled
    }

    /// 是否显示租户管理UI
    pub fn show_tenant_management(&self) -> bool {
        self.features.tenant_management && self.multi_tenant_enabled
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = DeploymentConfig::default();
        assert_eq!(config.mode, DeploymentMode::OnPremise);
        assert!(!config.multi_tenant_enabled);
        assert!(!config.features.quota_enabled);
    }

    #[test]
    fn test_tenant_access_check() {
        let config = DeploymentConfig::default();
        let tenant1 = Uuid::new_v4();
        let tenant2 = Uuid::new_v4();

        // On-Premise 模式下，不同租户也可以访问
        assert!(config.check_tenant_access(tenant1, tenant2).is_ok());

        // SaaS 模式下，不同租户不能访问
        let saas_config = DeploymentConfig {
            mode: DeploymentMode::SaaS,
            multi_tenant_enabled: true,
            ..Default::default()
        };
        assert!(saas_config.check_tenant_access(tenant1, tenant2).is_err());
        assert!(saas_config.check_tenant_access(tenant1, tenant1).is_ok());
    }
}
