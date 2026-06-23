use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;

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

pub async fn login(
    State(state): State<crate::AppState>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    let username = payload.get("username").and_then(|v| v.as_str()).unwrap_or("");
    let password = payload.get("password").and_then(|v| v.as_str()).unwrap_or("");

    tracing::info!("IAM auth login called with username: {}", username);

    let user = match sqlx::query_as::<_, UserRow>(
        "SELECT id, username, password_hash, email, full_name, status, is_superuser, tenant_id FROM core_users WHERE username = $1",
    )
    .bind(username)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(u)) => u,
        Ok(None) => {
            tracing::warn!("Login failed: user not found - {}", username);
            return Json(serde_json::json!({
                "success": false,
                "message": "用户名或密码错误",
                "data": null,
                "code": 401
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

    if user.status != "active" {
        tracing::warn!("Login failed: user is not active - {}", username);
        return Json(serde_json::json!({
            "success": false,
            "message": "用户账号已被禁用",
            "data": null,
            "code": 401
        }));
    }

    if !verify_password(password, &user.password_hash) {
        tracing::warn!("Login failed: invalid password for user - {}", username);
        return Json(serde_json::json!({
            "success": false,
            "message": "用户名或密码错误",
            "data": null,
            "code": 401
        }));
    }

    let jwt_expire_minutes = state.auth_state.token_expiry_hours * 60;
    
    // 创建完整的 Claims，包含用户的真实 is_superuser 状态
    let now = chrono::Utc::now();
    let exp = (now + chrono::Duration::minutes(jwt_expire_minutes)).timestamp() as usize;
    let claims = Claims {
        sub: user.id.to_string(),
        username: user.username.clone(),
        role: if user.is_superuser { "admin".to_string() } else { "user".to_string() },
        roles: if user.is_superuser {
            vec!["superadmin".to_string(), "admin".to_string(), "user".to_string()]
        } else {
            vec!["user".to_string()]
        },
        permissions: if user.is_superuser {
            topems_shared::auth::get_permissions()
                .iter()
                .map(|p| p.id.clone())
                .collect()
        } else {
            vec![
                // IAM 权限（包含对 Doc、File、Notification、Integration 的联动权限）
                "iam:read".to_string(),
                "iam:write".to_string(),
                // HRM 权限
                "hrm:read".to_string(),
                "hrm:write".to_string(),
                // ERP 权限
                "erp:read".to_string(),
                // PM 权限
                "pm:read".to_string(),
                // RS 权限
                "rs:read".to_string(),
                // SCM 权限
                "scm:read".to_string(),
                // CRM 权限
                "crm:read".to_string(),
                // AI 权限
                "ai:read".to_string(),
                // Workflow 权限
                "workflow:read".to_string(),
                "workflow:approve".to_string(),
                // GIS 权限
                "gis:read".to_string(),
            ]
        },
        is_superuser: user.is_superuser,  // ✅ 正确设置超级用户状态
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
    let expires_at = chrono::Utc::now() + chrono::Duration::hours(state.auth_state.token_expiry_hours);
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
            created_at: None,
            roles: claims.roles.clone(),  // 复用 Claims 中的 roles
            permissions: claims.permissions.clone(),  // 复用 Claims 中的 permissions
        },
    };

    tracing::info!("Login successful for user: {}", username);

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
    let username = payload.get("username").and_then(|v| v.as_str()).unwrap_or("");
    let email = payload.get("email").and_then(|v| v.as_str()).unwrap_or("");
    let password = payload.get("password").and_then(|v| v.as_str()).unwrap_or("");
    let full_name = payload.get("full_name").and_then(|v| v.as_str()).map(|s| s.to_string());

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

    // 检查用户名是否已存在
    match sqlx::query_as::<_, UserRow>(
        "SELECT id, username, password_hash, email, full_name, status, is_superuser, tenant_id FROM core_users WHERE username = $1",
    )
    .bind(username)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(_)) => {
            return Json(serde_json::json!({
                "success": false,
                "message": "用户名已存在",
                "data": null,
                "code": 409
            }));
        }
        Ok(None) => {}
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
    match sqlx::query_as::<_, UserRow>(
        "SELECT id, username, password_hash, email, full_name, status, is_superuser, tenant_id FROM core_users WHERE email = $1",
    )
    .bind(email)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(_)) => {
            return Json(serde_json::json!({
                "success": false,
                "message": "邮箱已被注册",
                "data": null,
                "code": 409
            }));
        }
        Ok(None) => {}
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
                    "username": username
                }
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
    let refresh_token = payload.get("refresh_token").and_then(|v| v.as_str()).unwrap_or("");
    
    tracing::info!("IAM auth refresh_token called with: {}", refresh_token);
    
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
        "SELECT s.user_id, u.username, u.is_superuser, u.email, u.status 
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
    
    let claims = Claims {
        sub: user_id.to_string(),
        username,
        role: if is_superuser { "admin".to_string() } else { "user".to_string() },
        roles: if is_superuser {
            vec!["superadmin".to_string(), "admin".to_string(), "user".to_string()]
        } else {
            vec!["user".to_string()]
        },
        permissions: if is_superuser {
            topems_shared::auth::get_permissions()
                .iter()
                .map(|p| p.id.clone())
                .collect()
        } else {
            vec![
                "iam:read".to_string(),
                "iam:write".to_string(),
                "hrm:read".to_string(),
                "hrm:write".to_string(),
                "erp:read".to_string(),
                "pm:read".to_string(),
                "rs:read".to_string(),
                "scm:read".to_string(),
                "crm:read".to_string(),
                "ai:read".to_string(),
                "workflow:read".to_string(),
                "workflow:approve".to_string(),
                "gis:read".to_string(),
            ]
        },
        is_superuser,
        exp,
        iat: now.timestamp() as usize,
        email: Some(email),
        department: None,
        tenant_id: None,
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
    let expires_at = chrono::Utc::now() + chrono::Duration::hours(state.auth_state.token_expiry_hours);
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
        "message": "refresh_token success",
        "data": {
            "access_token": access_token,
            "expires_in": jwt_expire_minutes * 60
        },
        "code": 0
    }))
}

fn verify_password(password: &str, password_hash: &str) -> bool {
    bcrypt::verify(password, password_hash).unwrap_or(false)
}