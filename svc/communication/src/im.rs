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

    // 从 payload 提取 sender/content 并格式化为预览（截断到 200 字符）
    let sender = payload.get("sender").and_then(|v| v.as_str()).unwrap_or("");
    let content = payload
        .get("content")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let preview = format_im_message(sender, content, 200);

    Json(serde_json::json!({
        "success": true,
        "message": "send_message success",
        "data": {
            "room_id": id,
            "preview": preview,
            "truncated": content.chars().count() > 200
        }
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

    // 桩实现：无 DB 状态时默认返回 offline（last_active=0 → classify 返回 offline）
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
    let status = classify_im_status(0, now);

    Json(serde_json::json!({
        "success": true,
        "message": "get_online_status success",
        "data": {
            "user_id": user_id,
            "status": status,
            "online": status == "online"
        }
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

    // ===== axum handler 桩实现测试（用 lazy pool 直接调用） =====

    fn lazy_pool() -> PgPool {
        use sqlx::postgres::PgPoolOptions;
        PgPoolOptions::new()
            .connect_lazy("postgres://nobody:nobody@127.0.0.1:1/none")
            .expect("lazy pool")
    }

    #[tokio::test]
    async fn test_list_rooms_stub() {
        let res = list_rooms(State(lazy_pool())).await;
        assert_eq!(res.0["success"], true);
        assert_eq!(res.0["data"].as_array().unwrap().len(), 0);
    }

    #[tokio::test]
    async fn test_create_room_stub() {
        let res = create_room(State(lazy_pool()), Json(serde_json::json!({"name": "r"}))).await;
        assert_eq!(res.0["success"], true);
        assert_eq!(res.0["message"], "create_room success");
    }

    #[tokio::test]
    async fn test_get_room_stub() {
        let res = get_room(State(lazy_pool()), Path("room-1".to_string())).await;
        assert_eq!(res.0["success"], true);
        assert_eq!(res.0["message"], "get_room success");
    }

    #[tokio::test]
    async fn test_get_messages_stub() {
        let res = get_messages(State(lazy_pool()), Path("room-1".to_string())).await;
        assert_eq!(res.0["success"], true);
        assert!(res.0["data"].is_array());
    }

    #[tokio::test]
    async fn test_send_message_stub() {
        let res = send_message(
            State(lazy_pool()),
            Path("room-1".to_string()),
            Json(serde_json::json!({"content": "hi"})),
        )
        .await;
        assert_eq!(res.0["success"], true);
    }

    #[tokio::test]
    async fn test_list_contacts_stub() {
        let res = list_contacts(State(lazy_pool())).await;
        assert_eq!(res.0["success"], true);
        assert_eq!(res.0["message"], "list_contacts success");
    }

    #[tokio::test]
    async fn test_add_contact_stub() {
        let res = add_contact(
            State(lazy_pool()),
            Json(serde_json::json!({"user_id": "u1"})),
        )
        .await;
        assert_eq!(res.0["success"], true);
    }

    #[tokio::test]
    async fn test_get_online_status_stub() {
        let res = get_online_status(State(lazy_pool()), Path("user-1".to_string())).await;
        assert_eq!(res.0["success"], true);
        assert_eq!(res.0["data"]["online"], false);
    }

    #[tokio::test]
    async fn test_update_room_stub() {
        let res = update_room(
            State(lazy_pool()),
            Path("room-1".to_string()),
            Json(serde_json::json!({"name": "new"})),
        )
        .await;
        assert_eq!(res.0["success"], true);
    }

    #[tokio::test]
    async fn test_delete_room_stub() {
        let res = delete_room(State(lazy_pool()), Path("room-1".to_string())).await;
        assert_eq!(res.0["success"], true);
        assert_eq!(res.0["message"], "delete_room success");
    }

    #[tokio::test]
    async fn test_list_members_stub() {
        let res = list_members(State(lazy_pool()), Path("room-1".to_string())).await;
        assert_eq!(res.0["success"], true);
        assert!(res.0["data"].is_array());
    }

    #[tokio::test]
    async fn test_add_and_remove_member_stub() {
        let pool = lazy_pool();
        let add_res = add_member(
            State(pool.clone()),
            Path("room-1".to_string()),
            Json(serde_json::json!({"user_id": "u1"})),
        )
        .await;
        assert_eq!(add_res.0["success"], true);
        let rm_res = remove_member(
            State(pool),
            Path("room-1".to_string()),
            Json(serde_json::json!({"user_id": "u1"})),
        )
        .await;
        assert_eq!(rm_res.0["success"], true);
    }

    #[tokio::test]
    async fn test_update_and_delete_message_stub() {
        let pool = lazy_pool();
        let upd = update_message(
            State(pool.clone()),
            Path("msg-1".to_string()),
            Json(serde_json::json!({"content": "edited"})),
        )
        .await;
        assert_eq!(upd.0["success"], true);
        let del = delete_message(State(pool), Path("msg-1".to_string())).await;
        assert_eq!(del.0["success"], true);
    }

    #[tokio::test]
    async fn test_mark_messages_read_stub() {
        let res = mark_messages_read(State(lazy_pool()), Path("room-1".to_string())).await;
        assert_eq!(res.0["success"], true);
    }

    #[tokio::test]
    async fn test_list_im_notifications_stub() {
        let res = list_im_notifications(State(lazy_pool()), Path("user-1".to_string())).await;
        assert_eq!(res.0["success"], true);
        assert!(res.0["data"].is_array());
    }

    #[tokio::test]
    async fn test_project_groups_stubs() {
        let pool = lazy_pool();
        let list = list_project_groups(State(pool.clone())).await;
        assert_eq!(list.0["success"], true);
        let create =
            create_project_group(State(pool), Json(serde_json::json!({"name": "g"}))).await;
        assert_eq!(create.0["success"], true);
    }

    #[tokio::test]
    async fn test_contact_groups_crud_stubs() {
        let pool = lazy_pool();
        assert_eq!(
            list_contact_groups(State(pool.clone())).await.0["success"],
            true
        );
        assert_eq!(
            create_contact_group(State(pool.clone()), Json(serde_json::json!({"n": 1})))
                .await
                .0["success"],
            true
        );
        assert_eq!(
            update_contact_group(
                State(pool.clone()),
                Path("g1".to_string()),
                Json(serde_json::json!({"name": "x"}))
            )
            .await
            .0["success"],
            true
        );
        assert_eq!(
            delete_contact_group(State(pool), Path("g1".to_string()))
                .await
                .0["success"],
            true
        );
    }

    #[tokio::test]
    async fn test_mute_and_pin_room_stubs() {
        let pool = lazy_pool();
        let mute = mute_room(
            State(pool.clone()),
            Path("room-1".to_string()),
            Json(serde_json::json!({"muted": true})),
        )
        .await;
        assert_eq!(mute.0["success"], true);
        let pin = pin_message(
            State(pool),
            Path("room-1".to_string()),
            Json(serde_json::json!({"msg_id": "m1"})),
        )
        .await;
        assert_eq!(pin.0["success"], true);
    }

    #[tokio::test]
    async fn test_search_rooms_and_messages_stubs() {
        let pool = lazy_pool();
        assert_eq!(search_rooms(State(pool.clone())).await.0["success"], true);
        assert_eq!(
            search_messages(State(pool), Path("room-1".to_string()))
                .await
                .0["success"],
            true
        );
    }

    #[tokio::test]
    async fn test_contact_get_remove_update_stubs() {
        let pool = lazy_pool();
        assert_eq!(
            get_contact(State(pool.clone()), Path("c1".to_string()))
                .await
                .0["success"],
            true
        );
        assert_eq!(
            remove_contact(State(pool.clone()), Path("c1".to_string()))
                .await
                .0["success"],
            true
        );
        assert_eq!(
            update_contact(
                State(pool),
                Path("c1".to_string()),
                Json(serde_json::json!({"name": "x"}))
            )
            .await
            .0["success"],
            true
        );
    }
}
