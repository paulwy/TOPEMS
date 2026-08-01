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
            use rand::RngCore;
            let mut bytes = [0u8; 32];
            rand::thread_rng().fill_bytes(&mut bytes);
            let generated = hex::encode(bytes);
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
        EncodingKey::from_rsa_pem(secret.as_bytes()).map_err(|e| format!("Invalid RSA key: {}", e))?
    } else {
        EncodingKey::from_secret(secret.as_ref())
    };

    encode(&header, &claims, &encoding_key).map_err(|e| format!("JWT encode error: {}", e))
}

/// 校验插件安装 JWT 令牌
pub fn verify_plugin_install_token(secret: &str, token: &str) -> Result<PluginInstallClaims, String> {
    use jsonwebtoken::{decode, Algorithm, DecodingKey, Validation};

    let is_pem = secret.contains("-----BEGIN");
    let algorithm = if is_pem { Algorithm::RS256 } else { Algorithm::HS256 };

    let decoding_key = if is_pem {
        DecodingKey::from_rsa_pem(secret.as_bytes()).map_err(|e| format!("Invalid RSA key: {}", e))?
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
    std::env::var("RUNTIME_URL")
        .unwrap_or_else(|_| format!("http://localhost:{}", default_port))
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
    let core_url = core_url
        .map(|s| s.to_string())
        .unwrap_or_else(get_core_url);

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
