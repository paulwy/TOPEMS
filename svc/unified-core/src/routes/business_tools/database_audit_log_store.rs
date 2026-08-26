//! V456: Database-backed Audit Log Store
//!
//! Provides a PostgreSQL-backed implementation of the AuditLogStore trait.
//! Uses sqlx for database access. This implementation is suitable for
//! multi-instance deployments where audit logs need to be shared across
//! instances and persisted across restarts.

use std::collections::HashMap;
use std::sync::Arc;

use async_trait::async_trait;
use sqlx::{PgPool, Row};
use sqlx::postgres::PgRow;

use super::permission_audit_log::{
    AuditAction, AuditLogEntry, AuditLogError, AuditLogQuery, AuditLogResponse, AuditLogStore,
};

// ===== Database Audit Log Store =====

/// PostgreSQL-backed implementation of AuditLogStore.
///
/// This implementation stores audit logs in a PostgreSQL database. It supports
/// multi-condition filtering, pagination, and sorting by timestamp.
///
/// # Database Schema
///
/// Requires the `permission_audit_logs` table (created by migrations
/// 20260827000000_v448_permission_tables.sql and
/// 20260827000001_v456_audit_log_metadata.sql):
/// - id: BIGSERIAL PRIMARY KEY
/// - tenant_id: VARCHAR(64) NOT NULL
/// - user_id: VARCHAR(64) NOT NULL
/// - action: VARCHAR(32) NOT NULL
/// - old_value: JSONB
/// - new_value: JSONB
/// - changed_by: VARCHAR(64) NOT NULL
/// - changed_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()
/// - ip_address: INET
/// - user_agent: TEXT
/// - metadata: JSONB NOT NULL DEFAULT '{}'
///
/// # Example
///
/// ```rust
/// use topems_unified_core::routes::business_tools::database_audit_log_store::DatabaseAuditLogStore;
///
/// # async fn example(pool: sqlx::PgPool) -> Result<(), Box<dyn std::error::Error>> {
/// let store = DatabaseAuditLogStore::new(pool);
///
/// // Record an audit log
/// let entry = AuditLogEntry {
///     id: "1".to_string(),
///     tenant_id: "tenant-1".to_string(),
///     user_id: "user-1".to_string(),
///     action: AuditAction::Create,
///     old_value: None,
///     new_value: None,
///     changed_by: "admin".to_string(),
///     changed_at: chrono::Utc::now().to_rfc3339(),
///     ip_address: None,
///     user_agent: None,
///     metadata: HashMap::new(),
/// };
/// store.record(entry).await?;
///
/// // Query audit logs
/// let query = AuditLogQuery::default();
/// let response = store.query(&query).await?;
/// println!("Total audit logs: {}", response.total);
///
/// # Ok(())
/// # }
/// ```
pub struct DatabaseAuditLogStore {
    /// PostgreSQL connection pool.
    pool: Arc<PgPool>,
}

impl DatabaseAuditLogStore {
    /// Create a new database audit log store.
    pub fn new(pool: PgPool) -> Self {
        Self {
            pool: Arc::new(pool),
        }
    }

    /// Get a reference to the connection pool.
    pub fn pool(&self) -> &PgPool {
        &self.pool
    }

    /// Convert a database row to an AuditLogEntry.
    fn row_to_entry(row: &PgRow) -> Result<AuditLogEntry, AuditLogError> {
        let id: i64 = row.try_get("id")
            .map_err(|e| AuditLogError::StoreError(format!("Failed to get id: {}", e)))?;
        let tenant_id: String = row.try_get("tenant_id")
            .map_err(|e| AuditLogError::StoreError(format!("Failed to get tenant_id: {}", e)))?;
        let user_id: String = row.try_get("user_id")
            .map_err(|e| AuditLogError::StoreError(format!("Failed to get user_id: {}", e)))?;
        let action_str: String = row.try_get("action")
            .map_err(|e| AuditLogError::StoreError(format!("Failed to get action: {}", e)))?;
        let action: AuditAction = action_str.parse()
            .map_err(|e| AuditLogError::StoreError(format!("Failed to parse action: {}", e)))?;
        let old_value: Option<serde_json::Value> = row.try_get("old_value")
            .map_err(|e| AuditLogError::StoreError(format!("Failed to get old_value: {}", e)))?;
        let new_value: Option<serde_json::Value> = row.try_get("new_value")
            .map_err(|e| AuditLogError::StoreError(format!("Failed to get new_value: {}", e)))?;
        let changed_by: String = row.try_get("changed_by")
            .map_err(|e| AuditLogError::StoreError(format!("Failed to get changed_by: {}", e)))?;
        let changed_at: chrono::DateTime<chrono::Utc> = row.try_get("changed_at")
            .map_err(|e| AuditLogError::StoreError(format!("Failed to get changed_at: {}", e)))?;
        let ip_address: Option<String> = row.try_get("ip_address")
            .map_err(|e| AuditLogError::StoreError(format!("Failed to get ip_address: {}", e)))?
            .map(|ip: ipnetwork::IpNetwork| ip.to_string());
        let user_agent: Option<String> = row.try_get("user_agent")
            .map_err(|e| AuditLogError::StoreError(format!("Failed to get user_agent: {}", e)))?;
        let metadata: serde_json::Value = row.try_get("metadata")
            .map_err(|e| AuditLogError::StoreError(format!("Failed to get metadata: {}", e)))?;
        let metadata_map: HashMap<String, String> = if metadata.is_object() {
            metadata.as_object()
                .unwrap()
                .iter()
                .map(|(k, v)| (k.clone(), v.as_str().unwrap_or("").to_string()))
                .collect()
        } else {
            HashMap::new()
        };

        Ok(AuditLogEntry {
            id: id.to_string(),
            tenant_id,
            user_id,
            action,
            old_value,
            new_value,
            changed_by,
            changed_at: changed_at.to_rfc3339(),
            ip_address,
            user_agent,
            metadata: metadata_map,
        })
    }

    /// Build the WHERE clause and parameters for a query.
    fn build_where_clause(query: &AuditLogQuery) -> (String, Vec<sqlx::types::Json<serde_json::Value>>) {
        let mut conditions = Vec::new();
        let mut params: Vec<sqlx::types::Json<serde_json::Value>> = Vec::new();
        let mut param_index = 1;

        if let Some(tenant_id) = &query.tenant_id {
            conditions.push(format!("tenant_id = ${}", param_index));
            params.push(sqlx::types::Json(serde_json::Value::String(tenant_id.clone())));
            param_index += 1;
        }
        if let Some(user_id) = &query.user_id {
            conditions.push(format!("user_id = ${}", param_index));
            params.push(sqlx::types::Json(serde_json::Value::String(user_id.clone())));
            param_index += 1;
        }
        if let Some(action) = &query.action {
            conditions.push(format!("action = ${}", param_index));
            params.push(sqlx::types::Json(serde_json::Value::String(action.clone())));
            param_index += 1;
        }
        if let Some(changed_by) = &query.changed_by {
            conditions.push(format!("changed_by = ${}", param_index));
            params.push(sqlx::types::Json(serde_json::Value::String(changed_by.clone())));
            param_index += 1;
        }
        if let Some(start_time) = &query.start_time {
            conditions.push(format!("changed_at >= ${}", param_index));
            params.push(sqlx::types::Json(serde_json::Value::String(start_time.clone())));
            param_index += 1;
        }
        if let Some(end_time) = &query.end_time {
            conditions.push(format!("changed_at <= ${}", param_index));
            params.push(sqlx::types::Json(serde_json::Value::String(end_time.clone())));
            param_index += 1;
        }

        let where_clause = if conditions.is_empty() {
            String::new()
        } else {
            format!("WHERE {}", conditions.join(" AND "))
        };

        (where_clause, params)
    }
}

#[async_trait]
impl AuditLogStore for DatabaseAuditLogStore {
    async fn record(&self, entry: AuditLogEntry) -> Result<(), AuditLogError> {
        let metadata_json = serde_json::to_value(&entry.metadata)
            .map_err(|e| AuditLogError::StoreError(format!("Failed to serialize metadata: {}", e)))?;

        let result = sqlx::query(
            r#"
            INSERT INTO permission_audit_logs
                (tenant_id, user_id, action, old_value, new_value, changed_by, changed_at, ip_address, user_agent, metadata)
            VALUES
                ($1, $2, $3, $4, $5, $6, $7, $8::inet, $9, $10)
            "#
        )
        .bind(&entry.tenant_id)
        .bind(&entry.user_id)
        .bind(entry.action.to_string())
        .bind(&entry.old_value)
        .bind(&entry.new_value)
        .bind(&entry.changed_by)
        .bind(chrono::DateTime::parse_from_rfc3339(&entry.changed_at)
            .map(|dt| dt.with_timezone(&chrono::Utc))
            .unwrap_or_else(|_| chrono::Utc::now()))
        .bind(&entry.ip_address)
        .bind(&entry.user_agent)
        .bind(metadata_json)
        .execute(&*self.pool)
        .await
        .map_err(|e| AuditLogError::StoreError(format!("Failed to insert audit log: {}", e)))?;

        if result.rows_affected() == 0 {
            return Err(AuditLogError::StoreError("No rows affected when inserting audit log".to_string()));
        }

        Ok(())
    }

    async fn query(&self, query: &AuditLogQuery) -> Result<AuditLogResponse, AuditLogError> {
        let (where_clause, _params) = Self::build_where_clause(query);

        // Count total matching entries
        let count_sql = format!(
            "SELECT COUNT(*) as count FROM permission_audit_logs {}",
            where_clause
        );
        let count_row = sqlx::query(&count_sql)
            .fetch_one(&*self.pool)
            .await
            .map_err(|e| AuditLogError::StoreError(format!("Failed to count audit logs: {}", e)))?;
        let total: i64 = count_row.try_get("count")
            .map_err(|e| AuditLogError::StoreError(format!("Failed to get count: {}", e)))?;

        // Query entries with pagination
        let offset = query.offset.min(total as usize);
        let limit = query.limit;
        let entries_sql = format!(
            "SELECT * FROM permission_audit_logs {} ORDER BY changed_at DESC LIMIT {} OFFSET {}",
            where_clause, limit, offset
        );
        let rows = sqlx::query(&entries_sql)
            .fetch_all(&*self.pool)
            .await
            .map_err(|e| AuditLogError::StoreError(format!("Failed to query audit logs: {}", e)))?;

        let entries: Result<Vec<AuditLogEntry>, AuditLogError> = rows
            .iter()
            .map(Self::row_to_entry)
            .collect();
        let entries = entries?;

        Ok(AuditLogResponse {
            total: total as usize,
            count: entries.len(),
            offset,
            limit,
            entries,
        })
    }

    async fn get_by_id(&self, id: &str) -> Result<Option<AuditLogEntry>, AuditLogError> {
        let id_i64: i64 = id.parse()
            .map_err(|_| AuditLogError::NotFound(format!("Invalid audit log ID: {}", id)))?;

        let row = sqlx::query("SELECT * FROM permission_audit_logs WHERE id = $1")
            .bind(id_i64)
            .fetch_optional(&*self.pool)
            .await
            .map_err(|e| AuditLogError::StoreError(format!("Failed to get audit log: {}", e)))?;

        match row {
            Some(row) => Ok(Some(Self::row_to_entry(&row)?)),
            None => Ok(None),
        }
    }

    async fn count(&self) -> Result<usize, AuditLogError> {
        let row = sqlx::query("SELECT COUNT(*) as count FROM permission_audit_logs")
            .fetch_one(&*self.pool)
            .await
            .map_err(|e| AuditLogError::StoreError(format!("Failed to count audit logs: {}", e)))?;

        let count: i64 = row.try_get("count")
            .map_err(|e| AuditLogError::StoreError(format!("Failed to get count: {}", e)))?;

        Ok(count as usize)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_where_clause_empty() {
        let query = AuditLogQuery::default();
        let (clause, params) = DatabaseAuditLogStore::build_where_clause(&query);
        assert!(clause.is_empty());
        assert!(params.is_empty());
    }

    #[test]
    fn test_build_where_clause_tenant() {
        let query = AuditLogQuery {
            tenant_id: Some("tenant-1".to_string()),
            ..Default::default()
        };
        let (clause, params) = DatabaseAuditLogStore::build_where_clause(&query);
        assert!(clause.contains("tenant_id = $1"));
        assert_eq!(params.len(), 1);
    }

    #[test]
    fn test_build_where_clause_multiple() {
        let query = AuditLogQuery {
            tenant_id: Some("tenant-1".to_string()),
            user_id: Some("user-1".to_string()),
            action: Some("create".to_string()),
            ..Default::default()
        };
        let (clause, params) = DatabaseAuditLogStore::build_where_clause(&query);
        assert!(clause.contains("tenant_id = $1"));
        assert!(clause.contains("user_id = $2"));
        assert!(clause.contains("action = $3"));
        assert_eq!(params.len(), 3);
    }

    #[test]
    fn test_build_where_clause_time_range() {
        let query = AuditLogQuery {
            start_time: Some("2026-01-01T00:00:00Z".to_string()),
            end_time: Some("2026-12-31T23:59:59Z".to_string()),
            ..Default::default()
        };
        let (clause, params) = DatabaseAuditLogStore::build_where_clause(&query);
        assert!(clause.contains("changed_at >= $1"));
        assert!(clause.contains("changed_at <= $2"));
        assert_eq!(params.len(), 2);
    }

    // Note: Database tests require a running PostgreSQL instance.
    // These are integration tests and should be run with a test database.
    // For unit testing, use InMemoryAuditLogStore instead.
}
