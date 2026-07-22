//! V27.0: 领域模型与 API 安全模块集成测试
//!
//! 独立测试文件，绕过 lib 内部预存在的测试编译问题
//! （database/read_write.rs 缺少字段），聚焦新模块的覆盖。

use chrono::{TimeZone, Utc};
use topems_shared::api_security::{
    constant_time_eq, generate_request_signature, verify_request_signature, RequestSignatureConfig,
    SignatureVerification,
};
use topems_shared::audit_soft_delete::{
    AuditAction, AuditSeverity, DomainEntity, IncrementalSyncQuery, IncrementallySynced,
    SoftDeletable, SoftDeleteFilter, SoftDeleteMerger,
};

use axum::body::Body;
use axum::http::{HeaderMap, HeaderValue, Request};
use std::time::SystemTime;
use topems_shared::api_security::extract_audit_context;

#[derive(Debug, Clone)]
struct TestEntity {
    pub id: String,
    pub deleted_at: Option<chrono::DateTime<chrono::Utc>>,
    pub deleted_by: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

impl SoftDeletable for TestEntity {
    fn deleted_at(&self) -> Option<chrono::DateTime<chrono::Utc>> {
        self.deleted_at
    }
    fn deleted_by(&self) -> Option<&str> {
        self.deleted_by.as_deref()
    }
    fn mark_deleted(&mut self, when: chrono::DateTime<chrono::Utc>, by: Option<String>) {
        self.deleted_at = Some(when);
        self.deleted_by = by;
    }
    fn mark_deleted_with_actor(
        &mut self,
        when: Option<chrono::DateTime<chrono::Utc>>,
        by: Option<String>,
    ) {
        self.deleted_at = when;
        self.deleted_by = by;
    }
}

impl IncrementallySynced for TestEntity {
    fn last_modified(&self) -> chrono::DateTime<chrono::Utc> {
        self.updated_at
    }
    fn created_at(&self) -> chrono::DateTime<chrono::Utc> {
        self.created_at
    }
    fn sync_id(&self) -> String {
        self.id.clone()
    }
}

impl DomainEntity for TestEntity {}

fn make_entity(id: &str, updated_at: chrono::DateTime<chrono::Utc>) -> TestEntity {
    TestEntity {
        id: id.to_string(),
        deleted_at: None,
        deleted_by: None,
        created_at: Utc.with_ymd_and_hms(2026, 1, 1, 0, 0, 0).unwrap(),
        updated_at,
    }
}

#[test]
fn test_audit_soft_delete_filter_live_only() {
    let entity = make_entity("e1", Utc::now());
    let filter = SoftDeleteFilter::only_live();
    assert!(filter.should_include(&entity));
}

#[test]
fn test_audit_soft_delete_filter_excludes_deleted() {
    let mut entity = make_entity("e1", Utc::now());
    entity.mark_deleted(Utc::now(), Some("user-1".to_string()));
    let filter = SoftDeleteFilter::only_live();
    assert!(!filter.should_include(&entity));
}

#[test]
fn test_audit_soft_delete_filter_includes_all() {
    let mut entity = make_entity("e1", Utc::now());
    entity.mark_deleted(Utc::now(), Some("user-1".to_string()));
    let filter = SoftDeleteFilter::include_deleted();
    assert!(filter.should_include(&entity));
}

#[test]
fn test_audit_soft_delete_restore() {
    let mut entity = make_entity("e1", Utc::now());
    entity.mark_deleted(Utc::now(), Some("user-1".to_string()));
    assert!(entity.is_deleted());
    entity.restore();
    assert!(!entity.is_deleted());
}

#[test]
fn test_audit_incremental_sync_window() {
    let t1 = Utc.with_ymd_and_hms(2026, 1, 1, 0, 0, 0).unwrap();
    let t2 = Utc.with_ymd_and_hms(2026, 6, 1, 0, 0, 0).unwrap();
    let t3 = Utc.with_ymd_and_hms(2026, 12, 1, 0, 0, 0).unwrap();

    let entity = make_entity("e1", t2);

    let query = IncrementalSyncQuery::new().since(t1).until(t3);
    assert!(query.matches(&entity));

    let query = IncrementalSyncQuery::new().since(t3);
    assert!(!query.matches(&entity));
}

#[test]
fn test_audit_soft_delete_merger_or_semantics() {
    let mut entity = make_entity("e1", Utc::now());
    entity.mark_deleted(Utc::now(), Some("user-1".to_string()));

    let merger = SoftDeleteMerger::new().add(SoftDeleteFilter::only_live());
    assert!(!merger.should_include(&entity));

    let merger = SoftDeleteMerger::new()
        .add(SoftDeleteFilter::only_live())
        .add(SoftDeleteFilter::include_deleted());
    assert!(merger.should_include(&entity));
}

#[test]
fn test_audit_action_strs() {
    assert_eq!(AuditAction::Create.as_str(), "create");
    assert_eq!(AuditAction::Delete.as_str(), "delete");
    assert_eq!(AuditAction::BulkDelete.as_str(), "bulk_delete");
    assert_eq!(AuditAction::Restore.as_str(), "restore");
    assert_eq!(AuditAction::Export.as_str(), "export");
}

#[test]
fn test_audit_severity_ordering() {
    assert!(AuditSeverity::Critical > AuditSeverity::High);
    assert!(AuditSeverity::High > AuditSeverity::Medium);
    assert!(AuditSeverity::Medium > AuditSeverity::Low);
}

#[test]
fn test_api_security_constant_time_eq() {
    assert!(constant_time_eq(b"abc123", b"abc123"));
    assert!(!constant_time_eq(b"abc123", b"abc124"));
    assert!(!constant_time_eq(b"abc", b"abcd"));
    assert!(!constant_time_eq(b"", b"a"));
}

#[test]
fn test_api_security_generate_signature() {
    let secret = "test-secret";
    let signature = generate_request_signature(
        "POST",
        "/api/v1/orders",
        b"{\"id\":1}",
        1700000000,
        "nonce-1",
        secret,
    );
    assert_eq!(signature.len(), 64); // SHA-256 hex length
}

#[test]
fn test_api_security_verify_valid_signature() {
    let secret = "test-secret";
    let method = "GET";
    let path = "/api/v1/users/1";
    let body = b"";
    let timestamp = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;
    let nonce = "nonce-unique-xyz";

    let signature = generate_request_signature(method, path, body, timestamp, nonce, secret);

    let config = RequestSignatureConfig::new(secret);
    let mut headers = HeaderMap::new();
    headers.insert("x-timestamp", HeaderValue::from(timestamp));
    headers.insert("x-nonce", HeaderValue::from_str(nonce).unwrap());
    headers.insert("x-signature", HeaderValue::from_str(&signature).unwrap());

    let result = verify_request_signature(method, path, body, &headers, &config);
    assert_eq!(result, SignatureVerification::Valid);
}

#[test]
fn test_api_security_verify_expired_timestamp() {
    let secret = "test-secret";
    let method = "POST";
    let path = "/api/v1/orders";
    let body = b"{}";
    let timestamp = 1000000000i64; // 2001 年
    let nonce = "nonce-old";
    let signature = generate_request_signature(method, path, body, timestamp, nonce, secret);

    let config = RequestSignatureConfig::new(secret);
    let mut headers = HeaderMap::new();
    headers.insert("x-timestamp", HeaderValue::from(timestamp));
    headers.insert("x-nonce", HeaderValue::from_str(nonce).unwrap());
    headers.insert("x-signature", HeaderValue::from_str(&signature).unwrap());

    let result = verify_request_signature(method, path, body, &headers, &config);
    assert!(matches!(
        result,
        SignatureVerification::TimestampExpired { .. }
    ));
}

#[test]
fn test_api_security_verify_missing_headers() {
    let config = RequestSignatureConfig::new("secret");
    let headers = HeaderMap::new();

    let result = verify_request_signature("GET", "/x", b"", &headers, &config);
    assert!(matches!(result, SignatureVerification::MissingHeader(_)));
}

#[test]
fn test_api_security_extract_audit_context() {
    let req = Request::builder()
        .method("POST")
        .uri("/api/v1/orders")
        .header("x-user-id", "user-42")
        .header("x-forwarded-for", "192.168.1.100, 10.0.0.1")
        .header("user-agent", "test-agent/1.0")
        .header(
            "traceparent",
            "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01",
        )
        .body(Body::empty())
        .unwrap();

    let ctx = extract_audit_context(&req);
    assert_eq!(ctx.actor, "user-42");
    assert_eq!(ctx.ip_address, "192.168.1.100");
    assert_eq!(ctx.user_agent, "test-agent/1.0");
    assert_eq!(
        ctx.trace_id,
        Some("0af7651916cd43dd8448eb211c80319c".to_string())
    );
    assert_eq!(ctx.method, "POST");
    assert_eq!(ctx.path, "/api/v1/orders");
}
