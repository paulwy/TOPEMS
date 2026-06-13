mod api;
mod db;
mod middleware;
mod models;
mod services;

use axum::{
    routing::{get, post},
    Json, Router,
};
use sqlx::postgres::PgPoolOptions;
use std::env;
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use topems_shared::{auth_middleware, create_api_info_router, ApiResponse, AuthState};

#[derive(Clone)]
pub struct AppState {
    pub db: sqlx::PgPool,
    pub auth_state: AuthState,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv::dotenv().ok();

    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            env::var("RUST_LOG").unwrap_or_else(|_| "topems_iam=info,tower_http=info".to_string()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let database_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://topems:topems_secret@localhost:5432/topems?options=-c%20search_path%3Diam%2Cshared%2Cpublic".to_string());

    env::set_var("SEARCH_PATH", "iam, shared, public");

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await?;

    tracing::info!("📦 正在连接数据库...");
    sqlx::query("SELECT 1").execute(&pool).await?;
    tracing::info!("✅ 数据库连接成功");

    let auth_state = AuthState::from_env();
    tracing::info!(
        "🔑 AuthState 读取到的 JWT_SECRET: {}",
        auth_state.jwt_secret
    );

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app_state = AppState {
        db: pool.clone(),
        auth_state: auth_state.clone(),
    };

    let public_routes = Router::new()
        .route("/", get(home))
        .route("/health", get(health))
        .merge(create_api_info_router("topems-iam"))
        .route("/api/v1/auth/login", post(login))
        .route("/api/v1/auth/register", post(register))
        .route("/api/v1/auth/refresh", post(refresh_token))
        .with_state(app_state.clone());

    let protected_routes = Router::new()
        .route("/api/v1/users/me", get(get_current_user))
        .layer(axum::middleware::from_fn_with_state(
            auth_state.clone(),
            auth_middleware,
        ))
        .with_state(app_state.clone());

    let app = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .layer(cors);

    let port = env::var("SERVER_PORT").unwrap_or_else(|_| "8000".to_string());
    let addr = format!("0.0.0.0:{}", port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;

    tracing::info!("✅ TOPEMS-IAM 服务运行在 http://{}", addr);

    axum::serve(listener, app).await?;

    Ok(())
}

async fn home() -> &'static str {
    "TOPEMS-IAM 身份认证服务 API\n\n健康检查: GET /health\n\n认证接口:\n- POST /api/v1/auth/login (登录)\n- POST /api/v1/auth/register (注册)\n- POST /api/v1/auth/refresh (刷新token)\n\n用户接口 (需要认证):\n- GET /api/v1/users/me (获取当前用户)\n\n测试账号:\n- admin / admin123 (管理员)\n- user / user123 (普通用户)\n- guest / guest123 (访客)"
}

async fn health() -> Json<ApiResponse<String>> {
    Json(ApiResponse::success(
        "TOPEMS-IAM is running!".to_string(),
        "OK",
    ))
}

use crate::models::user::{LoginRequest, RefreshTokenRequest, RegisterRequest};
use crate::services::auth_service::AuthService;
use crate::services::user_service::UserService;
use topems_shared::Claims;
use uuid::Uuid;

async fn login(
    axum::extract::State(state): axum::extract::State<AppState>,
    Json(req): Json<LoginRequest>,
) -> Json<ApiResponse<crate::models::user::LoginResponse>> {
    let auth_service = AuthService::new(state.db.clone());
    let result = auth_service.login(req).await;
    Json(result)
}

async fn register(
    axum::extract::State(state): axum::extract::State<AppState>,
    Json(req): Json<RegisterRequest>,
) -> Json<ApiResponse<crate::models::user::LoginResponse>> {
    let auth_service = AuthService::new(state.db.clone());
    let result = auth_service.register(req).await;
    Json(result)
}

async fn refresh_token(
    axum::extract::State(state): axum::extract::State<AppState>,
    Json(req): Json<RefreshTokenRequest>,
) -> Json<ApiResponse<crate::models::user::RefreshTokenResponse>> {
    let auth_service = AuthService::new(state.db.clone());
    let result = auth_service.refresh_token(req).await;
    Json(result)
}

async fn get_current_user(
    axum::extract::State(state): axum::extract::State<AppState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
) -> Json<ApiResponse<crate::models::user::UserInfo>> {
    let user_service = UserService::new(state.db.clone());
    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return Json(ApiResponse::error(400, "无效的用户ID")),
    };

    let user = user_service.get_user_by_id(&user_id).await;
    match user {
        Some(user) => Json(ApiResponse::success(user.into(), "获取当前用户成功")),
        None => Json(ApiResponse::error(404, "用户不存在")),
    }
}
