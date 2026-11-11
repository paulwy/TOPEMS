//! SCM ↔ SRM 数据同步模块（旧路径）
//!
//! ── 批 35 · 状态评估（2026-11-07）────────────────────────────────────────
//! 本模块提供 scm↔srm 直连同步能力（`sync_supplier_from_srm` /
//! `sync_all_suppliers_from_srm` / `get_sync_logs` / `retry_failed_syncs` /
//! `get_sync_statistics`），并由 `event_handlers/mod.rs` 订阅
//! `SupplierDataSyncRequested` 事件触发写入。
//!
//! 与批 34 新建的 `svc/master-data/src/modules/supplier_sync.rs` 对比：
//!   * 数据源不同：本模块从 `scm.srm_supplier_snapshots` 读（快照表），
//!     mdm 同步从 `master_data.mdm_suppliers` 读（权威主表）。
//!   * 字段覆盖：本模块只写 name/legal_name/contact/phone/email/address/tax_id/status，
//!     不写 supplier_no/category/credit_rating/risk_level/bank 等；mdm 同步字段全。
//!   * 标记列冲突：本模块写 `scm.suppliers.sync_from_srm = TRUE`，
//!     mdm 同步写 `sync_from_srm = FALSE`——同一行可能被两路径写，值不一致。
//!   * 触发方式：本模块为 HTTP API + 事件驱动；mdm 同步为 mdm 主写入后 tokio::spawn。
//!   * 幂等键：本模块按 `scm.suppliers.id` 匹配；mdm 同步按 `supplier_no` 唯一键。
//!
//! 实测（2026-11-07）：
//!   * `scm.suppliers WHERE sync_from_srm = true` → 0 行
//!   * `srm.suppliers WHERE sync_from_scm = true` → 0 行
//!   * 前端 `scm/writeOps.ts` 的 `syncSupplierFromSrm` 封装无 UI 组件调用（死代码）。
//!
//! 结论：mdm 同步已完全覆盖本模块的单行同步能力（且字段更全）。
//! 本模块保留但停用——保留 `sync_all_suppliers_from_srm` 全量批量能力
//! （mdm 侧暂无对应全量入口），但 HTTP 路由与事件订阅不主动启用。
//!
//! 启用前必须重新评估：
//!   1. 环：本模块写 scm.suppliers 会触发 scm→mdm 反向同步（`svc/scm/src/modules/supplier.rs`），
//!      mdm 同步再写 scm.suppliers——需确认防环机制。
//!   2. 幂等键冲突：本模块按 id 匹配，mdm 同步按 supplier_no 匹配，混用会导致重复行。
//!   3. 标记列：sync_from_srm / sync_from_scm 的语义需统一（本模块写 TRUE，mdm 写 FALSE）。

use axum::{
    extract::{Extension, Path, State},
    routing::post,
    Json, Router,
};
use chrono::{Duration, Utc};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use super::ApiState;
use crate::models::purchase_order::PurchaseOrder;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;
use topems_shared_core::TopemsError;

use crate::shared::permission::tenant_bind_value;
use topems_shared_event::event::commit_retry;
use topems_shared_event::{EventType, InboundOrderRequestedPayload};

#[derive(Debug, Deserialize, Serialize)]
pub struct PurchaseToInboundRequest {
    pub purchase_order_id: String,
    pub warehouse_id: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct SyncResult {
    pub success: bool,
    pub message: String,
    pub purchase_order_id: Option<Uuid>,
    pub inbound_order_id: Option<Uuid>,
    pub inbound_order_number: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct SyncSupplierRequest {
    pub supplier_id: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct RetryFailedRequest {
    pub sync_type: Option<String>,
    pub max_retries: Option<i32>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct SyncStatistics {
    pub total_syncs: i64,
    pub success_count: i64,
    pub failed_count: i64,
    pub pending_count: i64,
    pub in_progress_count: i64,
    pub retry_needed_count: i64,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct BatchSyncResult {
    pub total_count: usize,
    pub success_count: usize,
    pub failed_count: usize,
    pub retry_count: usize,
    pub errors: Vec<SyncErrorDetail>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct SyncErrorDetail {
    pub source_id: String,
    pub source_code: Option<String>,
    pub error: String,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/sync/purchase-to-inbound", post(purchase_to_inbound))
        .route(
            "/sync/purchase-order/{id}/to-inbound",
            post(create_inbound_from_purchase),
        )
        .route("/sync/supplier-from-srm", post(sync_supplier_from_srm))
        .route(
            "/sync/suppliers-from-srm",
            post(sync_all_suppliers_from_srm),
        )
        .route("/sync/retry-failed", post(retry_failed_syncs))
        .route("/sync/statistics", post(get_sync_statistics))
        .route("/sync/sync-logs", post(get_sync_logs))
        .route("/sync/purchase-batch", post(batch_sync_purchase_to_wms))
        .route("/sync/consistency-check", post(check_consistency))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["scm:sync:write"])),
    path = "/sync/purchase-to-inbound",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM/sync"
)]
pub async fn purchase_to_inbound(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<PurchaseToInboundRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    if guard.is_none() {
        return ApiResponse::server_error("rls transaction unavailable");
    }
    let tenant_bind = tenant_bind_value(&claims);
    let purchase_order_id = match Uuid::parse_str(&req.purchase_order_id) {
        Ok(id) => id,
        Err(_) => return ApiResponse::bad_request("采购订单ID格式错误"),
    };

    let warehouse_id = req
        .warehouse_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());

    let (result, to_emit, insert_error) = {
        let txn = match guard.as_mut() {
            Some(txn) => txn,
            None => return ApiResponse::server_error("rls transaction unavailable"),
        };
        create_inbound_from_purchase_internal(
            &state,
            purchase_order_id,
            warehouse_id,
            req.remarks,
            tenant_bind,
            &mut *txn,
        )
        .await
    };

    if let Some(err) = insert_error {
        // 请求事务已因主 INSERT 失败而中止：先回滚，再用独立短事务累加重试计数。
        if let Some(t) = guard.take() {
            if let Err(e) = t.rollback().await {
                tracing::error!(target: "scm_sync", "回滚请求事务失败: {}", e);
            }
        }
        return failed_sync_response(&state, purchase_order_id, tenant_bind, &err).await;
    }

    if !result.success {
        if let Some(t) = guard.take() {
            if let Err(e) = t.rollback().await {
                tracing::error!(target: "scm_sync", "回滚请求事务失败: {}", e);
            }
        }
        return result;
    }

    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("rls commit failed: {}", e);
            return ApiResponse::from(TopemsError::Internal("提交事务失败".to_string()));
        }
    }
    emit_inbound_after_commit(&state, to_emit).await;
    result
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["scm:sync:write"])),
    path = "/sync/purchase-order/{id}/to-inbound",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM/sync"
)]
pub async fn create_inbound_from_purchase(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    if guard.is_none() {
        return ApiResponse::server_error("rls transaction unavailable");
    }
    let tenant_bind = tenant_bind_value(&claims);

    let (result, to_emit, insert_error) = {
        let txn = match guard.as_mut() {
            Some(txn) => txn,
            None => return ApiResponse::server_error("rls transaction unavailable"),
        };
        create_inbound_from_purchase_internal(&state, id, None, None, tenant_bind, &mut *txn).await
    };

    if let Some(err) = insert_error {
        // 请求事务已因主 INSERT 失败而中止：先回滚，再用独立短事务累加重试计数。
        if let Some(t) = guard.take() {
            if let Err(e) = t.rollback().await {
                tracing::error!(target: "scm_sync", "回滚请求事务失败: {}", e);
            }
        }
        return failed_sync_response(&state, id, tenant_bind, &err).await;
    }

    if !result.success {
        if let Some(t) = guard.take() {
            if let Err(e) = t.rollback().await {
                tracing::error!(target: "scm_sync", "回滚请求事务失败: {}", e);
            }
        }
        return result;
    }

    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("rls commit failed: {}", e);
            return ApiResponse::from(TopemsError::Internal("提交事务失败".to_string()));
        }
    }
    emit_inbound_after_commit(&state, to_emit).await;
    result
}

/// 主 INSERT 失败后的统一响应：先记账（独立短事务），再按记账结果返回非 2xx。
async fn failed_sync_response(
    state: &ApiState,
    purchase_order_id: Uuid,
    tenant_bind: Uuid,
    insert_error: &str,
) -> ApiResponse<serde_json::Value> {
    use SyncAttempt::*;
    match record_failed_sync_attempt(state, purchase_order_id, tenant_bind, insert_error).await {
        Ok(Retry { retry_count }) => ApiResponse::error(
            503,
            &format!(
                "创建入库单失败（第 {}/{} 次），已记录待重试",
                retry_count, MAX_SYNC_RETRIES
            ),
        ),
        Ok(Exhausted { retry_count }) => ApiResponse::error(
            409,
            &format!(
                "创建入库单失败，已达到最大重试次数 {}/{}，需人工处理",
                retry_count, MAX_SYNC_RETRIES
            ),
        ),
        Ok(AlreadyExhausted { retry_count }) => ApiResponse::error(
            409,
            &format!(
                "该采购订单同步已处于失败态（重试 {}/{} 次），需人工处理",
                retry_count, MAX_SYNC_RETRIES
            ),
        ),
        Ok(NotFound) => ApiResponse::error(404, "采购订单不存在或不属于当前租户"),
        Err(e) => {
            tracing::error!(target: "scm_sync", "记录同步重试次数失败: {}", e);
            ApiResponse::error(500, "创建入库单失败，且重试记录写入失败")
        }
    }
}

/// D6：commit 成功之后发布 InboundOrderRequested；发布失败入 Redis ZSET 重试队列。
/// 消费契约不变（at-least-once，消费侧幂等）。
async fn emit_inbound_after_commit(
    state: &ApiState,
    to_emit: Option<InboundOrderRequestedPayload>,
) {
    let (Some(payload), Some(publisher)) = (to_emit, state.event_publisher.clone()) else {
        return;
    };
    let et = EventType::InboundOrderRequested;
    match publisher.publish_event(et, &payload).await {
        Ok(_) => tracing::info!(
            "[SCM] InboundOrderRequested 事件发布成功 inbound_id={}",
            payload.inbound_order_id
        ),
        Err(e) => {
            tracing::warn!(
                "[SCM] commit 后发布 InboundOrderRequested 失败: {}，入重试队列",
                e
            );
            commit_retry::push_retry_typed("scm", et, &payload).await;
        }
    }
}

#[allow(clippy::as_conversions)]
/// 返回 (HTTP 响应, 需在 commit 成功后发布的事件 payload, 主 INSERT 失败原因)。
///
/// D6：事件不再事务内发布，交由调用方 commit 成功后 emit（失败入 ZSET 重试）。
///
/// 第三个返回值只在该函数**没有**写入请求事务的失败分支出现（主 INSERT 失败）；
/// 调用方必须先回滚请求事务，再用独立短事务记录重试计数与失败日志——中止的事务
/// 上不能再写任何东西。
pub async fn create_inbound_from_purchase_internal(
    state: &ApiState,
    purchase_order_id: Uuid,
    warehouse_id: Option<Uuid>,
    _remarks: Option<String>,
    tenant_bind: Uuid,
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
) -> (
    ApiResponse<serde_json::Value>,
    Option<InboundOrderRequestedPayload>,
    Option<String>,
) {
    // B-0 防重：先锁采购单行（FOR UPDATE），让并发请求在这里串行化；
    // 后到的请求在锁释放后必然读到已回写的 status/inbound_order_id，从而走 409。
    let purchase_order = sqlx::query_as::<_, PurchaseOrder>(
        only_own_schema_query!("scm", r#"
        SELECT id, po_no AS order_number, supplier_id, order_date, delivery_date, total_amount, status, remarks, created_at, updated_at
        FROM scm.purchase_orders
        WHERE id = $1 AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $2::uuid)
        FOR UPDATE
        "#),
    )
    .bind(purchase_order_id)
    .bind(tenant_bind)
    .fetch_optional(&mut **txn)
    .await;

    let purchase_order = match purchase_order {
        Ok(Some(po)) => po,
        Ok(None) => {
            log_sync_failure(
                state,
                purchase_order_id,
                "",
                "采购订单不存在或状态不是已批准",
                "failed",
                0,
                tenant_bind,
            )
            .await;
            return (
                ApiResponse::error(404, "采购订单不存在或状态不是已批准"),
                None,
                None,
            );
        }
        Err(e) => {
            tracing::error!("查询采购订单失败: {}", e);
            let message = format!("查询采购订单失败: {}", e);
            log_sync_failure(
                state,
                purchase_order_id,
                "",
                &message,
                "failed",
                0,
                tenant_bind,
            )
            .await;
            return (
                ApiResponse::from(TopemsError::Internal("查询采购订单失败".to_string())),
                None,
                None,
            );
        }
    };

    if purchase_order.status != "approved" {
        // 行锁释放后读到非 approved：并发请求已被前一个请求回写（in_transit），
        // 或采购单本来就不在可转入库单的状态。
        let existing_inbound_id: Option<Uuid> = sqlx::query_scalar(only_own_schema_query!(
            "scm",
            "SELECT inbound_order_id FROM scm.purchase_orders WHERE id = $1"
        ))
        .bind(purchase_order_id)
        .fetch_optional(&mut **txn)
        .await
        .ok()
        .flatten();

        let (message, log_status) = if existing_inbound_id.is_some() {
            ("该采购订单已创建入库单".to_string(), "skipped")
        } else {
            (
                format!("采购订单当前状态为 {}，不可转入库单", purchase_order.status),
                "failed",
            )
        };
        log_sync_failure(
            state,
            purchase_order_id,
            &purchase_order.order_number,
            &message,
            log_status,
            0,
            tenant_bind,
        )
        .await;
        return (ApiResponse::error(409, &message), None, None);
    }

    // 判重键必须是**本链路实际写入的键**：snapshot.purchase_order_id。
    // （旧实现比较 order_number = po_no，而写入的是 'INB-' || po_no，永不相等。）
    let existing_inbound = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "scm",
        r#"
        SELECT COUNT(*) FROM scm.wms_inbound_order_snapshots
        WHERE purchase_order_id = $1 AND deleted_at IS NULL
          AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $2::uuid)
        "#
    ))
    .bind(purchase_order_id)
    .bind(tenant_bind)
    .fetch_one(&mut **txn)
    .await;

    match existing_inbound {
        Ok(0) => {}
        Ok(_) => {
            log_sync_failure(
                state,
                purchase_order_id,
                &purchase_order.order_number,
                "该采购订单已创建入库单",
                "skipped",
                0,
                tenant_bind,
            )
            .await;
            return (
                ApiResponse::error(409, "该采购订单已创建入库单"),
                None,
                None,
            );
        }
        Err(e) => {
            tracing::error!("查询已创建入库单失败: {}", e);
            return (
                ApiResponse::from(TopemsError::Internal("查询已创建入库单失败".to_string())),
                None,
                None,
            );
        }
    }

    let inbound_id = Uuid::new_v4();
    let now = Utc::now();
    let inbound_order_number = format!("INB-{}", purchase_order.order_number);

    let result = sqlx::query(only_own_schema_query!(
        "scm",
        r#"
        INSERT INTO scm.wms_inbound_order_snapshots
            (id, order_number, warehouse_id, supplier_id,
             order_type, status, purchase_order_id, purchase_order_number,
             received_at, tenant_id, synced_at, created_at, updated_at)
        VALUES ($1, $2, $3, $4, 'purchase', 'pending', $5, $6, NULL, $8, $7, $7, $7)
        "#
    ))
    .bind(inbound_id)
    .bind(&inbound_order_number)
    .bind(warehouse_id)
    .bind(purchase_order.supplier_id)
    .bind(purchase_order_id)
    .bind(&purchase_order.order_number)
    .bind(now)
    .bind(tenant_bind)
    .execute(&mut **txn)
    .await;

    match result {
        Ok(_) => {
            // D6：事务内不再 emit（commit 失败会产生孤儿事件）。读 tenant_id 构造 payload，
            // 交由调用方 commit 成功后发布；发布失败入 ZSET 重试队列。
            let tenant_id: Option<Uuid> = sqlx::query_scalar(
                "SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid",
            )
            .fetch_optional(&mut **txn)
            .await
            .ok()
            .flatten();
            let to_emit = Some(InboundOrderRequestedPayload {
                inbound_order_id: inbound_id,
                inbound_order_number: inbound_order_number.clone(),
                warehouse_id,
                supplier_id: purchase_order.supplier_id,
                purchase_order_id,
                purchase_order_number: purchase_order.order_number.clone(),
                requested_at: now,
                tenant_id,
            });

            if let Err(e) = sqlx::query(only_own_schema_query!(
                "scm",
                r#"
                UPDATE scm.purchase_orders 
                SET status = 'in_transit', inbound_order_id = $2, 
                    inbound_order_number = $3, is_synced_to_wms = TRUE, 
                    sync_retry_count = 0, sync_error = NULL, last_sync_at = $4,
                    updated_at = $4
                WHERE id = $1 AND ($5 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $5::uuid)
                "#
            ))
            .bind(purchase_order_id)
            .bind(inbound_id)
            .bind(&inbound_order_number)
            .bind(now)
            .bind(tenant_bind)
            .execute(&mut **txn)
            .await
            {
                tracing::error!(target: "scm_sync", "回写采购订单同步状态失败: {}", e);
                return (
                    ApiResponse::from(TopemsError::Internal("回写采购订单同步状态失败".to_string())),
                    None,
                    None,
                );
            }

            // 成功日志与主 INSERT 同一事务：写失败即整体回滚，不留"有入库单无日志"的半截数据。
            if let Err(e) = record_sync_log_txn(
                txn,
                "purchase_to_inbound",
                "scm",
                "wms",
                "purchase_order",
                purchase_order_id,
                &purchase_order.order_number,
                Some(inbound_id),
                &inbound_order_number,
                "create",
                "success",
                None,
                0,
                tenant_bind,
            )
            .await
            {
                tracing::error!(target: "scm_sync", "写同步日志失败: {}", e);
                return (
                    ApiResponse::from(TopemsError::Internal("写同步日志失败".to_string())),
                    None,
                    None,
                );
            }

            (
                ApiResponse::success(
                    serde_json::json!({
                        "success": true,
                        "message": "入库单创建成功".to_string(),
                        "purchase_order_id": purchase_order_id,
                        "inbound_order_id": inbound_id,
                        "inbound_order_number": inbound_order_number,
                    }),
                    "采购订单转入库单成功",
                ),
                to_emit,
                None,
            )
        }
        Err(e) => {
            // 唯一索引兜底：并发双请求中后到者若绕过行锁，会撞 (tenant, purchase_order_id)
            // 唯一索引。这是"已创建"冲突，不是可重试故障，不写重试计数。
            if is_unique_violation(&e) {
                tracing::warn!(
                    target: "scm_sync",
                    purchase_order_id = %purchase_order_id,
                    "并发写入入库单快照撞唯一索引，按已创建处理"
                );
                return (
                    ApiResponse::error(409, "该采购订单已创建入库单"),
                    None,
                    None,
                );
            }
            // 其余错误：请求事务已被中止，不能在此写任何东西；重试计数与失败日志由调用方
            // 先回滚请求事务，再用独立短事务写入。
            tracing::error!(target: "scm_sync", "创建入库单失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("创建入库单失败".to_string())),
                None,
                Some(e.to_string()),
            )
        }
    }
}

/// 同步链路最大重试次数。达到后进入失败态（sync_logs.status = 'failed'，
/// retry_count = MAX_SYNC_RETRIES），不再自动重试，需人工处理。
const MAX_SYNC_RETRIES: i32 = 3;

/// 判断是否为唯一约束冲突（SQLSTATE 23505）。
fn is_unique_violation(e: &sqlx::Error) -> bool {
    e.as_database_error().and_then(|db| db.code()).as_deref() == Some("23505")
}

/// 主 INSERT 失败后，独立短事务记账的结果。
enum SyncAttempt {
    /// 未达上限，已记录本次失败，可重试。
    Retry { retry_count: i32 },
    /// 本次失败后达到上限，进入失败态。
    Exhausted { retry_count: i32 },
    /// 此前已达上限，不再累加、不再自动重试。
    AlreadyExhausted { retry_count: i32 },
    /// 采购订单不存在（或不属于该租户）。
    NotFound,
}

/// 在调用方给定的事务内写同步日志。写失败必须上抛，由调用方回滚整体，
/// 不允许出现"主 INSERT 成功、日志缺失"或"主 INSERT 失败、日志记成功"的半截数据。
#[allow(clippy::too_many_arguments)]
async fn record_sync_log_txn(
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    sync_type: &str,
    source_module: &str,
    target_module: &str,
    source_entity: &str,
    source_id: Uuid,
    source_code: &str,
    target_id: Option<Uuid>,
    target_code: &str,
    operation: &str,
    status: &str,
    error_message: Option<String>,
    retry_count: i32,
    tenant_bind: Uuid,
) -> Result<(), sqlx::Error> {
    let now = Utc::now();

    let next_retry_at = if status == "pending" && retry_count < MAX_SYNC_RETRIES {
        Some(now + Duration::seconds((retry_count * 60).into()))
    } else {
        None
    };

    sqlx::query(only_own_schema_query!(
        "scm",
        r#"
        INSERT INTO scm.sync_logs 
            (sync_type, source_module, target_module, source_entity,
             source_id, source_code, target_id, target_code, operation, status,
             error_message, retry_count, max_retries, next_retry_at, executed_at, updated_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        "#
    ))
    .bind(sync_type)
    .bind(source_module)
    .bind(target_module)
    .bind(source_entity)
    .bind(source_id)
    .bind(source_code)
    .bind(target_id)
    .bind(target_code)
    .bind(operation)
    .bind(status)
    .bind(error_message)
    .bind(retry_count)
    .bind(MAX_SYNC_RETRIES)
    .bind(next_retry_at)
    .bind(if status == "success" { Some(now) } else { None })
    .bind(now)
    .bind(tenant_bind)
    .execute(&mut **txn)
    .await?;

    Ok(())
}

/// 在请求事务之外记录一条 purchase-to-inbound 失败日志（独立短事务）。
/// 写日志失败不静默：以 `target: "scm_sync"` 的 error 日志暴露。
#[allow(clippy::too_many_arguments)]
async fn log_sync_failure(
    state: &ApiState,
    purchase_order_id: Uuid,
    source_code: &str,
    message: &str,
    status: &str,
    retry_count: i32,
    tenant_bind: Uuid,
) {
    if let Err(e) = record_sync_log(
        state,
        "purchase_to_inbound",
        "scm",
        "wms",
        "purchase_order",
        purchase_order_id,
        source_code,
        None,
        "",
        "create",
        status,
        Some(message.to_string()),
        retry_count,
        tenant_bind,
    )
    .await
    {
        tracing::error!(
            target: "scm_sync",
            purchase_order_id = %purchase_order_id,
            "写同步失败日志失败: {}",
            e
        );
    }
}

/// 主 INSERT 必然失败后调用：请求事务已回滚，这里用**独立短事务**累加
/// `purchase_orders.sync_retry_count` 并写一条日志（pending / failed）。
///
/// 达到 [`MAX_SYNC_RETRIES`] 后进入失败态：日志 status = 'failed' 且
/// retry_count = MAX_SYNC_RETRIES，`retry_failed_syncs` 的
/// `retry_count < max_retries` 条件不再命中它；后续请求直接返回
/// [`SyncAttempt::AlreadyExhausted`]，不再无限重试。
///
/// 可观测信号：达上限时打 `tracing::error!(target: "scm_sync")`，
/// 并在 `scm.sync_logs` 留下 status = 'failed' 的失败记录。
async fn record_failed_sync_attempt(
    state: &ApiState,
    purchase_order_id: Uuid,
    tenant_bind: Uuid,
    error_message: &str,
) -> Result<SyncAttempt, sqlx::Error> {
    let mut txn = state.db.begin().await?;

    let row = sqlx::query(only_own_schema_query!(
        "scm",
        r#"
        SELECT sync_retry_count, po_no
        FROM scm.purchase_orders
        WHERE id = $1 AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $2::uuid)
        FOR UPDATE
        "#
    ))
    .bind(purchase_order_id)
    .bind(tenant_bind)
    .fetch_optional(&mut *txn)
    .await?;

    let Some(row) = row else {
        txn.rollback().await?;
        return Ok(SyncAttempt::NotFound);
    };

    let current: i32 = row.try_get("sync_retry_count")?;
    let po_no: String = row.try_get("po_no")?;

    if current >= MAX_SYNC_RETRIES {
        txn.rollback().await?;
        return Ok(SyncAttempt::AlreadyExhausted {
            retry_count: current,
        });
    }

    let retry_count = current + 1;
    let exhausted = retry_count >= MAX_SYNC_RETRIES;
    let now = Utc::now();

    sqlx::query(only_own_schema_query!(
        "scm",
        r#"
        UPDATE scm.purchase_orders
        SET sync_error = $2, sync_retry_count = $3, last_sync_at = $4, updated_at = $4
        WHERE id = $1 AND ($5 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $5::uuid)
        "#
    ))
    .bind(purchase_order_id)
    .bind(error_message)
    .bind(retry_count)
    .bind(now)
    .bind(tenant_bind)
    .execute(&mut *txn)
    .await?;

    record_sync_log_txn(
        &mut txn,
        "purchase_to_inbound",
        "scm",
        "wms",
        "purchase_order",
        purchase_order_id,
        &po_no,
        None,
        "",
        "create",
        if exhausted { "failed" } else { "pending" },
        Some(error_message.to_string()),
        retry_count,
        tenant_bind,
    )
    .await?;

    txn.commit().await?;

    if exhausted {
        tracing::error!(
            target: "scm_sync",
            purchase_order_id = %purchase_order_id,
            retry_count,
            max_retries = MAX_SYNC_RETRIES,
            error = %error_message,
            "采购订单转入库单达到最大重试次数，进入失败态（不再自动重试，需人工处理）"
        );
        Ok(SyncAttempt::Exhausted { retry_count })
    } else {
        tracing::warn!(
            target: "scm_sync",
            purchase_order_id = %purchase_order_id,
            retry_count,
            max_retries = MAX_SYNC_RETRIES,
            error = %error_message,
            "采购订单转入库单失败，已记录重试计数"
        );
        Ok(SyncAttempt::Retry { retry_count })
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["scm:sync:write"])),
    path = "/sync/supplier-from-srm",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM/sync"
)]
pub async fn sync_supplier_from_srm(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<SyncSupplierRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let tenant_bind = tenant_bind_value(&claims);
    let supplier_id = match Uuid::parse_str(&req.supplier_id) {
        Ok(id) => id,
        Err(_) => {
            return ApiResponse::success(
                serde_json::json!({
                    "success": false,
                    "message": "供应商ID格式错误".to_string(),
                    "supplier_id": null,
                    "action": "none",
                }),
                "供应商ID格式错误",
            );
        }
    };

    let srm_supplier = sqlx::query_as::<
        _,
        (
            Uuid,
            String,
            Option<String>,
            Option<String>,
            Option<String>,
            Option<String>,
            Option<String>,
            Option<String>,
            Option<String>,
            String,
        ),
    >(
        only_own_schema_query!("scm", r#"
        SELECT id, supplier_name, legal_name, contact_name, contact_phone, contact_email, address, tax_id, website, status
        FROM scm.srm_supplier_snapshots
        WHERE id = $1 AND status != 'deleted' AND deleted_at IS NULL AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $2::uuid)
        "#),
    )
    .bind(supplier_id)
    .bind(tenant_bind)
    .fetch_optional(&mut **txn)
    .await;

    let (id, name, legal_name, contact_person, phone, email, address, tax_number, _website, status) =
        match srm_supplier {
            Ok(Some(s)) => s,
            Ok(None) => {
                if let Some(t) = guard.take() {
                    if let Err(e) = t.commit().await {
                        tracing::error!("rls commit failed: {}", e);
                        return ApiResponse::server_error("提交事务失败");
                    }
                }
                return ApiResponse::success(
                    serde_json::json!({
                        "success": false,
                        "message": "SRM供应商不存在".to_string(),
                        "supplier_id": supplier_id,
                        "action": "none",
                    }),
                    "SRM供应商不存在",
                );
            }
            Err(e) => {
                tracing::error!("查询SRM供应商失败: {}", e);
                return ApiResponse::from(TopemsError::Internal("查询SRM供应商失败".to_string()));
            }
        };

    let existing_count = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "scm",
        "SELECT COUNT(*) FROM scm.suppliers WHERE id = $1 AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $2::uuid)"
    ))
    .bind(id)
    .bind(tenant_bind)
    .fetch_one(&mut **txn)
    .await
    .unwrap_or(0);

    let now = Utc::now();
    let action = if existing_count > 0 {
        "update"
    } else {
        "create"
    };

    if existing_count > 0 {
        let result = sqlx::query(only_own_schema_query!(
            "scm",
            r#"
            UPDATE scm.suppliers SET name = $2, legal_name = $3, contact_person = $4, 
                                 phone = $5, email = $6, address = $7, 
                                 tax_id = $8, status = $9, sync_from_srm = TRUE,
                                 srm_supplier_id = $10, sync_retry_count = 0, 
                                 sync_error = NULL, last_sync_at = $11, updated_at = $11
            WHERE id = $1 AND ($12 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $12::uuid)
            "#
        ))
        .bind(id)
        .bind(&name)
        .bind(legal_name)
        .bind(contact_person)
        .bind(phone)
        .bind(email)
        .bind(address)
        .bind(tax_number)
        .bind(&status)
        .bind(id)
        .bind(now)
        .bind(tenant_bind)
        .execute(&mut **txn)
        .await;

        match result {
            Ok(_) => {
                let _ = record_sync_log(
                    &state,
                    "supplier_sync",
                    "srm",
                    "scm",
                    "supplier",
                    id,
                    "",
                    Some(id),
                    "",
                    action,
                    "success",
                    None,
                    0,
                    tenant_bind,
                )
                .await;
                if let Some(t) = guard.take() {
                    if let Err(e) = t.commit().await {
                        tracing::error!("rls commit failed: {}", e);
                        return ApiResponse::from(TopemsError::Internal(
                            "提交事务失败".to_string(),
                        ));
                    }
                }
                ApiResponse::success(
                    serde_json::json!({
                        "success": true,
                        "message": "供应商信息更新成功".to_string(),
                        "supplier_id": id,
                        "action": "updated",
                    }),
                    "供应商同步成功",
                )
            }
            Err(e) => {
                tracing::error!("更新供应商失败: {}", e);
                let _ = record_sync_log(
                    &state,
                    "supplier_sync",
                    "srm",
                    "scm",
                    "supplier",
                    id,
                    "",
                    None,
                    "",
                    action,
                    "failed",
                    Some(e.to_string()),
                    0,
                    tenant_bind,
                )
                .await;
                ApiResponse::from(TopemsError::Internal("更新供应商失败".to_string()))
            }
        }
    } else {
        let result = sqlx::query(only_own_schema_query!(
            "scm",
            r#"
            INSERT INTO scm.suppliers (id, name, legal_name, contact_person, phone, 
                                   email, address, tax_id, status, sync_from_srm,
                                   srm_supplier_id, sync_retry_count, last_sync_at,
                                   created_at, updated_at, tenant_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, $10, 0, $11, $12, $13, $14)
            "#
        ))
        .bind(id)
        .bind(&name)
        .bind(legal_name)
        .bind(contact_person)
        .bind(phone)
        .bind(email)
        .bind(address)
        .bind(tax_number)
        .bind(&status)
        .bind(id)
        .bind(now)
        .bind(now)
        .bind(now)
        .bind(tenant_bind)
        .execute(&mut **txn)
        .await;

        match result {
            Ok(_) => {
                let _ = record_sync_log(
                    &state,
                    "supplier_sync",
                    "srm",
                    "scm",
                    "supplier",
                    id,
                    "",
                    Some(id),
                    "",
                    action,
                    "success",
                    None,
                    0,
                    tenant_bind,
                )
                .await;
                if let Some(t) = guard.take() {
                    if let Err(e) = t.commit().await {
                        tracing::error!("rls commit failed: {}", e);
                        return ApiResponse::from(TopemsError::Internal(
                            "提交事务失败".to_string(),
                        ));
                    }
                }
                ApiResponse::success(
                    serde_json::json!({
                        "success": true,
                        "message": "供应商创建成功".to_string(),
                        "supplier_id": id,
                        "action": "created",
                    }),
                    "供应商同步成功",
                )
            }
            Err(e) => {
                tracing::error!("创建供应商失败: {}", e);
                let _ = record_sync_log(
                    &state,
                    "supplier_sync",
                    "srm",
                    "scm",
                    "supplier",
                    id,
                    "",
                    None,
                    "",
                    action,
                    "failed",
                    Some(e.to_string()),
                    0,
                    tenant_bind,
                )
                .await;
                ApiResponse::from(TopemsError::Internal("创建供应商失败".to_string()))
            }
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["scm:sync:write"])),
    path = "/sync/suppliers-from-srm",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM/sync"
)]
pub async fn sync_all_suppliers_from_srm(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let tenant_bind = tenant_bind_value(&claims);
    let srm_suppliers = sqlx::query_as::<
        _,
        (
            Uuid,
            String,
            Option<String>,
            Option<String>,
            Option<String>,
            Option<String>,
            Option<String>,
            Option<String>,
            Option<String>,
            String,
        ),
    >(
        only_own_schema_query!("scm", r#"
        SELECT id, supplier_name, legal_name, contact_name, contact_phone, contact_email, address, tax_id, website, status
        FROM scm.srm_supplier_snapshots
        WHERE status != 'deleted' AND deleted_at IS NULL AND ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $1::uuid)
        "#),
    )
    .bind(tenant_bind)
    .fetch_all(&mut **txn)
    .await;

    let srm_suppliers = match srm_suppliers {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("查询SRM供应商列表失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询SRM供应商列表失败".to_string()));
        }
    };

    let total_count = srm_suppliers.len();
    let mut created_count = 0;
    let mut updated_count = 0;
    let mut failed_count = 0;
    let now = Utc::now();

    for (
        id,
        name,
        legal_name,
        contact_person,
        phone,
        email,
        address,
        tax_number,
        _website,
        status,
    ) in srm_suppliers
    {
        let existing = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
            "scm",
            "SELECT COUNT(*) FROM scm.suppliers WHERE id = $1 AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $2::uuid)"
        ))
        .bind(id)
        .bind(tenant_bind)
        .fetch_one(&mut **txn)
        .await;

        if existing.unwrap_or(0) > 0 {
            let result = sqlx::query(only_own_schema_query!(
                "scm",
                r#"
                UPDATE scm.suppliers SET name = $2, legal_name = $3, contact_person = $4, 
                                     phone = $5, email = $6, address = $7, 
                                     tax_id = $8, status = $9, sync_from_srm = TRUE,
                                     srm_supplier_id = $10, sync_retry_count = 0, 
                                     sync_error = NULL, last_sync_at = $11, updated_at = $11
                WHERE id = $1 AND ($12 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $12::uuid)
                "#
            ))
            .bind(id)
            .bind(&name)
            .bind(legal_name)
            .bind(contact_person)
            .bind(phone)
            .bind(email)
            .bind(address)
            .bind(tax_number)
            .bind(&status)
            .bind(id)
            .bind(now)
            .bind(tenant_bind)
            .execute(&mut **txn)
            .await;

            if result.is_ok() {
                updated_count += 1;
            } else {
                failed_count += 1;
            }
        } else {
            let result = sqlx::query(only_own_schema_query!(
                "scm",
                r#"
                INSERT INTO scm.suppliers (id, name, legal_name, contact_person, phone, 
                                       email, address, tax_id, status, sync_from_srm,
                                       srm_supplier_id, sync_retry_count, last_sync_at,
                                       created_at, updated_at, tenant_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, $10, 0, $11, $12, $13, $14)
                "#
            ))
            .bind(id)
            .bind(&name)
            .bind(legal_name)
            .bind(contact_person)
            .bind(phone)
            .bind(email)
            .bind(address)
            .bind(tax_number)
            .bind(&status)
            .bind(id)
            .bind(now)
            .bind(now)
            .bind(now)
            .bind(tenant_bind)
            .execute(&mut **txn)
            .await;

            if result.is_ok() {
                created_count += 1;
            } else {
                failed_count += 1;
            }
        }
    }

    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("rls commit failed: {}", e);
            return ApiResponse::from(TopemsError::Internal("提交事务失败".to_string()));
        }
    }

    ApiResponse::success(
        serde_json::json!({
            "total_processed": total_count,
            "created": created_count,
            "updated": updated_count,
            "failed": failed_count
        }),
        "供应商批量同步完成",
    )
}

#[derive(Debug, Deserialize, Serialize)]
pub struct SyncLogsRequest {
    pub sync_type: Option<String>,
    pub status: Option<String>,
    pub source_module: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["scm:sync:write"])),
    path = "/sync/sync-logs",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM/sync"
)]
pub async fn get_sync_logs(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<SyncLogsRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let tenant_bind = tenant_bind_value(&claims);
    let page = req.page.unwrap_or(1).max(1);
    let page_size = req.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let rows = sqlx::query(only_own_schema_query!(
        "scm",
        r#"
        SELECT id, sync_type, source_module, target_module, source_entity,
               source_id, source_code, target_id, target_code, operation, status,
               error_message, retry_count, max_retries, next_retry_at, executed_at, created_at
        FROM scm.sync_logs
        WHERE ($1::text IS NULL OR sync_type = $1)
          AND ($2::text IS NULL OR status = $2)
          AND ($3::text IS NULL OR source_module = $3)
          AND ($6 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $6::uuid)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#
    ))
    .bind(&req.sync_type)
    .bind(&req.status)
    .bind(&req.source_module)
    .bind(page_size)
    .bind(offset)
    .bind(tenant_bind)
    .fetch_all(&mut **txn)
    .await;

    match rows {
        Ok(rows) => {
            let logs: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|row| {
                    serde_json::json!({
                        "id": row.get::<Uuid, _>("id"),
                        "sync_type": row.get::<String, _>("sync_type"),
                        "source_module": row.get::<String, _>("source_module"),
                        "target_module": row.get::<String, _>("target_module"),
                        "source_entity": row.get::<String, _>("source_entity"),
                        "source_id": row.get::<Option<Uuid>, _>("source_id"),
                        "source_code": row.get::<Option<String>, _>("source_code"),
                        "target_id": row.get::<Option<Uuid>, _>("target_id"),
                        "target_code": row.get::<Option<String>, _>("target_code"),
                        "operation": row.get::<String, _>("operation"),
                        "status": row.get::<String, _>("status"),
                        "error_message": row.get::<Option<String>, _>("error_message"),
                        "retry_count": row.get::<i32, _>("retry_count"),
                        "max_retries": row.get::<i32, _>("max_retries"),
                        "next_retry_at": row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("next_retry_at"),
                        "executed_at": row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("executed_at"),
                        "created_at": row.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
                    })
                })
                .collect();
            ApiResponse::success(serde_json::json!({ "logs": logs }), "同步日志查询成功")
        }
        Err(e) => {
            tracing::error!("查询同步日志失败: {}", e);
            ApiResponse::from(TopemsError::Internal("查询同步日志失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["scm:sync:write"])),
    path = "/sync/retry-failed",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM/sync"
)]
#[allow(clippy::as_conversions)]
pub async fn retry_failed_syncs(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<RetryFailedRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let tenant_bind = tenant_bind_value(&claims);
    let sync_type_filter = req.sync_type.clone();
    let max_retries = req.max_retries.unwrap_or(3);
    let now = Utc::now();

    let failed_syncs = sqlx::query(only_own_schema_query!(
        "scm",
        r#"
        SELECT id, sync_type, source_module, target_module, source_entity,
               source_id, source_code, operation, retry_count
        FROM scm.sync_logs
        WHERE status = 'failed'
          AND ($1::text IS NULL OR sync_type = $1)
          AND retry_count < $2
          AND ($3 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $3::uuid)
        ORDER BY created_at DESC
        "#
    ))
    .bind(sync_type_filter)
    .bind(max_retries as i64)
    .bind(tenant_bind)
    .fetch_all(&mut **txn)
    .await;

    match failed_syncs {
        Ok(sync_rows) => {
            let total_count = sync_rows.len();
            let mut retried_count = 0;
            let mut skipped_count = 0;

            for row in sync_rows {
                let sync_id: Uuid = row.get("id");
                let sync_entity: String = row.get("source_entity");
                let sync_source_id: Option<Uuid> = row.get("source_id");
                let sync_retry_count: i32 = row.get("retry_count");
                let new_retry_count = sync_retry_count + 1;

                let update_result = sqlx::query(only_own_schema_query!(
                    "scm",
                    r#"
                    UPDATE scm.sync_logs 
                    SET status = 'pending', retry_count = $2, 
                        next_retry_at = $3, updated_at = $4
                    WHERE id = $1 AND ($5 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $5::uuid)
                    "#
                ))
                .bind(sync_id)
                .bind(new_retry_count)
                .bind(now + Duration::seconds((new_retry_count * 60).into()))
                .bind(now)
                .bind(tenant_bind)
                .execute(&mut **txn)
                .await;

                if update_result.is_ok() {
                    retried_count += 1;

                    if sync_entity == "purchase_order" {
                        if let Some(source_id) = sync_source_id {
                            let _ = sqlx::query(only_own_schema_query!(
                                "scm",
                                r#"
                                UPDATE scm.purchase_orders 
                                SET sync_retry_count = $2, sync_error = NULL, last_sync_at = $3
                                WHERE id = $1 AND ($4 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $4::uuid)
                                "#
                            ))
                            .bind(source_id)
                            .bind(new_retry_count)
                            .bind(now)
                            .bind(tenant_bind)
                            .execute(&mut **txn)
                            .await;
                        }
                    }
                } else {
                    skipped_count += 1;
                }
            }

            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return ApiResponse::from(TopemsError::Internal("提交事务失败".to_string()));
                }
            }

            ApiResponse::success(
                serde_json::json!({
                    "total_failed": total_count,
                    "retried": retried_count,
                    "skipped": skipped_count,
                    "max_retries": max_retries,
                }),
                "重试操作完成",
            )
        }
        Err(e) => {
            tracing::error!("查询失败同步记录失败: {}", e);
            ApiResponse::from(TopemsError::Internal("查询失败同步记录失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["scm:sync:write"])),
    path = "/sync/statistics",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM/sync"
)]
pub async fn get_sync_statistics(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> ApiResponse<SyncStatistics> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let tenant_bind = tenant_bind_value(&claims);
    let total_syncs: i64 = sqlx::query_scalar(only_own_schema_query!(
        "scm",
        "SELECT COUNT(*) FROM scm.sync_logs WHERE ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $1::uuid)"
    ))
    .bind(tenant_bind)
    .fetch_one(&mut **txn)
    .await
    .unwrap_or(0);

    let success_count: i64 = sqlx::query_scalar(only_own_schema_query!(
        "scm",
        "SELECT COUNT(*) FROM scm.sync_logs WHERE status = 'success' AND ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $1::uuid)"
    ))
    .bind(tenant_bind)
    .fetch_one(&mut **txn)
    .await
    .unwrap_or(0);

    let failed_count: i64 = sqlx::query_scalar(only_own_schema_query!(
        "scm",
        "SELECT COUNT(*) FROM scm.sync_logs WHERE status = 'failed' AND ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $1::uuid)"
    ))
    .bind(tenant_bind)
    .fetch_one(&mut **txn)
    .await
    .unwrap_or(0);

    let pending_count: i64 = sqlx::query_scalar(only_own_schema_query!(
        "scm",
        "SELECT COUNT(*) FROM scm.sync_logs WHERE status = 'pending' AND ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $1::uuid)"
    ))
    .bind(tenant_bind)
    .fetch_one(&mut **txn)
    .await
    .unwrap_or(0);

    let in_progress_count: i64 = sqlx::query_scalar(only_own_schema_query!(
        "scm",
        "SELECT COUNT(*) FROM scm.sync_logs WHERE status = 'in_progress' AND ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $1::uuid)"
    ))
    .bind(tenant_bind)
    .fetch_one(&mut **txn)
    .await
    .unwrap_or(0);

    let retry_needed_count: i64 = sqlx::query_scalar(only_own_schema_query!(
        "scm",
        r#"
        SELECT COUNT(*) FROM scm.sync_logs 
        WHERE status = 'pending' AND next_retry_at IS NOT NULL AND next_retry_at <= NOW()
          AND ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $1::uuid)
        "#
    ))
    .bind(tenant_bind)
    .fetch_one(&mut **txn)
    .await
    .unwrap_or(0);

    let statistics = SyncStatistics {
        total_syncs,
        success_count,
        failed_count,
        pending_count,
        in_progress_count,
        retry_needed_count,
    };

    ApiResponse::success(statistics, "获取同步统计成功")
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["scm:sync:write"])),
    path = "/sync/purchase-batch",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM/sync"
)]
pub async fn batch_sync_purchase_to_wms(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> ApiResponse<BatchSyncResult> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let tenant_bind = tenant_bind_value(&claims);
    let approved_po = sqlx::query_as::<_, PurchaseOrder>(
        only_own_schema_query!("scm", r#"
        SELECT id, po_no AS order_number, supplier_id, order_date, delivery_date, total_amount, status, remarks, created_at, updated_at
        FROM scm.purchase_orders
        WHERE status = 'approved' AND is_synced_to_wms = FALSE AND ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $1::uuid)
        ORDER BY created_at ASC
        "#),
    )
    .bind(tenant_bind)
    .fetch_all(&mut **txn)
    .await;

    match approved_po {
        Ok(purchase_orders) => {
            let total_count = purchase_orders.len();
            let mut success_count = 0;
            let mut failed_count = 0;
            let mut retry_count = 0;
            let mut errors: Vec<SyncErrorDetail> = Vec::new();
            let now = Utc::now();
            // D6：事务内不 emit，收集待发布事件，commit 成功后统一发布。
            let mut pending_events: Vec<InboundOrderRequestedPayload> = Vec::new();

            for po in purchase_orders {
                // B-0：判重键与单条链路一致，用 purchase_order_id（写入的是 'INB-'||po_no，
                // 旧实现拿 po_no 比 order_number 永不命中）。
                let existing_inbound = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                    "scm",
                    "SELECT COUNT(*) FROM scm.wms_inbound_order_snapshots WHERE purchase_order_id = $1 AND deleted_at IS NULL AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $2::uuid)"
                ))
                .bind(po.id)
                .bind(tenant_bind)
                .fetch_one(&mut **txn)
                .await
                .unwrap_or(0);

                if existing_inbound > 0 {
                    let _ = sqlx::query(
                        only_own_schema_query!("scm", "UPDATE scm.purchase_orders SET is_synced_to_wms = TRUE, updated_at = $2 WHERE id = $1 AND ($3 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $3::uuid)")
                    )
                    .bind(po.id)
                    .bind(now)
                    .bind(tenant_bind)
                    .execute(&mut **txn)
                    .await;
                    success_count += 1;
                    continue;
                }

                let inbound_id = Uuid::new_v4();
                let inbound_order_number = format!("INB-{}", po.order_number);

                let result = sqlx::query(only_own_schema_query!(
                    "scm",
                    r#"
                    INSERT INTO scm.wms_inbound_order_snapshots
                        (id, order_number, warehouse_id, supplier_id,
                         order_type, status, purchase_order_id, purchase_order_number,
                         received_at, tenant_id, synced_at, created_at, updated_at)
                    VALUES ($1, $2, NULL, $3, 'purchase', 'pending', $4, $5,
                            NULL, $7, $6, $6, $6)
                    "#
                ))
                .bind(inbound_id)
                .bind(&inbound_order_number)
                .bind(po.supplier_id)
                .bind(po.id)
                .bind(&po.order_number)
                .bind(now)
                .bind(tenant_bind)
                .execute(&mut **txn)
                .await;

                let tenant_id: Option<Uuid> = sqlx::query_scalar(
                    "SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid",
                )
                .fetch_optional(&mut **txn)
                .await
                .ok()
                .flatten();

                match result {
                    Ok(_) => {
                        // D6：收集 payload，事务 commit 成功后统一发布（此处不 emit）。
                        pending_events.push(InboundOrderRequestedPayload {
                            inbound_order_id: inbound_id,
                            inbound_order_number: inbound_order_number.clone(),
                            warehouse_id: None,
                            supplier_id: po.supplier_id,
                            purchase_order_id: po.id,
                            purchase_order_number: po.order_number.clone(),
                            requested_at: now,
                            tenant_id,
                        });

                        let _ = sqlx::query(only_own_schema_query!(
                            "scm",
                            r#"
                            UPDATE scm.purchase_orders 
                            SET status = 'in_transit', inbound_order_id = $2, 
                                inbound_order_number = $3, is_synced_to_wms = TRUE, 
                                sync_retry_count = 0, sync_error = NULL, last_sync_at = $4,
                                updated_at = $4
                            WHERE id = $1 AND ($5 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $5::uuid)
                            "#
                        ))
                        .bind(po.id)
                        .bind(inbound_id)
                        .bind(&inbound_order_number)
                        .bind(now)
                        .bind(tenant_bind)
                        .execute(&mut **txn)
                        .await;

                        let _ = record_sync_log(
                            &state,
                            "purchase_to_inbound",
                            "scm",
                            "wms",
                            "purchase_order",
                            po.id,
                            &po.order_number,
                            Some(inbound_id),
                            &inbound_order_number,
                            "create",
                            "success",
                            None,
                            0,
                            tenant_bind,
                        )
                        .await;

                        success_count += 1;
                    }
                    Err(e) => {
                        let po_retry_count = sqlx::query_scalar::<_, i32>(only_own_schema_query!(
                            "scm",
                            "SELECT sync_retry_count FROM scm.purchase_orders WHERE id = $1 AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $2::uuid)"
                        ))
                        .bind(po.id)
                        .fetch_one(&mut **txn)
                        .await
                        .unwrap_or(0);

                        let new_retry_count = po_retry_count + 1;

                        if new_retry_count >= 3 {
                            failed_count += 1;
                            errors.push(SyncErrorDetail {
                                source_id: po.id.to_string(),
                                source_code: Some(po.order_number.clone()),
                                error: e.to_string(),
                            });

                            let _ = record_sync_log(
                                &state,
                                "purchase_to_inbound",
                                "scm",
                                "wms",
                                "purchase_order",
                                po.id,
                                &po.order_number,
                                None,
                                "",
                                "create",
                                "failed",
                                Some(e.to_string()),
                                new_retry_count,
                                tenant_bind,
                            )
                            .await;
                        } else {
                            retry_count += 1;
                            let _ = sqlx::query(
                                only_own_schema_query!("scm", r#"
                                UPDATE scm.purchase_orders 
                                SET sync_error = $2, sync_retry_count = $3, last_sync_at = $4, updated_at = $4
                                WHERE id = $1 AND ($5 = '00000000-0000-0000-0000-000000000000' OR tenant_id = $5::uuid)
                                "#),
                            )
                            .bind(po.id)
                            .bind(e.to_string())
                            .bind(new_retry_count)
                            .bind(now)
                            .bind(tenant_bind)
                            .execute(&mut **txn)
                            .await;

                            let _ = record_sync_log(
                                &state,
                                "purchase_to_inbound",
                                "scm",
                                "wms",
                                "purchase_order",
                                po.id,
                                &po.order_number,
                                None,
                                "",
                                "create",
                                "pending",
                                Some(e.to_string()),
                                new_retry_count,
                                tenant_bind,
                            )
                            .await;
                        }
                    }
                }
            }

            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return ApiResponse::from(TopemsError::Internal("提交事务失败".to_string()));
                }
            }

            // D6：commit 成功后统一发布本批事件；失败入 ZSET 重试队列。
            for payload in pending_events {
                emit_inbound_after_commit(&state, Some(payload)).await;
            }

            ApiResponse::success(
                BatchSyncResult {
                    total_count,
                    success_count,
                    failed_count,
                    retry_count,
                    errors,
                },
                "批量同步完成",
            )
        }
        Err(e) => {
            tracing::error!("查询待同步采购订单失败: {}", e);
            ApiResponse::from(TopemsError::Internal("查询待同步采购订单失败".to_string()))
        }
    }
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ConsistencyCheckResult {
    pub check_type: String,
    pub total_records: i64,
    pub consistent_count: i64,
    pub inconsistent_count: i64,
    pub details: Vec<InconsistencyDetail>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct InconsistencyDetail {
    pub source_id: String,
    pub source_code: Option<String>,
    pub target_id: Option<String>,
    pub target_code: Option<String>,
    pub inconsistency_type: String,
    pub description: String,
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["scm:sync:write"])),
    path = "/sync/consistency-check",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM/sync"
)]
pub async fn check_consistency(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> ApiResponse<Vec<ConsistencyCheckResult>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let tenant_bind = tenant_bind_value(&claims);
    let mut results: Vec<ConsistencyCheckResult> = Vec::new();

    let purchase_inbound_result = check_purchase_inbound_consistency(&mut *txn, tenant_bind).await;
    results.push(purchase_inbound_result);

    let supplier_sync_result = check_supplier_sync_consistency(&mut *txn, tenant_bind).await;
    results.push(supplier_sync_result);

    ApiResponse::success(results, "一致性检查完成")
}

pub async fn check_purchase_inbound_consistency(
    db: &mut sqlx::PgConnection,
    tenant_bind: Uuid,
) -> ConsistencyCheckResult {
    let rows = sqlx::query(only_own_schema_query!(
        "scm",
        r#"
        SELECT po.id as po_id, po.po_no as po_number, 
               po.inbound_order_id as inbound_id, po.inbound_order_number as inbound_number,
               po.is_synced_to_wms as synced, po.status as po_status,
               io.id as wms_inbound_id, io.order_number as wms_inbound_number
        FROM scm.purchase_orders po
        LEFT JOIN scm.wms_inbound_order_snapshots io ON po.inbound_order_id = io.id
        WHERE po.status IN ('in_transit', 'delivered')
          AND ($1 = '00000000-0000-0000-0000-000000000000' OR po.tenant_id = $1::uuid)
        ORDER BY po.created_at DESC
        "#
    ))
    .bind(tenant_bind)
    .fetch_all(&mut *db)
    .await;

    let mut details: Vec<InconsistencyDetail> = Vec::new();
    let mut consistent_count = 0;
    let mut inconsistent_count = 0;

    if let Ok(rows) = rows {
        for row in rows {
            let po_id: Uuid = row.get("po_id");
            let po_number: String = row.get("po_number");
            let inbound_id: Option<Uuid> = row.get("inbound_id");
            let inbound_number: Option<String> = row.get("inbound_number");
            let synced: bool = row.get("synced");
            let wms_inbound_id: Option<Uuid> = row.get("wms_inbound_id");

            if synced && inbound_id.is_some() && wms_inbound_id.is_none() {
                details.push(InconsistencyDetail {
                    source_id: po_id.to_string(),
                    source_code: Some(po_number),
                    target_id: inbound_id.map(|id| id.to_string()),
                    target_code: inbound_number,
                    inconsistency_type: "orphan_reference".to_string(),
                    description: "采购订单引用了不存在的入库单".to_string(),
                });
                inconsistent_count += 1;
            } else if !synced && inbound_id.is_some() {
                details.push(InconsistencyDetail {
                    source_id: po_id.to_string(),
                    source_code: Some(po_number),
                    target_id: inbound_id.map(|id| id.to_string()),
                    target_code: inbound_number,
                    inconsistency_type: "status_mismatch".to_string(),
                    description: "同步状态与引用状态不一致".to_string(),
                });
                inconsistent_count += 1;
            } else {
                consistent_count += 1;
            }
        }
    }

    ConsistencyCheckResult {
        check_type: "purchase_order_inbound".to_string(),
        total_records: consistent_count + inconsistent_count,
        consistent_count,
        inconsistent_count,
        details,
    }
}

pub async fn check_supplier_sync_consistency(
    db: &mut sqlx::PgConnection,
    tenant_bind: Uuid,
) -> ConsistencyCheckResult {
    let rows = sqlx::query(only_own_schema_query!(
        "scm",
        r#"
        SELECT s.id as scm_id, s.name as scm_name, s.sync_from_srm as scm_sync_from_srm,
               ssn.id as srm_id, ssn.supplier_name as srm_name
        FROM scm.suppliers s
        FULL OUTER JOIN scm.srm_supplier_snapshots ssn ON s.id = ssn.id
        WHERE (s.id IS NOT NULL OR ssn.id IS NOT NULL)
          AND s.status != 'deleted' AND (ssn.status IS NULL OR ssn.status != 'deleted')
          AND ($1 = '00000000-0000-0000-0000-000000000000' OR s.tenant_id = $1::uuid OR s.id IS NULL)
          AND ($1 = '00000000-0000-0000-0000-000000000000' OR ssn.tenant_id = $1::uuid OR ssn.id IS NULL)
        ORDER BY COALESCE(s.created_at, ssn.synced_at) DESC
        "#
    ))
    .bind(tenant_bind)
    .fetch_all(&mut *db)
    .await;

    let mut details: Vec<InconsistencyDetail> = Vec::new();
    let mut consistent_count = 0;
    let mut inconsistent_count = 0;

    if let Ok(rows) = rows {
        for row in rows {
            let scm_id: Option<Uuid> = row.get("scm_id");
            let scm_name: Option<String> = row.get("scm_name");
            let scm_sync_from_srm: Option<bool> = row.get("scm_sync_from_srm");
            let srm_id: Option<Uuid> = row.get("srm_id");
            let srm_name: Option<String> = row.get("srm_name");

            if scm_id.is_some() && srm_id.is_none() {
                details.push(InconsistencyDetail {
                    source_id: scm_id.map(|id| id.to_string()).unwrap_or_default(),
                    source_code: scm_name,
                    target_id: None,
                    target_code: None,
                    inconsistency_type: "missing_in_target".to_string(),
                    description: "SCM供应商在SRM快照中不存在".to_string(),
                });
                inconsistent_count += 1;
            } else if srm_id.is_some() && scm_id.is_none() {
                details.push(InconsistencyDetail {
                    source_id: srm_id.map(|id| id.to_string()).unwrap_or_default(),
                    source_code: srm_name,
                    target_id: None,
                    target_code: None,
                    inconsistency_type: "missing_in_source".to_string(),
                    description: "SRM供应商在SCM中不存在".to_string(),
                });
                inconsistent_count += 1;
            } else if scm_id.is_some() && srm_id.is_some() {
                let scm_sync = scm_sync_from_srm.unwrap_or(false);

                if !scm_sync {
                    details.push(InconsistencyDetail {
                        source_id: scm_id.map(|id| id.to_string()).unwrap_or_default(),
                        source_code: scm_name,
                        target_id: srm_id.map(|id| id.to_string()),
                        target_code: srm_name,
                        inconsistency_type: "unsynced".to_string(),
                        description: "供应商未标记为已从SRM同步".to_string(),
                    });
                    inconsistent_count += 1;
                } else {
                    consistent_count += 1;
                }
            }
        }
    }

    ConsistencyCheckResult {
        check_type: "supplier_sync".to_string(),
        total_records: consistent_count + inconsistent_count,
        consistent_count,
        inconsistent_count,
        details,
    }
}

pub async fn record_sync_log(
    state: &ApiState,
    sync_type: &str,
    source_module: &str,
    target_module: &str,
    source_entity: &str,
    source_id: Uuid,
    source_code: &str,
    target_id: Option<Uuid>,
    target_code: &str,
    operation: &str,
    status: &str,
    error_message: Option<String>,
    retry_count: i32,
    tenant_bind: Uuid,
) -> Result<(), sqlx::Error> {
    // 不再走裸池自动提交：独立短事务写日志，写失败由调用方决定如何处理，
    // 不会出现"INSERT 生效但事务已回滚"的错觉。
    let mut txn = state.db.begin().await?;
    record_sync_log_txn(
        &mut txn,
        sync_type,
        source_module,
        target_module,
        source_entity,
        source_id,
        source_code,
        target_id,
        target_code,
        operation,
        status,
        error_message,
        retry_count,
        tenant_bind,
    )
    .await?;
    txn.commit().await?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn roundtrip<T: serde::Serialize + for<'de> serde::Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn roundtrip_purchase_to_inbound_request() {
        roundtrip(&PurchaseToInboundRequest {
            purchase_order_id: "PO-001".to_string(),
            warehouse_id: Some("WH-01".to_string()),
            remarks: None,
        });
    }

    #[test]
    fn roundtrip_sync_result() {
        roundtrip(&SyncResult {
            success: true,
            message: "ok".to_string(),
            purchase_order_id: Some(Uuid::new_v4()),
            inbound_order_id: None,
            inbound_order_number: None,
        });
    }

    #[test]
    fn roundtrip_sync_supplier_request() {
        roundtrip(&SyncSupplierRequest {
            supplier_id: "SUP-01".to_string(),
        });
    }

    #[test]
    fn roundtrip_retry_failed_request() {
        roundtrip(&RetryFailedRequest {
            sync_type: Some("purchase".to_string()),
            max_retries: Some(3),
        });
    }

    #[test]
    fn roundtrip_sync_statistics() {
        roundtrip(&SyncStatistics {
            total_syncs: 10,
            success_count: 8,
            failed_count: 2,
            pending_count: 1,
            in_progress_count: 0,
            retry_needed_count: 1,
        });
    }

    #[test]
    fn roundtrip_batch_sync_result() {
        let err = SyncErrorDetail {
            source_id: "1".to_string(),
            source_code: Some("C-1".to_string()),
            error: "boom".to_string(),
        };
        roundtrip(&BatchSyncResult {
            total_count: 5,
            success_count: 4,
            failed_count: 1,
            retry_count: 0,
            errors: vec![err],
        });
    }

    #[test]
    fn roundtrip_sync_error_detail() {
        roundtrip(&SyncErrorDetail {
            source_id: "s1".to_string(),
            source_code: None,
            error: "e".to_string(),
        });
    }

    #[test]
    fn roundtrip_sync_logs_request() {
        roundtrip(&SyncLogsRequest {
            sync_type: Some("purchase".to_string()),
            status: None,
            source_module: Some("scm".to_string()),
            page: Some(1),
            page_size: Some(20),
        });
    }

    #[test]
    fn roundtrip_consistency_check_result() {
        let det = InconsistencyDetail {
            source_id: "1".to_string(),
            source_code: Some("C".to_string()),
            target_id: Some("T-1".to_string()),
            target_code: None,
            inconsistency_type: "missing".to_string(),
            description: "x".to_string(),
        };
        roundtrip(&ConsistencyCheckResult {
            check_type: "po-io".to_string(),
            total_records: 100,
            consistent_count: 99,
            inconsistent_count: 1,
            details: vec![det],
        });
    }

    #[test]
    fn roundtrip_inconsistency_detail() {
        roundtrip(&InconsistencyDetail {
            source_id: "s1".to_string(),
            source_code: None,
            target_id: None,
            target_code: Some("T".to_string()),
            inconsistency_type: "diff".to_string(),
            description: "d".to_string(),
        });
    }
}
