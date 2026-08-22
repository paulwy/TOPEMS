//! 部署配置模块
//!
//! 提供系统部署模式的配置管理，支持 SaaS 和 On-Premise 两种部署模式。

use serde::{Deserialize, Serialize};
use std::env;
use uuid::Uuid;

/// 部署模式
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
#[derive(Default)]
pub enum DeploymentMode {
    /// SaaS 多租户模式
    SaaS,
    /// On-Premise 单租户私有化部署模式
    #[default]
    OnPremise,
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
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
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
            .unwrap_or_else(|| Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap());

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
    use serial_test::serial;

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

    // ===== 以下为补充测试 =====

    fn clear_deployment_env_vars() {
        for k in [
            "DEPLOYMENT_MODE",
            "MULTI_TENANT_ENABLED",
            "DEFAULT_TENANT_ID",
            "QUOTA_ENABLED",
            "BILLING_ENABLED",
            "TENANT_MANAGEMENT",
            "SSO_ENABLED",
            "TWO_FACTOR_REQUIRED",
            "IP_WHITELIST_ENABLED",
        ] {
            std::env::remove_var(k);
        }
    }

    #[test]
    fn deployment_mode_default_is_on_premise() {
        assert_eq!(DeploymentMode::default(), DeploymentMode::OnPremise);
    }

    #[test]
    fn deployment_mode_display_strings() {
        assert_eq!(format!("{}", DeploymentMode::SaaS), "saas");
        assert_eq!(format!("{}", DeploymentMode::OnPremise), "on-premise");
    }

    #[test]
    fn deployment_mode_copy_and_clone_equal() {
        let a = DeploymentMode::SaaS;
        let b = a; // Copy
        let c = a;
        assert_eq!(a, b);
        assert_eq!(a, c);
        let d = DeploymentMode::OnPremise;
        assert_ne!(a, d);
    }

    #[test]
    fn deployment_mode_serde_json_roundtrip() {
        for mode in [DeploymentMode::SaaS, DeploymentMode::OnPremise] {
            let json = serde_json::to_string(&mode).expect("serialize");
            let back: DeploymentMode = serde_json::from_str(&json).expect("deserialize");
            assert_eq!(back, mode);
        }
    }

    #[test]
    fn deployment_mode_serde_yaml_roundtrip() {
        for mode in [DeploymentMode::SaaS, DeploymentMode::OnPremise] {
            let yaml = serde_yaml::to_string(&mode).expect("serialize yaml");
            let back: DeploymentMode = serde_yaml::from_str(&yaml).expect("deserialize yaml");
            assert_eq!(back, mode);
        }
    }

    #[test]
    fn deployment_mode_serde_uses_kebab_case() {
        // serde rename_all = "kebab-case" 拆词结果：
        //   SaaS      -> "saa-s"
        //   OnPremise -> "on-premise"
        // 注意：这与 Display/from_env 使用的 "saas" 不同（既有设计）
        assert_eq!(
            serde_json::to_string(&DeploymentMode::SaaS).unwrap(),
            "\"saa-s\""
        );
        assert_eq!(
            serde_json::to_string(&DeploymentMode::OnPremise).unwrap(),
            "\"on-premise\""
        );
        let m: DeploymentMode = serde_json::from_str("\"on-premise\"").unwrap();
        assert_eq!(m, DeploymentMode::OnPremise);
        let m: DeploymentMode = serde_json::from_str("\"saa-s\"").unwrap();
        assert_eq!(m, DeploymentMode::SaaS);
    }

    #[test]
    fn feature_flags_default_all_false() {
        let f = FeatureFlags::default();
        assert!(!f.quota_enabled);
        assert!(!f.billing_enabled);
        assert!(!f.tenant_management);
        assert!(!f.sso_enabled);
        assert!(!f.two_factor_required);
        assert!(!f.ip_whitelist_enabled);
    }

    #[test]
    fn feature_flags_clone_preserves_fields() {
        let f = FeatureFlags {
            quota_enabled: true,
            billing_enabled: true,
            tenant_management: false,
            sso_enabled: true,
            two_factor_required: false,
            ip_whitelist_enabled: true,
        };
        let c = f.clone();
        assert_eq!(c.quota_enabled, f.quota_enabled);
        assert_eq!(c.billing_enabled, f.billing_enabled);
        assert_eq!(c.tenant_management, f.tenant_management);
        assert_eq!(c.sso_enabled, f.sso_enabled);
        assert_eq!(c.two_factor_required, f.two_factor_required);
        assert_eq!(c.ip_whitelist_enabled, f.ip_whitelist_enabled);
    }

    #[test]
    fn feature_flags_serde_json_roundtrip() {
        let f = FeatureFlags {
            quota_enabled: true,
            billing_enabled: false,
            tenant_management: true,
            sso_enabled: false,
            two_factor_required: true,
            ip_whitelist_enabled: false,
        };
        let json = serde_json::to_string(&f).expect("serialize");
        let back: FeatureFlags = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.quota_enabled, f.quota_enabled);
        assert_eq!(back.billing_enabled, f.billing_enabled);
        assert_eq!(back.tenant_management, f.tenant_management);
        assert_eq!(back.sso_enabled, f.sso_enabled);
        assert_eq!(back.two_factor_required, f.two_factor_required);
        assert_eq!(back.ip_whitelist_enabled, f.ip_whitelist_enabled);
    }

    #[test]
    fn feature_flags_serde_yaml_roundtrip() {
        let f = FeatureFlags {
            quota_enabled: true,
            billing_enabled: true,
            tenant_management: false,
            sso_enabled: true,
            two_factor_required: false,
            ip_whitelist_enabled: true,
        };
        let yaml = serde_yaml::to_string(&f).expect("serialize yaml");
        let back: FeatureFlags = serde_yaml::from_str(&yaml).expect("deserialize yaml");
        assert_eq!(back.quota_enabled, f.quota_enabled);
        assert_eq!(back.billing_enabled, f.billing_enabled);
        assert_eq!(back.sso_enabled, f.sso_enabled);
        assert_eq!(back.ip_whitelist_enabled, f.ip_whitelist_enabled);
    }

    #[test]
    fn deployment_config_default_values() {
        let c = DeploymentConfig::default();
        assert_eq!(c.mode, DeploymentMode::OnPremise);
        assert!(!c.multi_tenant_enabled);
        assert_eq!(c.default_tenant_id, Uuid::nil());
        assert!(!c.features.quota_enabled);
        assert!(!c.features.billing_enabled);
    }

    #[test]
    fn deployment_config_clone_preserves_fields() {
        let c = DeploymentConfig {
            mode: DeploymentMode::SaaS,
            multi_tenant_enabled: true,
            default_tenant_id: Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap(),
            features: FeatureFlags {
                quota_enabled: true,
                billing_enabled: true,
                tenant_management: true,
                sso_enabled: true,
                two_factor_required: true,
                ip_whitelist_enabled: true,
            },
        };
        let c2 = c.clone();
        assert_eq!(c2.mode, c.mode);
        assert_eq!(c2.multi_tenant_enabled, c.multi_tenant_enabled);
        assert_eq!(c2.default_tenant_id, c.default_tenant_id);
        assert_eq!(c2.features.quota_enabled, c.features.quota_enabled);
        assert_eq!(c2.features.billing_enabled, c.features.billing_enabled);
    }

    #[test]
    fn deployment_config_serde_json_roundtrip() {
        let c = DeploymentConfig {
            mode: DeploymentMode::SaaS,
            multi_tenant_enabled: true,
            default_tenant_id: Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap(),
            features: FeatureFlags {
                quota_enabled: true,
                billing_enabled: false,
                tenant_management: true,
                sso_enabled: false,
                two_factor_required: true,
                ip_whitelist_enabled: false,
            },
        };
        let json = serde_json::to_string(&c).expect("serialize");
        let back: DeploymentConfig = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.mode, c.mode);
        assert_eq!(back.multi_tenant_enabled, c.multi_tenant_enabled);
        assert_eq!(back.default_tenant_id, c.default_tenant_id);
        assert_eq!(back.features.quota_enabled, c.features.quota_enabled);
        assert_eq!(back.features.billing_enabled, c.features.billing_enabled);
        assert_eq!(back.features.sso_enabled, c.features.sso_enabled);
    }

    #[test]
    fn deployment_config_serde_yaml_roundtrip() {
        let c = DeploymentConfig::default();
        let yaml = serde_yaml::to_string(&c).expect("serialize yaml");
        let back: DeploymentConfig = serde_yaml::from_str(&yaml).expect("deserialize yaml");
        assert_eq!(back.mode, c.mode);
        assert_eq!(back.multi_tenant_enabled, c.multi_tenant_enabled);
        assert_eq!(back.default_tenant_id, c.default_tenant_id);
    }

    #[test]
    fn is_saas_and_is_on_premise_flags() {
        let saas = DeploymentConfig {
            mode: DeploymentMode::SaaS,
            ..Default::default()
        };
        let op = DeploymentConfig::default();
        assert!(saas.is_saas());
        assert!(!saas.is_on_premise());
        assert!(!op.is_saas());
        assert!(op.is_on_premise());
    }

    #[test]
    fn is_multi_tenant_reflects_flag() {
        let mut c = DeploymentConfig::default();
        assert!(!c.is_multi_tenant());
        c.multi_tenant_enabled = true;
        assert!(c.is_multi_tenant());
    }

    #[test]
    fn should_check_quota_requires_both_flags() {
        let mut c = DeploymentConfig::default();
        assert!(!c.should_check_quota());
        c.features.quota_enabled = true;
        assert!(!c.should_check_quota()); // multi_tenant 仍为 false
        c.multi_tenant_enabled = true;
        assert!(c.should_check_quota());
        c.features.quota_enabled = false;
        assert!(!c.should_check_quota());
    }

    #[test]
    fn show_tenant_management_requires_both_flags() {
        let mut c = DeploymentConfig::default();
        assert!(!c.show_tenant_management());
        c.features.tenant_management = true;
        assert!(!c.show_tenant_management()); // multi_tenant 仍为 false
        c.multi_tenant_enabled = true;
        assert!(c.show_tenant_management());
    }

    #[test]
    fn check_tenant_access_on_premise_always_ok() {
        let c = DeploymentConfig::default(); // on-premise, multi_tenant off
        let t1 = Uuid::new_v4();
        let t2 = Uuid::new_v4();
        assert!(c.check_tenant_access(t1, t2).is_ok());
        assert!(c.check_tenant_access(t1, t1).is_ok());
    }

    #[test]
    #[serial]
    fn from_env_defaults_when_no_env_vars() {
        clear_deployment_env_vars();
        let c = DeploymentConfig::from_env();
        assert_eq!(c.mode, DeploymentMode::OnPremise);
        assert!(!c.multi_tenant_enabled);
        // DEFAULT_TENANT_ID 缺省回退值
        assert_eq!(
            c.default_tenant_id,
            Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
        );
        assert!(!c.features.quota_enabled);
        assert!(!c.features.billing_enabled);
        assert!(!c.features.sso_enabled);
    }

    #[test]
    #[serial]
    fn from_env_saas_mode_and_all_flags_true() {
        clear_deployment_env_vars();
        std::env::set_var("DEPLOYMENT_MODE", "SaaS");
        std::env::set_var("MULTI_TENANT_ENABLED", "true");
        std::env::set_var("QUOTA_ENABLED", "true");
        std::env::set_var("BILLING_ENABLED", "TRUE");
        std::env::set_var("TENANT_MANAGEMENT", "true");
        std::env::set_var("SSO_ENABLED", "true");
        std::env::set_var("TWO_FACTOR_REQUIRED", "true");
        std::env::set_var("IP_WHITELIST_ENABLED", "true");

        let c = DeploymentConfig::from_env();
        assert_eq!(c.mode, DeploymentMode::SaaS);
        assert!(c.multi_tenant_enabled);
        assert!(c.features.quota_enabled);
        assert!(c.features.billing_enabled);
        assert!(c.features.tenant_management);
        assert!(c.features.sso_enabled);
        assert!(c.features.two_factor_required);
        assert!(c.features.ip_whitelist_enabled);
        clear_deployment_env_vars();
    }

    #[test]
    #[serial]
    fn from_env_custom_tenant_id() {
        clear_deployment_env_vars();
        std::env::set_var("DEFAULT_TENANT_ID", "12345678-1234-1234-1234-1234567890ab");
        let c = DeploymentConfig::from_env();
        assert_eq!(
            c.default_tenant_id,
            Uuid::parse_str("12345678-1234-1234-1234-1234567890ab").unwrap()
        );
        clear_deployment_env_vars();
    }

    #[test]
    #[serial]
    fn from_env_invalid_tenant_id_falls_back() {
        clear_deployment_env_vars();
        std::env::set_var("DEFAULT_TENANT_ID", "not-a-uuid");
        let c = DeploymentConfig::from_env();
        assert_eq!(
            c.default_tenant_id,
            Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
        );
        clear_deployment_env_vars();
    }

    #[test]
    #[serial]
    fn from_env_non_true_values_treated_as_false() {
        clear_deployment_env_vars();
        std::env::set_var("MULTI_TENANT_ENABLED", "yes");
        std::env::set_var("QUOTA_ENABLED", "1");
        let c = DeploymentConfig::from_env();
        assert!(!c.multi_tenant_enabled);
        assert!(!c.features.quota_enabled);
        clear_deployment_env_vars();
    }

    #[test]
    #[serial]
    fn from_env_uppercase_saas_normalizes_to_saas_mode() {
        clear_deployment_env_vars();
        std::env::set_var("DEPLOYMENT_MODE", "SAAS");
        let c = DeploymentConfig::from_env();
        assert_eq!(c.mode, DeploymentMode::SaaS);
        clear_deployment_env_vars();
    }
}
