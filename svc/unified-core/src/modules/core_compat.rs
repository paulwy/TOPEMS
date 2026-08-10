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
#[utoipa::path(
    get,
    path = "/api/core/doc/documents/{fileId}/versions",
    tag = "Doc-Compat",
    params(("fileId" = String, Path, description = "fileId")),
    responses((status = 200, description = "Doc compatibility endpoint"))
)]
pub async fn compat_get_api_core_doc_documents_fileid_versions() {}

#[utoipa::path(
    get,
    path = "/api/core/doc/documents/{fileId}/versions/{version}",
    tag = "Doc-Compat",
    params(
        ("fileId" = String, Path, description = "fileId"),
        ("version" = String, Path, description = "version"),
    ),
    responses((status = 200, description = "Doc compatibility endpoint"))
)]
pub async fn compat_get_api_core_doc_documents_fileid_versions_version() {}

#[utoipa::path(
    post,
    path = "/api/core/doc/documents/{fileId}/versions/{version}/restore",
    tag = "Doc-Compat",
    params(
        ("fileId" = String, Path, description = "fileId"),
        ("version" = String, Path, description = "version"),
    ),
    responses((status = 200, description = "Doc compatibility endpoint"))
)]
pub async fn compat_post_api_core_doc_documents_fileid_versions_version_restore() {}

#[utoipa::path(
    get,
    path = "/api/core/doc/health",
    tag = "Doc-Compat",
    responses((status = 200, description = "Doc compatibility endpoint"))
)]
pub async fn compat_get_api_core_doc_health() {}

#[utoipa::path(
    post,
    path = "/api/core/doc/templates/{id}/render",
    tag = "Doc-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Doc compatibility endpoint"))
)]
pub async fn compat_post_api_core_doc_templates_id_render() {}

#[utoipa::path(
    post,
    path = "/api/core/doc/templates/{id}/duplicate",
    tag = "Doc-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Doc compatibility endpoint"))
)]
pub async fn compat_post_api_core_doc_templates_id_duplicate() {}

#[utoipa::path(
    put,
    path = "/api/core/doc/templates/{id}/toggle-status",
    tag = "Doc-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Doc compatibility endpoint"))
)]
pub async fn compat_put_api_core_doc_templates_id_toggle_status() {}

#[utoipa::path(
    get,
    path = "/api/communication/mail/emails/{id}",
    tag = "Mail-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Mail compatibility endpoint"))
)]
pub async fn compat_get_api_communication_mail_emails_id() {}

#[utoipa::path(
    post,
    path = "/api/communication/mail/emails/send-with-template",
    tag = "Mail-Compat",
    responses((status = 200, description = "Mail compatibility endpoint"))
)]
pub async fn compat_post_api_communication_mail_emails_send_with_template() {}

#[utoipa::path(
    delete,
    path = "/api/communication/mail/emails/{id}",
    tag = "Mail-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Mail compatibility endpoint"))
)]
pub async fn compat_delete_api_communication_mail_emails_id() {}

#[utoipa::path(
    post,
    path = "/api/communication/mail/emails/resend",
    tag = "Mail-Compat",
    responses((status = 200, description = "Mail compatibility endpoint"))
)]
pub async fn compat_post_api_communication_mail_emails_resend() {}

#[utoipa::path(
    get,
    path = "/api/communication/mail/emails/stats",
    tag = "Mail-Compat",
    responses((status = 200, description = "Mail compatibility endpoint"))
)]
pub async fn compat_get_api_communication_mail_emails_stats() {}

#[utoipa::path(
    get,
    path = "/api/communication/mail/templates",
    tag = "Mail-Compat",
    responses((status = 200, description = "Mail compatibility endpoint"))
)]
pub async fn compat_get_api_communication_mail_templates() {}

#[utoipa::path(
    get,
    path = "/api/communication/mail/templates/{id}",
    tag = "Mail-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Mail compatibility endpoint"))
)]
pub async fn compat_get_api_communication_mail_templates_id() {}

#[utoipa::path(
    post,
    path = "/api/communication/mail/templates",
    tag = "Mail-Compat",
    responses((status = 200, description = "Mail compatibility endpoint"))
)]
pub async fn compat_post_api_communication_mail_templates() {}

#[utoipa::path(
    put,
    path = "/api/communication/mail/templates/{id}",
    tag = "Mail-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Mail compatibility endpoint"))
)]
pub async fn compat_put_api_communication_mail_templates_id() {}

#[utoipa::path(
    delete,
    path = "/api/communication/mail/templates/{id}",
    tag = "Mail-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Mail compatibility endpoint"))
)]
pub async fn compat_delete_api_communication_mail_templates_id() {}

#[utoipa::path(
    put,
    path = "/api/communication/mail/templates/{id}/status",
    tag = "Mail-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Mail compatibility endpoint"))
)]
pub async fn compat_put_api_communication_mail_templates_id_status() {}

#[utoipa::path(
    post,
    path = "/api/communication/mail/templates/render",
    tag = "Mail-Compat",
    responses((status = 200, description = "Mail compatibility endpoint"))
)]
pub async fn compat_post_api_communication_mail_templates_render() {}

#[utoipa::path(
    get,
    path = "/api/communication/mail/health",
    tag = "Mail-Compat",
    responses((status = 200, description = "Mail compatibility endpoint"))
)]
pub async fn compat_get_api_communication_mail_health() {}

#[utoipa::path(
    delete,
    path = "/api/core/file/files/{id}/permissions/revoke/{principal_type}/{principal_id}/{permission}",
    tag = "File-Compat",
    params(
        ("id" = String, Path, description = "id"),
        ("principal_type" = String, Path, description = "principal_type"),
        ("principal_id" = String, Path, description = "principal_id"),
        ("permission" = String, Path, description = "permission"),
    ),
    responses((status = 200, description = "File compatibility endpoint"))
)]
pub async fn compat_delete_api_core_file_files_id_permissions_revoke_principal_type_principal_id_permission(
) {
}

#[utoipa::path(
    get,
    path = "/api/core/file/files/stats",
    tag = "File-Compat",
    responses((status = 200, description = "File compatibility endpoint"))
)]
pub async fn compat_get_api_core_file_files_stats() {}

#[utoipa::path(
    get,
    path = "/api/core/file/health",
    tag = "File-Compat",
    responses((status = 200, description = "File compatibility endpoint"))
)]
pub async fn compat_get_api_core_file_health() {}

#[utoipa::path(
    get,
    path = "/api/core/file/attachments",
    tag = "File-Compat",
    responses((status = 200, description = "File compatibility endpoint"))
)]
pub async fn compat_get_api_core_file_attachments() {}

#[utoipa::path(
    get,
    path = "/api/core/file/attachments/{id}",
    tag = "File-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "File compatibility endpoint"))
)]
pub async fn compat_get_api_core_file_attachments_id() {}

#[utoipa::path(
    delete,
    path = "/api/core/file/attachments/{id}",
    tag = "File-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "File compatibility endpoint"))
)]
pub async fn compat_delete_api_core_file_attachments_id() {}

#[utoipa::path(
    get,
    path = "/api/core/file/attachments/{id}/download",
    tag = "File-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "File compatibility endpoint"))
)]
pub async fn compat_get_api_core_file_attachments_id_download() {}

#[utoipa::path(
    get,
    path = "/api/core/monitor/alerts",
    tag = "Monitor-Compat",
    responses((status = 200, description = "Monitor compatibility endpoint"))
)]
pub async fn compat_get_api_core_monitor_alerts() {}

#[utoipa::path(
    get,
    path = "/api/core/monitor/alerts/{id}",
    tag = "Monitor-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Monitor compatibility endpoint"))
)]
pub async fn compat_get_api_core_monitor_alerts_id() {}

#[utoipa::path(
    post,
    path = "/api/core/monitor/alerts/acknowledge",
    tag = "Monitor-Compat",
    responses((status = 200, description = "Monitor compatibility endpoint"))
)]
pub async fn compat_post_api_core_monitor_alerts_acknowledge() {}

#[utoipa::path(
    post,
    path = "/api/core/monitor/alerts/resolve",
    tag = "Monitor-Compat",
    responses((status = 200, description = "Monitor compatibility endpoint"))
)]
pub async fn compat_post_api_core_monitor_alerts_resolve() {}

#[utoipa::path(
    post,
    path = "/api/core/monitor/alerts/{id}/escalate",
    tag = "Monitor-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Monitor compatibility endpoint"))
)]
pub async fn compat_post_api_core_monitor_alerts_id_escalate() {}

#[utoipa::path(
    post,
    path = "/api/core/monitor/alerts/{id}/dismiss",
    tag = "Monitor-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Monitor compatibility endpoint"))
)]
pub async fn compat_post_api_core_monitor_alerts_id_dismiss() {}

#[utoipa::path(
    get,
    path = "/api/core/monitor/alerts/statistics",
    tag = "Monitor-Compat",
    responses((status = 200, description = "Monitor compatibility endpoint"))
)]
pub async fn compat_get_api_core_monitor_alerts_statistics() {}

#[utoipa::path(
    get,
    path = "/api/core/monitor/alerts/export",
    tag = "Monitor-Compat",
    responses((status = 200, description = "Monitor compatibility endpoint"))
)]
pub async fn compat_get_api_core_monitor_alerts_export() {}

#[utoipa::path(
    get,
    path = "/api/core/monitor/rules",
    tag = "Monitor-Compat",
    responses((status = 200, description = "Monitor compatibility endpoint"))
)]
pub async fn compat_get_api_core_monitor_rules() {}

#[utoipa::path(
    get,
    path = "/api/core/monitor/rules/{id}",
    tag = "Monitor-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Monitor compatibility endpoint"))
)]
pub async fn compat_get_api_core_monitor_rules_id() {}

#[utoipa::path(
    post,
    path = "/api/core/monitor/rules",
    tag = "Monitor-Compat",
    responses((status = 200, description = "Monitor compatibility endpoint"))
)]
pub async fn compat_post_api_core_monitor_rules() {}

#[utoipa::path(
    put,
    path = "/api/core/monitor/rules/{id}",
    tag = "Monitor-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Monitor compatibility endpoint"))
)]
pub async fn compat_put_api_core_monitor_rules_id() {}

#[utoipa::path(
    delete,
    path = "/api/core/monitor/rules/{id}",
    tag = "Monitor-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Monitor compatibility endpoint"))
)]
pub async fn compat_delete_api_core_monitor_rules_id() {}

#[utoipa::path(
    post,
    path = "/api/core/monitor/rules/{id}/enable",
    tag = "Monitor-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Monitor compatibility endpoint"))
)]
pub async fn compat_post_api_core_monitor_rules_id_enable() {}

#[utoipa::path(
    post,
    path = "/api/core/monitor/rules/{id}/disable",
    tag = "Monitor-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Monitor compatibility endpoint"))
)]
pub async fn compat_post_api_core_monitor_rules_id_disable() {}

#[utoipa::path(
    get,
    path = "/api/core/monitor/health",
    tag = "Monitor-Compat",
    responses((status = 200, description = "Monitor compatibility endpoint"))
)]
pub async fn compat_get_api_core_monitor_health() {}

#[utoipa::path(
    get,
    path = "/api/core/monitor/metrics",
    tag = "Monitor-Compat",
    responses((status = 200, description = "Monitor compatibility endpoint"))
)]
pub async fn compat_get_api_core_monitor_metrics() {}

#[utoipa::path(
    get,
    path = "/api/core/audit/operations",
    tag = "Audit-Compat",
    responses((status = 200, description = "Audit compatibility endpoint"))
)]
pub async fn compat_get_api_core_audit_operations() {}

#[utoipa::path(
    get,
    path = "/api/core/audit/operations/{id}",
    tag = "Audit-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Audit compatibility endpoint"))
)]
pub async fn compat_get_api_core_audit_operations_id() {}

#[utoipa::path(
    get,
    path = "/api/core/audit/operations/stats",
    tag = "Audit-Compat",
    responses((status = 200, description = "Audit compatibility endpoint"))
)]
pub async fn compat_get_api_core_audit_operations_stats() {}

#[utoipa::path(
    get,
    path = "/api/core/audit/permission-changes",
    tag = "Audit-Compat",
    responses((status = 200, description = "Audit compatibility endpoint"))
)]
pub async fn compat_get_api_core_audit_permission_changes() {}

#[utoipa::path(
    get,
    path = "/api/core/audit/permission-changes/{id}",
    tag = "Audit-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Audit compatibility endpoint"))
)]
pub async fn compat_get_api_core_audit_permission_changes_id() {}

#[utoipa::path(
    get,
    path = "/api/core/audit/permission-changes/stats",
    tag = "Audit-Compat",
    responses((status = 200, description = "Audit compatibility endpoint"))
)]
pub async fn compat_get_api_core_audit_permission_changes_stats() {}

#[utoipa::path(
    get,
    path = "/api/core/audit/permission-changes/export",
    tag = "Audit-Compat",
    responses((status = 200, description = "Audit compatibility endpoint"))
)]
pub async fn compat_get_api_core_audit_permission_changes_export() {}

#[utoipa::path(
    get,
    path = "/api/core/audit/access-logs",
    tag = "Audit-Compat",
    responses((status = 200, description = "Audit compatibility endpoint"))
)]
pub async fn compat_get_api_core_audit_access_logs() {}

#[utoipa::path(
    get,
    path = "/api/core/audit/access-logs/{id}",
    tag = "Audit-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Audit compatibility endpoint"))
)]
pub async fn compat_get_api_core_audit_access_logs_id() {}

#[utoipa::path(
    get,
    path = "/api/core/audit/access-logs/stats",
    tag = "Audit-Compat",
    responses((status = 200, description = "Audit compatibility endpoint"))
)]
pub async fn compat_get_api_core_audit_access_logs_stats() {}

#[utoipa::path(
    get,
    path = "/api/core/audit/access-logs/export",
    tag = "Audit-Compat",
    responses((status = 200, description = "Audit compatibility endpoint"))
)]
pub async fn compat_get_api_core_audit_access_logs_export() {}

#[utoipa::path(
    get,
    path = "/api/core/tenant/list",
    tag = "Tenant-Compat",
    responses((status = 200, description = "Tenant compatibility endpoint"))
)]
pub async fn compat_get_api_core_tenant_list() {}

#[utoipa::path(
    get,
    path = "/api/core/tenant/{tenantId}",
    tag = "Tenant-Compat",
    params(("tenantId" = String, Path, description = "tenantId")),
    responses((status = 200, description = "Tenant compatibility endpoint"))
)]
pub async fn compat_get_api_core_tenant_tenantid() {}

#[utoipa::path(
    get,
    path = "/api/core/tenant/slug/{slug}",
    tag = "Tenant-Compat",
    params(("slug" = String, Path, description = "slug")),
    responses((status = 200, description = "Tenant compatibility endpoint"))
)]
pub async fn compat_get_api_core_tenant_slug_slug() {}

#[utoipa::path(
    post,
    path = "/api/core/tenant/create",
    tag = "Tenant-Compat",
    responses((status = 200, description = "Tenant compatibility endpoint"))
)]
pub async fn compat_post_api_core_tenant_create() {}

#[utoipa::path(
    put,
    path = "/api/core/tenant/{tenantId}",
    tag = "Tenant-Compat",
    params(("tenantId" = String, Path, description = "tenantId")),
    responses((status = 200, description = "Tenant compatibility endpoint"))
)]
pub async fn compat_put_api_core_tenant_tenantid() {}

#[utoipa::path(
    delete,
    path = "/api/core/tenant/{tenantId}",
    tag = "Tenant-Compat",
    params(("tenantId" = String, Path, description = "tenantId")),
    responses((status = 200, description = "Tenant compatibility endpoint"))
)]
pub async fn compat_delete_api_core_tenant_tenantid() {}

#[utoipa::path(
    post,
    path = "/api/core/tenant/{tenantId}/activate",
    tag = "Tenant-Compat",
    params(("tenantId" = String, Path, description = "tenantId")),
    responses((status = 200, description = "Tenant compatibility endpoint"))
)]
pub async fn compat_post_api_core_tenant_tenantid_activate() {}

#[utoipa::path(
    post,
    path = "/api/core/tenant/{tenantId}/suspend",
    tag = "Tenant-Compat",
    params(("tenantId" = String, Path, description = "tenantId")),
    responses((status = 200, description = "Tenant compatibility endpoint"))
)]
pub async fn compat_post_api_core_tenant_tenantid_suspend() {}

#[utoipa::path(
    get,
    path = "/api/core/tenant/{tenantId}/users",
    tag = "Tenant-Compat",
    params(("tenantId" = String, Path, description = "tenantId")),
    responses((status = 200, description = "Tenant compatibility endpoint"))
)]
pub async fn compat_get_api_core_tenant_tenantid_users() {}

#[utoipa::path(
    post,
    path = "/api/core/tenant/{tenantId}/users/invite",
    tag = "Tenant-Compat",
    params(("tenantId" = String, Path, description = "tenantId")),
    responses((status = 200, description = "Tenant compatibility endpoint"))
)]
pub async fn compat_post_api_core_tenant_tenantid_users_invite() {}

#[utoipa::path(
    delete,
    path = "/api/core/tenant/{tenantId}/users/{userId}",
    tag = "Tenant-Compat",
    params(
        ("tenantId" = String, Path, description = "tenantId"),
        ("userId" = String, Path, description = "userId"),
    ),
    responses((status = 200, description = "Tenant compatibility endpoint"))
)]
pub async fn compat_delete_api_core_tenant_tenantid_users_userid() {}

#[utoipa::path(
    put,
    path = "/api/core/tenant/{tenantId}/users/{userId}/role",
    tag = "Tenant-Compat",
    params(
        ("tenantId" = String, Path, description = "tenantId"),
        ("userId" = String, Path, description = "userId"),
    ),
    responses((status = 200, description = "Tenant compatibility endpoint"))
)]
pub async fn compat_put_api_core_tenant_tenantid_users_userid_role() {}

#[utoipa::path(
    get,
    path = "/api/core/tenant/{tenantId}/stats",
    tag = "Tenant-Compat",
    params(("tenantId" = String, Path, description = "tenantId")),
    responses((status = 200, description = "Tenant compatibility endpoint"))
)]
pub async fn compat_get_api_core_tenant_tenantid_stats() {}

#[utoipa::path(
    get,
    path = "/api/core/tenant/{tenantId}/usage",
    tag = "Tenant-Compat",
    params(("tenantId" = String, Path, description = "tenantId")),
    responses((status = 200, description = "Tenant compatibility endpoint"))
)]
pub async fn compat_get_api_core_tenant_tenantid_usage() {}

#[utoipa::path(
    get,
    path = "/api/core/tenant/{tenantId}/billing",
    tag = "Tenant-Compat",
    params(("tenantId" = String, Path, description = "tenantId")),
    responses((status = 200, description = "Tenant compatibility endpoint"))
)]
pub async fn compat_get_api_core_tenant_tenantid_billing() {}

#[utoipa::path(
    get,
    path = "/api/core/tenant/{tenantId}/invoices",
    tag = "Tenant-Compat",
    params(("tenantId" = String, Path, description = "tenantId")),
    responses((status = 200, description = "Tenant compatibility endpoint"))
)]
pub async fn compat_get_api_core_tenant_tenantid_invoices() {}

#[utoipa::path(
    get,
    path = "/api/core/tenant/context",
    tag = "Tenant-Compat",
    responses((status = 200, description = "Tenant compatibility endpoint"))
)]
pub async fn compat_get_api_core_tenant_context() {}

#[utoipa::path(
    get,
    path = "/api/core/tenant/my",
    tag = "Tenant-Compat",
    responses((status = 200, description = "Tenant compatibility endpoint"))
)]
pub async fn compat_get_api_core_tenant_my() {}

#[utoipa::path(
    post,
    path = "/api/core/tenant/switch",
    tag = "Tenant-Compat",
    responses((status = 200, description = "Tenant compatibility endpoint"))
)]
pub async fn compat_post_api_core_tenant_switch() {}

// ===== Doc-Compat: parameter name mismatch ({id} vs {document_id}/{folder_id}/{template_id}) =====

// ===== Notification-Compat: missing notification endpoints =====

#[utoipa::path(
    get,
    path = "/api/communication/notification/notifications",
    tag = "Notification-Compat",
    responses((status = 200, description = "Notification compatibility endpoint"))
)]
pub async fn compat_get_api_communication_notification_notifications() {}

#[utoipa::path(
    post,
    path = "/api/communication/notification/notifications",
    tag = "Notification-Compat",
    responses((status = 200, description = "Notification compatibility endpoint"))
)]
pub async fn compat_post_api_communication_notification_notifications() {}

#[utoipa::path(
    put,
    path = "/api/communication/notification/notifications/{id}",
    tag = "Notification-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Notification compatibility endpoint"))
)]
pub async fn compat_put_api_communication_notification_notifications_id() {}

#[utoipa::path(
    delete,
    path = "/api/communication/notification/notifications/{id}",
    tag = "Notification-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Notification compatibility endpoint"))
)]
pub async fn compat_delete_api_communication_notification_notifications_id() {}

#[utoipa::path(
    get,
    path = "/api/communication/notification/notifications/archive/config",
    tag = "Notification-Compat",
    responses((status = 200, description = "Notification compatibility endpoint"))
)]
pub async fn compat_get_api_communication_notification_notifications_archive_config() {}

#[utoipa::path(
    put,
    path = "/api/communication/notification/notifications/archive/config",
    tag = "Notification-Compat",
    responses((status = 200, description = "Notification compatibility endpoint"))
)]
pub async fn compat_put_api_communication_notification_notifications_archive_config() {}

// ===== IM-Compat: missing IM list/create room endpoints =====

#[utoipa::path(
    get,
    path = "/api/communication/im/rooms",
    tag = "IM-Compat",
    responses((status = 200, description = "IM compatibility endpoint"))
)]
pub async fn compat_get_api_communication_im_rooms() {}

#[utoipa::path(
    post,
    path = "/api/communication/im/rooms",
    tag = "IM-Compat",
    responses((status = 200, description = "IM compatibility endpoint"))
)]
pub async fn compat_post_api_communication_im_rooms() {}

// ===== Mail-Compat: missing mail send endpoint =====

#[utoipa::path(
    post,
    path = "/api/communication/mail/emails",
    tag = "Mail-Compat",
    responses((status = 200, description = "Mail compatibility endpoint"))
)]
pub async fn compat_post_api_communication_mail_emails() {}

#[utoipa::path(
    get,
    path = "/api/communication/notification/notifications/{id}",
    tag = "Notification-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Notification compatibility endpoint"))
)]
pub async fn compat_get_api_communication_notification_notifications_id() {}

#[utoipa::path(
    post,
    path = "/api/communication/im/rooms/{data.chat_id}/messages",
    tag = "IM-Compat",
    params(("data.chat_id" = String, Path, description = "data.chat_id")),
    responses((status = 200, description = "IM compatibility endpoint"))
)]
pub async fn compat_post_api_communication_im_rooms_data_chat_id_messages() {}

// ========== RC4b · Core system/admin compatibility ==========

#[utoipa::path(
    get,
    path = "/api/core/system/api-keys",
    tag = "Core-System-Compat",
    responses((status = 200, description = "Core system compatibility endpoint"))
)]
pub async fn compat_get_api_core_system_api_keys() {}

#[utoipa::path(
    post,
    path = "/api/core/system/api-keys",
    tag = "Core-System-Compat",
    responses((status = 200, description = "Core system compatibility endpoint"))
)]
pub async fn compat_post_api_core_system_api_keys() {}

#[utoipa::path(
    delete,
    path = "/api/core/system/api-keys/{id}",
    tag = "Core-System-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Core system compatibility endpoint"))
)]
pub async fn compat_delete_api_core_system_api_keys_id() {}

#[utoipa::path(
    get,
    path = "/api/core/system/settings/smtp",
    tag = "Core-System-Compat",
    responses((status = 200, description = "Core system compatibility endpoint"))
)]
pub async fn compat_get_api_core_system_settings_smtp() {}

#[utoipa::path(
    put,
    path = "/api/core/system/settings/smtp",
    tag = "Core-System-Compat",
    responses((status = 200, description = "Core system compatibility endpoint"))
)]
pub async fn compat_put_api_core_system_settings_smtp() {}

#[utoipa::path(
    get,
    path = "/api/core/system/audit-logs",
    tag = "Core-System-Compat",
    responses((status = 200, description = "Core system compatibility endpoint"))
)]
pub async fn compat_get_api_core_system_audit_logs() {}

#[utoipa::path(
    get,
    path = "/api/core/system/audit-logs/{id}",
    tag = "Core-System-Compat",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "Core system compatibility endpoint"))
)]
pub async fn compat_get_api_core_system_audit_logs_id() {}

#[utoipa::path(
    get,
    path = "/api/core/system/audit-logs/export",
    tag = "Core-System-Compat",
    responses((status = 200, description = "Core system compatibility endpoint"))
)]
pub async fn compat_get_api_core_system_audit_logs_export() {}

#[utoipa::path(
    get,
    path = "/api/core/system/config",
    tag = "Core-System-Compat",
    responses((status = 200, description = "Core system compatibility endpoint"))
)]
pub async fn compat_get_api_core_system_config() {}

#[utoipa::path(
    put,
    path = "/api/core/system/config",
    tag = "Core-System-Compat",
    responses((status = 200, description = "Core system compatibility endpoint"))
)]
pub async fn compat_put_api_core_system_config() {}

#[utoipa::path(
    get,
    path = "/api/core/system/cache/config",
    tag = "Core-System-Compat",
    responses((status = 200, description = "Core system compatibility endpoint"))
)]
pub async fn compat_get_api_core_system_cache_config() {}

#[utoipa::path(
    put,
    path = "/api/core/system/cache/config",
    tag = "Core-System-Compat",
    responses((status = 200, description = "Core system compatibility endpoint"))
)]
pub async fn compat_put_api_core_system_cache_config() {}

#[utoipa::path(
    post,
    path = "/api/core/system/cache/clear",
    tag = "Core-System-Compat",
    responses((status = 200, description = "Core system compatibility endpoint"))
)]
pub async fn compat_post_api_core_system_cache_clear() {}

#[utoipa::path(
    get,
    path = "/api/core/system/cache/stats",
    tag = "Core-System-Compat",
    responses((status = 200, description = "Core system compatibility endpoint"))
)]
pub async fn compat_get_api_core_system_cache_stats() {}

#[utoipa::path(
    get,
    path = "/api/core/system/log/config",
    tag = "Core-System-Compat",
    responses((status = 200, description = "Core system compatibility endpoint"))
)]
pub async fn compat_get_api_core_system_log_config() {}

#[utoipa::path(
    put,
    path = "/api/core/system/log/config",
    tag = "Core-System-Compat",
    responses((status = 200, description = "Core system compatibility endpoint"))
)]
pub async fn compat_put_api_core_system_log_config() {}

#[utoipa::path(
    get,
    path = "/api/core/system/params",
    tag = "Core-System-Compat",
    responses((status = 200, description = "Core system compatibility endpoint"))
)]
pub async fn compat_get_api_core_system_params() {}

#[utoipa::path(
    put,
    path = "/api/core/system/params",
    tag = "Core-System-Compat",
    responses((status = 200, description = "Core system compatibility endpoint"))
)]
pub async fn compat_put_api_core_system_params() {}

// ========== RC4b · Migration compatibility ==========

#[utoipa::path(
    get,
    path = "/api/core/migration/migrations/services",
    tag = "Migration-Compat",
    responses((status = 200, description = "Migration compatibility endpoint"))
)]
pub async fn compat_get_api_core_migration_migrations_services() {}

#[utoipa::path(
    post,
    path = "/api/core/migration/migrations/services/{serviceName}/apply",
    tag = "Migration-Compat",
    params(("serviceName" = String, Path, description = "serviceName")),
    responses((status = 200, description = "Migration compatibility endpoint"))
)]
pub async fn compat_post_api_core_migration_migrations_services_servicename_apply() {}

#[utoipa::path(
    post,
    path = "/api/core/migration/migrations/services/{serviceName}/rollback",
    tag = "Migration-Compat",
    params(("serviceName" = String, Path, description = "serviceName")),
    responses((status = 200, description = "Migration compatibility endpoint"))
)]
pub async fn compat_post_api_core_migration_migrations_services_servicename_rollback() {}

// ========== RC4b · Automation compatibility ==========

#[utoipa::path(get, path = "/api/core/automation/dashboard/stats", tag = "Automation-Compat", responses((status = 200, description = "Automation compatibility endpoint")))]
pub async fn compat_get_api_core_automation_dashboard_stats() {}

#[utoipa::path(get, path = "/api/core/automation/health", tag = "Automation-Compat", responses((status = 200, description = "Automation compatibility endpoint")))]
pub async fn compat_get_api_core_automation_health() {}

#[utoipa::path(get, path = "/api/core/automation/designer/canvas/{ruleId}", tag = "Automation-Compat", params(("ruleId" = String, Path, description = "ruleId")), responses((status = 200, description = "Automation compatibility endpoint")))]
pub async fn compat_get_api_core_automation_designer_canvas_ruleid() {}

#[utoipa::path(put, path = "/api/core/automation/designer/canvas/{ruleId}", tag = "Automation-Compat", params(("ruleId" = String, Path, description = "ruleId")), responses((status = 200, description = "Automation compatibility endpoint")))]
pub async fn compat_put_api_core_automation_designer_canvas_ruleid() {}

#[utoipa::path(get, path = "/api/core/automation/designer/resources", tag = "Automation-Compat", responses((status = 200, description = "Automation compatibility endpoint")))]
pub async fn compat_get_api_core_automation_designer_resources() {}

#[utoipa::path(post, path = "/api/core/automation/designer/canvas/{ruleId}/sync-to-rule", tag = "Automation-Compat", params(("ruleId" = String, Path, description = "ruleId")), responses((status = 200, description = "Automation compatibility endpoint")))]
pub async fn compat_post_api_core_automation_designer_canvas_ruleid_sync_to_rule() {}

#[utoipa::path(post, path = "/api/core/automation/designer/canvas/{ruleId}/sync-from-rule", tag = "Automation-Compat", params(("ruleId" = String, Path, description = "ruleId")), responses((status = 200, description = "Automation compatibility endpoint")))]
pub async fn compat_post_api_core_automation_designer_canvas_ruleid_sync_from_rule() {}

#[utoipa::path(get, path = "/api/core/automation/rules", tag = "Automation-Compat", responses((status = 200, description = "Automation compatibility endpoint")))]
pub async fn compat_get_api_core_automation_rules() {}

#[utoipa::path(post, path = "/api/core/automation/rules", tag = "Automation-Compat", responses((status = 200, description = "Automation compatibility endpoint")))]
pub async fn compat_post_api_core_automation_rules() {}

#[utoipa::path(get, path = "/api/core/automation/rules/{id}", tag = "Automation-Compat", params(("id" = String, Path, description = "id")), responses((status = 200, description = "Automation compatibility endpoint")))]
pub async fn compat_get_api_core_automation_rules_id() {}

#[utoipa::path(put, path = "/api/core/automation/rules/{id}", tag = "Automation-Compat", params(("id" = String, Path, description = "id")), responses((status = 200, description = "Automation compatibility endpoint")))]
pub async fn compat_put_api_core_automation_rules_id() {}

#[utoipa::path(delete, path = "/api/core/automation/rules/{id}", tag = "Automation-Compat", params(("id" = String, Path, description = "id")), responses((status = 200, description = "Automation compatibility endpoint")))]
pub async fn compat_delete_api_core_automation_rules_id() {}

#[utoipa::path(get, path = "/api/core/automation/rules/by-code/{code}", tag = "Automation-Compat", params(("code" = String, Path, description = "code")), responses((status = 200, description = "Automation compatibility endpoint")))]
pub async fn compat_get_api_core_automation_rules_by_code_code() {}

#[utoipa::path(post, path = "/api/core/automation/rules/{id}/enable", tag = "Automation-Compat", params(("id" = String, Path, description = "id")), responses((status = 200, description = "Automation compatibility endpoint")))]
pub async fn compat_post_api_core_automation_rules_id_enable() {}

#[utoipa::path(post, path = "/api/core/automation/rules/{id}/disable", tag = "Automation-Compat", params(("id" = String, Path, description = "id")), responses((status = 200, description = "Automation compatibility endpoint")))]
pub async fn compat_post_api_core_automation_rules_id_disable() {}

#[utoipa::path(post, path = "/api/core/automation/rules/{id}/duplicate", tag = "Automation-Compat", params(("id" = String, Path, description = "id")), responses((status = 200, description = "Automation compatibility endpoint")))]
pub async fn compat_post_api_core_automation_rules_id_duplicate() {}

#[utoipa::path(post, path = "/api/core/automation/rules/{id}/trigger", tag = "Automation-Compat", params(("id" = String, Path, description = "id")), responses((status = 200, description = "Automation compatibility endpoint")))]
pub async fn compat_post_api_core_automation_rules_id_trigger() {}

#[utoipa::path(get, path = "/api/core/automation/runs", tag = "Automation-Compat", responses((status = 200, description = "Automation compatibility endpoint")))]
pub async fn compat_get_api_core_automation_runs() {}

#[utoipa::path(get, path = "/api/core/automation/runs/{id}", tag = "Automation-Compat", params(("id" = String, Path, description = "id")), responses((status = 200, description = "Automation compatibility endpoint")))]
pub async fn compat_get_api_core_automation_runs_id() {}

#[utoipa::path(post, path = "/api/core/automation/runs/{id}/retry", tag = "Automation-Compat", params(("id" = String, Path, description = "id")), responses((status = 200, description = "Automation compatibility endpoint")))]
pub async fn compat_post_api_core_automation_runs_id_retry() {}

#[utoipa::path(post, path = "/api/core/automation/runs/{id}/cancel", tag = "Automation-Compat", params(("id" = String, Path, description = "id")), responses((status = 200, description = "Automation compatibility endpoint")))]
pub async fn compat_post_api_core_automation_runs_id_cancel() {}

#[utoipa::path(get, path = "/api/core/automation/runs/{id}/logs", tag = "Automation-Compat", params(("id" = String, Path, description = "id")), responses((status = 200, description = "Automation compatibility endpoint")))]
pub async fn compat_get_api_core_automation_runs_id_logs() {}

#[utoipa::path(post, path = "/api/core/automation/runs/purge", tag = "Automation-Compat", responses((status = 200, description = "Automation compatibility endpoint")))]
pub async fn compat_post_api_core_automation_runs_purge() {}

#[utoipa::path(get, path = "/api/core/automation/variables", tag = "Automation-Compat", responses((status = 200, description = "Automation compatibility endpoint")))]
pub async fn compat_get_api_core_automation_variables() {}

#[utoipa::path(post, path = "/api/core/automation/variables", tag = "Automation-Compat", responses((status = 200, description = "Automation compatibility endpoint")))]
pub async fn compat_post_api_core_automation_variables() {}

#[utoipa::path(get, path = "/api/core/automation/variables/{key}", tag = "Automation-Compat", params(("key" = String, Path, description = "key")), responses((status = 200, description = "Automation compatibility endpoint")))]
pub async fn compat_get_api_core_automation_variables_key() {}

#[utoipa::path(put, path = "/api/core/automation/variables/{key}", tag = "Automation-Compat", params(("key" = String, Path, description = "key")), responses((status = 200, description = "Automation compatibility endpoint")))]
pub async fn compat_put_api_core_automation_variables_key() {}

#[utoipa::path(delete, path = "/api/core/automation/variables/{key}", tag = "Automation-Compat", params(("key" = String, Path, description = "key")), responses((status = 200, description = "Automation compatibility endpoint")))]
pub async fn compat_delete_api_core_automation_variables_key() {}

#[utoipa::path(get, path = "/api/core/automation/variables/{key}/reveal", tag = "Automation-Compat", params(("key" = String, Path, description = "key")), responses((status = 200, description = "Automation compatibility endpoint")))]
pub async fn compat_get_api_core_automation_variables_key_reveal() {}

#[utoipa::path(post, path = "/api/core/automation/variables/bulk-import", tag = "Automation-Compat", responses((status = 200, description = "Automation compatibility endpoint")))]
pub async fn compat_post_api_core_automation_variables_bulk_import() {}

// ========== RC4b · Monitor compatibility ==========

#[utoipa::path(put, path = "/api/core/monitor/alerts/{id}/acknowledge", tag = "Monitor-Compat", params(("id" = String, Path, description = "id")), responses((status = 200, description = "Monitor compatibility endpoint")))]
pub async fn compat_put_api_core_monitor_alerts_id_acknowledge() {}

#[utoipa::path(put, path = "/api/core/monitor/alerts/{id}/resolve", tag = "Monitor-Compat", params(("id" = String, Path, description = "id")), responses((status = 200, description = "Monitor compatibility endpoint")))]
pub async fn compat_put_api_core_monitor_alerts_id_resolve() {}

#[utoipa::path(get, path = "/api/core/monitor/metrics/system", tag = "Monitor-Compat", responses((status = 200, description = "Monitor compatibility endpoint")))]
pub async fn compat_get_api_core_monitor_metrics_system() {}

#[utoipa::path(get, path = "/api/core/monitor/performance/api", tag = "Monitor-Compat", responses((status = 200, description = "Monitor compatibility endpoint")))]
pub async fn compat_get_api_core_monitor_performance_api() {}

#[utoipa::path(get, path = "/api/core/monitor/metrics/database", tag = "Monitor-Compat", responses((status = 200, description = "Monitor compatibility endpoint")))]
pub async fn compat_get_api_core_monitor_metrics_database() {}

#[utoipa::path(get, path = "/api/core/monitor/reports/performance", tag = "Monitor-Compat", responses((status = 200, description = "Monitor compatibility endpoint")))]
pub async fn compat_get_api_core_monitor_reports_performance() {}

#[utoipa::path(get, path = "/api/core/monitor/metrics/realtime", tag = "Monitor-Compat", responses((status = 200, description = "Monitor compatibility endpoint")))]
pub async fn compat_get_api_core_monitor_metrics_realtime() {}

#[utoipa::path(get, path = "/api/core/monitor/business-metrics", tag = "Monitor-Compat", responses((status = 200, description = "Monitor compatibility endpoint")))]
pub async fn compat_get_api_core_monitor_business_metrics() {}

#[utoipa::path(post, path = "/api/core/monitor/business-metrics", tag = "Monitor-Compat", responses((status = 200, description = "Monitor compatibility endpoint")))]
pub async fn compat_post_api_core_monitor_business_metrics() {}

#[utoipa::path(get, path = "/api/core/monitor/business-metrics/{id}", tag = "Monitor-Compat", params(("id" = String, Path, description = "id")), responses((status = 200, description = "Monitor compatibility endpoint")))]
pub async fn compat_get_api_core_monitor_business_metrics_id() {}

#[utoipa::path(put, path = "/api/core/monitor/business-metrics/{id}", tag = "Monitor-Compat", params(("id" = String, Path, description = "id")), responses((status = 200, description = "Monitor compatibility endpoint")))]
pub async fn compat_put_api_core_monitor_business_metrics_id() {}

#[utoipa::path(delete, path = "/api/core/monitor/business-metrics/{id}", tag = "Monitor-Compat", params(("id" = String, Path, description = "id")), responses((status = 200, description = "Monitor compatibility endpoint")))]
pub async fn compat_delete_api_core_monitor_business_metrics_id() {}

#[utoipa::path(get, path = "/api/core/monitor/business-metrics/summary", tag = "Monitor-Compat", responses((status = 200, description = "Monitor compatibility endpoint")))]
pub async fn compat_get_api_core_monitor_business_metrics_summary() {}

#[utoipa::path(get, path = "/api/core/monitor/business-metrics/trend", tag = "Monitor-Compat", responses((status = 200, description = "Monitor compatibility endpoint")))]
pub async fn compat_get_api_core_monitor_business_metrics_trend() {}

#[utoipa::path(get, path = "/api/core/monitor/business-metrics/kpi", tag = "Monitor-Compat", responses((status = 200, description = "Monitor compatibility endpoint")))]
pub async fn compat_get_api_core_monitor_business_metrics_kpi() {}

#[utoipa::path(get, path = "/api/core/monitor/slos", tag = "Monitor-Compat", responses((status = 200, description = "Monitor compatibility endpoint")))]
pub async fn compat_get_api_core_monitor_slos() {}

#[utoipa::path(post, path = "/api/core/monitor/slos", tag = "Monitor-Compat", responses((status = 200, description = "Monitor compatibility endpoint")))]
pub async fn compat_post_api_core_monitor_slos() {}

#[utoipa::path(get, path = "/api/core/monitor/slos/{id}", tag = "Monitor-Compat", params(("id" = String, Path, description = "id")), responses((status = 200, description = "Monitor compatibility endpoint")))]
pub async fn compat_get_api_core_monitor_slos_id() {}

#[utoipa::path(put, path = "/api/core/monitor/slos/{id}", tag = "Monitor-Compat", params(("id" = String, Path, description = "id")), responses((status = 200, description = "Monitor compatibility endpoint")))]
pub async fn compat_put_api_core_monitor_slos_id() {}

#[utoipa::path(delete, path = "/api/core/monitor/slos/{id}", tag = "Monitor-Compat", params(("id" = String, Path, description = "id")), responses((status = 200, description = "Monitor compatibility endpoint")))]
pub async fn compat_delete_api_core_monitor_slos_id() {}

#[utoipa::path(get, path = "/api/core/monitor/slos/summary", tag = "Monitor-Compat", responses((status = 200, description = "Monitor compatibility endpoint")))]
pub async fn compat_get_api_core_monitor_slos_summary() {}

#[utoipa::path(get, path = "/api/core/monitor/slos/budget", tag = "Monitor-Compat", responses((status = 200, description = "Monitor compatibility endpoint")))]
pub async fn compat_get_api_core_monitor_slos_budget() {}

#[utoipa::path(get, path = "/api/core/monitor/slos/trend", tag = "Monitor-Compat", responses((status = 200, description = "Monitor compatibility endpoint")))]
pub async fn compat_get_api_core_monitor_slos_trend() {}

#[utoipa::path(post, path = "/api/core/monitor/slos/violations/{id}/resolve", tag = "Monitor-Compat", params(("id" = String, Path, description = "id")), responses((status = 200, description = "Monitor compatibility endpoint")))]
pub async fn compat_post_api_core_monitor_slos_violations_id_resolve() {}

// ========== RC4b · IAM compatibility ==========

#[utoipa::path(post, path = "/api/core/iam/auth/login", tag = "IAM-Compat", responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_post_api_core_iam_auth_login() {}
#[utoipa::path(post, path = "/api/core/iam/auth/register", tag = "IAM-Compat", responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_post_api_core_iam_auth_register() {}
#[utoipa::path(post, path = "/api/core/iam/auth/logout", tag = "IAM-Compat", responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_post_api_core_iam_auth_logout() {}
#[utoipa::path(post, path = "/api/core/iam/auth/refresh", tag = "IAM-Compat", responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_post_api_core_iam_auth_refresh() {}
#[utoipa::path(get, path = "/api/core/iam/health", tag = "IAM-Compat", responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_get_api_core_iam_health() {}
#[utoipa::path(post, path = "/api/core/iam/auth/forgot-password", tag = "IAM-Compat", responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_post_api_core_iam_auth_forgot_password() {}
#[utoipa::path(post, path = "/api/core/iam/auth/reset-password", tag = "IAM-Compat", responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_post_api_core_iam_auth_reset_password() {}
#[utoipa::path(get, path = "/api/core/iam/auth/password-policy", tag = "IAM-Compat", responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_get_api_core_iam_auth_password_policy() {}
#[utoipa::path(put, path = "/api/core/iam/auth/password-policy", tag = "IAM-Compat", responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_put_api_core_iam_auth_password_policy() {}
#[utoipa::path(get, path = "/api/core/iam/auth/sessions", tag = "IAM-Compat", responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_get_api_core_iam_auth_sessions() {}
#[utoipa::path(delete, path = "/api/core/iam/auth/sessions/{sessionId}", tag = "IAM-Compat", params(("sessionId" = String, Path, description = "sessionId")), responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_delete_api_core_iam_auth_sessions_sessionid() {}
#[utoipa::path(post, path = "/api/core/iam/auth/sessions/revoke-all", tag = "IAM-Compat", responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_post_api_core_iam_auth_sessions_revoke_all() {}
#[utoipa::path(get, path = "/api/core/iam/auth/security-settings", tag = "IAM-Compat", responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_get_api_core_iam_auth_security_settings() {}
#[utoipa::path(put, path = "/api/core/iam/auth/security-settings", tag = "IAM-Compat", responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_put_api_core_iam_auth_security_settings() {}
#[utoipa::path(get, path = "/api/core/iam/permissions", tag = "IAM-Compat", responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_get_api_core_iam_permissions() {}
#[utoipa::path(post, path = "/api/core/iam/permissions", tag = "IAM-Compat", responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_post_api_core_iam_permissions() {}
#[utoipa::path(put, path = "/api/core/iam/permissions/{permissionId}", tag = "IAM-Compat", params(("permissionId" = String, Path, description = "permissionId")), responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_put_api_core_iam_permissions_permissionid() {}
#[utoipa::path(delete, path = "/api/core/iam/permissions/{permissionId}", tag = "IAM-Compat", params(("permissionId" = String, Path, description = "permissionId")), responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_delete_api_core_iam_permissions_permissionid() {}
#[utoipa::path(get, path = "/api/core/iam/roles", tag = "IAM-Compat", responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_get_api_core_iam_roles() {}
#[utoipa::path(post, path = "/api/core/iam/roles", tag = "IAM-Compat", responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_post_api_core_iam_roles() {}
#[utoipa::path(get, path = "/api/core/iam/roles/{id}", tag = "IAM-Compat", params(("id" = String, Path, description = "id")), responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_get_api_core_iam_roles_id() {}
#[utoipa::path(put, path = "/api/core/iam/roles/{roleId}", tag = "IAM-Compat", params(("roleId" = String, Path, description = "roleId")), responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_put_api_core_iam_roles_roleid() {}
#[utoipa::path(delete, path = "/api/core/iam/roles/{id}", tag = "IAM-Compat", params(("id" = String, Path, description = "id")), responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_delete_api_core_iam_roles_id() {}
#[utoipa::path(get, path = "/api/core/iam/roles/{roleId}/permissions", tag = "IAM-Compat", params(("roleId" = String, Path, description = "roleId")), responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_get_api_core_iam_roles_roleid_permissions() {}
#[utoipa::path(post, path = "/api/core/iam/roles/{roleId}/permissions", tag = "IAM-Compat", params(("roleId" = String, Path, description = "roleId")), responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_post_api_core_iam_roles_roleid_permissions() {}
#[utoipa::path(delete, path = "/api/core/iam/roles/{roleId}/permissions/{permissionId}", tag = "IAM-Compat", params(("roleId" = String, Path, description = "roleId"), ("permissionId" = String, Path, description = "permissionId")), responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_delete_api_core_iam_roles_roleid_permissions_permissionid() {}
#[utoipa::path(get, path = "/api/core/iam/users/me", tag = "IAM-Compat", responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_get_api_core_iam_users_me() {}
#[utoipa::path(put, path = "/api/core/iam/users/me", tag = "IAM-Compat", responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_put_api_core_iam_users_me() {}
#[utoipa::path(get, path = "/api/core/iam/users/me/permissions", tag = "IAM-Compat", responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_get_api_core_iam_users_me_permissions() {}
#[utoipa::path(post, path = "/api/core/iam/users/me/permissions/check", tag = "IAM-Compat", responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_post_api_core_iam_users_me_permissions_check() {}
#[utoipa::path(post, path = "/api/core/iam/users/me/password", tag = "IAM-Compat", responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_post_api_core_iam_users_me_password() {}
#[utoipa::path(post, path = "/api/core/iam/users/me/avatar", tag = "IAM-Compat", responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_post_api_core_iam_users_me_avatar() {}
#[utoipa::path(get, path = "/api/core/iam/users/me/preferences", tag = "IAM-Compat", responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_get_api_core_iam_users_me_preferences() {}
#[utoipa::path(put, path = "/api/core/iam/users/me/preferences", tag = "IAM-Compat", responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_put_api_core_iam_users_me_preferences() {}
#[utoipa::path(get, path = "/api/core/iam/users", tag = "IAM-Compat", responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_get_api_core_iam_users() {}
#[utoipa::path(post, path = "/api/core/iam/users", tag = "IAM-Compat", responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_post_api_core_iam_users() {}
#[utoipa::path(get, path = "/api/core/iam/users/{userId}", tag = "IAM-Compat", params(("userId" = String, Path, description = "userId")), responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_get_api_core_iam_users_userid() {}
#[utoipa::path(put, path = "/api/core/iam/users/{userId}", tag = "IAM-Compat", params(("userId" = String, Path, description = "userId")), responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_put_api_core_iam_users_userid() {}
#[utoipa::path(delete, path = "/api/core/iam/users/{userId}", tag = "IAM-Compat", params(("userId" = String, Path, description = "userId")), responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_delete_api_core_iam_users_userid() {}
#[utoipa::path(get, path = "/api/core/iam/users/{userId}/permissions", tag = "IAM-Compat", params(("userId" = String, Path, description = "userId")), responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_get_api_core_iam_users_userid_permissions() {}
#[utoipa::path(get, path = "/api/core/iam/users/{userId}/roles", tag = "IAM-Compat", params(("userId" = String, Path, description = "userId")), responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_get_api_core_iam_users_userid_roles() {}
#[utoipa::path(post, path = "/api/core/iam/users/{userId}/roles/{roleId}", tag = "IAM-Compat", params(("userId" = String, Path, description = "userId"), ("roleId" = String, Path, description = "roleId")), responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_post_api_core_iam_users_userid_roles_roleid() {}
#[utoipa::path(delete, path = "/api/core/iam/users/{userId}/roles/{roleId}", tag = "IAM-Compat", params(("userId" = String, Path, description = "userId"), ("roleId" = String, Path, description = "roleId")), responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_delete_api_core_iam_users_userid_roles_roleid() {}
#[utoipa::path(get, path = "/api/core/iam/users/{userId}/effective-permissions", tag = "IAM-Compat", params(("userId" = String, Path, description = "userId")), responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_get_api_core_iam_users_userid_effective_permissions() {}
#[utoipa::path(post, path = "/api/core/iam/users/batch-delete", tag = "IAM-Compat", responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_post_api_core_iam_users_batch_delete() {}
#[utoipa::path(put, path = "/api/core/iam/users/batch-update", tag = "IAM-Compat", responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_put_api_core_iam_users_batch_update() {}
#[utoipa::path(get, path = "/api/core/iam/users/check-email", tag = "IAM-Compat", responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_get_api_core_iam_users_check_email() {}
#[utoipa::path(get, path = "/api/core/iam/users/check-username", tag = "IAM-Compat", responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_get_api_core_iam_users_check_username() {}
#[utoipa::path(get, path = "/api/core/iam/users/{userId}/login-history", tag = "IAM-Compat", params(("userId" = String, Path, description = "userId")), responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_get_api_core_iam_users_userid_login_history() {}
#[utoipa::path(get, path = "/api/core/iam/access-logs", tag = "IAM-Compat", responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_get_api_core_iam_access_logs() {}
#[utoipa::path(post, path = "/api/core/iam/access-logs", tag = "IAM-Compat", responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_post_api_core_iam_access_logs() {}
#[utoipa::path(get, path = "/api/core/iam/access-logs/user/{userId}", tag = "IAM-Compat", params(("userId" = String, Path, description = "userId")), responses((status = 200, description = "IAM compatibility endpoint")))]
pub async fn compat_get_api_core_iam_access_logs_user_userid() {}
