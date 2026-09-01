//! # MasterDataRefService
//!
//! V284 轨B：主数据引用服务（下沉自 unified-core/master/handlers.rs 的 32 处内联 SQL）。
//!
//! 提供 `{prefix}_master_data_refs` 表的统一 CRUD/统计能力，消除 unified-core /
//! crm / scm 三处重复 SQL。表名通过 `with_table` 配置，默认 `core_master_data_refs`。
//!
//! ## Schema 差异说明
//! - core schema（unified-core）：含 `version` 列，无 `local_entity_type` /
//!   `local_entity_id` / `payload_snapshot`。
//! - local schema（crm/scm，由 `ensure_master_data_refs_table` 建表）：含
//!   `local_entity_type` / `local_entity_id` / `payload_snapshot`，无 `version`。
//! - core 增删改查使用 `insert_master_data_ref` / `update_master_data_ref` 等方法；
//!   crm/scm UPSERT 使用 `upsert_local_master_data_ref` 方法（独立 SQL，互不干扰）。

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

/// 主数据引用（core schema：含 version 列）
///
/// 与 `svc/unified-core/src/modules/master/models.rs::MasterDataRef` 字段对齐，
/// 供 unified-core 通过 `From` 转换后复用。
#[derive(Debug, Clone, FromRow, Serialize, Deserialize, utoipa::ToSchema)]
pub struct MasterDataRef {
    pub master_data_id: String,
    pub tenant_id: Uuid,
    pub domain: String,
    pub code: String,
    pub name: String,
    pub status: String,
    pub version: i32,
    pub source_service: String,
    pub last_synced_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 创建主数据引用请求（core schema）
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct CreateMasterDataRefRequest {
    pub domain: String,
    pub code: String,
    pub name: String,
    pub status: Option<String>,
    pub source_service: String,
    pub attributes: Option<serde_json::Value>,
}

/// 更新主数据引用请求（core schema）
#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct UpdateMasterDataRefRequest {
    pub name: Option<String>,
    pub status: Option<String>,
    pub attributes: Option<serde_json::Value>,
}

/// 重复编码记录（质量看板）
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct DuplicateRecord {
    pub domain: String,
    pub code: String,
    pub count: i64,
    pub master_data_ids: Vec<String>,
}

/// 过期数据记录（超过阈值未同步）
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct StaleRecord {
    pub master_data_id: String,
    pub domain: String,
    pub code: String,
    pub name: String,
    pub source_service: String,
    pub last_synced_at: DateTime<Utc>,
    pub hours_since_sync: f64,
}

/// crm/scm 本地 UPSERT 请求（local schema：含 local_entity_type / payload_snapshot）
#[derive(Debug, Clone)]
pub struct UpsertLocalMasterDataRefRequest {
    pub master_data_id: String,
    pub tenant_id: Uuid,
    pub domain: String,
    pub code: String,
    pub name: String,
    pub status: String,
    pub source_service: String,
    pub local_entity_type: String,
    pub payload_snapshot: serde_json::Value,
}

/// 主数据引用服务
///
/// 封装 `{prefix}_master_data_refs` 表的全部 SQL，消除 unified-core 32 处 +
/// crm 1 处 + scm 1 处重复 SQL。表名通过构造函数指定，默认 `core_master_data_refs`。
#[derive(Debug, Clone)]
pub struct MasterDataRefService {
    pool: PgPool,
    table_name: String,
}

impl MasterDataRefService {
    /// 创建服务实例（默认表名 `core_master_data_refs`，core schema）
    pub fn new(pool: PgPool) -> Self {
        Self {
            pool,
            table_name: "master_data.core_master_data_refs".to_string(),
        }
    }

    /// 创建服务实例并指定表名（用于 crm/scm 等本地 schema）
    ///
    /// 表名应仅含服务前缀 + `_master_data_refs`（如 `crm_master_data_refs`），
    /// 不接受外部用户输入，避免 SQL 注入。
    pub fn with_table(pool: PgPool, table_name: impl Into<String>) -> Self {
        Self {
            pool,
            table_name: table_name.into(),
        }
    }

    /// 底层表名（供调用方诊断/日志使用）
    pub fn table_name(&self) -> &str {
        &self.table_name
    }

    // ==================== core schema：增删改查 ====================

    /// 插入主数据引用（core schema，version=1）
    ///
    /// 替代 unified-core/master/handlers.rs create_ref 内的 INSERT INTO core_master_data_refs。
    pub async fn insert_master_data_ref(
        &self,
        master_data_id: &str,
        tenant_id: Uuid,
        domain: &str,
        code: &str,
        name: &str,
        status: &str,
        source_service: &str,
    ) -> Result<(), sqlx::Error> {
        let sql = format!(
            r#"
            INSERT INTO {}
                (master_data_id, tenant_id, domain, code, name, status, version, source_service, last_synced_at, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, 1, $7, NOW(), NOW(), NOW())
            "#,
            self.table_name
        );
        sqlx::query(&sql)
            .bind(master_data_id)
            .bind(tenant_id)
            .bind(domain)
            .bind(code)
            .bind(name)
            .bind(status)
            .bind(source_service)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    /// 更新主数据引用（core schema，version+1，RETURNING *）
    ///
    /// 替代 unified-core/master/handlers.rs update_ref 内的 UPDATE ... RETURNING *。
    pub async fn update_master_data_ref(
        &self,
        master_data_id: &str,
        tenant_id: Uuid,
        name: &str,
        status: &str,
    ) -> Result<MasterDataRef, sqlx::Error> {
        let sql = format!(
            r#"
            UPDATE {}
            SET name = $1, status = $2, version = version + 1, updated_at = NOW(), last_synced_at = NOW()
            WHERE master_data_id = $3 AND tenant_id = $4
            RETURNING master_data_id, tenant_id, domain, code, name, status, version,
                      source_service, last_synced_at, created_at, updated_at
            "#,
            self.table_name
        );
        let record = sqlx::query_as::<_, MasterDataRef>(&sql)
            .bind(name)
            .bind(status)
            .bind(master_data_id)
            .bind(tenant_id)
            .fetch_one(&self.pool)
            .await?;
        Ok(record)
    }

    /// 软删除主数据引用（status='deleted'）
    ///
    /// 替代 unified-core/master/handlers.rs delete_ref 内的 UPDATE ... SET status='deleted'。
    pub async fn soft_delete_master_data_ref(
        &self,
        master_data_id: &str,
        tenant_id: Uuid,
    ) -> Result<(), sqlx::Error> {
        let sql = format!(
            r#"
            UPDATE {}
            SET status = 'deleted', updated_at = NOW()
            WHERE master_data_id = $1 AND tenant_id = $2
            "#,
            self.table_name
        );
        sqlx::query(&sql)
            .bind(master_data_id)
            .bind(tenant_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    /// 按 master_data_id + tenant_id 查询
    ///
    /// 替代 unified-core get_ref 的 SELECT * FROM core_master_data_refs WHERE ...。
    pub async fn get_by_id(
        &self,
        master_data_id: &str,
        tenant_id: Uuid,
    ) -> Result<Option<MasterDataRef>, sqlx::Error> {
        let sql = format!(
            r#"SELECT master_data_id, tenant_id, domain, code, name, status, version,
                      source_service, last_synced_at, created_at, updated_at
               FROM {} WHERE master_data_id = $1 AND tenant_id = $2"#,
            self.table_name
        );
        let result = sqlx::query_as::<_, MasterDataRef>(&sql)
            .bind(master_data_id)
            .bind(tenant_id)
            .fetch_optional(&self.pool)
            .await?;
        Ok(result)
    }

    /// 按 tenant_id + domain + code 查询
    ///
    /// 替代 unified-core get_ref_by_code 的 SELECT * FROM ... WHERE tenant_id AND domain AND code。
    pub async fn get_by_domain_and_code(
        &self,
        tenant_id: Uuid,
        domain: &str,
        code: &str,
    ) -> Result<Option<MasterDataRef>, sqlx::Error> {
        let sql = format!(
            r#"SELECT master_data_id, tenant_id, domain, code, name, status, version,
                      source_service, last_synced_at, created_at, updated_at
               FROM {} WHERE tenant_id = $1 AND domain = $2 AND code = $3"#,
            self.table_name
        );
        let result = sqlx::query_as::<_, MasterDataRef>(&sql)
            .bind(tenant_id)
            .bind(domain)
            .bind(code)
            .fetch_optional(&self.pool)
            .await?;
        Ok(result)
    }

    /// 分页列表查询（含动态过滤 + COUNT）
    ///
    /// 替代 unified-core list_refs 的动态 WHERE + COUNT + SELECT。
    /// code/name 使用 ILIKE 模糊匹配，domain/status 精确匹配。
    pub async fn list_by_tenant(
        &self,
        tenant_id: Uuid,
        offset: i64,
        limit: i64,
        domain: Option<&str>,
        code: Option<&str>,
        name: Option<&str>,
        status: Option<&str>,
    ) -> Result<(Vec<MasterDataRef>, i64), sqlx::Error> {
        let mut where_clause = String::from("tenant_id = $1");
        let mut bind_count = 1usize;

        if domain.is_some() {
            bind_count += 1;
            where_clause.push_str(&format!(" AND domain = ${}", bind_count));
        }
        if code.is_some() {
            bind_count += 1;
            where_clause.push_str(&format!(" AND code ILIKE '%' || ${} || '%'", bind_count));
        }
        if name.is_some() {
            bind_count += 1;
            where_clause.push_str(&format!(" AND name ILIKE '%' || ${} || '%'", bind_count));
        }
        if status.is_some() {
            bind_count += 1;
            where_clause.push_str(&format!(" AND status = ${}", bind_count));
        }

        let count_sql = format!(
            "SELECT COUNT(*) FROM {} WHERE {}",
            self.table_name, where_clause
        );
        let list_sql = format!(
            r#"SELECT master_data_id, tenant_id, domain, code, name, status, version,
                      source_service, last_synced_at, created_at, updated_at
               FROM {} WHERE {} ORDER BY updated_at DESC LIMIT {} OFFSET {}"#,
            self.table_name, where_clause, limit, offset
        );

        let mut count_query = sqlx::query_scalar::<_, i64>(&count_sql).bind(tenant_id);
        let mut list_query = sqlx::query_as::<_, MasterDataRef>(&list_sql).bind(tenant_id);

        if let Some(d) = domain {
            count_query = count_query.bind(d);
            list_query = list_query.bind(d);
        }
        if let Some(c) = code {
            count_query = count_query.bind(c);
            list_query = list_query.bind(c);
        }
        if let Some(n) = name {
            count_query = count_query.bind(n);
            list_query = list_query.bind(n);
        }
        if let Some(s) = status {
            count_query = count_query.bind(s);
            list_query = list_query.bind(s);
        }

        let total: i64 = count_query.fetch_one(&self.pool).await?;
        let items = list_query.fetch_all(&self.pool).await?;
        Ok((items, total))
    }

    // ==================== core schema：统计/聚合 ====================

    /// 按 tenant_id 统计总数
    pub async fn count_by_tenant(&self, tenant_id: Uuid) -> Result<i64, sqlx::Error> {
        let sql = format!(
            "SELECT COUNT(*) FROM {} WHERE tenant_id = $1",
            self.table_name
        );
        let count = sqlx::query_scalar::<_, i64>(&sql)
            .bind(tenant_id)
            .fetch_one(&self.pool)
            .await?;
        Ok(count)
    }

    /// 按 tenant_id + domain 统计总数
    pub async fn count_by_domain(&self, tenant_id: Uuid, domain: &str) -> Result<i64, sqlx::Error> {
        let sql = format!(
            "SELECT COUNT(*) FROM {} WHERE tenant_id = $1 AND domain = $2",
            self.table_name
        );
        let count = sqlx::query_scalar::<_, i64>(&sql)
            .bind(tenant_id)
            .bind(domain)
            .fetch_one(&self.pool)
            .await?;
        Ok(count)
    }

    /// 按 tenant_id + domain + status(=) 统计
    pub async fn count_by_domain_status(
        &self,
        tenant_id: Uuid,
        domain: &str,
        status: &str,
    ) -> Result<i64, sqlx::Error> {
        let sql = format!(
            "SELECT COUNT(*) FROM {} WHERE tenant_id = $1 AND domain = $2 AND status = $3",
            self.table_name
        );
        let count = sqlx::query_scalar::<_, i64>(&sql)
            .bind(tenant_id)
            .bind(domain)
            .bind(status)
            .fetch_one(&self.pool)
            .await?;
        Ok(count)
    }

    /// 按 tenant_id + domain + status(!=) 统计
    pub async fn count_by_domain_status_not(
        &self,
        tenant_id: Uuid,
        domain: &str,
        status: &str,
    ) -> Result<i64, sqlx::Error> {
        let sql = format!(
            "SELECT COUNT(*) FROM {} WHERE tenant_id = $1 AND domain = $2 AND status != $3",
            self.table_name
        );
        let count = sqlx::query_scalar::<_, i64>(&sql)
            .bind(tenant_id)
            .bind(domain)
            .bind(status)
            .fetch_one(&self.pool)
            .await?;
        Ok(count)
    }

    /// 按 tenant_id + status(=) 统计（无 domain 过滤）
    pub async fn count_by_tenant_status(
        &self,
        tenant_id: Uuid,
        status: &str,
    ) -> Result<i64, sqlx::Error> {
        let sql = format!(
            "SELECT COUNT(*) FROM {} WHERE tenant_id = $1 AND status = $2",
            self.table_name
        );
        let count = sqlx::query_scalar::<_, i64>(&sql)
            .bind(tenant_id)
            .bind(status)
            .fetch_one(&self.pool)
            .await?;
        Ok(count)
    }

    /// 统计 active 且 last_synced_at < threshold 的记录数（按 domain）
    pub async fn count_stale_by_domain(
        &self,
        tenant_id: Uuid,
        domain: &str,
        threshold: DateTime<Utc>,
    ) -> Result<i64, sqlx::Error> {
        let sql = format!(
            r#"SELECT COUNT(*) FROM {}
               WHERE tenant_id = $1 AND domain = $2 AND status = 'active' AND last_synced_at < $3"#,
            self.table_name
        );
        let count = sqlx::query_scalar::<_, i64>(&sql)
            .bind(tenant_id)
            .bind(domain)
            .bind(threshold)
            .fetch_one(&self.pool)
            .await?;
        Ok(count)
    }

    /// 统计 active 且 last_synced_at < threshold 的记录数（全 domain）
    pub async fn count_stale_total(
        &self,
        tenant_id: Uuid,
        threshold: DateTime<Utc>,
    ) -> Result<i64, sqlx::Error> {
        let sql = format!(
            r#"SELECT COUNT(*) FROM {}
               WHERE tenant_id = $1 AND status = 'active' AND last_synced_at < $2"#,
            self.table_name
        );
        let count = sqlx::query_scalar::<_, i64>(&sql)
            .bind(tenant_id)
            .bind(threshold)
            .fetch_one(&self.pool)
            .await?;
        Ok(count)
    }

    /// 查询 MAX(updated_at)（按 domain）
    pub async fn get_max_updated_at(
        &self,
        tenant_id: Uuid,
        domain: &str,
    ) -> Result<Option<DateTime<Utc>>, sqlx::Error> {
        let sql = format!(
            "SELECT MAX(updated_at) FROM {} WHERE tenant_id = $1 AND domain = $2",
            self.table_name
        );
        let result = sqlx::query_scalar::<_, Option<DateTime<Utc>>>(&sql)
            .bind(tenant_id)
            .bind(domain)
            .fetch_optional(&self.pool)
            .await?
            .flatten();
        Ok(result)
    }

    /// 查询 MAX(last_synced_at)（按 domain）
    pub async fn get_max_last_synced_at(
        &self,
        tenant_id: Uuid,
        domain: &str,
    ) -> Result<Option<DateTime<Utc>>, sqlx::Error> {
        let sql = format!(
            "SELECT MAX(last_synced_at) FROM {} WHERE tenant_id = $1 AND domain = $2",
            self.table_name
        );
        let result = sqlx::query_scalar::<_, Option<DateTime<Utc>>>(&sql)
            .bind(tenant_id)
            .bind(domain)
            .fetch_optional(&self.pool)
            .await?
            .flatten();
        Ok(result)
    }

    // ==================== core schema：复杂聚合（质量看板） ====================

    /// 统计重复编码组数（全 domain，GROUP BY code, domain HAVING COUNT > 1）
    pub async fn count_duplicate_groups(&self, tenant_id: Uuid) -> Result<i64, sqlx::Error> {
        let sql = format!(
            r#"
            SELECT COUNT(*) FROM (
                SELECT code, domain FROM {}
                WHERE tenant_id = $1 AND status != 'deleted'
                GROUP BY code, domain HAVING COUNT(*) > 1
            ) t
            "#,
            self.table_name
        );
        let count = sqlx::query_scalar::<_, i64>(&sql)
            .bind(tenant_id)
            .fetch_one(&self.pool)
            .await?;
        Ok(count)
    }

    /// 统计重复编码组数（按 domain，GROUP BY code HAVING COUNT > 1）
    pub async fn count_duplicate_groups_by_domain(
        &self,
        tenant_id: Uuid,
        domain: &str,
    ) -> Result<i64, sqlx::Error> {
        let sql = format!(
            r#"
            SELECT COUNT(*) FROM (
                SELECT code FROM {}
                WHERE tenant_id = $1 AND domain = $2 AND status != 'deleted'
                GROUP BY code HAVING COUNT(*) > 1
            ) t
            "#,
            self.table_name
        );
        let count = sqlx::query_scalar::<_, i64>(&sql)
            .bind(tenant_id)
            .bind(domain)
            .fetch_one(&self.pool)
            .await?;
        Ok(count)
    }

    /// 查询重复编码详情（含 master_data_ids 聚合）
    pub async fn list_duplicates(
        &self,
        tenant_id: Uuid,
    ) -> Result<Vec<DuplicateRecord>, sqlx::Error> {
        let sql = format!(
            r#"
            SELECT domain, code, COUNT(*) as count,
                   array_agg(master_data_id) as master_data_ids
            FROM {}
            WHERE tenant_id = $1 AND status != 'deleted'
            GROUP BY domain, code HAVING COUNT(*) > 1
            ORDER BY count DESC
            "#,
            self.table_name
        );
        let rows = sqlx::query_as::<_, DuplicateRecord>(&sql)
            .bind(tenant_id)
            .fetch_all(&self.pool)
            .await?;
        Ok(rows)
    }

    /// 查询过期数据详情（含 hours_since_sync 计算列）
    pub async fn list_stale(
        &self,
        tenant_id: Uuid,
        threshold: DateTime<Utc>,
    ) -> Result<Vec<StaleRecord>, sqlx::Error> {
        let sql = format!(
            r#"
            SELECT master_data_id, domain, code, name, source_service, last_synced_at,
                   EXTRACT(EPOCH FROM (NOW() - last_synced_at)) / 3600.0 as hours_since_sync
            FROM {}
            WHERE tenant_id = $1 AND status = 'active' AND last_synced_at < $2
            ORDER BY last_synced_at ASC
            "#,
            self.table_name
        );
        let rows = sqlx::query_as::<_, StaleRecord>(&sql)
            .bind(tenant_id)
            .bind(threshold)
            .fetch_all(&self.pool)
            .await?;
        Ok(rows)
    }

    // ==================== local schema：crm/scm UPSERT ====================

    /// UPSERT 本地主数据引用（local schema：含 local_entity_type / payload_snapshot）
    ///
    /// 替代 crm/event_handlers/mod.rs 与 scm/event_handlers/mod.rs 中的
    /// INSERT INTO {prefix}_master_data_refs ... ON CONFLICT DO UPDATE。
    /// 调用方需通过 `with_table` 指定正确的表名（crm_master_data_refs / scm_master_data_refs）。
    pub async fn upsert_local_master_data_ref(
        &self,
        req: &UpsertLocalMasterDataRefRequest,
    ) -> Result<u64, sqlx::Error> {
        let sql = format!(
            r#"INSERT INTO {}
               (master_data_id, tenant_id, domain, code, name, status, source_service,
                local_entity_type, payload_snapshot, last_synced_at, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), NOW())
               ON CONFLICT (master_data_id) DO UPDATE
               SET name = EXCLUDED.name,
                   status = EXCLUDED.status,
                   code = EXCLUDED.code,
                   payload_snapshot = EXCLUDED.payload_snapshot,
                   last_synced_at = NOW(),
                   updated_at = NOW()"#,
            self.table_name
        );
        let result = sqlx::query(&sql)
            .bind(&req.master_data_id)
            .bind(req.tenant_id)
            .bind(&req.domain)
            .bind(&req.code)
            .bind(&req.name)
            .bind(&req.status)
            .bind(&req.source_service)
            .bind(&req.local_entity_type)
            .bind(&req.payload_snapshot)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_create_master_data_ref_request_defaults() {
        let req = CreateMasterDataRefRequest {
            domain: "customer".to_string(),
            code: "C001".to_string(),
            name: "Alice".to_string(),
            status: None,
            source_service: "crm".to_string(),
            attributes: None,
        };
        assert_eq!(req.domain, "customer");
        assert_eq!(req.code, "C001");
        assert_eq!(req.name, "Alice");
        assert!(req.status.is_none());
        assert!(req.attributes.is_none());
    }

    #[test]
    fn test_create_master_data_ref_request_with_status() {
        let req = CreateMasterDataRefRequest {
            domain: "supplier".to_string(),
            code: "S001".to_string(),
            name: "Acme Corp".to_string(),
            status: Some("active".to_string()),
            source_service: "srm".to_string(),
            attributes: Some(json!({"key": "val"})),
        };
        assert_eq!(req.status.as_deref(), Some("active"));
        assert!(req.attributes.is_some());
    }

    #[test]
    fn test_update_master_data_ref_request_all_none() {
        let req = UpdateMasterDataRefRequest {
            name: None,
            status: None,
            attributes: None,
        };
        assert!(req.name.is_none());
        assert!(req.status.is_none());
        assert!(req.attributes.is_none());
    }

    #[test]
    fn test_update_master_data_ref_request_with_fields() {
        let req = UpdateMasterDataRefRequest {
            name: Some("New Name".to_string()),
            status: Some("inactive".to_string()),
            attributes: Some(json!({"reason": "rename"})),
        };
        assert_eq!(req.name.as_deref(), Some("New Name"));
        assert_eq!(req.status.as_deref(), Some("inactive"));
    }

    #[test]
    fn test_upsert_local_request_construction() {
        let tenant = Uuid::new_v4();
        let payload = json!({"k": "v"});
        let req = UpsertLocalMasterDataRefRequest {
            master_data_id: "cust-001".to_string(),
            tenant_id: tenant,
            domain: "customer".to_string(),
            code: "C001".to_string(),
            name: "Alice".to_string(),
            status: "active".to_string(),
            source_service: "crm".to_string(),
            local_entity_type: "customer".to_string(),
            payload_snapshot: payload.clone(),
        };
        assert_eq!(req.master_data_id, "cust-001");
        assert_eq!(req.tenant_id, tenant);
        assert_eq!(req.local_entity_type, "customer");
        assert_eq!(req.payload_snapshot, payload);
    }

    #[test]
    fn test_create_master_data_ref_request_serde_roundtrip() {
        let req = CreateMasterDataRefRequest {
            domain: "material".to_string(),
            code: "M001".to_string(),
            name: "Steel".to_string(),
            status: Some("active".to_string()),
            source_service: "erp".to_string(),
            attributes: Some(json!({"unit": "kg"})),
        };
        let json_str = serde_json::to_string(&req).expect("serialize");
        let deserialized: CreateMasterDataRefRequest =
            serde_json::from_str(&json_str).expect("deserialize");
        assert_eq!(deserialized.domain, req.domain);
        assert_eq!(deserialized.code, req.code);
        assert_eq!(deserialized.status, req.status);
        assert_eq!(deserialized.attributes, req.attributes);
    }

    #[test]
    fn test_update_master_data_ref_request_serde_roundtrip() {
        let req = UpdateMasterDataRefRequest {
            name: Some("Updated Name".to_string()),
            status: Some("inactive".to_string()),
            attributes: Some(json!({"reason": "audit"})),
        };
        let json_str = serde_json::to_string(&req).expect("serialize");
        let deserialized: UpdateMasterDataRefRequest =
            serde_json::from_str(&json_str).expect("deserialize");
        assert_eq!(deserialized.name, req.name);
        assert_eq!(deserialized.status, req.status);
        assert_eq!(deserialized.attributes, req.attributes);
    }

    #[test]
    fn test_master_data_ref_serde_roundtrip() {
        let now = Utc::now();
        let mref = MasterDataRef {
            master_data_id: "cust-001".to_string(),
            tenant_id: Uuid::new_v4(),
            domain: "customer".to_string(),
            code: "C001".to_string(),
            name: "Alice".to_string(),
            status: "active".to_string(),
            version: 3,
            source_service: "crm".to_string(),
            last_synced_at: now,
            created_at: now,
            updated_at: now,
        };
        let json_str = serde_json::to_string(&mref).expect("serialize");
        let deserialized: MasterDataRef = serde_json::from_str(&json_str).expect("deserialize");
        assert_eq!(deserialized.master_data_id, mref.master_data_id);
        assert_eq!(deserialized.version, mref.version);
        assert_eq!(deserialized.status, mref.status);
    }
}
