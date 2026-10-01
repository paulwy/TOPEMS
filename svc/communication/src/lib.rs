pub mod im;
pub mod im_location;
pub mod mail;
pub mod models;
pub mod notification;
pub mod openapi;
pub mod schema_defense;

#[cfg(test)]
mod tests {
    // crate 级别的模块可达性测试

    #[test]
    fn test_crate_openapi_doc_compiles() {
        use utoipa::OpenApi;
        let doc = crate::openapi::CommunicationApiDoc::openapi();
        let json = serde_json::to_value(&doc).expect("openapi must serialize");
        assert_eq!(json["info"]["title"], "TOPEMS Communication API");
    }

    #[test]
    fn test_models_helpers_reachable() {
        assert_eq!(crate::models::normalize_email("  A@B.COM  "), "a@b.com");
        assert!(crate::models::is_valid_notification_type("urgent"));
        assert_eq!(crate::models::clamp_priority(99), 10);
    }

    #[test]
    fn test_notification_helpers_reachable() {
        use crate::notification::{classify_notification_priority, NotificationPriority};
        assert_eq!(
            classify_notification_priority("critical"),
            NotificationPriority::Urgent
        );
    }

    #[test]
    fn test_mail_helpers_reachable() {
        assert!(crate::mail::validate_email("a@b.com"));
        assert_eq!(crate::mail::extract_email_name("a@b.com"), "a");
    }

    #[test]
    fn test_im_location_helpers_reachable() {
        assert!(crate::im_location::is_within_geofence(
            30.0, 120.0, 30.0, 120.0, 1.0
        ));
    }

    #[test]
    fn test_schema_defense_constants_reachable() {
        // 确认 schema_defense 模块在 lib 中可编译可达
        let tables = crate::schema_defense::table_defs_for_test();
        assert!(!tables.is_empty());
    }
}
