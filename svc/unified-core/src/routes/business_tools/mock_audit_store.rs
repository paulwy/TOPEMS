//! 共享的测试 Mock 实现
//!
//! 提供统一的 MockAuditLogStore 实现，供各业务模块的测试使用。

use std::sync::Mutex;

use async_trait::async_trait;

use super::permission_audit_log::{
    AuditAction, AuditLogEntry, AuditLogError, AuditLogQuery, AuditLogResponse, AuditLogStore,
};

/// Mock 的审计日志存储实现，用于测试
pub struct MockAuditLogStore {
    entries: Mutex<Vec<AuditLogEntry>>,
}

impl MockAuditLogStore {
    /// 创建新的 Mock 存储
    pub fn new() -> Self {
        Self {
            entries: Mutex::new(Vec::new()),
        }
    }

    /// 添加一条日志（测试辅助方法）
    pub fn add_entry(&self, entry: AuditLogEntry) {
        self.entries.lock().unwrap().push(entry);
    }

    /// 获取所有日志（测试辅助方法）
    pub fn get_all(&self) -> Vec<AuditLogEntry> {
        self.entries.lock().unwrap().clone()
    }

    /// 获取日志数量（测试辅助方法）
    pub fn len(&self) -> usize {
        self.entries.lock().unwrap().len()
    }

    /// 是否为空
    pub fn is_empty(&self) -> bool {
        self.entries.lock().unwrap().is_empty()
    }

    /// 清空所有日志
    pub fn clear(&self) {
        self.entries.lock().unwrap().clear();
    }
}

impl Default for MockAuditLogStore {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl AuditLogStore for MockAuditLogStore {
    async fn record(&self, entry: AuditLogEntry) -> Result<(), AuditLogError> {
        self.entries.lock().unwrap().push(entry);
        Ok(())
    }

    async fn query(
        &self,
        query: &AuditLogQuery,
    ) -> Result<AuditLogResponse, AuditLogError> {
        let entries = self.entries.lock().unwrap();
        let mut filtered: Vec<AuditLogEntry> = entries
            .iter()
            .filter(|e| {
                if let Some(tenant_id) = &query.tenant_id {
                    if &e.tenant_id != tenant_id {
                        return false;
                    }
                }
                if let Some(user_id) = &query.user_id {
                    if &e.user_id != user_id {
                        return false;
                    }
                }
                if let Some(action) = &query.action {
                    if e.action.to_string() != *action {
                        return false;
                    }
                }
                if let Some(changed_by) = &query.changed_by {
                    if &e.changed_by != changed_by {
                        return false;
                    }
                }
                // RFC3339 timestamps sort correctly lexicographically, so
                // string comparison is a valid time-range filter here.
                if let Some(start_time) = &query.start_time {
                    if e.changed_at.as_str() < start_time.as_str() {
                        return false;
                    }
                }
                if let Some(end_time) = &query.end_time {
                    if e.changed_at.as_str() > end_time.as_str() {
                        return false;
                    }
                }
                true
            })
            .cloned()
            .collect();

        let total = filtered.len();
        let limit = query.limit;
        let offset = query.offset;
        let items: Vec<AuditLogEntry> = filtered.drain(offset..).take(limit).collect();
        let count = items.len();

        Ok(AuditLogResponse {
            entries: items,
            total,
            count,
            limit,
            offset,
        })
    }

    async fn get_by_id(&self, id: &str) -> Result<Option<AuditLogEntry>, AuditLogError> {
        let entries = self.entries.lock().unwrap();
        Ok(entries.iter().find(|e| e.id == id).cloned())
    }

    async fn count(&self) -> Result<usize, AuditLogError> {
        Ok(self.entries.lock().unwrap().len())
    }

    async fn query_logs(
        &self,
        tenant_id: Option<String>,
        user_id: Option<String>,
        action: Option<String>,
        changed_by: Option<String>,
        _start_time: Option<String>,
        _end_time: Option<String>,
        limit: Option<usize>,
        offset: Option<usize>,
    ) -> Result<Vec<AuditLogEntry>, AuditLogError> {
        let entries = self.entries.lock().unwrap();
        let mut filtered: Vec<AuditLogEntry> = entries
            .iter()
            .filter(|e| {
                if let Some(tid) = &tenant_id {
                    if &e.tenant_id != tid {
                        return false;
                    }
                }
                if let Some(uid) = &user_id {
                    if &e.user_id != uid {
                        return false;
                    }
                }
                if let Some(act) = &action {
                    if e.action.to_string() != *act {
                        return false;
                    }
                }
                if let Some(cb) = &changed_by {
                    if &e.changed_by != cb {
                        return false;
                    }
                }
                true
            })
            .cloned()
            .collect();

        let limit = limit.unwrap_or(100);
        let offset = offset.unwrap_or(0);
        let items: Vec<AuditLogEntry> = filtered.drain(offset..).take(limit).collect();
        Ok(items)
    }

    async fn delete_log(&self, id: &str) -> Result<(), AuditLogError> {
        let mut entries = self.entries.lock().unwrap();
        entries.retain(|e| e.id != id);
        Ok(())
    }
}

/// 创建测试用的 AuditLogEntry
pub fn make_test_entry(id: &str, changed_at: &str) -> AuditLogEntry {
    AuditLogEntry {
        id: id.to_string(),
        tenant_id: "t1".to_string(),
        user_id: "u1".to_string(),
        action: AuditAction::Create,
        old_value: None,
        new_value: None,
        changed_by: "admin".to_string(),
        changed_at: changed_at.to_string(),
        ip_address: None,
        user_agent: None,
        metadata: std::collections::HashMap::new(),
    }
}
