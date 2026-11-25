//! Settlement Center - 业务逻辑层
//!
//! V256 事件驱动重构：
//! - 对账数据：从 plugin_finance.reconciliation_snapshots 本地快照读取
//! - 结算数据：从 plugin_finance.settlement_snapshots 本地快照读取
//! - 关联查询：读写 plugin_finance.reconciliation_settlement_links
//! - 写入路径：写本地快照 + 发布事件（ERP/PM 通过事件订阅接收数据）
//! - Finance 不再跨 schema 访问 erp.* 或 pm.* 表
//! - ERP 订阅 ReconciliationCreated/Approved/Updated 事件
//! - PM 订阅 SettlementCreated/Approved 事件

use rust_decimal::prelude::FromPrimitive;
use rust_decimal::Decimal;
use std::sync::Arc;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_db::scope::Db;
use topems_shared_event::event::commit_retry;
use topems_shared_event::{EventPublisher, EventType};
use uuid::Uuid;

use super::models::*;

/// 把事件发布推迟到请求事务提交后执行（K13 试点）。
///
/// 请求上下文内：动作入队，由 `tenant_middleware` 在事务提交成功后 flush；
/// 事务回滚/非 2xx 时队列被丢弃，事件不会发出。
/// 无请求上下文（后台任务/CLI 直调 service）：保持原有「立即发布」语义。
async fn publish_after_commit<P>(publisher: &Arc<EventPublisher>, event: EventType, payload: P)
where
    P: Clone + serde::Serialize + Send + Sync + 'static,
{
    let queued_publisher = Arc::clone(publisher);
    let queued_payload = payload.clone();
    let queued = topems_shared_auth::middleware::tenant::defer_post_commit(Box::new(move || {
        let publisher = Arc::clone(&queued_publisher);
        Box::pin(async move {
            publish_or_retry(&publisher, event, &queued_payload).await;
        })
    }));
    if !queued {
        publish_or_retry(publisher, event, &payload).await;
    }
}

/// 发布事件；失败沿用既有 ZSET 重试队列，不引入新的重试机制。
async fn publish_or_retry<P>(publisher: &EventPublisher, event: EventType, payload: &P)
where
    P: serde::Serialize,
{
    if let Err(e) = publisher.publish_event(event, payload).await {
        tracing::warn!(
            "[SettlementCenter] 发布 {:?} 失败: {}，入重试队列",
            event,
            e
        );
        commit_retry::push_retry_typed("finance", event, payload).await;
    }
}

/// 从本地快照查询对账列表（替代跨 schema 直查 erp.fin_reconciliations）
pub async fn list_reconciliations(
    db: &Db,
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    _tenant_id: Uuid,
    query: &ReconciliationListQuery,
) -> Result<Vec<UnifiedReconciliation>, sqlx::Error> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;
    let search_like = query.search.as_ref().map(|s| format!("%{}%", s));
    // 状态过滤已由 handler 校验（非法值 400）；这里只把空串/all 归一为不过滤。
    let recon_status =
        crate::modules::finance_snapshot_status::ReconciliationSnapshotStatus::parse_filter(
            query.status.as_deref(),
        )
        .ok()
        .flatten()
        .map(|s| s.as_db_str());

    let mut scope = db.scope_with(txn).await?;

    let items: Vec<UnifiedReconciliation> = sqlx::query_as(only_own_schema_query!(
        "finance",
        r#"SELECT id, recon_code, recon_name, recon_type, status, period,
                  entity_id, entity_type, total_debit, total_credit, difference,
                  matched_count, unmatched_count, description, created_by,
                  approved_by, approved_at, created_at, updated_at
           FROM finance.reconciliation_snapshots
             WHERE ($1::text IS NULL OR status = $1)
             AND ($2::text IS NULL OR recon_type = $2)
             AND ($3::text IS NULL OR period = $3)
             AND ($4::text IS NULL OR recon_name ILIKE $4)
           ORDER BY created_at DESC
           LIMIT $5 OFFSET $6"#
    ))
    .bind(recon_status)
    .bind(&query.recon_type)
    .bind(&query.period)
    .bind(&search_like)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut scope)
    .await?;

    Ok(items)
}

/// 查询单个对账详情（含关联结算列表，从本地快照读取）
pub async fn get_reconciliation_detail(
    db: &Db,
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    _tenant_id: Uuid,
    recon_id: Uuid,
) -> Result<Option<ReconciliationDetail>, sqlx::Error> {
    let mut scope = db.scope_with(txn).await?;
    let recon: Option<UnifiedReconciliation> = sqlx::query_as(only_own_schema_query!(
        "finance",
        r#"SELECT id, recon_code, recon_name, recon_type, status, period,
                  entity_id, entity_type, total_debit, total_credit, difference,
                  matched_count, unmatched_count, description, created_by,
                  approved_by, approved_at, created_at, updated_at
           FROM finance.reconciliation_snapshots
           WHERE id = $1"#
    ))
    .bind(recon_id)
    .fetch_optional(&mut scope)
    .await?;

    let Some(reconciliation) = recon else {
        return Ok(None);
    };

    let linked: Vec<LinkedSettlementSummary> = sqlx::query_as(only_own_schema_query!(
        "finance",
        r#"SELECT l.id AS link_id, l.link_type, l.amount AS link_amount, l.status AS link_status,
                  s.id AS settlement_id, s.settlement_no AS settlement_code,
                  s.settlement_no AS settlement_name,
                  s.settlement_type, s.status AS settlement_status,
                  s.amount AS settlement_amount
           FROM finance.reconciliation_settlement_links l
           JOIN finance.settlement_snapshots s ON s.id = l.settlement_id
           WHERE l.reconciliation_id = $1
             AND l.status != $2"#
    ))
    .bind(recon_id)
    .bind(crate::modules::settlement_center_status::SettlementLinkStatus::Cancelled.as_str())
    .fetch_all(&mut scope)
    .await?;

    Ok(Some(ReconciliationDetail {
        reconciliation,
        linked_settlements: linked,
    }))
}

/// 创建对账单：写本地快照 + 发布事件（ERP 通过事件订阅接收数据）
pub async fn create_reconciliation(
    db: &Db,
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    event_publisher: Option<&Arc<EventPublisher>>,
    tenant_id: Uuid,
    req: &CreateReconciliationRequest,
    creator: String,
) -> Result<UnifiedReconciliation, sqlx::Error> {
    let id = Uuid::new_v4();
    let now = chrono::Utc::now();
    let mut scope = db.scope_with(txn).await?;

    sqlx::query(only_own_schema_query!(
        "finance",
        r#"INSERT INTO finance.reconciliation_snapshots
             (id, tenant_id, recon_code, recon_name, recon_type, status, period,
              entity_id, entity_type, description, created_by, synced_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $12, $6, $7, $8, $9, $10, $11, $11, $11)
           ON CONFLICT (id) DO NOTHING"#
    ))
    .bind(id)
    .bind(tenant_id)
    .bind(&req.recon_code)
    .bind(&req.recon_name)
    .bind(&req.recon_type)
    .bind(&req.period)
    .bind(req.entity_id)
    .bind(&req.entity_type)
    .bind(&req.description)
    .bind(&creator)
    .bind(now)
    .bind(crate::modules::finance_snapshot_status::ReconciliationSnapshotStatus::Draft.as_db_str())
    .execute(&mut scope)
    .await?;

    let item = sqlx::query_as(only_own_schema_query!(
        "finance",
        r#"SELECT id, recon_code, recon_name, recon_type, status, period,
                  entity_id, entity_type, total_debit, total_credit, difference,
                  matched_count, unmatched_count, description, created_by,
                  approved_by, approved_at, created_at, updated_at
           FROM finance.reconciliation_snapshots
           WHERE id = $1"#
    ))
    .bind(id)
    .fetch_one(&mut scope)
    .await?;

    // 事件在请求事务提交后发布：回滚/非 2xx 时随队列一起丢弃（K13 方案 A）。
    if let Some(publisher) = event_publisher {
        let payload = topems_shared_event::ReconciliationCreatedPayload {
            id,
            tenant_id,
            recon_code: req.recon_code.clone(),
            recon_name: req.recon_name.clone(),
            recon_type: req.recon_type.clone(),
            status: "draft".to_string(),
            period: req.period.clone(),
            entity_id: req.entity_id,
            entity_type: req.entity_type.clone(),
            description: req.description.clone(),
            created_by: Some(creator),
            created_at: now,
        };
        publish_after_commit(publisher, EventType::ReconciliationCreated, payload).await;
    }

    Ok(item)
}

#[allow(clippy::as_conversions, clippy::cast_possible_wrap)]
/// 手工对账：标记对账单明细为已匹配（操作 Finance 本地明细快照 + 发布事件）
pub async fn manual_reconcile(
    db: &Db,
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    event_publisher: Option<&Arc<EventPublisher>>,
    tenant_id: Uuid,
    recon_id: Uuid,
    req: &ReconcileRequest,
) -> Result<i64, sqlx::Error> {
    let mut scope = db.scope_with(txn).await?;

    let affected: i64 = if req.record_ids.is_empty() {
        0
    } else {
        let result = sqlx::query(only_own_schema_query!(
            "finance",
            r#"UPDATE finance.reconciliation_item_snapshots
               SET match_status = $3, updated_at = NOW()
               WHERE recon_id = $1 AND id = ANY($2)
                 AND COALESCE(match_status, $4) <> $3"#
        ))
        .bind(recon_id)
        .bind(&req.record_ids)
        .bind(crate::modules::settlement_center_status::SnapshotMatchStatus::Matched.as_str())
        .bind(crate::modules::settlement_center_status::SnapshotMatchStatus::Unmatched.as_str())
        .execute(&mut scope)
        .await?;
        result.rows_affected() as i64
    };

    let stats: (Option<i32>, Option<i32>, Option<f64>, Option<f64>) =
        sqlx::query_as(only_own_schema_query!(
            "finance",
            r#"SELECT
             COUNT(*) FILTER (WHERE match_status = $2)::int AS matched_count,
             COUNT(*) FILTER (WHERE match_status <> $2)::int AS unmatched_count,
             COALESCE(SUM(debit_amount), 0)::float8 AS total_debit,
             COALESCE(SUM(credit_amount), 0)::float8 AS total_credit
           FROM finance.reconciliation_item_snapshots
           WHERE recon_id = $1"#
        ))
        .bind(recon_id)
        .bind(crate::modules::settlement_center_status::SnapshotMatchStatus::Matched.as_str())
        .fetch_one(&mut scope)
        .await?;

    let difference = stats.2.unwrap_or(0.0) - stats.3.unwrap_or(0.0);

    sqlx::query(only_own_schema_query!(
        "finance",
        r#"UPDATE finance.reconciliation_snapshots
           SET matched_count = $1, unmatched_count = $2,
               total_debit = $3, total_credit = $4, difference = $5,
               updated_at = NOW(), synced_at = NOW()
           WHERE id = $6"#
    ))
    .bind(stats.0)
    .bind(stats.1)
    .bind(stats.2)
    .bind(stats.3)
    .bind(difference)
    .bind(recon_id)
    .execute(&mut scope)
    .await?;

    // 事件在请求事务提交后发布：回滚/非 2xx 时随队列一起丢弃（K13 方案 A）。
    if let Some(publisher) = event_publisher {
        let now = chrono::Utc::now();
        let payload = topems_shared_event::ReconciliationUpdatedPayload {
            id: recon_id,
            tenant_id,
            status: "matched".to_string(),
            total_debit: stats
                .2
                .map(|v| Decimal::from_f64(v).unwrap_or(Decimal::ZERO)),
            total_credit: stats
                .3
                .map(|v| Decimal::from_f64(v).unwrap_or(Decimal::ZERO)),
            difference: Some(Decimal::from_f64(difference).unwrap_or(Decimal::ZERO)),
            matched_count: stats.0,
            unmatched_count: stats.1,
            updated_at: now,
        };
        publish_after_commit(publisher, EventType::ReconciliationUpdated, payload).await;
    }

    Ok(affected)
}

#[allow(clippy::as_conversions, clippy::cast_possible_wrap)]
/// 自动对账：按金额相等原则匹配对账单明细（操作 Finance 本地明细快照）
pub async fn auto_reconcile(
    db: &Db,
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    _tenant_id: Uuid,
    req: &AutoReconcileRequest,
) -> Result<i64, sqlx::Error> {
    let mut scope = db.scope_with(txn).await?;

    // 在 Finance 本地明细快照上匹配
    let result = sqlx::query(only_own_schema_query!(
        "finance",
        r#"UPDATE finance.reconciliation_item_snapshots ri
           SET match_status = $4, updated_at = NOW()
           FROM finance.reconciliation_snapshots r
           WHERE ri.recon_id = r.id
             AND r.period = $1
             AND ($2::text IS NULL OR r.recon_type = $2)
             AND ($3::uuid IS NULL OR r.entity_id = $3)
             AND COALESCE(ri.match_status, $5) <> $4
             AND EXISTS (
               SELECT 1 FROM finance.reconciliation_item_snapshots ri2
               WHERE ri2.recon_id = ri.recon_id
                 AND ri2.match_status <> $4
                 AND COALESCE(ri2.debit_amount, 0) = COALESCE(ri.debit_amount, 0)
                 AND COALESCE(ri2.credit_amount, 0) = COALESCE(ri.credit_amount, 0)
             )"#
    ))
    .bind(&req.period)
    .bind(&req.recon_type)
    .bind(req.entity_id)
    .bind(crate::modules::settlement_center_status::SnapshotMatchStatus::Matched.as_str())
    .bind(crate::modules::settlement_center_status::SnapshotMatchStatus::Unmatched.as_str())
    .execute(&mut scope)
    .await?;

    let affected = result.rows_affected() as i64;

    // 重新汇总对账单统计
    sqlx::query(only_own_schema_query!(
        "finance",
        r#"UPDATE finance.reconciliation_snapshots r
           SET matched_count = s.matched_count,
               unmatched_count = s.unmatched_count,
               total_debit = s.total_debit,
               total_credit = s.total_credit,
               difference = s.difference,
               updated_at = NOW(), synced_at = NOW()
           FROM (
               SELECT recon_id,
                      COUNT(*) FILTER (WHERE match_status = $4)::int AS matched_count,
                      COUNT(*) FILTER (WHERE match_status <> $4)::int AS unmatched_count,
                      SUM(debit_amount) AS total_debit,
                      SUM(credit_amount) AS total_credit,
                      SUM(debit_amount) - SUM(credit_amount) AS difference
               FROM finance.reconciliation_item_snapshots
               WHERE recon_id IN (
                   SELECT id FROM finance.reconciliation_snapshots
                   WHERE period = $1
                     AND ($2::text IS NULL OR recon_type = $2)
                     AND ($3::uuid IS NULL OR entity_id = $3)
               )
               GROUP BY recon_id
           ) s
           WHERE r.id = s.recon_id"#
    ))
    .bind(&req.period)
    .bind(&req.recon_type)
    .bind(req.entity_id)
    .bind(crate::modules::settlement_center_status::SnapshotMatchStatus::Matched.as_str())
    .execute(&mut scope)
    .await?;

    Ok(affected)
}

/// 从本地快照查询结算列表（替代跨 schema 直查 pm.settlements）
pub async fn list_settlements(
    db: &Db,
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    _tenant_id: Uuid,
    query: &SettlementListQuery,
) -> Result<Vec<UnifiedSettlement>, sqlx::Error> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;
    let search_like = query.search.as_ref().map(|s| format!("%{}%", s));
    let settlement_status =
        crate::modules::finance_snapshot_status::SettlementSnapshotStatus::parse_filter(
            query.status.as_deref(),
        )
        .ok()
        .flatten()
        .map(|s| s.as_db_str());

    let mut scope = db.scope_with(txn).await?;

    let items: Vec<UnifiedSettlement> = sqlx::query_as(only_own_schema_query!(
        "finance",
        r#"SELECT id, project_id, settlement_no AS settlement_code,
                  settlement_no AS settlement_name,
                  settlement_type, status,
                  NULL::numeric AS budget_amount,
                  amount AS actual_amount,
                  NULL::numeric AS variance_amount,
                  NULL::numeric AS variance_percent,
                  settlement_date AS settlement_period_start,
                  NULL::timestamptz AS settlement_period_end,
                  remarks AS description,
                  created_by,
                  approved_by,
                  approved_at,
                  created_at, updated_at
           FROM finance.settlement_snapshots
             WHERE ($1::text IS NULL OR status = $1)
             AND ($2::text IS NULL OR settlement_type = $2)
             AND ($3::uuid IS NULL OR project_id = $3)
             AND ($4::text IS NULL OR settlement_no ILIKE $4)
           ORDER BY settlement_date DESC NULLS LAST, created_at DESC
           LIMIT $5 OFFSET $6"#
    ))
    .bind(settlement_status)
    .bind(&query.settlement_type)
    .bind(query.project_id)
    .bind(&search_like)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut scope)
    .await?;

    Ok(items)
}

/// 查询单个结算详情（含关联对账列表，从本地快照读取）
pub async fn get_settlement_detail(
    db: &Db,
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    _tenant_id: Uuid,
    settlement_id: Uuid,
) -> Result<Option<SettlementDetail>, sqlx::Error> {
    let mut scope = db.scope_with(txn).await?;
    let settlement: Option<UnifiedSettlement> = sqlx::query_as(only_own_schema_query!(
        "finance",
        r#"SELECT id, project_id, settlement_no AS settlement_code,
                  settlement_no AS settlement_name,
                  settlement_type, status,
                  NULL::numeric AS budget_amount,
                  amount AS actual_amount,
                  NULL::numeric AS variance_amount,
                  NULL::numeric AS variance_percent,
                  settlement_date AS settlement_period_start,
                  NULL::timestamptz AS settlement_period_end,
                  remarks AS description,
                  created_by,
                  approved_by,
                  approved_at,
                  created_at, updated_at
           FROM finance.settlement_snapshots
           WHERE id = $1"#
    ))
    .bind(settlement_id)
    .fetch_optional(&mut scope)
    .await?;

    let Some(settlement) = settlement else {
        return Ok(None);
    };

    let linked: Vec<LinkedReconciliationSummary> = sqlx::query_as(
        only_own_schema_query!("finance", r#"SELECT l.id AS link_id, l.link_type, l.amount AS link_amount, l.status AS link_status,
                  r.id AS reconciliation_id, r.recon_code,
                  r.recon_name, r.recon_type, r.status AS recon_status, r.difference AS recon_difference
           FROM finance.reconciliation_settlement_links l
           JOIN finance.reconciliation_snapshots r ON r.id = l.reconciliation_id
           WHERE l.settlement_id = $1
             AND l.status != $2"#),
    )
    .bind(settlement_id)
    .bind(crate::modules::settlement_center_status::SettlementLinkStatus::Cancelled.as_str())
    .fetch_all(&mut scope)
    .await?;

    Ok(Some(SettlementDetail {
        settlement,
        linked_reconciliations: linked,
    }))
}

/// 创建结算单：写本地快照 + 发布事件（PM 通过事件订阅接收数据）
pub async fn create_settlement(
    db: &Db,
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    event_publisher: Option<&Arc<EventPublisher>>,
    tenant_id: Uuid,
    req: &CreateSettlementRequest,
    creator: String,
) -> Result<UnifiedSettlement, sqlx::Error> {
    let id = Uuid::new_v4();
    let now = chrono::Utc::now();
    let mut scope = db.scope_with(txn).await?;
    let period_start = req
        .settlement_period_start
        .as_ref()
        .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
        .map(|d| d.with_timezone(&chrono::Utc));
    let settlement_no = req
        .settlement_code
        .clone()
        .unwrap_or_else(|| format!("ST-{}", chrono::Utc::now().format("%Y%m%d%H%M%S")));

    sqlx::query(only_own_schema_query!(
        "finance",
        r#"INSERT INTO finance.settlement_snapshots
             (id, tenant_id, project_id, settlement_no, settlement_type, status,
              amount, settlement_date, remarks, created_by, synced_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $10, NULL, $6, $7, $8, $9, $9, $9)
           ON CONFLICT (id) DO NOTHING"#
    ))
    .bind(id)
    .bind(tenant_id)
    .bind(req.project_id)
    .bind(&settlement_no)
    .bind(&req.settlement_type)
    .bind(period_start)
    .bind(&req.description)
    .bind(&creator)
    .bind(now)
    .bind(crate::modules::finance_snapshot_status::SettlementSnapshotStatus::Draft.as_db_str())
    .execute(&mut scope)
    .await?;

    let item: UnifiedSettlement = sqlx::query_as(only_own_schema_query!(
        "finance",
        r#"SELECT id, project_id, settlement_no AS settlement_code,
                  settlement_no AS settlement_name,
                  settlement_type, status,
                  NULL::numeric AS budget_amount,
                  amount AS actual_amount,
                  NULL::numeric AS variance_amount,
                  NULL::numeric AS variance_percent,
                  settlement_date AS settlement_period_start,
                  NULL::timestamptz AS settlement_period_end,
                  remarks AS description,
                  created_by,
                  approved_by,
                  approved_at,
                  created_at, updated_at
           FROM finance.settlement_snapshots
           WHERE id = $1"#
    ))
    .bind(id)
    .fetch_one(&mut scope)
    .await?;

    // 事件在请求事务提交后发布：回滚/非 2xx 时随队列一起丢弃（K13 方案 A）。
    if let Some(publisher) = event_publisher {
        let payload = topems_shared_event::SettlementCreatedPayload {
            id,
            tenant_id,
            project_id: req.project_id,
            settlement_no: settlement_no.clone(),
            settlement_type: req.settlement_type.clone(),
            status: "draft".to_string(),
            amount: None,
            settlement_date: period_start,
            remarks: req.description.clone(),
            created_by: Some(creator),
            created_at: now,
        };
        publish_after_commit(publisher, EventType::SettlementCreated, payload).await;
    }

    Ok(item)
}

/// 审批对账单：更新本地快照 + 发布事件（ERP 通过事件订阅接收审批状态）
pub async fn approve_reconciliation(
    db: &Db,
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    event_publisher: Option<&Arc<EventPublisher>>,
    tenant_id: Uuid,
    recon_id: Uuid,
    approver: String,
) -> Result<Option<UnifiedReconciliation>, sqlx::Error> {
    let now = chrono::Utc::now();
    let mut scope = db.scope_with(txn).await?;

    sqlx::query(only_own_schema_query!(
        "finance",
        r#"UPDATE finance.reconciliation_snapshots
           SET status = $5, approved_by = $1, approved_at = $2,
               updated_at = NOW(), synced_at = NOW()
           WHERE id = $3 AND tenant_id = $4 AND status IN ('draft', 'pending')"#
    ))
    .bind(&approver)
    .bind(now)
    .bind(recon_id)
    .bind(tenant_id)
    .bind(
        crate::modules::finance_snapshot_status::ReconciliationSnapshotStatus::Approved.as_db_str(),
    )
    .execute(&mut scope)
    .await?;

    let item: Option<UnifiedReconciliation> = sqlx::query_as(only_own_schema_query!(
        "finance",
        r#"SELECT id, recon_code, recon_name, recon_type, status, period,
                  entity_id, entity_type, total_debit, total_credit, difference,
                  matched_count, unmatched_count, description, created_by,
                  approved_by, approved_at, created_at, updated_at
           FROM finance.reconciliation_snapshots
           WHERE id = $1"#
    ))
    .bind(recon_id)
    .fetch_optional(&mut scope)
    .await?;

    // 事件在请求事务提交后发布：回滚/非 2xx 时随队列一起丢弃（K13 方案 A）。
    if item.is_some() {
        if let Some(publisher) = event_publisher {
            let approved_payload = topems_shared_event::ReconciliationApprovedPayload {
                id: recon_id,
                tenant_id,
                approved_by: approver.clone(),
                approved_at: now,
            };
            publish_after_commit(
                publisher,
                EventType::ReconciliationApproved,
                approved_payload,
            )
            .await;

            let updated_payload = topems_shared_event::ReconciliationUpdatedPayload {
                id: recon_id,
                tenant_id,
                status: "approved".to_string(),
                total_debit: None,
                total_credit: None,
                difference: None,
                matched_count: None,
                unmatched_count: None,
                updated_at: now,
            };
            publish_after_commit(publisher, EventType::ReconciliationUpdated, updated_payload)
                .await;
        }
    }

    Ok(item)
}

/// 审批结算单：更新本地快照 + 发布事件（PM 通过事件订阅接收审批状态）
pub async fn approve_settlement(
    db: &Db,
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    event_publisher: Option<&Arc<EventPublisher>>,
    tenant_id: Uuid,
    settlement_id: Uuid,
    approver: String,
) -> Result<Option<UnifiedSettlement>, sqlx::Error> {
    let now = chrono::Utc::now();
    let mut scope = db.scope_with(txn).await?;

    sqlx::query(only_own_schema_query!(
        "finance",
        r#"UPDATE finance.settlement_snapshots
           SET status = $5, approved_by = $1::uuid, approved_at = $2,
               updated_at = NOW(), synced_at = NOW()
           WHERE id = $3 AND tenant_id = $4 AND status = $6"#
    ))
    .bind(&approver)
    .bind(now)
    .bind(settlement_id)
    .bind(tenant_id)
    .bind(crate::modules::finance_snapshot_status::SettlementSnapshotStatus::Approved.as_db_str())
    .bind(crate::modules::finance_snapshot_status::SettlementSnapshotStatus::Pending.as_db_str())
    .execute(&mut scope)
    .await?;

    let item: Option<UnifiedSettlement> = sqlx::query_as(only_own_schema_query!(
        "finance",
        r#"SELECT id, project_id, settlement_no AS settlement_code,
                  settlement_no AS settlement_name,
                  settlement_type, status,
                  NULL::numeric AS budget_amount,
                  amount AS actual_amount,
                  NULL::numeric AS variance_amount,
                  NULL::numeric AS variance_percent,
                  settlement_date AS settlement_period_start,
                  NULL::timestamptz AS settlement_period_end,
                  remarks AS description,
                  created_by,
                  approved_by,
                  approved_at,
                  created_at, updated_at
           FROM finance.settlement_snapshots
           WHERE id = $1"#
    ))
    .bind(settlement_id)
    .fetch_optional(&mut scope)
    .await?;

    // 事件在请求事务提交后发布：回滚/非 2xx 时随队列一起丢弃（K13 方案 A）。
    if item.is_some() {
        if let Some(publisher) = event_publisher {
            let payload = topems_shared_event::SettlementApprovedPayload {
                id: settlement_id,
                tenant_id,
                approved_by: approver,
                approved_at: now,
            };
            publish_after_commit(publisher, EventType::SettlementApproved, payload).await;
        }
    }

    Ok(item)
}

// ============================================================
// 关联管理
// ============================================================

/// 创建对账-结算关联
pub async fn create_link(
    db: &Db,
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    tenant_id: Uuid,
    req: &CreateLinkRequest,
    creator: Uuid,
) -> Result<ReconciliationSettlementLink, sqlx::Error> {
    let id = Uuid::new_v4();
    let now = chrono::Utc::now();
    let mut scope = db.scope_with(txn).await?;

    let link: ReconciliationSettlementLink = sqlx::query_as(only_own_schema_query!(
        "finance",
        r#"INSERT INTO finance.reconciliation_settlement_links
             (id, tenant_id, reconciliation_id, settlement_id, link_type,
              amount, status, remark, created_by, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
           RETURNING id, tenant_id, reconciliation_id, settlement_id, link_type,
                     amount, status, remark, created_by, created_at, updated_at"#
    ))
    .bind(id)
    .bind(tenant_id)
    .bind(req.reconciliation_id)
    .bind(req.settlement_id)
    .bind(&req.link_type)
    .bind(req.amount)
    .bind(crate::modules::settlement_center_status::SettlementLinkStatus::Linked.as_str())
    .bind(&req.remark)
    .bind(creator)
    .bind(now)
    .fetch_one(&mut scope)
    .await?;

    Ok(link)
}

/// 解除关联（设置为 cancelled 状态，保留审计记录）
pub async fn cancel_link(
    db: &Db,
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    tenant_id: Uuid,
    link_id: Uuid,
) -> Result<bool, sqlx::Error> {
    let mut scope = db.scope_with(txn).await?;
    let result = sqlx::query(only_own_schema_query!(
        "finance",
        r#"UPDATE finance.reconciliation_settlement_links
           SET status = $3, updated_at = NOW()
           WHERE id = $1 AND tenant_id = $2 AND status = $4"#
    ))
    .bind(link_id)
    .bind(tenant_id)
    .bind(crate::modules::settlement_center_status::SettlementLinkStatus::Cancelled.as_str())
    .bind(crate::modules::settlement_center_status::SettlementLinkStatus::Linked.as_str())
    .execute(&mut scope)
    .await?;

    Ok(result.rows_affected() > 0)
}

/// 查询关联列表
pub async fn list_links(
    db: &Db,
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    _tenant_id: Uuid,
    query: &LinkListQuery,
) -> Result<Vec<ReconciliationSettlementLink>, sqlx::Error> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;

    let link_status = crate::modules::settlement_center_status::SettlementLinkStatus::parse_filter(
        query.status.as_deref(),
    )
    .ok()
    .flatten()
    .map(|s| s.as_str());
    let mut scope = db.scope_with(txn).await?;

    let items: Vec<ReconciliationSettlementLink> = sqlx::query_as(only_own_schema_query!(
        "finance",
        r#"SELECT id, tenant_id, reconciliation_id, settlement_id, link_type,
                  amount, status, remark, created_by, created_at, updated_at
           FROM finance.reconciliation_settlement_links
             WHERE ($1::uuid IS NULL OR reconciliation_id = $1)
             AND ($2::uuid IS NULL OR settlement_id = $2)
             AND ($3::text IS NULL OR link_type = $3)
             AND ($4::text IS NULL OR status = $4)
           ORDER BY created_at DESC
           LIMIT $5 OFFSET $6"#
    ))
    .bind(query.reconciliation_id)
    .bind(query.settlement_id)
    .bind(&query.link_type)
    .bind(link_status)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut scope)
    .await?;

    Ok(items)
}

// ============================================================
// 差异调整
// ============================================================

/// 创建差异调整
pub async fn create_difference(
    db: &Db,
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    tenant_id: Uuid,
    req: &CreateDifferenceRequest,
    creator: Uuid,
) -> Result<DifferenceAdjustment, sqlx::Error> {
    let id = Uuid::new_v4();
    let now = chrono::Utc::now();
    let mut scope = db.scope_with(txn).await?;

    let item: DifferenceAdjustment = sqlx::query_as(only_own_schema_query!(
        "finance",
        r#"INSERT INTO finance.difference_adjustments
             (id, tenant_id, source_type, source_id, difference_type,
              difference_amount, reason, adjustment_amount, adjustment_type,
              status, remark, created_by, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)
           RETURNING id, tenant_id, source_type, source_id, difference_type,
                     difference_amount, reason, adjustment_amount, adjustment_type,
                     status, approved_by, approved_at, remark, created_by,
                     created_at, updated_at"#
    ))
    .bind(id)
    .bind(tenant_id)
    .bind(&req.source_type)
    .bind(req.source_id)
    .bind(&req.difference_type)
    .bind(req.difference_amount)
    .bind(&req.reason)
    .bind(req.adjustment_amount)
    .bind(&req.adjustment_type)
    .bind(crate::modules::settlement_center_status::DifferenceAdjustmentStatus::Pending.as_str())
    .bind(&req.remark)
    .bind(creator)
    .bind(now)
    .fetch_one(&mut scope)
    .await?;

    Ok(item)
}

/// 审批差异调整
pub async fn approve_difference(
    db: &Db,
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    tenant_id: Uuid,
    diff_id: Uuid,
    approver: Uuid,
) -> Result<Option<DifferenceAdjustment>, sqlx::Error> {
    let mut scope = db.scope_with(txn).await?;
    let item: Option<DifferenceAdjustment> = sqlx::query_as(only_own_schema_query!(
        "finance",
        r#"UPDATE finance.difference_adjustments
           SET status = $4, approved_by = $1, approved_at = NOW(), updated_at = NOW()
           WHERE id = $2 AND tenant_id = $3 AND status = $5
           RETURNING id, tenant_id, source_type, source_id, difference_type,
                     difference_amount, reason, adjustment_amount, adjustment_type,
                     status, approved_by, approved_at, remark, created_by,
                     created_at, updated_at"#
    ))
    .bind(approver)
    .bind(diff_id)
    .bind(tenant_id)
    .bind(crate::modules::settlement_center_status::DifferenceAdjustmentStatus::Approved.as_str())
    .bind(crate::modules::settlement_center_status::DifferenceAdjustmentStatus::Pending.as_str())
    .fetch_optional(&mut scope)
    .await?;

    Ok(item)
}

/// 拒绝差异调整
pub async fn reject_difference(
    db: &Db,
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    tenant_id: Uuid,
    diff_id: Uuid,
    approver: Uuid,
) -> Result<Option<DifferenceAdjustment>, sqlx::Error> {
    let mut scope = db.scope_with(txn).await?;
    let item: Option<DifferenceAdjustment> = sqlx::query_as(only_own_schema_query!(
        "finance",
        r#"UPDATE finance.difference_adjustments
           SET status = $4, approved_by = $1, approved_at = NOW(), updated_at = NOW()
           WHERE id = $2 AND tenant_id = $3 AND status = $5
           RETURNING id, tenant_id, source_type, source_id, difference_type,
                     difference_amount, reason, adjustment_amount, adjustment_type,
                     status, approved_by, approved_at, remark, created_by,
                     created_at, updated_at"#
    ))
    .bind(approver)
    .bind(diff_id)
    .bind(tenant_id)
    .bind(crate::modules::settlement_center_status::DifferenceAdjustmentStatus::Rejected.as_str())
    .bind(crate::modules::settlement_center_status::DifferenceAdjustmentStatus::Pending.as_str())
    .fetch_optional(&mut scope)
    .await?;

    Ok(item)
}

/// 查询差异调整列表
pub async fn list_differences(
    db: &Db,
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    _tenant_id: Uuid,
    query: &DifferenceListQuery,
) -> Result<Vec<DifferenceAdjustment>, sqlx::Error> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;

    let diff_status =
        crate::modules::settlement_center_status::DifferenceAdjustmentStatus::parse_filter(
            query.status.as_deref(),
        )
        .ok()
        .flatten()
        .map(|s| s.as_str());
    let mut scope = db.scope_with(txn).await?;

    let items: Vec<DifferenceAdjustment> = sqlx::query_as(only_own_schema_query!(
        "finance",
        r#"SELECT id, tenant_id, source_type, source_id, difference_type,
                  difference_amount, reason, adjustment_amount, adjustment_type,
                  status, approved_by, approved_at, remark, created_by,
                  created_at, updated_at
           FROM finance.difference_adjustments
             WHERE ($1::text IS NULL OR source_type = $1)
             AND ($2::uuid IS NULL OR source_id = $2)
             AND ($3::text IS NULL OR difference_type = $3)
             AND ($4::text IS NULL OR status = $4)
           ORDER BY created_at DESC
           LIMIT $5 OFFSET $6"#
    ))
    .bind(&query.source_type)
    .bind(query.source_id)
    .bind(&query.difference_type)
    .bind(diff_status)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut scope)
    .await?;

    Ok(items)
}

// ============================================================
// 统计聚合
// ============================================================

/// 获取统一统计（跨 schema 聚合对账、结算、差异、关联）
pub async fn get_statistics(
    db: &Db,
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    tenant_id: Uuid,
) -> Result<CenterStatistics, sqlx::Error> {
    let recon_stats = get_reconciliation_statistics(db, &mut *txn, tenant_id).await?;
    let settlement_stats = get_settlement_statistics(db, &mut *txn, tenant_id).await?;
    let difference_stats = get_difference_statistics(db, &mut *txn, tenant_id).await?;
    let link_stats = get_link_statistics(db, &mut *txn, tenant_id).await?;

    Ok(CenterStatistics {
        reconciliation: recon_stats,
        settlement: settlement_stats,
        difference: difference_stats,
        link: link_stats,
    })
}

async fn get_reconciliation_statistics(
    db: &Db,
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    _tenant_id: Uuid,
) -> Result<ReconciliationStatistics, sqlx::Error> {
    let mut scope = db.scope_with(txn).await?;
    let row: (i64, i64, i64, Decimal, Decimal, Decimal, i64, i64) =
        sqlx::query_as(only_own_schema_query!(
            "finance",
            r#"SELECT
             COUNT(*)::bigint AS total_count,
             COUNT(*) FILTER (WHERE status IN ('draft', 'pending'))::bigint AS pending_count,
             COUNT(*) FILTER (WHERE status = 'approved')::bigint AS approved_count,
             COALESCE(SUM(total_debit), 0)::numeric AS total_debit,
             COALESCE(SUM(total_credit), 0)::numeric AS total_credit,
             COALESCE(SUM(difference), 0)::numeric AS total_difference,
             COALESCE(SUM(matched_count), 0)::bigint AS matched_count,
             COALESCE(SUM(unmatched_count), 0)::bigint AS unmatched_count
           FROM finance.reconciliation_snapshots"#
        ))
        .fetch_one(&mut scope)
        .await?;

    Ok(ReconciliationStatistics {
        total_count: row.0,
        pending_count: row.1,
        approved_count: row.2,
        total_debit: row.3,
        total_credit: row.4,
        total_difference: row.5,
        matched_count: row.6,
        unmatched_count: row.7,
    })
}

async fn get_settlement_statistics(
    db: &Db,
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    _tenant_id: Uuid,
) -> Result<SettlementStatistics, sqlx::Error> {
    let mut scope = db.scope_with(txn).await?;
    let row: (i64, i64, i64, i64, Decimal, Decimal, Decimal) =
        sqlx::query_as(only_own_schema_query!(
            "finance",
            r#"SELECT
             COUNT(*)::bigint AS total_count,
             COUNT(*) FILTER (WHERE status = 'draft')::bigint AS draft_count,
             COUNT(*) FILTER (WHERE status = 'pending')::bigint AS pending_count,
             COUNT(*) FILTER (WHERE status = 'approved')::bigint AS approved_count,
             0::numeric AS total_budget,
             COALESCE(SUM(amount), 0)::numeric AS total_actual,
             0::numeric AS total_variance
           FROM finance.settlement_snapshots"#
        ))
        .fetch_one(&mut scope)
        .await?;

    Ok(SettlementStatistics {
        total_count: row.0,
        draft_count: row.1,
        pending_count: row.2,
        approved_count: row.3,
        total_budget: row.4,
        total_actual: row.5,
        total_variance: row.6,
    })
}

async fn get_difference_statistics(
    db: &Db,
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    _tenant_id: Uuid,
) -> Result<DifferenceStatistics, sqlx::Error> {
    let mut scope = db.scope_with(txn).await?;
    let row: (i64, i64, i64, i64, Decimal, Decimal) = sqlx::query_as(
        only_own_schema_query!("finance", r#"SELECT
             COUNT(*)::bigint AS total_count,
             COUNT(*) FILTER (WHERE status = 'pending')::bigint AS pending_count,
             COUNT(*) FILTER (WHERE status = 'approved')::bigint AS approved_count,
             COUNT(*) FILTER (WHERE status = 'rejected')::bigint AS rejected_count,
             COALESCE(SUM(difference_amount), 0)::numeric AS total_difference_amount,
             COALESCE(SUM(adjustment_amount) FILTER (WHERE status = 'approved'), 0)::numeric AS total_adjustment_amount
           FROM finance.difference_adjustments"#),
    )
    .fetch_one(&mut scope)
    .await?;

    Ok(DifferenceStatistics {
        total_count: row.0,
        pending_count: row.1,
        approved_count: row.2,
        rejected_count: row.3,
        total_difference_amount: row.4,
        total_adjustment_amount: row.5,
    })
}

async fn get_link_statistics(
    db: &Db,
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    _tenant_id: Uuid,
) -> Result<LinkStatistics, sqlx::Error> {
    let mut scope = db.scope_with(txn).await?;
    let row: (i64, i64, i64, Decimal) = sqlx::query_as(only_own_schema_query!(
        "finance",
        r#"SELECT
             COUNT(*)::bigint AS total_count,
             COUNT(*) FILTER (WHERE status = 'linked')::bigint AS active_count,
             COUNT(*) FILTER (WHERE status = 'cancelled')::bigint AS cancelled_count,
             COALESCE(SUM(amount) FILTER (WHERE status = 'linked'), 0)::numeric AS total_amount
           FROM finance.reconciliation_settlement_links"#
    ))
    .fetch_one(&mut scope)
    .await?;

    Ok(LinkStatistics {
        total_count: row.0,
        active_count: row.1,
        cancelled_count: row.2,
        total_amount: row.3,
    })
}

/// 获取仪表盘汇总（统计 + 最近对账 + 最近结算 + 待处理差异）
pub async fn get_dashboard_summary(
    db: &Db,
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    tenant_id: Uuid,
) -> Result<DashboardSummary, sqlx::Error> {
    let statistics = get_statistics(db, &mut *txn, tenant_id).await?;

    let mut scope = db.scope_with(txn).await?;

    let recent_reconciliations: Vec<UnifiedReconciliation> =
        sqlx::query_as(only_own_schema_query!(
            "finance",
            r#"SELECT id, recon_code, recon_name, recon_type, status, period,
                  entity_id, entity_type, total_debit, total_credit, difference,
                  matched_count, unmatched_count, description, created_by,
                  approved_by, approved_at, created_at, updated_at
           FROM finance.reconciliation_snapshots
           ORDER BY created_at DESC
           LIMIT 5"#
        ))
        .fetch_all(&mut scope)
        .await?;

    let recent_settlements: Vec<UnifiedSettlement> = sqlx::query_as(only_own_schema_query!(
        "finance",
        r#"SELECT id, project_id, settlement_no AS settlement_code,
                  settlement_no AS settlement_name,
                  settlement_type, status,
                  NULL::numeric AS budget_amount,
                  amount AS actual_amount,
                  NULL::numeric AS variance_amount,
                  NULL::numeric AS variance_percent,
                  settlement_date AS settlement_period_start,
                  NULL::timestamptz AS settlement_period_end,
                  remarks AS description,
                  created_by,
                  NULL::varchar AS approved_by,
                  NULL::timestamptz AS approved_at,
                  created_at, updated_at
           FROM finance.settlement_snapshots
           ORDER BY created_at DESC
           LIMIT 5"#
    ))
    .fetch_all(&mut scope)
    .await?;

    let pending_differences: Vec<DifferenceAdjustment> = sqlx::query_as(only_own_schema_query!(
        "finance",
        r#"SELECT id, tenant_id, source_type, source_id, difference_type,
                  difference_amount, reason, adjustment_amount, adjustment_type,
                  status, approved_by, approved_at, remark, created_by,
                  created_at, updated_at
           FROM finance.difference_adjustments WHERE status = 'pending'
           ORDER BY created_at DESC
           LIMIT 5"#
    ))
    .fetch_all(&mut scope)
    .await?;

    Ok(DashboardSummary {
        statistics,
        recent_reconciliations,
        recent_settlements,
        pending_differences,
    })
}

// ============================================================
// 辅助函数
// ============================================================

/// 将 tenant_id 转为可选绑定。
/// 当 tenant_id 为 nil（未设置）时，返回 None 以跳过租户过滤。
fn tenant_id_opt(tenant_id: Uuid) -> Option<Uuid> {
    if tenant_id == Uuid::nil() {
        None
    } else {
        Some(tenant_id)
    }
}

/// 从 Claims.tenant_id 字符串解析 tenant_id
pub fn parse_tenant_id(claims_tenant: &Option<String>) -> Uuid {
    claims_tenant
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or(Uuid::nil())
}
