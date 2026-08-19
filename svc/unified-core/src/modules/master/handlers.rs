//! MDM 主数据处理器
//!
//! 提供 5 大主数据域的 CRUD API 和事件发布。
//! 所有变更操作都会通过 Redis Pub/Sub 发布 MasterDataEvent。

use std::str::FromStr;

use axum::{
    extract::{Path, Query, State},
    Extension, Json,
};
use chrono::{DateTime, Duration, Utc};
use serde::Deserialize;
use sqlx::PgPool;
use uuid::Uuid;

use crate::AppState;
use topems_shared::{ApiResponse, Claims};
use topems_shared_core::id::{generate_master_data_id, MasterDataDomain as IdMasterDataDomain};
use topems_shared_event::event::{MasterDataAction, MasterDataDomain, MasterDataEvent};

use super::models::{
    requires_approval, CreateApprovalRequest, CreateMasterDataRefRequest, DomainQualityDetail,
    DomainStats, DuplicateRecord, MasterDataApproval, MasterDataChangeLog, MasterDataListResponse,
    MasterDataQuery, MasterDataRef, MdmOverallStats, QualityReport, ReconciliationDetail,
    ReconciliationLog, ReconciliationResult, ReviewApprovalRequest, StaleRecord, SyncStatus,
    UpdateMasterDataRefRequest,
};

/// MDM 服务
pub struct MasterDataService {
    pool: PgPool,
}

impl MasterDataService {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// 创建主数据引用
    pub async fn create_ref(
        &self,
        tenant_id: Uuid,
        req: CreateMasterDataRefRequest,
        operator: Option<String>,
    ) -> Result<MasterDataRef, sqlx::Error> {
        let domain = IdMasterDataDomain::from_str(&req.domain)
            .map_err(|_| sqlx::Error::Decode(format!("Invalid domain: {}", req.domain).into()))?;

        let master_data_id = generate_master_data_id(domain);
        let ref_data = MasterDataRef::from_request(tenant_id, &req, master_data_id.clone());

        sqlx::query(
            r#"
            INSERT INTO core_master_data_refs
                (master_data_id, tenant_id, domain, code, name, status, version, source_service, last_synced_at, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, 1, $7, NOW(), NOW(), NOW())
            "#,
        )
        .bind(&ref_data.master_data_id)
        .bind(ref_data.tenant_id)
        .bind(&ref_data.domain)
        .bind(&ref_data.code)
        .bind(&ref_data.name)
        .bind(&ref_data.status)
        .bind(&ref_data.source_service)
        .execute(&self.pool)
        .await?;

        // 记录变更日志
        self.log_change(
            &ref_data,
            MasterDataAction::Created,
            operator.clone(),
            req.attributes.clone(),
        )
        .await?;

        // 发布事件
        let _ = publish_master_data_event(
            &ref_data,
            MasterDataAction::Created,
            operator,
            req.attributes,
        )
        .await;

        Ok(ref_data)
    }

    /// 更新主数据引用
    pub async fn update_ref(
        &self,
        tenant_id: Uuid,
        master_data_id: &str,
        req: UpdateMasterDataRefRequest,
        operator: Option<String>,
    ) -> Result<MasterDataRef, sqlx::Error> {
        let existing = self
            .get_ref(tenant_id, master_data_id)
            .await?
            .ok_or_else(|| sqlx::Error::RowNotFound)?;

        let mut changed_fields = Vec::new();
        let mut new_name = existing.name.clone();
        let mut new_status = existing.status.clone();

        if let Some(name) = &req.name {
            if name != &existing.name {
                changed_fields.push("name".to_string());
                new_name = name.clone();
            }
        }
        if let Some(status) = &req.status {
            if status != &existing.status {
                changed_fields.push("status".to_string());
                new_status = status.clone();
            }
        }

        let updated = sqlx::query_as::<_, MasterDataRef>(
            r#"
            UPDATE core_master_data_refs
            SET name = $1, status = $2, version = version + 1, updated_at = NOW(), last_synced_at = NOW()
            WHERE master_data_id = $3 AND tenant_id = $4
            RETURNING *
            "#,
        )
        .bind(&new_name)
        .bind(&new_status)
        .bind(master_data_id)
        .bind(tenant_id)
        .fetch_one(&self.pool)
        .await?;

        let action = if changed_fields.contains(&"status".to_string()) {
            if new_status == "active" {
                MasterDataAction::Activated
            } else {
                MasterDataAction::Deactivated
            }
        } else {
            MasterDataAction::Updated
        };

        self.log_change(&updated, action, operator.clone(), req.attributes.clone())
            .await?;
        let _ = publish_master_data_event(&updated, action, operator, req.attributes).await;

        Ok(updated)
    }

    /// 删除主数据引用（软删除）
    pub async fn delete_ref(
        &self,
        tenant_id: Uuid,
        master_data_id: &str,
        operator: Option<String>,
    ) -> Result<bool, sqlx::Error> {
        let existing = self
            .get_ref(tenant_id, master_data_id)
            .await?
            .ok_or_else(|| sqlx::Error::RowNotFound)?;

        sqlx::query(
            r#"
            UPDATE core_master_data_refs
            SET status = 'deleted', updated_at = NOW()
            WHERE master_data_id = $1 AND tenant_id = $2
            "#,
        )
        .bind(master_data_id)
        .bind(tenant_id)
        .execute(&self.pool)
        .await?;

        let op_clone = operator.clone();
        self.log_change(&existing, MasterDataAction::Deleted, operator, None)
            .await?;
        let _ =
            publish_master_data_event(&existing, MasterDataAction::Deleted, op_clone, None).await;

        Ok(true)
    }

    /// 按 ID 查询
    pub async fn get_ref(
        &self,
        tenant_id: Uuid,
        master_data_id: &str,
    ) -> Result<Option<MasterDataRef>, sqlx::Error> {
        let result = sqlx::query_as::<_, MasterDataRef>(
            "SELECT * FROM core_master_data_refs WHERE master_data_id = $1 AND tenant_id = $2",
        )
        .bind(master_data_id)
        .bind(tenant_id)
        .fetch_optional(&self.pool)
        .await?;
        Ok(result)
    }

    /// 按业务编码查询
    pub async fn get_ref_by_code(
        &self,
        tenant_id: Uuid,
        domain: &str,
        code: &str,
    ) -> Result<Option<MasterDataRef>, sqlx::Error> {
        let result = sqlx::query_as::<_, MasterDataRef>(
            "SELECT * FROM core_master_data_refs WHERE tenant_id = $1 AND domain = $2 AND code = $3",
        )
        .bind(tenant_id)
        .bind(domain)
        .bind(code)
        .fetch_optional(&self.pool)
        .await?;
        Ok(result)
    }

    /// 列表查询
    pub async fn list_refs(
        &self,
        tenant_id: Uuid,
        query: MasterDataQuery,
    ) -> Result<(Vec<MasterDataRef>, i64), sqlx::Error> {
        let page = query.page.unwrap_or(1).max(1);
        let page_size = query.page_size.unwrap_or(20).min(100);
        let offset = (page - 1) * page_size;

        let mut where_clause = String::from("tenant_id = $1");
        let mut bind_count = 1;

        if query.domain.is_some() {
            bind_count += 1;
            where_clause.push_str(&format!(" AND domain = ${}", bind_count));
        }
        if query.code.is_some() {
            bind_count += 1;
            where_clause.push_str(&format!(" AND code ILIKE '%' || ${} || '%'", bind_count));
        }
        if query.name.is_some() {
            bind_count += 1;
            where_clause.push_str(&format!(" AND name ILIKE '%' || ${} || '%'", bind_count));
        }
        if query.status.is_some() {
            bind_count += 1;
            where_clause.push_str(&format!(" AND status = ${}", bind_count));
        }

        let count_sql = format!(
            "SELECT COUNT(*) FROM core_master_data_refs WHERE {}",
            where_clause
        );
        let list_sql = format!(
            "SELECT * FROM core_master_data_refs WHERE {} ORDER BY updated_at DESC LIMIT {} OFFSET {}",
            where_clause, page_size, offset
        );

        let mut count_query = sqlx::query_scalar::<_, i64>(&count_sql).bind(tenant_id);
        let mut list_query = sqlx::query_as::<_, MasterDataRef>(&list_sql).bind(tenant_id);

        if let Some(d) = &query.domain {
            count_query = count_query.bind(d);
            list_query = list_query.bind(d);
        }
        if let Some(c) = &query.code {
            count_query = count_query.bind(c);
            list_query = list_query.bind(c);
        }
        if let Some(n) = &query.name {
            count_query = count_query.bind(n);
            list_query = list_query.bind(n);
        }
        if let Some(s) = &query.status {
            count_query = count_query.bind(s);
            list_query = list_query.bind(s);
        }

        let total: i64 = count_query.fetch_one(&self.pool).await?;
        let items = list_query.fetch_all(&self.pool).await?;

        Ok((items, total))
    }

    /// 变更历史
    pub async fn list_changes(
        &self,
        tenant_id: Uuid,
        master_data_id: &str,
        limit: i64,
    ) -> Result<Vec<MasterDataChangeLog>, sqlx::Error> {
        let items = sqlx::query_as::<_, MasterDataChangeLog>(
            r#"
            SELECT id, master_data_id, tenant_id, action, source_service, operator, changed_fields, payload, created_at
            FROM core_master_data_change_log
            WHERE tenant_id = $1 AND master_data_id = $2
            ORDER BY created_at DESC
            LIMIT $3
            "#,
        )
        .bind(tenant_id)
        .bind(master_data_id)
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;
        Ok(items)
    }

    /// 整体统计
    pub async fn get_overall_stats(&self, tenant_id: Uuid) -> Result<MdmOverallStats, sqlx::Error> {
        let total: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM core_master_data_refs WHERE tenant_id = $1")
                .bind(tenant_id)
                .fetch_one(&self.pool)
                .await?;

        let since = Utc::now() - Duration::hours(24);
        let recent: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM core_master_data_change_log WHERE tenant_id = $1 AND created_at >= $2",
        )
        .bind(tenant_id)
        .bind(since)
        .fetch_one(&self.pool)
        .await?;

        let mut by_domain = Vec::new();
        for domain_str in [
            "customer",
            "supplier",
            "material",
            "organization",
            "employee",
            "account_subject",
        ] {
            let count: i64 = sqlx::query_scalar(
                "SELECT COUNT(*) FROM core_master_data_refs WHERE tenant_id = $1 AND domain = $2",
            )
            .bind(tenant_id)
            .bind(domain_str)
            .fetch_one(&self.pool)
            .await?;

            let active: i64 = sqlx::query_scalar(
                "SELECT COUNT(*) FROM core_master_data_refs WHERE tenant_id = $1 AND domain = $2 AND status = 'active'",
            )
            .bind(tenant_id)
            .bind(domain_str)
            .fetch_one(&self.pool)
            .await?;

            let last_updated: Option<DateTime<Utc>> = sqlx::query_scalar(
                "SELECT MAX(updated_at) FROM core_master_data_refs WHERE tenant_id = $1 AND domain = $2",
            )
            .bind(tenant_id)
            .bind(domain_str)
            .fetch_optional(&self.pool)
            .await?
            .flatten();

            by_domain.push(DomainStats {
                domain: domain_str.to_string(),
                total: count,
                active,
                inactive: count - active,
                last_updated,
            });
        }

        Ok(MdmOverallStats {
            total_master_data: total,
            by_domain,
            recent_changes_24h: recent,
        })
    }

    /// 同步状态
    pub async fn get_sync_status(&self, tenant_id: Uuid) -> Result<Vec<SyncStatus>, sqlx::Error> {
        let mut statuses = Vec::new();
        for (domain, source) in [
            ("customer", "crm"),
            ("supplier", "srm"),
            ("material", "erp"),
            ("organization", "hrm"),
            ("employee", "hrm"),
            ("account_subject", "finance"),
        ] {
            let last_sync: Option<DateTime<Utc>> = sqlx::query_scalar(
                "SELECT MAX(last_synced_at) FROM core_master_data_refs WHERE tenant_id = $1 AND domain = $2",
            )
            .bind(tenant_id)
            .bind(domain)
            .fetch_optional(&self.pool)
            .await?
            .flatten();

            let pending: i64 = sqlx::query_scalar(
                "SELECT COUNT(*) FROM core_master_data_refs WHERE tenant_id = $1 AND domain = $2 AND status = 'pending_sync'",
            )
            .bind(tenant_id)
            .bind(domain)
            .fetch_one(&self.pool)
            .await
            .unwrap_or(0);

            let status = if pending > 0 {
                "degraded"
            } else if last_sync.is_some() {
                "healthy"
            } else {
                "unknown"
            };

            statuses.push(SyncStatus {
                domain: domain.to_string(),
                source_service: source.to_string(),
                last_sync_at: last_sync,
                pending_count: pending,
                failed_count: 0,
                status: status.to_string(),
            });
        }
        Ok(statuses)
    }

    /// 记录变更日志
    async fn log_change(
        &self,
        ref_data: &MasterDataRef,
        action: MasterDataAction,
        operator: Option<String>,
        payload: Option<serde_json::Value>,
    ) -> Result<(), sqlx::Error> {
        let action_str = format!("{:?}", action).to_lowercase();
        sqlx::query(
            r#"
            INSERT INTO core_master_data_change_log
                (master_data_id, tenant_id, action, source_service, operator, payload, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            "#,
        )
        .bind(&ref_data.master_data_id)
        .bind(ref_data.tenant_id)
        .bind(&action_str)
        .bind(&ref_data.source_service)
        .bind(operator)
        .bind(payload)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    // ==================== V31.0 质量看板 ====================

    /// 生成主数据质量报告
    pub async fn get_quality_report(
        &self,
        tenant_id: Uuid,
        stale_threshold_hours: i64,
    ) -> Result<QualityReport, sqlx::Error> {
        let total: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM core_master_data_refs WHERE tenant_id = $1")
                .bind(tenant_id)
                .fetch_one(&self.pool)
                .await?;

        let duplicate_count: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(*) FROM (
                SELECT code, domain FROM core_master_data_refs
                WHERE tenant_id = $1 AND status != 'deleted'
                GROUP BY code, domain HAVING COUNT(*) > 1
            ) t
            "#,
        )
        .bind(tenant_id)
        .fetch_one(&self.pool)
        .await?;

        let stale_threshold = Utc::now() - Duration::hours(stale_threshold_hours);
        let stale_count: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(*) FROM core_master_data_refs
            WHERE tenant_id = $1 AND status = 'active' AND last_synced_at < $2
            "#,
        )
        .bind(tenant_id)
        .bind(stale_threshold)
        .fetch_one(&self.pool)
        .await?;

        let inconsistency_count: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(*) FROM core_master_data_refs
            WHERE tenant_id = $1 AND status = 'pending_sync'
            "#,
        )
        .bind(tenant_id)
        .fetch_one(&self.pool)
        .await?;

        let mut by_domain = Vec::new();
        for domain_str in [
            "customer",
            "supplier",
            "material",
            "organization",
            "employee",
            "account_subject",
        ] {
            let d_total: i64 = sqlx::query_scalar(
                "SELECT COUNT(*) FROM core_master_data_refs WHERE tenant_id = $1 AND domain = $2 AND status != 'deleted'",
            )
            .bind(tenant_id)
            .bind(domain_str)
            .fetch_one(&self.pool)
            .await?;

            let d_active: i64 = sqlx::query_scalar(
                "SELECT COUNT(*) FROM core_master_data_refs WHERE tenant_id = $1 AND domain = $2 AND status = 'active'",
            )
            .bind(tenant_id)
            .bind(domain_str)
            .fetch_one(&self.pool)
            .await?;

            let d_dup: i64 = sqlx::query_scalar(
                r#"
                SELECT COUNT(*) FROM (
                    SELECT code FROM core_master_data_refs
                    WHERE tenant_id = $1 AND domain = $2 AND status != 'deleted'
                    GROUP BY code HAVING COUNT(*) > 1
                ) t
                "#,
            )
            .bind(tenant_id)
            .bind(domain_str)
            .fetch_one(&self.pool)
            .await?;

            let d_stale: i64 = sqlx::query_scalar(
                r#"
                SELECT COUNT(*) FROM core_master_data_refs
                WHERE tenant_id = $1 AND domain = $2 AND status = 'active' AND last_synced_at < $3
                "#,
            )
            .bind(tenant_id)
            .bind(domain_str)
            .bind(stale_threshold)
            .fetch_one(&self.pool)
            .await?;

            let d_inconsist: i64 = sqlx::query_scalar(
                "SELECT COUNT(*) FROM core_master_data_refs WHERE tenant_id = $1 AND domain = $2 AND status = 'pending_sync'",
            )
            .bind(tenant_id)
            .bind(domain_str)
            .fetch_one(&self.pool)
            .await?;

            let last_synced: Option<DateTime<Utc>> = sqlx::query_scalar(
                "SELECT MAX(last_synced_at) FROM core_master_data_refs WHERE tenant_id = $1 AND domain = $2",
            )
            .bind(tenant_id)
            .bind(domain_str)
            .fetch_optional(&self.pool)
            .await?
            .flatten();

            let score = if d_total > 0 {
                let penalty = (d_dup + d_stale + d_inconsist) as f64;
                ((d_total as f64 - penalty) / d_total as f64 * 100.0).round()
            } else {
                100.0
            };

            by_domain.push(DomainQualityDetail {
                domain: domain_str.to_string(),
                total: d_total,
                active: d_active,
                duplicates: d_dup,
                stale: d_stale,
                inconsistencies: d_inconsist,
                last_synced,
                quality_score: score,
            });
        }

        let dup_rate = if total > 0 {
            duplicate_count as f64 / total as f64 * 100.0
        } else {
            0.0
        };
        let stale_rate = if total > 0 {
            stale_count as f64 / total as f64 * 100.0
        } else {
            0.0
        };
        let incons_rate = if total > 0 {
            inconsistency_count as f64 / total as f64 * 100.0
        } else {
            0.0
        };
        let overall = (100.0 - dup_rate - stale_rate - incons_rate)
            .max(0.0)
            .round();

        Ok(QualityReport {
            tenant_id,
            generated_at: Utc::now(),
            overall_score: overall,
            total_count: total,
            duplicate_count,
            stale_count,
            inconsistency_count,
            duplicate_rate: dup_rate,
            stale_rate,
            inconsistency_rate: incons_rate,
            by_domain,
        })
    }

    /// 查询重复编码
    pub async fn list_duplicates(
        &self,
        tenant_id: Uuid,
    ) -> Result<Vec<DuplicateRecord>, sqlx::Error> {
        let rows = sqlx::query_as::<_, DuplicateRecord>(
            r#"
            SELECT domain, code, COUNT(*) as count,
                   array_agg(master_data_id) as master_data_ids
            FROM core_master_data_refs
            WHERE tenant_id = $1 AND status != 'deleted'
            GROUP BY domain, code HAVING COUNT(*) > 1
            ORDER BY count DESC
            "#,
        )
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(rows)
    }

    /// 查询过期数据
    pub async fn list_stale(
        &self,
        tenant_id: Uuid,
        threshold_hours: i64,
    ) -> Result<Vec<StaleRecord>, sqlx::Error> {
        let threshold = Utc::now() - Duration::hours(threshold_hours);
        let rows = sqlx::query_as::<_, StaleRecord>(
            r#"
            SELECT master_data_id, domain, code, name, source_service, last_synced_at,
                   EXTRACT(EPOCH FROM (NOW() - last_synced_at)) / 3600.0 as hours_since_sync
            FROM core_master_data_refs
            WHERE tenant_id = $1 AND status = 'active' AND last_synced_at < $2
            ORDER BY last_synced_at ASC
            "#,
        )
        .bind(tenant_id)
        .bind(threshold)
        .fetch_all(&self.pool)
        .await?;
        Ok(rows)
    }

    // ==================== V31.0 数据对账 ====================

    /// 执行对账检查
    pub async fn run_reconciliation(
        &self,
        tenant_id: Uuid,
    ) -> Result<ReconciliationResult, sqlx::Error> {
        let domains = vec![
            "customer",
            "supplier",
            "material",
            "organization",
            "employee",
            "account_subject",
        ];
        let mut details = Vec::new();
        let mut total_checked = 0i64;
        let mut consistent = 0i64;
        let mut inconsistent = 0i64;

        for domain in &domains {
            let source = match *domain {
                "customer" => "crm",
                "supplier" => "srm",
                "material" => "erp",
                "organization" => "hrm",
                "employee" => "hrm",
                "account_subject" => "finance",
                _ => "unknown",
            };

            let mdm_count: i64 = sqlx::query_scalar(
                "SELECT COUNT(*) FROM core_master_data_refs WHERE tenant_id = $1 AND domain = $2 AND status != 'deleted'",
            )
            .bind(tenant_id)
            .bind(domain)
            .fetch_one(&self.pool)
            .await?;

            let active_count: i64 = sqlx::query_scalar(
                "SELECT COUNT(*) FROM core_master_data_refs WHERE tenant_id = $1 AND domain = $2 AND status = 'active'",
            )
            .bind(tenant_id)
            .bind(domain)
            .fetch_one(&self.pool)
            .await?;

            let pending_count: i64 = sqlx::query_scalar(
                "SELECT COUNT(*) FROM core_master_data_refs WHERE tenant_id = $1 AND domain = $2 AND status = 'pending_sync'",
            )
            .bind(tenant_id)
            .bind(domain)
            .fetch_one(&self.pool)
            .await
            .unwrap_or(0);

            total_checked += mdm_count;
            consistent += active_count;
            inconsistent += pending_count;

            let status = if pending_count > 0 {
                "degraded"
            } else if mdm_count > 0 {
                "healthy"
            } else {
                "empty"
            };

            details.push(ReconciliationDetail {
                domain: domain.to_string(),
                source_service: source.to_string(),
                mdm_count,
                source_count: mdm_count,
                consistent: active_count,
                inconsistent: pending_count,
                status: status.to_string(),
            });

            if pending_count > 0 {
                self.record_reconciliation_issues(tenant_id, domain, pending_count)
                    .await?;
            }
        }

        Ok(ReconciliationResult {
            tenant_id,
            reconciled_at: Utc::now(),
            domains_checked: domains.iter().map(|s| s.to_string()).collect(),
            total_checked,
            consistent,
            inconsistent,
            missing_in_mdm: 0,
            missing_in_source: 0,
            details,
        })
    }

    /// 记录对账问题
    async fn record_reconciliation_issues(
        &self,
        tenant_id: Uuid,
        domain: &str,
        count: i64,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            INSERT INTO core_mdm_reconciliation_log (tenant_id, domain, master_data_id, issue_type, description, detected_at, resolved)
            SELECT $1, $2, master_data_id, 'pending_sync',
                   format('主数据 %s 在域 %s 中处于待同步状态', master_data_id, $2),
                   NOW(), false
            FROM core_master_data_refs
            WHERE tenant_id = $1 AND domain = $2 AND status = 'pending_sync'
            ON CONFLICT DO NOTHING
            "#,
        )
        .bind(tenant_id)
        .bind(domain)
        .execute(&self.pool)
        .await?;

        tracing::warn!("[MDM] 对账发现 {} 条 {} 域待同步记录", count, domain);
        Ok(())
    }

    /// 查询对账日志
    pub async fn list_reconciliation_logs(
        &self,
        tenant_id: Uuid,
        unresolved_only: bool,
        limit: i64,
    ) -> Result<Vec<ReconciliationLog>, sqlx::Error> {
        let sql = if unresolved_only {
            r#"
            SELECT id, tenant_id, domain, master_data_id, issue_type, description, detected_at, resolved, resolved_at
            FROM core_mdm_reconciliation_log
            WHERE tenant_id = $1 AND resolved = false
            ORDER BY detected_at DESC LIMIT $2
            "#
        } else {
            r#"
            SELECT id, tenant_id, domain, master_data_id, issue_type, description, detected_at, resolved, resolved_at
            FROM core_mdm_reconciliation_log
            WHERE tenant_id = $1
            ORDER BY detected_at DESC LIMIT $2
            "#
        };
        let rows = sqlx::query_as::<_, ReconciliationLog>(sql)
            .bind(tenant_id)
            .bind(limit)
            .fetch_all(&self.pool)
            .await?;
        Ok(rows)
    }

    /// 解决对账问题
    pub async fn resolve_reconciliation_issue(
        &self,
        tenant_id: Uuid,
        issue_id: Uuid,
    ) -> Result<bool, sqlx::Error> {
        let result = sqlx::query(
            r#"
            UPDATE core_mdm_reconciliation_log
            SET resolved = true, resolved_at = NOW()
            WHERE id = $1 AND tenant_id = $2 AND resolved = false
            "#,
        )
        .bind(issue_id)
        .bind(tenant_id)
        .execute(&self.pool)
        .await?;
        Ok(result.rows_affected() > 0)
    }

    // ==================== V31.0 变更审批 ====================

    /// 创建变更审批请求
    pub async fn create_approval(
        &self,
        tenant_id: Uuid,
        req: CreateApprovalRequest,
        requested_by: String,
    ) -> Result<MasterDataApproval, sqlx::Error> {
        let approval = sqlx::query_as::<_, MasterDataApproval>(
            r#"
            INSERT INTO core_mdm_approvals
                (tenant_id, master_data_id, domain, action, requested_by, requested_at, status, payload)
            VALUES ($1, $2, $3, $4, $5, NOW(), 'pending', $6)
            RETURNING id, tenant_id, master_data_id, domain, action, requested_by, requested_at,
                      status, reviewed_by, reviewed_at, review_comment, payload
            "#,
        )
        .bind(tenant_id)
        .bind(&req.master_data_id)
        .bind(&req.domain)
        .bind(&req.action)
        .bind(&requested_by)
        .bind(&req.payload)
        .fetch_one(&self.pool)
        .await?;

        tracing::info!(
            "[MDM] 变更审批请求已创建: domain={}, master_data_id={}, action={}, requested_by={}",
            req.domain,
            req.master_data_id,
            req.action,
            requested_by
        );

        Ok(approval)
    }

    /// 审批变更请求
    pub async fn review_approval(
        &self,
        tenant_id: Uuid,
        approval_id: Uuid,
        approved: bool,
        reviewer: String,
        comment: Option<String>,
    ) -> Result<MasterDataApproval, sqlx::Error> {
        let status = if approved { "approved" } else { "rejected" };

        let approval = sqlx::query_as::<_, MasterDataApproval>(
            r#"
            UPDATE core_mdm_approvals
            SET status = $1, reviewed_by = $2, reviewed_at = NOW(), review_comment = $3
            WHERE id = $4 AND tenant_id = $5 AND status = 'pending'
            RETURNING id, tenant_id, master_data_id, domain, action, requested_by, requested_at,
                      status, reviewed_by, reviewed_at, review_comment, payload
            "#,
        )
        .bind(status)
        .bind(&reviewer)
        .bind(&comment)
        .bind(approval_id)
        .bind(tenant_id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or_else(|| sqlx::Error::RowNotFound)?;

        tracing::info!(
            "[MDM] 变更审批已处理: approval_id={}, status={}, reviewer={}",
            approval_id,
            status,
            reviewer
        );

        Ok(approval)
    }

    /// 查询待审批列表
    pub async fn list_pending_approvals(
        &self,
        tenant_id: Uuid,
        domain: Option<&str>,
        limit: i64,
    ) -> Result<Vec<MasterDataApproval>, sqlx::Error> {
        let rows = if let Some(d) = domain {
            sqlx::query_as::<_, MasterDataApproval>(
                r#"
                SELECT id, tenant_id, master_data_id, domain, action, requested_by, requested_at,
                       status, reviewed_by, reviewed_at, review_comment, payload
                FROM core_mdm_approvals
                WHERE tenant_id = $1 AND status = 'pending' AND domain = $2
                ORDER BY requested_at DESC LIMIT $3
                "#,
            )
            .bind(tenant_id)
            .bind(d)
            .bind(limit)
            .fetch_all(&self.pool)
            .await?
        } else {
            sqlx::query_as::<_, MasterDataApproval>(
                r#"
                SELECT id, tenant_id, master_data_id, domain, action, requested_by, requested_at,
                       status, reviewed_by, reviewed_at, review_comment, payload
                FROM core_mdm_approvals
                WHERE tenant_id = $1 AND status = 'pending'
                ORDER BY requested_at DESC LIMIT $2
                "#,
            )
            .bind(tenant_id)
            .bind(limit)
            .fetch_all(&self.pool)
            .await?
        };
        Ok(rows)
    }

    /// 查询审批历史
    pub async fn list_approval_history(
        &self,
        tenant_id: Uuid,
        master_data_id: &str,
    ) -> Result<Vec<MasterDataApproval>, sqlx::Error> {
        let rows = sqlx::query_as::<_, MasterDataApproval>(
            r#"
            SELECT id, tenant_id, master_data_id, domain, action, requested_by, requested_at,
                   status, reviewed_by, reviewed_at, review_comment, payload
            FROM core_mdm_approvals
            WHERE tenant_id = $1 AND master_data_id = $2
            ORDER BY requested_at DESC
            "#,
        )
        .bind(tenant_id)
        .bind(master_data_id)
        .fetch_all(&self.pool)
        .await?;
        Ok(rows)
    }
}

/// 发布主数据事件到事件总线
async fn publish_master_data_event(
    ref_data: &MasterDataRef,
    action: MasterDataAction,
    operator: Option<String>,
    payload: Option<serde_json::Value>,
) -> Result<(), String> {
    let domain = match MasterDataDomain::from_str(&ref_data.domain) {
        Ok(d) => d,
        Err(_) => return Err(format!("Invalid domain: {}", ref_data.domain)),
    };

    let event_payload = payload.unwrap_or_else(|| {
        serde_json::json!({
            "master_data_id": ref_data.master_data_id,
            "code": ref_data.code,
            "name": ref_data.name,
            "status": ref_data.status,
            "version": ref_data.version,
        })
    });

    let mut event = MasterDataEvent::new(
        ref_data.tenant_id,
        domain,
        action,
        ref_data.master_data_id.clone(),
        ref_data.code.clone(),
        &ref_data.source_service,
        event_payload,
    )
    .with_version(ref_data.version);

    if let Some(op) = operator {
        event = event.with_operator(op);
    }

    // 通过事件总线发布（容错：失败仅记录日志，不影响主流程）
    let channel = event.channel();
    let event_clone = event.clone();
    tokio::spawn(async move {
        let redis_url =
            std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379".to_string());
        let client = match redis::Client::open(redis_url) {
            Ok(c) => c,
            Err(e) => {
                tracing::warn!("[MDM] Redis 连接失败: {}，事件丢弃", e);
                return;
            }
        };
        let mut conn = match client.get_multiplexed_async_connection().await {
            Ok(c) => c,
            Err(e) => {
                tracing::warn!("[MDM] Redis 复用连接失败: {}，事件丢弃", e);
                return;
            }
        };
        let event_json = match serde_json::to_string(&event_clone) {
            Ok(j) => j,
            Err(e) => {
                tracing::warn!("[MDM] 事件序列化失败: {}", e);
                return;
            }
        };
        let _: Result<i64, _> = redis::cmd("PUBLISH")
            .arg(&channel)
            .arg(&event_json)
            .query_async(&mut conn)
            .await;
    });

    Ok(())
}

// ==================== HTTP Handlers ====================

/// 创建主数据引用
pub async fn create_ref_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateMasterDataRefRequest>,
) -> Json<ApiResponse<MasterDataRef>> {
    let tenant_id = get_tenant_id(&claims);
    let operator = claims.username.clone();
    let service = MasterDataService::new(state.pool.clone());

    match service.create_ref(tenant_id, req, Some(operator)).await {
        Ok(r) => Json(ApiResponse::success(r, "主数据引用创建成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

/// 更新主数据引用
pub async fn update_ref_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(master_data_id): Path<String>,
    Json(req): Json<UpdateMasterDataRefRequest>,
) -> Json<ApiResponse<MasterDataRef>> {
    let tenant_id = get_tenant_id(&claims);
    let operator = claims.username.clone();
    let service = MasterDataService::new(state.pool.clone());

    match service
        .update_ref(tenant_id, &master_data_id, req, Some(operator))
        .await
    {
        Ok(r) => Json(ApiResponse::success(r, "主数据引用更新成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

/// 删除主数据引用
pub async fn delete_ref_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(master_data_id): Path<String>,
) -> Json<ApiResponse<bool>> {
    let tenant_id = get_tenant_id(&claims);
    let operator = claims.username.clone();
    let service = MasterDataService::new(state.pool.clone());

    match service
        .delete_ref(tenant_id, &master_data_id, Some(operator))
        .await
    {
        Ok(b) => Json(ApiResponse::success(b, "主数据引用已删除")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

/// 查询主数据引用（按 ID）
pub async fn get_ref_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(master_data_id): Path<String>,
) -> Json<ApiResponse<MasterDataRef>> {
    let tenant_id = get_tenant_id(&claims);
    let service = MasterDataService::new(state.pool.clone());

    match service.get_ref(tenant_id, &master_data_id).await {
        Ok(Some(r)) => Json(ApiResponse::success(r, "查询成功")),
        Ok(None) => Json(ApiResponse::error(404, "主数据引用不存在")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

/// 按业务编码查询
pub async fn get_ref_by_code_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((domain, code)): Path<(String, String)>,
) -> Json<ApiResponse<MasterDataRef>> {
    let tenant_id = get_tenant_id(&claims);
    let service = MasterDataService::new(state.pool.clone());

    match service.get_ref_by_code(tenant_id, &domain, &code).await {
        Ok(Some(r)) => Json(ApiResponse::success(r, "查询成功")),
        Ok(None) => Json(ApiResponse::error(404, "主数据引用不存在")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

/// 列表查询
pub async fn list_refs_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<MasterDataQuery>,
) -> Json<ApiResponse<MasterDataListResponse>> {
    let tenant_id = get_tenant_id(&claims);
    let service = MasterDataService::new(state.pool.clone());

    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).min(100);

    match service.list_refs(tenant_id, query).await {
        Ok((items, total)) => Json(ApiResponse::success(
            MasterDataListResponse {
                items,
                total,
                page,
                page_size,
            },
            "查询成功",
        )),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

/// 变更历史
pub async fn list_changes_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(master_data_id): Path<String>,
) -> Json<ApiResponse<Vec<MasterDataChangeLog>>> {
    let tenant_id = get_tenant_id(&claims);
    let service = MasterDataService::new(state.pool.clone());

    match service.list_changes(tenant_id, &master_data_id, 50).await {
        Ok(changes) => Json(ApiResponse::success(changes, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

/// 整体统计
pub async fn get_overall_stats_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<MdmOverallStats>> {
    let tenant_id = get_tenant_id(&claims);
    let service = MasterDataService::new(state.pool.clone());

    match service.get_overall_stats(tenant_id).await {
        Ok(stats) => Json(ApiResponse::success(stats, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

/// 同步状态
pub async fn get_sync_status_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<SyncStatus>>> {
    let tenant_id = get_tenant_id(&claims);
    let service = MasterDataService::new(state.pool.clone());

    match service.get_sync_status(tenant_id).await {
        Ok(status) => Json(ApiResponse::success(status, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

// ==================== V31.0 质量看板 Handlers ====================

/// 主数据质量报告
pub async fn get_quality_report_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<QualityReportQuery>,
) -> Json<ApiResponse<QualityReport>> {
    let tenant_id = get_tenant_id(&claims);
    let stale_hours = params.stale_threshold_hours.unwrap_or(24);
    let service = MasterDataService::new(state.pool.clone());

    match service.get_quality_report(tenant_id, stale_hours).await {
        Ok(report) => Json(ApiResponse::success(report, "质量报告生成成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

/// 重复编码列表
pub async fn list_duplicates_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<DuplicateRecord>>> {
    let tenant_id = get_tenant_id(&claims);
    let service = MasterDataService::new(state.pool.clone());

    match service.list_duplicates(tenant_id).await {
        Ok(dups) => Json(ApiResponse::success(dups, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

/// 过期数据列表
pub async fn list_stale_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<StaleQuery>,
) -> Json<ApiResponse<Vec<StaleRecord>>> {
    let tenant_id = get_tenant_id(&claims);
    let threshold = params.stale_threshold_hours.unwrap_or(24);
    let service = MasterDataService::new(state.pool.clone());

    match service.list_stale(tenant_id, threshold).await {
        Ok(records) => Json(ApiResponse::success(records, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

// ==================== V31.0 数据对账 Handlers ====================

/// 执行对账
pub async fn run_reconciliation_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<ReconciliationResult>> {
    let tenant_id = get_tenant_id(&claims);
    let service = MasterDataService::new(state.pool.clone());

    match service.run_reconciliation(tenant_id).await {
        Ok(result) => Json(ApiResponse::success(result, "对账完成")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

/// 对账日志列表
pub async fn list_reconciliation_logs_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ReconciliationLogQuery>,
) -> Json<ApiResponse<Vec<ReconciliationLog>>> {
    let tenant_id = get_tenant_id(&claims);
    let unresolved = params.unresolved_only.unwrap_or(false);
    let limit = params.limit.unwrap_or(50).min(200);
    let service = MasterDataService::new(state.pool.clone());

    match service
        .list_reconciliation_logs(tenant_id, unresolved, limit)
        .await
    {
        Ok(logs) => Json(ApiResponse::success(logs, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

/// 解决对账问题
pub async fn resolve_reconciliation_issue_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(issue_id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    let tenant_id = get_tenant_id(&claims);
    let service = MasterDataService::new(state.pool.clone());

    match service
        .resolve_reconciliation_issue(tenant_id, issue_id)
        .await
    {
        Ok(true) => Json(ApiResponse::success(true, "对账问题已标记为解决")),
        Ok(false) => Json(ApiResponse::error(404, "对账问题不存在或已解决")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

/// 质量报告查询参数
#[derive(Debug, Clone, Deserialize)]
pub struct QualityReportQuery {
    pub stale_threshold_hours: Option<i64>,
}

/// 过期数据查询参数
#[derive(Debug, Clone, Deserialize)]
pub struct StaleQuery {
    pub stale_threshold_hours: Option<i64>,
}

/// 对账日志查询参数
#[derive(Debug, Clone, Deserialize)]
pub struct ReconciliationLogQuery {
    pub unresolved_only: Option<bool>,
    pub limit: Option<i64>,
}

// ==================== V31.0 变更审批 Handlers ====================

/// 创建变更审批
pub async fn create_approval_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateApprovalRequest>,
) -> Json<ApiResponse<MasterDataApproval>> {
    let tenant_id = get_tenant_id(&claims);
    let requested_by = claims.username.clone();
    let service = MasterDataService::new(state.pool.clone());

    if !requires_approval(&req.domain) {
        return Json(ApiResponse::error(
            400,
            &format!("域 {} 不需要审批", req.domain),
        ));
    }

    match service.create_approval(tenant_id, req, requested_by).await {
        Ok(approval) => Json(ApiResponse::success(approval, "审批请求已创建")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

/// 审批处理
pub async fn review_approval_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(approval_id): Path<Uuid>,
    Json(req): Json<ReviewApprovalRequest>,
) -> Json<ApiResponse<MasterDataApproval>> {
    let tenant_id = get_tenant_id(&claims);
    let reviewer = claims.username.clone();
    let service = MasterDataService::new(state.pool.clone());

    match service
        .review_approval(tenant_id, approval_id, req.approved, reviewer, req.comment)
        .await
    {
        Ok(approval) => {
            let msg = if req.approved {
                "审批已通过"
            } else {
                "审批已拒绝"
            };
            Json(ApiResponse::success(approval, msg))
        }
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "审批请求不存在或已处理")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

/// 待审批列表
pub async fn list_pending_approvals_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PendingApprovalQuery>,
) -> Json<ApiResponse<Vec<MasterDataApproval>>> {
    let tenant_id = get_tenant_id(&claims);
    let limit = params.limit.unwrap_or(50).min(200);
    let service = MasterDataService::new(state.pool.clone());

    match service
        .list_pending_approvals(tenant_id, params.domain.as_deref(), limit)
        .await
    {
        Ok(approvals) => Json(ApiResponse::success(approvals, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

/// 审批历史
pub async fn list_approval_history_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(master_data_id): Path<String>,
) -> Json<ApiResponse<Vec<MasterDataApproval>>> {
    let tenant_id = get_tenant_id(&claims);
    let service = MasterDataService::new(state.pool.clone());

    match service
        .list_approval_history(tenant_id, &master_data_id)
        .await
    {
        Ok(history) => Json(ApiResponse::success(history, "查询成功")),
        Err(e) => Json(ApiResponse::error(500, &e.to_string())),
    }
}

/// 待审批查询参数
#[derive(Debug, Clone, Deserialize)]
pub struct PendingApprovalQuery {
    pub domain: Option<String>,
    pub limit: Option<i64>,
}

fn get_tenant_id(claims: &Claims) -> Uuid {
    claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .unwrap_or_default()
}

/// 初始化 MDM 数据库表
pub async fn init_mdm_tables(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_master_data_refs (
            master_data_id TEXT PRIMARY KEY,
            tenant_id UUID NOT NULL,
            domain TEXT NOT NULL,
            code TEXT NOT NULL,
            name TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'active',
            version INTEGER NOT NULL DEFAULT 1,
            source_service TEXT NOT NULL,
            last_synced_at TIMESTAMP NOT NULL DEFAULT NOW(),
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
            UNIQUE(tenant_id, domain, code)
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_mdm_refs_tenant_domain
            ON core_master_data_refs(tenant_id, domain)
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_mdm_refs_tenant_code
            ON core_master_data_refs(tenant_id, code)
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_master_data_change_log (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            master_data_id TEXT NOT NULL,
            tenant_id UUID NOT NULL,
            action TEXT NOT NULL,
            source_service TEXT NOT NULL,
            operator TEXT,
            changed_fields JSONB,
            payload JSONB,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_mdm_change_log_tenant_md
            ON core_master_data_change_log(tenant_id, master_data_id, created_at DESC)
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_master_data_event_outbox (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            event_id UUID NOT NULL,
            tenant_id UUID NOT NULL,
            domain TEXT NOT NULL,
            action TEXT NOT NULL,
            master_data_id TEXT NOT NULL,
            payload JSONB NOT NULL,
            published_at TIMESTAMP,
            retry_count INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // V31.0 对账日志表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_mdm_reconciliation_log (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            domain TEXT NOT NULL,
            master_data_id TEXT NOT NULL,
            issue_type TEXT NOT NULL,
            description TEXT,
            detected_at TIMESTAMP NOT NULL DEFAULT NOW(),
            resolved BOOLEAN NOT NULL DEFAULT false,
            resolved_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_mdm_recon_log_tenant_unresolved
            ON core_mdm_reconciliation_log(tenant_id, resolved, detected_at DESC)
        "#,
    )
    .execute(pool)
    .await?;

    // V31.0 审批表
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_mdm_approvals (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            master_data_id TEXT NOT NULL,
            domain TEXT NOT NULL,
            action TEXT NOT NULL,
            requested_by TEXT NOT NULL,
            requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
            status TEXT NOT NULL DEFAULT 'pending',
            reviewed_by TEXT,
            reviewed_at TIMESTAMP,
            review_comment TEXT,
            payload JSONB
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_mdm_approvals_tenant_pending
            ON core_mdm_approvals(tenant_id, status, requested_at DESC)
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_mdm_approvals_tenant_md
            ON core_mdm_approvals(tenant_id, master_data_id, requested_at DESC)
        "#,
    )
    .execute(pool)
    .await?;

    Ok(())
}
