//! # Plugin Registry Module
//!
//! 通用插件注册模块，抽取自 6 个服务（crm/mes/mobile/scm/hrm/erp）的重复代码。
//!
//! 提供：
//! - 通用 `PluginInfo` / `PermissionDef` 结构体
//! - `auto_register_to_core` 注册函数（消除 100% 重复的 HTTP 注册逻辑）
//! - `register_plugin_info!` 宏（供各服务快速构建 PluginInfo）

use serde::{Deserialize, Serialize};

// ============================================================================
// 通用数据结构（消除各服务 *_plugin.rs 中的重复 struct 定义）
// ============================================================================

pub fn default_auth_required() -> bool {
    true
}

/// 插件信息（通用版本，覆盖 crm/mes/scm/hrm/erp 的 95% 字段）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginInfo {
    pub code: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub runtime_url: String,
    #[serde(default = "default_auth_required")]
    pub auth_required: bool,
    #[serde(default)]
    pub permissions: Vec<PermissionDef>,
    #[serde(default)]
    pub dependencies: Vec<String>,
    #[serde(default)]
    pub navigation_config: Option<serde_json::Value>,
    #[serde(default)]
    pub category: Option<String>,
}

/// plugin.yaml 配置文件结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginManifest {
    pub code: String,
    pub name: String,
    pub version: String,
    pub description: Option<String>,
    #[serde(default = "default_auth_required")]
    pub auth_required: bool,
    #[serde(default)]
    pub category: Option<String>,
    #[serde(default, rename = "plugin_type")]
    pub plugin_type: Option<String>,
    #[serde(default)]
    pub author: Option<String>,
    #[serde(default)]
    pub dependencies: Vec<String>,
    #[serde(default)]
    pub permissions: Vec<PermissionDef>,
    #[serde(default)]
    pub runtime: Option<serde_json::Value>,
    #[serde(default)]
    pub deployment: Option<serde_json::Value>,
}

impl Default for PluginManifest {
    fn default() -> Self {
        Self {
            code: String::new(),
            name: String::new(),
            version: String::new(),
            description: None,
            auth_required: true,
            category: None,
            plugin_type: None,
            author: None,
            dependencies: Vec::new(),
            permissions: Vec::new(),
            runtime: None,
            deployment: None,
        }
    }
}

impl PluginManifest {
    /// 从 plugin.yaml 文件路径加载配置
    pub fn from_file<P: AsRef<std::path::Path>>(path: P) -> Result<Self, String> {
        let content = std::fs::read_to_string(&path).map_err(|e| {
            format!(
                "Failed to read plugin manifest at {:?}: {}",
                path.as_ref(),
                e
            )
        })?;
        serde_yaml::from_str::<Self>(&content).map_err(|e| {
            format!(
                "Failed to parse plugin manifest at {:?}: {}",
                path.as_ref(),
                e
            )
        })
    }
}

/// 插件注册令牌（JWT claims）：scope=plugin_install
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginInstallClaims {
    pub sub: String,
    pub scope: String,
    pub plugin_code: Option<String>,
    pub exp: usize,
    pub iat: usize,
    pub iss: Option<String>,
}

/// 校验生产/开发环境判断
pub fn is_production_env() -> bool {
    std::env::var("PROFILE")
        .map(|v| v == "prod" || v == "production")
        .unwrap_or(false)
        || std::env::var("RUST_ENV")
            .map(|v| v == "production")
            .unwrap_or(false)
        || std::env::var("ENV")
            .map(|v| v == "production")
            .unwrap_or(false)
        || std::env::var("PROD")
            .map(|v| v == "true" || v == "1")
            .unwrap_or(false)
}

/// 初始化并校验 PLUGIN_REGISTRATION_SECRET，返回一次性随机密钥（开发模式）或实际密钥
///
/// 生产环境为空则 panic；开发环境自动生成一次性随机值并打印
pub fn init_plugin_registration_secret() -> String {
    let is_prod = is_production_env();
    let secret = std::env::var("PLUGIN_REGISTRATION_SECRET").unwrap_or_default();

    if secret.is_empty() || secret.len() < 32 {
        if is_prod {
            panic!(
                "[Plugin Security] PLUGIN_REGISTRATION_SECRET is required in production and must be at least 32 characters. \
                 Please set a strong secret via environment variable."
            );
        } else {
            let generated = generate_random_secret();
            tracing::warn!(
                "[WARN] Plugin auth: PLUGIN_REGISTRATION_SECRET not set (or < 32 chars). \
                 Using ONE-TIME random secret for local development: {} \
                 This value changes on every restart. Set PLUGIN_REGISTRATION_SECRET explicitly for stable tokens.",
                generated
            );
            return generated;
        }
    }
    secret
}

/// 生成 32 字节随机密钥的十六进制字符串（64 字符）
#[cfg(feature = "grpc")]
fn generate_random_secret() -> String {
    use rand::RngCore;
    let mut bytes = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut bytes);
    hex::encode(bytes)
}

/// 生成 32 字节随机密钥的十六进制字符串（64 字符）
///
/// 非 grpc feature 下的回退实现：使用 uuid v4 作为随机源
#[cfg(not(feature = "grpc"))]
fn generate_random_secret() -> String {
    let mut bytes = [0u8; 32];
    let uuid1 = uuid::Uuid::new_v4();
    let uuid2 = uuid::Uuid::new_v4();
    bytes[..16].copy_from_slice(uuid1.as_bytes());
    bytes[16..].copy_from_slice(uuid2.as_bytes());
    hex::encode(bytes)
}

/// 检查开发模式豁免：TOPEMS_PLUGIN_AUTH_BYPASS=true
///
/// - 仅在 debug_assertions（非 release）+ 非生产环境时允许
/// - 若生产环境设置 bypass，直接 panic
pub fn check_plugin_auth_bypass() -> bool {
    let bypass_requested = std::env::var("TOPEMS_PLUGIN_AUTH_BYPASS")
        .map(|v| v == "true" || v == "1")
        .unwrap_or(false);

    if !bypass_requested {
        return false;
    }

    let is_prod = is_production_env();
    let is_release = !cfg!(debug_assertions);

    if is_prod || is_release {
        panic!(
            "[Plugin Security] TOPEMS_PLUGIN_AUTH_BYPASS=true is FORBIDDEN in production/release builds. \
             Please remove this environment variable and configure PLUGIN_REGISTRATION_SECRET properly."
        );
    }

    tracing::warn!(
        "[WARN] Plugin auth bypass is ENABLED (dev-only). All plugin registrations will be accepted without token. \
         This is INSECURE and must NEVER be used in production."
    );
    true
}

/// 生成插件安装 JWT 令牌（scope=plugin_install）
pub fn generate_plugin_install_token(
    secret: &str,
    plugin_code: Option<&str>,
    expire_minutes: i64,
) -> Result<String, String> {
    use chrono::Utc;
    use jsonwebtoken::{encode, Algorithm, EncodingKey, Header};

    let now = Utc::now();
    let exp = (now + chrono::Duration::minutes(expire_minutes)).timestamp() as usize;
    let iat = now.timestamp() as usize;

    let claims = PluginInstallClaims {
        sub: "plugin-registrar".to_string(),
        scope: "plugin_install".to_string(),
        plugin_code: plugin_code.map(|s| s.to_string()),
        exp,
        iat,
        iss: Some("topems-core".to_string()),
    };

    let is_pem = secret.contains("-----BEGIN");
    let header = if is_pem {
        Header::new(Algorithm::RS256)
    } else {
        Header::new(Algorithm::HS256)
    };

    let encoding_key = if is_pem {
        EncodingKey::from_rsa_pem(secret.as_bytes())
            .map_err(|e| format!("Invalid RSA key: {}", e))?
    } else {
        EncodingKey::from_secret(secret.as_ref())
    };

    encode(&header, &claims, &encoding_key).map_err(|e| format!("JWT encode error: {}", e))
}

/// 校验插件安装 JWT 令牌
pub fn verify_plugin_install_token(
    secret: &str,
    token: &str,
) -> Result<PluginInstallClaims, String> {
    use jsonwebtoken::{decode, Algorithm, DecodingKey, Validation};

    let is_pem = secret.contains("-----BEGIN");
    let algorithm = if is_pem {
        Algorithm::RS256
    } else {
        Algorithm::HS256
    };

    let decoding_key = if is_pem {
        DecodingKey::from_rsa_pem(secret.as_bytes())
            .map_err(|e| format!("Invalid RSA key: {}", e))?
    } else {
        DecodingKey::from_secret(secret.as_ref())
    };

    let mut validation = Validation::new(algorithm);
    validation.leeway = 60;
    validation.validate_exp = true;

    let token_data = decode::<PluginInstallClaims>(token, &decoding_key, &validation)
        .map_err(|e| format!("Plugin token JWT verify failed: {}", e))?;

    let claims = &token_data.claims;
    if claims.scope != "plugin_install" {
        return Err(format!(
            "Plugin token invalid scope: expected 'plugin_install', got '{}'",
            claims.scope
        ));
    }

    Ok(token_data.claims)
}

/// 权限定义（所有服务 100% 字段一致）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionDef {
    pub code: String,
    pub name: String,
    pub resource_type: String,
    pub action: String,
}

// ============================================================================
// 通用辅助函数
// ============================================================================

/// 从环境变量读取 `RUNTIME_URL`，带默认端口
pub fn get_runtime_url(default_port: &str) -> String {
    std::env::var("RUNTIME_URL").unwrap_or_else(|_| format!("http://localhost:{}", default_port))
}

/// 从环境变量读取统一核心 URL
pub fn get_core_url() -> String {
    std::env::var("CORE_URL").unwrap_or_else(|_| "http://localhost:8000".to_string())
}

// ============================================================================
// 核心：通用 auto_register_to_core（消除 6 份服务中 100% 重复的注册逻辑）
// ============================================================================

pub async fn auto_register_to_core<F>(core_url: Option<&str>, log_label: &str, info_builder: F)
where
    F: FnOnce(String) -> PluginInfo,
{
    let core_url = core_url.map(|s| s.to_string()).unwrap_or_else(get_core_url);

    let runtime_url =
        std::env::var("RUNTIME_URL").unwrap_or_else(|_| "http://localhost:8000".to_string());

    let info = info_builder(runtime_url);
    let plugin_code = info.code.clone();

    if info.auth_required {
        tracing::info!(
            "[{} Plugin] auth_required=true: registration requires valid X-Plugin-Token",
            log_label
        );
    } else {
        tracing::warn!(
            "[{} Plugin] auth_required=false (explicitly set). This is INSECURE for production.",
            log_label
        );
    }

    let client = reqwest::Client::new();
    let url = format!(
        "{}/api/core/plugin/dev/plugins/{}/register",
        core_url, plugin_code
    );

    let plugin_code_clone = plugin_code.clone();
    let token = if let Ok(env_jwt) = std::env::var("PLUGIN_REGISTRATION_JWT") {
        env_jwt
    } else if let Ok(secret) = std::env::var("PLUGIN_REGISTRATION_SECRET") {
        if !secret.is_empty() && secret.len() >= 32 {
            match generate_plugin_install_token(&secret, Some(&plugin_code_clone), 60 * 24) {
                Ok(jwt) => jwt,
                Err(e) => {
                    tracing::warn!(
                        "[{} Plugin] Failed to generate JWT from PLUGIN_REGISTRATION_SECRET: {}",
                        log_label,
                        e
                    );
                    String::new()
                }
            }
        } else {
            std::env::var("PLUGIN_REGISTRATION_TOKEN").unwrap_or_default()
        }
    } else {
        std::env::var("PLUGIN_REGISTRATION_TOKEN").unwrap_or_default()
    };

    let mut request = client.post(&url).json(&info);
    if !token.is_empty() {
        request = request.header("X-Plugin-Token", &token);
    }

    use opentelemetry::global;
    use opentelemetry::propagation::Injector;
    use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
    struct HeaderMapInjector<'a>(&'a mut HeaderMap);
    impl<'a> Injector for HeaderMapInjector<'a> {
        fn set(&mut self, key: &str, value: String) {
            if let (Ok(name), Ok(val)) = (HeaderName::try_from(key), HeaderValue::try_from(value)) {
                self.0.insert(name, val);
            }
        }
    }
    let mut trace_headers = HeaderMap::new();
    global::get_text_map_propagator(|propagator| {
        propagator.inject_context(
            &opentelemetry::Context::current(),
            &mut HeaderMapInjector(&mut trace_headers),
        );
    });
    for (k, v) in trace_headers.iter() {
        request = request.header(k.clone(), v);
    }
    if let Some(tid) = crate::logging::get_current_trace_id() {
        request = request.header("x-trace-id", &tid);
    }
    if let Some(rid) = crate::logging::get_current_request_id() {
        request = request.header("x-request-id", &rid);
    }

    match request.send().await {
        Ok(response) => {
            if response.status().is_success() {
                tracing::info!(
                    "[{} Plugin] Successfully registered to core at {}",
                    log_label,
                    core_url
                );
            } else {
                let status = response.status();
                let body = response.text().await.unwrap_or_default();
                tracing::warn!(
                    "[{} Plugin] Failed to register to core: {} - {}",
                    log_label,
                    status,
                    body
                );
            }
        }
        Err(e) => {
            tracing::warn!(
                "[{} Plugin] Failed to connect to core at {}: {}",
                log_label,
                core_url,
                e
            );
        }
    }
}

// ============================================================================
// Macro: register_plugin_info!
// 各服务快速构建 PluginInfo 的声明宏
// ============================================================================

#[macro_export]
macro_rules! register_plugin_info {
    (
        code = $code:expr,
        name = $name:expr,
        description = $description:expr,
        default_port = $default_port:expr,
        category = $category:expr,
        permissions = $permissions:expr,
        navigation = $navigation:expr $(,)?
    ) => {{
        use $crate::plugin::{get_runtime_url, PermissionDef, PluginInfo};

        let runtime_url = get_runtime_url($default_port);

        PluginInfo {
            code: $code.to_string(),
            name: $name.to_string(),
            version: env!("CARGO_PKG_VERSION").to_string(),
            description: $description.to_string(),
            runtime_url: runtime_url.clone(),
            auth_required: true,
            permissions: $permissions,
            dependencies: vec![],
            navigation_config: Some($navigation),
            category: Some($category.to_string()),
        }
    }};
}

#[cfg(test)]
mod tests {
    use super::*;

    // ========== default_auth_required ==========

    #[test]
    fn default_auth_required_returns_true() {
        assert!(default_auth_required());
    }

    // ========== PluginInfo serde ==========

    #[test]
    fn plugin_info_serde_roundtrip_full() {
        let info = PluginInfo {
            code: "test-plugin".to_string(),
            name: "测试插件".to_string(),
            version: "1.0.0".to_string(),
            description: "a test plugin".to_string(),
            runtime_url: "http://localhost:8000".to_string(),
            auth_required: true,
            permissions: vec![PermissionDef {
                code: "read".to_string(),
                name: "读取".to_string(),
                resource_type: "data".to_string(),
                action: "read".to_string(),
            }],
            dependencies: vec!["unified-core".to_string()],
            navigation_config: Some(serde_json::json!({"key": "value"})),
            category: Some("erp".to_string()),
        };
        let json = serde_json::to_string(&info).unwrap();
        let back: PluginInfo = serde_json::from_str(&json).unwrap();
        assert_eq!(back.code, "test-plugin");
        assert_eq!(back.name, "测试插件");
        assert_eq!(back.version, "1.0.0");
        assert!(back.auth_required);
        assert_eq!(back.permissions.len(), 1);
        assert_eq!(back.dependencies.len(), 1);
        assert!(back.navigation_config.is_some());
        assert_eq!(back.category.as_deref(), Some("erp"));
    }

    #[test]
    fn plugin_info_serde_default_auth_required_when_omitted() {
        // 当 JSON 中省略 auth_required 字段时，应使用 default_auth_required() = true
        let json = r#"{
            "code": "p",
            "name": "n",
            "version": "1",
            "description": "d",
            "runtime_url": "http://x"
        }"#;
        let info: PluginInfo = serde_json::from_str(json).unwrap();
        assert!(info.auth_required, "省略 auth_required 应默认为 true");
        assert!(info.permissions.is_empty());
        assert!(info.dependencies.is_empty());
        assert!(info.navigation_config.is_none());
        assert!(info.category.is_none());
    }

    #[test]
    fn plugin_info_serde_auth_required_false() {
        let json = r#"{
            "code": "p",
            "name": "n",
            "version": "1",
            "description": "d",
            "runtime_url": "http://x",
            "auth_required": false
        }"#;
        let info: PluginInfo = serde_json::from_str(json).unwrap();
        assert!(!info.auth_required);
    }

    #[test]
    fn plugin_info_clone_preserves_all_fields() {
        let info = PluginInfo {
            code: "c".to_string(),
            name: "n".to_string(),
            version: "v".to_string(),
            description: "d".to_string(),
            runtime_url: "u".to_string(),
            auth_required: false,
            permissions: vec![],
            dependencies: vec!["dep".to_string()],
            navigation_config: None,
            category: Some("cat".to_string()),
        };
        let cloned = info.clone();
        assert_eq!(cloned.code, info.code);
        assert_eq!(cloned.auth_required, info.auth_required);
        assert_eq!(cloned.dependencies, info.dependencies);
        assert_eq!(cloned.category, info.category);
    }

    // ========== PermissionDef ==========

    #[test]
    fn permission_def_serde_roundtrip() {
        let perm = PermissionDef {
            code: "user:read".to_string(),
            name: "读取用户".to_string(),
            resource_type: "user".to_string(),
            action: "read".to_string(),
        };
        let json = serde_json::to_string(&perm).unwrap();
        let back: PermissionDef = serde_json::from_str(&json).unwrap();
        assert_eq!(back.code, "user:read");
        assert_eq!(back.name, "读取用户");
        assert_eq!(back.resource_type, "user");
        assert_eq!(back.action, "read");
    }

    #[test]
    fn permission_def_clone_preserves_fields() {
        let perm = PermissionDef {
            code: "c".to_string(),
            name: "n".to_string(),
            resource_type: "r".to_string(),
            action: "a".to_string(),
        };
        let cloned = perm.clone();
        assert_eq!(cloned.code, perm.code);
        assert_eq!(cloned.action, perm.action);
    }

    // ========== PluginManifest ==========

    #[test]
    fn plugin_manifest_default_values() {
        let m = PluginManifest::default();
        assert!(m.code.is_empty());
        assert!(m.name.is_empty());
        assert!(m.version.is_empty());
        assert!(m.description.is_none());
        assert!(m.auth_required, "默认 auth_required 应为 true");
        assert!(m.category.is_none());
        assert!(m.plugin_type.is_none());
        assert!(m.author.is_none());
        assert!(m.dependencies.is_empty());
        assert!(m.permissions.is_empty());
        assert!(m.runtime.is_none());
        assert!(m.deployment.is_none());
    }

    #[test]
    fn plugin_manifest_serde_roundtrip() {
        let yaml = r#"
code: my-plugin
name: 我的插件
version: 2.0.0
description: 一个插件
auth_required: false
category: core
plugin_type: backend
author: topems
dependencies:
  - unified-core
permissions:
  - code: read
    name: 读取
    resource_type: data
    action: read
"#;
        let manifest: PluginManifest = serde_yaml::from_str(yaml).unwrap();
        assert_eq!(manifest.code, "my-plugin");
        assert_eq!(manifest.name, "我的插件");
        assert_eq!(manifest.version, "2.0.0");
        assert!(!manifest.auth_required);
        assert_eq!(manifest.category.as_deref(), Some("core"));
        assert_eq!(manifest.plugin_type.as_deref(), Some("backend"));
        assert_eq!(manifest.author.as_deref(), Some("topems"));
        assert_eq!(manifest.dependencies.len(), 1);
        assert_eq!(manifest.permissions.len(), 1);
    }

    #[test]
    fn plugin_manifest_serde_minimal_uses_defaults() {
        let yaml = r#"
code: minimal
name: 最小
version: "1.0"
"#;
        let manifest: PluginManifest = serde_yaml::from_str(yaml).unwrap();
        assert_eq!(manifest.code, "minimal");
        assert!(manifest.auth_required, "省略 auth_required 应默认 true");
        assert!(manifest.dependencies.is_empty());
        assert!(manifest.permissions.is_empty());
    }

    #[test]
    fn plugin_manifest_from_file_nonexistent_returns_err() {
        let result = PluginManifest::from_file("/nonexistent/path/plugin.yaml");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Failed to read"));
    }

    #[test]
    fn plugin_manifest_from_file_invalid_yaml_returns_err() {
        // 创建一个临时文件包含无效 YAML
        let temp_dir = std::env::temp_dir();
        let path = temp_dir.join("topems_test_invalid_plugin.yaml");
        std::fs::write(&path, "code: [unclosed").unwrap();
        let result = PluginManifest::from_file(&path);
        assert!(result.is_err());
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn plugin_manifest_from_file_valid_yaml_returns_ok() {
        let temp_dir = std::env::temp_dir();
        let path = temp_dir.join("topems_test_valid_plugin.yaml");
        std::fs::write(&path, "code: x\nname: y\nversion: \"1\"\n").unwrap();
        let result = PluginManifest::from_file(&path);
        assert!(result.is_ok());
        let manifest = result.unwrap();
        assert_eq!(manifest.code, "x");
        let _ = std::fs::remove_file(&path);
    }

    // ========== PluginInstallClaims ==========

    #[test]
    fn plugin_install_claims_serde_roundtrip() {
        let claims = PluginInstallClaims {
            sub: "registrar".to_string(),
            scope: "plugin_install".to_string(),
            plugin_code: Some("my-plugin".to_string()),
            exp: 1700000000,
            iat: 1699900000,
            iss: Some("topems-core".to_string()),
        };
        let json = serde_json::to_string(&claims).unwrap();
        let back: PluginInstallClaims = serde_json::from_str(&json).unwrap();
        assert_eq!(back.sub, "registrar");
        assert_eq!(back.scope, "plugin_install");
        assert_eq!(back.plugin_code.as_deref(), Some("my-plugin"));
        assert_eq!(back.exp, 1700000000);
        assert_eq!(back.iat, 1699900000);
        assert_eq!(back.iss.as_deref(), Some("topems-core"));
    }

    #[test]
    fn plugin_install_claims_serde_without_optional_fields() {
        let json = r#"{
            "sub": "u",
            "scope": "plugin_install",
            "exp": 100,
            "iat": 50
        }"#;
        let claims: PluginInstallClaims = serde_json::from_str(json).unwrap();
        assert_eq!(claims.sub, "u");
        assert!(claims.plugin_code.is_none());
        assert!(claims.iss.is_none());
    }

    #[test]
    fn plugin_install_claims_clone_preserves_fields() {
        let claims = PluginInstallClaims {
            sub: "s".to_string(),
            scope: "plugin_install".to_string(),
            plugin_code: None,
            exp: 1,
            iat: 0,
            iss: None,
        };
        let cloned = claims.clone();
        assert_eq!(cloned.sub, claims.sub);
        assert_eq!(cloned.exp, claims.exp);
    }

    // ========== is_production_env ==========

    #[test]
    fn is_production_env_default_false() {
        // 清除所有可能影响的环境变量
        std::env::remove_var("PROFILE");
        std::env::remove_var("RUST_ENV");
        std::env::remove_var("ENV");
        std::env::remove_var("PROD");
        assert!(!is_production_env());
    }

    #[test]
    fn is_production_env_profile_prod() {
        std::env::set_var("PROFILE", "prod");
        assert!(is_production_env());
        std::env::remove_var("PROFILE");
    }

    #[test]
    fn is_production_env_profile_production() {
        std::env::set_var("PROFILE", "production");
        assert!(is_production_env());
        std::env::remove_var("PROFILE");
    }

    #[test]
    fn is_production_env_rust_env_production() {
        std::env::set_var("RUST_ENV", "production");
        assert!(is_production_env());
        std::env::remove_var("RUST_ENV");
    }

    #[test]
    fn is_production_env_env_production() {
        std::env::set_var("ENV", "production");
        assert!(is_production_env());
        std::env::remove_var("ENV");
    }

    #[test]
    fn is_production_env_prod_true() {
        std::env::set_var("PROD", "true");
        assert!(is_production_env());
        std::env::remove_var("PROD");
    }

    #[test]
    fn is_production_env_prod_one() {
        std::env::set_var("PROD", "1");
        assert!(is_production_env());
        std::env::remove_var("PROD");
    }

    #[test]
    fn is_production_env_profile_other_is_false() {
        std::env::set_var("PROFILE", "dev");
        assert!(!is_production_env());
        std::env::remove_var("PROFILE");
    }

    // ========== check_plugin_auth_bypass ==========

    #[test]
    fn check_plugin_auth_bypass_default_false() {
        std::env::remove_var("TOPEMS_PLUGIN_AUTH_BYPASS");
        assert!(!check_plugin_auth_bypass());
    }

    #[test]
    fn check_plugin_auth_bypass_explicit_false() {
        std::env::set_var("TOPEMS_PLUGIN_AUTH_BYPASS", "false");
        assert!(!check_plugin_auth_bypass());
        std::env::remove_var("TOPEMS_PLUGIN_AUTH_BYPASS");
    }

    #[test]
    fn check_plugin_auth_bypass_zero_is_false() {
        std::env::set_var("TOPEMS_PLUGIN_AUTH_BYPASS", "0");
        assert!(!check_plugin_auth_bypass());
        std::env::remove_var("TOPEMS_PLUGIN_AUTH_BYPASS");
    }

    // ========== generate_plugin_install_token + verify_plugin_install_token ==========

    #[test]
    fn generate_and_verify_plugin_install_token_roundtrip() {
        let secret = "this-is-a-very-secure-secret-key-for-testing-32+";
        let token =
            generate_plugin_install_token(secret, Some("my-plugin"), 60).expect("生成 token");
        assert!(!token.is_empty());

        let claims = verify_plugin_install_token(secret, &token).expect("验证 token");
        assert_eq!(claims.scope, "plugin_install");
        assert_eq!(claims.sub, "plugin-registrar");
        assert_eq!(claims.plugin_code.as_deref(), Some("my-plugin"));
        assert_eq!(claims.iss.as_deref(), Some("topems-core"));
    }

    #[test]
    fn generate_plugin_install_token_without_plugin_code() {
        let secret = "another-secure-secret-key-for-testing-32-chars";
        let token = generate_plugin_install_token(secret, None, 60).expect("生成 token");
        let claims = verify_plugin_install_token(secret, &token).expect("验证 token");
        assert!(claims.plugin_code.is_none());
    }

    #[test]
    fn verify_plugin_install_token_wrong_secret_returns_err() {
        let secret1 = "first-very-secure-secret-key-for-testing-32+";
        let secret2 = "second-very-secure-secret-key-for-testing-32";
        let token = generate_plugin_install_token(secret1, Some("p"), 60).unwrap();
        let result = verify_plugin_install_token(secret2, &token);
        assert!(result.is_err());
    }

    #[test]
    fn verify_plugin_install_token_invalid_token_returns_err() {
        let secret = "very-secure-secret-key-for-testing-32-chars!!";
        let result = verify_plugin_install_token(secret, "not.a.valid.jwt");
        assert!(result.is_err());
    }

    #[test]
    fn verify_plugin_install_token_expired_returns_err() {
        let secret = "very-secure-secret-key-for-testing-32-chars!!";
        // 过期时间设为 -60 分钟（已过期）
        let token = generate_plugin_install_token(secret, Some("p"), -60).unwrap();
        // leeway 60 秒，所以 -60 分钟肯定过期
        let result = verify_plugin_install_token(secret, &token);
        assert!(result.is_err());
    }

    // ========== get_runtime_url / get_core_url ==========

    #[test]
    fn get_runtime_url_default() {
        std::env::remove_var("RUNTIME_URL");
        let url = get_runtime_url("8080");
        assert_eq!(url, "http://localhost:8080");
    }

    #[test]
    fn get_runtime_url_env_override() {
        std::env::set_var("RUNTIME_URL", "http://example.com:9000");
        let url = get_runtime_url("8080");
        assert_eq!(url, "http://example.com:9000");
        std::env::remove_var("RUNTIME_URL");
    }

    #[test]
    fn get_core_url_default() {
        std::env::remove_var("CORE_URL");
        let url = get_core_url();
        assert_eq!(url, "http://localhost:8000");
    }

    #[test]
    fn get_core_url_env_override() {
        std::env::set_var("CORE_URL", "http://core.example.com:8000");
        let url = get_core_url();
        assert_eq!(url, "http://core.example.com:8000");
        std::env::remove_var("CORE_URL");
    }

    // ========== init_plugin_registration_secret ==========

    #[test]
    fn init_plugin_registration_secret_returns_set_secret() {
        std::env::set_var(
            "PLUGIN_REGISTRATION_SECRET",
            "a-very-long-and-secure-secret-32-chars-min",
        );
        let secret = init_plugin_registration_secret();
        assert_eq!(secret, "a-very-long-and-secure-secret-32-chars-min");
        std::env::remove_var("PLUGIN_REGISTRATION_SECRET");
    }

    #[test]
    fn init_plugin_registration_secret_generates_when_empty() {
        std::env::remove_var("PLUGIN_REGISTRATION_SECRET");
        std::env::remove_var("PROFILE");
        std::env::remove_var("RUST_ENV");
        std::env::remove_var("ENV");
        std::env::remove_var("PROD");
        let secret = init_plugin_registration_secret();
        // 开发模式下生成 64 字符的十六进制字符串（32 字节 = 64 hex chars）
        assert_eq!(secret.len(), 64, "生成 32 字节的十六进制 = 64 字符");
        assert!(secret.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn init_plugin_registration_secret_generates_when_too_short() {
        std::env::set_var("PLUGIN_REGISTRATION_SECRET", "short");
        std::env::remove_var("PROFILE");
        std::env::remove_var("RUST_ENV");
        std::env::remove_var("ENV");
        std::env::remove_var("PROD");
        let secret = init_plugin_registration_secret();
        assert_eq!(secret.len(), 64, "太短的 secret 应被替换为生成的 64 字符");
        std::env::remove_var("PLUGIN_REGISTRATION_SECRET");
    }

    // ========== auto_register_to_core (error path - unreachable URL) ==========

    #[tokio::test]
    async fn auto_register_to_core_unreachable_url_does_not_panic() {
        // 指向不可达的 URL，函数应捕获错误而不 panic
        std::env::remove_var("PLUGIN_REGISTRATION_JWT");
        std::env::remove_var("PLUGIN_REGISTRATION_SECRET");
        std::env::remove_var("PLUGIN_REGISTRATION_TOKEN");
        auto_register_to_core(Some("http://127.0.0.1:1"), "TestPlugin", |runtime_url| {
            PluginInfo {
                code: "test-plugin".to_string(),
                name: "Test Plugin".to_string(),
                version: "1.0.0".to_string(),
                description: "test".to_string(),
                runtime_url,
                auth_required: false,
                permissions: vec![],
                dependencies: vec![],
                navigation_config: None,
                category: Some("test".to_string()),
            }
        })
        .await;
        // 如果函数没有 panic，测试通过
    }

    #[tokio::test]
    async fn auto_register_to_core_with_env_jwt_does_not_panic() {
        std::env::set_var("PLUGIN_REGISTRATION_JWT", "fake.jwt.token");
        std::env::set_var("CORE_URL", "http://127.0.0.1:1");
        auto_register_to_core(
            None, // 使用 CORE_URL 环境变量
            "TestPlugin2",
            |runtime_url| PluginInfo {
                code: "test-plugin-2".to_string(),
                name: "Test Plugin 2".to_string(),
                version: "1.0.0".to_string(),
                description: "test 2".to_string(),
                runtime_url,
                auth_required: true,
                permissions: vec![PermissionDef {
                    code: "read".to_string(),
                    name: "读取".to_string(),
                    resource_type: "data".to_string(),
                    action: "read".to_string(),
                }],
                dependencies: vec![],
                navigation_config: None,
                category: None,
            },
        )
        .await;
        std::env::remove_var("PLUGIN_REGISTRATION_JWT");
        std::env::remove_var("CORE_URL");
    }
}
