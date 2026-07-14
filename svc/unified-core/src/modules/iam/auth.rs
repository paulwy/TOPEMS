use axum::http::HeaderMap;
use axum::{extract::State, Extension, Json};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;

use crate::modules::communication::mail::send_email_async;
use crate::modules::login_log::handlers::record_login_event;
use topems_shared::auth::Claims;
use topems_shared::generate_refresh_token;

#[derive(Debug, Clone, Deserialize)]
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
    status: String,
    is_superuser: bool,
    tenant_id: Option<Uuid>,
    created_at: Option<chrono::NaiveDateTime>,
}

#[derive(Debug, Clone, Serialize)]
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

    let ip_address = headers
        .get("X-Forwarded-For")
        .and_then(|h| h.to_str().ok())
        .or_else(|| headers.get("X-Real-IP").and_then(|h| h.to_str().ok()))
        .unwrap_or("unknown");

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
            ip_address,
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
        "SELECT id, username, password_hash, email, full_name, status, is_superuser, tenant_id, created_at FROM core_users WHERE username = $1 OR email = $1",
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
                ip_address,
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
                ip_address,
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

    if user.status != "active" {
        tracing::warn!("Login failed: user is not active - {}", username);
        let _ = record_login_event(
            &state.pool,
            user.tenant_id.unwrap_or(Uuid::nil()),
            Some(user.id),
            &user.username,
            ip_address,
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
            user.tenant_id.unwrap_or(Uuid::nil()),
            Some(user.id),
            &user.username,
            ip_address,
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

    // 获取用户的角色和权限
    let (user_roles, user_permissions) =
        get_user_roles_and_permissions(&state, user.id, user.is_superuser).await;

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
        tenant_id: user.tenant_id.map(|t| t.to_string()),
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

    let refresh_token = generate_refresh_token();
    let expires_in = jwt_expire_minutes * 60;

    // 保存会话到数据库
    let expires_at =
        chrono::Utc::now() + chrono::Duration::hours(state.auth_state.token_expiry_hours);
    match sqlx::query(
        "INSERT INTO unified_core.sessions (user_id, token, refresh_token, expires_at) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id) DO UPDATE SET token = $2, refresh_token = $3, expires_at = $4",
    )
    .bind(&user.id)
    .bind(&access_token)
    .bind(&refresh_token)
    .bind(&expires_at)
    .execute(&state.pool)
    .await
    {
        Ok(_) => tracing::debug!("会话保存成功"),
        Err(e) => tracing::warn!("会话保存失败: {}", e),
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
            is_active: user.status == "active",
            is_superuser: user.is_superuser,
            created_at: user.created_at.map(|t| t.to_string()),
            roles: user_roles,
            permissions: user_permissions,
        },
    };

    tracing::info!("Login successful for user: {}", username);

    let _ = record_login_event(
        &state.pool,
        user.tenant_id.unwrap_or(Uuid::nil()),
        Some(user.id),
        &username_clone,
        ip_address,
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

#[derive(Debug, Clone, Deserialize)]
struct RegisterRequest {
    username: String,
    email: String,
    password: String,
    full_name: Option<String>,
}

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
    match sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM core_users WHERE username = $1")
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
    match sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM core_users WHERE email = $1")
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
        INSERT INTO core_users (id, username, email, password_hash, full_name, status, is_superuser, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, 'active', false, NOW(), NOW())
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

    // 查询会话获取用户信息
    let row = match sqlx::query(
        "SELECT s.user_id, u.username, u.is_superuser, u.email, u.status, u.tenant_id
         FROM unified_core.sessions s
         JOIN core_users u ON s.user_id = u.id
         WHERE s.refresh_token = $1 AND s.expires_at > NOW()",
    )
    .bind(refresh_token)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(r)) => r,
        Ok(None) => {
            tracing::warn!("Refresh token 无效或已过期");
            return Json(serde_json::json!({
                "success": false,
                "message": "Refresh token 无效或已过期",
                "data": null,
                "code": 401
            }));
        }
        Err(e) => {
            tracing::error!("查询会话失败: {}", e);
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
    let status: String = row.get("status");
    let tenant_id: Option<Uuid> = row.get("tenant_id");

    if status != "active" {
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

    // 获取用户的角色和权限（与 login 保持一致）
    let (user_roles, user_permissions) =
        get_user_roles_and_permissions(&state, user_id, is_superuser).await;

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
        tenant_id: tenant_id.map(|t| t.to_string()),
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

    // 更新会话中的 access_token 和过期时间
    let expires_at =
        chrono::Utc::now() + chrono::Duration::hours(state.auth_state.token_expiry_hours);
    match sqlx::query(
        "UPDATE unified_core.sessions SET token = $1, expires_at = $2 WHERE refresh_token = $3",
    )
    .bind(&access_token)
    .bind(&expires_at)
    .bind(&refresh_token)
    .execute(&state.pool)
    .await
    {
        Ok(_) => tracing::debug!("会话更新成功"),
        Err(e) => tracing::warn!("会话更新失败: {}", e),
    }

    Json(serde_json::json!({
        "success": true,
        "message": "Token刷新成功",
        "data": {
            "access_token": access_token,
            "expires_in": jwt_expire_minutes * 60,
            "username": username,
            "is_superuser": is_superuser
        },
        "code": 0
    }))
}

/// 用户登出接口
pub async fn logout(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<serde_json::Value> {
    tracing::info!("IAM auth logout called for user: {}", claims.username);

    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(e) => {
            tracing::error!("Invalid user ID format: {}", e);
            return Json(serde_json::json!({
                "success": false,
                "message": "无效的用户ID",
                "data": null,
                "code": 400
            }));
        }
    };

    // 删除用户会话
    match sqlx::query("DELETE FROM unified_core.sessions WHERE user_id = $1")
        .bind(user_id)
        .execute(&state.pool)
        .await
    {
        Ok(_) => {
            tracing::info!("Logout successful for user: {}", claims.username);
            Json(serde_json::json!({
                "success": true,
                "message": "登出成功",
                "data": null,
                "code": 0
            }))
        }
        Err(e) => {
            tracing::error!("Logout failed: {}", e);
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
        "SELECT id, username, email FROM core_users WHERE email = $1 AND status = 'active'",
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
    match sqlx::query("UPDATE core_users SET password_hash = $1, updated_at = NOW() WHERE id = $2")
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
    match sqlx::query("DELETE FROM unified_core.sessions WHERE user_id = $1")
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

/// 获取用户角色和权限的辅助函数
async fn get_user_roles_and_permissions(
    state: &crate::AppState,
    user_id: Uuid,
    is_superuser: bool,
) -> (Vec<String>, Vec<String>) {
    if is_superuser {
        // 超级管理员：获取所有权限
        let all_permissions =
            sqlx::query_scalar::<_, String>("SELECT code FROM core_permissions ORDER BY code")
                .fetch_all(&state.pool)
                .await
                .unwrap_or_default();

        (
            vec![
                "superadmin".to_string(),
                "admin".to_string(),
                "user".to_string(),
            ],
            all_permissions,
        )
    } else {
        // 普通用户：从数据库获取角色和权限
        let roles: Vec<String> = sqlx::query_scalar::<_, String>(
            r#"
            SELECT r.name FROM core_roles r
            INNER JOIN core_user_roles ur ON r.id = ur.role_id
            WHERE ur.user_id = $1
            ORDER BY r.name
            "#,
        )
        .bind(user_id)
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default();

        let permissions: Vec<String> = sqlx::query_scalar::<_, String>(
            r#"
            SELECT DISTINCT p.code FROM core_permissions p
            INNER JOIN core_role_permissions rp ON p.id = rp.permission_id
            INNER JOIN core_user_roles ur ON rp.role_id = ur.role_id
            WHERE ur.user_id = $1
            ORDER BY p.code
            "#,
        )
        .bind(user_id)
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default();

        (
            if roles.is_empty() {
                vec!["user".to_string()]
            } else {
                roles
            },
            permissions,
        )
    }
}

fn verify_password(password: &str, password_hash: &str) -> bool {
    bcrypt::verify(password, password_hash).unwrap_or(false)
}
