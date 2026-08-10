#![allow(dead_code, clippy::empty_loop)]

//! Core / IM / Notification compatibility OpenAPI paths.
//!
//! These functions are OpenAPI-only contract entries for frontend
//! API calls that are not represented by concrete utoipa handlers yet.
//! They do not alter runtime routing behavior.

#[utoipa::path(
    get,
    path = "/api/core/dict/types",
    tag = "Core-Compat",
    responses((status = 200, description = "Core compatibility endpoint"))
)]
pub async fn compat_get_api_core_dict_types() {}

#[utoipa::path(
    get,
    path = "/api/core/dict/types/{code}",
    tag = "Core-Compat",
    params(("code" = String, Path, description = "code")),
    responses((status = 200, description = "Core compatibility endpoint"))
)]
pub async fn compat_get_api_core_dict_types_code() {}

#[utoipa::path(
    post,
    path = "/api/core/dict/types",
    tag = "Core-Compat",
    responses((status = 200, description = "Core compatibility endpoint"))
)]
pub async fn compat_post_api_core_dict_types() {}

#[utoipa::path(
    put,
    path = "/api/core/dict/types/{code}",
    tag = "Core-Compat",
    params(("code" = String, Path, description = "code")),
    responses((status = 200, description = "Core compatibility endpoint"))
)]
pub async fn compat_put_api_core_dict_types_code() {}

#[utoipa::path(
    delete,
    path = "/api/core/dict/types/{code}",
    tag = "Core-Compat",
    params(("code" = String, Path, description = "code")),
    responses((status = 200, description = "Core compatibility endpoint"))
)]
pub async fn compat_delete_api_core_dict_types_code() {}

#[utoipa::path(
    get,
    path = "/api/core/dict/types/{typeCode}/items",
    tag = "Core-Compat",
    params(("typeCode" = String, Path, description = "typeCode")),
    responses((status = 200, description = "Core compatibility endpoint"))
)]
pub async fn compat_get_api_core_dict_types_type_code_items() {}

#[utoipa::path(
    get,
    path = "/api/core/dict/types/{typeCode}/items/{itemCode}",
    tag = "Core-Compat",
    params(("typeCode" = String, Path, description = "typeCode"), ("itemCode" = String, Path, description = "itemCode")),
    responses((status = 200, description = "Core compatibility endpoint"))
)]
pub async fn compat_get_api_core_dict_types_type_code_items_item_code() {}

#[utoipa::path(
    post,
    path = "/api/core/dict/types/{typeCode}/items",
    tag = "Core-Compat",
    params(("typeCode" = String, Path, description = "typeCode")),
    responses((status = 200, description = "Core compatibility endpoint"))
)]
pub async fn compat_post_api_core_dict_types_type_code_items() {}

#[utoipa::path(
    put,
    path = "/api/core/dict/types/{typeCode}/items/{itemCode}",
    tag = "Core-Compat",
    params(("typeCode" = String, Path, description = "typeCode"), ("itemCode" = String, Path, description = "itemCode")),
    responses((status = 200, description = "Core compatibility endpoint"))
)]
pub async fn compat_put_api_core_dict_types_type_code_items_item_code() {}

#[utoipa::path(
    delete,
    path = "/api/core/dict/types/{typeCode}/items/{itemCode}",
    tag = "Core-Compat",
    params(("typeCode" = String, Path, description = "typeCode"), ("itemCode" = String, Path, description = "itemCode")),
    responses((status = 200, description = "Core compatibility endpoint"))
)]
pub async fn compat_delete_api_core_dict_types_type_code_items_item_code() {}

#[utoipa::path(
    get,
    path = "/api/core/feedbacks",
    tag = "Core-Compat",
    responses((status = 200, description = "Core compatibility endpoint"))
)]
pub async fn compat_get_api_core_feedbacks() {}

#[utoipa::path(
    get,
    path = "/api/core/feedbacks/{id}",
    tag = "Core-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Core compatibility endpoint"))
)]
pub async fn compat_get_api_core_feedbacks_id() {}

#[utoipa::path(
    post,
    path = "/api/core/feedbacks",
    tag = "Core-Compat",
    responses((status = 200, description = "Core compatibility endpoint"))
)]
pub async fn compat_post_api_core_feedbacks() {}

#[utoipa::path(
    put,
    path = "/api/core/feedbacks/{id}",
    tag = "Core-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Core compatibility endpoint"))
)]
pub async fn compat_put_api_core_feedbacks_id() {}

#[utoipa::path(
    delete,
    path = "/api/core/feedbacks/{id}",
    tag = "Core-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Core compatibility endpoint"))
)]
pub async fn compat_delete_api_core_feedbacks_id() {}

#[utoipa::path(
    delete,
    path = "/api/core/feedbacks/batch",
    tag = "Core-Compat",
    responses((status = 200, description = "Core compatibility endpoint"))
)]
pub async fn compat_delete_api_core_feedbacks_batch() {}

#[utoipa::path(
    get,
    path = "/api/core/comments",
    tag = "Core-Compat",
    responses((status = 200, description = "Core compatibility endpoint"))
)]
pub async fn compat_get_api_core_comments() {}

#[utoipa::path(
    post,
    path = "/api/core/comments",
    tag = "Core-Compat",
    responses((status = 200, description = "Core compatibility endpoint"))
)]
pub async fn compat_post_api_core_comments() {}

#[utoipa::path(
    put,
    path = "/api/core/comments/{id}",
    tag = "Core-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Core compatibility endpoint"))
)]
pub async fn compat_put_api_core_comments_id() {}

#[utoipa::path(
    delete,
    path = "/api/core/comments/{id}",
    tag = "Core-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Core compatibility endpoint"))
)]
pub async fn compat_delete_api_core_comments_id() {}

#[utoipa::path(
    get,
    path = "/api/core/favorites",
    tag = "Core-Compat",
    responses((status = 200, description = "Core compatibility endpoint"))
)]
pub async fn compat_get_api_core_favorites() {}

#[utoipa::path(
    post,
    path = "/api/core/favorites",
    tag = "Core-Compat",
    responses((status = 200, description = "Core compatibility endpoint"))
)]
pub async fn compat_post_api_core_favorites() {}

#[utoipa::path(
    delete,
    path = "/api/core/favorites/{id}",
    tag = "Core-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Core compatibility endpoint"))
)]
pub async fn compat_delete_api_core_favorites_id() {}

#[utoipa::path(
    get,
    path = "/api/core/favorites/check",
    tag = "Core-Compat",
    responses((status = 200, description = "Core compatibility endpoint"))
)]
pub async fn compat_get_api_core_favorites_check() {}

#[utoipa::path(
    get,
    path = "/api/core/search",
    tag = "Core-Compat",
    responses((status = 200, description = "Core compatibility endpoint"))
)]
pub async fn compat_get_api_core_search() {}

#[utoipa::path(
    get,
    path = "/api/core/search/suggestions",
    tag = "Core-Compat",
    responses((status = 200, description = "Core compatibility endpoint"))
)]
pub async fn compat_get_api_core_search_suggestions() {}

#[utoipa::path(
    get,
    path = "/api/core/search/recent",
    tag = "Core-Compat",
    responses((status = 200, description = "Core compatibility endpoint"))
)]
pub async fn compat_get_api_core_search_recent() {}

#[utoipa::path(
    delete,
    path = "/api/core/search/recent",
    tag = "Core-Compat",
    responses((status = 200, description = "Core compatibility endpoint"))
)]
pub async fn compat_delete_api_core_search_recent() {}

#[utoipa::path(
    get,
    path = "/api/core/dict/dict-types",
    tag = "Core-Compat",
    responses((status = 200, description = "Core compatibility endpoint"))
)]
pub async fn compat_get_api_core_dict_dict_types() {}

#[utoipa::path(
    get,
    path = "/api/core/dict/dict-types/{id}",
    tag = "Core-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Core compatibility endpoint"))
)]
pub async fn compat_get_api_core_dict_dict_types_id() {}

#[utoipa::path(
    post,
    path = "/api/core/dict/dict-types",
    tag = "Core-Compat",
    responses((status = 200, description = "Core compatibility endpoint"))
)]
pub async fn compat_post_api_core_dict_dict_types() {}

#[utoipa::path(
    put,
    path = "/api/core/dict/dict-types/{id}",
    tag = "Core-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Core compatibility endpoint"))
)]
pub async fn compat_put_api_core_dict_dict_types_id() {}

#[utoipa::path(
    delete,
    path = "/api/core/dict/dict-types/{id}",
    tag = "Core-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Core compatibility endpoint"))
)]
pub async fn compat_delete_api_core_dict_dict_types_id() {}

#[utoipa::path(
    get,
    path = "/api/core/dict/dict-types/{dictTypeId}/items",
    tag = "Core-Compat",
    params(("dictTypeId" = String, Path, description = "dictTypeId")),
    responses((status = 200, description = "Core compatibility endpoint"))
)]
pub async fn compat_get_api_core_dict_dict_types_dict_type_id_items() {}

#[utoipa::path(
    get,
    path = "/api/core/dict/dict-items/{id}",
    tag = "Core-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Core compatibility endpoint"))
)]
pub async fn compat_get_api_core_dict_dict_items_id() {}

#[utoipa::path(
    post,
    path = "/api/core/dict/dict-items",
    tag = "Core-Compat",
    responses((status = 200, description = "Core compatibility endpoint"))
)]
pub async fn compat_post_api_core_dict_dict_items() {}

#[utoipa::path(
    put,
    path = "/api/core/dict/dict-items/{id}",
    tag = "Core-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Core compatibility endpoint"))
)]
pub async fn compat_put_api_core_dict_dict_items_id() {}

#[utoipa::path(
    delete,
    path = "/api/core/dict/dict-items/{id}",
    tag = "Core-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Core compatibility endpoint"))
)]
pub async fn compat_delete_api_core_dict_dict_items_id() {}

#[utoipa::path(
    post,
    path = "/api/core/dict/dict-items/batch",
    tag = "Core-Compat",
    responses((status = 200, description = "Core compatibility endpoint"))
)]
pub async fn compat_post_api_core_dict_dict_items_batch() {}

#[utoipa::path(
    get,
    path = "/api/core/dict/dict-types/{dictTypeId}/items/export",
    tag = "Core-Compat",
    params(("dictTypeId" = String, Path, description = "dictTypeId")),
    responses((status = 200, description = "Core compatibility endpoint"))
)]
pub async fn compat_get_api_core_dict_dict_types_dict_type_id_items_export() {}

#[utoipa::path(
    get,
    path = "/api/communication/im/rooms/{id}",
    tag = "IM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "IM compatibility endpoint"))
)]
pub async fn compat_get_api_communication_im_rooms_id() {}

#[utoipa::path(
    delete,
    path = "/api/communication/im/rooms/{id}",
    tag = "IM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "IM compatibility endpoint"))
)]
pub async fn compat_delete_api_communication_im_rooms_id() {}

#[utoipa::path(
    get,
    path = "/api/communication/im/rooms/{chatId}/messages",
    tag = "IM-Compat",
    params(("chatId" = String, Path, description = "chatId")),
    responses((status = 200, description = "IM compatibility endpoint"))
)]
pub async fn compat_get_api_communication_im_rooms_chat_id_messages() {}

#[utoipa::path(
    post,
    path = "/api/communication/im/rooms/{chat_id}/messages",
    tag = "IM-Compat",
    params(("chat_id" = String, Path, description = "chat_id")),
    responses((status = 200, description = "IM compatibility endpoint"))
)]
pub async fn compat_post_api_communication_im_rooms_chat_id_messages() {}

#[utoipa::path(
    put,
    path = "/api/communication/im/messages/{id}/read",
    tag = "IM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "IM compatibility endpoint"))
)]
pub async fn compat_put_api_communication_im_messages_id_read() {}

#[utoipa::path(
    put,
    path = "/api/communication/im/messages/{id}",
    tag = "IM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "IM compatibility endpoint"))
)]
pub async fn compat_put_api_communication_im_messages_id() {}

#[utoipa::path(
    delete,
    path = "/api/communication/im/messages/{id}",
    tag = "IM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "IM compatibility endpoint"))
)]
pub async fn compat_delete_api_communication_im_messages_id() {}

#[utoipa::path(
    get,
    path = "/api/communication/im/rooms/{chatRoomId}/members",
    tag = "IM-Compat",
    params(("chatRoomId" = String, Path, description = "chatRoomId")),
    responses((status = 200, description = "IM compatibility endpoint"))
)]
pub async fn compat_get_api_communication_im_rooms_chat_room_id_members() {}

#[utoipa::path(
    post,
    path = "/api/communication/im/rooms/{chatRoomId}/members",
    tag = "IM-Compat",
    params(("chatRoomId" = String, Path, description = "chatRoomId")),
    responses((status = 200, description = "IM compatibility endpoint"))
)]
pub async fn compat_post_api_communication_im_rooms_chat_room_id_members() {}

#[utoipa::path(
    delete,
    path = "/api/communication/im/rooms/{chatRoomId}/members/{userId}",
    tag = "IM-Compat",
    params(("chatRoomId" = String, Path, description = "chatRoomId"), ("userId" = String, Path, description = "userId")),
    responses((status = 200, description = "IM compatibility endpoint"))
)]
pub async fn compat_delete_api_communication_im_rooms_chat_room_id_members_user_id() {}

#[utoipa::path(
    get,
    path = "/api/communication/im/project-groups",
    tag = "IM-Compat",
    responses((status = 200, description = "IM compatibility endpoint"))
)]
pub async fn compat_get_api_communication_im_project_groups() {}

#[utoipa::path(
    post,
    path = "/api/communication/im/project-groups",
    tag = "IM-Compat",
    responses((status = 200, description = "IM compatibility endpoint"))
)]
pub async fn compat_post_api_communication_im_project_groups() {}

#[utoipa::path(
    get,
    path = "/api/communication/im/notifications/{userId}",
    tag = "IM-Compat",
    params(("userId" = String, Path, description = "userId")),
    responses((status = 200, description = "IM compatibility endpoint"))
)]
pub async fn compat_get_api_communication_im_notifications_user_id() {}

#[utoipa::path(
    post,
    path = "/api/communication/im/notifications",
    tag = "IM-Compat",
    responses((status = 200, description = "IM compatibility endpoint"))
)]
pub async fn compat_post_api_communication_im_notifications() {}

#[utoipa::path(
    put,
    path = "/api/communication/im/notifications/{id}/read",
    tag = "IM-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "IM compatibility endpoint"))
)]
pub async fn compat_put_api_communication_im_notifications_id_read() {}

#[utoipa::path(
    put,
    path = "/api/communication/im/notifications/{userId}/read-all",
    tag = "IM-Compat",
    params(("userId" = String, Path, description = "userId")),
    responses((status = 200, description = "IM compatibility endpoint"))
)]
pub async fn compat_put_api_communication_im_notifications_user_id_read_all() {}

#[utoipa::path(
    get,
    path = "/api/communication/im/health",
    tag = "IM-Compat",
    responses((status = 200, description = "IM compatibility endpoint"))
)]
pub async fn compat_get_api_communication_im_health() {}

#[utoipa::path(
    get,
    path = "/api/communication/im/online-status/{userId}",
    tag = "IM-Compat",
    params(("userId" = String, Path, description = "userId")),
    responses((status = 200, description = "IM compatibility endpoint"))
)]
pub async fn compat_get_api_communication_im_online_status_user_id() {}

#[utoipa::path(
    get,
    path = "/api/communication/im/contacts/{userId}",
    tag = "IM-Compat",
    params(("userId" = String, Path, description = "userId")),
    responses((status = 200, description = "IM compatibility endpoint"))
)]
pub async fn compat_get_api_communication_im_contacts_user_id() {}

#[utoipa::path(
    post,
    path = "/api/communication/im/contacts/{userId}",
    tag = "IM-Compat",
    params(("userId" = String, Path, description = "userId")),
    responses((status = 200, description = "IM compatibility endpoint"))
)]
pub async fn compat_post_api_communication_im_contacts_user_id() {}

#[utoipa::path(
    put,
    path = "/api/communication/im/contacts/{userId}/{friendId}/accept",
    tag = "IM-Compat",
    params(("userId" = String, Path, description = "userId"), ("friendId" = String, Path, description = "friendId")),
    responses((status = 200, description = "IM compatibility endpoint"))
)]
pub async fn compat_put_api_communication_im_contacts_user_id_friend_id_accept() {}

#[utoipa::path(
    put,
    path = "/api/communication/im/contacts/{userId}/{friendId}/reject",
    tag = "IM-Compat",
    params(("userId" = String, Path, description = "userId"), ("friendId" = String, Path, description = "friendId")),
    responses((status = 200, description = "IM compatibility endpoint"))
)]
pub async fn compat_put_api_communication_im_contacts_user_id_friend_id_reject() {}

#[utoipa::path(
    delete,
    path = "/api/communication/im/contacts/{userId}/{friendId}",
    tag = "IM-Compat",
    params(("userId" = String, Path, description = "userId"), ("friendId" = String, Path, description = "friendId")),
    responses((status = 200, description = "IM compatibility endpoint"))
)]
pub async fn compat_delete_api_communication_im_contacts_user_id_friend_id() {}

#[utoipa::path(
    get,
    path = "/api/communication/im/contact-groups/{userId}",
    tag = "IM-Compat",
    params(("userId" = String, Path, description = "userId")),
    responses((status = 200, description = "IM compatibility endpoint"))
)]
pub async fn compat_get_api_communication_im_contact_groups_user_id() {}

#[utoipa::path(
    post,
    path = "/api/communication/im/contact-groups/{userId}",
    tag = "IM-Compat",
    params(("userId" = String, Path, description = "userId")),
    responses((status = 200, description = "IM compatibility endpoint"))
)]
pub async fn compat_post_api_communication_im_contact_groups_user_id() {}

#[utoipa::path(
    put,
    path = "/api/communication/im/contact-groups/{userId}/{groupId}",
    tag = "IM-Compat",
    params(("userId" = String, Path, description = "userId"), ("groupId" = String, Path, description = "groupId")),
    responses((status = 200, description = "IM compatibility endpoint"))
)]
pub async fn compat_put_api_communication_im_contact_groups_user_id_group_id() {}

#[utoipa::path(
    delete,
    path = "/api/communication/im/contact-groups/{userId}/{groupId}",
    tag = "IM-Compat",
    params(("userId" = String, Path, description = "userId"), ("groupId" = String, Path, description = "groupId")),
    responses((status = 200, description = "IM compatibility endpoint"))
)]
pub async fn compat_delete_api_communication_im_contact_groups_user_id_group_id() {}

#[utoipa::path(
    post,
    path = "/api/communication/im/contact-groups/{userId}/{groupId}/members",
    tag = "IM-Compat",
    params(("userId" = String, Path, description = "userId"), ("groupId" = String, Path, description = "groupId")),
    responses((status = 200, description = "IM compatibility endpoint"))
)]
pub async fn compat_post_api_communication_im_contact_groups_user_id_group_id_members() {}

#[utoipa::path(
    delete,
    path = "/api/communication/im/contact-groups/{userId}/{groupId}/members/{memberUserId}",
    tag = "IM-Compat",
    params(("userId" = String, Path, description = "userId"), ("groupId" = String, Path, description = "groupId"), ("memberUserId" = String, Path, description = "memberUserId")),
    responses((status = 200, description = "IM compatibility endpoint"))
)]
pub async fn compat_delete_api_communication_im_contact_groups_user_id_group_id_members_member_user_id(
) {
}

#[utoipa::path(
    put,
    path = "/api/communication/im/rooms/{chatId}/mute",
    tag = "IM-Compat",
    params(("chatId" = String, Path, description = "chatId")),
    responses((status = 200, description = "IM compatibility endpoint"))
)]
pub async fn compat_put_api_communication_im_rooms_chat_id_mute() {}

#[utoipa::path(
    put,
    path = "/api/communication/im/rooms/{chatId}/unmute",
    tag = "IM-Compat",
    params(("chatId" = String, Path, description = "chatId")),
    responses((status = 200, description = "IM compatibility endpoint"))
)]
pub async fn compat_put_api_communication_im_rooms_chat_id_unmute() {}

#[utoipa::path(
    put,
    path = "/api/communication/im/rooms/{chatId}/pin",
    tag = "IM-Compat",
    params(("chatId" = String, Path, description = "chatId")),
    responses((status = 200, description = "IM compatibility endpoint"))
)]
pub async fn compat_put_api_communication_im_rooms_chat_id_pin() {}

#[utoipa::path(
    put,
    path = "/api/communication/im/rooms/{chatId}/unpin",
    tag = "IM-Compat",
    params(("chatId" = String, Path, description = "chatId")),
    responses((status = 200, description = "IM compatibility endpoint"))
)]
pub async fn compat_put_api_communication_im_rooms_chat_id_unpin() {}

#[utoipa::path(
    get,
    path = "/api/communication/notification/email/email-logs",
    tag = "Notification-Compat",
    responses((status = 200, description = "Notification compatibility endpoint"))
)]
pub async fn compat_get_api_communication_notification_email_email_logs() {}

#[utoipa::path(
    post,
    path = "/api/communication/notification/email/email-logs/{id}/resend",
    tag = "Notification-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Notification compatibility endpoint"))
)]
pub async fn compat_post_api_communication_notification_email_email_logs_id_resend() {}

#[utoipa::path(
    post,
    path = "/api/communication/notification/email/batch-send",
    tag = "Notification-Compat",
    responses((status = 200, description = "Notification compatibility endpoint"))
)]
pub async fn compat_post_api_communication_notification_email_batch_send() {}

#[utoipa::path(
    get,
    path = "/api/communication/notification/email/stats",
    tag = "Notification-Compat",
    responses((status = 200, description = "Notification compatibility endpoint"))
)]
pub async fn compat_get_api_communication_notification_email_stats() {}

#[utoipa::path(
    get,
    path = "/api/communication/notification/email/email-logs/{id}",
    tag = "Notification-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Notification compatibility endpoint"))
)]
pub async fn compat_get_api_communication_notification_email_email_logs_id() {}

#[utoipa::path(
    delete,
    path = "/api/communication/notification/email/email-logs/{id}",
    tag = "Notification-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Notification compatibility endpoint"))
)]
pub async fn compat_delete_api_communication_notification_email_email_logs_id() {}

#[utoipa::path(
    post,
    path = "/api/communication/notification/email/send",
    tag = "Notification-Compat",
    responses((status = 200, description = "Notification compatibility endpoint"))
)]
pub async fn compat_post_api_communication_notification_email_send() {}

#[utoipa::path(
    post,
    path = "/api/communication/notification/email/send-with-template",
    tag = "Notification-Compat",
    responses((status = 200, description = "Notification compatibility endpoint"))
)]
pub async fn compat_post_api_communication_notification_email_send_with_template() {}

#[utoipa::path(
    get,
    path = "/api/communication/notification/email/email-templates",
    tag = "Notification-Compat",
    responses((status = 200, description = "Notification compatibility endpoint"))
)]
pub async fn compat_get_api_communication_notification_email_email_templates() {}

#[utoipa::path(
    get,
    path = "/api/communication/notification/email/email-templates/{id}",
    tag = "Notification-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Notification compatibility endpoint"))
)]
pub async fn compat_get_api_communication_notification_email_email_templates_id() {}

#[utoipa::path(
    post,
    path = "/api/communication/notification/email/email-templates",
    tag = "Notification-Compat",
    responses((status = 200, description = "Notification compatibility endpoint"))
)]
pub async fn compat_post_api_communication_notification_email_email_templates() {}

#[utoipa::path(
    put,
    path = "/api/communication/notification/email/email-templates/{id}",
    tag = "Notification-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Notification compatibility endpoint"))
)]
pub async fn compat_put_api_communication_notification_email_email_templates_id() {}

#[utoipa::path(
    delete,
    path = "/api/communication/notification/email/email-templates/{id}",
    tag = "Notification-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Notification compatibility endpoint"))
)]
pub async fn compat_delete_api_communication_notification_email_email_templates_id() {}

#[utoipa::path(
    get,
    path = "/api/communication/notification/notifications/unread",
    tag = "Notification-Compat",
    responses((status = 200, description = "Notification compatibility endpoint"))
)]
pub async fn compat_get_api_communication_notification_notifications_unread() {}

#[utoipa::path(
    get,
    path = "/api/communication/notification/notifications/unread-count",
    tag = "Notification-Compat",
    responses((status = 200, description = "Notification compatibility endpoint"))
)]
pub async fn compat_get_api_communication_notification_notifications_unread_count() {}

#[utoipa::path(
    put,
    path = "/api/communication/notification/notifications/read-all",
    tag = "Notification-Compat",
    responses((status = 200, description = "Notification compatibility endpoint"))
)]
pub async fn compat_put_api_communication_notification_notifications_read_all() {}

#[utoipa::path(
    post,
    path = "/api/communication/notification/notifications/archive/run",
    tag = "Notification-Compat",
    responses((status = 200, description = "Notification compatibility endpoint"))
)]
pub async fn compat_post_api_communication_notification_notifications_archive_run() {}

#[utoipa::path(
    get,
    path = "/api/communication/notification/notifications/stats/me",
    tag = "Notification-Compat",
    responses((status = 200, description = "Notification compatibility endpoint"))
)]
pub async fn compat_get_api_communication_notification_notifications_stats_me() {}

#[utoipa::path(
    get,
    path = "/api/communication/notification/notification-templates",
    tag = "Notification-Compat",
    responses((status = 200, description = "Notification compatibility endpoint"))
)]
pub async fn compat_get_api_communication_notification_notification_templates() {}

#[utoipa::path(
    get,
    path = "/api/communication/notification/notification-templates/{id}",
    tag = "Notification-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Notification compatibility endpoint"))
)]
pub async fn compat_get_api_communication_notification_notification_templates_id() {}

#[utoipa::path(
    post,
    path = "/api/communication/notification/notification-templates",
    tag = "Notification-Compat",
    responses((status = 200, description = "Notification compatibility endpoint"))
)]
pub async fn compat_post_api_communication_notification_notification_templates() {}

#[utoipa::path(
    put,
    path = "/api/communication/notification/notification-templates/{id}",
    tag = "Notification-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Notification compatibility endpoint"))
)]
pub async fn compat_put_api_communication_notification_notification_templates_id() {}

#[utoipa::path(
    delete,
    path = "/api/communication/notification/notification-templates/{id}",
    tag = "Notification-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Notification compatibility endpoint"))
)]
pub async fn compat_delete_api_communication_notification_notification_templates_id() {}

#[utoipa::path(
    post,
    path = "/api/communication/notification/notification-templates/{id}/render",
    tag = "Notification-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Notification compatibility endpoint"))
)]
pub async fn compat_post_api_communication_notification_notification_templates_id_render() {}

#[utoipa::path(
    put,
    path = "/api/communication/notification/notifications/bulk-read",
    tag = "Notification-Compat",
    responses((status = 200, description = "Notification compatibility endpoint"))
)]
pub async fn compat_put_api_communication_notification_notifications_bulk_read() {}

#[utoipa::path(
    delete,
    path = "/api/communication/notification/notifications/bulk",
    tag = "Notification-Compat",
    responses((status = 200, description = "Notification compatibility endpoint"))
)]
pub async fn compat_delete_api_communication_notification_notifications_bulk() {}

#[utoipa::path(
    get,
    path = "/api/communication/notification/notifications/health/detailed",
    tag = "Notification-Compat",
    responses((status = 200, description = "Notification compatibility endpoint"))
)]
pub async fn compat_get_api_communication_notification_notifications_health_detailed() {}

#[utoipa::path(
    put,
    path = "/api/communication/notification/notifications/{id}/unread",
    tag = "Notification-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Notification compatibility endpoint"))
)]
pub async fn compat_put_api_communication_notification_notifications_id_unread() {}
