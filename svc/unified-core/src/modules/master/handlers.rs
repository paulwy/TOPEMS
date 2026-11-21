//! MDM 主数据处理器
//!
//! 提供 5 大主数据域的 CRUD API 和事件发布。
//! 所有变更操作都会通过 Redis Pub/Sub 发布 MasterDataEvent。

use std::str::FromStr;
use topems_shared_core::TopemsError;

use axum::{
    extract::{Path, Query, State},
    Extension, Json,
};
use chrono::{Duration, Utc};
use serde::Deserialize;
use serde_json::Value;
use sqlx::PgPool;
use uuid::Uuid;

use crate::AppState;
use topems_shared_core::response::ApiResponse;

use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_core::id::{
    generate_master_data_id, parse_master_data_id, MasterDataDomain as IdMasterDataDomain,
};
use topems_shared_event::event::{MasterDataAction, MasterDataDomain, MasterDataEvent};

use super::models::{
    requires_approval, CreateApprovalRequest, CreateMasterDataRefRequest, DomainQualityDetail,
    DomainStats, DuplicateRecord, MasterDataApproval, MasterDataChangeLog, MasterDataListResponse,
    MasterDataQuery, MasterDataRef, MdmOverallStats, QualityReport, ReconciliationDetail,
    ReconciliationLog, ReconciliationResult, ReviewApprovalRequest, StaleRecord, SyncStatus,
    UpdateMasterDataRefRequest,
};
use topems_shared_auth::get_tenant_id_from_claims;
use topems_shared_db::audit::AuditLogService;
use topems_shared_db::master_data_refs::MasterDataRefService;
use topems_shared_db::reconciliation_log::ReconciliationLogService;
use topems_shared_db::scope::{Db, ScopedTxn};

/// V284: shared-db MasterDataRef → unified-core MasterDataRef 转换
impl From<topems_shared_db::master_data_refs::MasterDataRef> for MasterDataRef {
    fn from(m: topems_shared_db::master_data_refs::MasterDataRef) -> Self {
        Self {
            master_data_id: m.master_data_id,
            tenant_id: m.tenant_id,
            domain: m.domain,
            code: m.code,
            name: m.name,
            status: m.status,
            version: m.version,
            source_service: m.source_service,
            last_synced_at: m.last_synced_at,
            created_at: m.created_at,
            updated_at: m.updated_at,
        }
    }
}

impl From<topems_shared_db::master_data_refs::DuplicateRecord> for DuplicateRecord {
    fn from(d: topems_shared_db::master_data_refs::DuplicateRecord) -> Self {
        Self {
            domain: d.domain,
            code: d.code,
            count: d.count,
            master_data_ids: d.master_data_ids,
        }
    }
}

impl From<topems_shared_db::master_data_refs::StaleRecord> for StaleRecord {
    fn from(s: topems_shared_db::master_data_refs::StaleRecord) -> Self {
        Self {
            master_data_id: s.master_data_id,
            domain: s.domain,
            code: s.code,
            name: s.name,
            source_service: s.source_service,
            last_synced_at: s.last_synced_at,
            hours_since_sync: s.hours_since_sync,
        }
    }
}

impl From<topems_shared_db::reconciliation_log::ReconciliationLog> for ReconciliationLog {
    fn from(r: topems_shared_db::reconciliation_log::ReconciliationLog) -> Self {
        Self {
            id: r.id,
            tenant_id: r.tenant_id,
            domain: r.domain,
            master_data_id: r.master_data_id,
            issue_type: r.issue_type,
            description: r.description,
            detected_at: r.detected_at,
            resolved: r.resolved,
            resolved_at: r.resolved_at,
        }
    }
}

/// 审批动作词表
///
/// 与 core_master_data_refs 的生命周期一一对应：新建、更新、软删除。
const APPROVAL_ACTIONS: &[&str] = &["create", "update", "delete"];

/// 审批可写状态（pending_sync/deleted 由同步/删除流程负责，不允许人工通过审批写入）
const APPROVAL_WRITABLE_STATUSES: &[&str] = &["active", "inactive"];

/// 审批创建/应用错误
#[derive(Debug)]
pub enum ApprovalError {
    Validation(String),
    NotFound(String),
    Conflict(String),
    Db(sqlx::Error),
}

impl From<sqlx::Error> for ApprovalError {
    fn from(err: sqlx::Error) -> Self {
        Self::Db(err)
    }
}

/// 审批错误 → 统一错误桥接
///
/// 三类业务失败各自保留 HTTP 语义与机器可读码，避免一律 500：
/// - `Validation`（payload 非法）→ 400 `VALIDATION_FAILED`
/// - `NotFound`（审批单不存在）→ 404 `RESOURCE_NOT_FOUND`
/// - `Conflict`（已处理/并发修改）→ 409 `RESOURCE_ALREADY_EXISTS`
/// - `Db` → 500 `DATABASE_QUERY_ERROR`（细节只进服务端日志，不回传客户端）
impl From<ApprovalError> for TopemsError {
    fn from(err: ApprovalError) -> Self {
        match err {
            ApprovalError::Validation(msg) => TopemsError::ValidationFailed(msg),
            ApprovalError::NotFound(msg) => TopemsError::ResourceNotFound(msg),
            ApprovalError::Conflict(msg) => TopemsError::ResourceAlreadyExists(msg),
            ApprovalError::Db(e) => {
                tracing::error!("审批操作数据库失败: {}", e);
                TopemsError::DatabaseQuery("审批操作数据库失败".to_string())
            }
        }
    }
}

/// 校验审批 payload 与 action 的匹配关系
fn validate_approval_payload(action: &str, payload: Option<&Value>) -> Result<(), ApprovalError> {
    match action {
        "delete" => Ok(()),
        "create" => {
            let obj = payload.and_then(Value::as_object).ok_or_else(|| {
                ApprovalError::Validation("create 审批 payload 必须是对象".to_string())
            })?;
            payload_str(obj, "code")?;
            payload_str(obj, "name")?;
            payload_str(obj, "source_service")?;
            validate_writable_status(obj.get("status"))?;
            Ok(())
        }
        "update" => {
            let obj = payload.and_then(Value::as_object).ok_or_else(|| {
                ApprovalError::Validation("update 审批 payload 必须是对象".to_string())
            })?;
            let has_name = obj
                .get("name")
                .and_then(Value::as_str)
                .map(str::trim)
                .is_some_and(|v| !v.is_empty());
            let has_status = obj.get("status").and_then(Value::as_str).is_some();
            if !has_name && !has_status {
                return Err(ApprovalError::Validation(
                    "update 审批 payload 至少包含 name 或 status".to_string(),
                ));
            }
            validate_writable_status(obj.get("status"))?;
            Ok(())
        }
        _ => Err(ApprovalError::Validation(format!(
            "不支持的审批动作: {action}"
        ))),
    }
}

fn payload_str(obj: &serde_json::Map<String, Value>, key: &str) -> Result<String, ApprovalError> {
    obj.get(key)
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|v| !v.is_empty())
        .map(ToString::to_string)
        .ok_or_else(|| ApprovalError::Validation(format!("审批 payload.{key} 不能为空")))
}

fn validate_writable_status(status: Option<&Value>) -> Result<(), ApprovalError> {
    if let Some(value) = status {
        let value = value.as_str().ok_or_else(|| {
            ApprovalError::Validation("审批 payload.status 必须是字符串".to_string())
        })?;
        if !APPROVAL_WRITABLE_STATUSES.contains(&value) {
            return Err(ApprovalError::Validation(format!(
                "审批不可写入状态 {value}，仅支持 active/inactive"
            )));
        }
    }
    Ok(())
}

/// MDM 服务
///
/// V284: 注入 MasterDataRefService（下沉 32 处 core 主数据引用表内联 SQL） +
/// AuditLogService（关键写入路径审计，参考 svc/srm/services/audit.rs 模式）。
/// V285: 注入 ReconciliationLogService（下沉 INSERT...SELECT 跨表写入 + 查询 + 标记解决 SQL）。
pub struct MasterDataService {
    ref_service: MasterDataRefService,
    audit_service: AuditLogService,
    recon_service: ReconciliationLogService,
}

impl MasterDataService {
    pub fn new(pool: PgPool) -> Self {
        Self::from_db(Db::new(pool, "public, shared"))
    }

    /// 复用服务已注入的 `Db`（请求链路），避免在 handler 内重新包装裸池。
    pub fn from_db(db: Db) -> Self {
        Self {
            ref_service: MasterDataRefService::new(db.clone()),
            audit_service: AuditLogService::from_db(db.clone()),
            // 本模块 refs 权威表在 public；默认 new() 指向 master_data.* 空副本，
            // 会导致对账 INSERT...SELECT 读到 0 行、查询/标记落到另一张表。
            recon_service: ReconciliationLogService::with_tables(
                db,
                "public.core_mdm_reconciliation_log",
                "public.core_master_data_refs",
            ),
        }
    }

    /// V284: 关键写入路径审计（create/update/delete）
    async fn audit_write(
        &self,
        action: &str,
        entity_id: Option<Uuid>,
        operator: Option<&str>,
        details: Option<serde_json::Value>,
        status: &str,
        error: Option<&str>,
    ) {
        let _ = self
            .audit_service
            .log_operation(
                action,
                "master_data_ref",
                entity_id,
                operator,
                details,
                status,
                error,
            )
            .await
            .map_err(|e| tracing::warn!("[mdm-audit] 审计写入失败: {}", e));
    }

    /// 创建主数据引用
    pub async fn create_ref(
        &self,
        scope: &mut ScopedTxn<'_>,
        tenant_id: Uuid,
        req: CreateMasterDataRefRequest,
        operator: Option<String>,
    ) -> Result<MasterDataRef, sqlx::Error> {
        let domain = IdMasterDataDomain::from_str(&req.domain)
            .map_err(|_| sqlx::Error::Decode(format!("Invalid domain: {}", req.domain).into()))?;

        let master_data_id = generate_master_data_id(domain);
        let ref_data = MasterDataRef::from_request(tenant_id, &req, master_data_id.clone());

        self.ref_service
            .insert_master_data_ref_tx(
                scope,
                &ref_data.master_data_id,
                ref_data.tenant_id,
                &ref_data.domain,
                &ref_data.code,
                &ref_data.name,
                &ref_data.status,
                &ref_data.source_service,
            )
            .await?;

        // V284: 关键写入路径审计
        self.audit_write(
            "create",
            None,
            operator.as_deref(),
            req.attributes.clone(),
            "success",
            None,
        )
        .await;

        // 记录变更日志
        self.log_change(
            scope,
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
        scope: &mut ScopedTxn<'_>,
        tenant_id: Uuid,
        master_data_id: &str,
        req: UpdateMasterDataRefRequest,
        operator: Option<String>,
    ) -> Result<MasterDataRef, sqlx::Error> {
        let existing = self
            .ref_service
            .get_by_id_tx(scope, master_data_id, tenant_id)
            .await?
            .map(MasterDataRef::from)
            .ok_or(sqlx::Error::RowNotFound)?;

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

        let updated: MasterDataRef = self
            .ref_service
            .update_master_data_ref_tx(scope, master_data_id, tenant_id, &new_name, &new_status)
            .await?
            .into();

        // V284: 关键写入路径审计
        self.audit_write(
            "update",
            None,
            operator.as_deref(),
            req.attributes.clone(),
            "success",
            None,
        )
        .await;

        let action = if changed_fields.contains(&"status".to_string()) {
            if new_status == "active" {
                MasterDataAction::Activated
            } else {
                MasterDataAction::Deactivated
            }
        } else {
            MasterDataAction::Updated
        };

        self.log_change(
            scope,
            &updated,
            action,
            operator.clone(),
            req.attributes.clone(),
        )
        .await?;
        let _ = publish_master_data_event(&updated, action, operator, req.attributes).await;

        Ok(updated)
    }

    /// 删除主数据引用（软删除）
    pub async fn delete_ref(
        &self,
        scope: &mut ScopedTxn<'_>,
        tenant_id: Uuid,
        master_data_id: &str,
        operator: Option<String>,
    ) -> Result<bool, sqlx::Error> {
        let existing = self
            .ref_service
            .get_by_id_tx(scope, master_data_id, tenant_id)
            .await?
            .map(MasterDataRef::from)
            .ok_or(sqlx::Error::RowNotFound)?;

        self.ref_service
            .soft_delete_master_data_ref_tx(scope, master_data_id, tenant_id)
            .await?;

        // V284: 关键写入路径审计
        self.audit_write("delete", None, operator.as_deref(), None, "success", None)
            .await;

        let op_clone = operator.clone();
        self.log_change(scope, &existing, MasterDataAction::Deleted, operator, None)
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
        let result = self
            .ref_service
            .get_by_id(master_data_id, tenant_id)
            .await?
            .map(MasterDataRef::from);
        Ok(result)
    }

    /// 按 ID 查询（复用请求事务）
    pub async fn get_ref_in_scope(
        &self,
        scope: &mut ScopedTxn<'_>,
        tenant_id: Uuid,
        master_data_id: &str,
    ) -> Result<Option<MasterDataRef>, sqlx::Error> {
        let result = self
            .ref_service
            .get_by_id_tx(scope, master_data_id, tenant_id)
            .await?
            .map(MasterDataRef::from);
        Ok(result)
    }

    /// 按业务编码查询
    pub async fn get_ref_by_code(
        &self,
        tenant_id: Uuid,
        domain: &str,
        code: &str,
    ) -> Result<Option<MasterDataRef>, sqlx::Error> {
        let result = self
            .ref_service
            .get_by_domain_and_code(tenant_id, domain, code)
            .await?
            .map(MasterDataRef::from);
        Ok(result)
    }

    /// 按业务编码查询（复用请求事务）
    pub async fn get_ref_by_code_in_scope(
        &self,
        scope: &mut ScopedTxn<'_>,
        tenant_id: Uuid,
        domain: &str,
        code: &str,
    ) -> Result<Option<MasterDataRef>, sqlx::Error> {
        let result = self
            .ref_service
            .get_by_domain_and_code_tx(scope, tenant_id, domain, code)
            .await?
            .map(MasterDataRef::from);
        Ok(result)
    }

    /// 列表查询
    pub async fn list_refs(
        &self,
        scope: &mut ScopedTxn<'_>,
        tenant_id: Uuid,
        query: MasterDataQuery,
    ) -> Result<(Vec<MasterDataRef>, i64), sqlx::Error> {
        let page = query.page.unwrap_or(1).max(1);
        let page_size = query.page_size.unwrap_or(20).min(100);
        let offset = (page - 1) * page_size;

        let (items, total) = self
            .ref_service
            .list_by_tenant_in_scope(
                scope,
                tenant_id,
                offset,
                page_size,
                query.domain.as_deref(),
                query.code.as_deref(),
                query.name.as_deref(),
                query.status.as_deref(),
            )
            .await?;
        let items = items.into_iter().map(MasterDataRef::from).collect();
        Ok((items, total))
    }

    /// 变更历史
    pub async fn list_changes(
        &self,
        scope: &mut ScopedTxn<'_>,
        master_data_id: &str,
        limit: i64,
    ) -> Result<Vec<MasterDataChangeLog>, sqlx::Error> {
        let items = sqlx::query_as::<_, MasterDataChangeLog>(
            r#"
            SELECT id, master_data_id, tenant_id, action, source_service, operator, changed_fields, payload, created_at
            FROM public.core_master_data_change_log
            WHERE master_data_id = $1
            ORDER BY created_at DESC
            LIMIT $2
            "#,
        )
        .bind(master_data_id)
        .bind(limit)
        .fetch_all(&mut *scope)
        .await?;
        Ok(items)
    }

    /// 整体统计
    pub async fn get_overall_stats(
        &self,
        scope: &mut ScopedTxn<'_>,
        tenant_id: Uuid,
    ) -> Result<MdmOverallStats, sqlx::Error> {
        let total: i64 = self
            .ref_service
            .count_by_tenant_in_scope(scope, tenant_id)
            .await?;

        let since = Utc::now() - Duration::hours(24);
        let recent: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM public.core_master_data_change_log WHERE created_at >= $1",
        )
        .bind(since)
        .fetch_one(&mut *scope)
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
            let count: i64 = self
                .ref_service
                .count_by_domain_in_scope(scope, tenant_id, domain_str)
                .await?;

            let active: i64 = self
                .ref_service
                .count_by_domain_status_in_scope(scope, tenant_id, domain_str, "active")
                .await?;

            let last_updated = self
                .ref_service
                .get_max_updated_at_in_scope(scope, tenant_id, domain_str)
                .await?;

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
    pub async fn get_sync_status(
        &self,
        scope: &mut ScopedTxn<'_>,
        tenant_id: Uuid,
    ) -> Result<Vec<SyncStatus>, sqlx::Error> {
        let mut statuses = Vec::new();
        for (domain, source) in [
            ("customer", "crm"),
            ("supplier", "srm"),
            ("material", "erp"),
            ("organization", "hrm"),
            ("employee", "hrm"),
            ("account_subject", "finance"),
        ] {
            let last_sync = self
                .ref_service
                .get_max_last_synced_at_in_scope(scope, tenant_id, domain)
                .await?;

            let pending: i64 = self
                .ref_service
                .count_by_domain_status_in_scope(scope, tenant_id, domain, "pending_sync")
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
        scope: &mut ScopedTxn<'_>,
        ref_data: &MasterDataRef,
        action: MasterDataAction,
        operator: Option<String>,
        payload: Option<serde_json::Value>,
    ) -> Result<(), sqlx::Error> {
        let action_str = format!("{:?}", action).to_lowercase();
        sqlx::query(
            r#"
            INSERT INTO public.core_master_data_change_log
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
        .execute(&mut *scope)
        .await?;
        Ok(())
    }

    // ==================== V31.0 质量看板 ====================

    #[allow(clippy::as_conversions, clippy::cast_precision_loss)]
    /// 生成主数据质量报告
    pub async fn get_quality_report(
        &self,
        scope: &mut ScopedTxn<'_>,
        tenant_id: Uuid,
        stale_threshold_hours: i64,
    ) -> Result<QualityReport, sqlx::Error> {
        let total: i64 = self
            .ref_service
            .count_by_tenant_in_scope(scope, tenant_id)
            .await?;

        let duplicate_count: i64 = self
            .ref_service
            .count_duplicate_groups_in_scope(scope, tenant_id)
            .await?;

        let stale_threshold = Utc::now() - Duration::hours(stale_threshold_hours);
        let stale_count: i64 = self
            .ref_service
            .count_stale_total_in_scope(scope, tenant_id, stale_threshold)
            .await?;

        let inconsistency_count: i64 = self
            .ref_service
            .count_by_tenant_status_in_scope(scope, tenant_id, "pending_sync")
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
            let d_total: i64 = self
                .ref_service
                .count_by_domain_status_not_in_scope(scope, tenant_id, domain_str, "deleted")
                .await?;

            let d_active: i64 = self
                .ref_service
                .count_by_domain_status_in_scope(scope, tenant_id, domain_str, "active")
                .await?;

            let d_dup: i64 = self
                .ref_service
                .count_duplicate_groups_by_domain_in_scope(scope, tenant_id, domain_str)
                .await?;

            let d_stale: i64 = self
                .ref_service
                .count_stale_by_domain_in_scope(scope, tenant_id, domain_str, stale_threshold)
                .await?;

            let d_inconsist: i64 = self
                .ref_service
                .count_by_domain_status_in_scope(scope, tenant_id, domain_str, "pending_sync")
                .await?;

            let last_synced = self
                .ref_service
                .get_max_last_synced_at_in_scope(scope, tenant_id, domain_str)
                .await?;

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
        scope: &mut ScopedTxn<'_>,
        tenant_id: Uuid,
    ) -> Result<Vec<DuplicateRecord>, sqlx::Error> {
        let rows = self
            .ref_service
            .list_duplicates_in_scope(scope, tenant_id)
            .await?;
        Ok(rows.into_iter().map(DuplicateRecord::from).collect())
    }

    /// 查询过期数据
    pub async fn list_stale(
        &self,
        scope: &mut ScopedTxn<'_>,
        tenant_id: Uuid,
        threshold_hours: i64,
    ) -> Result<Vec<StaleRecord>, sqlx::Error> {
        let threshold = Utc::now() - Duration::hours(threshold_hours);
        let rows = self
            .ref_service
            .list_stale_in_scope(scope, tenant_id, threshold)
            .await?;
        Ok(rows.into_iter().map(StaleRecord::from).collect())
    }

    // ==================== V31.0 数据对账 ====================

    /// 执行对账检查
    pub async fn run_reconciliation(
        &self,
        scope: &mut ScopedTxn<'_>,
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

            let mdm_count: i64 = self
                .ref_service
                .count_by_domain_status_not_in_scope(scope, tenant_id, domain, "deleted")
                .await?;

            let active_count: i64 = self
                .ref_service
                .count_by_domain_status_in_scope(scope, tenant_id, domain, "active")
                .await?;

            let pending_count: i64 = self
                .ref_service
                .count_by_domain_status_in_scope(scope, tenant_id, domain, "pending_sync")
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
                checked_count: mdm_count,
                consistent: active_count,
                inconsistent: pending_count,
                status: status.to_string(),
            });

            if pending_count > 0 {
                self.record_reconciliation_issues(scope, tenant_id, domain, pending_count)
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
            details,
        })
    }

    /// 记录对账问题
    ///
    /// V285: INSERT...SELECT 跨表写下沉到 ReconciliationLogService::insert_from_master_data_refs。
    async fn record_reconciliation_issues(
        &self,
        scope: &mut ScopedTxn<'_>,
        tenant_id: Uuid,
        domain: &str,
        count: i64,
    ) -> Result<(), sqlx::Error> {
        let affected = self
            .recon_service
            .insert_from_master_data_refs_in_scope(scope, tenant_id, domain)
            .await?;

        tracing::warn!(
            "[MDM] 对账发现 {} 条 {} 域待同步记录（写入 {} 条）",
            count,
            domain,
            affected
        );
        Ok(())
    }

    /// 查询对账日志
    ///
    /// V285: SELECT SQL 下沉到 ReconciliationLogService::query_reconciliation_logs。
    pub async fn list_reconciliation_logs(
        &self,
        scope: &mut ScopedTxn<'_>,
        tenant_id: Uuid,
        unresolved_only: bool,
        limit: i64,
    ) -> Result<Vec<ReconciliationLog>, sqlx::Error> {
        let rows = self
            .recon_service
            .query_reconciliation_logs_in_scope(scope, tenant_id, unresolved_only, limit)
            .await?;
        Ok(rows.into_iter().map(Into::into).collect())
    }

    /// 解决对账问题
    ///
    /// V285: UPDATE SQL 下沉到 ReconciliationLogService::resolve_reconciliation_issue。
    pub async fn resolve_reconciliation_issue(
        &self,
        tenant_id: Uuid,
        issue_id: Uuid,
    ) -> Result<bool, sqlx::Error> {
        self.recon_service
            .resolve_reconciliation_issue(tenant_id, issue_id)
            .await
    }

    /// 在请求事务内标记对账问题已解决；提交由 `tenant_middleware` 统一处理。
    pub async fn resolve_reconciliation_issue_in_scope(
        &self,
        scope: &mut ScopedTxn<'_>,
        tenant_id: Uuid,
        issue_id: Uuid,
    ) -> Result<bool, sqlx::Error> {
        self.recon_service
            .resolve_reconciliation_issue_in_scope(scope, tenant_id, issue_id)
            .await
    }

    // ==================== V31.0 变更审批 ====================

    /// 创建变更审批请求
    ///
    /// action 词表：create / update / delete；payload 只允许承载 refs 可写列
    /// （code/name/status/source_service），不接受 attributes 等未落库字段。
    pub async fn create_approval(
        &self,
        scope: &mut ScopedTxn<'_>,
        tenant_id: Uuid,
        req: CreateApprovalRequest,
        requested_by: String,
    ) -> Result<MasterDataApproval, ApprovalError> {
        let action = req.action.trim().to_ascii_lowercase();
        if !APPROVAL_ACTIONS.contains(&action.as_str()) {
            return Err(ApprovalError::Validation(format!(
                "不支持的审批动作 {}，仅支持 create/update/delete",
                req.action
            )));
        }

        let domain = IdMasterDataDomain::from_str(req.domain.trim())
            .map_err(|_| ApprovalError::Validation(format!("无效的主数据域: {}", req.domain)))?;

        validate_approval_payload(&action, req.payload.as_ref())?;

        let raw_id = req.master_data_id.trim();
        let master_data_id = if raw_id.is_empty() {
            if action != "create" {
                return Err(ApprovalError::Validation(
                    "update/delete 审批必须提供 master_data_id".to_string(),
                ));
            }
            generate_master_data_id(domain)
        } else {
            let Some((id_domain, _)) = parse_master_data_id(raw_id) else {
                return Err(ApprovalError::Validation(format!(
                    "master_data_id 格式非法: {raw_id}"
                )));
            };
            if id_domain != domain {
                return Err(ApprovalError::Validation(
                    "master_data_id 前缀与 domain 不一致".to_string(),
                ));
            }
            raw_id.to_string()
        };

        let approval = sqlx::query_as::<_, MasterDataApproval>(
            r#"
            INSERT INTO public.core_mdm_approvals
                (tenant_id, master_data_id, domain, action, requested_by, requested_at, status, payload)
            VALUES ($1, $2, $3, $4, $5, NOW(), 'pending', $6)
            RETURNING id, tenant_id, master_data_id, domain, action, requested_by, requested_at,
                      status, reviewed_by, reviewed_at, review_comment, payload
            "#,
        )
        .bind(tenant_id)
        .bind(&master_data_id)
        .bind(&req.domain)
        .bind(&action)
        .bind(&requested_by)
        .bind(&req.payload)
        .fetch_one(&mut *scope)
        .await?;

        tracing::info!(
            "[MDM] 变更审批请求已创建: domain={}, master_data_id={}, action={}, requested_by={}",
            req.domain,
            master_data_id,
            action,
            requested_by
        );

        Ok(approval)
    }

    /// 审批变更请求
    ///
    /// approved=true 时在同一事务内先应用变更到 core_master_data_refs，
    /// 再更新审批状态；任一步失败整体回滚，审批单保持 pending。
    pub async fn review_approval(
        &self,
        scope: &mut ScopedTxn<'_>,
        tenant_id: Uuid,
        approval_id: Uuid,
        approved: bool,
        reviewer: String,
        comment: Option<String>,
    ) -> Result<MasterDataApproval, ApprovalError> {
        let current = sqlx::query_as::<_, MasterDataApproval>(
            r#"
            SELECT id, tenant_id, master_data_id, domain, action, requested_by, requested_at,
                   status, reviewed_by, reviewed_at, review_comment, payload
            FROM public.core_mdm_approvals
            WHERE id = $1 AND tenant_id = $2
            FOR UPDATE
            "#,
        )
        .bind(approval_id)
        .bind(tenant_id)
        .fetch_optional(&mut *scope)
        .await?
        .ok_or_else(|| ApprovalError::NotFound("审批请求不存在".to_string()))?;

        if current.status != "pending" {
            return Err(ApprovalError::Conflict(format!(
                "审批请求当前状态为 {}，不可重复处理",
                current.status
            )));
        }

        if approved {
            self.apply_approval(scope, &current, &reviewer).await?;
        }

        let status = if approved { "approved" } else { "rejected" };
        let approval = sqlx::query_as::<_, MasterDataApproval>(
            r#"
            UPDATE public.core_mdm_approvals
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
        .fetch_optional(&mut *scope)
        .await?
        .ok_or_else(|| ApprovalError::Conflict("审批请求状态已被并发修改".to_string()))?;

        tracing::info!(
            "[MDM] 变更审批已处理: approval_id={}, status={}, reviewer={}",
            approval_id,
            status,
            reviewer
        );

        Ok(approval)
    }

    /// 把审批 payload 应用到 refs（仅 approved 分支调用）
    async fn apply_approval(
        &self,
        scope: &mut ScopedTxn<'_>,
        approval: &MasterDataApproval,
        operator: &str,
    ) -> Result<(), ApprovalError> {
        let payload = approval.payload.as_ref();
        let tenant_id = approval.tenant_id;

        match approval.action.as_str() {
            "create" => {
                let obj = payload.and_then(Value::as_object).ok_or_else(|| {
                    ApprovalError::Validation("create 审批 payload 必须是对象".to_string())
                })?;
                let code = payload_str(obj, "code")?;
                let name = payload_str(obj, "name")?;
                let source_service = payload_str(obj, "source_service")?;
                let status = obj
                    .get("status")
                    .and_then(Value::as_str)
                    .unwrap_or("active");

                self.ref_service
                    .insert_master_data_ref_tx(
                        scope,
                        &approval.master_data_id,
                        tenant_id,
                        &approval.domain,
                        &code,
                        &name,
                        status,
                        &source_service,
                    )
                    .await
                    .map_err(|err| {
                        if err
                            .as_database_error()
                            .is_some_and(|db| db.is_unique_violation())
                        {
                            ApprovalError::Conflict(format!(
                                "主数据引用已存在: {}",
                                approval.master_data_id
                            ))
                        } else {
                            ApprovalError::Db(err)
                        }
                    })?;

                let created: MasterDataRef = self
                    .ref_service
                    .get_by_id_tx(scope, &approval.master_data_id, tenant_id)
                    .await?
                    .map(MasterDataRef::from)
                    .ok_or_else(|| ApprovalError::NotFound("主数据引用写入后不可见".to_string()))?;

                self.audit_write(
                    "approval_create",
                    Some(approval.id),
                    Some(operator),
                    approval.payload.clone(),
                    "success",
                    None,
                )
                .await;
                self.log_change(
                    scope,
                    &created,
                    MasterDataAction::Created,
                    Some(operator.to_string()),
                    approval.payload.clone(),
                )
                .await?;
                let _ = publish_master_data_event(
                    &created,
                    MasterDataAction::Created,
                    Some(operator.to_string()),
                    approval.payload.clone(),
                )
                .await;
            }
            "update" => {
                let existing: MasterDataRef = self
                    .ref_service
                    .get_by_id_tx(scope, &approval.master_data_id, tenant_id)
                    .await?
                    .map(MasterDataRef::from)
                    .ok_or_else(|| {
                        ApprovalError::NotFound(format!(
                            "主数据引用不存在: {}",
                            approval.master_data_id
                        ))
                    })?;

                let obj = payload.and_then(Value::as_object);
                let new_name = obj
                    .and_then(|o| o.get("name"))
                    .and_then(Value::as_str)
                    .map(str::trim)
                    .filter(|v| !v.is_empty())
                    .unwrap_or(&existing.name)
                    .to_string();
                let new_status = obj
                    .and_then(|o| o.get("status"))
                    .and_then(Value::as_str)
                    .unwrap_or(&existing.status)
                    .to_string();

                let updated: MasterDataRef = self
                    .ref_service
                    .update_master_data_ref_tx(
                        scope,
                        &approval.master_data_id,
                        tenant_id,
                        &new_name,
                        &new_status,
                    )
                    .await?
                    .into();

                let action = if updated.status != existing.status {
                    if updated.status == "active" {
                        MasterDataAction::Activated
                    } else {
                        MasterDataAction::Deactivated
                    }
                } else {
                    MasterDataAction::Updated
                };

                self.audit_write(
                    "approval_update",
                    Some(approval.id),
                    Some(operator),
                    approval.payload.clone(),
                    "success",
                    None,
                )
                .await;
                self.log_change(
                    scope,
                    &updated,
                    action,
                    Some(operator.to_string()),
                    approval.payload.clone(),
                )
                .await?;
                let _ = publish_master_data_event(
                    &updated,
                    action,
                    Some(operator.to_string()),
                    approval.payload.clone(),
                )
                .await;
            }
            "delete" => {
                let existing: MasterDataRef = self
                    .ref_service
                    .get_by_id_tx(scope, &approval.master_data_id, tenant_id)
                    .await?
                    .map(MasterDataRef::from)
                    .ok_or_else(|| {
                        ApprovalError::NotFound(format!(
                            "主数据引用不存在: {}",
                            approval.master_data_id
                        ))
                    })?;

                self.ref_service
                    .soft_delete_master_data_ref_tx(scope, &approval.master_data_id, tenant_id)
                    .await?;

                self.audit_write(
                    "approval_delete",
                    Some(approval.id),
                    Some(operator),
                    approval.payload.clone(),
                    "success",
                    None,
                )
                .await;
                self.log_change(
                    scope,
                    &existing,
                    MasterDataAction::Deleted,
                    Some(operator.to_string()),
                    approval.payload.clone(),
                )
                .await?;
                let _ = publish_master_data_event(
                    &existing,
                    MasterDataAction::Deleted,
                    Some(operator.to_string()),
                    approval.payload.clone(),
                )
                .await;
            }
            other => {
                return Err(ApprovalError::Validation(format!(
                    "不支持的审批动作: {other}"
                )));
            }
        }

        Ok(())
    }

    /// 查询待审批列表
    pub async fn list_pending_approvals(
        &self,
        scope: &mut ScopedTxn<'_>,
        domain: Option<&str>,
        limit: i64,
    ) -> Result<Vec<MasterDataApproval>, sqlx::Error> {
        let rows = if let Some(d) = domain {
            sqlx::query_as::<_, MasterDataApproval>(
                r#"
                SELECT id, tenant_id, master_data_id, domain, action, requested_by, requested_at,
                       status, reviewed_by, reviewed_at, review_comment, payload
                FROM public.core_mdm_approvals
                WHERE status = 'pending' AND domain = $1
                ORDER BY requested_at DESC LIMIT $2
                "#,
            )
            .bind(d)
            .bind(limit)
            .fetch_all(&mut *scope)
            .await?
        } else {
            sqlx::query_as::<_, MasterDataApproval>(
                r#"
                SELECT id, tenant_id, master_data_id, domain, action, requested_by, requested_at,
                       status, reviewed_by, reviewed_at, review_comment, payload
                FROM public.core_mdm_approvals
                WHERE status = 'pending'
                ORDER BY requested_at DESC LIMIT $1
                "#,
            )
            .bind(limit)
            .fetch_all(&mut *scope)
            .await?
        };
        Ok(rows)
    }

    /// 查询审批历史
    pub async fn list_approval_history(
        &self,
        scope: &mut ScopedTxn<'_>,
        master_data_id: &str,
    ) -> Result<Vec<MasterDataApproval>, sqlx::Error> {
        let rows = sqlx::query_as::<_, MasterDataApproval>(
            r#"
            SELECT id, tenant_id, master_data_id, domain, action, requested_by, requested_at,
                   status, reviewed_by, reviewed_at, review_comment, payload
            FROM public.core_mdm_approvals
            WHERE master_data_id = $1
            ORDER BY requested_at DESC
            "#,
        )
        .bind(master_data_id)
        .fetch_all(&mut *scope)
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
) -> Result<(), TopemsError> {
    let domain = match MasterDataDomain::from_str(&ref_data.domain) {
        Ok(d) => d,
        Err(_) => {
            return Err(TopemsError::ValidationFailed(format!(
                "Invalid domain: {}",
                ref_data.domain
            )))
        }
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

    // 总线写路径（对齐 pdm mdm_event_service.rs）：
    // Redis Stream XADD（持久化 + 消费组 ACK）+ RabbitMQ Topic 发布。
    // 失败显式 warn（不再静默"事件丢弃"）；不重建 outbox 死表（Redis Stream 即持久化通道）。
    if let Err(e) = event.publish().await {
        tracing::warn!("[MDM] 主数据事件 Redis Stream 发布失败: {}", e);
    }
    if let Err(e) = event.publish_to_rabbitmq().await {
        tracing::warn!("[MDM] 主数据事件 RabbitMQ 发布失败: {}", e);
    }

    Ok(())
}

// ==================== HTTP Handlers ====================

/// 创建主数据引用
pub async fn create_ref_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateMasterDataRefRequest>,
) -> ApiResponse<MasterDataRef> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let operator = claims.username.clone();
    let service = MasterDataService::from_db(state.db.clone());
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化主数据创建事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化主数据创建事务作用域失败".to_string(),
            ));
        }
    };

    match service
        .create_ref(&mut scope, tenant_id, req, Some(operator))
        .await
    {
        Ok(r) => ApiResponse::success(r, "主数据引用创建成功"),
        Err(e) => ApiResponse::from(TopemsError::internal("create_ref_handler", e)),
    }
}

/// 更新主数据引用
pub async fn update_ref_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(master_data_id): Path<String>,
    Json(req): Json<UpdateMasterDataRefRequest>,
) -> ApiResponse<MasterDataRef> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let operator = claims.username.clone();
    let service = MasterDataService::from_db(state.db.clone());
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化主数据更新事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化主数据更新事务作用域失败".to_string(),
            ));
        }
    };

    match service
        .update_ref(&mut scope, tenant_id, &master_data_id, req, Some(operator))
        .await
    {
        Ok(r) => ApiResponse::success(r, "主数据引用更新成功"),
        Err(e) => ApiResponse::from(TopemsError::internal("update_ref_handler", e)),
    }
}

/// 删除主数据引用
pub async fn delete_ref_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(master_data_id): Path<String>,
) -> ApiResponse<bool> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let operator = claims.username.clone();
    let service = MasterDataService::from_db(state.db.clone());
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化主数据删除事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化主数据删除事务作用域失败".to_string(),
            ));
        }
    };

    match service
        .delete_ref(&mut scope, tenant_id, &master_data_id, Some(operator))
        .await
    {
        Ok(b) => ApiResponse::success(b, "主数据引用已删除"),
        Err(e) => ApiResponse::from(TopemsError::internal("delete_ref_handler", e)),
    }
}

/// 查询主数据引用（按 ID）
pub async fn get_ref_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(master_data_id): Path<String>,
) -> ApiResponse<MasterDataRef> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let service = MasterDataService::from_db(state.db.clone());

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::error(500, "数据库事务上下文缺失");
    };
    let scope = if tenant_id.is_nil() {
        state.db.scope_with_system(txn).await
    } else {
        state.db.scope_with(txn).await
    };
    let mut scope = match scope {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化主数据查询事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::internal("get_ref_handler", e));
        }
    };

    match service
        .get_ref_in_scope(&mut scope, tenant_id, &master_data_id)
        .await
    {
        Ok(Some(r)) => ApiResponse::success(r, "查询成功"),
        Ok(None) => ApiResponse::not_found("主数据引用不存在"),
        Err(e) => ApiResponse::from(TopemsError::internal("get_ref_handler", e)),
    }
}

/// 按业务编码查询
pub async fn get_ref_by_code_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path((domain, code)): Path<(String, String)>,
) -> ApiResponse<MasterDataRef> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let service = MasterDataService::from_db(state.db.clone());

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::error(500, "数据库事务上下文缺失");
    };
    let scope = if tenant_id.is_nil() {
        state.db.scope_with_system(txn).await
    } else {
        state.db.scope_with(txn).await
    };
    let mut scope = match scope {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化主数据查询事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::internal("get_ref_by_code_handler", e));
        }
    };

    match service
        .get_ref_by_code_in_scope(&mut scope, tenant_id, &domain, &code)
        .await
    {
        Ok(Some(r)) => ApiResponse::success(r, "查询成功"),
        Ok(None) => ApiResponse::not_found("主数据引用不存在"),
        Err(e) => ApiResponse::from(TopemsError::internal("get_ref_by_code_handler", e)),
    }
}

/// 列表查询
pub async fn list_refs_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(query): Query<MasterDataQuery>,
) -> ApiResponse<MasterDataListResponse> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let service = MasterDataService::from_db(state.db.clone());

    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).min(100);

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化主数据列表事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化主数据列表事务作用域失败".to_string(),
            ));
        }
    };

    match service.list_refs(&mut scope, tenant_id, query).await {
        Ok((items, total)) => ApiResponse::success(
            MasterDataListResponse {
                items,
                total,
                page,
                page_size,
            },
            "查询成功",
        ),
        Err(e) => ApiResponse::from(TopemsError::internal("list_refs_handler", e)),
    }
}

/// 变更历史
pub async fn list_changes_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(master_data_id): Path<String>,
) -> ApiResponse<Vec<MasterDataChangeLog>> {
    let service = MasterDataService::from_db(state.db.clone());
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化主数据变更历史事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化主数据变更历史事务作用域失败".to_string(),
            ));
        }
    };

    match service.list_changes(&mut scope, &master_data_id, 50).await {
        Ok(changes) => ApiResponse::success(changes, "查询成功"),
        Err(e) => ApiResponse::from(TopemsError::internal("list_changes_handler", e)),
    }
}

/// 整体统计
pub async fn get_overall_stats_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<MdmOverallStats> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let service = MasterDataService::from_db(state.db.clone());
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化主数据统计事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化主数据统计事务作用域失败".to_string(),
            ));
        }
    };

    match service.get_overall_stats(&mut scope, tenant_id).await {
        Ok(stats) => ApiResponse::success(stats, "查询成功"),
        Err(e) => ApiResponse::from(TopemsError::internal("get_overall_stats_handler", e)),
    }
}

/// 同步状态
pub async fn get_sync_status_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<Vec<SyncStatus>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let service = MasterDataService::from_db(state.db.clone());
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化主数据同步状态事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化主数据同步状态事务作用域失败".to_string(),
            ));
        }
    };

    match service.get_sync_status(&mut scope, tenant_id).await {
        Ok(status) => ApiResponse::success(status, "查询成功"),
        Err(e) => ApiResponse::from(TopemsError::internal("get_sync_status_handler", e)),
    }
}

// ==================== V31.0 质量看板 Handlers ====================

/// 主数据质量报告
pub async fn get_quality_report_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(params): Query<QualityReportQuery>,
) -> ApiResponse<QualityReport> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let stale_hours = params.stale_threshold_hours.unwrap_or(24);
    let service = MasterDataService::from_db(state.db.clone());
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化主数据质量报告事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化主数据质量报告事务作用域失败".to_string(),
            ));
        }
    };

    match service
        .get_quality_report(&mut scope, tenant_id, stale_hours)
        .await
    {
        Ok(report) => ApiResponse::success(report, "质量报告生成成功"),
        Err(e) => ApiResponse::from(TopemsError::internal("get_quality_report_handler", e)),
    }
}

/// 重复编码列表
pub async fn list_duplicates_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<Vec<DuplicateRecord>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let service = MasterDataService::from_db(state.db.clone());
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化主数据重复编码事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化主数据重复编码事务作用域失败".to_string(),
            ));
        }
    };

    match service.list_duplicates(&mut scope, tenant_id).await {
        Ok(dups) => ApiResponse::success(dups, "查询成功"),
        Err(e) => ApiResponse::from(TopemsError::internal("list_duplicates_handler", e)),
    }
}

/// 过期数据列表
pub async fn list_stale_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(params): Query<StaleQuery>,
) -> ApiResponse<Vec<StaleRecord>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let threshold = params.stale_threshold_hours.unwrap_or(24);
    let service = MasterDataService::from_db(state.db.clone());
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化主数据过期数据事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化主数据过期数据事务作用域失败".to_string(),
            ));
        }
    };

    match service.list_stale(&mut scope, tenant_id, threshold).await {
        Ok(records) => ApiResponse::success(records, "查询成功"),
        Err(e) => ApiResponse::from(TopemsError::internal("list_stale_handler", e)),
    }
}

// ==================== V31.0 数据对账 Handlers ====================

/// 执行对账
pub async fn run_reconciliation_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<ReconciliationResult> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let service = MasterDataService::from_db(state.db.clone());
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化主数据对账事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化主数据对账事务作用域失败".to_string(),
            ));
        }
    };

    match service.run_reconciliation(&mut scope, tenant_id).await {
        Ok(result) => ApiResponse::success(result, "对账完成"),
        Err(e) => ApiResponse::from(TopemsError::internal("run_reconciliation_handler", e)),
    }
}

/// 对账日志列表
pub async fn list_reconciliation_logs_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(params): Query<ReconciliationLogQuery>,
) -> ApiResponse<Vec<ReconciliationLog>> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let unresolved = params.unresolved_only.unwrap_or(false);
    let limit = params.limit.unwrap_or(50).min(200);
    let service = MasterDataService::from_db(state.db.clone());
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化主数据对账日志事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化主数据对账日志事务作用域失败".to_string(),
            ));
        }
    };

    match service
        .list_reconciliation_logs(&mut scope, tenant_id, unresolved, limit)
        .await
    {
        Ok(logs) => ApiResponse::success(logs, "查询成功"),
        Err(e) => ApiResponse::from(TopemsError::internal("list_reconciliation_logs_handler", e)),
    }
}

/// 解决对账问题
pub async fn resolve_reconciliation_issue_handler(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(issue_id): Path<Uuid>,
) -> ApiResponse<bool> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let service = MasterDataService::from_db(state.db.clone());

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::error(500, "数据库事务上下文缺失");
    };
    let scope = if tenant_id.is_nil() {
        state.db.scope_with_system(txn).await
    } else {
        state.db.scope_with(txn).await
    };
    let mut scope = match scope {
        Ok(scope) => scope,
        Err(e) => {
            return ApiResponse::from(TopemsError::internal(
                "resolve_reconciliation_issue_handler",
                e,
            ));
        }
    };

    match service
        .resolve_reconciliation_issue_in_scope(&mut scope, tenant_id, issue_id)
        .await
    {
        Ok(true) => ApiResponse::success(true, "对账问题已标记为解决"),
        Ok(false) => ApiResponse::not_found("对账问题不存在或已解决"),
        Err(e) => ApiResponse::from(TopemsError::internal(
            "resolve_reconciliation_issue_handler",
            e,
        )),
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
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateApprovalRequest>,
) -> ApiResponse<MasterDataApproval> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let requested_by = claims.username.clone();
    let service = MasterDataService::from_db(state.db.clone());

    if !requires_approval(&req.domain) {
        return ApiResponse::bad_request(&format!("域 {} 不需要审批", req.domain));
    }

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化主数据审批创建事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化主数据审批创建事务作用域失败".to_string(),
            ));
        }
    };

    match service
        .create_approval(&mut scope, tenant_id, req, requested_by)
        .await
    {
        Ok(approval) => ApiResponse::success(approval, "审批请求已创建"),
        Err(ApprovalError::Validation(msg)) => ApiResponse::bad_request(&msg),
        Err(ApprovalError::NotFound(msg)) => ApiResponse::not_found(&msg),
        Err(ApprovalError::Conflict(msg)) => ApiResponse::conflict(&msg),
        Err(ApprovalError::Db(e)) => {
            ApiResponse::from(TopemsError::internal("create_approval_handler", e))
        }
    }
}

/// 审批处理
pub async fn review_approval_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(approval_id): Path<Uuid>,
    Json(req): Json<ReviewApprovalRequest>,
) -> ApiResponse<MasterDataApproval> {
    let tenant_id = get_tenant_id_from_claims(&claims);
    let reviewer = claims.username.clone();
    let service = MasterDataService::from_db(state.db.clone());
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化主数据审批处理事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化主数据审批处理事务作用域失败".to_string(),
            ));
        }
    };

    match service
        .review_approval(
            &mut scope,
            tenant_id,
            approval_id,
            req.approved,
            reviewer,
            req.comment,
        )
        .await
    {
        Ok(approval) => {
            let msg = if req.approved {
                "审批已通过"
            } else {
                "审批已拒绝"
            };
            ApiResponse::success(approval, msg)
        }
        Err(ApprovalError::Validation(msg)) => ApiResponse::bad_request(&msg),
        Err(ApprovalError::NotFound(msg)) => ApiResponse::not_found(&msg),
        Err(ApprovalError::Conflict(msg)) => ApiResponse::conflict(&msg),
        Err(ApprovalError::Db(e)) => {
            ApiResponse::from(TopemsError::internal("review_approval_handler", e))
        }
    }
}

/// 待审批列表
pub async fn list_pending_approvals_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(params): Query<PendingApprovalQuery>,
) -> ApiResponse<Vec<MasterDataApproval>> {
    let limit = params.limit.unwrap_or(50).min(200);
    let service = MasterDataService::from_db(state.db.clone());
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化主数据待审批列表事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化主数据待审批列表事务作用域失败".to_string(),
            ));
        }
    };

    match service
        .list_pending_approvals(&mut scope, params.domain.as_deref(), limit)
        .await
    {
        Ok(approvals) => ApiResponse::success(approvals, "查询成功"),
        Err(e) => ApiResponse::from(TopemsError::internal("list_pending_approvals_handler", e)),
    }
}

/// 审批历史
pub async fn list_approval_history_handler(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(master_data_id): Path<String>,
) -> ApiResponse<Vec<MasterDataApproval>> {
    let service = MasterDataService::from_db(state.db.clone());
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化主数据审批历史事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化主数据审批历史事务作用域失败".to_string(),
            ));
        }
    };

    match service
        .list_approval_history(&mut scope, &master_data_id)
        .await
    {
        Ok(history) => ApiResponse::success(history, "查询成功"),
        Err(e) => ApiResponse::from(TopemsError::internal("list_approval_history_handler", e)),
    }
}

/// 待审批查询参数
#[derive(Debug, Clone, Deserialize)]
pub struct PendingApprovalQuery {
    pub domain: Option<String>,
    pub limit: Option<i64>,
}

// 4.6：core_master_data_event_outbox 死表已 DROP（Redis Stream + commit_retry 接管补偿），
// 不允许任何运行时逻辑重建该表（原 init_mdm_tables 建表逻辑已随 C-1 移除，迁移权威唯一仲裁）。
