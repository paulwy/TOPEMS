use axum::{
    extract::{Path, State, WebSocketUpgrade},
    Json, Router,
    extract::ws::{Message, WebSocket, Utf8Bytes},
};
use anyhow::Result;
use axum::extract::FromRef;
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use std::env;
use chrono::{DateTime, Utc};
use uuid::Uuid;
use serde_json::json;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use tokio::sync::broadcast;
use futures_util::{SinkExt, StreamExt};

use topems_shared::{ApiResponse, AuthState, auth_middleware, create_cors_layer};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WsMessage {
    pub msg_type: String,
    pub chat_id: Option<String>,
    pub sender_id: String,
    pub sender_name: String,
    pub content: String,
    pub timestamp: String,
}

#[derive(Clone)]
pub struct ChatState {
    pub rooms: Arc<Mutex<Vec<ChatRoom>>>,
    pub messages: Arc<Mutex<Vec<ChatMessage>>>,
    pub project_groups: Arc<Mutex<Vec<ProjectGroup>>>,
    pub notifications: Arc<Mutex<Vec<Notification>>>,
    pub tx: broadcast::Sender<WsMessage>,
}

impl ChatState {
    fn new() -> Self {
        let (tx, _) = broadcast::channel(1000);
        ChatState {
            rooms: Arc::new(Mutex::new(Vec::new())),
            messages: Arc::new(Mutex::new(Vec::new())),
            project_groups: Arc::new(Mutex::new(Vec::new())),
            notifications: Arc::new(Mutex::new(Vec::new())),
            tx,
        }
    }
}

struct HandlerState {
    chat_state: ChatState,
    auth_state: AuthState,
}

impl FromRef<HandlerState> for AuthState {
    fn from_ref(state: &HandlerState) -> Self {
        state.auth_state.clone()
    }
}

impl FromRef<HandlerState> for ChatState {
    fn from_ref(state: &HandlerState) -> Self {
        state.chat_state.clone()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatRoom {
    pub id: Uuid,
    pub name: Option<String>,
    pub room_type: String,
    pub members: serde_json::Value,
    pub created_by: String,
    pub last_message: Option<String>,
    pub last_message_time: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateChatRoom {
    pub name: Option<String>,
    pub room_type: String,
    pub members: Vec<String>,
    pub created_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub id: Uuid,
    pub chat_id: Uuid,
    pub sender_id: String,
    pub sender_name: String,
    pub message_type: String,
    pub content: String,
    pub file_url: Option<String>,
    pub file_name: Option<String>,
    pub created_at: DateTime<Utc>,
    pub is_read: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateChatMessage {
    pub chat_id: String,
    pub sender_id: String,
    pub sender_name: String,
    pub message_type: String,
    pub content: String,
    pub file_url: Option<String>,
    pub file_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectGroup {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub project_id: Option<Uuid>,
    pub members: serde_json::Value,
    pub created_by: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateProjectGroup {
    pub name: String,
    pub description: Option<String>,
    pub project_id: Option<String>,
    pub members: Vec<String>,
    pub created_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Notification {
    pub id: Uuid,
    pub user_id: String,
    pub title: String,
    pub content: String,
    pub notification_type: String,
    pub related_id: Option<Uuid>,
    pub related_type: Option<String>,
    pub is_read: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateNotification {
    pub user_id: String,
    pub title: String,
    pub content: String,
    pub notification_type: String,
    pub related_id: Option<String>,
    pub related_type: Option<String>,
}

#[derive(Clone)]
struct AppState {
    chat_rooms: Arc<Mutex<Vec<ChatRoom>>>,
    chat_messages: Arc<Mutex<Vec<ChatMessage>>>,
    project_groups: Arc<Mutex<Vec<ProjectGroup>>>,
    notifications: Arc<Mutex<Vec<Notification>>>,
    auth_state: AuthState,
    ws_connections: Arc<Mutex<HashMap<String, broadcast::Sender<WsMessage>>>>,
    tx: broadcast::Sender<WsMessage>,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

impl AppState {
    fn new(auth_state: AuthState) -> Self {
        let (tx, _) = broadcast::channel(1000);
        AppState {
            chat_rooms: Arc::new(Mutex::new(Vec::new())),
            chat_messages: Arc::new(Mutex::new(Vec::new())),
            project_groups: Arc::new(Mutex::new(Vec::new())),
            notifications: Arc::new(Mutex::new(Vec::new())),
            auth_state,
            ws_connections: Arc::new(Mutex::new(HashMap::new())),
            tx,
        }
    }
}

async fn health_check() -> Json<ApiResponse<&'static str>> {
    Json(ApiResponse::success("TOPEMS-IM is running", "健康检查"))
}

async fn list_chat_rooms(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    let rooms = state.chat_rooms.lock().unwrap();
    Json(ApiResponse::success(json!({
        "chat_rooms": rooms.clone(),
        "total": rooms.len()
    }), "获取聊天室列表成功"))
}

async fn create_chat_room(
    State(state): State<AppState>,
    Json(payload): Json<CreateChatRoom>,
) -> Json<ApiResponse<ChatRoom>> {
    let mut rooms = state.chat_rooms.lock().unwrap();
    
    let room = ChatRoom {
        id: Uuid::new_v4(),
        name: payload.name,
        room_type: payload.room_type,
        members: json!(payload.members),
        created_by: payload.created_by,
        last_message: None,
        last_message_time: None,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };
    
    rooms.push(room.clone());
    Json(ApiResponse::success(room, "创建聊天室成功"))
}

async fn get_chat_room(
    State(state): State<AppState>,
    Path(chat_id): Path<Uuid>,
) -> Json<ApiResponse<ChatRoom>> {
    let rooms = state.chat_rooms.lock().unwrap();
    if let Some(room) = rooms.iter().find(|r| r.id == chat_id) {
        Json(ApiResponse::success(room.clone(), "获取聊天室成功"))
    } else {
        Json(ApiResponse::<ChatRoom>::error(404, "Chat room not found"))
    }
}

async fn list_chat_messages(
    State(state): State<AppState>,
    Path(chat_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let messages = state.chat_messages.lock().unwrap();
    let room_messages: Vec<_> = messages.iter().filter(|m| m.chat_id == chat_id).cloned().collect();
    Json(ApiResponse::success(json!({
        "chat_messages": room_messages,
        "total": room_messages.len()
    }), "获取聊天消息成功"))
}

async fn create_chat_message(
    State(state): State<AppState>,
    Json(payload): Json<CreateChatMessage>,
) -> Json<ApiResponse<ChatMessage>> {
    let chat_id = match Uuid::parse_str(&payload.chat_id) {
        Ok(id) => id,
        Err(_) => return Json(ApiResponse::<ChatMessage>::error(400, "Invalid chat_id")),
    };
    
    let mut messages = state.chat_messages.lock().unwrap();
    let mut rooms = state.chat_rooms.lock().unwrap();
    
    let message = ChatMessage {
        id: Uuid::new_v4(),
        chat_id,
        sender_id: payload.sender_id,
        sender_name: payload.sender_name,
        message_type: payload.message_type,
        content: payload.content.clone(),
        file_url: payload.file_url,
        file_name: payload.file_name,
        created_at: Utc::now(),
        is_read: false,
    };
    
    messages.push(message.clone());
    
    if let Some(index) = rooms.iter_mut().position(|r| r.id == chat_id) {
        rooms[index].last_message = Some(payload.content);
        rooms[index].last_message_time = Some(message.created_at);
        rooms[index].updated_at = Utc::now();
    }
    
    Json(ApiResponse::success(message, "发送消息成功"))
}

async fn mark_message_read(
    State(state): State<AppState>,
    Path(message_id): Path<Uuid>,
) -> Json<ApiResponse<ChatMessage>> {
    let mut messages = state.chat_messages.lock().unwrap();
    if let Some(index) = messages.iter_mut().position(|m| m.id == message_id) {
        messages[index].is_read = true;
        return Json(ApiResponse::success(messages[index].clone(), "标记消息已读成功"));
    }
    Json(ApiResponse::<ChatMessage>::error(404, "Message not found"))
}

async fn list_project_groups(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    let groups = state.project_groups.lock().unwrap();
    Json(ApiResponse::success(json!({
        "project_groups": groups.clone(),
        "total": groups.len()
    }), "获取项目群组成功"))
}

async fn create_project_group(
    State(state): State<AppState>,
    Json(payload): Json<CreateProjectGroup>,
) -> Json<ApiResponse<ProjectGroup>> {
    let mut groups = state.project_groups.lock().unwrap();
    
    let group = ProjectGroup {
        id: Uuid::new_v4(),
        name: payload.name,
        description: payload.description,
        project_id: payload.project_id.and_then(|p| Uuid::parse_str(&p).ok()),
        members: json!(payload.members),
        created_by: payload.created_by,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };
    
    groups.push(group.clone());
    Json(ApiResponse::success(group, "创建项目群组成功"))
}

async fn list_notifications(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    let notifications = state.notifications.lock().unwrap();
    let user_notifications: Vec<_> = notifications.iter().filter(|n| n.user_id == user_id).cloned().collect();
    Json(ApiResponse::success(json!({
        "notifications": user_notifications,
        "total": user_notifications.len()
    }), "获取通知列表成功"))
}

async fn create_notification(
    State(state): State<AppState>,
    Json(payload): Json<CreateNotification>,
) -> Json<ApiResponse<Notification>> {
    let mut notifications = state.notifications.lock().unwrap();
    
    let notification = Notification {
        id: Uuid::new_v4(),
        user_id: payload.user_id,
        title: payload.title,
        content: payload.content,
        notification_type: payload.notification_type,
        related_id: payload.related_id.and_then(|r| Uuid::parse_str(&r).ok()),
        related_type: payload.related_type,
        is_read: false,
        created_at: Utc::now(),
    };
    
    notifications.push(notification.clone());
    Json(ApiResponse::success(notification, "创建通知成功"))
}

async fn mark_notification_read(
    State(state): State<AppState>,
    Path(notification_id): Path<Uuid>,
) -> Json<ApiResponse<Notification>> {
    let mut notifications = state.notifications.lock().unwrap();
    if let Some(index) = notifications.iter_mut().position(|n| n.id == notification_id) {
        notifications[index].is_read = true;
        return Json(ApiResponse::success(notifications[index].clone(), "标记通知已读成功"));
    }
    Json(ApiResponse::<Notification>::error(404, "Notification not found"))
}

async fn mark_all_notifications_read(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut notifications = state.notifications.lock().unwrap();
    for notification in notifications.iter_mut().filter(|n| n.user_id == user_id) {
        notification.is_read = true;
    }
    Json(ApiResponse::success(json!({ "marked": true }), "标记所有通知已读成功"))
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> impl axum::response::IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: AppState) {
    let (mut sender, mut receiver) = socket.split();
    
    let tx = state.tx.clone();
    let state_clone = state.clone();
    
    let mut rx = tx.subscribe();
    
    let send_task = tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
            let json_msg = serde_json::to_string(&msg).unwrap_or_default();
            if sender.send(Message::Text(Utf8Bytes::from(json_msg))).await.is_err() {
                break;
            }
        }
    });
    
    let state_for_recv = state.clone();
    
    let recv_task = tokio::spawn(async move {
        while let Some(msg_result) = receiver.next().await {
            match msg_result {
                Ok(Message::Text(text)) => {
                    if let Ok(ws_msg) = serde_json::from_str::<WsMessage>(&text.to_string()) {
                        let mut messages = state_for_recv.chat_messages.lock().unwrap();
                        let mut rooms = state_for_recv.chat_rooms.lock().unwrap();
                        
                        let chat_id = ws_msg.chat_id.as_ref().and_then(|c| Uuid::parse_str(c).ok());
                        
                        if let Some(cid) = chat_id {
                            let message = ChatMessage {
                                id: Uuid::new_v4(),
                                chat_id: cid,
                                sender_id: ws_msg.sender_id.clone(),
                                sender_name: ws_msg.sender_name.clone(),
                                message_type: "text".to_string(),
                                content: ws_msg.content.clone(),
                                file_url: None,
                                file_name: None,
                                created_at: Utc::now(),
                                is_read: false,
                            };
                            
                            messages.push(message.clone());
                            
                            if let Some(index) = rooms.iter_mut().position(|r| r.id == cid) {
                                rooms[index].last_message = Some(ws_msg.content.clone());
                                rooms[index].last_message_time = Some(Utc::now());
                                rooms[index].updated_at = Utc::now();
                            }
                            
                            let _ = state_for_recv.tx.send(ws_msg);
                        }
                    }
                }
                Ok(Message::Close(_)) => {
                    break;
                }
                _ => {}
            }
        }
    });
    
    tokio::spawn(async move {
        tokio::join!(send_task, recv_task);
    });
}

async fn ws_connect(
    Path(user_id): Path<String>,
    State(state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut connections = state.ws_connections.lock().unwrap();
    let (tx, _) = broadcast::channel(100);
    connections.insert(user_id, tx);
    Json(ApiResponse::success(json!({ "connected": true }), "WebSocket连接成功"))
}

async fn ws_disconnect(
    Path(user_id): Path<String>,
    State(state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut connections = state.ws_connections.lock().unwrap();
    connections.remove(&user_id);
    Json(ApiResponse::success(json!({ "disconnected": true }), "WebSocket断开成功"))
}

#[tokio::main]
async fn main() -> Result<()> {
    dotenv::dotenv().ok();

    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let jwt_secret = env::var("JWT_SECRET")
        .unwrap_or_else(|_| {
            tracing::warn!("JWT_SECRET not set, using default (not recommended for production)");
            "topems-default-jwt-secret-change-me-in-production".to_string()
        });

    let app_state = AppState::new(AuthState::from_env());

    let cors = create_cors_layer();

    let public_routes = Router::new()
        .route("/health", axum::routing::get(health_check))
        .route("/ws", axum::routing::get(ws_handler))
        .route("/api/v1/chat-rooms", axum::routing::get(list_chat_rooms))
        .route("/api/v1/chat-rooms/{chat_id}", axum::routing::get(get_chat_room))
        .route("/api/v1/chat-rooms/{chat_id}/messages", axum::routing::get(list_chat_messages))
        .route("/api/v1/project-groups", axum::routing::get(list_project_groups))
        .route("/api/v1/notifications/{user_id}", axum::routing::get(list_notifications));

    let protected_routes = Router::new()
        .route("/api/v1/chat-rooms", axum::routing::post(create_chat_room))
        .route("/api/v1/chat-rooms/{chat_id}/messages", axum::routing::post(create_chat_message))
        .route("/api/v1/chat-messages/{message_id}/read", axum::routing::put(mark_message_read))
        .route("/api/v1/project-groups", axum::routing::post(create_project_group))
        .route("/api/v1/notifications/{user_id}", axum::routing::post(create_notification))
        .route("/api/v1/notifications/{notification_id}/read", axum::routing::put(mark_notification_read))
        .route("/api/v1/notifications/{user_id}/read-all", axum::routing::put(mark_all_notifications_read))
        .route("/api/v1/ws/connect/{user_id}", axum::routing::post(ws_connect))
        .route("/api/v1/ws/disconnect/{user_id}", axum::routing::post(ws_disconnect))
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ));

    let app = public_routes
        .merge(protected_routes)
        .with_state(app_state)
        .layer(cors);

    let port = env::var("SERVER_PORT")
        .unwrap_or_else(|_| env::var("PORT").unwrap_or_else(|_| "8051".to_string()));
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-IM 即时通讯系统启动中...");
    tracing::info!("📦 端口: {}", port);
    tracing::info!("🔒 认证保护已启用");
    tracing::info!("🔗 WebSocket端点: ws://0.0.0.0:{}/ws", port);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
