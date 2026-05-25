use axum::{
    async_trait,
    extract::{FromRequestParts, Path, Request, State},
    http::{request::Parts, StatusCode},
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::{get, post, put},
    Json, Router,
};
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::sync::{Arc, Mutex};
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

// JWT Claims
#[derive(Debug, Clone, Serialize, Deserialize)]
struct Claims {
    sub: String,       // Subject: user id
    username: String,  // Username
    role: String,      // User role
    exp: usize,        // Expiration time
    iat: usize,        // Issued at time
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
    created_at: String,
    updated_at: String,
    is_active: bool,
}

// App state
#[derive(Debug, Clone)]
struct AppState {
    users: Arc<Mutex<Vec<User>>>,
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
    created_at: String,
    is_active: bool,
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

// Custom extractor for claims
struct AuthenticatedUser(Claims);

#[async_trait]
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
    if password.len() < 6 {
        return Err("密码长度至少为6位".to_string());
    }
    
    let has_letter = password.chars().any(|c| c.is_alphabetic());
    let has_number = password.chars().any(|c| c.is_numeric());
    
    if !has_letter || !has_number {
        return Err("密码需要包含至少一个字母和一个数字".to_string());
    }
    
    Ok(())
}

fn validate_email(email: &str) -> Result<(), String> {
    let email_regex = Regex::new(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$").unwrap();
    if !email_regex.is_match(email) {
        return Err("请输入有效的邮箱地址".to_string());
    }
    Ok(())
}

fn validate_username(username: &str) -> Result<(), String> {
    if username.len() < 3 {
        return Err("用户名长度至少为3位".to_string());
    }
    if username.len() > 20 {
        return Err("用户名长度不能超过20位".to_string());
    }
    
    let username_regex = Regex::new(r"^[a-zA-Z0-9_]+$").unwrap();
    if !username_regex.is_match(username) {
        return Err("用户名只能包含字母、数字和下划线".to_string());
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
    "TOPEMS-IAM 身份认证服务 API\n\n健康检查: GET /health\n\n认证接口:\n- POST /api/v1/auth/login (登录)\n- POST /api/v1/auth/register (注册)\n- POST /api/v1/auth/refresh (刷新token)\n\n用户接口 (需要认证):\n- GET /api/v1/users/me (获取当前用户)\n- PUT /api/v1/users/me (更新当前用户)\n- POST /api/v1/users/me/password (修改密码)\n- GET /api/v1/users (获取用户列表 - 仅管理员)\n\n测试账号:\n- admin / admin123 (管理员)\n- user / user123 (普通用户)\n- guest / guest123 (访客)"
}

async fn health() -> Json<ApiResponse<String>> {
    Json(ApiResponse::success("TOPEMS-IAM is running!".to_string(), "OK"))
}

async fn login(
    State(state): State<AppState>,
    Json(req): Json<LoginRequest>,
) -> Json<ApiResponse<LoginResponse>> {
    let users = state.users.lock().unwrap();
    
    if let Some(user) = users.iter().find(|u| u.username == req.username) {
        if !user.is_active {
            return Json(ApiResponse::error(403, "该账号已被禁用"));
        }
        
        if bcrypt::verify(req.password, &user.password_hash).unwrap_or(false) {
            let user_info = UserInfo {
                id: user.id.clone(),
                username: user.username.clone(),
                email: user.email.clone(),
                full_name: user.full_name.clone(),
                role: user.role.clone(),
                created_at: user.created_at.clone(),
                is_active: user.is_active,
            };
            
            let access_token = generate_token(user, &state.jwt_secret, 1).unwrap();
            let refresh_token = generate_token(user, &state.jwt_secret, 168).unwrap();
            
            let resp = LoginResponse {
                access_token,
                refresh_token,
                token_type: "Bearer".to_string(),
                expires_in: 3600,
                user: user_info,
            };
            
            tracing::info!("✅ 用户登录成功: {}", user.username);
            
            Json(ApiResponse::success(resp, &format!("欢迎回来，{}！", user.full_name.as_ref().unwrap_or(&user.username))))
        } else {
            tracing::warn!("❌ 密码错误: {}", req.username);
            Json(ApiResponse::error(401, "密码错误"))
        }
    } else {
        tracing::warn!("❌ 用户不存在: {}", req.username);
        Json(ApiResponse::error(404, "用户不存在"))
    }
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
    
    let mut users = state.users.lock().unwrap();
    
    if users.iter().any(|u| u.username == req.username) {
        return Json(ApiResponse::error(409, "用户名已存在"));
    }
    
    if users.iter().any(|u| u.email == req.email) {
        return Json(ApiResponse::error(409, "邮箱已存在"));
    }
    
    let password_hash = bcrypt::hash(req.password, bcrypt::DEFAULT_COST).unwrap();
    let now = Utc::now().to_rfc3339();
    
    let new_user = User {
        id: uuid::Uuid::new_v4().to_string(),
        username: req.username.clone(),
        email: req.email.clone(),
        password_hash,
        full_name: req.full_name.clone(),
        role: "user".to_string(),
        created_at: now.clone(),
        updated_at: now,
        is_active: true,
    };
    
    users.push(new_user.clone());
    tracing::info!("🆕 用户注册成功: {}", new_user.username);
    
    let user_info = UserInfo {
        id: new_user.id.clone(),
        username: new_user.username.clone(),
        email: new_user.email.clone(),
        full_name: new_user.full_name.clone(),
        role: new_user.role.clone(),
        created_at: new_user.created_at.clone(),
        is_active: new_user.is_active,
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

async fn refresh_token(
    State(state): State<AppState>,
    Json(req): Json<RefreshTokenRequest>,
) -> Json<ApiResponse<RefreshTokenResponse>> {
    match verify_token(&req.refresh_token, &state.jwt_secret) {
        Ok(claims) => {
            let users = state.users.lock().unwrap();
            
            if let Some(user) = users.iter().find(|u| u.id == claims.sub) {
                if !user.is_active {
                    return Json(ApiResponse::error(403, "该账号已被禁用"));
                }
                
                let access_token = generate_token(user, &state.jwt_secret, 1).unwrap();
                
                let resp = RefreshTokenResponse {
                    access_token,
                    token_type: "Bearer".to_string(),
                    expires_in: 3600,
                };
                
                Json(ApiResponse::success(resp, "Token刷新成功"))
            } else {
                Json(ApiResponse::error(404, "用户不存在"))
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
    let users = state.users.lock().unwrap();
    
    if let Some(user) = users.iter().find(|u| u.id == claims.sub) {
        let user_info = UserInfo {
            id: user.id.clone(),
            username: user.username.clone(),
            email: user.email.clone(),
            full_name: user.full_name.clone(),
            role: user.role.clone(),
            created_at: user.created_at.clone(),
            is_active: user.is_active,
        };
        
        Json(ApiResponse::success(user_info, "Success"))
    } else {
        Json(ApiResponse::error(404, "用户不存在"))
    }
}

async fn update_current_user(
    State(state): State<AppState>,
    AuthenticatedUser(claims): AuthenticatedUser,
    Json(update_req): Json<UpdateUserRequest>,
) -> Json<ApiResponse<UserInfo>> {
    let mut users = state.users.lock().unwrap();
    
    // Find user index instead of holding mutable reference
    let user_idx = match users.iter().position(|u| u.id == claims.sub) {
        Some(idx) => idx,
        None => {
            return Json(ApiResponse::error(404, "用户不存在"));
        }
    };
    
    // Check for email conflicts first
    if let Some(email) = &update_req.email {
        if let Err(msg) = validate_email(email) {
            return Json(ApiResponse::error(400, &msg));
        }
        
        if users.iter().any(|u| u.email == *email && u.id != claims.sub) {
            return Json(ApiResponse::error(409, "邮箱已被其他用户使用"));
        }
    }
    
    // Now update the user
    let user = &mut users[user_idx];
    
    if let Some(email) = update_req.email {
        user.email = email;
    }
    
    if let Some(full_name) = update_req.full_name {
        user.full_name = Some(full_name);
    }
    
    user.updated_at = Utc::now().to_rfc3339();
    
    let user_info = UserInfo {
        id: user.id.clone(),
        username: user.username.clone(),
        email: user.email.clone(),
        full_name: user.full_name.clone(),
        role: user.role.clone(),
        created_at: user.created_at.clone(),
        is_active: user.is_active,
    };
    
    tracing::info!("✏️ 用户信息更新成功: {}", user.username);
    
    Json(ApiResponse::success(user_info, "用户信息更新成功"))
}

async fn change_password(
    State(state): State<AppState>,
    AuthenticatedUser(claims): AuthenticatedUser,
    Json(change_req): Json<ChangePasswordRequest>,
) -> Json<ApiResponse<()>> {
    let mut users = state.users.lock().unwrap();
    
    if let Some(user) = users.iter_mut().find(|u| u.id == claims.sub) {
        if !bcrypt::verify(&change_req.current_password, &user.password_hash).unwrap_or(false) {
            return Json(ApiResponse::error(401, "当前密码不正确"));
        }
        
        if let Err(msg) = validate_password(&change_req.new_password) {
            return Json(ApiResponse::error(400, &msg));
        }
        
        user.password_hash = bcrypt::hash(change_req.new_password, bcrypt::DEFAULT_COST).unwrap();
        user.updated_at = Utc::now().to_rfc3339();
        
        tracing::info!("🔑 用户密码修改成功: {}", user.username);
        
        Json(ApiResponse::ok("密码修改成功"))
    } else {
        Json(ApiResponse::error(404, "用户不存在"))
    }
}

async fn list_users(
    State(state): State<AppState>,
    AuthenticatedUser(claims): AuthenticatedUser,
) -> Json<ApiResponse<Vec<UserInfo>>> {
    if claims.role != "admin" {
        return Json(ApiResponse::error(403, "仅管理员可访问"));
    }
    
    let users = state.users.lock().unwrap();
    
    let user_info_list: Vec<UserInfo> = users
        .iter()
        .map(|user| UserInfo {
            id: user.id.clone(),
            username: user.username.clone(),
            email: user.email.clone(),
            full_name: user.full_name.clone(),
            role: user.role.clone(),
            created_at: user.created_at.clone(),
            is_active: user.is_active,
        })
        .collect();
    
    Json(ApiResponse::success(user_info_list, "Success"))
}

async fn get_user(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
    AuthenticatedUser(claims): AuthenticatedUser,
) -> Json<ApiResponse<UserInfo>> {
    if claims.role != "admin" && claims.sub != user_id {
        return Json(ApiResponse::error(403, "无权限访问该用户"));
    }
    
    let users = state.users.lock().unwrap();
    
    if let Some(user) = users.iter().find(|u| u.id == user_id) {
        let user_info = UserInfo {
            id: user.id.clone(),
            username: user.username.clone(),
            email: user.email.clone(),
            full_name: user.full_name.clone(),
            role: user.role.clone(),
            created_at: user.created_at.clone(),
            is_active: user.is_active,
        };
        
        Json(ApiResponse::success(user_info, "Success"))
    } else {
        Json(ApiResponse::error(404, "用户不存在"))
    }
}

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "topems_iam=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("🚀 TOPEMS-IAM 身份认证服务启动中...");
    dotenv::dotenv().ok();

    let jwt_secret = std::env::var("JWT_SECRET")
        .unwrap_or_else(|_| "topems-super-secret-key-change-in-production-".to_string());
    
    let now = Utc::now().to_rfc3339();
    
    let state = AppState {
        users: Arc::new(Mutex::new(vec![
            User {
                id: uuid::Uuid::new_v4().to_string(),
                username: "admin".to_string(),
                email: "admin@topems.com".to_string(),
                password_hash: bcrypt::hash("admin123", bcrypt::DEFAULT_COST).unwrap(),
                full_name: Some("系统管理员".to_string()),
                role: "admin".to_string(),
                created_at: now.clone(),
                updated_at: now.clone(),
                is_active: true,
            },
            User {
                id: uuid::Uuid::new_v4().to_string(),
                username: "user".to_string(),
                email: "user@topems.com".to_string(),
                password_hash: bcrypt::hash("user123", bcrypt::DEFAULT_COST).unwrap(),
                full_name: Some("普通用户".to_string()),
                role: "user".to_string(),
                created_at: now.clone(),
                updated_at: now.clone(),
                is_active: true,
            },
            User {
                id: uuid::Uuid::new_v4().to_string(),
                username: "guest".to_string(),
                email: "guest@topems.com".to_string(),
                password_hash: bcrypt::hash("guest123", bcrypt::DEFAULT_COST).unwrap(),
                full_name: Some("访客用户".to_string()),
                role: "guest".to_string(),
                created_at: now.clone(),
                updated_at: now,
                is_active: true,
            },
        ])),
        jwt_secret,
    };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let auth_routes = Router::new()
        .route("/login", post(login))
        .route("/register", post(register))
        .route("/refresh", post(refresh_token));
    
    let user_routes = Router::new()
        .route("/me", get(get_current_user))
        .route("/me", put(update_current_user))
        .route("/me/password", post(change_password))
        .route("/", get(list_users))
        .route("/:user_id", get(get_user))
        .layer(middleware::from_fn_with_state(state.clone(), auth_middleware));

    let app = Router::new()
        .route("/", get(home))
        .route("/health", get(health))
        .nest("/api/v1/auth", auth_routes)
        .nest("/api/v1/users", user_routes)
        .with_state(state)
        .layer(cors)
        .layer(tower_http::trace::TraceLayer::new_for_http());

    let _host = std::env::var("SERVER_HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let port = std::env::var("SERVER_PORT")
        .unwrap_or_else(|_| "8002".to_string())
        .parse()
        .unwrap_or(8002);
    
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("✅ TOPEMS-IAM 服务运行在 http://{}", addr);
    tracing::info!("📋 测试账号：admin/admin123 | user/user123 | guest/guest123");
    
    axum::serve(
        tokio::net::TcpListener::bind(&addr).await.unwrap(),
        app.into_make_service(),
    )
    .await
    .unwrap();
}
