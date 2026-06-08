use axum::{
    extract::{Path, Query, State},
    http::Method,
    response::Json,
    routing::*,
    Router,
};
use chrono::Utc;
use dotenv::dotenv;
use jsonwebtoken::{decode, DecodingKey, Validation, Algorithm};
use serde::{Deserialize, Serialize};
use sqlx::{postgres::PgPoolOptions, FromRow, PgPool};
use tokio::net::TcpListener;
use tower_http::{cors::CorsLayer, trace::TraceLayer};
use tracing::{info, instrument};
use uuid::Uuid;

use topems_shared::{
    auth::Claims,
    response::{ApiResponse, api_error},
    Notification as SharedNotification,
    NotificationType,
};

#[derive(Clone)]
pub struct ApiState {
    db: PgPool,
    jwt_secret: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Notification {
    pub id: Uuid,
    pub user_id: Uuid,
    pub title: String,
    pub content: String,
    pub notification_type: String,
    pub is_read: bool,
    pub priority: i32,
    pub data: Option<serde_json::Value>,
    pub link_url: Option<String>,
    pub created_at: chrono::DateTime<Utc>,
    pub read_at: Option<chrono::DateTime<Utc>>,
}

impl From<Notification> for SharedNotification {
    fn from(n: Notification) -> Self {
        SharedNotification {
            id: n.id,
            user_id: n.user_id,
            notification_type: NotificationType::from(n.notification_type.as_str()),
            title: n.title,
            content: n.content,
            data: n.data,
            link_url: n.link_url,
            is_read: n.is_read,
            priority: n.priority,
            created_at: n.created_at,
            read_at: n.read_at,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateNotificationRequest {
    pub title: String,
    pub content: String,
    #[serde(default = "default_notification_type")]
    pub notification_type: String,
    #[serde(default = "default_priority")]
    pub priority: i32,
    pub data: Option<serde_json::Value>,
    pub link_url: Option<String>,
}

fn default_notification_type() -> String {
    "info".to_string()
}

fn default_priority() -> i32 {
    1
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationListResponse {
    pub notifications: Vec<SharedNotification>,
    pub total: i64,
    pub page: u32,
    pub page_size: u32,
    pub unread_count: i64,
}

#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    page: Option<u32>,
    page_size: Option<u32>,
    notification_type: Option<String>,
}

fn validate_token(headers: &axum::http::HeaderMap, secret: &str) -> Option<Claims> {
    let auth_header = headers.get(axum::http::header::AUTHORIZATION)?.to_str().ok()?;
    if !auth_header.starts_with("Bearer ") {
        return None;
    }
    
    let token = auth_header.strip_prefix("Bearer ")?;
    
    match decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_ref()),
        &Validation::new(Algorithm::HS256),
    ) {
        Ok(token_data) => Some(token_data.claims),
        Err(_) => None,
    }
}

#[instrument]
async fn health_check() -> Json<ApiResponse<String>> {
    Json(ApiResponse::success("Notification service is running".to_string(), "Success"))
}

async fn list_notifications(
    State(state): State<ApiState>,
    headers: axum::http::HeaderMap,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<NotificationListResponse>> {
    let claims = match validate_token(&headers, &state.jwt_secret) {
        Some(c) => c,
        None => return Json(api_error(401, "Unauthorized")),
    };
    
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = ((page - 1) * page_size) as i64;
    
    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return Json(api_error(400, "Invalid user ID")),
    };
    
    let notifications = match sqlx::query_as::<_, Notification>(
        "SELECT * FROM notification.notifications 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2 OFFSET $3"
    )
    .bind(user_id)
    .bind(page_size as i64)
    .bind(offset)
    .fetch_all(&state.db)
    .await {
        Ok(n) => n.into_iter().map(SharedNotification::from).collect(),
        Err(e) => {
            tracing::error!("查询通知失败: {}", e);
            return Json(api_error(500, "查询通知失败"));
        }
    };
    
    let total: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM notification.notifications WHERE user_id = $1"
    )
    .bind(user_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);
    
    let unread_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM notification.notifications WHERE user_id = $1 AND is_read = false"
    )
    .bind(user_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);
    
    Json(ApiResponse::success(NotificationListResponse {
        notifications,
        total,
        page,
        page_size,
        unread_count,
    }, "Success"))
}

async fn list_unread_notifications(
    State(state): State<ApiState>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<Vec<SharedNotification>>> {
    let claims = match validate_token(&headers, &state.jwt_secret) {
        Some(c) => c,
        None => return Json(api_error(401, "Unauthorized")),
    };
    
    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return Json(api_error(400, "Invalid user ID")),
    };
    
    let notifications = match sqlx::query_as::<_, Notification>(
        "SELECT * FROM notification.notifications 
         WHERE user_id = $1 AND is_read = false 
         ORDER BY created_at DESC"
    )
    .bind(user_id)
    .fetch_all(&state.db)
    .await {
        Ok(n) => n.into_iter().map(SharedNotification::from).collect(),
        Err(e) => {
            tracing::error!("查询未读通知失败: {}", e);
            return Json(api_error(500, "查询未读通知失败"));
        }
    };
    
    Json(ApiResponse::success(notifications, "Success"))
}

async fn get_unread_count(
    State(state): State<ApiState>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<i64>> {
    let claims = match validate_token(&headers, &state.jwt_secret) {
        Some(c) => c,
        None => return Json(api_error(401, "Unauthorized")),
    };
    
    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return Json(api_error(400, "Invalid user ID")),
    };
    
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM notification.notifications WHERE user_id = $1 AND is_read = false"
    )
    .bind(user_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);
    
    Json(ApiResponse::success(count, "Success"))
}

async fn get_notification(
    State(state): State<ApiState>,
    headers: axum::http::HeaderMap,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<SharedNotification>> {
    let claims = match validate_token(&headers, &state.jwt_secret) {
        Some(c) => c,
        None => return Json(api_error(401, "Unauthorized")),
    };
    
    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return Json(api_error(400, "Invalid user ID")),
    };
    
    let notification = match sqlx::query_as::<_, Notification>(
        "SELECT * FROM notification.notifications WHERE id = $1 AND user_id = $2"
    )
    .bind(id)
    .bind(user_id)
    .fetch_optional(&state.db)
    .await {
        Ok(n) => n.map(SharedNotification::from),
        Err(e) => {
            tracing::error!("查询通知详情失败: {}", e);
            return Json(api_error(500, "查询通知详情失败"));
        }
    };
    
    match notification {
        Some(n) => Json(ApiResponse::success(n, "Success")),
        None => Json(api_error(404, "通知不存在")),
    }
}

async fn create_notification(
    State(state): State<ApiState>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateNotificationRequest>,
) -> Json<ApiResponse<SharedNotification>> {
    let claims = match validate_token(&headers, &state.jwt_secret) {
        Some(c) => c,
        None => return Json(api_error(401, "Unauthorized")),
    };
    
    let id = Uuid::new_v4();
    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return Json(api_error(400, "Invalid user ID")),
    };
    let now = Utc::now();
    
    let notification = match sqlx::query_as::<_, Notification>(
        "INSERT INTO notification.notifications 
         (id, user_id, title, content, notification_type, priority, data, link_url, created_at, is_read)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *"
    )
    .bind(id)
    .bind(user_id)
    .bind(&req.title)
    .bind(&req.content)
    .bind(&req.notification_type)
    .bind(req.priority)
    .bind(&req.data)
    .bind(&req.link_url)
    .bind(now)
    .bind(false)
    .fetch_one(&state.db)
    .await {
        Ok(n) => n,
        Err(e) => {
            tracing::error!("创建通知失败: {}", e);
            return Json(api_error(500, "创建通知失败"));
        }
    };
    
    Json(ApiResponse::success(SharedNotification::from(notification), "Success"))
}

async fn mark_as_read(
    State(state): State<ApiState>,
    headers: axum::http::HeaderMap,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<SharedNotification>> {
    let claims = match validate_token(&headers, &state.jwt_secret) {
        Some(c) => c,
        None => return Json(api_error(401, "Unauthorized")),
    };
    
    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return Json(api_error(400, "Invalid user ID")),
    };
    let now = Utc::now();
    
    let notification = match sqlx::query_as::<_, Notification>(
        "UPDATE notification.notifications 
         SET is_read = true, read_at = $1 
         WHERE id = $2 AND user_id = $3 AND is_read = false
         RETURNING *"
    )
    .bind(now)
    .bind(id)
    .bind(user_id)
    .fetch_optional(&state.db)
    .await {
        Ok(n) => n.map(SharedNotification::from),
        Err(e) => {
            tracing::error!("标记通知为已读失败: {}", e);
            return Json(api_error(500, "标记通知为已读失败"));
        }
    };
    
    match notification {
        Some(n) => Json(ApiResponse::success(n, "Success")),
        None => Json(api_error(404, "通知不存在或已读")),
    }
}

async fn mark_all_as_read(
    State(state): State<ApiState>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<i64>> {
    let claims = match validate_token(&headers, &state.jwt_secret) {
        Some(c) => c,
        None => return Json(api_error(401, "Unauthorized")),
    };
    
    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return Json(api_error(400, "Invalid user ID")),
    };
    let now = Utc::now();
    
    let result = match sqlx::query(
        "UPDATE notification.notifications 
         SET is_read = true, read_at = $1 
         WHERE user_id = $2 AND is_read = false"
    )
    .bind(now)
    .bind(user_id)
    .execute(&state.db)
    .await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("标记所有通知为已读失败: {}", e);
            return Json(api_error(500, "标记所有通知为已读失败"));
        }
    };
    
    Json(ApiResponse::success(result.rows_affected() as i64, "Success"))
}

async fn delete_notification(
    State(state): State<ApiState>,
    headers: axum::http::HeaderMap,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    let claims = match validate_token(&headers, &state.jwt_secret) {
        Some(c) => c,
        None => return Json(api_error(401, "Unauthorized")),
    };
    
    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => return Json(api_error(400, "Invalid user ID")),
    };
    
    let result = match sqlx::query(
        "DELETE FROM notification.notifications WHERE id = $1 AND user_id = $2"
    )
    .bind(id)
    .bind(user_id)
    .execute(&state.db)
    .await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("删除通知失败: {}", e);
            return Json(api_error(500, "删除通知失败"));
        }
    };
    
    if result.rows_affected() > 0 {
        Json(ApiResponse::success(true, "Success"))
    } else {
        Json(api_error(404, "通知不存在"))
    }
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv().ok();
    
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .init();

    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://topems:topems_secret@localhost:5432/topems".to_string());
    
    let jwt_secret = std::env::var("JWT_SECRET")
        .unwrap_or_else(|_| "topems-jwt-secret-key-must-be-at-least-32-characters-long-for-hs256".to_string());
    
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to connect to database");

    info!("✅ 数据库连接成功");

    let state = ApiState {
        db: pool.clone(),
        jwt_secret,
    };

    let port = std::env::var("SERVER_PORT")
        .or_else(|_| std::env::var("PORT"))
        .unwrap_or_else(|_| "8003".to_string());

    let app = Router::new()
        .route("/health", get(health_check))
        .route("/api/v1/notifications", get(list_notifications).post(create_notification))
        .route("/api/v1/notifications/unread", get(list_unread_notifications))
        .route("/api/v1/notifications/unread-count", get(get_unread_count))
        .route("/api/v1/notifications/{id}", get(get_notification).put(mark_as_read).delete(delete_notification))
        .route("/api/v1/notifications/read-all", put(mark_all_as_read))
        .with_state(state)
        .layer(CorsLayer::new()
            .allow_origin(tower_http::cors::Any)
            .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
            .allow_headers(tower_http::cors::Any))
        .layer(TraceLayer::new_for_http());

    let addr: std::net::SocketAddr = format!("0.0.0.0:{}", port).parse().unwrap();
    let listener = TcpListener::bind(addr).await.unwrap();
    
    info!("🚀 Notification服务启动成功，监听端口: {}", port);
    
    axum::serve(listener, app).await.unwrap();

    Ok(())
}