use axum::{
    extract::{FromRequestParts, Path, Query, Request, State},
    http::{request::Parts, StatusCode},
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::{get, post, put, delete},
    Json, Router,
};
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json;
use sqlx::postgres::PgPoolOptions;
use sqlx::{PgPool, Row};
use std::collections::HashMap;
use std::net::SocketAddr;
use tower_http::cors::{CorsLayer, Any};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

// JWT Claims
#[derive(Debug, Clone, Serialize, Deserialize)]
struct Claims {
    sub: String,         // Subject: user id
    username: String,    // Username
    role: String,        // User role
    roles: Vec<String>,  // User roles
    permissions: Vec<String>, // User permissions
    is_superuser: bool,  // Is superuser
    exp: usize,          // Expiration time
    iat: usize,          // Issued at time
}

// User model
#[derive(Debug, Clone, Serialize, Deserialize)]
struct User {
    id: String,
    username: String,
    email: String,
    password_hash: String,
    full_name: Option<String>,
    role: String,
    roles: Vec<String>,
    permissions: Vec<String>,
    created_at: String,
    updated_at: String,
    is_active: bool,
    is_superuser: bool,
}



// App state
#[derive(Debug, Clone)]
struct AppState {
    db: PgPool,
    jwt_secret: String,
}

// Api response
#[derive(Debug, Serialize, Deserialize)]
struct ApiResponse<T> {
    code: i32,
    success: bool,
    data: Option<T>,
    message: String,
    timestamp: String,
}

impl<T> ApiResponse<T> {
    fn success(data: T, message: &str) -> Self {
        ApiResponse {
            code: 200,
            success: true,
            data: Some(data),
            message: message.to_string(),
            timestamp: Utc::now().to_rfc3339(),
        }
    }

    fn error(code: i32, message: &str) -> Self {
        ApiResponse {
            code,
            success: false,
            data: None,
            message: message.to_string(),
            timestamp: Utc::now().to_rfc3339(),
        }
    }

    fn ok(message: &str) -> Self {
        ApiResponse {
            code: 200,
            success: true,
            data: None,
            message: message.to_string(),
            timestamp: Utc::now().to_rfc3339(),
        }
    }
}

// Request/Response models
#[derive(Debug, Deserialize)]
struct LoginRequest {
    username: String,
    password: String,
}

#[derive(Debug, Deserialize)]
struct RegisterRequest {
    username: String,
    email: String,
    password: String,
    full_name: Option<String>,
}

#[derive(Debug, Serialize)]
struct LoginResponse {
    access_token: String,
    refresh_token: String,
    token_type: String,
    expires_in: usize,
    user: UserInfo,
}

#[derive(Debug, Serialize, Clone)]
struct UserInfo {
    id: String,
    username: String,
    email: String,
    full_name: Option<String>,
    role: String,
    roles: Vec<String>,
    permissions: Vec<String>,
    avatar_url: Option<String>,
    created_at: String,
    is_active: bool,
    is_superuser: bool,
}

#[derive(Debug, Deserialize)]
struct CreateRoleRequest {
    name: String,
    description: Option<String>,
}

#[derive(Debug, Deserialize)]
struct CreatePermissionRequest {
    name: String,
    resource: String,
    action: String,
    description: Option<String>,
}

#[derive(Debug, Serialize)]
struct RoleInfo {
    id: String,
    name: String,
    description: Option<String>,
    created_at: String,
}

#[derive(Debug, Serialize)]
struct PermissionInfo {
    id: String,
    name: String,
    resource: String,
    action: String,
    description: Option<String>,
}

#[derive(Debug, Serialize)]
struct AuditLogInfo {
    id: String,
    user_id: Option<String>,
    action: String,
    resource: Option<String>,
    resource_id: Option<String>,
    ip_address: Option<String>,
    user_agent: Option<String>,
    details: Option<serde_json::Value>,
    created_at: String,
}

#[derive(Debug, Serialize)]
struct ListAuditLogsResponse {
    logs: Vec<AuditLogInfo>,
    total: usize,
}

#[derive(Debug, Deserialize)]
struct RefreshTokenRequest {
    refresh_token: String,
}

#[derive(Debug, Serialize)]
struct RefreshTokenResponse {
    access_token: String,
    token_type: String,
    expires_in: usize,
}

#[derive(Debug, Serialize)]
struct ListUsersResponse {
    users: Vec<UserInfo>,
    total: usize,
}

#[derive(Debug, Deserialize)]
struct UpdateUserRequest {
    full_name: Option<String>,
    email: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ChangePasswordRequest {
    current_password: String,
    new_password: String,
}

#[derive(Debug, Deserialize)]
struct UpdateAvatarRequest {
    avatar_url: String,
}

#[derive(Debug, Deserialize)]
struct UpdatePreferencesRequest {
    notification_settings: Option<serde_json::Value>,
    shortcuts: Option<serde_json::Value>,
    language: Option<String>,
    timezone: Option<String>,
}

#[derive(Debug, Deserialize)]
struct CreateAccessLogRequest {
    action: String,
    resource: Option<String>,
    resource_id: Option<String>,
    ip_address: Option<String>,
    user_agent: Option<String>,
    success: Option<bool>,
    error_message: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ResetPasswordRequest {
    email: String,
}

#[derive(Debug, Deserialize)]
struct SetNewPasswordRequest {
    token: String,
    new_password: String,
}

// Custom extractor for claims
struct AuthenticatedUser(Claims);

impl<S> FromRequestParts<S> for AuthenticatedUser
where
    S: Send + Sync,
{
    type Rejection = Response;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        parts.extensions.get::<Claims>()
            .cloned()
            .map(AuthenticatedUser)
            .ok_or_else(|| {
                let response = Json(ApiResponse::<()>::error(401, "请先登录"));
                (StatusCode::UNAUTHORIZED, response).into_response()
            })
    }
}

// Helper functions
fn validate_password(password: &str) -> Result<(), String> {
    if password.len() < 8 {
        return Err("密码长度至少为8位".to_string());
    }
    
    let has_uppercase = password.chars().any(|c| c.is_uppercase());
    let has_lowercase = password.chars().any(|c| c.is_lowercase());
    let has_number = password.chars().any(|c| c.is_numeric());
    let has_special = password.chars().any(|c| !c.is_alphanumeric());
    
    if !has_uppercase {
        return Err("密码必须包含至少一个大写字母".to_string());
    }
    if !has_lowercase {
        return Err("密码必须包含至少一个小写字母".to_string());
    }
    if !has_number {
        return Err("密码必须包含至少一个数字".to_string());
    }
    if !has_special {
        return Err("密码必须包含至少一个特殊字符".to_string());
    }
    
    Ok(())
}

async fn log_audit(
    state: &AppState,
    user_id: Option<&str>,
    action: &str,
    resource: Option<&str>,
    resource_id: Option<&str>,
    ip_address: Option<&str>,
    user_agent: Option<&str>,
    details: Option<serde_json::Value>,
) {
    let result = sqlx::query(
        r#"
        INSERT INTO iam.audit_logs (id, user_id, action, resource, resource_id, ip_address, user_agent, details)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        "#
    )
    .bind(&uuid::Uuid::new_v4().to_string())
    .bind(user_id)
    .bind(action)
    .bind(resource)
    .bind(resource_id)
    .bind(ip_address)
    .bind(user_agent)
    .bind(details)
    .execute(&state.db)
    .await;
    
    if let Err(e) = result {
        tracing::error!("审计日志记录失败: {}", e);
    } else {
        tracing::info!("审计日志记录成功: action={}, user_id={}", action, user_id.unwrap_or("None"));
    }
}

fn validate_email(email: &str) -> Result<(), String> {
    let email_regex = Regex::new(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$").unwrap();
    if !email_regex.is_match(email) {
        return Err("请输入有效的邮箱地址".to_string());
    }
    Ok(())
}

fn validate_username(username: &str) -> Result<(), String> {
    if username.len() < 2 {
        return Err("用户名长度至少为2位".to_string());
    }
    if username.len() > 50 {
        return Err("用户名长度不能超过50位".to_string());
    }
    
    // 只禁止控制字符和空格，允许其他字符
    for c in username.chars() {
        if c.is_control() || c.is_whitespace() {
            return Err("用户名不能包含控制字符或空格".to_string());
        }
    }
    
    Ok(())
}

fn generate_token(user: &User, secret: &str, expires_in_hours: i64) -> Result<String, String> {
    let expiration = Utc::now()
        .checked_add_signed(Duration::hours(expires_in_hours))
        .expect("valid timestamp")
        .timestamp() as usize;
    
    let claims = Claims {
        sub: user.id.clone(),
        username: user.username.clone(),
        role: user.role.clone(),
        roles: user.roles.clone(),
        permissions: user.permissions.clone(),
        is_superuser: user.is_superuser,
        exp: expiration,
        iat: Utc::now().timestamp() as usize,
    };
    
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_ref()),
    ).map_err(|e| format!("生成token失败: {}", e))
}

fn verify_token(token: &str, secret: &str) -> Result<Claims, String> {
    let validation = Validation::default();
    decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_ref()),
        &validation,
    )
    .map(|data| data.claims)
    .map_err(|e| format!("Token验证失败: {}", e))
}

// JWT auth middleware
async fn auth_middleware(
    State(state): State<AppState>,
    mut req: Request,
    next: Next,
) -> Response {
    let auth_header = req.headers()
        .get("Authorization")
        .and_then(|h| h.to_str().ok());
    
    match auth_header {
        Some(header) if header.starts_with("Bearer ") => {
            let token = &header[7..];
            match verify_token(token, &state.jwt_secret) {
                Ok(claims) => {
                    req.extensions_mut().insert(claims);
                    next.run(req).await
                }
                Err(e) => {
                    tracing::warn!("Token验证失败: {}", e);
                    let response = Json(ApiResponse::<()>::error(401, "认证失效，请重新登录"));
                    (StatusCode::UNAUTHORIZED, response).into_response()
                }
            }
        }
        _ => {
            let response = Json(ApiResponse::<()>::error(401, "请先登录"));
            (StatusCode::UNAUTHORIZED, response).into_response()
        }
    }
}

// Handlers
async fn home() -> &'static str {
    "TOPEMS-IAM 身份认证服务 API\n\n健康检查: GET /health\n\n认证接口:\n- POST /api/v1/auth/login (登录)\n- POST /api/v1/auth/register (注册)\n- POST /api/v1/auth/refresh (刷新token)\n\n用户接口 (需要认证):\n- GET /api/v1/users/me (获取当前用户)\n- PUT /api/v1/users/me (更新当前用户)\n- POST /api/v1/users/me/password (修改密码)\n- GET /api/v1/users (获取用户列表 - 仅管理员)\n- GET /api/v1/users/{id} (获取特定用户)\n- GET /api/v1/users/{user_id}/roles (获取用户角色)\n- POST /api/v1/users/{user_id}/roles/{role_id} (为用户添加角色 - 仅管理员)\n- DELETE /api/v1/users/{user_id}/roles/{role_id} (移除用户角色 - 仅管理员)\n\n角色接口 (需要认证):\n- GET /api/v1/roles (获取角色列表)\n- POST /api/v1/roles (创建角色 - 仅管理员)\n- GET /api/v1/roles/{id} (获取特定角色)\n- DELETE /api/v1/roles/{id} (删除角色 - 仅管理员)\n- GET /api/v1/roles/{role_id}/permissions (获取角色权限)\n- POST /api/v1/roles/{role_id}/permissions/{permission_id} (为角色添加权限 - 仅管理员)\n- DELETE /api/v1/roles/{role_id}/permissions/{permission_id} (移除角色权限 - 仅管理员)\n\n权限接口 (需要认证):\n- GET /api/v1/permissions (获取权限列表)\n- POST /api/v1/permissions (创建权限 - 仅管理员)\n- DELETE /api/v1/permissions/{id} (删除权限 - 仅管理员)\n\n测试账号:\n- admin / admin123 (管理员)\n- user / user123 (普通用户)\n- guest / guest123 (访客)"
}

async fn health() -> Json<ApiResponse<String>> {
    Json(ApiResponse::success("TOPEMS-IAM is running!".to_string(), "OK"))
}

async fn login(
    State(state): State<AppState>,
    Json(req): Json<LoginRequest>,
) -> Json<ApiResponse<LoginResponse>> {
    let result = sqlx::query_as::<_, (String, String, String, Option<String>, String, bool, bool, chrono::DateTime<Utc>, chrono::DateTime<Utc>)>(
        "SELECT id::text, username, email, full_name, password_hash, is_active, is_superuser, created_at, updated_at FROM iam.users WHERE username = $1"
    )
    .bind(&req.username)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(user)) => {
            if !user.5 {
                return Json(ApiResponse::error(403, "该账号已被禁用"));
            }
            
            if bcrypt::verify(&req.password, &user.4).unwrap_or(false) {
                let (user_roles, user_permissions) = get_user_roles_and_permissions(&state.db, &user.0).await;
                
                let role = user_roles.first().cloned().unwrap_or_else(|| "user".to_string());
                let is_superuser = user.6 || role == "admin";
                let final_roles = if user_roles.is_empty() { vec!["user".to_string()] } else { user_roles };
                let user_info = UserInfo {
                    id: user.0.clone(),
                    username: user.1.clone(),
                    email: user.2.clone(),
                    full_name: user.3.clone(),
                    role: role.clone(),
                    roles: final_roles.clone(),
                    permissions: user_permissions.clone(),
                    avatar_url: None,
                    created_at: user.7.to_rfc3339(),
                    is_active: user.5,
                    is_superuser,
                };
                
                let user_for_token = User {
                    id: user.0.clone(),
                    username: user.1.clone(),
                    email: user.2.clone(),
                    password_hash: user.4.clone(),
                    full_name: user.3.clone(),
                    role: role.clone(),
                    roles: final_roles,
                    permissions: user_permissions,
                    created_at: user.7.to_rfc3339(),
                    updated_at: user.8.to_rfc3339(),
                    is_active: user.5,
                    is_superuser,
                };
                
                let access_token = generate_token(&user_for_token, &state.jwt_secret, 1).unwrap();
                let refresh_token = generate_token(&user_for_token, &state.jwt_secret, 168).unwrap();
                
                let resp = LoginResponse {
                    access_token,
                    refresh_token,
                    token_type: "Bearer".to_string(),
                    expires_in: 3600,
                    user: user_info,
                };
                
                tracing::info!("✅ 用户登录成功: {}", user.1);
                
                let _ = log_audit(&state, Some(&user.0), "login", Some("user"), Some(&user.0), None, None, None).await;
                
                Json(ApiResponse::success(resp, &format!("欢迎回来，{}！", user.3.as_ref().unwrap_or(&user.1))))
            } else {
                tracing::warn!("❌ 密码错误: {}", req.username);
                Json(ApiResponse::error(401, "密码错误"))
            }
        }
        Ok(None) => {
            tracing::warn!("❌ 用户不存在: {}", req.username);
            Json(ApiResponse::error(404, "用户不存在"))
        }
        Err(e) => {
            tracing::error!("❌ 数据库查询错误: {}", e);
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

async fn get_user_roles_and_permissions(db: &PgPool, user_id: &str) -> (Vec<String>, Vec<String>) {
    let roles: Vec<String> = sqlx::query_scalar(
        "SELECT r.name FROM iam.roles r 
         INNER JOIN iam.user_roles ur ON r.id = ur.role_id 
         WHERE ur.user_id = $1::uuid"
    )
    .bind(user_id)
    .fetch_all(db)
    .await
    .unwrap_or_default();

    let english_roles: Vec<String> = roles.into_iter().map(|role| {
        match role.as_str() {
            "admin" | "管理员" => "admin".to_string(),
            "manager" | "部门经理" => "manager".to_string(),
            "user" | "普通员工" | "普通用户" => "user".to_string(),
            "guest" | "访客" => "guest".to_string(),
            _ => role,
        }
    }).collect();

    let permissions: Vec<String> = sqlx::query_scalar(
        "SELECT DISTINCT p.name FROM iam.permissions p
         INNER JOIN iam.role_permissions rp ON p.id = rp.permission_id
         INNER JOIN iam.user_roles ur ON rp.role_id = ur.role_id
         WHERE ur.user_id = $1::uuid"
    )
    .bind(user_id)
    .fetch_all(db)
    .await
    .unwrap_or_default();

    (english_roles, permissions)
}

async fn register(
    State(state): State<AppState>,
    Json(req): Json<RegisterRequest>,
) -> Json<ApiResponse<LoginResponse>> {
    if let Err(msg) = validate_username(&req.username) {
        tracing::warn!("❌ 用户名验证失败: {}", msg);
        return Json(ApiResponse::error(400, &msg));
    }
    
    if let Err(msg) = validate_email(&req.email) {
        tracing::warn!("❌ 邮箱验证失败: {}", msg);
        return Json(ApiResponse::error(400, &msg));
    }
    
    if let Err(msg) = validate_password(&req.password) {
        tracing::warn!("❌ 密码验证失败: {}", msg);
        return Json(ApiResponse::error(400, &msg));
    }
    
    let password_hash = bcrypt::hash(&req.password, bcrypt::DEFAULT_COST).unwrap();
    
    let result = sqlx::query(
        r#"
        INSERT INTO iam.users (username, email, password_hash, full_name, role, is_active, is_superuser)
        VALUES ($1, $2, $3, $4, 'user', true, false)
        ON CONFLICT (username) DO UPDATE SET username = EXCLUDED.username
        RETURNING id, username, email, full_name, role, is_active, created_at
        "#
    )
    .bind(&req.username)
    .bind(&req.email)
    .bind(&password_hash)
    .bind(&req.full_name)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(user)) => {
            tracing::info!("🆕 用户注册成功: {}", user.get::<String, _>("username"));
            
            let (user_roles, user_permissions) = get_user_roles_and_permissions(&state.db, &user.get::<String, _>("id")).await;
            
            let is_superuser = user.get::<String, _>("role") == "admin";
            let user_info = UserInfo {
                id: user.get::<String, _>("id"),
                username: user.get::<String, _>("username"),
                email: user.get::<String, _>("email"),
                full_name: user.get::<Option<String>, _>("full_name"),
                role: user.get::<String, _>("role"),
                roles: user_roles,
                permissions: user_permissions,
                avatar_url: None,
                created_at: user.get::<chrono::DateTime<Utc>, _>("created_at").to_rfc3339(),
                is_active: user.get::<bool, _>("is_active"),
                is_superuser,
            };
            
            let new_user = User {
                id: user_info.id.clone(),
                username: user_info.username.clone(),
                email: user_info.email.clone(),
                password_hash,
                full_name: user_info.full_name.clone(),
                role: user_info.role.clone(),
                roles: user_info.roles.clone(),
                permissions: user_info.permissions.clone(),
                created_at: user_info.created_at.clone(),
                updated_at: Utc::now().to_rfc3339(),
                is_active: user_info.is_active,
                is_superuser: user_info.is_superuser,
            };
            
            let access_token = generate_token(&new_user, &state.jwt_secret, 1).unwrap();
            let refresh_token = generate_token(&new_user, &state.jwt_secret, 168).unwrap();
            
            let resp = LoginResponse {
                access_token,
                refresh_token,
                token_type: "Bearer".to_string(),
                expires_in: 3600,
                user: user_info,
            };
            
            Json(ApiResponse::success(resp, "注册成功！"))
        }
        Ok(None) => {
            Json(ApiResponse::error(409, "用户名或邮箱已存在"))
        }
        Err(e) => {
            tracing::error!("❌ 数据库插入错误: {}", e);
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

async fn refresh_token(
    State(state): State<AppState>,
    Json(req): Json<RefreshTokenRequest>,
) -> Json<ApiResponse<RefreshTokenResponse>> {
    match verify_token(&req.refresh_token, &state.jwt_secret) {
        Ok(claims) => {
            let result = sqlx::query_as::<_, (String, String, String, Option<String>, String, bool, chrono::DateTime<Utc>, chrono::DateTime<Utc>, bool)>(
                "SELECT id::text, username, email, full_name, password_hash, is_active, created_at, updated_at, is_superuser FROM iam.users WHERE id = $1"
            )
            .bind(&claims.sub)
            .fetch_optional(&state.db)
            .await;

            match result {
                Ok(Some(user)) => {
                    if !user.5 {
                        return Json(ApiResponse::error(403, "该账号已被禁用"));
                    }
                    
                    let user_for_token = User {
                        id: user.0.clone(),
                        username: user.1.clone(),
                        email: user.2.clone(),
                        password_hash: user.4.clone(),
                        full_name: user.3.clone(),
                        role: claims.role.clone(),
                        roles: claims.roles.clone(),
                        permissions: claims.permissions.clone(),
                        created_at: user.6.to_rfc3339(),
                        updated_at: user.7.to_rfc3339(),
                        is_active: user.5,
                        is_superuser: claims.is_superuser,
                    };
                    
                    let access_token = generate_token(&user_for_token, &state.jwt_secret, 1).unwrap();
                    
                    let resp = RefreshTokenResponse {
                        access_token,
                        token_type: "Bearer".to_string(),
                        expires_in: 3600,
                    };
                    
                    Json(ApiResponse::success(resp, "Token刷新成功"))
                }
                Ok(None) => Json(ApiResponse::error(404, "用户不存在")),
                Err(e) => {
                    tracing::error!("数据库查询错误: {}", e);
                    Json(ApiResponse::error(500, "服务器内部错误"))
                }
            }
        }
        Err(e) => {
            tracing::warn!("刷新token失败: {}", e);
            Json(ApiResponse::error(401, "Refresh token 已失效"))
        }
    }
}

async fn get_current_user(
    State(state): State<AppState>,
    AuthenticatedUser(claims): AuthenticatedUser,
) -> Json<ApiResponse<UserInfo>> {
    let result = sqlx::query_as::<_, (String, String, String, Option<String>, bool, bool, chrono::DateTime<Utc>)>(
        "SELECT id::text, username, email, full_name, is_active, is_superuser, created_at FROM iam.users WHERE id = $1::uuid"
    )
    .bind(&claims.sub)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(user)) => {
            let (roles, permissions) = get_user_roles_and_permissions(&state.db, &user.0).await;
            let role = roles.first().cloned().unwrap_or_default();
            
            let is_superuser = user.5 || role == "admin";
            let user_info = UserInfo {
                id: user.0.clone(),
                username: user.1.clone(),
                email: user.2.clone(),
                full_name: user.3.clone(),
                role,
                roles,
                permissions,
                avatar_url: None,
                created_at: user.6.to_rfc3339(),
                is_active: user.4,
                is_superuser,
            };
            
            Json(ApiResponse::success(user_info, "Success"))
        }
        Ok(None) => Json(ApiResponse::error(404, "用户不存在")),
        Err(e) => {
            tracing::error!("数据库查询错误: {}", e);
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

async fn update_current_user(
    State(state): State<AppState>,
    AuthenticatedUser(claims): AuthenticatedUser,
    Json(update_req): Json<UpdateUserRequest>,
) -> Json<ApiResponse<UserInfo>> {
    if let Some(email) = &update_req.email {
        if let Err(msg) = validate_email(email) {
            return Json(ApiResponse::error(400, &msg));
        }
        
        let exists = sqlx::query_scalar::<_, bool>(
            "SELECT EXISTS(SELECT 1 FROM iam.users WHERE email = $1 AND id != $2)"
        )
        .bind(email)
        .bind(&claims.sub)
        .fetch_one(&state.db)
        .await
        .unwrap_or(false);
        
        if exists {
            return Json(ApiResponse::error(409, "邮箱已被其他用户使用"));
        }
    }
    
    let result = sqlx::query(
        "UPDATE iam.users SET email = COALESCE($1, email), full_name = COALESCE($2, full_name), updated_at = NOW() WHERE id = $3 RETURNING id, username, email, full_name, is_active, created_at"
    )
    .bind(&update_req.email)
    .bind(&update_req.full_name)
    .bind(&claims.sub)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(user)) => {
            let (roles, permissions) = get_user_roles_and_permissions(&state.db, &user.get::<String, _>("id")).await;
            let role = roles.first().cloned().unwrap_or_default();
            
            let is_superuser = role == "admin";
            let user_info = UserInfo {
                id: user.get::<String, _>("id"),
                username: user.get::<String, _>("username"),
                email: user.get::<String, _>("email"),
                full_name: user.get::<Option<String>, _>("full_name"),
                role,
                roles,
                permissions,
                avatar_url: None,
                created_at: user.get::<chrono::DateTime<Utc>, _>("created_at").to_rfc3339(),
                is_active: user.get::<bool, _>("is_active"),
                is_superuser,
            };
            
            tracing::info!("✏️ 用户信息更新成功: {}", user_info.username);
            
            Json(ApiResponse::success(user_info, "用户信息更新成功"))
        }
        Ok(None) => Json(ApiResponse::error(404, "用户不存在")),
        Err(e) => {
            tracing::error!("数据库更新错误: {}", e);
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

async fn change_password(
    State(state): State<AppState>,
    AuthenticatedUser(claims): AuthenticatedUser,
    Json(change_req): Json<ChangePasswordRequest>,
) -> Json<ApiResponse<()>> {
    let result = sqlx::query_scalar::<_, String>(
        "SELECT password_hash FROM iam.users WHERE id = $1"
    )
    .bind(&claims.sub)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(password_hash)) => {
            if !bcrypt::verify(&change_req.current_password, &password_hash).unwrap_or(false) {
                return Json(ApiResponse::error(401, "当前密码不正确"));
            }
            
            if let Err(msg) = validate_password(&change_req.new_password) {
                return Json(ApiResponse::error(400, &msg));
            }
            
            let new_password_hash = bcrypt::hash(&change_req.new_password, bcrypt::DEFAULT_COST).unwrap();
            
            let update_result = sqlx::query(
                "UPDATE iam.users SET password_hash = $1, updated_at = NOW() WHERE id = $2"
            )
            .bind(&new_password_hash)
            .bind(&claims.sub)
            .execute(&state.db)
            .await;

            match update_result {
                Ok(_) => {
                    tracing::info!("🔑 用户密码修改成功: {}", claims.username);
                    Json(ApiResponse::ok("密码修改成功"))
                }
                Err(e) => {
                    tracing::error!("数据库更新错误: {}", e);
                    Json(ApiResponse::error(500, "服务器内部错误"))
                }
            }
        }
        Ok(None) => Json(ApiResponse::error(404, "用户不存在")),
        Err(e) => {
            tracing::error!("数据库查询错误: {}", e);
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

async fn update_avatar(
    State(state): State<AppState>,
    AuthenticatedUser(claims): AuthenticatedUser,
    Json(update_req): Json<UpdateAvatarRequest>,
) -> Json<ApiResponse<UserInfo>> {
    let result = sqlx::query(
        "UPDATE iam.users SET avatar_url = $1, updated_at = NOW() WHERE id = $2 RETURNING id, username, email, full_name, avatar_url, is_active, created_at"
    )
    .bind(&update_req.avatar_url)
    .bind(&claims.sub)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(user)) => {
            let (roles, permissions) = get_user_roles_and_permissions(&state.db, &user.get::<String, _>("id")).await;
            let role = roles.first().cloned().unwrap_or_default();
            let is_superuser = role == "admin";
            
            let user_info = UserInfo {
                id: user.get::<String, _>("id"),
                username: user.get::<String, _>("username"),
                email: user.get::<String, _>("email"),
                full_name: user.get::<Option<String>, _>("full_name"),
                role,
                roles,
                permissions,
                avatar_url: user.get::<Option<String>, _>("avatar_url"),
                created_at: user.get::<chrono::DateTime<Utc>, _>("created_at").to_rfc3339(),
                is_active: user.get::<bool, _>("is_active"),
                is_superuser,
            };
            
            tracing::info!("🖼️ 用户头像更新成功: {}", user_info.username);
            
            Json(ApiResponse::success(user_info, "头像更新成功"))
        }
        Ok(None) => Json(ApiResponse::error(404, "用户不存在")),
        Err(e) => {
            tracing::error!("数据库更新错误: {}", e);
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

async fn get_preferences(
    State(state): State<AppState>,
    AuthenticatedUser(claims): AuthenticatedUser,
) -> Json<ApiResponse<serde_json::Value>> {
    let result = sqlx::query_scalar::<_, serde_json::Value>(
        "SELECT COALESCE((SELECT jsonb_build_object(
            'notification_settings', notification_settings,
            'shortcuts', shortcuts,
            'language', language,
            'timezone', timezone
        ) FROM iam.user_preferences WHERE user_id = $1), 
        jsonb_build_object(
            'notification_settings', '{}',
            'shortcuts', '[]',
            'language', 'zh-CN',
            'timezone', 'Asia/Shanghai'
        ))"
    )
    .bind(&claims.sub)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(preferences) => Json(ApiResponse::success(preferences, "获取偏好设置成功")),
        Err(e) => {
            tracing::error!("数据库查询错误: {}", e);
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

async fn update_preferences(
    State(state): State<AppState>,
    AuthenticatedUser(claims): AuthenticatedUser,
    Json(update_req): Json<UpdatePreferencesRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let result = sqlx::query_scalar::<_, serde_json::Value>(
        "INSERT INTO iam.user_preferences (user_id, notification_settings, shortcuts, language, timezone, updated_at)
         VALUES ($1, COALESCE($2, '{}'::jsonb), COALESCE($3, '[]'::jsonb), COALESCE($4, 'zh-CN'), COALESCE($5, 'Asia/Shanghai'), NOW())
         ON CONFLICT (user_id) DO UPDATE SET 
             notification_settings = COALESCE(EXCLUDED.notification_settings, iam.user_preferences.notification_settings),
             shortcuts = COALESCE(EXCLUDED.shortcuts, iam.user_preferences.shortcuts),
             language = COALESCE(EXCLUDED.language, iam.user_preferences.language),
             timezone = COALESCE(EXCLUDED.timezone, iam.user_preferences.timezone),
             updated_at = NOW()
         RETURNING jsonb_build_object(
             'notification_settings', notification_settings,
             'shortcuts', shortcuts,
             'language', language,
             'timezone', timezone
         )"
    )
    .bind(&claims.sub)
    .bind(&update_req.notification_settings)
    .bind(&update_req.shortcuts)
    .bind(&update_req.language)
    .bind(&update_req.timezone)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(preferences) => {
            tracing::info!("⚙️ 用户偏好设置更新成功: {}", claims.username);
            Json(ApiResponse::success(preferences, "偏好设置更新成功"))
        }
        Err(e) => {
            tracing::error!("数据库更新错误: {}", e);
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

async fn get_user_access_logs(
    State(state): State<AppState>,
    AuthenticatedUser(_claims): AuthenticatedUser,
    Path(user_id): Path<String>,
    Query(params): Query<HashMap<String, String>>,
) -> Json<ApiResponse<serde_json::Value>> {
    let limit: i64 = params.get("limit").and_then(|s| s.parse().ok()).unwrap_or(10);
    let offset: i64 = params.get("offset").and_then(|s| s.parse().ok()).unwrap_or(0);

    let result = sqlx::query(
        "SELECT id::text, user_id::text, username, action, resource, resource_id::text, 
                ip_address::text, user_agent, success, error_message, created_at
         FROM iam.user_access_logs 
         WHERE user_id = $1::uuid
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3"
    )
    .bind(&user_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(rows) => {
            let logs: Vec<serde_json::Value> = rows.into_iter().map(|row| {
                serde_json::json!({
                    "id": row.get::<String, _>("id"),
                    "user_id": row.get::<String, _>("user_id"),
                    "username": row.get::<String, _>("username"),
                    "action": row.get::<String, _>("action"),
                    "resource": row.get::<Option<String>, _>("resource"),
                    "resource_id": row.get::<Option<String>, _>("resource_id"),
                    "ip_address": row.get::<Option<String>, _>("ip_address"),
                    "user_agent": row.get::<Option<String>, _>("user_agent"),
                    "success": row.get::<bool, _>("success"),
                    "error_message": row.get::<Option<String>, _>("error_message"),
                    "created_at": row.get::<chrono::DateTime<Utc>, _>("created_at").to_rfc3339(),
                })
            }).collect();
            Json(ApiResponse::success(serde_json::json!({"logs": logs}), "获取访问日志成功"))
        }
        Err(e) => {
            tracing::error!("数据库查询错误: {}", e);
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

async fn create_access_log(
    State(state): State<AppState>,
    AuthenticatedUser(claims): AuthenticatedUser,
    Json(create_req): Json<CreateAccessLogRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let result = sqlx::query(
        "INSERT INTO iam.user_access_logs (user_id, username, action, resource, resource_id, ip_address, user_agent, success, error_message)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id::text, created_at"
    )
    .bind(&claims.sub)
    .bind(&claims.username)
    .bind(&create_req.action)
    .bind(&create_req.resource)
    .bind(&create_req.resource_id)
    .bind(&create_req.ip_address)
    .bind(&create_req.user_agent)
    .bind(&create_req.success.unwrap_or(true))
    .bind(&create_req.error_message)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(row) => {
            let log = serde_json::json!({
                "id": row.get::<String, _>("id"),
                "created_at": row.get::<chrono::DateTime<Utc>, _>("created_at").to_rfc3339(),
            });
            Json(ApiResponse::success(log, "访问日志创建成功"))
        }
        Err(e) => {
            tracing::error!("数据库插入错误: {}", e);
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

async fn list_users(
    State(state): State<AppState>,
    AuthenticatedUser(claims): AuthenticatedUser,
) -> Json<ApiResponse<ListUsersResponse>> {
    let is_admin = claims.role == "admin" || claims.is_superuser || claims.roles.contains(&"admin".to_string());
    if !is_admin {
        return Json(ApiResponse::error(403, "仅管理员可访问"));
    }
    
    let users = sqlx::query_as::<_, (String, String, String, Option<String>, bool, chrono::DateTime<Utc>)>(
        "SELECT id::text, username, email, full_name, is_active, created_at FROM iam.users ORDER BY created_at DESC"
    )
    .fetch_all(&state.db)
    .await;

    match users {
        Ok(users) => {
            let total = users.len();
            let mut user_info_list = Vec::new();
            for user in users {
                let (roles, permissions) = get_user_roles_and_permissions(&state.db, &user.0).await;
                
                let role = roles.first().cloned().unwrap_or_default();
                let is_superuser = role == "admin";
                
                let user_info = UserInfo {
                    id: user.0.clone(),
                    username: user.1.clone(),
                    email: user.2.clone(),
                    full_name: user.3.clone(),
                    role,
                    roles,
                    permissions,
                    avatar_url: None,
                    created_at: user.5.to_rfc3339(),
                    is_superuser,
                    is_active: user.4,
                };
                user_info_list.push(user_info);
            }
            Json(ApiResponse::success(ListUsersResponse {
                users: user_info_list,
                total,
            }, "Success"))
        }
        Err(e) => {
            tracing::error!("数据库查询错误: {}", e);
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

async fn create_user(
    State(state): State<AppState>,
    AuthenticatedUser(claims): AuthenticatedUser,
    Json(req): Json<RegisterRequest>,
) -> Json<ApiResponse<UserInfo>> {
    let is_admin = claims.role == "admin" || claims.is_superuser || claims.roles.contains(&"admin".to_string());
    if !is_admin {
        return Json(ApiResponse::error(403, "仅管理员可创建用户"));
    }
    
    if let Err(msg) = validate_username(&req.username) {
        return Json(ApiResponse::error(400, &msg));
    }
    
    if let Err(msg) = validate_email(&req.email) {
        return Json(ApiResponse::error(400, &msg));
    }
    
    if let Err(msg) = validate_password(&req.password) {
        return Json(ApiResponse::error(400, &msg));
    }
    
    let password_hash = bcrypt::hash(&req.password, bcrypt::DEFAULT_COST).unwrap();
    
    let mut tx = match state.db.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!("❌ 数据库事务开启失败: {}", e);
            return Json(ApiResponse::error(500, "服务器内部错误"));
        }
    };
    
    let result = sqlx::query(
        r#"
        INSERT INTO iam.users (username, email, password_hash, full_name, is_active, is_superuser)
        VALUES ($1, $2, $3, $4, true, false)
        ON CONFLICT (username) DO NOTHING
        RETURNING id::text, username, email, full_name, is_active, is_superuser, created_at
        "#
    )
    .bind(&req.username)
    .bind(&req.email)
    .bind(&password_hash)
    .bind(&req.full_name)
    .fetch_optional(&mut *tx)
    .await;

    match result {
        Ok(Some(user)) => {
            let user_id = user.get::<String, _>("id");
            tracing::info!("🆕 用户创建成功: {}", user.get::<String, _>("username"));
            
            let role_insert = sqlx::query(
                r#"
                INSERT INTO iam.user_roles (user_id, role_id)
                SELECT $1::uuid, r.id
                FROM iam.roles r
                WHERE r.name = '普通用户'
                ON CONFLICT (user_id, role_id) DO NOTHING
                "#
            )
            .bind(&user_id)
            .execute(&mut *tx)
            .await;
            
            if let Err(e) = role_insert {
                tracing::error!("❌ 用户角色分配失败: {}", e);
                let _ = tx.rollback().await;
                return Json(ApiResponse::error(500, "用户角色分配失败"));
            }
            
            if let Err(e) = tx.commit().await {
                tracing::error!("❌ 事务提交失败: {}", e);
                return Json(ApiResponse::error(500, "服务器内部错误"));
            }
            
            let (user_roles, user_permissions) = get_user_roles_and_permissions(&state.db, &user_id).await;
            
            let role = user_roles.first().cloned().unwrap_or_else(|| "user".to_string());
            let is_superuser = user.get::<bool, _>("is_superuser") || role == "admin";
            
            let user_info = UserInfo {
                id: user_id,
                username: user.get::<String, _>("username"),
                email: user.get::<String, _>("email"),
                full_name: user.get::<Option<String>, _>("full_name"),
                role: role.clone(),
                roles: user_roles,
                permissions: user_permissions,
                avatar_url: None,
                created_at: user.get::<chrono::DateTime<Utc>, _>("created_at").to_rfc3339(),
                is_active: user.get::<bool, _>("is_active"),
                is_superuser,
            };
            
            Json(ApiResponse::success(user_info, "用户创建成功"))
        }
        Ok(None) => {
            let _ = tx.rollback().await;
            Json(ApiResponse::error(409, "用户名已存在"))
        }
        Err(e) => {
            let _ = tx.rollback().await;
            tracing::error!("❌ 数据库插入错误: {}", e);
            if e.to_string().contains("duplicate") || e.to_string().contains("already exists") {
                Json(ApiResponse::error(409, "用户名或邮箱已存在"))
            } else {
                Json(ApiResponse::error(500, "服务器内部错误"))
            }
        }
    }
}

async fn get_user(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
    AuthenticatedUser(claims): AuthenticatedUser,
) -> Json<ApiResponse<UserInfo>> {
    if claims.role != "admin" && claims.sub != user_id {
        return Json(ApiResponse::error(403, "无权限访问该用户"));
    }
    
    let result = sqlx::query_as::<_, (String, String, String, Option<String>, bool, chrono::DateTime<Utc>)>(
        "SELECT id::text, username, email, full_name, is_active, created_at FROM iam.users WHERE id = $1"
    )
    .bind(&user_id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(user)) => {
            let (roles, permissions) = get_user_roles_and_permissions(&state.db, &user.0).await;
            let role = roles.first().cloned().unwrap_or_default();
            
            let is_superuser = role == "admin";
            let user_info = UserInfo {
                id: user.0.clone(),
                username: user.1.clone(),
                email: user.2.clone(),
                full_name: user.3.clone(),
                role,
                roles,
                permissions,
                avatar_url: None,
                created_at: user.5.to_rfc3339(),
                is_active: user.4,
                is_superuser,
            };
            
            Json(ApiResponse::success(user_info, "Success"))
        }
        Ok(None) => Json(ApiResponse::error(404, "用户不存在")),
        Err(e) => {
            tracing::error!("数据库查询错误: {}", e);
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

async fn delete_user(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
    AuthenticatedUser(claims): AuthenticatedUser,
) -> Json<ApiResponse<String>> {
    let is_admin = claims.role == "admin" || claims.is_superuser || claims.roles.contains(&"admin".to_string());
    if !is_admin {
        return Json(ApiResponse::error(403, "仅管理员可删除用户"));
    }
    
    if claims.sub == user_id {
        return Json(ApiResponse::error(400, "不能删除自己"));
    }
    
    let result = sqlx::query("DELETE FROM iam.users WHERE id = $1::uuid")
        .bind(&user_id)
        .execute(&state.db)
        .await;

    match result {
        Ok(res) => {
            if res.rows_affected() > 0 {
                tracing::info!("🗑️ 用户删除成功: {}", user_id);
                Json(ApiResponse::success(String::new(), "用户删除成功"))
            } else {
                Json(ApiResponse::error(404, "用户不存在"))
            }
        }
        Err(e) => {
            tracing::error!("❌ 数据库删除错误: {}", e);
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

// 用户角色管理
async fn get_user_roles(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
    AuthenticatedUser(claims): AuthenticatedUser,
) -> Json<ApiResponse<Vec<RoleInfo>>> {
    if claims.role != "admin" && claims.sub != user_id {
        return Json(ApiResponse::error(403, "无权限访问"));
    }
    
    let roles = sqlx::query_as::<_, (String, String, Option<String>, chrono::DateTime<Utc>)>(
        "SELECT r.id::text, r.name, r.description, r.created_at FROM iam.roles r 
         INNER JOIN iam.user_roles ur ON r.id = ur.role_id 
         WHERE ur.user_id = $1"
    )
    .bind(&user_id)
    .fetch_all(&state.db)
    .await;

    match roles {
        Ok(roles) => {
            let role_infos: Vec<RoleInfo> = roles
                .into_iter()
                .map(|r| RoleInfo {
                    id: r.0,
                    name: r.1,
                    description: r.2,
                    created_at: r.3.to_rfc3339(),
                })
                .collect();
            Json(ApiResponse::success(role_infos, "Success"))
        }
        Err(e) => {
            tracing::error!("数据库查询错误: {}", e);
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

async fn add_user_role(
    State(state): State<AppState>,
    Path((user_id, role_id)): Path<(String, String)>,
    AuthenticatedUser(claims): AuthenticatedUser,
) -> Json<ApiResponse<String>> {
    if claims.role != "admin" {
        return Json(ApiResponse::error(403, "无权限操作"));
    }
    
    let exists = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM iam.user_roles WHERE user_id = $1 AND role_id = $2)"
    )
    .bind(&user_id)
    .bind(&role_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(false);
    
    if exists {
        return Json(ApiResponse::error(409, "用户已拥有该角色"));
    }
    
    let result = sqlx::query(
        "INSERT INTO iam.user_roles (user_id, role_id) VALUES ($1, $2)"
    )
    .bind(&user_id)
    .bind(&role_id)
    .execute(&state.db)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(String::new(), "添加角色成功")),
        Err(e) => {
            tracing::error!("数据库插入错误: {}", e);
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

async fn remove_user_role(
    State(state): State<AppState>,
    Path((user_id, role_id)): Path<(String, String)>,
    AuthenticatedUser(claims): AuthenticatedUser,
) -> Json<ApiResponse<String>> {
    if claims.role != "admin" {
        return Json(ApiResponse::error(403, "无权限操作"));
    }
    
    let result = sqlx::query(
        "DELETE FROM iam.user_roles WHERE user_id = $1 AND role_id = $2"
    )
    .bind(&user_id)
    .bind(&role_id)
    .execute(&state.db)
    .await;

    match result {
        Ok(res) => {
            if res.rows_affected() > 0 {
                Json(ApiResponse::success(String::new(), "移除角色成功"))
            } else {
                Json(ApiResponse::error(404, "角色不存在"))
            }
        }
        Err(e) => {
            tracing::error!("数据库删除错误: {}", e);
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

// 角色管理
async fn list_roles(
    State(state): State<AppState>,
    AuthenticatedUser(_): AuthenticatedUser,
) -> Json<ApiResponse<Vec<RoleInfo>>> {
    let roles = sqlx::query_as::<_, (String, String, Option<String>, chrono::DateTime<Utc>)>(
        "SELECT id::text, name, description, created_at FROM iam.roles ORDER BY created_at DESC"
    )
    .fetch_all(&state.db)
    .await;

    match roles {
        Ok(roles) => {
            let role_infos: Vec<RoleInfo> = roles
                .into_iter()
                .map(|r| RoleInfo {
                    id: r.0,
                    name: r.1,
                    description: r.2,
                    created_at: r.3.to_rfc3339(),
                })
                .collect();
            Json(ApiResponse::success(role_infos, "Success"))
        }
        Err(e) => {
            tracing::error!("数据库查询错误: {}", e);
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

async fn create_role(
    State(state): State<AppState>,
    AuthenticatedUser(claims): AuthenticatedUser,
    Json(req): Json<CreateRoleRequest>,
) -> Json<ApiResponse<RoleInfo>> {
    if claims.role != "admin" {
        return Json(ApiResponse::error(403, "无权限操作"));
    }
    
    let result = sqlx::query(
        "INSERT INTO iam.roles (id, name, description) VALUES ($1, $2, $3) RETURNING id, name, description, created_at"
    )
    .bind(&uuid::Uuid::new_v4().to_string())
    .bind(&req.name)
    .bind(&req.description)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(role)) => {
            let role_info = RoleInfo {
                id: role.get::<String, _>("id"),
                name: role.get::<String, _>("name"),
                description: role.get::<Option<String>, _>("description"),
                created_at: role.get::<chrono::DateTime<Utc>, _>("created_at").to_rfc3339(),
            };
            Json(ApiResponse::success(role_info, "创建角色成功"))
        }
        Ok(None) => Json(ApiResponse::error(500, "创建角色失败")),
        Err(e) => {
            tracing::error!("数据库插入错误: {}", e);
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

async fn get_role(
    State(state): State<AppState>,
    Path(role_id): Path<String>,
    AuthenticatedUser(_): AuthenticatedUser,
) -> Json<ApiResponse<RoleInfo>> {
    let result = sqlx::query_as::<_, (String, String, Option<String>, chrono::DateTime<Utc>)>(
        "SELECT id::text, name, description, created_at FROM iam.roles WHERE id = $1"
    )
    .bind(&role_id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(role)) => {
            let role_info = RoleInfo {
                id: role.0,
                name: role.1,
                description: role.2,
                created_at: role.3.to_rfc3339(),
            };
            Json(ApiResponse::success(role_info, "Success"))
        }
        Ok(None) => Json(ApiResponse::error(404, "角色不存在")),
        Err(e) => {
            tracing::error!("数据库查询错误: {}", e);
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

async fn delete_role(
    State(state): State<AppState>,
    Path(role_id): Path<String>,
    AuthenticatedUser(claims): AuthenticatedUser,
) -> Json<ApiResponse<String>> {
    if claims.role != "admin" {
        return Json(ApiResponse::error(403, "无权限操作"));
    }
    
    let result = sqlx::query(
        "DELETE FROM iam.roles WHERE id = $1"
    )
    .bind(&role_id)
    .execute(&state.db)
    .await;

    match result {
        Ok(res) => {
            if res.rows_affected() > 0 {
                Json(ApiResponse::success(String::new(), "删除角色成功"))
            } else {
                Json(ApiResponse::error(404, "角色不存在"))
            }
        }
        Err(e) => {
            tracing::error!("数据库删除错误: {}", e);
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

// 角色权限管理
async fn get_role_permissions(
    State(state): State<AppState>,
    Path(role_id): Path<String>,
    AuthenticatedUser(_): AuthenticatedUser,
) -> Json<ApiResponse<Vec<PermissionInfo>>> {
    let permissions = sqlx::query_as::<_, (String, String, String, String, Option<String>)>(
        "SELECT p.id::text, p.name, p.resource, p.action, p.description FROM iam.permissions p 
         INNER JOIN iam.role_permissions rp ON p.id = rp.permission_id 
         WHERE rp.role_id = $1"
    )
    .bind(&role_id)
    .fetch_all(&state.db)
    .await;

    match permissions {
        Ok(permissions) => {
            let perm_infos: Vec<PermissionInfo> = permissions
                .into_iter()
                .map(|p| PermissionInfo {
                    id: p.0,
                    name: p.1,
                    resource: p.2,
                    action: p.3,
                    description: p.4,
                })
                .collect();
            Json(ApiResponse::success(perm_infos, "Success"))
        }
        Err(e) => {
            tracing::error!("数据库查询错误: {}", e);
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

async fn add_role_permission(
    State(state): State<AppState>,
    Path((role_id, permission_id)): Path<(String, String)>,
    AuthenticatedUser(claims): AuthenticatedUser,
) -> Json<ApiResponse<String>> {
    if claims.role != "admin" {
        return Json(ApiResponse::error(403, "无权限操作"));
    }
    
    let exists = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM iam.role_permissions WHERE role_id = $1 AND permission_id = $2)"
    )
    .bind(&role_id)
    .bind(&permission_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(false);
    
    if exists {
        return Json(ApiResponse::error(409, "角色已拥有该权限"));
    }
    
    let result = sqlx::query(
        "INSERT INTO iam.role_permissions (role_id, permission_id) VALUES ($1, $2)"
    )
    .bind(&role_id)
    .bind(&permission_id)
    .execute(&state.db)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(String::new(), "添加权限成功")),
        Err(e) => {
            tracing::error!("数据库插入错误: {}", e);
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

async fn remove_role_permission(
    State(state): State<AppState>,
    Path((role_id, permission_id)): Path<(String, String)>,
    AuthenticatedUser(claims): AuthenticatedUser,
) -> Json<ApiResponse<String>> {
    if claims.role != "admin" {
        return Json(ApiResponse::error(403, "无权限操作"));
    }
    
    let result = sqlx::query(
        "DELETE FROM iam.role_permissions WHERE role_id = $1 AND permission_id = $2"
    )
    .bind(&role_id)
    .bind(&permission_id)
    .execute(&state.db)
    .await;

    match result {
        Ok(res) => {
            if res.rows_affected() > 0 {
                Json(ApiResponse::success(String::new(), "移除权限成功"))
            } else {
                Json(ApiResponse::error(404, "权限不存在"))
            }
        }
        Err(e) => {
            tracing::error!("数据库删除错误: {}", e);
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

// 权限管理
async fn list_permissions(
    State(state): State<AppState>,
    AuthenticatedUser(_): AuthenticatedUser,
) -> Json<ApiResponse<Vec<PermissionInfo>>> {
    let permissions = sqlx::query_as::<_, (String, String, String, String, Option<String>)>(
        "SELECT id::text, name, resource, action, description FROM iam.permissions ORDER BY resource, action"
    )
    .fetch_all(&state.db)
    .await;

    match permissions {
        Ok(permissions) => {
            let perm_infos: Vec<PermissionInfo> = permissions
                .into_iter()
                .map(|p| PermissionInfo {
                    id: p.0,
                    name: p.1,
                    resource: p.2,
                    action: p.3,
                    description: p.4,
                })
                .collect();
            Json(ApiResponse::success(perm_infos, "Success"))
        }
        Err(e) => {
            tracing::error!("数据库查询错误: {}", e);
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

async fn create_permission(
    State(state): State<AppState>,
    AuthenticatedUser(claims): AuthenticatedUser,
    Json(req): Json<CreatePermissionRequest>,
) -> Json<ApiResponse<PermissionInfo>> {
    if claims.role != "admin" {
        return Json(ApiResponse::error(403, "无权限操作"));
    }
    
    let result = sqlx::query(
        "INSERT INTO iam.permissions (id, name, resource, action, description) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, resource, action, description"
    )
    .bind(&uuid::Uuid::new_v4().to_string())
    .bind(&req.name)
    .bind(&req.resource)
    .bind(&req.action)
    .bind(&req.description)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(perm)) => {
            let perm_info = PermissionInfo {
                id: perm.get::<String, _>("id"),
                name: perm.get::<String, _>("name"),
                resource: perm.get::<String, _>("resource"),
                action: perm.get::<String, _>("action"),
                description: perm.get::<Option<String>, _>("description"),
            };
            Json(ApiResponse::success(perm_info, "创建权限成功"))
        }
        Ok(None) => Json(ApiResponse::error(500, "创建权限失败")),
        Err(e) => {
            tracing::error!("数据库插入错误: {}", e);
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

async fn delete_permission(
    State(state): State<AppState>,
    Path(permission_id): Path<String>,
    AuthenticatedUser(claims): AuthenticatedUser,
) -> Json<ApiResponse<String>> {
    if claims.role != "admin" {
        return Json(ApiResponse::error(403, "无权限操作"));
    }
    
    let result = sqlx::query(
        "DELETE FROM iam.permissions WHERE id = $1"
    )
    .bind(&permission_id)
    .execute(&state.db)
    .await;

    match result {
        Ok(res) => {
            if res.rows_affected() > 0 {
                let _ = log_audit(&state, Some(&claims.sub), "delete_permission", Some("permission"), Some(&permission_id), None, None, None).await;
                Json(ApiResponse::success(String::new(), "删除权限成功"))
            } else {
                Json(ApiResponse::error(404, "权限不存在"))
            }
        }
        Err(e) => {
            tracing::error!("数据库删除错误: {}", e);
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

// 审计日志API
async fn list_audit_logs(
    State(state): State<AppState>,
    AuthenticatedUser(claims): AuthenticatedUser,
) -> Json<ApiResponse<ListAuditLogsResponse>> {
    if claims.role != "admin" {
        return Json(ApiResponse::error(403, "仅管理员可访问审计日志"));
    }
    
    let logs = sqlx::query_as::<_, (String, Option<String>, String, Option<String>, Option<String>, Option<String>, Option<String>, Option<serde_json::Value>, chrono::DateTime<Utc>)>(
        "SELECT id::text, user_id::text, action, resource, resource_id::text, ip_address::text, user_agent, details, created_at FROM iam.audit_logs ORDER BY created_at DESC LIMIT 100"
    )
    .fetch_all(&state.db)
    .await;

    match logs {
        Ok(logs) => {
            let audit_logs: Vec<AuditLogInfo> = logs.into_iter().map(|log| {
                AuditLogInfo {
                    id: log.0,
                    user_id: log.1,
                    action: log.2,
                    resource: log.3,
                    resource_id: log.4,
                    ip_address: log.5,
                    user_agent: log.6,
                    details: log.7,
                    created_at: log.8.to_rfc3339(),
                }
            }).collect();
            let total = audit_logs.len();
            
            Json(ApiResponse::success(ListAuditLogsResponse {
                logs: audit_logs,
                total,
            }, "Success"))
        }
        Err(e) => {
            tracing::error!("查询审计日志失败: {}", e);
            Json(ApiResponse::error(500, "查询审计日志失败"))
        }
    }
}

async fn get_user_audit_logs(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
    AuthenticatedUser(claims): AuthenticatedUser,
) -> Json<ApiResponse<ListAuditLogsResponse>> {
    if claims.role != "admin" && claims.sub != user_id {
        return Json(ApiResponse::error(403, "无权限访问"));
    }
    
    let logs = sqlx::query_as::<_, (String, Option<String>, String, Option<String>, Option<String>, Option<String>, Option<String>, Option<serde_json::Value>, chrono::DateTime<Utc>)>(
        "SELECT id::text, user_id::text, action, resource, resource_id::text, ip_address::text, user_agent, details, created_at FROM iam.audit_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50"
    )
    .bind(&user_id)
    .fetch_all(&state.db)
    .await;

    match logs {
        Ok(logs) => {
            let audit_logs: Vec<AuditLogInfo> = logs.into_iter().map(|log| {
                AuditLogInfo {
                    id: log.0,
                    user_id: log.1,
                    action: log.2,
                    resource: log.3,
                    resource_id: log.4,
                    ip_address: log.5,
                    user_agent: log.6,
                    details: log.7,
                    created_at: log.8.to_rfc3339(),
                }
            }).collect();
            let total = audit_logs.len();
            
            Json(ApiResponse::success(ListAuditLogsResponse {
                logs: audit_logs,
                total,
            }, "Success"))
        }
        Err(e) => {
            tracing::error!("查询用户审计日志失败: {}", e);
            Json(ApiResponse::error(500, "查询审计日志失败"))
        }
    }
}

// 密码重置API
async fn request_password_reset(
    State(state): State<AppState>,
    Json(req): Json<ResetPasswordRequest>,
) -> Json<ApiResponse<()>> {
    let result = sqlx::query_scalar::<_, (String, String)>(
        "SELECT id::text, username FROM iam.users WHERE email = $1"
    )
    .bind(&req.email)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some((user_id, username))) => {
            let reset_token = uuid::Uuid::new_v4().to_string();
            let expires_at = Utc::now() + Duration::hours(1);
            
            let _ = sqlx::query(
                r#"
                INSERT INTO iam.password_reset_tokens (id, user_id, token, expires_at)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (user_id) DO UPDATE SET token = $3, expires_at = $4
                "#
            )
            .bind(&uuid::Uuid::new_v4().to_string())
            .bind(&user_id)
            .bind(&reset_token)
            .bind(expires_at)
            .execute(&state.db)
            .await;
            
            tracing::info!("🔑 密码重置请求: 用户 {} ({})", username, req.email);
            
            let _ = log_audit(&state, Some(&user_id), "password_reset_request", Some("user"), Some(&user_id), None, None, None).await;
            
            Json(ApiResponse::ok("密码重置链接已发送至您的邮箱"))
        }
        Ok(None) => {
            Json(ApiResponse::error(404, "该邮箱未注册"))
        }
        Err(e) => {
            tracing::error!("数据库查询错误: {}", e);
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

async fn set_new_password(
    State(state): State<AppState>,
    Json(req): Json<SetNewPasswordRequest>,
) -> Json<ApiResponse<()>> {
    let result = sqlx::query_scalar::<_, (String, chrono::DateTime<Utc>)>(
        "SELECT user_id::text, expires_at FROM iam.password_reset_tokens WHERE token = $1"
    )
    .bind(&req.token)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some((user_id, expires_at))) => {
            if expires_at < Utc::now() {
                return Json(ApiResponse::error(400, "重置链接已过期"));
            }
            
            if let Err(msg) = validate_password(&req.new_password) {
                return Json(ApiResponse::error(400, &msg));
            }
            
            let new_password_hash = bcrypt::hash(&req.new_password, bcrypt::DEFAULT_COST).unwrap();
            
            let update_result = sqlx::query(
                "UPDATE iam.users SET password_hash = $1, updated_at = NOW() WHERE id = $2"
            )
            .bind(&new_password_hash)
            .bind(&user_id)
            .execute(&state.db)
            .await;

            match update_result {
                Ok(_) => {
                    let _ = sqlx::query(
                        "DELETE FROM iam.password_reset_tokens WHERE token = $1"
                    )
                    .bind(&req.token)
                    .execute(&state.db)
                    .await;
                    
                    let _ = log_audit(&state, Some(&user_id), "password_reset", Some("user"), Some(&user_id), None, None, None).await;
                    
                    Json(ApiResponse::ok("密码重置成功"))
                }
                Err(e) => {
                    tracing::error!("数据库更新错误: {}", e);
                    Json(ApiResponse::error(500, "服务器内部错误"))
                }
            }
        }
        Ok(None) => {
            Json(ApiResponse::error(400, "无效的重置链接"))
        }
        Err(e) => {
            tracing::error!("数据库查询错误: {}", e);
            Json(ApiResponse::error(500, "服务器内部错误"))
        }
    }
}

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "topems_iam=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("🚀 TOPEMS-IAM 身份认证服务启动中...");
    dotenv::dotenv().ok();

    let jwt_secret = std::env::var("JWT_SECRET")
        .unwrap_or_else(|_| "topems-jwt-secret".to_string());
    
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://topems:topems_secret@localhost:5432/topems".to_string());
    
    tracing::info!("📦 正在连接数据库...");
    
    let pool = match PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await
    {
        Ok(pool) => {
            tracing::info!("✅ 数据库连接成功");
            pool
        }
        Err(e) => {
            tracing::error!("❌ 数据库连接失败: {}", e);
            return;
        }
    };
    
    tracing::info!("📋 测试账号：admin/admin123 | user/user123 | guest/guest123");
    
    let state = AppState {
        db: pool,
        jwt_secret,
    };

    // 允许所有来源的CORS配置
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let auth_routes = Router::new()
        .route("/login", post(login))
        .route("/register", post(register))
        .route("/refresh", post(refresh_token))
        .route("/password/reset", post(request_password_reset))
        .route("/password/set", post(set_new_password));
    
    let user_routes = Router::new()
        .route("/me", get(get_current_user))
        .route("/me", put(update_current_user))
        .route("/me/password", post(change_password))
        .route("/me/avatar", post(update_avatar))
        .route("/me/preferences", get(get_preferences))
        .route("/me/preferences", put(update_preferences))
        .route("/", get(list_users))
        .route("/", post(create_user))
        .route("/{user_id}", get(get_user))
        .route("/{user_id}", delete(delete_user))
        .route("/{user_id}/roles", get(get_user_roles))
        .route("/{user_id}/roles/{role_id}", post(add_user_role))
        .route("/{user_id}/roles/{role_id}", delete(remove_user_role))
        .route("/{user_id}/access-logs", get(get_user_access_logs))
        .route("/access-logs", post(create_access_log))
        .without_v07_checks();
    
    let role_routes = Router::new()
        .route("/", get(list_roles))
        .route("/", post(create_role))
        .route("/{role_id}", get(get_role))
        .route("/{role_id}", delete(delete_role))
        .route("/{role_id}/permissions", get(get_role_permissions))
        .route("/{role_id}/permissions/{permission_id}", post(add_role_permission))
        .route("/{role_id}/permissions/{permission_id}", delete(remove_role_permission))
        .without_v07_checks();
    
    let permission_routes = Router::new()
        .route("/", get(list_permissions))
        .route("/", post(create_permission))
        .route("/{permission_id}", delete(delete_permission))
        .without_v07_checks();
    
    let access_log_routes = Router::new()
        .route("/user/{user_id}", get(get_user_access_logs))
        .route("/", post(create_access_log))
        .without_v07_checks();
    
    let audit_log_routes = Router::new()
        .route("/", get(list_audit_logs))
        .route("/user/{user_id}", get(get_user_audit_logs))
        .without_v07_checks();
    
    let protected_routes = Router::new()
        .nest("/users", user_routes)
        .nest("/roles", role_routes)
        .nest("/permissions", permission_routes)
        .nest("/access-logs", access_log_routes)
        .nest("/audit-logs", audit_log_routes)
        .layer(middleware::from_fn_with_state(state.clone(), auth_middleware));

    let app = Router::new()
        .route("/", get(home))
        .route("/health", get(health))
        .nest("/api/v1/auth", auth_routes)
        .nest("/api/v1", protected_routes)
        .with_state(state)
        .layer(cors)
        .layer(tower_http::trace::TraceLayer::new_for_http())
        .without_v07_checks();

    let port = std::env::var("SERVER_PORT")
        .unwrap_or_else(|_| "8000".to_string())
        .parse()
        .unwrap_or(8000);
    
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("✅ TOPEMS-IAM 服务运行在 http://{}", addr);
    
    axum::serve(
        tokio::net::TcpListener::bind(&addr).await.unwrap(),
        app.into_make_service(),
    )
    .await
    .unwrap();
}
