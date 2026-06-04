use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Path, Query, State, FromRef, Request,
    },
    routing::{delete, get, post, put},
    Json, Router,
};
use futures_util::{sink::SinkExt, stream::StreamExt};
use std::net::SocketAddr;
use tokio::sync::broadcast;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use uuid::Uuid;
use sqlx::PgPool;
use dotenv;
use serde::{Deserialize, Serialize};
use topems_shared::{ApiResponse, AuthState, auth_middleware, create_cors_layer, Claims};

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



#[derive(Clone)]
struct AppState {
    auth_state: AuthState,
    tx: broadcast::Sender<WsMessage>,
    pool: PgPool,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
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
    _ = dotenv::dotenv();
    
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "notification_service=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("🚀 TOPEMS Notification Service starting...");

    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://topems:topems_secret@localhost:5432/topems".to_string());

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
    let auth_state = AuthState::from_env();
    let state = AppState { auth_state, tx, pool };

    let cors = create_cors_layer();

    let public_routes = Router::new()
        .route("/", get(home))
        .route("/health", get(health));

    let protected_routes = Router::new()
        .route("/api/v1/notifications", get(list_notifications))
        .route("/api/v1/notifications", post(create_notification))
        .route("/api/v1/notifications/unread", get(get_unread_notifications))
        .route("/api/v1/notifications/unread-count", get(get_unread_count))
        .route("/api/v1/notifications/{id}/read", put(mark_as_read))
        .route("/api/v1/notifications/read-all", put(mark_all_as_read))
        .route("/api/v1/notifications/{id}", delete(delete_notification))
        .route("/api/v1/notifications/bulk/read", put(bulk_mark_as_read))
        .route("/api/v1/notifications/bulk/delete", post(bulk_delete_notifications))
        .route("/api/v1/health/detailed", get(detailed_health))
        .route("/api/v1/metrics", get(get_metrics))
        .route("/ws/notifications", get(ws_handler))
        .layer(axum::middleware::from_fn_with_state(
            state.auth_state.clone(),
            auth_middleware,
        ));

    let app = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .layer(cors)
        .with_state(state);

    let port = std::env::var("SERVER_PORT")
        .unwrap_or_else(|_| "8003".to_string())
        .parse()
        .unwrap_or(8003);
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
        "OK",
    ))
}

fn extract_user_id(req: &Request) -> String {
    req.extensions()
        .get::<Claims>()
        .map(|claims| claims.sub.clone())
        .unwrap_or_else(|| {
            std::env::var("CURRENT_USER_ID")
                .unwrap_or_else(|_| "user_001".to_string())
        })
}

async fn list_notifications(
    State(state): State<AppState>,
    Query(query): Query<NotificationListQuery>,
    req: Request,
) -> Json<ApiResponse<NotificationListResponse>> {
    let user_id = extract_user_id(&req);
    
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
        "Notifications retrieved successfully",
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
            
            Json(ApiResponse::success(notification, "Notification created successfully"))
        }
        Err(e) => {
            tracing::error!("Failed to create notification: {}", e);
            Json(ApiResponse::error(500, &format!("Failed to create notification: {}", e)))
        }
    }
}

async fn get_unread_notifications(
    State(state): State<AppState>,
    req: Request,
) -> Json<ApiResponse<Vec<Notification>>> {
    let user_id = extract_user_id(&req);
    
    let notifications = Repository::get_unread_notifications(&state.pool, &user_id).await.unwrap_or_default();

    Json(ApiResponse::success(notifications, "Unread notifications retrieved successfully"))
}

async fn get_unread_count(
    State(state): State<AppState>,
    req: Request,
) -> Json<ApiResponse<usize>> {
    let user_id = extract_user_id(&req);
    
    let count = Repository::get_unread_count(&state.pool, &user_id).await.unwrap_or(0);

    Json(ApiResponse::success(count, "Unread count retrieved successfully"))
}

async fn mark_as_read(
    State(state): State<AppState>,
    Path(id): Path<String>,
    req: Request,
) -> Json<ApiResponse<Notification>> {
    match Uuid::parse_str(&id) {
        Ok(uuid) => {
            match Repository::mark_as_read(&state.pool, &uuid).await {
                Ok(Some(notification)) => {
                    let _ = state.tx.send(WsMessage::NewNotification(notification.clone()));
                    
                    let user_id = extract_user_id(&req);
                    let unread_count = Repository::get_unread_count(&state.pool, &user_id).await.unwrap_or(0);
                    let _ = state.tx.send(WsMessage::UnreadCount(unread_count));
                    
                    Json(ApiResponse::success(notification, "Notification marked as read"))
                }
                Ok(None) => Json(ApiResponse::error(404, "Notification not found")),
                Err(e) => {
                    tracing::error!("Failed to mark as read: {}", e);
                    Json(ApiResponse::error(500, &format!("Failed to mark as read: {}", e)))
                }
            }
        }
        Err(_) => Json(ApiResponse::error(400, "Invalid notification ID")),
    }
}

async fn mark_all_as_read(
    State(state): State<AppState>,
    req: Request,
) -> Json<ApiResponse<usize>> {
    let user_id = extract_user_id(&req);
    
    match Repository::mark_all_as_read(&state.pool, &user_id).await {
        Ok(count) => {
            let _ = state.tx.send(WsMessage::UnreadCount(0));
            Json(ApiResponse::success(count, &format!("Marked {} notifications as read", count)))
        }
        Err(e) => {
            tracing::error!("Failed to mark all as read: {}", e);
            Json(ApiResponse::error(500, &format!("Failed to mark all as read: {}", e)))
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
                    Json(ApiResponse::success(true, "Notification deleted successfully"))
                }
                Ok(false) => Json(ApiResponse::error(404, "Notification not found")),
                Err(e) => {
                    tracing::error!("Failed to delete notification: {}", e);
                    Json(ApiResponse::error(500, &format!("Failed to delete notification: {}", e)))
                }
            }
        }
        Err(_) => Json(ApiResponse::error(400, "Invalid notification ID")),
    }
}

async fn bulk_mark_as_read(
    State(state): State<AppState>,
    Json(req): Json<BulkOperationRequest>,
) -> Json<ApiResponse<usize>> {
    let mut uuids = Vec::new();
    for id_str in &req.ids {
        if let Ok(uuid) = Uuid::parse_str(id_str) {
            uuids.push(uuid);
        }
    }
    
    if uuids.is_empty() {
        return Json(ApiResponse::error(400, "No valid notification IDs provided"));
    }
    
    match Repository::bulk_mark_as_read(&state.pool, &uuids).await {
        Ok(count) => {
            let _ = state.tx.send(WsMessage::UnreadCount(0));
            Json(ApiResponse::success(count, &format!("Marked {} notifications as read", count)))
        }
        Err(e) => {
            tracing::error!("Failed to bulk mark as read: {}", e);
            Json(ApiResponse::error(500, &format!("Failed to bulk mark as read: {}", e)))
        }
    }
}

async fn bulk_delete_notifications(
    State(state): State<AppState>,
    Json(req): Json<BulkOperationRequest>,
) -> Json<ApiResponse<usize>> {
    let mut uuids = Vec::new();
    for id_str in &req.ids {
        if let Ok(uuid) = Uuid::parse_str(id_str) {
            uuids.push(uuid);
        }
    }
    
    if uuids.is_empty() {
        return Json(ApiResponse::error(400, "No valid notification IDs provided"));
    }
    
    match Repository::bulk_delete_notifications(&state.pool, &uuids).await {
        Ok(count) => {
            let _ = state.tx.send(WsMessage::UnreadCount(0));
            Json(ApiResponse::success(count, &format!("Deleted {} notifications", count)))
        }
        Err(e) => {
            tracing::error!("Failed to bulk delete notifications: {}", e);
            Json(ApiResponse::error(500, &format!("Failed to bulk delete notifications: {}", e)))
        }
    }
}

async fn detailed_health(
    State(state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    let db_status = match sqlx::query("SELECT 1").fetch_one(&state.pool).await {
        Ok(_) => "healthy",
        Err(_) => "unhealthy",
    };
    
    let metrics = get_metrics_internal(&state.pool).await;
    
    let response = serde_json::json!({
        "service": "notification-service",
        "status": if db_status == "healthy" { "healthy" } else { "unhealthy" },
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "dependencies": [
            {
                "name": "postgresql",
                "status": db_status,
                "message": if db_status == "healthy" { "Connection successful" } else { "Connection failed" }
            }
        ],
        "metrics": metrics,
        "version": "1.0.0"
    });
    
    Json(ApiResponse::success(response, "Detailed health check"))
}

async fn get_metrics(
    State(state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    let metrics = get_metrics_internal(&state.pool).await;
    Json(ApiResponse::success(metrics, "Metrics retrieved successfully"))
}

async fn get_metrics_internal(pool: &PgPool) -> serde_json::Value {
    let total_count: Result<i64, _> = sqlx::query_scalar("SELECT COUNT(*) FROM notifications").fetch_one(pool).await;
    let unread_count: Result<i64, _> = sqlx::query_scalar("SELECT COUNT(*) FROM notifications WHERE is_read = FALSE").fetch_one(pool).await;
    let system_count: Result<i64, _> = sqlx::query_scalar("SELECT COUNT(*) FROM notifications WHERE notification_type = 'system'").fetch_one(pool).await;
    let workflow_count: Result<i64, _> = sqlx::query_scalar("SELECT COUNT(*) FROM notifications WHERE notification_type = 'workflow'").fetch_one(pool).await;
    let reminder_count: Result<i64, _> = sqlx::query_scalar("SELECT COUNT(*) FROM notifications WHERE notification_type = 'reminder'").fetch_one(pool).await;
    let alert_count: Result<i64, _> = sqlx::query_scalar("SELECT COUNT(*) FROM notifications WHERE notification_type = 'alert'").fetch_one(pool).await;
    let message_count: Result<i64, _> = sqlx::query_scalar("SELECT COUNT(*) FROM notifications WHERE notification_type = 'message'").fetch_one(pool).await;
    
    serde_json::json!({
        "total_notifications": total_count.unwrap_or(0),
        "unread_notifications": unread_count.unwrap_or(0),
        "notifications_by_type": {
            "system": system_count.unwrap_or(0),
            "workflow": workflow_count.unwrap_or(0),
            "reminder": reminder_count.unwrap_or(0),
            "alert": alert_count.unwrap_or(0),
            "message": message_count.unwrap_or(0)
        },
        "timestamp": chrono::Utc::now().to_rfc3339()
    })
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

    let _ = sender.send(Message::Text(serde_json::to_string(&WsMessage::Ping).unwrap().into())).await;

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
                                                serde_json::to_string(&WsMessage::UnreadCount(count)).unwrap().into()
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
                                        serde_json::to_string(&WsMessage::Pong).unwrap().into()
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
                                    serde_json::to_string(&msg).unwrap().into()
                                )).await;
                            }
                        }
                    } else {
                        let _ = sender.send(Message::Text(
                            serde_json::to_string(&msg).unwrap().into()
                        )).await;
                    }
                }
            }
        }
    }
}
