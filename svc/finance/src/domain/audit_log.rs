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

#[derive(Debug, Clone)]
pub struct AuditLogQuery {
    pub action: Option<AuditAction>,
    pub actor: Option<String>,
    pub target_type: Option<String>,
    pub target_id: Option<String>,
    pub start_time: Option<DateTime<Utc>>,
    pub end_time: Option<DateTime<Utc>>,
}

impl Default for AuditLogQuery {
    fn default() -> Self {
        Self {
            action: None,
            actor: None,
            target_type: None,
            target_id: None,
            start_time: None,
            end_time: None,
        }
    }
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

        let mut logs = self.logs.lock().expect("Mutex poisoned");
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

        let mut logs = self.logs.lock().expect("Mutex poisoned");
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
        let logs = self.logs.lock().expect("Mutex poisoned");

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
        let logs = self.logs.lock().expect("Mutex poisoned");
        logs.iter().find(|e| e.id == id).cloned()
    }

    pub fn count(&self) -> usize {
        let logs = self.logs.lock().expect("Mutex poisoned");
        logs.len()
    }
}

impl Default for AuditLogService {
    fn default() -> Self {
        Self::new()
    }
}
