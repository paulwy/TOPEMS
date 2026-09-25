//! TOPEMS Communication（通知/即时通讯渠道）最小 OpenAPI 文档骨架
//!
//! V71 A1 仅需提取合法的 openapi 3.x JSON，paths/schemas 后续在 V71.5 补充。
use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::notification::send_notification,
        crate::notification::create_notification,
        crate::notification::list_notifications,
        crate::notification::get_notifications,
        crate::notification::get_notification,
        crate::notification::mark_as_read,
        crate::notification::delete_notification,
        crate::im::list_rooms,
        crate::im::create_room,
        crate::mail::list_emails,
        crate::mail::send_email,
        crate::mail::get_email,
        crate::mail::delete_email,
        crate::mail::mark_as_read,
        crate::notification::get_unread_count,
        crate::im_location::send_location_message,
        crate::im_location::list_location_messages,
        crate::im_location::get_geofence,
        crate::im_location::list_geofences,
        crate::im_location::unified_search_pois,
        crate::im_location::create_geofence,
        crate::im_location::update_geofence,
        crate::im_location::delete_geofence,
        crate::mail::get_stats,
        crate::mail::list_templates,
        crate::mail::get_template,
        crate::mail::create_template,
        crate::mail::update_template,
        crate::mail::send_with_template,
        crate::mail::send_with_template_by_code,
        crate::mail::resend_emails,
        crate::im::get_room,
        crate::im::get_messages,
        crate::im::list_members,
        crate::im::search_rooms,
        crate::im::search_messages,
        crate::im::list_contacts,
        crate::im::get_contact,
        crate::im::list_contact_groups,
        crate::im::get_online_status,
        crate::im::list_im_notifications,
        crate::im::list_project_groups,
        crate::im::update_room,
        crate::im::delete_room,
        crate::im::send_message,
        crate::im::add_member,
        crate::im::remove_member,
        crate::im::update_message,
        crate::im::delete_message,
        crate::im::mark_messages_read,
        crate::im::mute_room,
        crate::im::pin_message,
        crate::im::add_contact,
        crate::im::update_contact,
        crate::im::remove_contact,
        crate::im::create_contact_group,
        crate::im::update_contact_group,
        crate::im::delete_contact_group,
        crate::im::create_project_group,
        crate::notification::get_unread_notifications,
        crate::notification::get_notification_stats,
        crate::notification::list_archived_notifications,
        crate::notification::get_archive_config,
        crate::notification::list_templates,
        crate::notification::get_template,
        crate::notification::list_channels,
        crate::notification::get_channel,
        crate::notification::get_channel_metrics,
        crate::notification::broadcast_notification,
        crate::notification::mark_all_as_read,
        crate::notification::mark_as_unread,
        crate::notification::bulk_mark_read,
        crate::notification::bulk_delete,
        crate::notification::archive_notification,
        crate::notification::unarchive_notification,
        crate::notification::delete_all_notifications,
        crate::notification::update_archive_config,
        crate::notification::run_auto_archive,
        crate::notification::create_template,
        crate::notification::update_template,
        crate::notification::delete_template,
        crate::notification::create_channel,
        crate::notification::update_channel,
        crate::notification::delete_channel,
        crate::notification::test_channel,
    ),
    tags(
        (name = "notification", description = "站内通知消息 API"),
        (name = "location", description = "位置消息与地理围栏 API"),
        (name = "email",        description = "邮件发送渠道 API"),
        (name = "sms",          description = "短信发送渠道 API"),
        (name = "wechat",       description = "企业微信/钉钉 IM 渠道 API")
    ),
    info(
        title       = "TOPEMS Communication API",
        version     = "1.0.0",
        description = "通讯渠道网关服务 API - 包含邮件、短信、IM、站内消息等多渠道发送能力"
    )
)]
pub struct CommunicationApiDoc;

#[cfg(test)]
mod tests {
    use super::*;
    use utoipa::OpenApi;

    #[test]
    fn test_openapi_generates_valid_document() {
        let doc = CommunicationApiDoc::openapi();
        let json = serde_json::to_value(&doc).expect("openapi must serialize");
        assert_eq!(json["openapi"], "3.0.3");
        assert_eq!(json["info"]["title"], "TOPEMS Communication API");
        assert_eq!(json["info"]["version"], "1.0.0");
    }

    #[test]
    fn test_openapi_contains_expected_tags() {
        let doc = CommunicationApiDoc::openapi();
        let json = serde_json::to_value(&doc).unwrap();
        let tags = json["tags"].as_array().expect("tags should be array");
        let names: Vec<&str> = tags
            .iter()
            .map(|t| t["name"].as_str().unwrap_or_default())
            .collect();
        assert!(names.contains(&"notification"));
        assert!(names.contains(&"email"));
        assert!(names.contains(&"sms"));
        assert!(names.contains(&"wechat"));
    }

    #[test]
    fn test_openapi_contains_notification_and_mail_paths() {
        let doc = CommunicationApiDoc::openapi();
        let json = serde_json::to_value(&doc).unwrap();
        let paths = json["paths"].as_object().expect("paths should be object");
        assert!(paths.contains_key("/notify/send"));
        assert!(paths.contains_key("/notification/notifications"));
        assert!(paths.contains_key("/mail/emails"));
        assert!(paths.contains_key("/im/rooms"));
    }

    #[test]
    fn test_openapi_info_description_present() {
        let doc = CommunicationApiDoc::openapi();
        let json = serde_json::to_value(&doc).unwrap();
        let desc = json["info"]["description"].as_str().unwrap_or_default();
        assert!(desc.contains("通讯渠道"));
    }
}
