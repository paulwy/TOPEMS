use chrono::Utc;
use topems_shared::audit::{AuditLog, AuditLogQuery, CreateAuditLogRequest};
use uuid::Uuid;

#[test]
fn test_create_audit_log_request_new() {
    let request = CreateAuditLogRequest::new(
        "create".to_string(),
        "employee".to_string(),
        "success".to_string(),
    );

    assert_eq!(request.action, "create");
    assert_eq!(request.entity_type, "employee");
    assert_eq!(request.status, "success");
    assert!(request.entity_id.is_none());
    assert!(request.user_id.is_none());
}

#[test]
fn test_create_audit_log_request_with_entity_id() {
    let entity_id = Uuid::new_v4();
    let request = CreateAuditLogRequest::new(
        "update".to_string(),
        "employee".to_string(),
        "success".to_string(),
    )
    .with_entity_id(entity_id);

    assert_eq!(request.entity_id, Some(entity_id));
}

#[test]
fn test_create_audit_log_request_with_entity_ids() {
    let entity_ids = serde_json::json!([1, 2, 3]);
    let request = CreateAuditLogRequest::new(
        "delete".to_string(),
        "employee".to_string(),
        "success".to_string(),
    )
    .with_entity_ids(entity_ids.clone());

    assert_eq!(request.entity_ids, Some(entity_ids));
}

#[test]
fn test_create_audit_log_request_with_user() {
    let request = CreateAuditLogRequest::new(
        "create".to_string(),
        "employee".to_string(),
        "success".to_string(),
    )
    .with_user("user-123".to_string(), "John Doe".to_string());

    assert_eq!(request.user_id, Some("user-123".to_string()));
    assert_eq!(request.user_name, Some("John Doe".to_string()));
}

#[test]
fn test_create_audit_log_request_with_request_details() {
    let details = serde_json::json!({ "name": "John", "email": "john@example.com" });
    let request = CreateAuditLogRequest::new(
        "create".to_string(),
        "employee".to_string(),
        "success".to_string(),
    )
    .with_request_details(details.clone());

    assert_eq!(request.request_details, Some(details));
}

#[test]
fn test_create_audit_log_request_with_response_details() {
    let details = serde_json::json!({ "id": "123", "status": "created" });
    let request = CreateAuditLogRequest::new(
        "create".to_string(),
        "employee".to_string(),
        "success".to_string(),
    )
    .with_response_details(details.clone());

    assert_eq!(request.response_details, Some(details));
}

#[test]
fn test_create_audit_log_request_with_error() {
    let request = CreateAuditLogRequest::new(
        "create".to_string(),
        "employee".to_string(),
        "failed".to_string(),
    )
    .with_error("Database connection failed".to_string());

    assert_eq!(
        request.error_message,
        Some("Database connection failed".to_string())
    );
}

#[test]
fn test_create_audit_log_request_with_request_info() {
    let request = CreateAuditLogRequest::new(
        "create".to_string(),
        "employee".to_string(),
        "success".to_string(),
    )
    .with_request_info(
        Some("192.168.1.1".to_string()),
        Some("Mozilla/5.0".to_string()),
    );

    assert_eq!(request.ip_address, Some("192.168.1.1".to_string()));
    assert_eq!(request.user_agent, Some("Mozilla/5.0".to_string()));
}

#[test]
fn test_create_audit_log_request_chain() {
    let entity_id = Uuid::new_v4();
    let request = CreateAuditLogRequest::new(
        "update".to_string(),
        "employee".to_string(),
        "success".to_string(),
    )
    .with_entity_id(entity_id)
    .with_user("user-456".to_string(), "Jane Smith".to_string())
    .with_request_info(None, None);

    assert_eq!(request.action, "update");
    assert_eq!(request.entity_type, "employee");
    assert_eq!(request.entity_id, Some(entity_id));
    assert_eq!(request.user_id, Some("user-456".to_string()));
    assert_eq!(request.user_name, Some("Jane Smith".to_string()));
    assert!(request.ip_address.is_none());
}

#[test]
fn test_audit_log_query_defaults() {
    let query = AuditLogQuery {
        action: None,
        entity_type: None,
        user_id: None,
        status: None,
        start_date: None,
        end_date: None,
        page: None,
        page_size: None,
    };

    assert!(query.action.is_none());
    assert!(query.entity_type.is_none());
    assert!(query.page.is_none());
}

#[test]
fn test_audit_log_query_with_parameters() {
    let start_date = Utc::now();
    let end_date = start_date + chrono::Duration::days(1);

    let query = AuditLogQuery {
        action: Some("create".to_string()),
        entity_type: Some("employee".to_string()),
        user_id: Some("user-123".to_string()),
        status: Some("success".to_string()),
        start_date: Some(start_date),
        end_date: Some(end_date),
        page: Some(1),
        page_size: Some(20),
    };

    assert_eq!(query.action, Some("create".to_string()));
    assert_eq!(query.entity_type, Some("employee".to_string()));
    assert_eq!(query.page, Some(1));
    assert_eq!(query.page_size, Some(20));
}

#[test]
fn test_audit_log_struct() {
    let id = Uuid::new_v4();
    let created_at = Utc::now();

    let audit_log = AuditLog {
        id,
        action: "create".to_string(),
        entity_type: "employee".to_string(),
        entity_id: Some(Uuid::new_v4()),
        entity_ids: None,
        user_id: Some("user-123".to_string()),
        user_name: Some("John Doe".to_string()),
        request_details: None,
        response_details: Some(serde_json::json!({ "id": "123" })),
        status: "success".to_string(),
        error_message: None,
        ip_address: Some("192.168.1.1".to_string()),
        user_agent: Some("Mozilla/5.0".to_string()),
        created_at,
    };

    assert_eq!(audit_log.id, id);
    assert_eq!(audit_log.action, "create");
    assert_eq!(audit_log.status, "success");
    assert!(audit_log.entity_id.is_some());
    assert!(audit_log.error_message.is_none());
}

#[test]
fn test_create_audit_log_request_serialization() {
    let request = CreateAuditLogRequest::new(
        "create".to_string(),
        "employee".to_string(),
        "success".to_string(),
    )
    .with_user("user-123".to_string(), "John Doe".to_string());

    let json_string = serde_json::to_string(&request).unwrap();
    let deserialized: CreateAuditLogRequest = serde_json::from_str(&json_string).unwrap();

    assert_eq!(deserialized.action, request.action);
    assert_eq!(deserialized.entity_type, request.entity_type);
    assert_eq!(deserialized.user_id, request.user_id);
}
