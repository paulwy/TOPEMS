use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Path, Query, State,
    },
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::Utc;
use futures_util::{sink::SinkExt, stream::StreamExt};
use std::net::SocketAddr;
use tokio::sync::broadcast;
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use uuid::Uuid;
use sqlx::PgPool;
use dotenv::dotenv;
use serde::{Deserialize, Serialize};

mod models;
mod db;
use models::*;
use db::*;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum WsMessage {
    #[serde(rename = "notification")]
    NewNotification(Notification),
    #[serde(rename = "unread_count")]
    UnreadCount(usize),
    #[serde(rename = "ping")]
    Ping,
    #[serde(rename = "pong")]
    Pong,
    #[serde(rename = "subscribe")]
    Subscribe { user_id: String },
    #[serde(rename = "unsubscribe")]
    Unsubscribe { user_id: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiResponse<T> {
    pub code: i32,
    pub success: bool,
    pub data: Option<T>,
    pub message: String,
    pub timestamp: String,
}

impl<T> ApiResponse<T> {
    pub fn success(data: T, message: String) -> Self {
        ApiResponse {
            code: 200,
            success: true,
            data: Some(data),
            message,
            timestamp: Utc::now().to_rfc3339(),
        }
    }

    pub fn error(message: String) -> Self {
        ApiResponse {
            code: 500,
            success: false,
            data: None,
            message,
            timestamp: Utc::now().to_rfc3339(),
        }
    }

    pub fn not_found(message: String) -> Self {
        ApiResponse {
            code: 404,
            success: false,
            data: None,
            message,
            timestamp: Utc::now().to_rfc3339(),
        }
    }
}

#[derive(Clone)]
struct AppState {
    tx: broadcast::Sender<WsMessage>,
    pool: PgPool,
}

async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(DatabaseSchema::create_table())
        .execute(pool)
        .await?;
    
    sqlx::query(DatabaseSchema::create_index_user_id())
        .execute(pool)
        .await?;
    
    sqlx::query(DatabaseSchema::create_index_is_read())
        .execute(pool)
        .await?;
    
    sqlx::query(DatabaseSchema::create_index_created_at())
        .execute(pool)
        .await?;
    
    Ok(())
}

#[tokio::main]
async fn main() {
    dotenv().ok();
    
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "notification_service=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("🚀 TOPEMS Notification Service starting...");

    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://topems:topems_secret@localhost:5432/topems_notifications".to_string());

    let pool = match PgPool::connect(&database_url).await {
        Ok(p) => {
            tracing::info!("Database connection successful");
            if let Err(e) = init_database(&p).await {
                tracing::warn!("Database initialization warning: {}", e);
            }
            p
        }
        Err(e) => {
            tracing::error!("Failed to connect to database: {}", e);
            panic!("Cannot connect to database: {}", e);
        }
    };

    let (tx, _) = broadcast::channel(1000);
    let state = AppState { tx, pool };

    let cors = {
        use axum::http::HeaderValue;
        use tower_http::cors::AllowOrigin;
        
        let allowed_origins = std::env::var("CORS_ALLOWED_ORIGINS")
            .unwrap_or_else(|_| "http://localhost:3000,http://localhost:5173".to_string());
        
        let origins: Vec<HeaderValue> = allowed_origins
            .split(',')
            .filter_map(|origin| origin.trim().parse().ok())
            .collect();
        
        let allow_origin = if origins.is_empty() {
            tracing::warn!("No CORS origins configured, allowing any origin (not recommended for production)");
            AllowOrigin::any()
        } else {
            tracing::info!("CORS allowed origins: {:?}", origins);
            AllowOrigin::list(origins)
        };
        
        CorsLayer::new()
            .allow_origin(allow_origin)
            .allow_methods(Any)
            .allow_headers(Any)
    };

    let app = Router::new()
        .route("/", get(home))
        .route("/health", get(health))
        .route("/api/v1/notifications", get(list_notifications))
        .route("/api/v1/notifications", post(create_notification))
        .route("/api/v1/notifications/unread", get(get_unread_notifications))
        .route("/api/v1/notifications/unread-count", get(get_unread_count))
        .route("/api/v1/notifications/:id/read", put(mark_as_read))
        .route("/api/v1/notifications/read-all", put(mark_all_as_read))
        .route("/api/v1/notifications/:id", delete(delete_notification))
        .route("/ws/notifications", get(ws_handler))
        .layer(cors)
        .with_state(state);

    let port = std::env::var("SERVER_PORT")
        .unwrap_or_else(|_| "8006".to_string())
        .parse()
        .unwrap_or(8006);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("✅ Notification Service is running at http://{}", addr);

    axum::serve(
        tokio::net::TcpListener::bind(&addr).await.unwrap(),
        app.into_make_service(),
    )
    .await
    .unwrap();
}

async fn home() -> &'static str {
    "TOPEMS Notification Service API\n\nCheck out the API at /health"
}

async fn health() -> Json<ApiResponse<String>> {
    Json(ApiResponse::success(
        "Notification Service is running!".to_string(),
        "OK".to_string(),
    ))
}

async fn list_notifications(
    State(state): State<AppState>,
    Query(query): Query<NotificationListQuery>,
) -> Json<ApiResponse<NotificationListResponse>> {
    let user_id = std::env::var("CURRENT_USER_ID")
        .unwrap_or_else(|_| "user_001".to_string());
    
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(20);
    
    let notifications = match Repository::get_user_notifications(
        &state.pool,
        &user_id,
        query.notification_type.as_ref(),
        page,
        page_size,
    ).await {
        Ok(n) => n,
        Err(e) => {
            tracing::error!("Failed to get notifications: {:?}", e);
            vec![]
        }
    };
    
    let total = Repository::get_user_notifications_count(
        &state.pool,
        &user_id,
        query.notification_type.as_ref(),
    ).await.unwrap_or(0);
    
    let unread_count = Repository::get_unread_count(&state.pool, &user_id).await.unwrap_or(0);

    Json(ApiResponse::success(
        NotificationListResponse {
            notifications,
            total,
            page,
            page_size,
            unread_count,
        },
        "Notifications retrieved successfully".to_string(),
    ))
}

async fn create_notification(
    State(state): State<AppState>,
    Json(req): Json<CreateNotificationRequest>,
) -> Json<ApiResponse<Notification>> {
    match Repository::create_notification(&state.pool, req).await {
        Ok(notification) => {
            let _ = state.tx.send(WsMessage::NewNotification(notification.clone()));
            
            let unread_count = Repository::get_unread_count(&state.pool, &notification.user_id).await.unwrap_or(0);
            let _ = state.tx.send(WsMessage::UnreadCount(unread_count));
            
            Json(ApiResponse::success(notification, "Notification created successfully".to_string()))
        }
        Err(e) => {
            tracing::error!("Failed to create notification: {}", e);
            Json(ApiResponse::error(format!("Failed to create notification: {}", e)))
        }
    }
}

async fn get_unread_notifications(
    State(state): State<AppState>,
) -> Json<ApiResponse<Vec<Notification>>> {
    let user_id = std::env::var("CURRENT_USER_ID")
        .unwrap_or_else(|_| "user_001".to_string());
    
    let notifications = Repository::get_unread_notifications(&state.pool, &user_id).await.unwrap_or_default();

    Json(ApiResponse::success(notifications, "Unread notifications retrieved successfully".to_string()))
}

async fn get_unread_count(
    State(state): State<AppState>,
) -> Json<ApiResponse<usize>> {
    let user_id = std::env::var("CURRENT_USER_ID")
        .unwrap_or_else(|_| "user_001".to_string());
    
    let count = Repository::get_unread_count(&state.pool, &user_id).await.unwrap_or(0);

    Json(ApiResponse::success(count, "Unread count retrieved successfully".to_string()))
}

async fn mark_as_read(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<Notification>> {
    match Uuid::parse_str(&id) {
        Ok(uuid) => {
            match Repository::mark_as_read(&state.pool, &uuid).await {
                Ok(Some(notification)) => {
                    let _ = state.tx.send(WsMessage::NewNotification(notification.clone()));
                    
                    let unread_count = Repository::get_unread_count(&state.pool, &notification.user_id).await.unwrap_or(0);
                    let _ = state.tx.send(WsMessage::UnreadCount(unread_count));
                    
                    Json(ApiResponse::success(notification, "Notification marked as read".to_string()))
                }
                Ok(None) => Json(ApiResponse::not_found("Notification not found".to_string())),
                Err(e) => {
                    tracing::error!("Failed to mark as read: {}", e);
                    Json(ApiResponse::error(format!("Failed to mark as read: {}", e)))
                }
            }
        }
        Err(_) => Json(ApiResponse::error("Invalid notification ID".to_string())),
    }
}

async fn mark_all_as_read(
    State(state): State<AppState>,
) -> Json<ApiResponse<usize>> {
    let user_id = std::env::var("CURRENT_USER_ID")
        .unwrap_or_else(|_| "user_001".to_string());
    
    match Repository::mark_all_as_read(&state.pool, &user_id).await {
        Ok(count) => {
            let _ = state.tx.send(WsMessage::UnreadCount(0));
            Json(ApiResponse::success(count, format!("Marked {} notifications as read", count)))
        }
        Err(e) => {
            tracing::error!("Failed to mark all as read: {}", e);
            Json(ApiResponse::error(format!("Failed to mark all as read: {}", e)))
        }
    }
}

async fn delete_notification(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<bool>> {
    match Uuid::parse_str(&id) {
        Ok(uuid) => {
            let user_id_opt = Repository::get_notification(&state.pool, &uuid).await
                .ok()
                .flatten()
                .map(|n| n.user_id.clone());
                
            match Repository::delete_notification(&state.pool, &uuid).await {
                Ok(true) => {
                    if let Some(user_id) = user_id_opt {
                        let unread_count = Repository::get_unread_count(&state.pool, &user_id).await.unwrap_or(0);
                        let _ = state.tx.send(WsMessage::UnreadCount(unread_count));
                    }
                    Json(ApiResponse::success(true, "Notification deleted successfully".to_string()))
                }
                Ok(false) => Json(ApiResponse::not_found("Notification not found".to_string())),
                Err(e) => {
                    tracing::error!("Failed to delete notification: {}", e);
                    Json(ApiResponse::error(format!("Failed to delete notification: {}", e)))
                }
            }
        }
        Err(_) => Json(ApiResponse::error("Invalid notification ID".to_string())),
    }
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> impl axum::response::IntoResponse {
    ws.on_upgrade(|socket| websocket_handler(socket, state))
}

async fn websocket_handler(socket: WebSocket, state: AppState) {
    let (mut sender, mut receiver) = socket.split();
    let mut rx = state.tx.subscribe();
    let mut user_id: Option<String> = None;

    let _ = sender.send(Message::Text(serde_json::to_string(&WsMessage::Ping).unwrap())).await;

    loop {
        tokio::select! {
            msg = receiver.next() => {
                match msg {
                    Some(Ok(Message::Text(text))) => {
                        if let Ok(ws_msg) = serde_json::from_str::<WsMessage>(&text) {
                            match ws_msg {
                                WsMessage::Subscribe { user_id: uid } => {
                                    user_id = Some(uid);
                                    tracing::info!("User {} subscribed to notifications", user_id.as_ref().unwrap());
                                    
                                    if let Some(uid) = &user_id {
                                        if let Ok(count) = Repository::get_unread_count(&state.pool, uid).await {
                                            let _ = sender.send(Message::Text(
                                                serde_json::to_string(&WsMessage::UnreadCount(count)).unwrap()
                                            )).await;
                                        }
                                    }
                                }
                                WsMessage::Unsubscribe { user_id: uid } => {
                                    tracing::info!("User {} unsubscribed from notifications", uid);
                                    if user_id.as_ref() == Some(&uid) {
                                        user_id = None;
                                    }
                                }
                                WsMessage::Ping => {
                                    let _ = sender.send(Message::Text(
                                        serde_json::to_string(&WsMessage::Pong).unwrap()
                                    )).await;
                                }
                                _ => {}
                            }
                        }
                    }
                    Some(Ok(Message::Close(_))) | None => {
                        tracing::info!("WebSocket connection closed");
                        break;
                    }
                    _ => {}
                }
            }
            broadcast_msg = rx.recv() => {
                if let Ok(msg) = broadcast_msg {
                    if let WsMessage::NewNotification(ref notification) = msg {
                        if let Some(ref uid) = user_id {
                            if notification.user_id == *uid {
                                let _ = sender.send(Message::Text(
                                    serde_json::to_string(&msg).unwrap()
                                )).await;
                            }
                        }
                    } else {
                        let _ = sender.send(Message::Text(
                            serde_json::to_string(&msg).unwrap()
                        )).await;
                    }
                }
            }
        }
    }
}
