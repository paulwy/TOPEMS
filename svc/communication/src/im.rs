//! IM 子模块 - 即时消息处理器（桩实现，待实时通信接入后完善）

use axum::{
    extract::{Path, State},
    Json,
};
use sqlx::PgPool;

/// 根据 last_active_secs 与 now 的差值分类 IM 用户状态
/// diff <= 300s → online，<= 1800s → away，否则 offline；时钟倒拨视为 offline
pub fn classify_im_status(last_active_secs: i64, now: i64) -> &'static str {
    if last_active_secs > now {
        return "offline";
    }
    let diff = now - last_active_secs;
    if diff <= 300 {
        "online"
    } else if diff <= 1800 {
        "away"
    } else {
        "offline"
    }
}

/// 按 UTF-8 字符边界截断消息，超出时追加省略号
pub fn truncate_message(msg: &str, max_len: usize) -> String {
    if msg.chars().count() <= max_len {
        return msg.to_string();
    }
    let mut result: String = msg.chars().take(max_len).collect();
    result.push('…');
    result
}

/// 格式化 IM 消息为 "sender: content"，空 sender 用 "匿名" 兜底，并按最大长度截断
pub fn format_im_message(sender: &str, content: &str, max_len: usize) -> String {
    let sender = sender.trim();
    let prefix = if sender.is_empty() { "匿名" } else { sender };
    let full = format!("{}: {}", prefix, content);
    truncate_message(&full, max_len)
}

#[utoipa::path(
    get,
    path = "/im/rooms",
    tag = "notification",
    responses(
        (status = 200, description = "List of chat rooms", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn list_rooms(State(_pool): State<PgPool>) -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "success": true,
        "message": "list_rooms success",
        "data": []
    }))
}

#[utoipa::path(
    post,
    path = "/im/rooms",
    tag = "notification",
    request_body = serde_json::Value,
    responses(
        (status = 200, description = "Chat room created", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn create_room(
    State(_pool): State<PgPool>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!("IM create_room called with: {:?}", payload);
    Json(serde_json::json!({
        "success": true,
        "message": "create_room success",
        "data": null
    }))
}

pub async fn get_room(
    State(_pool): State<PgPool>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("IM get_room called with id: {}", id);
    Json(serde_json::json!({
        "success": true,
        "message": "get_room success",
        "data": null
    }))
}

pub async fn get_messages(
    State(_pool): State<PgPool>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("IM get_messages called with room id: {}", id);
    Json(serde_json::json!({
        "success": true,
        "message": "get_messages success",
        "data": []
    }))
}

pub async fn send_message(
    State(_pool): State<PgPool>,
    Path(id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "IM send_message called with room id: {} and payload: {:?}",
        id,
        payload
    );
    Json(serde_json::json!({
        "success": true,
        "message": "send_message success",
        "data": null
    }))
}

pub async fn list_contacts(State(_pool): State<PgPool>) -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "success": true,
        "message": "list_contacts success",
        "data": []
    }))
}

pub async fn add_contact(
    State(_pool): State<PgPool>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!("IM add_contact called with: {:?}", payload);
    Json(serde_json::json!({
        "success": true,
        "message": "add_contact success",
        "data": null
    }))
}

pub async fn get_online_status(
    State(_pool): State<PgPool>,
    Path(user_id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("IM get_online_status called with user_id: {}", user_id);
    Json(serde_json::json!({
        "success": true,
        "message": "get_online_status success",
        "data": {"online": false}
    }))
}

pub async fn update_room(
    State(_pool): State<PgPool>,
    Path(id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "IM update_room called with id: {} and payload: {:?}",
        id,
        payload
    );
    Json(serde_json::json!({
        "success": true,
        "message": "update_room success",
        "data": null
    }))
}

pub async fn delete_room(
    State(_pool): State<PgPool>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("IM delete_room called with id: {}", id);
    Json(serde_json::json!({
        "success": true,
        "message": "delete_room success",
        "data": null
    }))
}

pub async fn add_member(
    State(_pool): State<PgPool>,
    Path(id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "IM add_member called with room id: {} and payload: {:?}",
        id,
        payload
    );
    Json(serde_json::json!({
        "success": true,
        "message": "add_member success",
        "data": null
    }))
}

pub async fn remove_member(
    State(_pool): State<PgPool>,
    Path(id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "IM remove_member called with room id: {} and payload: {:?}",
        id,
        payload
    );
    Json(serde_json::json!({
        "success": true,
        "message": "remove_member success",
        "data": null
    }))
}

pub async fn list_members(
    State(_pool): State<PgPool>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("IM list_members called with room id: {}", id);
    Json(serde_json::json!({
        "success": true,
        "message": "list_members success",
        "data": []
    }))
}

pub async fn update_message(
    State(_pool): State<PgPool>,
    Path(id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "IM update_message called with message id: {} and payload: {:?}",
        id,
        payload
    );
    Json(serde_json::json!({
        "success": true,
        "message": "update_message success",
        "data": null
    }))
}

pub async fn delete_message(
    State(_pool): State<PgPool>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("IM delete_message called with message id: {}", id);
    Json(serde_json::json!({
        "success": true,
        "message": "delete_message success",
        "data": null
    }))
}

pub async fn mark_messages_read(
    State(_pool): State<PgPool>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("IM mark_messages_read called with room id: {}", id);
    Json(serde_json::json!({
        "success": true,
        "message": "mark_messages_read success",
        "data": null
    }))
}

pub async fn list_im_notifications(
    State(_pool): State<PgPool>,
    Path(user_id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("IM list_im_notifications called with user_id: {}", user_id);
    Json(serde_json::json!({
        "success": true,
        "message": "list_im_notifications success",
        "data": []
    }))
}

pub async fn list_project_groups(State(_pool): State<PgPool>) -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "success": true,
        "message": "list_project_groups success",
        "data": []
    }))
}

pub async fn create_project_group(
    State(_pool): State<PgPool>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!("IM create_project_group called with: {:?}", payload);
    Json(serde_json::json!({
        "success": true,
        "message": "create_project_group success",
        "data": null
    }))
}

pub async fn list_contact_groups(State(_pool): State<PgPool>) -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "success": true,
        "message": "list_contact_groups success",
        "data": []
    }))
}

pub async fn create_contact_group(
    State(_pool): State<PgPool>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!("IM create_contact_group called with: {:?}", payload);
    Json(serde_json::json!({
        "success": true,
        "message": "create_contact_group success",
        "data": null
    }))
}

pub async fn update_contact_group(
    State(_pool): State<PgPool>,
    Path(id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "IM update_contact_group called with id: {} and payload: {:?}",
        id,
        payload
    );
    Json(serde_json::json!({
        "success": true,
        "message": "update_contact_group success",
        "data": null
    }))
}

pub async fn delete_contact_group(
    State(_pool): State<PgPool>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("IM delete_contact_group called with id: {}", id);
    Json(serde_json::json!({
        "success": true,
        "message": "delete_contact_group success",
        "data": null
    }))
}

pub async fn mute_room(
    State(_pool): State<PgPool>,
    Path(id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "IM mute_room called with room id: {} and payload: {:?}",
        id,
        payload
    );
    Json(serde_json::json!({
        "success": true,
        "message": "mute_room success",
        "data": null
    }))
}

pub async fn pin_message(
    State(_pool): State<PgPool>,
    Path(id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "IM pin_message called with room id: {} and payload: {:?}",
        id,
        payload
    );
    Json(serde_json::json!({
        "success": true,
        "message": "pin_message success",
        "data": null
    }))
}

pub async fn search_rooms(State(_pool): State<PgPool>) -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "success": true,
        "message": "search_rooms success",
        "data": []
    }))
}

pub async fn search_messages(
    State(_pool): State<PgPool>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("IM search_messages called with room id: {}", id);
    Json(serde_json::json!({
        "success": true,
        "message": "search_messages success",
        "data": []
    }))
}

pub async fn get_contact(
    State(_pool): State<PgPool>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("IM get_contact called with id: {}", id);
    Json(serde_json::json!({
        "success": true,
        "message": "get_contact success",
        "data": null
    }))
}

pub async fn remove_contact(
    State(_pool): State<PgPool>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("IM remove_contact called with id: {}", id);
    Json(serde_json::json!({
        "success": true,
        "message": "remove_contact success",
        "data": null
    }))
}

pub async fn update_contact(
    State(_pool): State<PgPool>,
    Path(id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "IM update_contact called with id: {} and payload: {:?}",
        id,
        payload
    );
    Json(serde_json::json!({
        "success": true,
        "message": "update_contact success",
        "data": null
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_classify_im_status_online() {
        assert_eq!(classify_im_status(1000, 1000), "online");
        assert_eq!(classify_im_status(700, 1000), "online");
    }

    #[test]
    fn test_classify_im_status_away() {
        assert_eq!(classify_im_status(699, 1000), "away");
        assert_eq!(classify_im_status(-800, 1000), "away");
    }

    #[test]
    fn test_classify_im_status_offline() {
        assert_eq!(classify_im_status(0, 10000), "offline");
    }

    #[test]
    fn test_classify_im_status_future_time() {
        assert_eq!(classify_im_status(2000, 1000), "offline");
    }

    #[test]
    fn test_classify_im_status_boundary_300() {
        assert_eq!(classify_im_status(0, 300), "online");
        assert_eq!(classify_im_status(0, 301), "away");
    }

    #[test]
    fn test_classify_im_status_boundary_1800() {
        assert_eq!(classify_im_status(0, 1800), "away");
        assert_eq!(classify_im_status(0, 1801), "offline");
    }

    #[test]
    fn test_truncate_message_no_truncation() {
        assert_eq!(truncate_message("hi", 10), "hi");
        assert_eq!(truncate_message("hi", 2), "hi");
    }

    #[test]
    fn test_truncate_message_truncates() {
        assert_eq!(truncate_message("hello world", 5), "hello…");
    }

    #[test]
    fn test_truncate_message_utf8() {
        assert_eq!(truncate_message("你好世界朋友", 3), "你好世…");
    }

    #[test]
    fn test_truncate_message_empty() {
        assert_eq!(truncate_message("", 5), "");
    }

    #[test]
    fn test_truncate_message_zero_max() {
        assert_eq!(truncate_message("hello", 0), "…");
    }

    #[test]
    fn test_truncate_message_exact_length() {
        assert_eq!(truncate_message("abcde", 5), "abcde");
    }

    #[test]
    fn test_format_im_message_normal() {
        assert_eq!(format_im_message("Alice", "hello", 100), "Alice: hello");
    }

    #[test]
    fn test_format_im_message_empty_sender() {
        assert_eq!(format_im_message("", "hello", 100), "匿名: hello");
    }

    #[test]
    fn test_format_im_message_truncates() {
        let result = format_im_message("Bob", "abcdefghij", 9);
        assert_eq!(result, "Bob: abcd…");
    }

    #[test]
    fn test_format_im_message_trims_sender() {
        assert_eq!(format_im_message("  Alice  ", "hi", 100), "Alice: hi");
    }

    #[test]
    fn test_format_im_message_empty_content() {
        assert_eq!(format_im_message("Alice", "", 100), "Alice: ");
    }
}
