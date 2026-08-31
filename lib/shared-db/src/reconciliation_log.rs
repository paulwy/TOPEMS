//! # ReconciliationLogService
//!
//! V285 轨A：对账日志服务（下沉自 unified-core/master/handlers.rs 的
//! INSERT...SELECT 跨表写入 + 查询 + 标记解决 SQL）。
//!
//! 提供 `core_mdm_reconciliation_log` 表的写入、跨表 INSERT...SELECT、
//! 分页查询、标记解决等能力，消除 unified-core 中三处内联 SQL。
//!
//! ## Schema
//! - id: Uuid（主键，默认 gen_random_uuid()）
//! - tenant_id: Uuid
//! - domain: String
//! - master_data_id: String
//! - issue_type: String
//! - description: String
//! - detected_at: DateTime<Utc>（默认 NOW()）
//! - resolved: bool（默认 false）
//! - resolved_at: Option<DateTime<Utc>>

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

/// 对账日志记录
///
/// 与 `svc/unified-core/src/modules/master/models.rs::ReconciliationLog`
/// 字段对齐，供 unified-core 通过 `From` 转换后复用。
#[derive(Debug, Clone, FromRow, Serialize, Deserialize, utoipa::ToSchema)]
pub struct ReconciliationLog {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub domain: String,
    pub master_data_id: String,
    pub issue_type: String,
    pub description: String,
    pub detected_at: DateTime<Utc>,
    pub resolved: bool,
    pub resolved_at: Option<DateTime<Utc>>,
}

/// 创建对账日志请求（单条插入）
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct CreateReconciliationLogRequest {
    pub domain: String,
    pub master_data_id: String,
    pub issue_type: String,
    pub description: String,
}

/// 对账日志服务
///
/// 封装 `core_mdm_reconciliation_log` 表的全部 SQL，消除 unified-core
/// record_reconciliation_issues / list_reconciliation_logs /
/// resolve_reconciliation_issue 三处内联 SQL。
#[derive(Debug, Clone)]
pub struct ReconciliationLogService {
    pool: PgPool,
    table_name: String,
    refs_table_name: String,
}

impl ReconciliationLogService {
    /// 创建服务实例（默认表名 core_mdm_reconciliation_log + core_master_data_refs）
    pub fn new(pool: PgPool) -> Self {
        Self {
            pool,
            table_name: "master_data.core_mdm_reconciliation_log".to_string(),
            refs_table_name: "master_data.core_master_data_refs".to_string(),
        }
    }

    /// 创建服务实例并指定表名（测试或多 schema 场景）
    ///
    /// 表名仅接受硬编码常量，不接受外部用户输入，避免 SQL 注入。
    pub fn with_tables(
        pool: PgPool,
        log_table: impl Into<String>,
        refs_table: impl Into<String>,
    ) -> Self {
        Self {
            pool,
            table_name: log_table.into(),
            refs_table_name: refs_table.into(),
        }
    }

    pub fn table_name(&self) -> &str {
        &self.table_name
    }

    pub fn refs_table_name(&self) -> &str {
        &self.refs_table_name
    }

    /// 插入单条对账日志
    pub async fn insert_reconciliation_log(
        &self,
        tenant_id: Uuid,
        req: &CreateReconciliationLogRequest,
    ) -> Result<ReconciliationLog, sqlx::Error> {
        let sql = format!(
            r#"
            INSERT INTO {}
                (tenant_id, domain, master_data_id, issue_type, description, detected_at, resolved)
            VALUES ($1, $2, $3, $4, $5, NOW(), false)
            RETURNING id, tenant_id, domain, master_data_id, issue_type, description,
                      detected_at, resolved, resolved_at
            "#,
            self.table_name
        );
        let record = sqlx::query_as::<_, ReconciliationLog>(&sql)
            .bind(tenant_id)
            .bind(&req.domain)
            .bind(&req.master_data_id)
            .bind(&req.issue_type)
            .bind(&req.description)
            .fetch_one(&self.pool)
            .await?;
        Ok(record)
    }

    /// INSERT...SELECT 跨表写入：从 core_master_data_refs 提取待同步记录写入对账日志
    ///
    /// 封装 unified-core record_reconciliation_issues 的核心 SQL：
    /// - 源表：{refs_table_name}（默认 core_master_data_refs）
    /// - 过滤条件：tenant_id + domain + status='pending_sync'
    /// - 写入目标：{log_table_name}（默认 core_mdm_reconciliation_log）
    /// - ON CONFLICT DO NOTHING 幂等保证
    pub async fn insert_from_master_data_refs(
        &self,
        tenant_id: Uuid,
        domain: &str,
    ) -> Result<u64, sqlx::Error> {
        let sql = format!(
            r#"
            INSERT INTO {} (tenant_id, domain, master_data_id, issue_type, description, detected_at, resolved)
            SELECT $1, $2, master_data_id, 'pending_sync',
                   format('主数据 %s 在域 %s 中处于待同步状态', master_data_id, $2),
                   NOW(), false
            FROM {}
            WHERE tenant_id = $1 AND domain = $2 AND status = 'pending_sync'
            ON CONFLICT DO NOTHING
            "#,
            self.table_name, self.refs_table_name
        );
        let result = sqlx::query(&sql)
            .bind(tenant_id)
            .bind(domain)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected())
    }

    /// 查询对账日志（支持 unresolved_only 过滤）
    ///
    /// 封装 unified-core list_reconciliation_logs 的 SQL。
    pub async fn query_reconciliation_logs(
        &self,
        tenant_id: Uuid,
        unresolved_only: bool,
        limit: i64,
    ) -> Result<Vec<ReconciliationLog>, sqlx::Error> {
        let base = format!(
            r#"
            SELECT id, tenant_id, domain, master_data_id, issue_type, description, detected_at, resolved, resolved_at
            FROM {}
            "#,
            self.table_name
        );
        let sql = if unresolved_only {
            format!(
                "{} WHERE tenant_id = $1 AND resolved = false ORDER BY detected_at DESC LIMIT $2",
                base
            )
        } else {
            format!(
                "{} WHERE tenant_id = $1 ORDER BY detected_at DESC LIMIT $2",
                base
            )
        };
        let rows = sqlx::query_as::<_, ReconciliationLog>(&sql)
            .bind(tenant_id)
            .bind(limit)
            .fetch_all(&self.pool)
            .await?;
        Ok(rows)
    }

    /// 标记对账问题已解决
    ///
    /// 封装 unified-core resolve_reconciliation_issue 的 UPDATE SQL。
    /// 返回是否实际更新了至少一行（false 表示已解决或不存在）。
    pub async fn resolve_reconciliation_issue(
        &self,
        tenant_id: Uuid,
        issue_id: Uuid,
    ) -> Result<bool, sqlx::Error> {
        let sql = format!(
            r#"
            UPDATE {}
            SET resolved = true, resolved_at = NOW()
            WHERE id = $1 AND tenant_id = $2 AND resolved = false
            "#,
            self.table_name
        );
        let result = sqlx::query(&sql)
            .bind(issue_id)
            .bind(tenant_id)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected() > 0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_create_reconciliation_log_request_construction() {
        let req = CreateReconciliationLogRequest {
            domain: "customer".to_string(),
            master_data_id: "cust-001".to_string(),
            issue_type: "pending_sync".to_string(),
            description: "主数据待同步".to_string(),
        };
        assert_eq!(req.domain, "customer");
        assert_eq!(req.master_data_id, "cust-001");
        assert_eq!(req.issue_type, "pending_sync");
        assert!(!req.description.is_empty());
    }

    #[test]
    fn test_create_reconciliation_log_request_serde_roundtrip() {
        let req = CreateReconciliationLogRequest {
            domain: "material".to_string(),
            master_data_id: "mat-001".to_string(),
            issue_type: "pending_sync".to_string(),
            description: "主数据 mat-001 在域 material 中处于待同步状态".to_string(),
        };
        let json_str = serde_json::to_string(&req).expect("serialize");
        let deserialized: CreateReconciliationLogRequest =
            serde_json::from_str(&json_str).expect("deserialize");
        assert_eq!(deserialized.domain, req.domain);
        assert_eq!(deserialized.master_data_id, req.master_data_id);
        assert_eq!(deserialized.issue_type, req.issue_type);
        assert_eq!(deserialized.description, req.description);
    }

    #[test]
    fn test_reconciliation_log_serde_roundtrip() {
        let now = Utc::now();
        let id = Uuid::new_v4();
        let tenant = Uuid::new_v4();
        let log = ReconciliationLog {
            id,
            tenant_id: tenant,
            domain: "customer".to_string(),
            master_data_id: "cust-001".to_string(),
            issue_type: "pending_sync".to_string(),
            description: "test issue".to_string(),
            detected_at: now,
            resolved: false,
            resolved_at: None,
        };
        let json_str = serde_json::to_string(&log).expect("serialize");
        let deserialized: ReconciliationLog = serde_json::from_str(&json_str).expect("deserialize");
        assert_eq!(deserialized.id, id);
        assert_eq!(deserialized.tenant_id, tenant);
        assert_eq!(deserialized.domain, "customer");
        assert_eq!(deserialized.master_data_id, "cust-001");
        assert!(!deserialized.resolved);
        assert!(deserialized.resolved_at.is_none());
    }

    #[test]
    fn test_create_reconciliation_log_request_with_issue_types() {
        let types = [
            "pending_sync",
            "data_mismatch",
            "stale_data",
            "duplicate_code",
        ];
        for issue_type in types {
            let req = CreateReconciliationLogRequest {
                domain: "customer".to_string(),
                master_data_id: "cust-test".to_string(),
                issue_type: issue_type.to_string(),
                description: format!("issue: {}", issue_type),
            };
            assert_eq!(req.issue_type, issue_type);
            assert_eq!(req.domain, "customer");
        }
    }

    #[test]
    fn test_reconciliation_log_default_resolved_false() {
        let now = Utc::now();
        let log = ReconciliationLog {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            domain: "product".to_string(),
            master_data_id: "prod-001".to_string(),
            issue_type: "stale_data".to_string(),
            description: "超过7天未同步".to_string(),
            detected_at: now,
            resolved: false,
            resolved_at: None,
        };
        assert!(!log.resolved);
        assert!(log.resolved_at.is_none());
        let json_str = serde_json::to_string(&log).unwrap();
        assert!(json_str.contains("\"resolved\":false"));
    }

    #[test]
    fn test_reconciliation_log_with_resolved_at() {
        let now = Utc::now();
        let log = ReconciliationLog {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            domain: "supplier".to_string(),
            master_data_id: "sup-001".to_string(),
            issue_type: "data_mismatch".to_string(),
            description: "名称不一致".to_string(),
            detected_at: now,
            resolved: true,
            resolved_at: Some(now),
        };
        assert!(log.resolved);
        assert!(log.resolved_at.is_some());
        let json_val = serde_json::to_value(&log).expect("to_value");
        assert_eq!(json_val["domain"], json!("supplier"));
        assert_eq!(json_val["resolved"], json!(true));
    }
}
