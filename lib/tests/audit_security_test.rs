#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! V27.0: audit_soft_delete 领域模型集成测试（api_security 死面已删 2026-10-25）
//!
//! 独立测试文件，绕过 lib 内部预存在的测试编译问题
//! （database/read_write.rs 缺少字段）。

use chrono::{TimeZone, Utc};
use topems_shared_db::audit_soft_delete::{
    AuditAction, AuditSeverity, DomainEntity, IncrementalSyncQuery, IncrementallySynced,
    SoftDeletable, SoftDeleteFilter, SoftDeleteMerger,
};

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

    let merger = SoftDeleteMerger::new().with_filter(SoftDeleteFilter::only_live());
    assert!(!merger.should_include(&entity));

    let merger = SoftDeleteMerger::new()
        .with_filter(SoftDeleteFilter::only_live())
        .with_filter(SoftDeleteFilter::include_deleted());
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
