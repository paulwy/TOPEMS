use axum::http::HeaderMap;
use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use sqlx::Row;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::modules::audit::record_login_event;
use topems_shared_auth::auth::generate_refresh_token;
use topems_shared_auth::auth::Claims;

fn send_email_async(
    from: String,
    to: String,
    subject: String,
    body: String,
    html_body: Option<String>,
    cc: Option<Vec<String>>,
    bcc: Option<Vec<String>>,
) {
    tokio::spawn(async move {
        let client = reqwest::Client::new();
        let endpoint = std::env::var("COMMUNICATION_SERVICE_URL")
            .unwrap_or_else(|_| "http://localhost:8084".to_string());
        let params = serde_json::json!({
            "from": from,
            "to": to,
            "subject": subject,
            "body": body,
            "html_body": html_body,
            "cc": cc,
            "bcc": bcc,
        });
        match client
            .post(format!("{}/api/communication/mail/send", endpoint))
            .json(&params)
            .send()
            .await
        {
            Ok(res) if res.status().is_success() => {
                tracing::info!("Async email sent successfully to: {}", to)
            }
            Ok(res) => tracing::error!(
                "Async email sending failed with status {}: {}",
                res.status(),
                to
            ),
            Err(e) => tracing::error!("Async email sending failed: {}", e),
        }
    });
}

fn hash_token(token: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(token.as_bytes());
    let result = hasher.finalize();
    format!("{:x}", result)
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
}

#[derive(Debug, Clone, Serialize, ToSchema)]
#[schema(as = LoginResponseData)]
struct LoginResponseData {
    access_token: String,
    refresh_token: String,
    token_type: String,
    expires_in: i64,
    user: UserInfo,
}

#[derive(Debug, Clone, Serialize)]
struct UserInfo {
    id: String,
    username: String,
    email: String,
    full_name: Option<String>,
    is_active: bool,
    is_superuser: bool,
    created_at: Option<String>,
    roles: Vec<String>,
    permissions: Vec<String>,
}

#[utoipa::path(
    post,
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
pub async fn login(
    State(state): State<crate::AppState>,
    headers: HeaderMap,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
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
        let _ = record_login_event(
            &state.pool,
            Uuid::nil(),
            None,
            username,
            ip_addr_opt,
            user_agent.as_deref(),
            "failed",
            Some("用户名和密码不能为空"),
        )
        .await;
        return Json(serde_json::json!({
            "success": false,
            "message": "用户名和密码不能为空",
            "data": null,
            "code": 400
        }));
    }

    let user = match sqlx::query_as::<_, UserRow>(
        "SELECT id, username, password_hash, email, full_name, is_active, is_superuser, roles, permissions, created_at FROM iam.users WHERE username = $1 OR email = $1",
    )
    .bind(username)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(u)) => u,
        Ok(None) => {
            tracing::warn!("Login failed: user not found - {}", username);
            let _ = record_login_event(
                &state.pool,
                Uuid::nil(),
                None,
                username,
                ip_addr_opt,
                user_agent.as_deref(),
                "failed",
                Some("用户不存在"),
            )
            .await;
            return Json(serde_json::json!({
                "success": false,
                "message": "用户名或密码错误",
                "data": null,
                "code": 401
            }));
        }
        Err(e) => {
            tracing::error!("查询用户失败: {}", e);
            let _ = record_login_event(
                &state.pool,
                Uuid::nil(),
                None,
                username,
                ip_addr_opt,
                user_agent.as_deref(),
                "failed",
                Some("内部服务器错误"),
            )
            .await;
            return Json(serde_json::json!({
                "success": false,
                "message": "内部服务器错误",
                "data": null,
                "code": 500
            }));
        }
    };

    if !user.is_active {
        tracing::warn!("Login failed: user is not active - {}", username);
        let _ = record_login_event(
            &state.pool,
            Uuid::nil(),
            Some(user.id),
            &user.username,
            ip_addr_opt,
            user_agent.as_deref(),
            "failed",
            Some("用户账号已被禁用"),
        )
        .await;
        return Json(serde_json::json!({
            "success": false,
            "message": "用户账号已被禁用",
            "data": null,
            "code": 401
        }));
    }

    if !verify_password(password, &user.password_hash) {
        tracing::warn!("Login failed: invalid password for user - {}", username);
        let _ = record_login_event(
            &state.pool,
            Uuid::nil(),
            Some(user.id),
            &user.username,
            ip_addr_opt,
            user_agent.as_deref(),
            "failed",
            Some("密码错误"),
        )
        .await;
        return Json(serde_json::json!({
            "success": false,
            "message": "用户名或密码错误",
            "data": null,
            "code": 401
        }));
    }

    let jwt_expire_minutes = state.auth_state.token_expiry_hours * 60;

    let user_roles = user.roles.clone().unwrap_or_default();
    let user_permissions = if user.is_superuser {
        vec!["*".to_string()]
    } else {
        user.permissions.clone().unwrap_or_default()
    };

    // 查询用户所属租户
    let tenant_id = match sqlx::query_scalar::<_, uuid::Uuid>(
        "SELECT tenant_id FROM core_tenant_users WHERE user_id = $1 AND status = 'active' LIMIT 1",
    )
    .bind(&user.id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(tid)) => Some(tid.to_string()),
        Ok(None) => None,
        Err(e) => {
            tracing::warn!("查询用户租户信息失败: {}", e);
            None
        }
    };

    // 创建完整的 Claims，包含用户的真实 is_superuser 状态
    let now = chrono::Utc::now();
    let exp = (now + chrono::Duration::minutes(jwt_expire_minutes)).timestamp() as usize;
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
        iat: now.timestamp() as usize,
        email: Some(user.email.clone()),
        department: None,
        tenant_id,
        department_id: None,
        position_id: None,
        position_code: None,
    };

    let access_token = match claims.encode(&state.auth_state.jwt_secret) {
        Ok(token) => token,
        Err(e) => {
            tracing::error!("JWT 编码失败: {:?}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "Token 生成失败",
                "data": null,
                "code": 500
            }));
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

    let insert_session_result = sqlx::query(
        "INSERT INTO iam.sessions (user_id, token_hash, ip_address, user_agent, expires_at)
         VALUES ($1, $2, $3::inet, $4, $5)",
    )
    .bind(&user.id)
    .bind(&access_token_hash)
    .bind(ip_addr_opt)
    .bind(user_agent.as_deref())
    .bind(&access_expires_at)
    .execute(&state.pool)
    .await;

    match insert_session_result {
        Ok(_) => tracing::debug!("会话保存成功"),
        Err(e) => tracing::warn!("会话保存失败: {}", e),
    }

    let insert_refresh_result = sqlx::query(
        "INSERT INTO iam.refresh_tokens (user_id, token_hash, ip_address, user_agent, expires_at)
         VALUES ($1, $2, $3::inet, $4, $5)",
    )
    .bind(&user.id)
    .bind(&refresh_token_hash)
    .bind(ip_addr_opt)
    .bind(user_agent.as_deref())
    .bind(&refresh_expires_at)
    .execute(&state.pool)
    .await;

    match insert_refresh_result {
        Ok(_) => tracing::debug!("Refresh token 保存成功"),
        Err(e) => tracing::warn!("Refresh token 保存失败: {}", e),
    }

    let username_clone = user.username.clone();

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
            created_at: user.created_at.map(|t| t.to_string()),
            roles: user_roles,
            permissions: user_permissions,
        },
    };

    tracing::info!("Login successful for user: {}", username);

    let _ = record_login_event(
        &state.pool,
        Uuid::nil(),
        Some(user.id),
        &username_clone,
        ip_addr_opt,
        user_agent.as_deref(),
        "success",
        None,
    )
    .await;

    Json(serde_json::json!({
        "success": true,
        "message": "登录成功",
        "data": response_data,
        "code": 0
    }))
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

    tracing::info!("IAM auth register called with username: {}", username);

    // 验证必填字段
    if username.is_empty() || email.is_empty() || password.is_empty() {
        return Json(serde_json::json!({
            "success": false,
            "message": "用户名、邮箱和密码不能为空",
            "data": null,
            "code": 400
        }));
    }

    // 验证用户名格式（3-20字符，只允许字母、数字、下划线）
    if !username
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '_')
        || username.len() < 3
        || username.len() > 20
    {
        return Json(serde_json::json!({
            "success": false,
            "message": "用户名必须为3-20个字符，只允许字母、数字和下划线",
            "data": null,
            "code": 400
        }));
    }

    // 验证邮箱格式
    if !email.contains('@') || !email.contains('.') {
        return Json(serde_json::json!({
            "success": false,
            "message": "请输入有效的邮箱地址",
            "data": null,
            "code": 400
        }));
    }

    // 验证密码强度（至少8字符，包含数字和字母）
    if password.len() < 8
        || !password.chars().any(|c| c.is_ascii_alphabetic())
        || !password.chars().any(|c| c.is_ascii_digit())
    {
        return Json(serde_json::json!({
            "success": false,
            "message": "密码至少8个字符，必须包含字母和数字",
            "data": null,
            "code": 400
        }));
    }

    // 检查用户名是否已存在
    match sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM iam.users WHERE username = $1")
        .bind(username)
        .fetch_one(&state.pool)
        .await
    {
        Ok(count) if count > 0 => {
            return Json(serde_json::json!({
                "success": false,
                "message": "用户名已存在",
                "data": null,
                "code": 409
            }));
        }
        Ok(_) => {}
        Err(e) => {
            tracing::error!("查询用户失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "内部服务器错误",
                "data": null,
                "code": 500
            }));
        }
    }

    // 检查邮箱是否已存在
    match sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM iam.users WHERE email = $1")
        .bind(email)
        .fetch_one(&state.pool)
        .await
    {
        Ok(count) if count > 0 => {
            return Json(serde_json::json!({
                "success": false,
                "message": "邮箱已被注册",
                "data": null,
                "code": 409
            }));
        }
        Ok(_) => {}
        Err(e) => {
            tracing::error!("查询用户失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "内部服务器错误",
                "data": null,
                "code": 500
            }));
        }
    }

    // 哈希密码
    let password_hash = match bcrypt::hash(password, bcrypt::DEFAULT_COST) {
        Ok(h) => h,
        Err(e) => {
            tracing::error!("密码哈希失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "内部服务器错误",
                "data": null,
                "code": 500
            }));
        }
    };

    // 创建用户
    let user_id = Uuid::new_v4();
    match sqlx::query(
        r#"
        INSERT INTO iam.users (id, username, email, password_hash, full_name, is_active, is_superuser)
        VALUES ($1, $2, $3, $4, $5, true, false)
        "#,
    )
    .bind(user_id)
    .bind(username)
    .bind(email)
    .bind(&password_hash)
    .bind(&full_name)
    .execute(&state.pool)
    .await
    {
        Ok(_) => {
            tracing::info!("用户注册成功: {}", username);
            Json(serde_json::json!({
                "success": true,
                "message": "注册成功",
                "data": {
                    "user_id": user_id.to_string(),
                    "username": username,
                    "email": email
                },
                "code": 0
            }))
        }
        Err(e) => {
            tracing::error!("创建用户失败: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": "注册失败",
                "data": null,
                "code": 500
            }))
        }
    }
}

pub async fn refresh_token(
    State(state): State<crate::AppState>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    let refresh_token = payload
        .get("refresh_token")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    tracing::info!("IAM auth refresh_token called");

    if refresh_token.is_empty() {
        return Json(serde_json::json!({
            "success": false,
            "message": "refresh_token 不能为空",
            "data": null,
            "code": 400
        }));
    }

    let refresh_token_hash = hash_token(refresh_token);

    let row = match sqlx::query(
        "SELECT rt.user_id, u.username, u.is_superuser, u.email, u.is_active, u.roles, u.permissions, rt.id as refresh_token_id
         FROM iam.refresh_tokens rt
         JOIN iam.users u ON rt.user_id = u.id
         WHERE rt.token_hash = $1 AND rt.expires_at > NOW() AND rt.revoked_at IS NULL",
    )
    .bind(&refresh_token_hash)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(r)) => r,
        Ok(None) => {
            tracing::warn!("Refresh token 无效或已过期或已吊销");
            return Json(serde_json::json!({
                "success": false,
                "message": "Refresh token 无效或已过期",
                "data": null,
                "code": 401
            }));
        }
        Err(e) => {
            tracing::error!("查询 refresh token 失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "内部服务器错误",
                "data": null,
                "code": 500
            }));
        }
    };

    let user_id: Uuid = row.get("user_id");
    let username: String = row.get("username");
    let is_superuser: bool = row.get("is_superuser");
    let email: String = row.get("email");
    let is_active: bool = row.get("is_active");

    if !is_active {
        return Json(serde_json::json!({
            "success": false,
            "message": "用户账号已被禁用",
            "data": null,
            "code": 401
        }));
    }

    // 生成新的 access_token
    let jwt_expire_minutes = state.auth_state.token_expiry_hours * 60;
    let now = chrono::Utc::now();
    let exp = (now + chrono::Duration::minutes(jwt_expire_minutes)).timestamp() as usize;

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

    // 查询用户所属租户
    let tenant_id = match sqlx::query_scalar::<_, uuid::Uuid>(
        "SELECT tenant_id FROM core_tenant_users WHERE user_id = $1 AND status = 'active' LIMIT 1",
    )
    .bind(&user_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(tid)) => Some(tid.to_string()),
        Ok(None) => None,
        Err(e) => {
            tracing::warn!("查询用户租户信息失败: {}", e);
            None
        }
    };

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
        iat: now.timestamp() as usize,
        email: Some(email),
        department: None,
        tenant_id,
        department_id: None,
        position_id: None,
        position_code: None,
    };

    let access_token = match claims.encode(&state.auth_state.jwt_secret) {
        Ok(token) => token,
        Err(e) => {
            tracing::error!("JWT 编码失败: {:?}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "Token 生成失败",
                "data": null,
                "code": 500
            }));
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
            return Json(serde_json::json!({
                "success": false,
                "message": "内部服务器错误",
                "data": null,
                "code": 500
            }));
        }
    };

    let revoke_result = sqlx::query(
        "UPDATE iam.refresh_tokens
         SET revoked_at = NOW(), revoked_reason = 'rotated'
         WHERE id = $1 AND revoked_at IS NULL",
    )
    .bind(&old_refresh_token_id)
    .execute(&mut *tx)
    .await;

    if let Err(e) = revoke_result {
        tracing::error!("吊销旧 refresh token 失败: {}", e);
        let _ = tx.rollback().await;
        return Json(serde_json::json!({
            "success": false,
            "message": "内部服务器错误",
            "data": null,
            "code": 500
        }));
    }

    let insert_result = sqlx::query(
        "INSERT INTO iam.refresh_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)",
    )
    .bind(&user_id)
    .bind(&new_refresh_token_hash)
    .bind(&refresh_expires_at)
    .execute(&mut *tx)
    .await;

    if let Err(e) = insert_result {
        tracing::error!("插入新 refresh token 失败: {}", e);
        let _ = tx.rollback().await;
        return Json(serde_json::json!({
            "success": false,
            "message": "内部服务器错误",
            "data": null,
            "code": 500
        }));
    }

    let session_result = sqlx::query(
        "INSERT INTO iam.sessions (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)",
    )
    .bind(&user_id)
    .bind(&access_token_hash)
    .bind(&access_expires_at)
    .execute(&mut *tx)
    .await;

    if let Err(e) = session_result {
        tracing::error!("插入新 session 失败: {}", e);
        let _ = tx.rollback().await;
        return Json(serde_json::json!({
            "success": false,
            "message": "内部服务器错误",
            "data": null,
            "code": 500
        }));
    }

    match tx.commit().await {
        Ok(_) => {
            tracing::debug!("Token 刷新成功，已旋转 refresh_token");
        }
        Err(e) => {
            tracing::error!("提交事务失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "内部服务器错误",
                "data": null,
                "code": 500
            }));
        }
    }

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
    }))
}

/// 用户登出接口
/// 通过请求体中的 refresh_token 哈希查找 user_id 并吊销所有会话/刷新令牌。
/// 该接口不需要 access_token（access_token 可能已过期，但用户仍希望吊销 refresh token）。
pub async fn logout(
    State(state): State<crate::AppState>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    let refresh_token = payload
        .get("refresh_token")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let refresh_token = match refresh_token {
        Some(t) if !t.is_empty() => t,
        _ => {
            return Json(serde_json::json!({
                "success": false,
                "message": "缺少 refresh_token",
                "data": null,
                "code": 400
            }));
        }
    };

    // 通过 refresh_token 哈希查找 user_id
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(refresh_token.as_bytes());
    let token_hash = format!("{:x}", hasher.finalize());

    let user_id: Option<Uuid> = match sqlx::query_scalar(
        "SELECT user_id FROM iam.refresh_tokens WHERE token_hash = $1 AND revoked_at IS NULL",
    )
    .bind(&token_hash)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(uid) => uid,
        Err(e) => {
            tracing::error!("查询 refresh_token 失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "登出失败",
                "data": null,
                "code": 500
            }));
        }
    };

    let user_id = match user_id {
        Some(uid) => uid,
        None => {
            // token 已不存在或已吊销，视为登出成功（幂等）
            return Json(serde_json::json!({
                "success": true,
                "message": "登出成功",
                "data": null,
                "code": 0
            }));
        }
    };

    tracing::info!("IAM auth logout called for user_id: {}", user_id);

    // 删除用户会话和刷新令牌
    let mut tx = match state.pool.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!("开启事务失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "登出失败",
                "data": null,
                "code": 500
            }));
        }
    };

    let delete_sessions = sqlx::query("DELETE FROM iam.sessions WHERE user_id = $1")
        .bind(user_id)
        .execute(&mut *tx)
        .await;

    if let Err(e) = delete_sessions {
        tracing::error!("删除会话失败: {}", e);
        let _ = tx.rollback().await;
        return Json(serde_json::json!({
            "success": false,
            "message": "登出失败",
            "data": null,
            "code": 500
        }));
    }

    let revoke_refresh = sqlx::query(
        "UPDATE iam.refresh_tokens SET revoked_at = NOW(), revoked_reason = 'logout'
         WHERE user_id = $1 AND revoked_at IS NULL",
    )
    .bind(user_id)
    .execute(&mut *tx)
    .await;

    if let Err(e) = revoke_refresh {
        tracing::error!("吊销 refresh token 失败: {}", e);
        let _ = tx.rollback().await;
        return Json(serde_json::json!({
            "success": false,
            "message": "登出失败",
            "data": null,
            "code": 500
        }));
    }

    match tx.commit().await {
        Ok(_) => {
            tracing::info!("Logout successful for user_id: {}", user_id);
            Json(serde_json::json!({
                "success": true,
                "message": "登出成功",
                "data": null,
                "code": 0
            }))
        }
        Err(e) => {
            tracing::error!("Logout commit failed: {}", e);
            Json(serde_json::json!({
                "success": false,
                "message": "登出失败",
                "data": null,
                "code": 500
            }))
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
        return Json(serde_json::json!({
            "success": false,
            "message": "邮箱不能为空",
            "data": null,
            "code": 400
        }));
    }

    // 查找用户
    let user = match sqlx::query_as::<_, UserRow>(
        "SELECT id, username, email, password_hash, full_name, is_active, is_superuser, roles, permissions, created_at FROM iam.users WHERE email = $1 AND is_active = true",
    )
    .bind(email)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(u)) => u,
        Ok(None) => {
            // 出于安全考虑，即使邮箱不存在也返回成功消息
            tracing::warn!("Password reset requested for non-existent email: {}", email);
            return Json(serde_json::json!({
                "success": true,
                "message": "如果该邮箱已注册，您将收到密码重置邮件",
                "data": null,
                "code": 0
            }));
        }
        Err(e) => {
            tracing::error!("查询用户失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "内部服务器错误",
                "data": null,
                "code": 500
            }));
        }
    };

    // 生成密码重置令牌（有效期1小时）
    let reset_token = generate_refresh_token();
    let expires_at = chrono::Utc::now() + chrono::Duration::hours(1);

    // 保存重置令牌到数据库
    match sqlx::query(
        "INSERT INTO unified_core.password_resets (user_id, token, expires_at) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET token = $2, expires_at = $3",
    )
    .bind(user.id)
    .bind(&reset_token)
    .bind(&expires_at)
    .execute(&state.pool)
    .await
    {
        Ok(_) => tracing::debug!("Password reset token saved for user: {}", user.username),
        Err(e) => {
            tracing::error!("Failed to save password reset token: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "内部服务器错误",
                "data": null,
                "code": 500
            }));
        }
    }

    // 发送密码重置邮件
    let subject = "TOPEMS 密码重置".to_string();
    let body = format!(
        "尊敬的用户：\n\n您请求重置 TOPEMS 账户密码。\n\n重置令牌：{}\n\n请在1小时内使用此令牌重置密码。\n如果您没有发起此请求，请忽略此邮件。\n\n此致\nTOPEMS 团队",
        reset_token
    );
    let html_body = format!(
        r#"
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">密码重置</h2>
            <p>尊敬的用户：</p>
            <p>您请求重置 TOPEMS 账户密码。</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <strong>重置令牌：</strong>
                <code style="font-size: 16px; color: #2563eb;">{}</code>
            </div>
            <p>请在1小时内使用此令牌重置密码。</p>
            <p>如果您没有发起此请求，请忽略此邮件。</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">此致<br>TOPEMS 团队</p>
        </div>
        "#,
        reset_token
    );

    let from_email =
        std::env::var("SMTP_FROM").unwrap_or_else(|_| "noreply@topems.local".to_string());
    send_email_async(
        from_email,
        email.to_string(),
        subject,
        body,
        Some(html_body),
        None,
        None,
    );

    tracing::info!("Password reset email sent to: {}", email);

    Json(serde_json::json!({
        "success": true,
        "message": "如果该邮箱已注册，您将收到密码重置邮件",
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
        return Json(serde_json::json!({
            "success": false,
            "message": "重置令牌和新密码不能为空",
            "data": null,
            "code": 400
        }));
    }

    // 验证密码强度
    if new_password.len() < 8
        || !new_password.chars().any(|c| c.is_ascii_alphabetic())
        || !new_password.chars().any(|c| c.is_ascii_digit())
    {
        return Json(serde_json::json!({
            "success": false,
            "message": "密码至少8个字符，必须包含字母和数字",
            "data": null,
            "code": 400
        }));
    }

    // 查询重置令牌
    let row = match sqlx::query(
        "SELECT user_id FROM unified_core.password_resets WHERE token = $1 AND expires_at > NOW()",
    )
    .bind(reset_token)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(r)) => r,
        Ok(None) => {
            tracing::warn!("Invalid or expired password reset token");
            return Json(serde_json::json!({
                "success": false,
                "message": "重置令牌无效或已过期",
                "data": null,
                "code": 400
            }));
        }
        Err(e) => {
            tracing::error!("查询重置令牌失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "内部服务器错误",
                "data": null,
                "code": 500
            }));
        }
    };

    let user_id: Uuid = row.get("user_id");

    // 哈希新密码
    let password_hash = match bcrypt::hash(new_password, bcrypt::DEFAULT_COST) {
        Ok(h) => h,
        Err(e) => {
            tracing::error!("密码哈希失败: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "内部服务器错误",
                "data": null,
                "code": 500
            }));
        }
    };

    // 更新用户密码
    let transaction = state.pool.begin().await;
    if transaction.is_err() {
        tracing::error!("Failed to begin transaction");
        return Json(serde_json::json!({
            "success": false,
            "message": "内部服务器错误",
            "data": null,
            "code": 500
        }));
    }
    let mut tx = match transaction {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!("Failed to start transaction: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "内部服务器错误",
                "data": null,
                "code": 500
            }));
        }
    };

    // 更新密码
    match sqlx::query("UPDATE iam.users SET password_hash = $1, updated_at = NOW() WHERE id = $2")
        .bind(&password_hash)
        .bind(user_id)
        .execute(&mut *tx)
        .await
    {
        Ok(_) => {}
        Err(e) => {
            tracing::error!("Failed to update password: {}", e);
            let _ = tx.rollback().await;
            return Json(serde_json::json!({
                "success": false,
                "message": "密码更新失败",
                "data": null,
                "code": 500
            }));
        }
    }

    // 删除重置令牌（使用后立即失效）
    match sqlx::query("DELETE FROM unified_core.password_resets WHERE token = $1")
        .bind(reset_token)
        .execute(&mut *tx)
        .await
    {
        Ok(_) => {}
        Err(e) => {
            tracing::error!("Failed to delete password reset token: {}", e);
            let _ = tx.rollback().await;
            return Json(serde_json::json!({
                "success": false,
                "message": "内部服务器错误",
                "data": null,
                "code": 500
            }));
        }
    }

    // 使所有现有会话失效
    match sqlx::query("DELETE FROM iam.sessions WHERE user_id = $1")
        .bind(user_id)
        .execute(&mut *tx)
        .await
    {
        Ok(_) => {}
        Err(e) => {
            tracing::warn!("Failed to invalidate sessions: {}", e);
        }
    }

    if tx.commit().await.is_err() {
        tracing::error!("Failed to commit transaction");
        return Json(serde_json::json!({
            "success": false,
            "message": "内部服务器错误",
            "data": null,
            "code": 500
        }));
    }

    tracing::info!("Password reset successful for user_id: {}", user_id);

    Json(serde_json::json!({
        "success": true,
        "message": "密码重置成功，请使用新密码登录",
        "data": null,
        "code": 0
    }))
}

fn verify_password(password: &str, password_hash: &str) -> bool {
    match bcrypt::verify(password, password_hash) {
        Ok(result) => result,
        Err(e) => {
            tracing::error!("Password verification error: hash may be corrupted - {}", e);
            false
        }
    }
}
