use axum::extract::Extension;
use axum::http::HeaderMap;
use axum::response::{IntoResponse, Response};
use axum::{extract::State, Json};
use prometheus::{register_int_counter_vec, IntCounterVec};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use sqlx::Row;
use std::sync::OnceLock;
use topems_shared_db::scope::Db;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::modules::audit::record_login_event;
use topems_shared_auth::auth::generate_refresh_token;
use topems_shared_auth::auth::Claims;

/// 用户无 active membership 时的登录租户兜底（与历史行为一致）。
const DEFAULT_TENANT_ID: &str = "00000000-0000-0000-0000-000000000001";

/// membership 查询失败计数（`path` = login / refresh / logout）。
///
/// 失败**不回落默认租户**：宁可 5xx，也不能把用户静默签到错误租户。
static MEMBERSHIP_LOOKUP_ERRORS: OnceLock<IntCounterVec> = OnceLock::new();
/// 无 active membership、回落默认租户的计数（`path` = login / refresh / logout）。
static MEMBERSHIP_FALLBACKS: OnceLock<IntCounterVec> = OnceLock::new();

#[allow(clippy::expect_used)]
fn membership_lookup_error_metric() -> &'static IntCounterVec {
    MEMBERSHIP_LOOKUP_ERRORS.get_or_init(|| {
        register_int_counter_vec!(
            "auth_membership_lookup_error_total",
            "Membership lookup errors on login/refresh/logout (no default-tenant fallback)",
            &["path"]
        )
        .expect("failed to register auth_membership_lookup_error_total")
    })
}

#[allow(clippy::expect_used)]
fn membership_fallback_metric() -> &'static IntCounterVec {
    MEMBERSHIP_FALLBACKS.get_or_init(|| {
        register_int_counter_vec!(
            "auth_membership_fallback_total",
            "Login/refresh/logout falling back to default tenant because user has no active membership",
            &["path"]
        )
        .expect("failed to register auth_membership_fallback_total")
    })
}

/// #18 HttpOnly 迁移：refresh_token 走 HttpOnly Cookie（双轨兼容）
///
/// - cookie 优先：`refresh_token` 从 Cookie 头提取（Path=/，HttpOnly，SameSite=Lax）
/// - body 降级：Cookie 缺失时回退到 JSON body 的 `refresh_token`（兼容旧客户端 / 测试 / 其它端）
fn extract_refresh_token(headers: &HeaderMap, payload: &serde_json::Value) -> Option<String> {
    if let Some(cookie) = headers
        .get(axum::http::header::COOKIE)
        .and_then(|v| v.to_str().ok())
    {
        for part in cookie.split(';') {
            let part = part.trim();
            if let Some((k, v)) = part.split_once('=') {
                if k.trim() == "refresh_token" {
                    let v = v.trim().to_string();
                    if !v.is_empty() {
                        return Some(v);
                    }
                }
            }
        }
    }
    payload
        .get("refresh_token")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .filter(|s| !s.is_empty())
}

/// #18：构造 refresh_token HttpOnly Cookie（Set-Cookie 头值）
///
/// - HttpOnly：JS 不可读（缓解 XSS 窃取）
/// - SameSite=Lax：跨站 POST 不携带（缓解 CSRF）
/// - Secure：HTTPS 强制；localhost 属浏览器安全上下文，dev 下同样生效
/// - Path=/：login/logout/refresh 全路径可携带
fn build_refresh_token_cookie(value: &str, max_age_secs: Option<i64>) -> String {
    let mut cookie = format!("refresh_token={}; Path=/; HttpOnly; SameSite=Lax", value);
    if std::env::var("TOPEMS_COOKIE_SECURE")
        .map(|v| v != "false")
        .unwrap_or(true)
    {
        cookie.push_str("; Secure");
    }
    if let Some(max_age) = max_age_secs {
        cookie.push_str(&format!("; Max-Age={}", max_age));
    }
    cookie
}

/// 密码重置统一应答：存在/不存在账号、处理成功均返回同一文案，避免账号枚举。
const PASSWORD_RESET_ACK: &str = "如果该邮箱已注册，重置申请已提交给系统管理员";

fn hash_token(token: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(token.as_bytes());
    let result = hasher.finalize();
    hex::encode(result)
}

/// 失败登录审计：best-effort 写入，不阻断 400/401 响应。
///
/// 失败口径（为什么记、怎么记）：
/// - 参数缺失 / 用户不存在 / 账号禁用 / 密码错误 / 查询异常 五类都记 `status='failed'`，
///   用于撞库与暴力破解回溯；失败尝试不产生 session，写入成本低；
/// - 失败发生在认证完成前，租户尚未确认 → 显式落平台哨兵
///   [`topems_shared_auth::middleware::tenant_scope::PLATFORM_TENANT_ID`]，
///   并依赖 `status='failed'` 与成功登录（真实租户）区分，不再使用"裸 nil 兜底"；
/// - 写失败已在 `record_login_event` 内输出 ERROR + 指标，这里显式消费 Result，
///   不再用 `let _ =` 静默丢弃，但不把审计故障升级成 500（避免审计库抖动导致全站无法登录）。
async fn record_failed_login(
    db: &topems_shared_db::Db,
    user_id: Option<Uuid>,
    username: &str,
    ip_address: Option<&str>,
    user_agent: Option<&str>,
    reason: &str,
) {
    if record_login_event(
        db,
        topems_shared_auth::middleware::tenant_scope::PLATFORM_TENANT_ID,
        user_id,
        username,
        ip_address,
        user_agent,
        "failed",
        Some(reason),
    )
    .await
    .is_err()
    {
        // record_login_event 内部已 ERROR + 计数；此处保留显式分支，避免静默丢弃。
        tracing::debug!("失败登录审计写入失败（已由 record_login_event 上报）");
    }
}

#[allow(dead_code)]
#[derive(Debug, Clone, Deserialize, ToSchema)]
#[schema(as = LoginRequest)]
struct LoginRequest {
    username: String,
    password: String,
}

#[derive(Debug, Clone, sqlx::FromRow)]
struct UserRow {
    id: Uuid,
    username: String,
    password_hash: String,
    email: String,
    full_name: Option<String>,
    is_active: bool,
    is_superuser: bool,
    roles: Option<Vec<String>>,
    permissions: Option<Vec<String>>,
    created_at: Option<chrono::DateTime<chrono::Utc>>,
    must_change_password: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[schema(as = LoginResponseData)]
struct LoginResponseData {
    access_token: String,
    refresh_token: String,
    token_type: String,
    expires_in: i64,
    user: UserInfo,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
struct UserInfo {
    id: String,
    username: String,
    email: String,
    full_name: Option<String>,
    is_active: bool,
    is_superuser: bool,
    created_at: Option<chrono::DateTime<chrono::Utc>>,
    roles: Vec<String>,
    permissions: Vec<String>,
    must_change_password: bool,
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["unified-core:iam:auth:write"])),
    path = "/iam/auth/login",
    tag = "IAM-Auth",
    request_body = serde_json::Value,
    responses(
        (status = 200, description = "登录成功"),
        (status = 400, description = "参数错误"),
        (status = 401, description = "用户名或密码错误"),
        (status = 500, description = "登录失败"),
    ),
    security(),
)]
#[axum::debug_handler]
#[allow(
    clippy::as_conversions,
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss
)]
pub async fn login(
    State(state): State<crate::AppState>,
    headers: HeaderMap,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let username = payload
        .get("username")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let password = payload
        .get("password")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    let ip_address_opt = headers
        .get("X-Forwarded-For")
        .and_then(|h| h.to_str().ok())
        .or_else(|| headers.get("X-Real-IP").and_then(|h| h.to_str().ok()));

    let ip_addr_opt = if ip_address_opt.map(|s| s == "unknown").unwrap_or(true) {
        None
    } else {
        ip_address_opt
    };

    let user_agent = headers
        .get("User-Agent")
        .and_then(|h| h.to_str().ok())
        .map(|s| s.to_string());

    tracing::info!("IAM auth login called with username: {}", username);

    if username.is_empty() || password.is_empty() {
        record_failed_login(
            &state.db,
            None,
            username,
            ip_addr_opt,
            user_agent.as_deref(),
            "用户名和密码不能为空",
        )
        .await;
        return (
            axum::http::StatusCode::BAD_REQUEST,
            Json(topems_shared_core::response::error_value(
                400,
                "用户名和密码不能为空",
            )),
        )
            .into_response();
    }

    // 登录无 Claims / 无请求上下文：用户查询走系统通道（显式 nil 租户 + rls_system='on'）。
    let user_lookup: Result<Option<UserRow>, sqlx::Error> = async {
        let mut scope = state.db.scope_read_system().await?;
        let row = sqlx::query_as::<_, UserRow>(
            r#"
        SELECT u.id, u.username, u.email, u.password_hash,
          CASE WHEN $2 = 'en' THEN COALESCE(u.full_name_en, u.full_name) ELSE u.full_name END AS full_name,
          (u.status = 'active') AS is_active, u.is_superuser,
          COALESCE((SELECT ARRAY_AGG(DISTINCT r.name) FROM public.core_user_roles ur
                    JOIN public.core_roles r ON r.id = ur.role_id WHERE ur.user_id = u.id), '{}') AS roles,
          COALESCE((SELECT ARRAY_AGG(DISTINCT p.code) FROM public.core_user_roles ur
                    JOIN public.core_role_permissions rp ON rp.role_id = ur.role_id
                    JOIN public.core_permissions p ON p.id = rp.permission_id WHERE ur.user_id = u.id), '{}') AS permissions,
          u.created_at AS created_at,
          COALESCE(u.must_change_password, false) AS must_change_password
        FROM iam.users u
        WHERE (u.username = $1 OR u.email = $1) AND u.deleted_at IS NULL
        "#,
        )
        .bind(username)
        .bind(topems_shared_core::locale::Locale::from_headers(&headers).as_sql())
        .fetch_optional(&mut scope)
        .await?;
        scope.commit().await?;
        Ok(row)
    }
    .await;

    let user = match user_lookup {
        Ok(Some(u)) => u,
        Ok(None) => {
            tracing::warn!("Login failed: user not found - {}", username);
            record_failed_login(
                &state.db,
                None,
                username,
                ip_addr_opt,
                user_agent.as_deref(),
                "用户不存在",
            )
            .await;
            return (
                axum::http::StatusCode::UNAUTHORIZED,
                Json(topems_shared_core::response::error_value(
                    401,
                    "用户名或密码错误",
                )),
            )
                .into_response();
        }
        Err(e) => {
            tracing::error!("查询用户失败: {}", e);
            record_failed_login(
                &state.db,
                None,
                username,
                ip_addr_opt,
                user_agent.as_deref(),
                "内部服务器错误",
            )
            .await;
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(topems_shared_core::response::error_value(
                    500,
                    "内部服务器错误",
                )),
            )
                .into_response();
        }
    };

    if !user.is_active {
        tracing::warn!("Login failed: user is not active - {}", username);
        record_failed_login(
            &state.db,
            Some(user.id),
            &user.username,
            ip_addr_opt,
            user_agent.as_deref(),
            "用户账号已被禁用",
        )
        .await;
        return (
            axum::http::StatusCode::UNAUTHORIZED,
            Json(topems_shared_core::response::error_value(
                401,
                "用户账号已被禁用",
            )),
        )
            .into_response();
    }

    if !verify_password(password, &user.password_hash) {
        tracing::warn!("Login failed: invalid password for user - {}", username);
        record_failed_login(
            &state.db,
            Some(user.id),
            &user.username,
            ip_addr_opt,
            user_agent.as_deref(),
            "密码错误",
        )
        .await;
        return (
            axum::http::StatusCode::UNAUTHORIZED,
            Json(topems_shared_core::response::error_value(
                401,
                "用户名或密码错误",
            )),
        )
            .into_response();
    }

    let jwt_expire_minutes = state.auth_state.token_expiry_hours * 60;

    // P0-4：非超管登录签发改从规范化授权表实时解析（core_user_roles → core_roles /
    // core_role_permissions → core_permissions），与刷新换发同构，消除"登录空权、刷新才有"
    // 的不一致；超管保持原行为（roles 取反范式列、permissions = ["*"] 短路）。
    let (user_roles, user_permissions) = if user.is_superuser {
        (
            user.roles.clone().unwrap_or_default(),
            vec!["*".to_string()],
        )
    } else {
        crate::modules::iam::user::resolve_user_grants(&state.db, user.id).await
    };

    // 查询用户所属租户，未关联时 fallback 到默认租户
    //
    // login 无 JWT、tenant_middleware 不会设置 `app.tenant_id`：membership 解析发生在
    // 租户确定之前，走系统通道（显式 nil 租户 + rls_system='on'）只读取该用户自身的
    // membership 行；之后的会话写入仍按解析出的真实租户设置 GUC。
    let tenant_id = match resolve_login_tenant(&state.db, user.id, "login").await {
        Ok(t) => Some(t),
        Err(_) => {
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(topems_shared_core::response::error_value(
                    500,
                    "内部服务器错误",
                )),
            )
                .into_response();
        }
    };

    // 会话/刷新令牌写入需绑定租户（RLS FORCE），提前解析为 Uuid 供 INSERT 使用
    let tenant_uuid = tenant_id.as_deref().and_then(|s| Uuid::parse_str(s).ok());
    // 登录审计行的租户：解析失败时显式落平台哨兵（resolve_login_tenant 已保证正常路径
    // 有真实租户，此分支仅防御解析异常，且不再是"静默 nil"）。
    let audit_tenant_id =
        tenant_uuid.unwrap_or(topems_shared_auth::middleware::tenant_scope::PLATFORM_TENANT_ID);
    let tenant_ctx = tenant_id.clone();
    let now = chrono::Utc::now();
    let exp = usize::try_from((now + chrono::Duration::minutes(jwt_expire_minutes)).timestamp())
        .unwrap_or(0);
    // 创建完整的 Claims，包含用户的真实 is_superuser 状态
    let claims = Claims {
        sub: user.id.to_string(),
        username: user.username.clone(),
        role: if user.is_superuser {
            "admin".to_string()
        } else {
            "user".to_string()
        },
        roles: user_roles.clone(),
        permissions: user_permissions.clone(),
        is_superuser: user.is_superuser,
        exp,
        iat: usize::try_from(now.timestamp()).unwrap_or(0),
        email: Some(user.email.clone()),
        department: None,
        tenant_id,
        department_id: None,
        position_id: None,
        position_code: None,
        must_change_password: user.must_change_password,
    };

    // P0：用户 token 采用紧凑编码，仅含身份/角色/权限版本哈希，权限由服务端解析。
    let access_token = match claims.encode_compact(&state.auth_state.jwt_secret) {
        Ok(token) => token,
        Err(e) => {
            tracing::error!("JWT 编码失败: {:?}", e);
            return Json(topems_shared_core::response::error_value(
                500,
                "Token 生成失败",
            ))
            .into_response();
        }
    };

    let access_token_hash = hash_token(&access_token);
    let refresh_token = generate_refresh_token();
    let refresh_token_hash = hash_token(&refresh_token);
    let expires_in = jwt_expire_minutes * 60;

    let access_expires_at =
        chrono::Utc::now() + chrono::Duration::hours(state.auth_state.token_expiry_hours);
    let refresh_expires_at =
        chrono::Utc::now() + chrono::Duration::hours(state.auth_state.token_expiry_hours * 7);

    // RLS FORCE：凭证 INSERT 必须带租户上下文（login 无 JWT，中间件不设置连接上下文）。
    //
    // 登录成功闭环 = 会话 + refresh token + 登录审计 + `iam.users.last_login_at` 回写，
    // 四件事放在同一事务：任一失败即整体回滚并返回 500。这样不会出现
    // "session 已建但审计缺失" 或 "审计已记但会话缺失" 的同源断裂
    // （此前 `let _ =` 吞错，导致 11-06 审计断档无法从响应/日志察觉）。
    let credentials_result: Result<(), sqlx::Error> = async {
        let mut tx = state.pool.begin().await?;

        // 真实租户上下文 + 系统通道开关：会话/刷新令牌落真实租户，
        // 同时允许后续把上下文临时切回 nil 写登录审计。
        sqlx::query(
            "SELECT set_config('app.tenant_id', $1, true), \
                    set_config('app.rls_system', 'on', true)",
        )
        .bind(&tenant_ctx)
        .execute(&mut *tx)
        .await?;

        sqlx::query(
            "INSERT INTO public.core_sessions (user_id, tenant_id, token_hash, ip_address, user_agent, expires_at)
             VALUES ($1, $2, $3, $4::inet, $5, $6)",
        )
        .bind(user.id)
        .bind(tenant_uuid)
        .bind(&access_token_hash)
        .bind(ip_addr_opt)
        .bind(user_agent.as_deref())
        .bind(access_expires_at)
        .execute(&mut *tx)
        .await?;

        sqlx::query(
            "INSERT INTO public.core_refresh_tokens (user_id, tenant_id, token_hash, ip_address, user_agent, expires_at)
             VALUES ($1, $2, $3, $4::inet, $5, $6)",
        )
        .bind(user.id)
        .bind(tenant_uuid)
        .bind(&refresh_token_hash)
        .bind(ip_addr_opt)
        .bind(user_agent.as_deref())
        .bind(refresh_expires_at)
        .execute(&mut *tx)
        .await?;

        // 登录审计与 session 同事务（成功只记一条，不重复写）。
        //
        // 登录已解析出真实租户（resolve_login_tenant 有默认租户兜底），审计行必须落
        // 真实租户：写 nil 会让租户用户在自己的登录列表里看不到记录，并持续产出零租户行。
        // 事务上下文本就是真实租户，无需为审计切回 nil。
        crate::modules::audit::insert_login_log(
            &mut *tx,
            audit_tenant_id,
            Some(user.id),
            &user.username,
            ip_addr_opt,
            user_agent.as_deref(),
            "success",
            None,
        )
        .await?;

        // 成功登录回写最后登录时间/IP（失败登录不更新，避免污染"最近活跃"口径）
        sqlx::query(
            "UPDATE iam.users SET last_login_at = NOW(), last_login_ip = $2::inet WHERE id = $1",
        )
        .bind(user.id)
        .bind(ip_addr_opt)
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;
        Ok(())
    }
    .await;

    if let Err(e) = credentials_result {
        topems_shared_core::metrics::AUDIT_WRITE_FAILURES_TOTAL
            .with_label_values(&["login_credentials"])
            .inc();
        tracing::error!(
            audit_write_failed = true,
            audit_kind = "login_credentials",
            username = %user.username,
            user_id = %user.id,
            error = %e,
            "登录凭据/审计写入失败，本次登录已整体回滚（未签发 token）"
        );
        return (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(topems_shared_core::response::error_value(
                500,
                "登录失败，请稍后重试",
            )),
        )
            .into_response();
    }

    tracing::debug!("会话凭证与登录审计写入成功");

    // #18：签发 refresh_token 的同时写 HttpOnly Cookie（前端不再依赖 localStorage 持久化）
    let refresh_cookie = build_refresh_token_cookie(&refresh_token, None);

    let response_data = LoginResponseData {
        access_token,
        refresh_token,
        token_type: "Bearer".to_string(),
        expires_in,
        user: UserInfo {
            id: user.id.to_string(),
            username: user.username,
            email: user.email,
            full_name: user.full_name,
            is_active: user.is_active,
            is_superuser: user.is_superuser,
            created_at: user.created_at,
            roles: user_roles,
            permissions: user_permissions,
            must_change_password: user.must_change_password,
        },
    };

    tracing::info!("Login successful for user: {}", username);

    let login_body = serde_json::json!({
        "success": true,
        "message": "登录成功",
        "data": response_data,
        "code": 0
    });

    // #18：登录响应附带 refresh_token HttpOnly Cookie
    let mut headers = HeaderMap::new();
    if let Ok(cookie_value) = refresh_cookie.parse::<axum::http::HeaderValue>() {
        headers.insert(axum::http::header::SET_COOKIE, cookie_value);
    }
    (headers, Json(login_body)).into_response()
}

#[allow(dead_code)]
#[derive(Debug, Clone, Deserialize, ToSchema)]
#[schema(as = RegisterRequest)]
struct RegisterRequest {
    username: String,
    email: String,
    password: String,
    full_name: Option<String>,
}
#[utoipa::path(
    post,
    security(("BearerAuth" = ["unified-core:iam:auth:write"])),
    path = "/iam/auth/register",
    tag = "IAM-Auth",
    request_body = serde_json::Value,
    responses(
        (status = 200, description = "注册成功"),
        (status = 400, description = "参数错误"),
        (status = 409, description = "用户名或邮箱已存在"),
        (status = 500, description = "注册失败"),
    ),
    security(),
)]
pub async fn register(
    State(state): State<crate::AppState>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    let username = payload
        .get("username")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let email = payload.get("email").and_then(|v| v.as_str()).unwrap_or("");
    let password = payload
        .get("password")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let full_name = payload
        .get("full_name")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let full_name_en = payload
        .get("full_name_en")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    tracing::info!("IAM auth register called with username: {}", username);

    // P1-3(S1)：自助注册默认关闭。仅当 REGISTER_ENABLED=true/1 时开放；开放时账号落
    // status='pending'，须管理员激活并分配角色/租户后方可登录（登录仅放行 status='active'），
    // 避免开放注册产生无角色/无租户的可登录僵尸账号。
    let register_enabled = std::env::var("REGISTER_ENABLED")
        .map(|v| v.eq_ignore_ascii_case("true") || v == "1")
        .unwrap_or(false);
    if !register_enabled {
        tracing::warn!("自助注册已关闭，拒绝注册尝试: {}", username);
        return Json(topems_shared_core::response::error_value(
            403,
            "自助注册未开放，请联系管理员创建账号",
        ));
    }

    // 验证必填字段
    if username.is_empty() || email.is_empty() || password.is_empty() {
        return Json(topems_shared_core::response::error_value(
            400,
            "用户名、邮箱和密码不能为空",
        ));
    }

    // 验证用户名格式（3-20字符，只允许字母、数字、下划线）
    if !username
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '_')
        || username.len() < 3
        || username.len() > 20
    {
        return Json(topems_shared_core::response::error_value(
            400,
            "用户名必须为3-20个字符，只允许字母、数字和下划线",
        ));
    }

    // 验证邮箱格式
    if !email.contains('@') || !email.contains('.') {
        return Json(topems_shared_core::response::error_value(
            400,
            "请输入有效的邮箱地址",
        ));
    }

    // 验证密码强度：与创建用户/改密/admin 工具同一实现
    if let Err(message) = validate_password_strength(password) {
        return Json(topems_shared_core::response::error_value(400, &message));
    }

    // 检查用户名是否已存在（注册无 Claims：系统通道读）
    let username_exists: Result<i64, sqlx::Error> = async {
        let mut scope = state.db.scope_read_system().await?;
        let count =
            sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM iam.users WHERE username = $1")
                .bind(username)
                .fetch_one(&mut scope)
                .await?;
        scope.commit().await?;
        Ok(count)
    }
    .await;
    match username_exists {
        Ok(count) if count > 0 => {
            return Json(topems_shared_core::response::error_value(
                409,
                "用户名已存在",
            ));
        }
        Ok(_) => {}
        Err(e) => {
            tracing::error!("查询用户失败: {}", e);
            return Json(topems_shared_core::response::error_value(
                500,
                "内部服务器错误",
            ));
        }
    }

    // 检查邮箱是否已存在（注册无 Claims：系统通道读）
    let email_exists: Result<i64, sqlx::Error> = async {
        let mut scope = state.db.scope_read_system().await?;
        let count = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM iam.users WHERE email = $1")
            .bind(email)
            .fetch_one(&mut scope)
            .await?;
        scope.commit().await?;
        Ok(count)
    }
    .await;
    match email_exists {
        Ok(count) if count > 0 => {
            return Json(topems_shared_core::response::error_value(
                409,
                "邮箱已被注册",
            ));
        }
        Ok(_) => {}
        Err(e) => {
            tracing::error!("查询用户失败: {}", e);
            return Json(topems_shared_core::response::error_value(
                500,
                "内部服务器错误",
            ));
        }
    }

    // 哈希密码
    let password_hash = match bcrypt::hash(password, bcrypt::DEFAULT_COST) {
        Ok(h) => h,
        Err(e) => {
            tracing::error!("密码哈希失败: {}", e);
            return Json(topems_shared_core::response::error_value(
                500,
                "内部服务器错误",
            ));
        }
    };

    // 创建用户：统一写 iam.users（身份权威表；2026-10-28 收敛后 core_users 已废弃）
    let user_id = Uuid::new_v4();
    let write_core = async {
        let mut scope = state.db.scope_system().await?;
        sqlx::query(
            r#"
        INSERT INTO iam.users (id, username, email, password_hash, full_name, full_name_en, status, is_superuser, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'pending', false, NOW())
        ON CONFLICT (username) DO NOTHING
        "#,
        )
        .bind(user_id)
        .bind(username)
        .bind(email)
        .bind(&password_hash)
        .bind(&full_name)
        .bind(&full_name_en)
        .execute(&mut scope)
        .await?;
        scope.commit().await?;
        Ok::<(), sqlx::Error>(())
    }
    .await;
    match write_core {
        Ok(_) => {
            tracing::info!("用户注册成功: {}", username);
            Json(serde_json::json!({
                "success": true,
                "message": "注册成功，待管理员审核激活并分配角色后可登录",
                "data": {
                    "user_id": user_id.to_string(),
                    "username": username,
                    "email": email,
                    "status": "pending"
                },
                "code": 0
            }))
        }
        Err(e) => {
            tracing::error!("创建用户失败: {}", e);
            Json(topems_shared_core::response::error_value(500, "注册失败"))
        }
    }
}

#[allow(
    clippy::as_conversions,
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss
)]
pub async fn refresh_token(
    State(state): State<crate::AppState>,
    headers: HeaderMap,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    // #18：HttpOnly Cookie 优先，body 降级（双轨兼容）
    let refresh_token = extract_refresh_token(&headers, &payload).unwrap_or_default();

    tracing::info!("IAM auth refresh_token called");

    if refresh_token.is_empty() {
        return (
            axum::http::StatusCode::BAD_REQUEST,
            Json(topems_shared_core::response::error_value(
                400,
                "refresh_token 不能为空",
            )),
        )
            .into_response();
    }

    let refresh_token_hash = hash_token(&refresh_token);

    // RLS FORCE：refresh 请求无 JWT，中间件不设置连接上下文；此处以系统级上下文
    // （nil 租户 + rls_system='on'）校验 token 归属，后续写路径再落真实租户上下文。
    let row = {
        let mut scope = match state.db.scope_read_system().await {
            Ok(scope) => scope,
            Err(e) => {
                tracing::error!("开启事务失败: {}", e);
                return (
                    axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                    Json(topems_shared_core::response::error_value(
                        500,
                        "内部服务器错误",
                    )),
                )
                    .into_response();
            }
        };
        let r = sqlx::query(
            "SELECT rt.user_id, u.username, u.is_superuser, u.email,
               (u.status = 'active') AS is_active,
               COALESCE(u.must_change_password, false) AS must_change_password,
               COALESCE((SELECT ARRAY_AGG(DISTINCT r.name) FROM public.core_user_roles ur
                         JOIN public.core_roles r ON r.id = ur.role_id WHERE ur.user_id = u.id), '{}') AS roles,
               COALESCE((SELECT ARRAY_AGG(DISTINCT p.code) FROM public.core_user_roles ur
                         JOIN public.core_role_permissions rp ON rp.role_id = ur.role_id
                         JOIN public.core_permissions p ON p.id = rp.permission_id WHERE ur.user_id = u.id), '{}') AS permissions,
               rt.id as refresh_token_id
             FROM public.core_refresh_tokens rt
             JOIN iam.users u ON rt.user_id = u.id
             WHERE rt.token_hash = $1 AND rt.expires_at > NOW() AND rt.revoked_at IS NULL",
        )
        .bind(&refresh_token_hash)
        .fetch_optional(&mut scope)
        .await;
        match scope.commit().await {
            Ok(()) => r,
            Err(e) => {
                tracing::error!("提交租户上下文事务失败: {}", e);
                Err(e)
            }
        }
    };

    let row = match row {
        Ok(Some(r)) => r,
        Ok(None) => {
            tracing::warn!("Refresh token 无效或已过期或已吊销");
            return (
                axum::http::StatusCode::UNAUTHORIZED,
                Json(topems_shared_core::response::error_value(
                    401,
                    "Refresh token 无效或已过期",
                )),
            )
                .into_response();
        }
        Err(e) => {
            tracing::error!("查询 refresh token 失败: {}", e);
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(topems_shared_core::response::error_value(
                    500,
                    "内部服务器错误",
                )),
            )
                .into_response();
        }
    };

    let user_id: Uuid = row.get("user_id");
    let username: String = row.get("username");
    let is_superuser: bool = row.get("is_superuser");
    let email: String = row.get("email");
    let is_active: bool = row.get("is_active");
    let must_change_password: bool = row.get("must_change_password");

    if !is_active {
        return (
            axum::http::StatusCode::UNAUTHORIZED,
            Json(topems_shared_core::response::error_value(
                401,
                "用户账号已被禁用",
            )),
        )
            .into_response();
    }

    // 生成新的 access_token
    let jwt_expire_minutes = state.auth_state.token_expiry_hours * 60;
    let now = chrono::Utc::now();
    let exp = usize::try_from((now + chrono::Duration::minutes(jwt_expire_minutes)).timestamp())
        .unwrap_or(0);

    let user_roles: Vec<String> = row
        .try_get::<Option<Vec<String>>, _>("roles")
        .unwrap_or_default()
        .unwrap_or_default();
    let user_permissions: Vec<String> = if is_superuser {
        vec!["*".to_string()]
    } else {
        row.try_get::<Option<Vec<String>>, _>("permissions")
            .unwrap_or_default()
            .unwrap_or_default()
    };

    // 查询用户所属租户；查询失败不回落默认租户（宁可 5xx），无 membership 才回落
    let tenant_id = match resolve_login_tenant(&state.db, user_id, "refresh").await {
        Ok(t) => Some(t),
        Err(_) => {
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(topems_shared_core::response::error_value(
                    500,
                    "内部服务器错误",
                )),
            )
                .into_response();
        }
    };

    // 会话/刷新令牌写入需绑定租户（RLS FORCE），提前解析为 Uuid 供 INSERT 使用
    let tenant_uuid = tenant_id.as_deref().and_then(|s| Uuid::parse_str(s).ok());
    let tenant_ctx = tenant_id.clone();

    let claims = Claims {
        sub: user_id.to_string(),
        username: username.clone(),
        role: if is_superuser {
            "admin".to_string()
        } else {
            "user".to_string()
        },
        roles: user_roles,
        permissions: user_permissions,
        is_superuser,
        exp,
        iat: usize::try_from(now.timestamp()).unwrap_or(0),
        email: Some(email),
        department: None,
        tenant_id,
        department_id: None,
        position_id: None,
        position_code: None,
        must_change_password,
    };

    // P0：刷新换发同样使用紧凑编码，避免权限码重新膨胀进 token。
    let access_token = match claims.encode_compact(&state.auth_state.jwt_secret) {
        Ok(token) => token,
        Err(e) => {
            tracing::error!("JWT 编码失败: {:?}", e);
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(topems_shared_core::response::error_value(
                    500,
                    "Token 生成失败",
                )),
            )
                .into_response();
        }
    };

    let access_token_hash = hash_token(&access_token);
    let new_refresh_token = generate_refresh_token();
    let new_refresh_token_hash = hash_token(&new_refresh_token);

    let access_expires_at =
        chrono::Utc::now() + chrono::Duration::hours(state.auth_state.token_expiry_hours);
    let refresh_expires_at =
        chrono::Utc::now() + chrono::Duration::hours(state.auth_state.token_expiry_hours * 7);

    let old_refresh_token_id: Uuid = row.get("refresh_token_id");

    let tx_result = state.pool.begin().await;
    let mut tx = match tx_result {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!("开启事务失败: {}", e);
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(topems_shared_core::response::error_value(
                    500,
                    "内部服务器错误",
                )),
            )
                .into_response();
        }
    };

    // RLS FORCE：revoke/INSERT 需真实租户上下文，并显式打开系统通道
    // （refresh 已从 core_tenant_users 解析出 tenant_id）
    if let Err(e) = sqlx::query(
        "SELECT set_config('app.tenant_id', $1, true), \
                set_config('app.rls_system', 'on', true)",
    )
    .bind(&tenant_ctx)
    .execute(&mut *tx)
    .await
    {
        tracing::error!("设置租户上下文失败: {}", e);
        let _ = tx.rollback().await;
        return (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(topems_shared_core::response::error_value(
                500,
                "内部服务器错误",
            )),
        )
            .into_response();
    }

    let revoke_result = sqlx::query(
        "UPDATE public.core_refresh_tokens
         SET revoked_at = NOW(), revoked_reason = 'rotated'
         WHERE id = $1 AND revoked_at IS NULL",
    )
    .bind(old_refresh_token_id)
    .execute(&mut *tx)
    .await;

    if let Err(e) = revoke_result {
        tracing::error!("吊销旧 refresh token 失败: {}", e);
        let _ = tx.rollback().await;
        return (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(topems_shared_core::response::error_value(
                500,
                "内部服务器错误",
            )),
        )
            .into_response();
    }

    let insert_result = sqlx::query(
        "INSERT INTO public.core_refresh_tokens (user_id, tenant_id, token_hash, expires_at)
         VALUES ($1, $2, $3, $4)",
    )
    .bind(user_id)
    .bind(tenant_uuid)
    .bind(&new_refresh_token_hash)
    .bind(refresh_expires_at)
    .execute(&mut *tx)
    .await;

    if let Err(e) = insert_result {
        tracing::error!("插入新 refresh token 失败: {}", e);
        let _ = tx.rollback().await;
        return (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(topems_shared_core::response::error_value(
                500,
                "内部服务器错误",
            )),
        )
            .into_response();
    }

    let session_result = sqlx::query(
        "INSERT INTO public.core_sessions (user_id, tenant_id, token_hash, expires_at)
         VALUES ($1, $2, $3, $4)",
    )
    .bind(user_id)
    .bind(tenant_uuid)
    .bind(&access_token_hash)
    .bind(access_expires_at)
    .execute(&mut *tx)
    .await;

    if let Err(e) = session_result {
        tracing::error!("插入新 session 失败: {}", e);
        let _ = tx.rollback().await;
        return (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(topems_shared_core::response::error_value(
                500,
                "内部服务器错误",
            )),
        )
            .into_response();
    }

    match tx.commit().await {
        Ok(_) => {
            tracing::debug!("Token 刷新成功，已旋转 refresh_token");
        }
        Err(e) => {
            tracing::error!("提交事务失败: {}", e);
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(topems_shared_core::response::error_value(
                    500,
                    "内部服务器错误",
                )),
            )
                .into_response();
        }
    }

    // #18：刷新成功同步轮换 HttpOnly Cookie（双轨：body 仍返回新 refresh_token 供降级端使用）
    let mut refresh_headers = HeaderMap::new();
    if let Ok(cookie_value) =
        build_refresh_token_cookie(&new_refresh_token, None).parse::<axum::http::HeaderValue>()
    {
        refresh_headers.insert(axum::http::header::SET_COOKIE, cookie_value);
    }

    (
        refresh_headers,
        Json(serde_json::json!({
            "success": true,
            "message": "Token刷新成功",
            "data": {
                "access_token": access_token,
                "refresh_token": new_refresh_token,
                "expires_in": jwt_expire_minutes * 60,
                "refresh_expires_in": state.auth_state.token_expiry_hours * 7 * 3600,
                "username": username,
                "is_superuser": is_superuser
            },
            "code": 0
        })),
    )
        .into_response()
        .into_response()
}

/// 用户登出接口
/// 通过请求体中的 refresh_token 哈希查找 user_id 并吊销所有会话/刷新令牌。
/// 该接口不需要 access_token（access_token 可能已过期，但用户仍希望吊销 refresh token）。
pub async fn logout(
    State(state): State<crate::AppState>,
    headers: HeaderMap,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    // #18：HttpOnly Cookie 优先，body 降级（双轨兼容）
    let refresh_token = extract_refresh_token(&headers, &payload).unwrap_or_default();

    let refresh_token = match refresh_token.as_str() {
        t if !t.is_empty() => t.to_string(),
        _ => {
            return (
                axum::http::StatusCode::BAD_REQUEST,
                Json(topems_shared_core::response::error_value(
                    400,
                    "缺少 refresh_token",
                )),
            )
                .into_response();
        }
    };

    // 通过 refresh_token 哈希查找 user_id
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(refresh_token.as_bytes());
    let token_hash = hex::encode(hasher.finalize());

    // RLS FORCE：logout 请求无 JWT，中间件不设置连接上下文；以系统级上下文
    // （nil 租户 + rls_system='on'）校验 token 归属，后续删除/吊销落真实租户上下文。
    let user_id: Result<Option<Uuid>, sqlx::Error> = {
        let mut scope = match state.db.scope_read_system().await {
            Ok(scope) => scope,
            Err(e) => {
                tracing::error!("开启事务失败: {}", e);
                return (
                    axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                    Json(topems_shared_core::response::error_value(500, "登出失败")),
                )
                    .into_response();
            }
        };
        let r = sqlx::query_scalar(
            "SELECT user_id FROM public.core_refresh_tokens WHERE token_hash = $1 AND revoked_at IS NULL",
        )
        .bind(&token_hash)
        .fetch_optional(&mut scope)
        .await;
        match scope.commit().await {
            Ok(()) => r,
            Err(e) => {
                tracing::error!("提交租户上下文事务失败: {}", e);
                Err(e)
            }
        }
    };

    let user_id = match user_id {
        Ok(uid) => uid,
        Err(e) => {
            tracing::error!("查询 refresh_token 失败: {}", e);
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(topems_shared_core::response::error_value(500, "登出失败")),
            )
                .into_response();
        }
    };

    let user_id = match user_id {
        Some(uid) => uid,
        None => {
            // token 已不存在或已吊销，视为登出成功（幂等）——清 HttpOnly Cookie
            let mut headers = HeaderMap::new();
            if let Ok(cookie_value) =
                build_refresh_token_cookie("", Some(0)).parse::<axum::http::HeaderValue>()
            {
                headers.insert(axum::http::header::SET_COOKIE, cookie_value);
            }
            return (
                headers,
                Json(serde_json::json!({
                    "success": true,
                    "message": "登出成功",
                    "data": null,
                    "code": 0
                }))
                .into_response(),
            )
                .into_response();
        }
    };

    tracing::info!("IAM auth logout called for user_id: {}", user_id);

    // 删除/吊销需真实租户上下文（logout 无 JWT，按 core_tenant_users 解析租户，
    // 未关联时 fallback 到默认租户，与 login/refresh 同口径；解析走系统通道读）
    let tenant_id = match resolve_login_tenant(&state.db, user_id, "logout").await {
        Ok(t) => Some(t),
        Err(_) => {
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(topems_shared_core::response::error_value(500, "登出失败")),
            )
                .into_response();
        }
    };

    // 删除用户会话和刷新令牌
    let mut tx = match state.pool.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!("开启事务失败: {}", e);
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(topems_shared_core::response::error_value(500, "登出失败")),
            )
                .into_response();
        }
    };

    // 删除/吊销需真实租户上下文 + 系统通道开关
    if let Err(e) = sqlx::query(
        "SELECT set_config('app.tenant_id', $1, true), \
                set_config('app.rls_system', 'on', true)",
    )
    .bind(&tenant_id)
    .execute(&mut *tx)
    .await
    {
        tracing::error!("设置租户上下文失败: {}", e);
        let _ = tx.rollback().await;
        return (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(topems_shared_core::response::error_value(500, "登出失败")),
        )
            .into_response();
    }

    let delete_sessions = sqlx::query("DELETE FROM public.core_sessions WHERE user_id = $1")
        .bind(user_id)
        .execute(&mut *tx)
        .await;

    if let Err(e) = delete_sessions {
        tracing::error!("删除会话失败: {}", e);
        let _ = tx.rollback().await;
        return (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(topems_shared_core::response::error_value(500, "登出失败")),
        )
            .into_response();
    }

    let revoke_refresh = sqlx::query(
        "UPDATE public.core_refresh_tokens SET revoked_at = NOW(), revoked_reason = 'logout'
         WHERE user_id = $1 AND revoked_at IS NULL",
    )
    .bind(user_id)
    .execute(&mut *tx)
    .await;

    if let Err(e) = revoke_refresh {
        tracing::error!("吊销 refresh token 失败: {}", e);
        let _ = tx.rollback().await;
        return (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(topems_shared_core::response::error_value(500, "登出失败")),
        )
            .into_response();
    }

    match tx.commit().await {
        Ok(_) => {
            tracing::info!("Logout successful for user_id: {}", user_id);
            // #18：登出后清 HttpOnly Cookie
            let mut headers = HeaderMap::new();
            if let Ok(cookie_value) =
                build_refresh_token_cookie("", Some(0)).parse::<axum::http::HeaderValue>()
            {
                headers.insert(axum::http::header::SET_COOKIE, cookie_value);
            }
            (
                headers,
                Json(serde_json::json!({
                    "success": true,
                    "message": "登出成功",
                    "data": null,
                    "code": 0
                })),
            )
                .into_response()
        }
        Err(e) => {
            tracing::error!("Logout commit failed: {}", e);
            Json(topems_shared_core::response::error_value(500, "登出失败")).into_response()
        }
    }
}

/// 发送密码重置邮件
pub async fn forgot_password(
    State(state): State<crate::AppState>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    let email = payload.get("email").and_then(|v| v.as_str()).unwrap_or("");

    tracing::info!("IAM auth forgot_password called for email: {}", email);

    if email.is_empty() {
        return Json(topems_shared_core::response::error_value(
            400,
            "邮箱不能为空",
        ));
    }

    // 邮件通道在 prod 不可用（SMTP 出站连接超时），改为站内通知管理员人工处置。
    // 先确认存在可受理的管理员；该检查与邮箱是否注册无关，不会泄露账号是否存在。
    // 找回密码无 Claims：系统通道读受理人
    let admin_count: Result<i64, sqlx::Error> = async {
        let mut scope = state.db.scope_read_system().await?;
        let count = sqlx::query_scalar::<_, i64>(
            r#"
        SELECT COUNT(*) FROM iam.users
        WHERE status = 'active' AND deleted_at IS NULL
          AND (is_superuser OR 'admin' = ANY(roles))
        "#,
        )
        .fetch_one(&mut scope)
        .await?;
        scope.commit().await?;
        Ok(count)
    }
    .await;
    let admin_count = match admin_count {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("查询密码重置受理人失败: {}", e);
            return Json(topems_shared_core::response::error_value(
                500,
                "内部服务器错误",
            ));
        }
    };

    if admin_count == 0 {
        tracing::error!("密码重置请求无法受理：系统未配置管理员");
        return Json(topems_shared_core::response::error_value(
            503,
            "系统未配置密码重置受理人，请联系系统管理员",
        ));
    }

    // 查找用户（系统通道读）
    let user_lookup: Result<Option<UserRow>, sqlx::Error> = async {
        let mut scope = state.db.scope_read_system().await?;
        let row = sqlx::query_as::<_, UserRow>(
            r#"
        SELECT u.id, u.username, u.email, u.password_hash, u.full_name,
          (u.status = 'active') AS is_active, u.is_superuser,
          COALESCE((SELECT ARRAY_AGG(DISTINCT r.name) FROM public.core_user_roles ur
                    JOIN public.core_roles r ON r.id = ur.role_id WHERE ur.user_id = u.id), '{}') AS roles,
          COALESCE((SELECT ARRAY_AGG(DISTINCT p.code) FROM public.core_user_roles ur
                    JOIN public.core_role_permissions rp ON rp.role_id = ur.role_id
                    JOIN public.core_permissions p ON p.id = rp.permission_id WHERE ur.user_id = u.id), '{}') AS permissions,
          u.created_at AS created_at,
          COALESCE(u.must_change_password, false) AS must_change_password
        FROM iam.users u
        WHERE u.email = $1 AND u.status = 'active' AND u.deleted_at IS NULL
        "#,
        )
        .bind(email)
        .fetch_optional(&mut scope)
        .await?;
        scope.commit().await?;
        Ok(row)
    }
    .await;
    let user = match user_lookup {
        Ok(Some(u)) => u,
        Ok(None) => {
            // 出于安全考虑，即使邮箱不存在也返回成功消息
            tracing::warn!("Password reset requested for non-existent email: {}", email);
            return Json(serde_json::json!({
                "success": true,
                "message": PASSWORD_RESET_ACK,
                "data": null,
                "code": 0
            }));
        }
        Err(e) => {
            tracing::error!("查询用户失败: {}", e);
            return Json(topems_shared_core::response::error_value(
                500,
                "内部服务器错误",
            ));
        }
    };

    // 生成密码重置令牌（有效期1小时）
    let reset_token = generate_refresh_token();
    let expires_at = chrono::Utc::now() + chrono::Duration::hours(1);

    // 保存重置令牌到数据库（系统通道写）
    let save_reset: Result<(), sqlx::Error> = async {
        let mut scope = state.db.scope_system().await?;
        sqlx::query(
            "INSERT INTO unified_core.password_resets (user_id, token, expires_at) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET token = $2, expires_at = $3",
        )
        .bind(user.id)
        .bind(&reset_token)
        .bind(expires_at)
        .execute(&mut scope)
        .await?;
        scope.commit().await?;
        Ok(())
    }
    .await;
    match save_reset {
        Ok(_) => tracing::debug!("Password reset token saved for user: {}", user.username),
        Err(e) => {
            tracing::error!("Failed to save password reset token: {}", e);
            return Json(topems_shared_core::response::error_value(
                500,
                "内部服务器错误",
            ));
        }
    }

    // 通知所有管理员人工处置（含重置令牌，便于在忘记密码页直接完成重置）。
    let notification_content = format!(
        "用户 {}（{}）请求重置密码。\n重置令牌：{}\n有效期 1 小时。可在忘记密码页使用该令牌完成重置，或在用户管理中直接重置。",
        user.username, email, reset_token
    );
    let notify_admins: Result<u64, sqlx::Error> = async {
        let mut scope = state.db.scope_system().await?;
        let result = sqlx::query(
            r#"
        INSERT INTO public.core_notifications (id, user_id, title, content, notification_type, priority, data, created_at)
        SELECT gen_random_uuid(), u.id, $1, $2, 'system', 2,
               jsonb_build_object('source', 'password_reset', 'requested_email', $3::text, 'requested_user_id', $4::text),
               NOW()
        FROM iam.users u
        WHERE u.status = 'active' AND u.deleted_at IS NULL
          AND (u.is_superuser OR EXISTS (
            SELECT 1 FROM public.core_user_roles ur
            JOIN public.core_roles r ON r.id = ur.role_id
            WHERE ur.user_id = u.id AND r.name = 'admin'
          ))
        "#,
        )
        .bind("密码重置申请")
        .bind(&notification_content)
        .bind(email)
        .bind(user.id.to_string())
        .execute(&mut scope)
        .await?;
        scope.commit().await?;
        Ok(result.rows_affected())
    }
    .await;
    match notify_admins {
        Ok(rows_affected) => tracing::info!(
            "Password reset request for {} notified {} admin(s)",
            email,
            rows_affected
        ),
        Err(e) => {
            tracing::error!("Failed to notify admins for password reset: {}", e);
            return Json(topems_shared_core::response::error_value(
                500,
                "内部服务器错误",
            ));
        }
    }

    Json(serde_json::json!({
        "success": true,
        "message": PASSWORD_RESET_ACK,
        "data": null,
        "code": 0
    }))
}

/// 重置密码
pub async fn reset_password(
    State(state): State<crate::AppState>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    let reset_token = payload
        .get("reset_token")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let new_password = payload
        .get("new_password")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    tracing::info!("IAM auth reset_password called");

    if reset_token.is_empty() || new_password.is_empty() {
        return Json(topems_shared_core::response::error_value(
            400,
            "重置令牌和新密码不能为空",
        ));
    }

    // 验证密码强度：与创建用户/改密/admin 工具同一实现
    if let Err(message) = validate_password_strength(new_password) {
        return Json(topems_shared_core::response::error_value(400, &message));
    }

    // 查询重置令牌（无 Claims：系统通道读）
    let token_lookup: Result<Option<sqlx::postgres::PgRow>, sqlx::Error> = async {
        let mut scope = state.db.scope_read_system().await?;
        let row = sqlx::query(
            "SELECT user_id FROM unified_core.password_resets WHERE token = $1 AND expires_at > NOW()",
        )
        .bind(reset_token)
        .fetch_optional(&mut scope)
        .await?;
        scope.commit().await?;
        Ok(row)
    }
    .await;
    let row = match token_lookup {
        Ok(Some(r)) => r,
        Ok(None) => {
            tracing::warn!("Invalid or expired password reset token");
            return Json(topems_shared_core::response::error_value(
                400,
                "重置令牌无效或已过期",
            ));
        }
        Err(e) => {
            tracing::error!("查询重置令牌失败: {}", e);
            return Json(topems_shared_core::response::error_value(
                500,
                "内部服务器错误",
            ));
        }
    };

    let user_id: Uuid = row.get("user_id");

    // 哈希新密码
    let password_hash = match bcrypt::hash(new_password, bcrypt::DEFAULT_COST) {
        Ok(h) => h,
        Err(e) => {
            tracing::error!("密码哈希失败: {}", e);
            return Json(topems_shared_core::response::error_value(
                500,
                "内部服务器错误",
            ));
        }
    };

    // 更新用户密码（重置密码无 Claims：整段走系统通道写）
    let mut scope = match state.db.scope_system().await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("Failed to start transaction: {}", e);
            return Json(topems_shared_core::response::error_value(
                500,
                "内部服务器错误",
            ));
        }
    };

    // 更新密码
    match sqlx::query("UPDATE iam.users SET password_hash = $1, updated_at = NOW() WHERE id = $2")
        .bind(&password_hash)
        .bind(user_id)
        .execute(&mut scope)
        .await
    {
        Ok(_) => {}
        Err(e) => {
            tracing::error!("Failed to update password: {}", e);
            let _ = scope.rollback().await;
            return Json(topems_shared_core::response::error_value(
                500,
                "密码更新失败",
            ));
        }
    }

    // 删除重置令牌（使用后立即失效）
    match sqlx::query("DELETE FROM unified_core.password_resets WHERE token = $1")
        .bind(reset_token)
        .execute(&mut scope)
        .await
    {
        Ok(_) => {}
        Err(e) => {
            tracing::error!("Failed to delete password reset token: {}", e);
            let _ = scope.rollback().await;
            return Json(topems_shared_core::response::error_value(
                500,
                "内部服务器错误",
            ));
        }
    }

    // 使所有现有会话失效
    match sqlx::query("DELETE FROM public.core_sessions WHERE user_id = $1")
        .bind(user_id)
        .execute(&mut scope)
        .await
    {
        Ok(_) => {}
        Err(e) => {
            tracing::warn!("Failed to invalidate sessions: {}", e);
        }
    }

    if scope.commit().await.is_err() {
        tracing::error!("Failed to commit transaction");
        return Json(topems_shared_core::response::error_value(
            500,
            "内部服务器错误",
        ));
    }

    tracing::info!("Password reset successful for user_id: {}", user_id);

    Json(serde_json::json!({
        "success": true,
        "message": "密码重置成功，请使用新密码登录",
        "data": null,
        "code": 0
    }))
}

/// JWT 校验端点（供 API 网关 Traefik jwt-auth forwardAuth 调用）。
/// auth_middleware 已拦截缺失/无效 token（401）；此处仅对有效 token 返回 200，
/// 并回写 X-Auth-* 透传头，供网关注入下游请求。
pub async fn verify_token(Extension(claims): Extension<Claims>) -> Response {
    let mut headers = HeaderMap::new();
    if let Ok(v) = claims.sub.parse() {
        headers.insert("X-Auth-User-Id", v);
    }
    if let Ok(v) = claims.username.parse() {
        headers.insert("X-Auth-Username", v);
    }
    if let Ok(v) = claims.roles.join(",").parse() {
        headers.insert("X-Auth-Roles", v);
    }
    if let Ok(v) = claims.tenant_id.clone().unwrap_or_default().parse() {
        headers.insert("X-Auth-Tenant", v);
    }
    if let Ok(v) = claims.permissions.join(",").parse() {
        headers.insert("X-Auth-Permissions", v);
    }
    if let Ok(v) = claims.exp.to_string().parse() {
        headers.insert("X-Auth-Token-Exp", v);
    }
    (
        headers,
        Json(serde_json::json!({
            "code": 200,
            "success": true,
            "data": { "sub": claims.sub, "username": claims.username },
            "message": "token 有效"
        })),
    )
        .into_response()
}

// ============================================================================
// 会话管理 / 安全设置（前端契约 /iam/auth/sessions、/password-policy、/security-settings）
// ============================================================================

#[derive(Serialize)]
struct SessionInfo {
    id: Uuid,
    ip_address: Option<String>,
    user_agent: Option<String>,
    device_info: Option<serde_json::Value>,
    created_at: chrono::DateTime<chrono::Utc>,
    last_active_at: chrono::DateTime<chrono::Utc>,
    expires_at: chrono::DateTime<chrono::Utc>,
    is_current: bool,
}

/// GET /iam/auth/sessions —— 当前用户活动会话列表
#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/iam/auth/sessions",
    tag = "Auto-Backfill",
    responses((status = 200, description = "get /iam/auth/sessions"), (status = 500, description = "服务内部错误")),
)]
pub async fn list_sessions(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<serde_json::Value> {
    let Ok(user_id) = claims.user_id() else {
        return Json(serde_json::json!({
            "code": 400, "success": false, "data": null, "message": "无效的用户ID"
        }));
    };
    // RLS FORCE：会话行已绑定租户（追补后），读取须带租户上下文；从 JWT claims 取租户，
    // 缺失时 fallback 默认租户（与 login 同口径）
    let tenant_ctx = claims
        .tenant_id
        .clone()
        .unwrap_or_else(|| "00000000-0000-0000-0000-000000000001".to_string());
    let rows = {
        let mut ctx_tx = match state.pool.begin().await {
            Ok(tx) => tx,
            Err(e) => {
                tracing::error!("开启事务失败: {}", e);
                return Json(serde_json::json!({
                    "code": 500, "success": false, "data": null, "message": "获取会话列表失败"
                }));
            }
        };
        if let Err(e) = sqlx::query("SELECT set_config('app.tenant_id', $1, true)")
            .bind(&tenant_ctx)
            .execute(&mut *ctx_tx)
            .await
        {
            tracing::error!("设置租户上下文失败: {}", e);
            let _ = ctx_tx.rollback().await;
            return Json(serde_json::json!({
                "code": 500, "success": false, "data": null, "message": "获取会话列表失败"
            }));
        }
        let r = sqlx::query_as::<_, (Uuid, Option<String>, Option<String>, Option<serde_json::Value>, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)>(
            "SELECT id, ip_address::text, user_agent, device_info, created_at, last_active_at, expires_at \
             FROM public.core_sessions \
             WHERE user_id = $1 AND deleted_at IS NULL AND expires_at > now() \
             ORDER BY created_at DESC",
        )
        .bind(user_id)
        .fetch_all(&mut *ctx_tx)
        .await;
        match ctx_tx.commit().await {
            Ok(()) => r,
            Err(e) => {
                tracing::error!("提交租户上下文事务失败: {}", e);
                Err(e)
            }
        }
    };

    match rows {
        Ok(rows) => {
            let data: Vec<SessionInfo> = rows
                .into_iter()
                .map(|(id, ip, ua, dev, created, last, exp)| SessionInfo {
                    id,
                    ip_address: ip,
                    user_agent: ua,
                    device_info: dev,
                    created_at: created,
                    last_active_at: last,
                    expires_at: exp,
                    is_current: false,
                })
                .collect();
            Json(serde_json::json!({
                "code": 200, "success": true, "data": data, "message": "获取会话列表成功"
            }))
        }
        Err(e) => {
            tracing::error!("获取会话列表失败: {}", e);
            Json(serde_json::json!({
                "code": 500, "success": false, "data": null, "message": "获取会话列表失败"
            }))
        }
    }
}

/// DELETE /iam/auth/sessions/{id} —— 注销指定会话（仅本人）
#[utoipa::path(
    delete,
    security(("BearerAuth" = [])),
    path = "/iam/auth/sessions/{id}",
    tag = "Auto-Backfill",
    params(
        ("id" = String, Path, description = "id"),
    ),
    responses((status = 200, description = "delete /iam/auth/sessions/{id}"), (status = 500, description = "服务内部错误")),
)]
pub async fn delete_session(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
) -> Json<serde_json::Value> {
    let Ok(user_id) = claims.user_id() else {
        return Json(serde_json::json!({
            "code": 400, "success": false, "data": null, "message": "无效的用户ID"
        }));
    };
    // RLS FORCE：会话行已绑定租户（追补后），写路径须带租户上下文；从 JWT claims 取租户
    let tenant_ctx = claims
        .tenant_id
        .clone()
        .unwrap_or_else(|| "00000000-0000-0000-0000-000000000001".to_string());
    let result = {
        let mut ctx_tx = match state.pool.begin().await {
            Ok(tx) => tx,
            Err(e) => {
                tracing::error!("开启事务失败: {}", e);
                return Json(serde_json::json!({
                    "code": 500, "success": false, "data": null, "message": "注销会话失败"
                }));
            }
        };
        if let Err(e) = sqlx::query("SELECT set_config('app.tenant_id', $1, true)")
            .bind(&tenant_ctx)
            .execute(&mut *ctx_tx)
            .await
        {
            tracing::error!("设置租户上下文失败: {}", e);
            let _ = ctx_tx.rollback().await;
            return Json(serde_json::json!({
                "code": 500, "success": false, "data": null, "message": "注销会话失败"
            }));
        }
        let r = sqlx::query(
            "UPDATE public.core_sessions SET deleted_at = now() \
             WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL",
        )
        .bind(id)
        .bind(user_id)
        .execute(&mut *ctx_tx)
        .await;
        match ctx_tx.commit().await {
            Ok(()) => r,
            Err(e) => {
                tracing::error!("提交租户上下文事务失败: {}", e);
                Err(e)
            }
        }
    };

    match result {
        Ok(res) if res.rows_affected() > 0 => Json(serde_json::json!({
            "code": 200, "success": true, "data": null, "message": "会话已注销"
        })),
        Ok(_) => Json(serde_json::json!({
            "code": 404, "success": false, "data": null, "message": "会话不存在或已注销"
        })),
        Err(e) => {
            tracing::error!("注销会话失败: {}", e);
            Json(serde_json::json!({
                "code": 500, "success": false, "data": null, "message": "注销会话失败"
            }))
        }
    }
}

/// GET /iam/auth/password-policy —— 密码策略
#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/iam/auth/password-policy",
    tag = "Auto-Backfill",
    responses((status = 200, description = "get /iam/auth/password-policy"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_password_policy() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "code": 200, "success": true,
        "data": {
            "min_length": 8,
            "max_length": 64,
            "require_uppercase": true,
            "require_lowercase": true,
            "require_digit": true,
            "require_special_char": false,
            "password_expiry_days": 90,
            "cannot_reuse_last": 5
        },
        "message": "获取密码策略成功"
    }))
}

/// GET /iam/auth/security-settings —— 安全设置
#[utoipa::path(
    get,
    security(("BearerAuth" = [])),
    path = "/iam/auth/security-settings",
    tag = "Auto-Backfill",
    responses((status = 200, description = "get /iam/auth/security-settings"), (status = 500, description = "服务内部错误")),
)]
pub async fn get_security_settings() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "code": 200, "success": true,
        "data": {
            "session_timeout_minutes": 120,
            "refresh_token_rotation": true,
            "mfa_enabled": false,
            "login_attempt_limit": 5,
            "lockout_duration_minutes": 30,
            "ip_allowlist_enabled": false
        },
        "message": "获取安全设置成功"
    }))
}

/// 用户 membership 候选行（`public.core_tenant_users`）。
#[derive(Debug, Clone, sqlx::FromRow)]
struct MembershipRow {
    id: Uuid,
    tenant_id: Uuid,
    status: String,
    deleted_at: Option<chrono::DateTime<chrono::Utc>>,
    created_at: Option<chrono::DateTime<chrono::Utc>>,
}

/// 在候选 membership 中做**确定性排序**（不是“默认公司/默认租户”语义）。
///
/// 规则（与产品口径一致）：
/// 1) 只保留 `status='active'` 且未软删的行；
/// 2) 首次绑定优先（`created_at` 早者优先，NULL 视为最晚）；
/// 3) 同一时刻按 `id` 兜底，保证同一用户每次登录得到同一租户。
///
/// 表上目前没有 `is_default` 列；若产品需要“默认租户”语义，应新增该列并
/// 调整本函数优先级（TODO 已登记），不得用排序规则去模拟产品默认值。
fn pick_membership_tenant(rows: Vec<MembershipRow>) -> Option<Uuid> {
    use std::cmp::Ordering;

    rows.into_iter()
        .filter(|r| r.status == "active" && r.deleted_at.is_none())
        .min_by(|a, b| {
            match (a.created_at, b.created_at) {
                (Some(x), Some(y)) => x.cmp(&y),
                (Some(_), None) => Ordering::Less,
                (None, Some(_)) => Ordering::Greater,
                (None, None) => Ordering::Equal,
            }
            .then_with(|| a.id.cmp(&b.id))
        })
        .map(|r| r.tenant_id)
}

/// 解析用户所属租户（login / refresh / logout 共用）。
///
/// `public.core_tenant_users` 受 ENABLE+FORCE RLS 保护。这几条认证引导路径都发生在
/// 租户确定之前、且无 JWT，`tenant_middleware` 不会设置 `app.tenant_id`；因此不能
/// 用请求通道（fail-closed）或裸池（0 行）。这里走系统通道（显式 nil 租户 +
/// `app.rls_system='on'`），只读取 `user_id` 命中的 membership 行；解析出的真实租户
/// 随后用于会话/令牌的租户上下文。
///
/// 返回 `Err` 时调用方必须拒绝登录（不得回落默认租户）；`Ok(None)` 表示确实没有
/// 可用的 active membership。
async fn resolve_membership_tenant(db: &Db, user_id: Uuid) -> Result<Option<Uuid>, sqlx::Error> {
    let mut scope = db.scope_read_system().await?;
    let rows = sqlx::query_as::<_, MembershipRow>(
        "SELECT id, tenant_id, status, deleted_at, created_at \
         FROM public.core_tenant_users WHERE user_id = $1 \
         ORDER BY created_at ASC NULLS LAST, id ASC",
    )
    .bind(user_id)
    .fetch_all(&mut scope)
    .await?;
    scope.commit().await?;
    Ok(pick_membership_tenant(rows))
}

/// 登录链路统一入口：`Err` 不回落；`Ok(None)` 回落默认租户并留痕。
async fn resolve_login_tenant(
    db: &Db,
    user_id: Uuid,
    path: &'static str,
) -> Result<String, sqlx::Error> {
    match resolve_membership_tenant(db, user_id).await {
        Ok(Some(tenant)) => Ok(tenant.to_string()),
        Ok(None) => {
            membership_fallback_metric()
                .with_label_values(&[path])
                .inc();
            tracing::warn!(
                user_id = %user_id,
                path = path,
                default_tenant = DEFAULT_TENANT_ID,
                "用户无 active membership，回落默认租户"
            );
            Ok(DEFAULT_TENANT_ID.to_string())
        }
        Err(e) => {
            membership_lookup_error_metric()
                .with_label_values(&[path])
                .inc();
            tracing::error!(
                user_id = %user_id,
                path = path,
                "查询用户 membership 失败，拒绝回落默认租户: {}",
                e
            );
            Err(e)
        }
    }
}

#[cfg(test)]
mod membership_tests {
    use super::*;

    fn row(id: u128, tenant: u128, status: &str, deleted: bool, secs: i64) -> MembershipRow {
        MembershipRow {
            id: Uuid::from_u128(id),
            tenant_id: Uuid::from_u128(tenant),
            status: status.to_string(),
            deleted_at: deleted.then(|| {
                chrono::DateTime::<chrono::Utc>::from_timestamp(secs + 1_000, 0).unwrap_or_default()
            }),
            created_at: chrono::DateTime::<chrono::Utc>::from_timestamp(secs, 0),
        }
    }

    #[test]
    fn multiple_memberships_pick_same_tenant_in_any_order() {
        let t1 = 0x1u128;
        let t2 = 0x2u128;
        let candidates = vec![
            row(0x20, t2, "active", false, 200),
            row(0x10, t1, "active", false, 100),
        ];

        let mut expected = None;
        for shift in 0..8 {
            let mut shuffled = candidates.clone();
            let len = shuffled.len();
            shuffled.rotate_left(shift % len);
            let picked = pick_membership_tenant(shuffled);
            assert_eq!(picked, Some(Uuid::from_u128(t1)));
            if let Some(prev) = expected {
                assert_eq!(Some(prev), picked, "同一用户多次解析必须得到同一租户");
            }
            expected = picked;
        }
    }

    #[test]
    fn soft_deleted_and_inactive_memberships_are_ignored() {
        let picked = pick_membership_tenant(vec![
            row(0x30, 0x3, "active", true, 1),
            row(0x40, 0x4, "inactive", false, 2),
            row(0x50, 0x5, "active", false, 3),
        ]);
        assert_eq!(picked, Some(Uuid::from_u128(0x5)));
    }

    #[test]
    fn no_membership_returns_none() {
        assert_eq!(
            pick_membership_tenant(vec![row(0x60, 0x6, "active", true, 1)]),
            None
        );
    }
}

/// 产品密码策略：最少 8 位、最多 64 字节，且同时包含大写、小写和数字。
///
/// 与 `GET /iam/auth/password-policy` 声明保持一致；初始管理员工具、
/// 用户创建、用户改密统一调用本函数，避免供给侧与 API 侧出现双口径。
pub const PASSWORD_MIN_LENGTH: usize = 8;
pub const PASSWORD_MAX_LENGTH: usize = 64;

pub fn validate_password_strength(password: &str) -> Result<(), String> {
    if password.is_empty() {
        return Err("密码不能为空".to_string());
    }
    if password.chars().count() < PASSWORD_MIN_LENGTH {
        return Err(format!("密码长度不能少于 {PASSWORD_MIN_LENGTH} 位"));
    }
    if password.len() > PASSWORD_MAX_LENGTH {
        return Err(format!("密码长度不能超过 {PASSWORD_MAX_LENGTH} 字节"));
    }
    let has_upper = password.chars().any(char::is_uppercase);
    let has_lower = password.chars().any(char::is_lowercase);
    let has_digit = password.chars().any(|c| c.is_ascii_digit());
    if !has_upper || !has_lower || !has_digit {
        return Err("密码必须同时包含大写字母、小写字母和数字".to_string());
    }
    Ok(())
}

/// 密码校验（登录 / 初始管理员工具共用同一实现）
///
/// 对外公开以便 `topems-admin-pass` 在生成哈希后做正向自校验，
/// 保证「供给写入的哈希」与「登录校验」使用同一函数，而非另写一套 bcrypt 调用。
pub fn verify_password(password: &str, password_hash: &str) -> bool {
    match bcrypt::verify(password, password_hash) {
        Ok(result) => result,
        Err(e) => {
            tracing::error!("Password verification error: hash may be corrupted - {}", e);
            false
        }
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
mod tests {
    use super::*;

    #[test]
    fn test_hash_token_deterministic() {
        let token1 = "test-jwt-token-12345";
        let hash1 = hash_token(token1);
        let hash2 = hash_token(token1);
        assert_eq!(hash1, hash2);
        assert_eq!(hash1.len(), 64);
    }

    #[test]
    fn test_hash_token_different_inputs() {
        let hash_a = hash_token("token-a");
        let hash_b = hash_token("token-b");
        assert_ne!(hash_a, hash_b);
        assert_eq!(hash_a.len(), 64);
        assert!(hash_a.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn test_hash_token_empty_string() {
        let hash = hash_token("");
        assert_eq!(hash.len(), 64);
        assert_ne!(hash, hash_token("non-empty"));
    }

    #[test]
    fn test_hash_token_is_hex() {
        let inputs = ["", "short", "a-long-token-with-special-chars-!@#$%"];
        for input in inputs {
            let hash = hash_token(input);
            assert!(
                hash.chars().all(|c| c.is_ascii_hexdigit()),
                "Hash should be hex string for input: {}",
                input
            );
        }
    }

    #[test]
    fn test_verify_password_with_bcrypt() {
        let password = "TestPass123!";
        let hash = bcrypt::hash(password, bcrypt::DEFAULT_COST).unwrap();
        assert!(verify_password(password, &hash));
        assert!(!verify_password("WrongPassword1!", &hash));
    }

    #[test]
    fn test_verify_password_invalid_hash() {
        let result = verify_password("any-password", "not-a-valid-bcrypt-hash");
        assert!(!result);
    }

    #[test]
    fn test_login_request_serde() {
        let json = serde_json::json!({
            "username": "admin",
            "password": "Secret123"
        });
        let req: LoginRequest = serde_json::from_value(json).unwrap();
        assert_eq!(req.username, "admin");
        assert_eq!(req.password, "Secret123");
        let cloned = req.clone();
        assert_eq!(cloned.username, "admin");
    }

    #[test]
    fn test_register_request_serde() {
        let json = serde_json::json!({
            "username": "test_user",
            "email": "test@example.com",
            "password": "Pass12345",
            "full_name": "Test User"
        });
        let req: RegisterRequest = serde_json::from_value(json).unwrap();
        assert_eq!(req.username, "test_user");
        assert_eq!(req.email, "test@example.com");
        assert_eq!(req.full_name, Some("Test User".to_string()));
        let cloned = req.clone();
        assert_eq!(cloned.username, "test_user");
    }

    #[test]
    fn test_login_response_data_serde() {
        let lrd = LoginResponseData {
            access_token: "eyJhbGciOiJ...".to_string(),
            refresh_token: "refresh-token-abc".to_string(),
            token_type: "Bearer".to_string(),
            expires_in: 3600,
            user: UserInfo {
                id: "uuid-1".to_string(),
                username: "alice".to_string(),
                email: "alice@example.com".to_string(),
                full_name: Some("Alice".to_string()),
                is_active: true,
                is_superuser: false,
                created_at: Some(
                    chrono::DateTime::parse_from_rfc3339("2024-01-01T00:00:00Z")
                        .unwrap()
                        .with_timezone(&chrono::Utc),
                ),
                roles: vec!["user".to_string()],
                permissions: vec!["iam:read".to_string()],
                must_change_password: false,
            },
        };
        let json =
            serde_json::to_string(&lrd).unwrap_or_else(|e| panic!("serde serialize failed: {e}"));
        let de: LoginResponseData = serde_json::from_str(&json).unwrap();
        assert_eq!(de.token_type, "Bearer");
        assert_eq!(de.expires_in, 3600);
        assert_eq!(de.user.username, "alice");
    }
}
