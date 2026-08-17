use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum AuditAction {
    Create,
    Update,
    Delete,
    View,
    Export,
    Approve,
    Reject,
    Post,
    Reverse,
}

impl AuditAction {
    pub fn as_str(&self) -> &'static str {
        match self {
            AuditAction::Create => "Create",
            AuditAction::Update => "Update",
            AuditAction::Delete => "Delete",
            AuditAction::View => "View",
            AuditAction::Export => "Export",
            AuditAction::Approve => "Approve",
            AuditAction::Reject => "Reject",
            AuditAction::Post => "Post",
            AuditAction::Reverse => "Reverse",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditLogEntry {
    pub id: String,
    pub action: AuditAction,
    pub actor: String,
    pub target_type: String,
    pub target_id: String,
    pub before: Option<serde_json::Value>,
    pub after: Option<serde_json::Value>,
    pub metadata: serde_json::Value,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Default)]
pub struct AuditLogQuery {
    pub action: Option<AuditAction>,
    pub actor: Option<String>,
    pub target_type: Option<String>,
    pub target_id: Option<String>,
    pub start_time: Option<DateTime<Utc>>,
    pub end_time: Option<DateTime<Utc>>,
}

pub struct AuditLogService {
    logs: Mutex<Vec<AuditLogEntry>>,
}

impl AuditLogService {
    pub fn new() -> Self {
        Self {
            logs: Mutex::new(Vec::new()),
        }
    }

    pub fn log_action(
        &self,
        action: AuditAction,
        actor: &str,
        target_type: &str,
        target_id: &str,
        metadata: Option<serde_json::Value>,
    ) -> AuditLogEntry {
        let entry = AuditLogEntry {
            id: Uuid::new_v4().to_string(),
            action,
            actor: actor.to_string(),
            target_type: target_type.to_string(),
            target_id: target_id.to_string(),
            before: None,
            after: None,
            metadata: metadata.unwrap_or(serde_json::Value::Object(serde_json::Map::new())),
            timestamp: Utc::now(),
        };

        let mut logs = self
            .logs
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        logs.push(entry.clone());
        entry
    }

    pub fn log_data_change(
        &self,
        action: AuditAction,
        actor: &str,
        target_type: &str,
        target_id: &str,
        before: Option<serde_json::Value>,
        after: Option<serde_json::Value>,
        metadata: Option<serde_json::Value>,
    ) -> AuditLogEntry {
        let entry = AuditLogEntry {
            id: Uuid::new_v4().to_string(),
            action,
            actor: actor.to_string(),
            target_type: target_type.to_string(),
            target_id: target_id.to_string(),
            before,
            after,
            metadata: metadata.unwrap_or(serde_json::Value::Object(serde_json::Map::new())),
            timestamp: Utc::now(),
        };

        let mut logs = self
            .logs
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        logs.push(entry.clone());
        entry
    }

    pub fn log_access(
        &self,
        actor: &str,
        target_type: &str,
        target_id: &str,
        metadata: Option<serde_json::Value>,
    ) -> AuditLogEntry {
        self.log_action(AuditAction::View, actor, target_type, target_id, metadata)
    }

    pub fn query_logs(&self, query: AuditLogQuery) -> Vec<AuditLogEntry> {
        let logs = self
            .logs
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());

        logs.iter()
            .filter(|entry| {
                if let Some(ref action) = query.action {
                    if entry.action != *action {
                        return false;
                    }
                }
                if let Some(ref actor) = query.actor {
                    if entry.actor != *actor {
                        return false;
                    }
                }
                if let Some(ref target_type) = query.target_type {
                    if entry.target_type != *target_type {
                        return false;
                    }
                }
                if let Some(ref target_id) = query.target_id {
                    if entry.target_id != *target_id {
                        return false;
                    }
                }
                if let Some(start_time) = query.start_time {
                    if entry.timestamp < start_time {
                        return false;
                    }
                }
                if let Some(end_time) = query.end_time {
                    if entry.timestamp > end_time {
                        return false;
                    }
                }
                true
            })
            .cloned()
            .collect()
    }

    pub fn get_log_by_id(&self, id: &str) -> Option<AuditLogEntry> {
        let logs = self
            .logs
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        logs.iter().find(|e| e.id == id).cloned()
    }

    pub fn count(&self) -> usize {
        let logs = self
            .logs
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        logs.len()
    }
}

impl Default for AuditLogService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::{Deserialize, Serialize};

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    // ===== AuditAction roundtrip =====

    #[test]
    fn rt_audit_action_create() {
        roundtrip(&AuditAction::Create);
    }
    #[test]
    fn rt_audit_action_update() {
        roundtrip(&AuditAction::Update);
    }
    #[test]
    fn rt_audit_action_delete() {
        roundtrip(&AuditAction::Delete);
    }
    #[test]
    fn rt_audit_action_view() {
        roundtrip(&AuditAction::View);
    }
    #[test]
    fn rt_audit_action_export() {
        roundtrip(&AuditAction::Export);
    }
    #[test]
    fn rt_audit_action_approve() {
        roundtrip(&AuditAction::Approve);
    }
    #[test]
    fn rt_audit_action_reject() {
        roundtrip(&AuditAction::Reject);
    }
    #[test]
    fn rt_audit_action_post() {
        roundtrip(&AuditAction::Post);
    }
    #[test]
    fn rt_audit_action_reverse() {
        roundtrip(&AuditAction::Reverse);
    }

    // ===== AuditAction::as_str =====

    #[test]
    fn test_action_as_str_all() {
        assert_eq!(AuditAction::Create.as_str(), "Create");
        assert_eq!(AuditAction::Update.as_str(), "Update");
        assert_eq!(AuditAction::Delete.as_str(), "Delete");
        assert_eq!(AuditAction::View.as_str(), "View");
        assert_eq!(AuditAction::Export.as_str(), "Export");
        assert_eq!(AuditAction::Approve.as_str(), "Approve");
        assert_eq!(AuditAction::Reject.as_str(), "Reject");
        assert_eq!(AuditAction::Post.as_str(), "Post");
        assert_eq!(AuditAction::Reverse.as_str(), "Reverse");
    }

    // ===== AuditLogEntry roundtrip =====

    #[test]
    fn rt_audit_log_entry() {
        roundtrip(&AuditLogEntry {
            id: "log1".into(),
            action: AuditAction::Create,
            actor: "alice".into(),
            target_type: "Voucher".into(),
            target_id: "v1".into(),
            before: None,
            after: Some(serde_json::json!({"key": "value"})),
            metadata: serde_json::json!({}),
            timestamp: Utc::now(),
        });
    }
    #[test]
    fn rt_audit_log_entry_with_before() {
        roundtrip(&AuditLogEntry {
            id: "log2".into(),
            action: AuditAction::Update,
            actor: "bob".into(),
            target_type: "Receivable".into(),
            target_id: "r1".into(),
            before: Some(serde_json::json!({"amount": 100})),
            after: Some(serde_json::json!({"amount": 200})),
            metadata: serde_json::json!({"reason": "correction"}),
            timestamp: Utc::now(),
        });
    }

    // ===== AuditLogService =====

    #[test]
    fn test_service_default() {
        let svc = AuditLogService::default();
        assert_eq!(svc.count(), 0);
    }

    #[test]
    fn test_service_log_action() {
        let svc = AuditLogService::new();
        let entry = svc.log_action(
            AuditAction::Create,
            "alice",
            "Voucher",
            "v1",
            Some(serde_json::json!({"source": "api"})),
        );
        assert_eq!(entry.action, AuditAction::Create);
        assert_eq!(entry.actor, "alice");
        assert_eq!(entry.target_type, "Voucher");
        assert_eq!(entry.target_id, "v1");
        assert!(entry.before.is_none());
        assert!(entry.after.is_none());
        assert_eq!(svc.count(), 1);
        let got = svc.get_log_by_id(&entry.id).unwrap();
        assert_eq!(got.id, entry.id);
    }

    #[test]
    fn test_service_log_action_no_metadata() {
        let svc = AuditLogService::new();
        let entry = svc.log_action(AuditAction::Delete, "bob", "Receivable", "r1", None);
        assert_eq!(entry.metadata, serde_json::json!({}));
    }

    #[test]
    fn test_service_log_data_change() {
        let svc = AuditLogService::new();
        let entry = svc.log_data_change(
            AuditAction::Update,
            "alice",
            "Voucher",
            "v1",
            Some(serde_json::json!({"status": "Draft"})),
            Some(serde_json::json!({"status": "Approved"})),
            None,
        );
        assert!(entry.before.is_some());
        assert!(entry.after.is_some());
        assert_eq!(svc.count(), 1);
    }

    #[test]
    fn test_service_log_access() {
        let svc = AuditLogService::new();
        let entry = svc.log_access("charlie", "Receivable", "r1", None);
        assert_eq!(entry.action, AuditAction::View);
        assert_eq!(entry.actor, "charlie");
    }

    #[test]
    fn test_service_get_log_not_found() {
        let svc = AuditLogService::new();
        assert!(svc.get_log_by_id("does-not-exist").is_none());
    }

    #[test]
    fn test_service_count_empty() {
        let svc = AuditLogService::new();
        assert_eq!(svc.count(), 0);
    }

    // ===== query_logs filters =====

    fn seed_svc() -> AuditLogService {
        let svc = AuditLogService::new();
        svc.log_action(AuditAction::Create, "alice", "Voucher", "v1", None);
        svc.log_action(AuditAction::Update, "alice", "Voucher", "v2", None);
        svc.log_action(AuditAction::View, "bob", "Receivable", "r1", None);
        svc.log_action(AuditAction::Delete, "charlie", "Payable", "p1", None);
        svc
    }

    #[test]
    fn test_query_filter_by_action() {
        let svc = seed_svc();
        let q = AuditLogQuery {
            action: Some(AuditAction::Create),
            ..Default::default()
        };
        let results = svc.query_logs(q);
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].action, AuditAction::Create);
    }

    #[test]
    fn test_query_filter_by_actor() {
        let svc = seed_svc();
        let q = AuditLogQuery {
            actor: Some("alice".into()),
            ..Default::default()
        };
        let results = svc.query_logs(q);
        assert_eq!(results.len(), 2);
        assert!(results.iter().all(|e| e.actor == "alice"));
    }

    #[test]
    fn test_query_filter_by_target_type() {
        let svc = seed_svc();
        let q = AuditLogQuery {
            target_type: Some("Voucher".into()),
            ..Default::default()
        };
        let results = svc.query_logs(q);
        assert_eq!(results.len(), 2);
    }

    #[test]
    fn test_query_filter_by_target_id() {
        let svc = seed_svc();
        let q = AuditLogQuery {
            target_id: Some("r1".into()),
            ..Default::default()
        };
        let results = svc.query_logs(q);
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].target_id, "r1");
    }

    #[test]
    fn test_query_combined_filters() {
        let svc = seed_svc();
        let q = AuditLogQuery {
            actor: Some("alice".into()),
            target_type: Some("Voucher".into()),
            ..Default::default()
        };
        let results = svc.query_logs(q);
        assert_eq!(results.len(), 2);
    }

    #[test]
    fn test_query_no_match() {
        let svc = seed_svc();
        let q = AuditLogQuery {
            target_type: Some("Nonexistent".into()),
            ..Default::default()
        };
        let results = svc.query_logs(q);
        assert!(results.is_empty());
    }
}
