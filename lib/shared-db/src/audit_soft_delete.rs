//! 软删除与增量同步领域模型（V27.0）
//!
//! 提供：
//! 1. `SoftDeletable` trait：所有领域实体应实现此 trait 以支持软删除
//! 2. `IncrementallySynced` trait：所有领域实体应实现此 trait 以支持增量同步
//! 3. `SoftDeleteQuery`：过滤已删除记录的查询辅助
//! 4. `SyncQuery`：增量同步查询辅助
//! 5. `merge_soft_delete` 工具函数：合并多租户软删除过滤条件
//!
//! 设计原则：
//! - 不强加数据库 schema，仅提供 trait 和 query helper
//! - 各服务在自己的 entity 中实现这两个 trait
//! - trait 默认实现基于 `deleted_at: Option<DateTime<Utc>>` 和
//!   `updated_at: DateTime<Utc>` 这两个约定的字段

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// 软删除实体 trait
///
/// 约定所有领域实体都有一个 `deleted_at: Option<DateTime<Utc>>` 字段。
/// 实现者应使用 `is_deleted()`/`mark_deleted()`/`restore()` 方法。
pub trait SoftDeletable {
    /// 获取删除时间
    fn deleted_at(&self) -> Option<DateTime<Utc>>;

    /// 获取删除者 ID（可选）
    fn deleted_by(&self) -> Option<&str> {
        None
    }

    /// 是否已被软删除
    fn is_deleted(&self) -> bool {
        self.deleted_at().is_some()
    }

    /// 标记为已删除
    fn mark_deleted(&mut self, when: DateTime<Utc>, by: Option<String>);

    /// 恢复（取消软删除）
    fn restore(&mut self) {
        self.mark_deleted_with_actor(None, None);
    }

    /// 同时设置 deleted_at 和 deleted_by
    fn mark_deleted_with_actor(&mut self, when: Option<DateTime<Utc>>, by: Option<String>);
}

/// 增量同步实体 trait
///
/// 约定所有领域实体都有一个 `updated_at: DateTime<Utc>` 字段。
/// 实现者应使用 `last_modified()` 方法返回实体最后修改时间。
pub trait IncrementallySynced {
    /// 实体最后修改时间
    fn last_modified(&self) -> DateTime<Utc>;

    /// 实体创建时间
    fn created_at(&self) -> DateTime<Utc>;

    /// 实体唯一标识（UUID 字符串）
    fn sync_id(&self) -> String;
}

/// 软删除 + 增量同步 综合 trait
///
/// 实际业务中通常需要同时支持两种能力
pub trait DomainEntity: SoftDeletable + IncrementallySynced {}

/// 软删除查询过滤器
#[derive(Debug, Clone, Serialize, Deserialize)]
#[derive(Default)]
pub struct SoftDeleteFilter {
    /// 是否包含已删除记录
    pub include_deleted: bool,
}


impl SoftDeleteFilter {
    pub fn only_live() -> Self {
        Self {
            include_deleted: false,
        }
    }

    pub fn include_deleted() -> Self {
        Self {
            include_deleted: true,
        }
    }

    /// 判断给定实体是否应被过滤
    pub fn should_include<T: SoftDeletable>(&self, entity: &T) -> bool {
        self.include_deleted || !entity.is_deleted()
    }
}

/// 增量同步查询参数
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IncrementalSyncQuery {
    /// 起始时间（包含）
    pub since: Option<DateTime<Utc>>,
    /// 结束时间（包含）
    pub until: Option<DateTime<Utc>>,
    /// 限制返回数量
    pub limit: Option<u32>,
    /// 游标（用于分页）
    pub cursor: Option<String>,
}

impl Default for IncrementalSyncQuery {
    fn default() -> Self {
        Self {
            since: None,
            until: None,
            limit: Some(100),
            cursor: None,
        }
    }
}

impl IncrementalSyncQuery {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn since(mut self, since: DateTime<Utc>) -> Self {
        self.since = Some(since);
        self
    }

    pub fn until(mut self, until: DateTime<Utc>) -> Self {
        self.until = Some(until);
        self
    }

    pub fn with_limit(mut self, limit: u32) -> Self {
        self.limit = Some(limit);
        self
    }

    /// 检查实体是否符合增量同步条件
    pub fn matches<T: IncrementallySynced>(&self, entity: &T) -> bool {
        let last_modified = entity.last_modified();
        if let Some(since) = self.since {
            if last_modified < since {
                return false;
            }
        }
        if let Some(until) = self.until {
            if last_modified > until {
                return false;
            }
        }
        true
    }
}

/// 软删除合并器：用于多租户查询
pub struct SoftDeleteMerger {
    filters: Vec<SoftDeleteFilter>,
}

impl SoftDeleteMerger {
    pub fn new() -> Self {
        Self {
            filters: Vec::new(),
        }
    }

    pub fn with_filter(mut self, filter: SoftDeleteFilter) -> Self {
        self.filters.push(filter);
        self
    }

    /// 合并策略：所有过滤器都应允许通过（即任一 include_deleted=true 则总体通过）
    pub fn should_include<T: SoftDeletable>(&self, entity: &T) -> bool {
        if self.filters.is_empty() {
            return !entity.is_deleted();
        }
        self.filters.iter().any(|f| f.should_include(entity))
    }
}

impl Default for SoftDeleteMerger {
    fn default() -> Self {
        Self::new()
    }
}

/// 审计动作枚举（V27.0 扩展 V20.0 已有审计字段）
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AuditAction {
    Create,
    Read,
    Update,
    Delete,
    Restore,
    BulkDelete,
    BulkUpdate,
    Export,
    Import,
}

impl AuditAction {
    pub fn as_str(&self) -> &'static str {
        match self {
            AuditAction::Create => "create",
            AuditAction::Read => "read",
            AuditAction::Update => "update",
            AuditAction::Delete => "delete",
            AuditAction::Restore => "restore",
            AuditAction::BulkDelete => "bulk_delete",
            AuditAction::BulkUpdate => "bulk_update",
            AuditAction::Export => "export",
            AuditAction::Import => "import",
        }
    }
}

/// 审计严重级别（与 observability::AlertSeverity 对应，便于跨模块传递）
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub enum AuditSeverity {
    Low,
    Medium,
    High,
    Critical,
}

impl AuditSeverity {
    pub fn as_str(&self) -> &'static str {
        match self {
            AuditSeverity::Low => "low",
            AuditSeverity::Medium => "medium",
            AuditSeverity::High => "high",
            AuditSeverity::Critical => "critical",
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;

    #[derive(Debug, Clone)]
    struct TestEntity {
        pub id: String,
        pub deleted_at: Option<DateTime<Utc>>,
        pub deleted_by: Option<String>,
        pub created_at: DateTime<Utc>,
        pub updated_at: DateTime<Utc>,
    }

    impl SoftDeletable for TestEntity {
        fn deleted_at(&self) -> Option<DateTime<Utc>> {
            self.deleted_at
        }

        fn deleted_by(&self) -> Option<&str> {
            self.deleted_by.as_deref()
        }

        fn mark_deleted(&mut self, when: DateTime<Utc>, by: Option<String>) {
            self.deleted_at = Some(when);
            self.deleted_by = by;
        }

        fn mark_deleted_with_actor(&mut self, when: Option<DateTime<Utc>>, by: Option<String>) {
            self.deleted_at = when;
            self.deleted_by = by;
        }
    }

    impl IncrementallySynced for TestEntity {
        fn last_modified(&self) -> DateTime<Utc> {
            self.updated_at
        }

        fn created_at(&self) -> DateTime<Utc> {
            self.created_at
        }

        fn sync_id(&self) -> String {
            self.id.clone()
        }
    }

    impl DomainEntity for TestEntity {}

    fn make_entity(id: &str, updated_at: DateTime<Utc>) -> TestEntity {
        TestEntity {
            id: id.to_string(),
            deleted_at: None,
            deleted_by: None,
            created_at: Utc.with_ymd_and_hms(2026, 1, 1, 0, 0, 0).unwrap(),
            updated_at,
        }
    }

    #[test]
    fn test_soft_delete_default_filter() {
        let entity = make_entity("e1", Utc::now());
        let filter = SoftDeleteFilter::default();
        assert!(filter.should_include(&entity));
        assert!(!filter.include_deleted);
    }

    #[test]
    fn test_soft_delete_include_deleted() {
        let mut entity = make_entity("e1", Utc::now());
        entity.mark_deleted(Utc::now(), Some("user-1".to_string()));

        let only_live = SoftDeleteFilter::only_live();
        assert!(!only_live.should_include(&entity));

        let all = SoftDeleteFilter::include_deleted();
        assert!(all.should_include(&entity));
    }

    #[test]
    fn test_soft_delete_restore() {
        let mut entity = make_entity("e1", Utc::now());
        entity.mark_deleted(Utc::now(), Some("user-1".to_string()));
        assert!(entity.is_deleted());

        entity.restore();
        assert!(!entity.is_deleted());
    }

    #[test]
    fn test_incremental_sync_since() {
        let t1 = Utc.with_ymd_and_hms(2026, 1, 1, 0, 0, 0).unwrap();
        let t2 = Utc.with_ymd_and_hms(2026, 6, 1, 0, 0, 0).unwrap();
        let t3 = Utc.with_ymd_and_hms(2026, 12, 1, 0, 0, 0).unwrap();

        let entity = make_entity("e1", t2);
        let query = IncrementalSyncQuery::new().since(t1);
        assert!(query.matches(&entity));

        let query = IncrementalSyncQuery::new().since(t3);
        assert!(!query.matches(&entity));
    }

    #[test]
    fn test_incremental_sync_window() {
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
    fn test_soft_delete_merger() {
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
    fn test_audit_action_str() {
        assert_eq!(AuditAction::Create.as_str(), "create");
        assert_eq!(AuditAction::Delete.as_str(), "delete");
        assert_eq!(AuditAction::BulkDelete.as_str(), "bulk_delete");
    }

    #[test]
    fn test_audit_severity_ordering() {
        assert!(AuditSeverity::Critical > AuditSeverity::High);
        assert!(AuditSeverity::High > AuditSeverity::Medium);
        assert!(AuditSeverity::Medium > AuditSeverity::Low);
    }
}
