use axum::{
    Router,
    extract::FromRef,
};
use anyhow::Result;
use std::env;
use sqlx::PgPool;
use tower_http::services::ServeDir;

use topems_shared::{
    AuthState, auth_middleware, create_cors_layer,
    init_logging, ServiceHealth, build_health_response, create_api_info_router,
};

mod db;
mod models;
mod api;

// ==================== 应用状态 ====================

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub auth_state: AuthState,
    pub ws_manager: api::WebSocketManager,
}

impl FromRef<AppState> for PgPool {
    fn from_ref(state: &AppState) -> Self {
        state.pool.clone()
    }
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

impl FromRef<AppState> for api::WebSocketManager {
    fn from_ref(state: &AppState) -> Self {
        state.ws_manager.clone()
    }
}

impl FromRef<AppState> for (PgPool, api::WebSocketManager) {
    fn from_ref(state: &AppState) -> Self {
        (state.pool.clone(), state.ws_manager.clone())
    }
}

impl AppState {
    fn new(pool: PgPool, auth_state: AuthState) -> Self {
        AppState {
            pool,
            auth_state,
            ws_manager: api::WebSocketManager::new(),
        }
    }
}

// ==================== 健康检查 ====================

async fn health_check() -> ServiceHealth {
    build_health_response("topems-im", true)
}

// ==================== 主函数 ====================

#[tokio::main]
async fn main() -> Result<()> {
    dotenv::dotenv().ok();

    init_logging("topems-im");

    let database_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");

    let jwt_secret = env::var("JWT_SECRET")
        .unwrap_or_else(|_| {
            tracing::warn!("JWT_SECRET not set, using default (not recommended for production)");
            "topems-default-jwt-secret-change-me-in-production".to_string()
        });

    // 创建数据库连接池
    let pool = db::create_pool(&database_url).await?;
    tracing::info!("Database connection pool created");

    // 运行数据库迁移
    db::run_migrations(&pool).await?;
    tracing::info!("Database migrations completed");

    let app_state = AppState::new(pool, AuthState::from_env());

    let cors = create_cors_layer();

    let upload_dir = env::var("UPLOAD_DIR").unwrap_or_else(|_| "uploads".to_string());

    // ==================== 公开路由 ====================
    let public_routes = Router::new()
        // 健康检查
        .route("/health", axum::routing::get(health_check))
        
        // WebSocket连接
        .route("/api/v1/ws/connect", axum::routing::get(api::ws_connect_handler))
        
        // 聊天室列表（公开）
        .route("/api/v1/chat-rooms", axum::routing::get(api::list_chat_rooms))
        .route("/api/v1/chat-rooms/{id}", axum::routing::get(api::get_chat_room))
        .route("/api/v1/chat-rooms/{id}/messages", axum::routing::get(api::get_chat_room_messages))
        
        // 消息搜索（公开）
        .route("/api/v1/messages/search", axum::routing::get(api::search_messages))
        .route("/api/v1/messages/unread", axum::routing::get(api::get_unread_messages))
        
        // 用户在线状态（公开）
        .route("/api/v1/users/{id}/online-status", axum::routing::get(api::get_user_online_status))
        .route("/api/v1/users/online", axum::routing::get(api::list_online_users))
        
        // 文件下载（公开）
        .route("/api/v1/files/{id}/download", axum::routing::get(api::download_file))
        .route("/api/v1/files/share/{share_link}/download", axum::routing::get(api::download_shared_file))
        
        // 静态文件服务
        .nest_service("/uploads", ServeDir::new(&upload_dir));

    // ==================== 受保护路由 ====================
    let protected_routes = Router::new()
        // 聊天室管理
        .route("/api/v1/chat-rooms/create", axum::routing::post(api::create_chat_room))
        .route("/api/v1/chat-rooms/{id}", axum::routing::put(api::update_chat_room))
        .route("/api/v1/chat-rooms/{id}", axum::routing::delete(api::delete_chat_room))
        .route("/api/v1/chat-rooms/{id}/members", axum::routing::post(api::add_chat_room_member))
        .route("/api/v1/chat-rooms/{id}/members/{member_id}", axum::routing::delete(api::remove_chat_room_member))
        .route("/api/v1/chat-rooms/{id}/mute", axum::routing::put(api::mute_chat_room))
        .route("/api/v1/chat-rooms/{id}/unmute", axum::routing::put(api::unmute_chat_room))
        .route("/api/v1/chat-rooms/{id}/pin", axum::routing::put(api::pin_chat_room))
        .route("/api/v1/chat-rooms/{id}/unpin", axum::routing::put(api::unpin_chat_room))
        
        // 消息管理
        .route("/api/v1/messages/send", axum::routing::post(api::send_message))
        .route("/api/v1/messages/{id}", axum::routing::get(api::get_message))
        .route("/api/v1/messages/{id}", axum::routing::put(api::update_message))
        .route("/api/v1/messages/{id}", axum::routing::delete(api::delete_message))
        .route("/api/v1/messages/{id}/read", axum::routing::post(api::mark_message_read))
        .route("/api/v1/messages/{id}/reply", axum::routing::post(api::reply_message))
        .route("/api/v1/messages/{id}/forward", axum::routing::post(api::forward_message))
        
        // 联系人管理
        .route("/api/v1/contacts/add", axum::routing::post(api::add_contact))
        .route("/api/v1/contacts", axum::routing::get(api::list_contacts))
        .route("/api/v1/contacts/{id}", axum::routing::get(api::get_contact))
        .route("/api/v1/contacts/{id}", axum::routing::put(api::update_contact))
        .route("/api/v1/contacts/{id}", axum::routing::delete(api::delete_contact))
        .route("/api/v1/contacts/{id}/block", axum::routing::post(api::block_contact))
        .route("/api/v1/contacts/{id}/unblock", axum::routing::post(api::unblock_contact))
        .route("/api/v1/contacts/search", axum::routing::get(api::search_contacts))
        .route("/api/v1/contacts/blocked", axum::routing::get(api::list_blocked_contacts))
        
        // 联系人分组管理
        .route("/api/v1/contact-groups", axum::routing::get(api::list_contact_groups))
        .route("/api/v1/contact-groups/create", axum::routing::post(api::create_contact_group))
        .route("/api/v1/contact-groups/{id}", axum::routing::put(api::update_contact_group))
        .route("/api/v1/contact-groups/{id}", axum::routing::delete(api::delete_contact_group))
        
        // 文件传输
        .route("/api/v1/files/upload", axum::routing::post(api::upload_file))
        .route("/api/v1/files/{id}", axum::routing::get(api::get_file_info))
        .route("/api/v1/files/{id}", axum::routing::delete(api::delete_file))
        .route("/api/v1/files/{id}/share", axum::routing::post(api::share_file))
        .route("/api/v1/files/history", axum::routing::get(api::get_file_history))
        
        // 用户状态管理
        .route("/api/v1/users/{id}/status", axum::routing::put(api::update_user_status))
        
        // 添加认证中间件
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ));

    // ==================== 合并路由 ====================
    let app = public_routes
        .merge(protected_routes)
        .merge(create_api_info_router("topems-im"))
        .with_state(app_state)
        .layer(cors);

    // ==================== 启动服务器 ====================
    let port = env::var("SERVER_PORT")
        .unwrap_or_else(|_| env::var("PORT").unwrap_or_else(|_| "8051".to_string()));
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-IM 即时通讯系统启动中...");
    tracing::info!("📦 端口: {}", port);
    tracing::info!("🔒 认证保护已启用");
    tracing::info!("🔗 WebSocket端点: ws://0.0.0.0:{}/api/v1/ws/connect", port);
    tracing::info!("📁 文件上传目录: {}", upload_dir);
    tracing::info!("📊 API信息端点: http://0.0.0.0:{}/api/v1/info", port);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}