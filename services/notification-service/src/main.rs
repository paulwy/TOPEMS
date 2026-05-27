use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Path, Query, State,
    },
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::{DateTime, Utc};
use futures_util::{sink::SinkExt, stream::StreamExt};
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, net::SocketAddr, sync::Arc};
use tokio::sync::broadcast;
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum NotificationType {
    System,
    Workflow,
    Reminder,
    Alert,
    Message,
}

impl std::fmt::Display for NotificationType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            NotificationType::System => write!(f, "system"),
            NotificationType::Workflow => write!(f, "workflow"),
            NotificationType::Reminder => write!(f, "reminder"),
            NotificationType::Alert => write!(f, "alert"),
            NotificationType::Message => write!(f, "message"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Notification {
    pub id: String,
    pub user_id: String,
    pub notification_type: NotificationType,
    pub title: String,
    pub content: String,
    pub data: Option<serde_json::Value>,
    pub is_read: bool,
    pub priority: u8,
    pub created_at: DateTime<Utc>,
    pub read_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateNotificationRequest {
    pub user_id: String,
    pub notification_type: NotificationType,
    pub title: String,
    pub content: String,
    pub data: Option<serde_json::Value>,
    pub priority: Option<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationListQuery {
    pub page: Option<usize>,
    pub page_size: Option<usize>,
    pub notification_type: Option<NotificationType>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationListResponse {
    pub notifications: Vec<Notification>,
    pub total: usize,
    pub page: usize,
    pub page_size: usize,
    pub unread_count: usize,
}

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
    notifications: Arc<RwLock<HashMap<String, Notification>>>,
    user_notifications: Arc<RwLock<HashMap<String, Vec<String>>>>,
    tx: broadcast::Sender<WsMessage>,
}

impl AppState {
    fn new() -> Self {
        let (tx, _) = broadcast::channel(1000);
        Self {
            notifications: Arc::new(RwLock::new(HashMap::new())),
            user_notifications: Arc::new(RwLock::new(HashMap::new())),
            tx,
        }
    }

    fn add_notification(&self, notification: Notification) {
        let user_id = notification.user_id.clone();
        let id = notification.id.clone();
        
        self.notifications.write().insert(id.clone(), notification.clone());
        
        let mut user_ntf = self.user_notifications.write();
        user_ntf.entry(user_id.clone())
            .or_insert_with(Vec::new)
            .push(id.clone());
        
        let _ = self.tx.send(WsMessage::NewNotification(notification.clone()));
        
        if let Some(count) = self.get_unread_count(&user_id).ok() {
            let _ = self.tx.send(WsMessage::UnreadCount(count));
        }
    }

    fn get_user_notifications(&self, user_id: &str) -> Vec<Notification> {
        let user_ntf = self.user_notifications.read();
        let notifications = self.notifications.read();
        
        user_ntf.get(user_id)
            .map(|ids| {
                ids.iter()
                    .filter_map(|id| notifications.get(id).cloned())
                    .collect()
            })
            .unwrap_or_default()
    }

    fn get_unread_count(&self, user_id: &str) -> Result<usize, String> {
        let notifications = self.get_user_notifications(user_id);
        Ok(notifications.iter().filter(|n| !n.is_read).count())
    }

    fn mark_as_read(&self, notification_id: &str) -> Result<Notification, String> {
        let user_id = {
            let notifications = self.notifications.read();
            notifications.get(notification_id)
                .map(|n| n.user_id.clone())
                .ok_or_else(|| "Notification not found".to_string())?
        };

        {
            let mut notifications = self.notifications.write();
            if let Some(ntf) = notifications.get_mut(notification_id) {
                ntf.is_read = true;
                ntf.read_at = Some(Utc::now());
            }
        }

        let notification = self.notifications.read()
            .get(notification_id)
            .cloned()
            .ok_or_else(|| "Notification not found".to_string())?;

        if let Some(count) = self.get_unread_count(&user_id).ok() {
            let _ = self.tx.send(WsMessage::UnreadCount(count));
        }

        Ok(notification)
    }

    fn mark_all_as_read(&self, user_id: &str) -> Result<usize, String> {
        let user_ntf = self.user_notifications.read();
        let ids = user_ntf.get(user_id)
            .ok_or_else(|| "User not found".to_string())?
            .clone();
        drop(user_ntf);

        let mut count = 0;
        {
            let mut notifications = self.notifications.write();
            for id in &ids {
                if let Some(ntf) = notifications.get_mut(id) {
                    if !ntf.is_read {
                        ntf.is_read = true;
                        ntf.read_at = Some(Utc::now());
                        count += 1;
                    }
                }
            }
        }

        if count > 0 {
            let _ = self.tx.send(WsMessage::UnreadCount(0));
        }

        Ok(count)
    }

    fn delete_notification(&self, notification_id: &str) -> Result<bool, String> {
        let user_id = {
            let notifications = self.notifications.read();
            notifications.get(notification_id)
                .map(|n| n.user_id.clone())
                .ok_or_else(|| "Notification not found".to_string())?
        };

        {
            let mut notifications = self.notifications.write();
            notifications.remove(notification_id);
        }

        {
            let mut user_ntf = self.user_notifications.write();
            if let Some(ids) = user_ntf.get_mut(&user_id) {
                ids.retain(|id| id != notification_id);
            }
        }

        if let Some(count) = self.get_unread_count(&user_id).ok() {
            let _ = self.tx.send(WsMessage::UnreadCount(count));
        }

        Ok(true)
    }

    fn archive_old_notifications(&self, days: i64) -> usize {
        let cutoff = Utc::now() - chrono::Duration::days(days);
        let mut count = 0;
        
        let ids_to_delete: Vec<String> = {
            let notifications = self.notifications.read();
            notifications.iter()
                .filter(|(_, n)| n.created_at < cutoff && n.is_read)
                .map(|(id, _)| id.clone())
                .collect()
        };

        for id in ids_to_delete {
            if self.delete_notification(&id).is_ok() {
                count += 1;
            }
        }

        count
    }
}

#[tokio::main]
async fn main() {
    dotenv::dotenv().ok();
    
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "notification_service=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("🚀 TOPEMS Notification Service starting...");

    let state = AppState::new();

    let demo_user_id = "user_001".to_string();
    let demo_notifications = vec![
        Notification {
            id: Uuid::new_v4().to_string(),
            user_id: demo_user_id.clone(),
            notification_type: NotificationType::System,
            title: "系统维护通知".to_string(),
            content: "系统将于本周六进行例行维护，预计维护时间2小时".to_string(),
            data: None,
            is_read: false,
            priority: 1,
            created_at: Utc::now(),
            read_at: None,
        },
        Notification {
            id: Uuid::new_v4().to_string(),
            user_id: demo_user_id.clone(),
            notification_type: NotificationType::Workflow,
            title: "审批结果通知".to_string(),
            content: "您的采购申请已通过审批".to_string(),
            data: Some(serde_json::json!({"workflow_id": "WF001", "step": 2})),
            is_read: false,
            priority: 2,
            created_at: Utc::now(),
            read_at: None,
        },
        Notification {
            id: Uuid::new_v4().to_string(),
            user_id: demo_user_id.clone(),
            notification_type: NotificationType::Alert,
            title: "库存预警".to_string(),
            content: "原材料A库存低于安全库存，请及时采购".to_string(),
            data: Some(serde_json::json!({"material_id": "MAT001", "stock": 100})),
            is_read: true,
            priority: 3,
            created_at: Utc::now() - chrono::Duration::hours(2),
            read_at: Some(Utc::now() - chrono::Duration::hours(1)),
        },
    ];

    for notification in demo_notifications {
        state.add_notification(notification);
    }

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

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
    
    let mut notifications = state.get_user_notifications(&user_id);
    
    if let Some(ntype) = query.notification_type {
        notifications.retain(|n| n.notification_type == ntype);
    }
    
    notifications.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    
    let total = notifications.len();
    let start = (page - 1) * page_size;
    let _end = start + page_size;
    let paginated: Vec<Notification> = notifications
        .into_iter()
        .skip(start)
        .take(page_size)
        .collect();
    
    let unread_count = state.get_unread_count(&user_id).unwrap_or(0);

    Json(ApiResponse::success(
        NotificationListResponse {
            notifications: paginated,
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
    let notification = Notification {
        id: Uuid::new_v4().to_string(),
        user_id: req.user_id,
        notification_type: req.notification_type,
        title: req.title,
        content: req.content,
        data: req.data,
        is_read: false,
        priority: req.priority.unwrap_or(2),
        created_at: Utc::now(),
        read_at: None,
    };

    state.add_notification(notification.clone());

    Json(ApiResponse::success(notification, "Notification created successfully".to_string()))
}

async fn get_unread_notifications(
    State(state): State<AppState>,
) -> Json<ApiResponse<Vec<Notification>>> {
    let user_id = std::env::var("CURRENT_USER_ID")
        .unwrap_or_else(|_| "user_001".to_string());
    
    let notifications: Vec<Notification> = state.get_user_notifications(&user_id)
        .into_iter()
        .filter(|n| !n.is_read)
        .collect();

    Json(ApiResponse::success(notifications, "Unread notifications retrieved successfully".to_string()))
}

async fn get_unread_count(
    State(state): State<AppState>,
) -> Json<ApiResponse<usize>> {
    let user_id = std::env::var("CURRENT_USER_ID")
        .unwrap_or_else(|_| "user_001".to_string());
    
    let count = state.get_unread_count(&user_id).unwrap_or(0);

    Json(ApiResponse::success(count, "Unread count retrieved successfully".to_string()))
}

async fn mark_as_read(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<Notification>> {
    match state.mark_as_read(&id) {
        Ok(notification) => Json(ApiResponse::success(notification, "Notification marked as read".to_string())),
        Err(e) => Json(ApiResponse::error(e)),
    }
}

async fn mark_all_as_read(
    State(state): State<AppState>,
) -> Json<ApiResponse<usize>> {
    let user_id = std::env::var("CURRENT_USER_ID")
        .unwrap_or_else(|_| "user_001".to_string());
    
    match state.mark_all_as_read(&user_id) {
        Ok(count) => Json(ApiResponse::success(count, format!("Marked {} notifications as read", count))),
        Err(e) => Json(ApiResponse::error(e)),
    }
}

async fn delete_notification(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<bool>> {
    match state.delete_notification(&id) {
        Ok(_) => Json(ApiResponse::success(true, "Notification deleted successfully".to_string())),
        Err(e) => Json(ApiResponse::error(e)),
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
                                        if let Ok(count) = state.get_unread_count(uid) {
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
