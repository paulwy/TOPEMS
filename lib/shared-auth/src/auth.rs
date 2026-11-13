use axum::{
    body::Body,
    extract::State,
    http::{header, Request},
    middleware::Next,
    response::{IntoResponse, Response},
};
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use prometheus::{register_int_counter_vec, IntCounterVec};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use std::sync::{Arc, OnceLock};
use uuid::Uuid;

use topems_shared_core::{
    error::TopemsError,
    response::{api_error, ApiResponse},
};

use crate::middleware::service_identity::ServiceIdentity;
use crate::middleware::tenant::{rls_request_tenant, scope_request_path, scope_request_tenant};
use crate::security::audit_logger::{
    apply_claims_to_audit_context, audit_context_from_claims, current_audit_context,
    scope_audit_context, AuditContextSlot,
};
use crate::service::{is_service_claims, record_service_call, record_system_channel};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub username: String,
    pub role: String,
    pub roles: Vec<String>,
    /// 权限码集合。用户 access token 采用紧凑编码时不再写入该字段
    /// （由 auth_middleware 按 user_id 从服务端缓存解析后回填），
    /// 因此反序列化必须允许缺省，保证紧凑 token 可正常校验。
    #[serde(default)]
    pub permissions: Vec<String>,
    pub is_superuser: bool,
    pub exp: usize,
    pub iat: usize,
    pub email: Option<String>,
    pub department: Option<String>,
    pub tenant_id: Option<String>,
    pub department_id: Option<String>,
    pub position_id: Option<String>,
    pub position_code: Option<String>,
    /// P1-4：未改密旗标（新播种 admin 首登须改密）。签发时由用户 must_change_password
    /// 带出；auth_middleware 对 true 且非白名单路径（改密/登出）返回 403。
    /// #[serde(default)] 保证旧 token（无该声明）反序列化不失败。
    #[serde(default)]
    pub must_change_password: bool,
}

impl Claims {
    pub fn user_id(&self) -> Result<Uuid, TopemsError> {
        Uuid::parse_str(&self.sub)
            .map_err(|_| TopemsError::Auth("Invalid user ID in token".to_string()))
    }

    pub fn has_permission(&self, permission: &str) -> bool {
        self.is_superuser || self.permissions.contains(&permission.to_string())
    }

    pub fn has_role(&self, role: &str) -> bool {
        self.is_superuser || self.roles.contains(&role.to_string())
    }

    pub fn has_any_permission(&self, permissions: &[&str]) -> bool {
        if self.is_superuser {
            return true;
        }
        permissions
            .iter()
            .any(|p| self.permissions.contains(&p.to_string()))
    }

    /// 模块级权限判定：拥有该模块任一权限码（`<module>:` 前缀）即视为可用。
    /// 兼容 `all`/`*` 通配与超管短路。用于历史 `<module>:admin` 全局伞码的过渡放行，
    /// 后续逐端点细粒度化后可移除。
    pub fn has_module_permission(&self, module: &str) -> bool {
        if self.is_superuser {
            return true;
        }
        let prefix = format!("{}:", module);
        self.permissions
            .iter()
            .any(|p| p == "all" || p == "*" || p.starts_with(&prefix))
    }

    pub fn has_all_permissions(&self, permissions: &[&str]) -> bool {
        if self.is_superuser {
            return true;
        }
        permissions
            .iter()
            .all(|p| self.permissions.contains(&p.to_string()))
    }

    pub fn encode(&self, secret: &str) -> Result<String, TopemsError> {
        self.encode_value(self, secret)
    }

    /// 紧凑编码：仅承载身份、角色与权限版本哈希，不写入逐条权限码。
    ///
    /// 权限在服务端由 `auth_middleware` 按 `sub` 从规范化授权表解析并缓存，
    /// 避免权限较多的角色把 JWT 撑到数十 KB（经 nginx 时触发请求头 400）。
    pub fn encode_compact(&self, secret: &str) -> Result<String, TopemsError> {
        #[derive(Serialize)]
        struct CompactClaims<'a> {
            sub: &'a str,
            username: &'a str,
            role: &'a str,
            roles: &'a [String],
            is_superuser: bool,
            exp: usize,
            iat: usize,
            email: &'a Option<String>,
            department: &'a Option<String>,
            tenant_id: &'a Option<String>,
            department_id: &'a Option<String>,
            position_id: &'a Option<String>,
            position_code: &'a Option<String>,
            must_change_password: bool,
            /// 权限版本：角色 + 权限码集合的稳定短哈希，用于观测与缓存一致性判定。
            pv: String,
        }

        let compact = CompactClaims {
            sub: &self.sub,
            username: &self.username,
            role: &self.role,
            roles: &self.roles,
            is_superuser: self.is_superuser,
            exp: self.exp,
            iat: self.iat,
            email: &self.email,
            department: &self.department,
            tenant_id: &self.tenant_id,
            department_id: &self.department_id,
            position_id: &self.position_id,
            position_code: &self.position_code,
            must_change_password: self.must_change_password,
            pv: permission_version(&self.roles, &self.permissions),
        };
        self.encode_value(&compact, secret)
    }

    fn encode_value<T: Serialize>(&self, value: &T, secret: &str) -> Result<String, TopemsError> {
        if secret.contains("-----BEGIN") {
            let encoding_key = EncodingKey::from_rsa_pem(secret.as_bytes())
                .map_err(|e| TopemsError::Auth(format!("RSA 私钥解析失败: {}", e)))?;
            encode(&Header::new(Algorithm::RS256), value, &encoding_key)
                .map_err(|e| TopemsError::Auth(format!("Failed to encode token: {}", e)))
        } else {
            encode(
                &Header::new(Algorithm::HS256),
                value,
                &EncodingKey::from_secret(secret.as_ref()),
            )
            .map_err(|e| TopemsError::Auth(format!("Failed to encode token: {}", e)))
        }
    }
}

/// 权限解析结果计数（`outcome` 维度）——Prometheus 指标。
///
/// - `resolved`：按 user_id 从授权表解析成功；
/// - `version_mismatch`：token 内 `pv` 与服务端解析出的当前权限版本不一致；
/// - `error`：解析失败（DB 不可用等），请求按 fail-closed 拒绝；
/// - `invalid_user_id`：token `sub` 非法，请求按 fail-closed 拒绝。
static PERMISSION_RESOLUTION: OnceLock<IntCounterVec> = OnceLock::new();

#[allow(clippy::expect_used)]
fn permission_resolution_metric() -> &'static IntCounterVec {
    PERMISSION_RESOLUTION.get_or_init(|| {
        register_int_counter_vec!(
            "topems_auth_permission_resolution_total",
            "Permission resolution outcomes in auth middleware (outcome=resolved|version_mismatch|error|invalid_user_id)",
            &["outcome"]
        )
        .expect("failed to register topems_auth_permission_resolution_total")
    })
}

fn record_permission_outcome(outcome: &str) {
    permission_resolution_metric()
        .with_label_values(&[outcome])
        .inc();
}

/// 系统租户 ID（nil UUID）。RLS 策略把该值视为系统通道，可见全部租户行；
/// 权限解析等系统级读取通过事务级 `SET LOCAL app.tenant_id` 使用它。
pub const SYSTEM_TENANT_ID: &str = "00000000-0000-0000-0000-000000000000";

/// 从已验签的 token 中提取 `pv`（权限版本哈希）声明。
///
/// 紧凑 token 由 `encode_compact` 写入 `pv`；旧 token / 服务 token 无该声明。
/// 调用前 token 必须已通过 `verify_jwt_token` 验签，此处仅解析 payload，不再重复验签。
pub fn token_permission_version(token: &str) -> Option<String> {
    use base64::Engine;
    let payload = token.split('.').nth(1)?;
    let bytes = base64::engine::general_purpose::URL_SAFE_NO_PAD
        .decode(payload)
        .ok()?;
    let value: serde_json::Value = serde_json::from_slice(&bytes).ok()?;
    value.get("pv").and_then(|v| v.as_str()).map(str::to_string)
}

/// 权限版本哈希：对角色与权限码排序后取 SHA-256 前 16 个十六进制字符。
///
/// 写入紧凑 token 的 `pv`，并由中间件与服务端重新解析出的当前版本比对，用于
/// 观测 token 与当前授权是否漂移；**不参与鉴权判定**（鉴权以服务端解析结果为准）。
pub fn permission_version(roles: &[String], permissions: &[String]) -> String {
    let mut roles = roles.to_vec();
    roles.sort();
    let mut permissions = permissions.to_vec();
    permissions.sort();

    // 复用 HMAC-SHA256（固定非密级盐）生成稳定哈希，取前 16 个十六进制字符。
    let material = format!(
        "{}\u{1e}{}",
        roles.join("\u{1f}"),
        permissions.join("\u{1f}")
    );
    sign_message(&material, "topems-permission-version")
        .chars()
        .take(16)
        .collect()
}

#[derive(Debug, Clone)]
pub struct AuthState {
    pub jwt_secret: String,
    pub refresh_secret: String,
    pub token_expiry_hours: i64,
    /// 服务端权限解析器。未注入时（单测/未接库的服务）退化为使用 token 内权限码，
    /// 保证既有行为不变；生产路径由 shared-bootstrap / portal 注入连接池。
    permission_resolver: Option<Arc<PermissionResolver>>,
}

impl AuthState {
    /// 默认 JWT/Refresh 密钥（仅开发环境回退使用；生产环境一律拒绝）。
    const DEFAULT_JWT_SECRET: &'static str =
        "topems-jwt-secret-key-must-be-at-least-32-characters-long-for-hs256";
    const DEFAULT_REFRESH_SECRET: &'static str =
        "topems-refresh-secret-key-must-be-at-least-32-characters-for-hs256";

    pub fn new(jwt_secret: String, refresh_secret: String, token_expiry_hours: i64) -> Self {
        // 安全不变量：32 字符最小长度 + 默认密钥在任何环境下一律拒绝。
        // 外部不应再自行构造弱 AuthState，所有生产路径通过 `from_env` 走严格校验。
        Self::validate_secrets(&jwt_secret, &refresh_secret, /*strict=*/ true);
        Self {
            jwt_secret,
            refresh_secret,
            token_expiry_hours,
            permission_resolver: None,
        }
    }

    /// 注入服务端权限解析器：用户 token 校验后按 user_id 解析角色与权限码。
    pub fn with_permission_resolver(mut self, pool: sqlx::PgPool) -> Self {
        self.permission_resolver = Some(Arc::new(PermissionResolver::new(pool)));
        self
    }

    /// 覆盖权限缓存 TTL（默认 `PERMISSION_CACHE_TTL_SECS` 或 60 秒）。
    pub fn with_permission_cache_ttl(mut self, ttl: std::time::Duration) -> Self {
        if let Some(resolver) = self.permission_resolver.as_mut() {
            *resolver = Arc::new(PermissionResolver::with_ttl(resolver.pool.clone(), ttl));
        }
        self
    }

    /// 校验密钥强度；strict 模式下（生产 / 外部显式构造）不满足条件将 panic。
    fn validate_secrets(jwt_secret: &str, refresh_secret: &str, strict: bool) {
        if jwt_secret.len() < 32 {
            let msg = "JWT_SECRET must be at least 32 characters long for security";
            if strict {
                panic!("{msg}");
            } else {
                tracing::error!("{msg}");
            }
        }
        if refresh_secret.len() < 32 {
            let msg =
                "JWT_REFRESH_SECRET or REFRESH_SECRET must be at least 32 characters long for security";
            if strict {
                panic!("{msg}");
            } else {
                tracing::error!("{msg}");
            }
        }
        if jwt_secret == Self::DEFAULT_JWT_SECRET {
            let msg = "Default JWT_SECRET cannot be used in any environment";
            if strict {
                panic!("{msg}");
            } else {
                tracing::error!("{msg}");
            }
        }
        if refresh_secret == Self::DEFAULT_REFRESH_SECRET {
            let msg = "Default JWT_REFRESH_SECRET cannot be used in any environment";
            if strict {
                panic!("{msg}");
            } else {
                tracing::error!("{msg}");
            }
        }
    }

    pub fn from_env() -> Self {
        let is_production = std::env::var("PROFILE")
            .map(|v| v == "prod" || v == "production")
            .unwrap_or(false)
            || std::env::var("RUST_ENV")
                .map(|v| v == "production")
                .unwrap_or(false)
            || std::env::var("ENV")
                .map(|v| v == "production")
                .unwrap_or(false);

        let jwt_secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| {
            if is_production {
                panic!(
                    "JWT_SECRET environment variable is required in production mode. \
                     Please set a strong secret of at least 32 characters."
                );
            }
            tracing::warn!(
                "⚠️  JWT_SECRET not set, using default development secret. \
                 This is INSECURE for production use!"
            );
            Self::DEFAULT_JWT_SECRET.to_string()
        });

        let refresh_secret = std::env::var("JWT_REFRESH_SECRET")
            .or_else(|_| std::env::var("REFRESH_SECRET"))
            .unwrap_or_else(|_| {
                if is_production {
                    panic!(
                        "JWT_REFRESH_SECRET environment variable is required in production mode. \
                         Please set a strong secret of at least 32 characters."
                    );
                }
                tracing::warn!(
                    "⚠️  JWT_REFRESH_SECRET not set, using default development secret. \
                     This is INSECURE for production use!"
                );
                Self::DEFAULT_REFRESH_SECRET.to_string()
            });

        // 与 `new` 共享严格校验路径。
        Self::validate_secrets(&jwt_secret, &refresh_secret, /*strict=*/ true);

        Self {
            jwt_secret,
            refresh_secret,
            token_expiry_hours: std::env::var("JWT_EXPIRY_HOURS")
                .unwrap_or_else(|_| "24".to_string())
                .parse()
                .unwrap_or(24),
            permission_resolver: None,
        }
    }
}

/// 用户权限解析器：按 user_id 从规范化授权表解析角色与权限码，并做进程内 TTL 缓存。
///
/// # 生效时延口径（权限变更 / 改角色 / 登出）
///
/// 鉴权一律以服务端解析结果为准，token 内的权限码与 `pv` 都不参与放行判定：
///
/// - **同进程内**：角色/权限变更接口（`role.rs`、`user/roles.rs`、`user_permission.rs`）
///   成功后调用 [`invalidate_user_permission_cache`] / [`invalidate_all_permission_caches`]，
///   下一次请求立即按新授权解析，**无时延**。
/// - **跨进程（多副本 / 独立服务）**：各进程各自持有缓存，无法互相推送失效事件；
///   最迟在 TTL（默认 60 秒，`PERMISSION_CACHE_TTL_SECS` 可覆盖）后生效。
///   这是当前选定的明确口径：用最多 60 秒的收敛窗口换取每请求不查库。
/// - **登出**：删除 refresh token / 会话，阻止换发；access token 为无状态 JWT，
///   在 `exp`（`JWT_EXPIRY_HOURS`，默认 24h）前仍可验签通过，但权限仍按服务端
///   实时解析，不会因登出而保留过期授权。需要"登出即失效 access token"时应缩短
///   `JWT_EXPIRY_HOURS` 或增加会话存在性校验（不在本次改造范围）。
/// - **改角色**：等同权限变更，同进程立即、跨进程 ≤ TTL。
///
/// token 内的 `pv`（权限版本哈希）由中间件与服务端解析结果比对，仅用于观测
/// "token 快照与当前授权是否漂移"（打点 `topems_auth_permission_resolution_total`），
/// 不据此拒绝请求——否则权限变更后会引发全量 403，直到用户重新登录。
#[derive(Debug, Clone)]
pub struct PermissionResolver {
    pool: sqlx::PgPool,
    ttl: std::time::Duration,
}

#[derive(Debug, Clone)]
struct PermissionCacheEntry {
    roles: Vec<String>,
    permissions: Vec<String>,
    expires_at: std::time::Instant,
}

static PERMISSION_CACHE: std::sync::OnceLock<
    parking_lot::RwLock<std::collections::HashMap<Uuid, PermissionCacheEntry>>,
> = std::sync::OnceLock::new();

fn permission_cache(
) -> &'static parking_lot::RwLock<std::collections::HashMap<Uuid, PermissionCacheEntry>> {
    PERMISSION_CACHE.get_or_init(|| parking_lot::RwLock::new(std::collections::HashMap::new()))
}

/// 默认权限缓存 TTL：生产 60 秒，可通过 `PERMISSION_CACHE_TTL_SECS` 调整。
fn default_permission_cache_ttl() -> std::time::Duration {
    let secs = std::env::var("PERMISSION_CACHE_TTL_SECS")
        .ok()
        .and_then(|v| v.parse::<u64>().ok())
        .filter(|s| *s > 0)
        .unwrap_or(60);
    std::time::Duration::from_secs(secs)
}

impl PermissionResolver {
    pub fn new(pool: sqlx::PgPool) -> Self {
        Self::with_ttl(pool, default_permission_cache_ttl())
    }

    pub fn with_ttl(pool: sqlx::PgPool, ttl: std::time::Duration) -> Self {
        Self { pool, ttl }
    }

    /// 解析用户当前角色与权限码；命中未过期缓存时直接返回。
    pub async fn resolve(&self, user_id: Uuid) -> Result<(Vec<String>, Vec<String>), sqlx::Error> {
        if let Some(entry) = permission_cache().read().get(&user_id) {
            if entry.expires_at > std::time::Instant::now() {
                return Ok((entry.roles.clone(), entry.permissions.clone()));
            }
        }

        // 授权表（core_user_roles / core_role_permissions）在生产为 FORCE RLS。
        // 权限解析是"按 user_id 查授权"的系统读，必须在系统租户上下文下执行，
        // 否则租户级授权行会被 RLS 过滤成空集合（静默降权）。
        // `set_config(..., true)` 为事务级（SET LOCAL），事务结束即复位，不会污染
        // 复用同一物理连接的后续请求；读操作结束回滚，不产生副作用。
        let mut tx = self.pool.begin().await?;
        // 系统通道：nil 租户 + `app.rls_system='on'`。只设 nil 租户时，
        // `core_roles` 里 `tenant_id='...0001'` 的系统角色在 B1 收口后不可见
        // （权限集合少一条），故必须同时打开系统分支。
        sqlx::query(
            "SELECT set_config('app.tenant_id', $1, true), \
                    set_config('app.rls_system', 'on', true)",
        )
        .bind(SYSTEM_TENANT_ID)
        .execute(&mut *tx)
        .await?;

        let roles = sqlx::query(
            r#"
            SELECT COALESCE(ARRAY_AGG(DISTINCT r.name), '{}') AS roles
            FROM public.core_user_roles ur
            JOIN public.core_roles r ON r.id = ur.role_id
            WHERE ur.user_id = $1
            "#,
        )
        .bind(user_id)
        .fetch_optional(&mut *tx)
        .await?
        .and_then(|row| row.try_get::<Vec<String>, _>("roles").ok())
        .unwrap_or_default();

        let permissions = sqlx::query(
            r#"
            SELECT COALESCE(ARRAY_AGG(DISTINCT p.code), '{}') AS permissions
            FROM public.core_user_roles ur
            JOIN public.core_role_permissions rp ON rp.role_id = ur.role_id
            JOIN public.core_permissions p ON p.id = rp.permission_id
            WHERE ur.user_id = $1
            "#,
        )
        .bind(user_id)
        .fetch_optional(&mut *tx)
        .await?
        .and_then(|row| row.try_get::<Vec<String>, _>("permissions").ok())
        .unwrap_or_default();

        tx.rollback().await?;

        permission_cache().write().insert(
            user_id,
            PermissionCacheEntry {
                roles: roles.clone(),
                permissions: permissions.clone(),
                expires_at: std::time::Instant::now() + self.ttl,
            },
        );

        Ok((roles, permissions))
    }
}

/// 用户级失效：角色授予/回收、用户角色替换后调用。
pub fn invalidate_user_permission_cache(user_id: Uuid) {
    permission_cache().write().remove(&user_id);
}

/// 全量失效：角色权限集合变更、角色删除后调用（影响该角色下所有用户）。
pub fn invalidate_all_permission_caches() {
    permission_cache().write().clear();
}

#[allow(
    clippy::as_conversions,
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss
)]
pub fn generate_jwt_token(user_id: &str, secret: &str, expire_minutes: i64) -> String {
    let now = chrono::Utc::now();
    let exp = (now + chrono::Duration::minutes(expire_minutes)).timestamp() as usize;
    let claims = Claims {
        sub: user_id.to_string(),
        username: user_id.to_string(),
        role: "user".to_string(),
        roles: vec!["user".to_string()],
        permissions: Vec::new(),
        is_superuser: false,
        exp,
        iat: now.timestamp() as usize,
        email: None,
        department: None,
        tenant_id: None,
        department_id: None,
        position_id: None,
        position_code: None,
        must_change_password: false,
    };
    claims.encode(secret).unwrap_or_else(|_| String::new())
}

pub fn verify_jwt_token(token: &str, secret: &str) -> Result<Claims, TopemsError> {
    // Detect RSA PEM keys and use RS256, otherwise use HS256
    if secret.contains("-----BEGIN") {
        let mut validation = Validation::new(Algorithm::RS256);
        validation.leeway = 60;
        let decoding_key = DecodingKey::from_rsa_pem(secret.as_bytes())
            .map_err(|e| TopemsError::Auth(format!("RSA 公钥解析失败: {}", e)))?;
        let token_data = decode::<Claims>(token, &decoding_key, &validation)
            .map_err(|e| TopemsError::Auth(format!("JWT 验证失败: {}", e)))?;
        Ok(token_data.claims)
    } else {
        let mut validation = Validation::new(Algorithm::HS256);
        validation.leeway = 60;
        let token_data = decode::<Claims>(
            token,
            &DecodingKey::from_secret(secret.as_ref()),
            &validation,
        )
        .map_err(|e| TopemsError::Auth(format!("JWT 验证失败: {}", e)))?;
        Ok(token_data.claims)
    }
}

pub fn generate_refresh_token() -> String {
    use rand::Rng;
    let mut bytes = [0u8; 32];
    rand::rng().fill_bytes(&mut bytes);
    bytes.iter().map(|b| format!("{:02x}", b)).collect()
}

use hmac::{Hmac, KeyInit, Mac};
use sha2::Sha256;

type HmacSha256 = Hmac<Sha256>;

#[allow(clippy::expect_used)]
pub fn sign_message(message: &str, secret: &str) -> String {
    let mut mac =
        HmacSha256::new_from_slice(secret.as_bytes()).expect("HMAC can take any size of key");
    mac.update(message.as_bytes());
    let result = mac.finalize();
    hex::encode(result.into_bytes())
}

pub fn verify_message_signature(message: &str, signature: &str, secret: &str) -> bool {
    let expected_signature = sign_message(message, secret);
    expected_signature == signature
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Role {
    pub id: String,
    pub name: String,
    pub description: String,
    pub permissions: Vec<String>,
    pub is_default: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Permission {
    pub id: String,
    pub name: String,
    pub description: String,
    pub category: String,
}

pub fn get_permissions() -> Vec<Permission> {
    vec![
        Permission {
            id: "iam:users_read".to_string(),
            name: "读取用户".to_string(),
            description: "查看用户列表和详情".to_string(),
            category: "用户管理".to_string(),
        },
        Permission {
            id: "iam:users_create".to_string(),
            name: "创建用户".to_string(),
            description: "创建新用户".to_string(),
            category: "用户管理".to_string(),
        },
        Permission {
            id: "iam:users_update".to_string(),
            name: "更新用户".to_string(),
            description: "更新用户信息".to_string(),
            category: "用户管理".to_string(),
        },
        Permission {
            id: "iam:users_delete".to_string(),
            name: "删除用户".to_string(),
            description: "删除用户".to_string(),
            category: "用户管理".to_string(),
        },
        Permission {
            id: "iam:roles_read".to_string(),
            name: "读取角色".to_string(),
            description: "查看角色列表".to_string(),
            category: "角色管理".to_string(),
        },
        Permission {
            id: "iam:roles_create".to_string(),
            name: "创建角色".to_string(),
            description: "创建新角色".to_string(),
            category: "角色管理".to_string(),
        },
        Permission {
            id: "iam:roles_update".to_string(),
            name: "更新角色".to_string(),
            description: "更新角色信息".to_string(),
            category: "角色管理".to_string(),
        },
        Permission {
            id: "iam:roles_delete".to_string(),
            name: "删除角色".to_string(),
            description: "删除角色".to_string(),
            category: "角色管理".to_string(),
        },
        Permission {
            id: "iam:permissions_read".to_string(),
            name: "读取权限".to_string(),
            description: "查看权限列表".to_string(),
            category: "权限管理".to_string(),
        },
        Permission {
            id: "iam:permissions_update".to_string(),
            name: "更新权限".to_string(),
            description: "更新权限配置".to_string(),
            category: "权限管理".to_string(),
        },
        Permission {
            id: "iam:audit_read".to_string(),
            name: "读取审计日志".to_string(),
            description: "查看审计日志".to_string(),
            category: "系统管理".to_string(),
        },
        Permission {
            id: "iam:system_read".to_string(),
            name: "系统设置读取".to_string(),
            description: "查看系统设置".to_string(),
            category: "系统管理".to_string(),
        },
        Permission {
            id: "iam:system_update".to_string(),
            name: "系统设置更新".to_string(),
            description: "修改系统设置".to_string(),
            category: "系统管理".to_string(),
        },
        Permission {
            id: "iam:dictionaries_read".to_string(),
            name: "字典读取".to_string(),
            description: "查看字典数据".to_string(),
            category: "系统管理".to_string(),
        },
        Permission {
            id: "iam:dictionaries_update".to_string(),
            name: "字典更新".to_string(),
            description: "更新字典数据".to_string(),
            category: "系统管理".to_string(),
        },
        Permission {
            id: "iam:plugins_read".to_string(),
            name: "插件读取".to_string(),
            description: "查看插件列表".to_string(),
            category: "系统管理".to_string(),
        },
        Permission {
            id: "iam:plugins_update".to_string(),
            name: "插件更新".to_string(),
            description: "安装/卸载插件".to_string(),
            category: "系统管理".to_string(),
        },
        Permission {
            id: "pm:projects_read".to_string(),
            name: "读取项目".to_string(),
            description: "查看项目列表".to_string(),
            category: "项目管理".to_string(),
        },
        Permission {
            id: "pm:projects_create".to_string(),
            name: "创建项目".to_string(),
            description: "创建新项目".to_string(),
            category: "项目管理".to_string(),
        },
        Permission {
            id: "pm:projects_update".to_string(),
            name: "更新项目".to_string(),
            description: "更新项目信息".to_string(),
            category: "项目管理".to_string(),
        },
        Permission {
            id: "pm:projects_delete".to_string(),
            name: "删除项目".to_string(),
            description: "删除项目".to_string(),
            category: "项目管理".to_string(),
        },
        Permission {
            id: "doc:documents_read".to_string(),
            name: "读取文档".to_string(),
            description: "查看文档".to_string(),
            category: "文档管理".to_string(),
        },
        Permission {
            id: "doc:documents_create".to_string(),
            name: "创建文档".to_string(),
            description: "创建文档".to_string(),
            category: "文档管理".to_string(),
        },
        Permission {
            id: "doc:documents_update".to_string(),
            name: "更新文档".to_string(),
            description: "更新文档".to_string(),
            category: "文档管理".to_string(),
        },
        Permission {
            id: "doc:documents_delete".to_string(),
            name: "删除文档".to_string(),
            description: "删除文档".to_string(),
            category: "文档管理".to_string(),
        },
        Permission {
            id: "workflow:workflows_read".to_string(),
            name: "读取工作流".to_string(),
            description: "查看工作流".to_string(),
            category: "工作流管理".to_string(),
        },
        Permission {
            id: "workflow:workflows_create".to_string(),
            name: "创建工作流".to_string(),
            description: "创建工作流".to_string(),
            category: "工作流管理".to_string(),
        },
        Permission {
            id: "workflow:workflows_update".to_string(),
            name: "更新工作流".to_string(),
            description: "更新工作流".to_string(),
            category: "工作流管理".to_string(),
        },
        Permission {
            id: "workflow:workflows_delete".to_string(),
            name: "删除工作流".to_string(),
            description: "删除工作流".to_string(),
            category: "工作流管理".to_string(),
        },
        Permission {
            id: "iam:system_settings".to_string(),
            name: "系统设置".to_string(),
            description: "修改系统设置".to_string(),
            category: "系统管理".to_string(),
        },
        Permission {
            id: "iam:system_logs".to_string(),
            name: "查看日志".to_string(),
            description: "查看系统日志".to_string(),
            category: "系统管理".to_string(),
        },
        Permission {
            id: "iam:system_monitor".to_string(),
            name: "系统监控".to_string(),
            description: "查看系统监控".to_string(),
            category: "系统管理".to_string(),
        },
        Permission {
            id: "iam:system_export".to_string(),
            name: "数据导出".to_string(),
            description: "导出系统数据".to_string(),
            category: "系统管理".to_string(),
        },
    ]
}

pub fn get_roles() -> Vec<Role> {
    let permissions = get_permissions();
    vec![
        Role {
            id: "superadmin".to_string(),
            name: "超级管理员".to_string(),
            description: "拥有所有权限".to_string(),
            permissions: permissions.iter().map(|p| p.id.clone()).collect(),
            is_default: false,
        },
        Role {
            id: "admin".to_string(),
            name: "管理员".to_string(),
            description: "管理用户和角色".to_string(),
            permissions: vec![
                "iam:users_read".to_string(),
                "iam:users_create".to_string(),
                "iam:users_update".to_string(),
                "iam:roles_read".to_string(),
                "iam:roles_create".to_string(),
                "iam:roles_update".to_string(),
                "iam:system_settings".to_string(),
                "iam:system_logs".to_string(),
            ],
            is_default: false,
        },
        Role {
            id: "project_manager".to_string(),
            name: "项目经理".to_string(),
            description: "管理项目和文档".to_string(),
            permissions: vec![
                "pm:projects_read".to_string(),
                "pm:projects_create".to_string(),
                "pm:projects_update".to_string(),
                "doc:documents_read".to_string(),
                "doc:documents_create".to_string(),
                "doc:documents_update".to_string(),
                "workflow:workflows_read".to_string(),
                "workflow:workflows_create".to_string(),
            ],
            is_default: false,
        },
        Role {
            id: "developer".to_string(),
            name: "开发人员".to_string(),
            description: "参与项目开发".to_string(),
            permissions: vec![
                "pm:projects_read".to_string(),
                "doc:documents_read".to_string(),
                "doc:documents_update".to_string(),
                "workflow:workflows_read".to_string(),
            ],
            is_default: false,
        },
        Role {
            id: "viewer".to_string(),
            name: "查看者".to_string(),
            description: "只读权限".to_string(),
            permissions: vec![
                "pm:projects_read".to_string(),
                "doc:documents_read".to_string(),
            ],
            is_default: true,
        },
    ]
}

pub fn get_role_by_id(role_id: &str) -> Option<Role> {
    get_roles().into_iter().find(|r| r.id == role_id)
}

pub fn get_permission_by_id(permission_id: &str) -> Option<Permission> {
    get_permissions()
        .into_iter()
        .find(|p| p.id == permission_id)
}

pub(crate) fn is_public_path(path: &str) -> bool {
    let public_paths = [
        "/",
        "/health",
        "/api/core/iam/auth/login",
        "/api/core/iam/auth/refresh",
        "/api/core/iam/auth/register",
        "/api/core/iam/auth/forgot-password",
        "/api/core/iam/auth/reset-password",
        "/api/core/iam/auth/logout",
        "/api/integration/webhooks",
        "/api/plugin/marketplace/list",
        "/api/plugin/marketplace",
        "/api/plugin/marketplace/list",
        "/api/plugin/marketplace",
        "/api/v1/core/iam/auth/login",
        "/api/v1/core/iam/auth/refresh",
        "/api/v1/core/iam/auth/register",
        "/api/v1/core/iam/auth/forgot-password",
        "/api/v1/core/iam/auth/reset-password",
        "/api/v1/core/iam/auth/logout",
        "/api/v1/integration/webhooks",
    ];
    if public_paths.contains(&path) {
        return true;
    }
    path.starts_with("/api/core/iam/auth/")
        || path.starts_with("/api/integration/webhooks")
        || path.starts_with("/api/plugin/marketplace/")
        || path.starts_with("/api/v1/core/iam/auth/")
        || path.starts_with("/api/v1/integration/webhooks")
        // 各服务/模块挂载后的健康检查端点（如 /api/finance/health），无敏感信息
        || path.ends_with("/health")
        // 服务间内部集成端点（仅内网可达；供 integration 等服务编排调用，须与网关/反代配合限制公网暴露）
        || path.starts_with("/api/internal/")
}

fn is_websocket_path(path: &str) -> bool {
    path.starts_with("/ws/")
}

fn is_plugin_public_path(path: &str, method: &str) -> bool {
    if path.starts_with("/api/plugins/health") || path.starts_with("/api/plugins/info") {
        return true;
    }
    if path.starts_with("/api/core/plugin/marketplace")
        || path.starts_with("/api/v1/core/plugin/marketplace")
    {
        return true;
    }
    if path.starts_with("/api/core/plugins/") || path.starts_with("/api/v1/core/plugins/") {
        if path.ends_with("/install")
            || path.ends_with("/uninstall")
            || path.ends_with("/enable")
            || path.ends_with("/disable")
        {
            return true;
        }
        if path == "/api/core/plugins" && method == "GET" {
            return true;
        }
        if path == "/api/v1/core/plugins" && method == "GET" {
            return true;
        }
    }
    if path.starts_with("/api/core/plugin/dev/plugins/") && path.ends_with("/register") {
        return true;
    }
    if path.starts_with("/api/v1/core/plugin/dev/plugins/") && path.ends_with("/register") {
        return true;
    }
    // V68.1 A2.2: plugin-registry 运行时注册路径（服务间 X-Plugin-Token 认证，非 JWT）
    // 注意：nest("/api", ...) 会剥离前缀，middleware 看到的路径可能不含 /api
    if (path.starts_with("/api/plugin/runtime/") || path.starts_with("/plugin/runtime/"))
        && (path.ends_with("/register") || path.ends_with("/unregister"))
    {
        return true;
    }
    false
}

pub async fn auth_middleware(
    State(auth_state): State<AuthState>,
    req: Request<Body>,
    next: Next,
) -> Response {
    let path = req.uri().path().to_string();
    let method = req.method().as_str().to_string();

    if is_public_path(&path) {
        return next.run(req).await;
    }

    if is_websocket_path(&path) {
        let is_websocket_upgrade = req
            .headers()
            .get(header::UPGRADE)
            .map(|h| h.to_str().unwrap_or(""))
            .map(|h| h.eq_ignore_ascii_case("websocket"))
            .unwrap_or(false);
        if is_websocket_upgrade {
            return next.run(req).await;
        }
    }

    if is_plugin_public_path(&path, &method) {
        return next.run(req).await;
    }

    let (mut parts, body) = req.into_parts();

    let dev_mode_requested = std::env::var("DEVELOPMENT_MODE")
        .map(|v| v.eq_ignore_ascii_case("true") || v == "1")
        .unwrap_or(false);
    // S3(P2-6)：生产判定同时识别 PROFILE / RUST_ENV / ENV，避免仅设 RUST_ENV=production
    // 时 DEVELOPMENT_MODE 伪造超管旁路仍生效。
    let is_prod_profile = ["PROFILE", "RUST_ENV", "ENV"].iter().any(|k| {
        std::env::var(k)
            .map(|v| {
                let v = v.to_lowercase();
                v == "prod" || v == "production"
            })
            .unwrap_or(false)
    });
    let development_mode = dev_mode_requested && !is_prod_profile;

    if development_mode {
        tracing::warn!(
            "⚠️ DEVELOPMENT_MODE 开发旁路已启用：伪造 superuser 放行全部请求，严禁用于任何非本地环境！"
        );
        let claims = Claims {
            sub: "00000000-0000-0000-0000-000000000001".to_string(),
            username: "dev_user".to_string(),
            role: "admin".to_string(),
            roles: vec!["admin".to_string(), "user".to_string()],
            permissions: vec![
                "iam:admin".to_string(),
                "notification:read".to_string(),
                "plugin:read".to_string(),
                "plugin:write".to_string(),
            ],
            is_superuser: true,
            exp: 0,
            iat: 0,
            email: Some("dev@example.com".to_string()),
            department: None,
            tenant_id: Some("00000000-0000-0000-0000-000000000001".to_string()),
            department_id: None,
            position_id: None,
            position_code: None,
            must_change_password: false,
        };
        let rls_ctx = rls_request_tenant(&claims);
        // 审计中间件在外层执行，读不到本层注入的 Claims；通过共享槽位回填审计归属。
        if let Some(slot) = parts.extensions.get::<AuditContextSlot>().cloned() {
            apply_claims_to_audit_context(&slot, &claims);
        }
        let audit_ctx =
            audit_context_from_claims(&claims, current_audit_context().unwrap_or_default());
        parts.extensions.insert(claims);
        let req_path = parts.uri.path().to_string();
        let req = Request::from_parts(parts, body);
        return scope_request_tenant(
            rls_ctx,
            scope_request_path(req_path, scope_audit_context(audit_ctx, next.run(req))),
        )
        .await;
    } else if dev_mode_requested && is_prod_profile {
        tracing::warn!(
            "DEVELOPMENT_MODE 在生产环境（PROFILE/RUST_ENV/ENV=prod|production）被忽略，仍要求真实认证"
        );
    }

    let token = match parts
        .headers
        .get(header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok())
    {
        Some(header) => header.strip_prefix("Bearer ").unwrap_or(header).to_string(),
        None => return api_error::<()>(401, "未授权：缺少有效的认证令牌").into_response(),
    };

    let mut claims = match verify_jwt_token(&token, &auth_state.jwt_secret) {
        Ok(claims) => claims,
        Err(e) => {
            tracing::error!("Token verification failed: {}", e);
            return api_error::<()>(401, &format!("认证失败：{}", e)).into_response();
        }
    };

    // P0：用户 token 不再承载逐条权限码，校验后按 user_id 从服务端授权表解析并回填。
    // 超管走 is_superuser 短路；服务身份继续使用 token 内的显式权限集合。
    //
    // 解析失败按 fail-closed 拒绝（503）：回退空权限会把"DB 不可用"伪装成"无权限"，
    // 表现为静默 403，既不安全也无法与真实的 403 区分。单测/未接库的服务未注入
    // resolver，仍保持 token 内权限的既有行为（见 `AuthState::permission_resolver`）。
    if !claims.is_superuser && !is_service_claims(&claims) {
        if let Some(resolver) = auth_state.permission_resolver.as_ref() {
            let user_id = match claims.user_id() {
                Ok(user_id) => user_id,
                Err(e) => {
                    record_permission_outcome("invalid_user_id");
                    tracing::error!(user = %claims.sub, error = %e, "token 中的用户 ID 非法，拒绝请求");
                    return api_error::<()>(401, "认证失败：令牌中的用户标识非法").into_response();
                }
            };

            match resolver.resolve(user_id).await {
                Ok((roles, permissions)) => {
                    claims.roles = roles;
                    claims.permissions = permissions;
                    record_permission_outcome("resolved");

                    // `pv` 校验：token 内快照版本 vs 服务端解析出的当前版本。
                    // 仅做漂移观测，不拒绝请求——服务端解析结果是鉴权权威来源。
                    if let Some(token_pv) = token_permission_version(&token) {
                        let current_pv = permission_version(&claims.roles, &claims.permissions);
                        if token_pv != current_pv {
                            record_permission_outcome("version_mismatch");
                            tracing::info!(
                                user = %claims.sub,
                                token_pv = %token_pv,
                                current_pv = %current_pv,
                                "token 权限版本与当前授权漂移（已按服务端最新权限放行）"
                            );
                        }
                    }
                }
                Err(e) => {
                    record_permission_outcome("error");
                    tracing::error!(
                        user = %claims.sub,
                        error = %e,
                        "权限解析失败，按 fail-closed 拒绝请求（503）"
                    );
                    return api_error::<()>(503, "权限服务暂不可用，请稍后重试").into_response();
                }
            }
        }
    }

    // 审计中间件在外层执行，读不到本层注入的 Claims；通过共享槽位回填审计归属。
    // 放在 must_change_password 拦截之前，确保被拒绝的请求也记录真实操作者。
    if let Some(slot) = parts.extensions.get::<AuditContextSlot>().cloned() {
        apply_claims_to_audit_context(&slot, &claims);
    }
    let audit_ctx = audit_context_from_claims(&claims, current_audit_context().unwrap_or_default());

    // 服务身份识别（service-to-service）：打审计日志并注入 ServiceIdentity，
    // 供下游（require_permission / RLS / 处理器）区分服务调用与真实用户调用。
    if is_service_claims(&claims) {
        tracing::info!(
            service = %claims.username,
            method = %method,
            path = %path,
            "服务间调用（service-to-service）"
        );
        // 服务间调用可观测性：Prometheus 计数（service+target 维度），/metrics 暴露
        record_service_call(&claims.username, &path);
        parts.extensions.insert(ServiceIdentity {
            service_name: claims.username.clone(),
            permissions: claims.permissions.clone(),
        });
    }

    // 显式系统通道标记（W7 阶段三 P0）：调用方不再用 nil `x-tenant-id` 当暗号，
    // 改为 `x-system-channel` + `x-caller-service` + `x-system-reason`。目标端据此
    // 校验身份、落日志并计数，便于追溯"谁、为什么"在使用跨租户通道。
    if let Some(channel) = parts
        .headers
        .get("x-system-channel")
        .and_then(|v| v.to_str().ok())
    {
        let caller = parts
            .headers
            .get("x-caller-service")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("-");
        let reason = parts
            .headers
            .get("x-system-reason")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("-");
        if !crate::service::system_channel_allowed(channel, &claims) {
            tracing::warn!(
                channel,
                caller,
                reason,
                user = %claims.username,
                path = %path,
                "系统通道身份校验失败：仅 service_token 服务身份可声明系统通道"
            );
            return api_error::<()>(403, "系统通道仅限服务身份使用").into_response();
        }
        tracing::warn!(
            channel,
            caller,
            reason,
            user = %claims.username,
            method = %method,
            path = %path,
            "系统通道请求（跨租户可见），已记录调用方与原因"
        );
        record_system_channel(caller);
    }

    // P1-4：未改密（must_change_password=true）硬拦截——除自服务改密与登出外一律 403。
    // 新播种 admin / 开放注册待激活账号首登须改密；改密成功（change_my_password）会清旗标，
    // 此后新签发 token 不再带 true。
    if claims.must_change_password && !is_password_change_whitelisted(&path, &method) {
        tracing::warn!(
            user = %claims.sub,
            path = %path,
            "P1-4 拦截：用户未修改初始密码，访问被拒绝（仅放行改密/登出）"
        );
        return api_error::<()>(
            403,
            "首次登录须先修改初始密码（POST /users/me/password），当前仅允许改密与登出",
        )
        .into_response();
    }

    parts.extensions.insert(claims.clone());
    let req = Request::from_parts(parts, body);
    let rls_ctx = rls_request_tenant(&claims);
    scope_request_tenant(
        rls_ctx,
        scope_request_path(path, scope_audit_context(audit_ctx, next.run(req))),
    )
    .await
}

/// P1-4 白名单：未改密用户仅放行自服务改密与登出。
fn is_password_change_whitelisted(path: &str, method: &str) -> bool {
    let change_password = method == "POST" && path.ends_with("/users/me/password");
    let logout = method == "POST" && path.ends_with("/iam/auth/logout");
    change_password || logout
}

pub fn check_permission<T>(
    claims: &Claims,
    permission: &str,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    if claims.has_permission(permission) {
        Ok(())
    } else {
        Err(axum::Json(api_error::<T>(
            403,
            &format!("权限不足：需要 {} 权限", permission),
        )))
    }
}

pub fn check_role<T>(claims: &Claims, role: &str) -> Result<(), axum::Json<ApiResponse<T>>> {
    if claims.has_role(role) {
        Ok(())
    } else {
        Err(axum::Json(api_error::<T>(
            403,
            &format!("权限不足：需要 {} 角色", role),
        )))
    }
}

pub fn require_superuser<T>(claims: &Claims) -> Result<(), axum::Json<ApiResponse<T>>> {
    if claims.is_superuser {
        Ok(())
    } else {
        Err(axum::Json(api_error::<T>(
            403,
            "权限不足：需要超级管理员权限",
        )))
    }
}

pub fn require_any_permission<T>(
    claims: &Claims,
    permissions: &[&str],
) -> Result<(), axum::Json<ApiResponse<T>>> {
    if claims.has_any_permission(permissions) {
        Ok(())
    } else {
        Err(axum::Json(api_error::<T>(
            403,
            &format!("权限不足：需要以下任一权限: {}", permissions.join(", ")),
        )))
    }
}

pub fn require_all_permissions<T>(
    claims: &Claims,
    permissions: &[&str],
) -> Result<(), axum::Json<ApiResponse<T>>> {
    if claims.has_all_permissions(permissions) {
        Ok(())
    } else {
        Err(axum::Json(api_error::<T>(
            403,
            &format!("权限不足：需要所有以下权限: {}", permissions.join(", ")),
        )))
    }
}

#[cfg(test)]
#[allow(
    clippy::as_conversions,
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss
)]
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
mod tests {
    use super::*;
    use serial_test::serial;

    #[test]
    fn test_claims_has_permission() {
        let claims = Claims {
            sub: "1".to_string(),
            username: "test".to_string(),
            role: "user".to_string(),
            roles: vec!["user".to_string()],
            permissions: vec!["iam:users_read".to_string()],
            is_superuser: false,
            exp: 0,
            iat: 0,
            email: None,
            department: None,
            tenant_id: None,
            department_id: None,
            position_id: None,
            position_code: None,
            must_change_password: false,
        };
        assert!(claims.has_permission("iam:users_read"));
        assert!(!claims.has_permission("iam:users_create"));
    }

    /// P0 回归：tenant_admin 级别的 1050 个权限码不得再写入 access token。
    #[test]
    fn test_compact_token_excludes_permissions() {
        let permissions: Vec<String> = (0..1050)
            .map(|i| format!("module{}:resource:read", i % 40))
            .collect();
        let claims = Claims {
            sub: "11111111-1111-1111-1111-111111111111".to_string(),
            username: "tenant_admin".to_string(),
            role: "tenant_admin".to_string(),
            roles: vec!["tenant_admin".to_string(), "employee".to_string()],
            permissions,
            is_superuser: false,
            exp: 1_900_000_000,
            iat: 1_800_000_000,
            email: Some("tenant_admin@example.com".to_string()),
            department: Some("总部".to_string()),
            tenant_id: Some("00000000-0000-0000-0000-000000000001".to_string()),
            department_id: None,
            position_id: None,
            position_code: None,
            must_change_password: false,
        };

        let secret = super_long_secret();
        let legacy = claims.encode(secret).expect("legacy encode");
        let compact = claims.encode_compact(secret).expect("compact encode");

        // 改造前逐码写入 claims，字符数在 1 万以上；改造后仅身份/角色/版本哈希。
        assert!(
            legacy.chars().count() > 10_000,
            "legacy token 应包含全部权限码，实际 {}",
            legacy.chars().count()
        );
        assert!(
            compact.chars().count() < 2_048,
            "compact token 应远小于 nginx 默认请求头缓冲，实际 {}",
            compact.chars().count()
        );

        // 紧凑 token 必须可正常校验，权限字段回退为空集合（由中间件服务端回填）。
        let decoded = verify_jwt_token(&compact, secret).expect("compact decode");
        assert!(decoded.permissions.is_empty());
        assert_eq!(decoded.roles.len(), 2);
        assert_eq!(
            decoded.tenant_id.as_deref(),
            Some("00000000-0000-0000-0000-000000000001")
        );

        println!(
            "token chars: legacy={} compact={}",
            legacy.chars().count(),
            compact.chars().count()
        );
    }

    /// 紧凑 token 必须携带 `pv`，且与按同一权限集合计算的版本一致；
    /// 旧式 token 不含 `pv`，中间件不做漂移比对（保持兼容）。
    #[test]
    fn test_compact_token_carries_permission_version() {
        let c = make_claims("123e4567-e89b-12d3-a456-426614174000");
        let secret = super_long_secret();

        let compact = c.encode_compact(secret).expect("compact encode");
        let pv = token_permission_version(&compact).expect("compact token 应含 pv");
        assert_eq!(pv, permission_version(&c.roles, &c.permissions));

        let legacy = c.encode(secret).expect("legacy encode");
        assert!(
            token_permission_version(&legacy).is_none(),
            "旧式 token 不应写入 pv"
        );
    }

    /// 权限版本对角色/权限码顺序不敏感，且集合变化后版本随之变化。
    #[test]
    fn test_permission_version_order_insensitive_and_changes() {
        let base = permission_version(
            &["user".to_string(), "admin".to_string()],
            &["a".to_string(), "b".to_string()],
        );
        let reordered = permission_version(
            &["admin".to_string(), "user".to_string()],
            &["b".to_string(), "a".to_string()],
        );
        assert_eq!(base, reordered, "版本应对顺序不敏感");

        let changed = permission_version(
            &["user".to_string(), "admin".to_string()],
            &["a".to_string(), "b".to_string(), "c".to_string()],
        );
        assert_ne!(base, changed, "权限集合变化后版本必须变化");
    }

    #[test]
    fn test_superuser_has_all_permissions() {
        let claims = Claims {
            sub: "1".to_string(),
            username: "admin".to_string(),
            role: "superadmin".to_string(),
            roles: vec!["superadmin".to_string()],
            permissions: vec![],
            is_superuser: true,
            exp: 0,
            iat: 0,
            email: None,
            department: None,
            tenant_id: None,
            department_id: None,
            position_id: None,
            position_code: None,
            must_change_password: false,
        };
        assert!(claims.has_permission("any_permission"));
        assert!(claims.has_role("any_role"));
    }

    #[test]
    fn test_is_public_path() {
        assert!(is_public_path("/"));
        assert!(is_public_path("/health"));
        assert!(is_public_path("/api/core/iam/auth/login"));
        assert!(is_public_path("/api/v1/core/iam/auth/login"));
        assert!(is_public_path("/api/v1/core/iam/auth/refresh"));
        assert!(is_public_path("/api/v1/core/iam/auth/register"));
        assert!(is_public_path("/api/v1/core/iam/auth/logout"));
        assert!(!is_public_path("/api/core/iam/users"));
        assert!(!is_public_path("/api/v1/core/iam/users"));
    }

    #[test]
    fn test_is_websocket_path() {
        assert!(is_websocket_path("/ws/mes/dashboard"));
        assert!(is_websocket_path("/ws/bi/dashboard"));
        assert!(is_websocket_path("/ws/gis/device/code"));
        assert!(is_websocket_path("/ws/core/notifications"));
        assert!(!is_websocket_path("/api/orders"));
    }

    #[serial]
    #[test]
    fn test_auth_state_validates_secret_length() {
        // 安全加固：短密钥构造 AuthState 必须 panic，防止绕过安全不变量。
        let panics_on_short_jwt = std::panic::catch_unwind(|| {
            AuthState::new(
                "short".to_string(),
                "this-is-a-very-long-secret-key-at-least-32-chars".to_string(),
                24,
            );
        })
        .is_err();
        assert!(
            panics_on_short_jwt,
            "AuthState::new 应拒绝不足 32 字符的 jwt_secret"
        );

        let panics_on_short_refresh = std::panic::catch_unwind(|| {
            AuthState::new(
                "this-is-a-very-long-secret-key-at-least-32-chars".to_string(),
                "short".to_string(),
                24,
            );
        })
        .is_err();
        assert!(
            panics_on_short_refresh,
            "AuthState::new 应拒绝不足 32 字符的 refresh_secret"
        );

        // 默认密钥（即便是"长"的）也必须被拒绝
        let panics_on_default_jwt = std::panic::catch_unwind(|| {
            AuthState::new(
                AuthState::DEFAULT_JWT_SECRET.to_string(),
                "this-is-a-very-long-secret-key-at-least-32-chars".to_string(),
                24,
            );
        })
        .is_err();
        assert!(panics_on_default_jwt, "AuthState::new 应拒绝默认 JWT 密钥");

        // 合法构造应成功
        let s = AuthState::new(
            "this-is-a-very-long-secret-key-at-least-32-chars".to_string(),
            "this-is-also-a-very-long-secret-key-for-refresh".to_string(),
            24,
        );
        assert_eq!(s.token_expiry_hours, 24);

        std::env::set_var(
            "JWT_SECRET",
            "this-is-a-very-long-secret-key-at-least-32-chars",
        );
        std::env::set_var(
            "JWT_REFRESH_SECRET",
            "this-is-also-a-very-long-secret-key-for-refresh",
        );
        let auth_state = AuthState::from_env();
        assert_eq!(auth_state.token_expiry_hours, 24);
    }

    fn make_claims(sub: &str) -> Claims {
        let now = chrono::Utc::now();
        let exp = (now + chrono::Duration::hours(1)).timestamp() as usize;
        Claims {
            sub: sub.to_string(),
            username: "u".to_string(),
            role: "user".to_string(),
            roles: vec!["user".to_string()],
            permissions: vec!["iam:users_read".to_string()],
            is_superuser: false,
            exp,
            iat: now.timestamp() as usize,
            email: None,
            department: None,
            tenant_id: None,
            department_id: None,
            position_id: None,
            position_code: None,
            must_change_password: false,
        }
    }

    fn super_long_secret() -> &'static str {
        "topems-jwt-secret-key-must-be-at-least-32-characters-long-for-hs256-test"
    }

    fn another_secret() -> &'static str {
        "topems-refresh-secret-key-must-be-at-least-32-characters-for-hs256-test"
    }

    // ===== Claims::user_id =====
    #[test]
    fn test_claims_user_id_ok() {
        let valid_uuid = "123e4567-e89b-12d3-a456-426614174000";
        let c = make_claims(valid_uuid);
        let id = c.user_id();
        assert!(id.is_ok(), "valid uuid should parse");
        assert_eq!(id.unwrap().to_string(), valid_uuid);
    }

    #[test]
    fn test_claims_user_id_err_empty_and_invalid() {
        let c = make_claims("");
        assert!(c.user_id().is_err(), "empty sub should fail");

        let c = make_claims("not-a-uuid");
        assert!(c.user_id().is_err(), "garbage sub should fail");
    }

    // ===== Claims::has_role =====
    #[test]
    fn test_claims_has_role_hit_and_miss() {
        let mut c = make_claims("123e4567-e89b-12d3-a456-426614174000");
        c.roles = vec!["admin".to_string(), "user".to_string()];
        assert!(c.has_role("admin"));
        assert!(c.has_role("user"));
        assert!(!c.has_role("superadmin"));

        c.is_superuser = true;
        assert!(c.has_role("any_role"));
    }

    // ===== Claims::has_any_permission =====
    #[test]
    fn test_claims_has_any_permission_some_hit() {
        let mut c = make_claims("123e4567-e89b-12d3-a456-426614174000");
        c.permissions = vec!["a".to_string(), "b".to_string()];
        assert!(c.has_any_permission(&["a", "x"]));
        assert!(c.has_any_permission(&["x", "b"]));
        assert!(!c.has_any_permission(&["x", "y"]));

        c.is_superuser = true;
        assert!(c.has_any_permission(&["nonexistent"]));
    }

    // ===== Claims::has_all_permissions =====
    #[test]
    fn test_claims_has_all_permissions_partial_miss() {
        let mut c = make_claims("123e4567-e89b-12d3-a456-426614174000");
        c.permissions = vec!["a".to_string(), "b".to_string()];
        assert!(c.has_all_permissions(&["a", "b"]));
        assert!(c.has_all_permissions(&["a"]));
        assert!(!c.has_all_permissions(&["a", "b", "c"]));
        assert!(!c.has_all_permissions(&["c"]));

        c.is_superuser = true;
        assert!(c.has_all_permissions(&["a", "b", "zzz"]));
    }

    // ===== Claims::encode + verify_jwt_token roundtrip =====
    #[test]
    fn test_claims_encode_verify_roundtrip() {
        let c = make_claims("123e4567-e89b-12d3-a456-426614174000");
        let token = c.encode(super_long_secret()).expect("encode ok");
        assert!(!token.is_empty());
        let decoded = verify_jwt_token(&token, super_long_secret()).expect("verify ok");
        assert_eq!(decoded.sub, c.sub);
        assert_eq!(decoded.username, c.username);
        assert_eq!(decoded.permissions, c.permissions);
    }

    #[test]
    fn test_verify_jwt_token_with_wrong_secret_fails() {
        let c = make_claims("123e4567-e89b-12d3-a456-426614174000");
        let token = c.encode(super_long_secret()).expect("encode ok");
        assert!(verify_jwt_token(&token, another_secret()).is_err());
    }

    // ===== generate_jwt_token =====
    #[test]
    fn test_generate_jwt_token_produces_verifiable_claims() {
        let uid = "123e4567-e89b-12d3-a456-426614174000";
        let token = generate_jwt_token(uid, super_long_secret(), 60);
        assert!(!token.is_empty(), "should not return empty string");
        let claims = verify_jwt_token(&token, super_long_secret()).expect("roundtrip ok");
        assert_eq!(claims.sub, uid);
        assert_eq!(claims.username, uid);
        assert_eq!(claims.role, "user");
        assert!(!claims.is_superuser);
    }

    // ===== generate_refresh_token =====
    #[test]
    fn test_generate_refresh_token_unique_and_nonempty() {
        let a = generate_refresh_token();
        let b = generate_refresh_token();
        assert!(!a.is_empty());
        assert_eq!(a.len(), 64, "32 bytes hex -> 64 chars");
        assert_ne!(a, b, "two calls should differ");
    }

    // ===== sign_message + verify_message_signature =====
    #[test]
    fn test_sign_verify_roundtrip_and_tamper() {
        let secret = "my-secret-key-for-signing-test-32chars-xx";
        let msg = "hello world";
        let sig = sign_message(msg, secret);
        assert!(!sig.is_empty());
        assert_eq!(sig.len(), 64, "HMAC-SHA256 -> 32 bytes hex = 64");

        assert!(
            verify_message_signature(msg, &sig, secret),
            "valid sig should pass"
        );
        assert!(
            !verify_message_signature("tampered", &sig, secret),
            "tampered message should fail"
        );
        assert!(
            !verify_message_signature(msg, &sig, "other-secret-32-chars-long-enough!!"),
            "different secret should fail"
        );

        let mut bad_sig = sig.clone();
        bad_sig.replace_range(..1, "0");
        assert!(
            !verify_message_signature(msg, &bad_sig, secret),
            "altered signature should fail"
        );
    }

    // ===== AuthState::new =====
    #[test]
    fn test_auth_state_new_constructor_and_default_token_expiry() {
        let s = AuthState::new(
            super_long_secret().to_string(),
            another_secret().to_string(),
            12,
        );
        assert_eq!(s.jwt_secret, super_long_secret());
        assert_eq!(s.refresh_secret, another_secret());
        assert_eq!(s.token_expiry_hours, 12);
    }

    // ===== get_permissions =====
    #[test]
    fn test_get_permissions_returns_nonempty_list() {
        let perms = get_permissions();
        assert!(!perms.is_empty(), "permissions list should be non-empty");
        let ids: Vec<&str> = perms.iter().map(|p| p.id.as_str()).collect();
        assert!(ids.contains(&"iam:users_read"));
        assert!(ids.contains(&"iam:users_create"));
        assert!(ids.contains(&"iam:roles_read"));
        assert!(ids.contains(&"pm:projects_read"));
    }

    // ===== get_roles =====
    #[test]
    fn test_get_roles_returns_nonempty_list_with_admin() {
        let roles = get_roles();
        assert!(!roles.is_empty(), "roles list should be non-empty");
        let ids: Vec<&str> = roles.iter().map(|r| r.id.as_str()).collect();
        assert!(ids.contains(&"admin"));
        assert!(ids.contains(&"superadmin"));
        assert!(ids.contains(&"viewer"));
    }

    // ===== get_role_by_id =====
    #[test]
    fn test_get_role_by_id_some_and_none() {
        let admin = get_role_by_id("admin");
        assert!(admin.is_some());
        assert_eq!(admin.unwrap().id, "admin");

        assert!(get_role_by_id("nope").is_none());
        assert!(get_role_by_id("").is_none());
    }

    // ===== get_permission_by_id =====
    #[test]
    fn test_get_permission_by_id_some_and_none() {
        let p = get_permission_by_id("iam:users_read");
        assert!(p.is_some());
        assert_eq!(p.unwrap().id, "iam:users_read");

        assert!(get_permission_by_id("iam:does_not_exist").is_none());
    }

    // ===== P1-4：must_change_password 旗标 =====
    #[test]
    fn test_password_change_whitelist() {
        // 自服务改密与登出放行
        assert!(is_password_change_whitelisted(
            "/iam/users/me/password",
            "POST"
        ));
        assert!(is_password_change_whitelisted("/iam/auth/logout", "POST"));
        // 其余一律拦截
        assert!(!is_password_change_whitelisted(
            "/iam/users/me/password",
            "GET"
        ));
        assert!(!is_password_change_whitelisted("/iam/users/me", "GET"));
        assert!(!is_password_change_whitelisted(
            "/iam/users/me/permissions",
            "GET"
        ));
        assert!(!is_password_change_whitelisted(
            "/iam/users/me/password",
            "GET"
        ));
        // 管理端改他人密码不属白名单（路径不同，ends_with 精确匹配 me 前缀）
        assert!(!is_password_change_whitelisted(
            "/iam/users/123/password",
            "PUT"
        ));
        assert!(!is_password_change_whitelisted(
            "/iam/users/me/avatar",
            "POST"
        ));
        assert!(!is_password_change_whitelisted("/", "POST"));
    }

    #[test]
    fn test_claims_roundtrip_preserves_must_change_password() {
        let mut c = make_claims("123e4567-e89b-12d3-a456-426614174000");
        c.must_change_password = true;
        let token = c.encode(super_long_secret()).expect("encode ok");
        let decoded = verify_jwt_token(&token, super_long_secret()).expect("verify ok");
        assert!(decoded.must_change_password);
        c.must_change_password = false;
        let token = c.encode(super_long_secret()).expect("encode ok");
        let decoded = verify_jwt_token(&token, super_long_secret()).expect("verify ok");
        assert!(!decoded.must_change_password);
    }

    #[test]
    fn test_claims_deserializes_without_must_change_password_field() {
        // 旧签发 token 无该声明：serde(default) 保证反序列化不失败
        let legacy = r#"{"sub":"1","username":"u","role":"user","roles":["user"],
            "permissions":[],"is_superuser":false,"exp":0,"iat":0,
            "email":null,"department":null,"tenant_id":null,
            "department_id":null,"position_id":null,"position_code":null}"#;
        let c: Claims = serde_json::from_str(legacy).expect("legacy claims decode ok");
        assert!(!c.must_change_password);
    }
}
