use axum::{
    extract::{Extension, Path, State},
    routing::{get, post, put},
    Json, Router,
};
use chrono::Utc;
use std::sync::Arc;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::{RlsTxnCell, TenantContext};
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::ApiResponse;
use topems_shared_db::scope::Db;
use topems_shared_event::event::{
    commit_retry, EventPublisher, EventType, PmProjectSettledPayload, SettlementApprovedPayload,
    SettlementCreatedPayload,
};
use uuid::Uuid;

use crate::models::settlement::{
    CreateSettlementAdjustmentRequest, CreateSettlementItemRequest, CreateSettlementRequest,
    Settlement, SettlementAdjustment, SettlementItem, UpdateSettlementItemRequest,
    UpdateSettlementRequest,
};
use crate::modules::effective_tenant_id;
use crate::modules::project_settlement_status::ProjectSettlementStatus;

#[derive(Clone)]
struct SettlementState {
    pool: Db,
    event_publisher: Option<Arc<EventPublisher>>,
}

pub fn create_routes(db: Db, event_publisher: Option<Arc<EventPublisher>>) -> Router {
    let state = SettlementState {
        pool: db,
        event_publisher,
    };
    Router::new()
        .route(
            "/projects/{project_id}/settlements",
            get(get_project_settlements).post(create_settlement),
        )
        .route(
            "/settlements/{id}",
            get(get_settlement).put(update_settlement),
        )
        .route("/settlements/{id}/approve", post(approve_settlement))
        .route(
            "/settlements/{settlement_id}/items",
            get(get_settlement_items).post(create_settlement_item),
        )
        .route(
            "/settlement-items/{id}",
            put(update_settlement_item).delete(delete_settlement_item),
        )
        .route(
            "/settlements/{settlement_id}/adjustments",
            get(get_settlement_adjustments).post(create_settlement_adjustment),
        )
        .with_state(state)
}

/// 列对齐 pm.settlements 真库（含补列）：settlement_no/settlement_type/settlement_date/amount/
/// currency/status/remarks/created_by + settlement_name/settlement_period_start/
/// settlement_period_end/approved_at。

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/projects/{project_id}/settlements",
    params(
("project_id" = String, Path, description = "project_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "settlement"
)]
async fn get_project_settlements(
    State(state): State<SettlementState>,
    Path(project_id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<Vec<Settlement>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失：请求事务未注入");
    };
    let mut scope = match state.pool.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };

    let settlements = sqlx::query_as::<_, Settlement>(
        only_own_schema_query!("pm", "SELECT id, project_id, settlement_no, settlement_name, settlement_type, status, settlement_date, amount, currency, remarks, settlement_period_start, settlement_period_end, approved_at, created_by, created_at, updated_at FROM pm.settlements WHERE project_id = $1 ORDER BY settlement_date DESC"),
    )
    .bind(project_id)
    .fetch_all(&mut scope)
    .await;

    match settlements {
        Ok(s) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交数据库事务失败: {}", e);
                return ApiResponse::server_error("提交数据库事务失败");
            }
            ApiResponse::success(s, "获取决算列表成功")
        }
        Err(e) => {
            tracing::error!("获取决算失败: {}", e);
            ApiResponse::server_error("获取决算失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/settlements/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "settlement"
)]
async fn get_settlement(
    State(state): State<SettlementState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<Settlement> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失：请求事务未注入");
    };
    let mut scope = match state.pool.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };

    let settlement =
        sqlx::query_as::<_, Settlement>(only_own_schema_query!("pm", "SELECT id, project_id, settlement_no, settlement_name, settlement_type, status, settlement_date, amount, currency, remarks, settlement_period_start, settlement_period_end, approved_at, created_by, created_at, updated_at FROM pm.settlements WHERE id = $1"))
            .bind(id)
            .fetch_one(&mut scope)
            .await;

    match settlement {
        Ok(s) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交数据库事务失败: {}", e);
                return ApiResponse::server_error("提交数据库事务失败");
            }
            ApiResponse::success(s, "获取决算详情成功")
        }
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("决算不存在"),
        Err(e) => {
            tracing::error!("获取决算失败: {}", e);
            ApiResponse::server_error("获取决算失败")
        }
    }
}

#[utoipa::path(
    security(("BearerAuth" = ["pm:write"])),
    post,
    path = "/api/pm/projects/{project_id}/settlements",
    tag = "settlement",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
async fn create_settlement(
    State(state): State<SettlementState>,
    Path(project_id): Path<Uuid>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<CreateSettlementRequest>,
) -> ApiResponse<Settlement> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let tenant_id = effective_tenant_id(&ctx, &claims);

    // 列对齐真库：settlement_code->settlement_no, description->remarks, actual_amount->amount；
    // 补 NOT NULL：settlement_date=now, amount=0, currency='CNY'。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失：请求事务未注入");
    };
    let mut scope = match state.pool.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };

    let settlement = sqlx::query_as::<_, Settlement>(
        only_own_schema_query!("pm", "INSERT INTO pm.settlements (id, project_id, settlement_no, settlement_name, settlement_type, status, settlement_date, amount, currency, remarks, settlement_period_start, settlement_period_end, approved_at, created_by, created_at, updated_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING *")
    )
    .bind(id)
    .bind(project_id)
    .bind(&req.settlement_code)
    .bind(&req.settlement_name)
    .bind(&req.settlement_type)
    .bind(ProjectSettlementStatus::DEFAULT.as_db_str())
    .bind(now)
    .bind(rust_decimal::Decimal::ZERO)
    .bind("CNY")
    .bind(&req.description)
    .bind(parse_date_opt(&req.settlement_period_start))
    .bind(parse_date_opt(&req.settlement_period_end))
    .bind(None::<chrono::DateTime<Utc>>)
    .bind(&req.created_by)
    .bind(now)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    match settlement {
        Ok(s) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交数据库事务失败: {}", e);
                return ApiResponse::server_error("提交数据库事务失败");
            }
            if let Some(ref publisher) = state.event_publisher {
                let payload = SettlementCreatedPayload {
                    id,
                    tenant_id,
                    project_id,
                    settlement_no: s.settlement_no.clone().unwrap_or_else(|| "".to_string()),
                    settlement_type: s.settlement_type.clone(),
                    status: s.status.clone(),
                    amount: Some(s.amount),
                    settlement_date: s.settlement_period_start,
                    remarks: s.remarks.clone(),
                    created_by: s.created_by.clone(),
                    created_at: now,
                };
                let et = EventType::SettlementCreated;
                if let Err(e) = publisher.publish_event(et, &payload).await {
                    tracing::warn!(
                        "[PM Settlement] 发布 SettlementCreated 失败: {}，入重试队列",
                        e
                    );
                    commit_retry::push_retry_typed("pm", et, &payload).await;
                }
            }
            ApiResponse::success(s, "创建决算成功")
        }
        Err(e) => {
            let _ = scope.rollback().await;
            tracing::error!("创建决算失败: {}", e);
            ApiResponse::server_error("创建决算失败")
        }
    }
}

#[utoipa::path(
    security(("BearerAuth" = ["pm:write"])),
    put,
    path = "/api/pm/settlements/{id}",
    tag = "settlement",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
async fn update_settlement(
    State(state): State<SettlementState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<UpdateSettlementRequest>,
) -> ApiResponse<Settlement> {
    // actual_amount->amount, description->remarks。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失：请求事务未注入");
    };
    let mut scope = match state.pool.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };

    let current = match sqlx::query_scalar::<_, String>(only_own_schema_query!(
        "pm",
        "SELECT status FROM pm.settlements WHERE id = $1"
    ))
    .bind(id)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(Some(status)) => status,
        Ok(None) => return ApiResponse::not_found("决算不存在"),
        Err(e) => {
            tracing::error!("查询决算状态失败: {}", e);
            return ApiResponse::server_error("更新决算失败");
        }
    };
    let current_status = match ProjectSettlementStatus::from_db_str(&current) {
        Some(status) => status,
        None => return ApiResponse::bad_request("存量的决算状态非法，请先修正数据"),
    };
    if current_status.is_approved() {
        return ApiResponse::conflict("已审批决算不允许修改");
    }
    let status = match req.status.as_deref() {
        None => None,
        Some(raw) => match ProjectSettlementStatus::from_db_str(raw) {
            Some(next) if next.can_transition_from(&current) => Some(next.as_db_str().to_string()),
            Some(_) => return ApiResponse::bad_request("当前决算状态不允许该流转"),
            None => return ApiResponse::bad_request("无效的决算状态"),
        },
    };

    let settlement = sqlx::query_as::<_, Settlement>(only_own_schema_query!(
        "pm",
        "UPDATE pm.settlements SET
            settlement_name = COALESCE($1, settlement_name),
            status = COALESCE($2, status),
            amount = COALESCE($3, amount),
            remarks = COALESCE($4, remarks),
            updated_at = $5
        WHERE id = $6  RETURNING *"
    ))
    .bind(req.settlement_name)
    .bind(status)
    .bind(req.actual_amount)
    .bind(req.description)
    .bind(Utc::now())
    .bind(id)
    .fetch_one(&mut scope)
    .await;

    match settlement {
        Ok(s) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交数据库事务失败: {}", e);
                return ApiResponse::server_error("提交数据库事务失败");
            }
            ApiResponse::success(s, "更新决算成功")
        }
        Err(sqlx::Error::RowNotFound) => {
            let _ = scope.rollback().await;
            ApiResponse::not_found("决算不存在")
        }
        Err(e) => {
            let _ = scope.rollback().await;
            tracing::error!("更新决算失败: {}", e);
            ApiResponse::server_error("更新决算失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["pm:settlement:write"])),
    path = "/settlements/{id}/approve",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "settlement"
)]
async fn approve_settlement(
    State(state): State<SettlementState>,
    Path(id): Path<Uuid>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<Settlement> {
    let now = Utc::now();
    // 与 INSERT 同源：superuser 会话回退默认租户，普通用户取会话租户；
    // 操作人取 JWT 真实 sub（与 pdm created_by 写法一致），不再写死 "system"。
    let tenant_id = effective_tenant_id(&ctx, &claims);
    let approved_by = claims.sub.clone();
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失：请求事务未注入");
    };
    let mut scope = match state.pool.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };

    let current = match sqlx::query_scalar::<_, String>(only_own_schema_query!(
        "pm",
        "SELECT status FROM pm.settlements WHERE id = $1"
    ))
    .bind(id)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(Some(status)) => status,
        Ok(None) => return ApiResponse::not_found("决算不存在"),
        Err(e) => {
            tracing::error!("查询决算状态失败: {}", e);
            return ApiResponse::server_error("审批决算失败");
        }
    };
    let current_status = match ProjectSettlementStatus::from_db_str(&current) {
        Some(status) => status,
        None => return ApiResponse::bad_request("存量的决算状态非法，请先修正数据"),
    };
    if !ProjectSettlementStatus::Approved.can_approve_from(current_status.as_db_str()) {
        return ApiResponse::conflict("当前决算状态不允许审批");
    }

    let settlement = sqlx::query_as::<_, Settlement>(only_own_schema_query!(
        "pm",
        "UPDATE pm.settlements SET
            status = $2,
            approved_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND status = ANY($3::text[])  RETURNING *"
    ))
    .bind(id)
    .bind(ProjectSettlementStatus::Approved.as_db_str())
    .bind(ProjectSettlementStatus::APPROVE_FROM.to_vec())
    .fetch_one(&mut scope)
    .await;

    match settlement {
        Ok(s) => {
            // 项目名称用于事件与下游应收/凭证显示；取不到就留空，不编造。
            let project: Option<(String, Option<chrono::DateTime<Utc>>)> =
                sqlx::query_as(only_own_schema_query!(
                    "pm",
                    "SELECT name, settled_at FROM pm.projects WHERE id = $1 AND deleted_at IS NULL"
                ))
                .bind(s.project_id)
                .fetch_optional(&mut scope)
                .await
                .ok()
                .flatten();

            let (project_name, already_settled) = match project {
                Some((name, settled_at)) => (name, settled_at.is_some()),
                None => (String::new(), true),
            };

            // 首次结算把结算额/时间/操作人落到项目上；已结算则保持原值不动。
            // 下游以项目为幂等键（erp 应收 REC-PROJ-{project_id}、finance 凭证 source_id=project_id），
            // 所以 PM 只在「首次结算」发布 PmProjectSettled，重复结算不再发事件。
            let newly_settled = if already_settled {
                false
            } else {
                let updated = sqlx::query(only_own_schema_query!(
                    "pm",
                    "UPDATE pm.projects
                        SET settled_amount = $1, settled_at = $2, settled_by = $3, updated_at = $2
                      WHERE id = $4 AND settled_at IS NULL AND deleted_at IS NULL"
                ))
                .bind(s.amount)
                .bind(now)
                .bind(&approved_by)
                .bind(s.project_id)
                .execute(&mut scope)
                .await;

                match updated {
                    Ok(r) => r.rows_affected() == 1,
                    Err(e) => {
                        let _ = scope.rollback().await;
                        tracing::error!("写入项目结算字段失败: {}", e);
                        return ApiResponse::server_error("写入项目结算字段失败");
                    }
                }
            };

            if let Err(e) = scope.commit().await {
                tracing::error!("提交数据库事务失败: {}", e);
                return ApiResponse::server_error("提交数据库事务失败");
            }
            if let Some(ref publisher) = state.event_publisher {
                let payload = SettlementApprovedPayload {
                    id,
                    tenant_id,
                    approved_by,
                    approved_at: now,
                };
                let et = EventType::SettlementApproved;
                if let Err(e) = publisher.publish_event(et, &payload).await {
                    tracing::warn!(
                        "[PM Settlement] 发布 SettlementApproved 失败: {}，入重试队列",
                        e
                    );
                    commit_retry::push_retry_typed("pm", et, &payload).await;
                }

                if newly_settled {
                    // 项目结算事件：finance 确认收入（借 1122 / 贷 6001），erp 生成项目应收。
                    let settled_payload = PmProjectSettledPayload {
                        project_id: s.project_id,
                        project_name,
                        settled_amount: Some(s.amount),
                        settled_by: Some(payload.approved_by.clone()),
                        settled_at: Some(now),
                        tenant_id: Some(tenant_id),
                    };
                    let et = EventType::PmProjectSettled;
                    if let Err(e) = publisher.publish_event(et, &settled_payload).await {
                        tracing::warn!(
                            "[PM Settlement] 发布 PmProjectSettled 失败: {}，入重试队列",
                            e
                        );
                        commit_retry::push_retry_typed("pm", et, &settled_payload).await;
                    }
                } else {
                    tracing::info!(
                        "[PM Settlement] 项目 {} 已结算，跳过 PmProjectSettled（幂等）",
                        s.project_id
                    );
                }
            }
            ApiResponse::success(s, "决算审批通过")
        }
        Err(sqlx::Error::RowNotFound) => {
            let _ = scope.rollback().await;
            ApiResponse::not_found("决算不存在")
        }
        Err(e) => {
            let _ = scope.rollback().await;
            tracing::error!("审批决算失败: {}", e);
            ApiResponse::server_error("审批决算失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/settlements/{settlement_id}/items",
    params(
("settlement_id" = String, Path, description = "settlement_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "settlement"
)]
async fn get_settlement_items(
    State(state): State<SettlementState>,
    Path(settlement_id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<Vec<SettlementItem>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失：请求事务未注入");
    };
    let mut scope = match state.pool.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };

    let items = sqlx::query_as::<_, SettlementItem>(
        only_own_schema_query!("pm", "SELECT id, settlement_id, item_code, item_name, category, budget_amount, actual_amount, variance_amount, variance_percent, description, expense_ref_id, contract_ref_id, created_at FROM pm.settlement_items WHERE settlement_id = $1 ORDER BY category, item_name"),
    )
    .bind(settlement_id)
    .fetch_all(&mut scope)
    .await;

    match items {
        Ok(i) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交数据库事务失败: {}", e);
                return ApiResponse::server_error("提交数据库事务失败");
            }
            ApiResponse::success(i, "获取决算项列表成功")
        }
        Err(e) => {
            tracing::error!("获取决算项失败: {}", e);
            ApiResponse::server_error("获取决算项失败")
        }
    }
}

#[utoipa::path(
    security(("BearerAuth" = ["pm:write"])),
    post,
    path = "/api/pm/settlements/{settlement_id}/items",
    tag = "settlement",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
async fn create_settlement_item(
    State(state): State<SettlementState>,
    Path(settlement_id): Path<Uuid>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<CreateSettlementItemRequest>,
) -> ApiResponse<SettlementItem> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let variance_amount = req.actual_amount - req.budget_amount;
    let variance_percent = if req.budget_amount != rust_decimal::Decimal::ZERO {
        Some((variance_amount / req.budget_amount) * rust_decimal::Decimal::from(100))
    } else {
        None
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失：请求事务未注入");
    };
    let mut scope = match state.pool.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };

    let item = sqlx::query_as::<_, SettlementItem>(
        only_own_schema_query!("pm", "INSERT INTO pm.settlement_items (id, settlement_id, item_code, item_name, category, budget_amount, actual_amount, variance_amount, variance_percent, description, expense_ref_id, contract_ref_id, created_at, updated_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *")
    )
    .bind(id)
    .bind(settlement_id)
    .bind(req.item_code)
    .bind(&req.item_name)
    .bind(req.category)
    .bind(req.budget_amount)
    .bind(req.actual_amount)
    .bind(variance_amount)
    .bind(variance_percent)
    .bind(req.description)
    .bind(req.expense_ref_id)
    .bind(req.contract_ref_id)
    .bind(now)
    .bind(now)
    .bind(effective_tenant_id(&ctx, &claims))
    .fetch_one(&mut scope)
    .await;

    match item {
        Ok(i) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交数据库事务失败: {}", e);
                return ApiResponse::server_error("提交数据库事务失败");
            }
            ApiResponse::success(i, "创建决算项成功")
        }
        Err(e) => {
            let _ = scope.rollback().await;
            tracing::error!("创建决算项失败: {}", e);
            ApiResponse::server_error("创建决算项失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["pm:write"])),
    path = "/settlement-items/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "settlement"
)]
async fn update_settlement_item(
    State(state): State<SettlementState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<UpdateSettlementItemRequest>,
) -> ApiResponse<SettlementItem> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失：请求事务未注入");
    };
    let mut scope = match state.pool.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };

    let item = sqlx::query_as::<_, SettlementItem>(
        only_own_schema_query!("pm", "UPDATE pm.settlement_items SET
            item_name = COALESCE($1, item_name),
            category = COALESCE($2, category),
            actual_amount = COALESCE($3, actual_amount),
            variance_amount = CASE WHEN $3 IS NOT NULL THEN $3 - budget_amount ELSE variance_amount END,
            variance_percent = CASE WHEN $3 IS NOT NULL AND budget_amount != 0 THEN (($3 - budget_amount) / budget_amount) * 100 ELSE variance_percent END,
            description = COALESCE($4, description),
            updated_at = $5
        WHERE id = $6  RETURNING *"),
    )
    .bind(req.item_name)
    .bind(req.category)
    .bind(req.actual_amount)
    .bind(req.description)
    .bind(Utc::now())
    .bind(id)
    .fetch_one(&mut scope)
    .await;

    match item {
        Ok(i) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交数据库事务失败: {}", e);
                return ApiResponse::server_error("提交数据库事务失败");
            }
            ApiResponse::success(i, "更新决算项成功")
        }
        Err(sqlx::Error::RowNotFound) => {
            let _ = scope.rollback().await;
            ApiResponse::not_found("决算项不存在")
        }
        Err(e) => {
            let _ = scope.rollback().await;
            tracing::error!("更新决算项失败: {}", e);
            ApiResponse::server_error("更新决算项失败")
        }
    }
}

#[utoipa::path(
    security(("BearerAuth" = ["pm:write"])),
    delete,
    path = "/api/pm/settlement-items/{id}",
    tag = "settlement",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
async fn delete_settlement_item(
    State(state): State<SettlementState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<()> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失：请求事务未注入");
    };
    let mut scope = match state.pool.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };

    let result = sqlx::query(only_own_schema_query!(
        "pm",
        "DELETE FROM pm.settlement_items WHERE id = $1 "
    ))
    .bind(id)
    .execute(&mut scope)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交数据库事务失败: {}", e);
                return ApiResponse::server_error("提交数据库事务失败");
            }
            ApiResponse::success((), "删除决算项成功")
        }
        Ok(_) => {
            let _ = scope.rollback().await;
            ApiResponse::not_found("决算项不存在")
        }
        Err(e) => {
            let _ = scope.rollback().await;
            tracing::error!("删除决算项失败: {}", e);
            ApiResponse::server_error("删除决算项失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/settlements/{settlement_id}/adjustments",
    params(
("settlement_id" = String, Path, description = "settlement_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "settlement"
)]
async fn get_settlement_adjustments(
    State(state): State<SettlementState>,
    Path(settlement_id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<Vec<SettlementAdjustment>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失：请求事务未注入");
    };
    let mut scope = match state.pool.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };

    let adjustments = sqlx::query_as::<_, SettlementAdjustment>(
        only_own_schema_query!("pm", "SELECT id, settlement_id, adjustment_type, adjustment_code, description, amount, reason, supporting_documents, created_by, created_at FROM pm.settlement_adjustments WHERE settlement_id = $1 ORDER BY created_at"),
    )
    .bind(settlement_id)
    .fetch_all(&mut scope)
    .await;

    match adjustments {
        Ok(a) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交数据库事务失败: {}", e);
                return ApiResponse::server_error("提交数据库事务失败");
            }
            ApiResponse::success(a, "获取调整项列表成功")
        }
        Err(e) => {
            tracing::error!("获取调整项失败: {}", e);
            ApiResponse::server_error("获取调整项失败")
        }
    }
}

#[utoipa::path(
    security(("BearerAuth" = ["pm:write"])),
    post,
    path = "/api/pm/settlements/{settlement_id}/adjustments",
    tag = "settlement",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
async fn create_settlement_adjustment(
    State(state): State<SettlementState>,
    Path(settlement_id): Path<Uuid>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<CreateSettlementAdjustmentRequest>,
) -> ApiResponse<SettlementAdjustment> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失：请求事务未注入");
    };
    let mut scope = match state.pool.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };

    let adjustment = sqlx::query_as::<_, SettlementAdjustment>(
        only_own_schema_query!("pm", "INSERT INTO pm.settlement_adjustments (id, settlement_id, adjustment_type, adjustment_code, description, amount, reason, supporting_documents, created_by, created_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *")
    )
    .bind(id)
    .bind(settlement_id)
    .bind(&req.adjustment_type)
    .bind(req.adjustment_code)
    .bind(req.description)
    .bind(req.amount)
    .bind(req.reason)
    .bind(req.supporting_documents)
    .bind(req.created_by)
    .bind(now)
    .bind(effective_tenant_id(&ctx, &claims))
    .fetch_one(&mut scope)
    .await;

    match adjustment {
        Ok(a) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交数据库事务失败: {}", e);
                return ApiResponse::server_error("提交数据库事务失败");
            }
            ApiResponse::success(a, "创建调整项成功")
        }
        Err(e) => {
            let _ = scope.rollback().await;
            tracing::error!("创建调整项失败: {}", e);
            ApiResponse::server_error("创建调整项失败")
        }
    }
}

fn parse_date_opt(date_str: &Option<String>) -> Option<chrono::DateTime<chrono::Utc>> {
    date_str
        .as_ref()
        .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
        .map(|d| d.with_timezone(&chrono::Utc))
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Datelike;
    use sqlx::postgres::PgConnectOptions;
    use sqlx::PgPool;
    use std::str::FromStr;

    fn make_pool() -> PgPool {
        let opts = PgConnectOptions::from_str("postgres://localhost/test").unwrap();
        sqlx::Pool::connect_lazy_with(opts)
    }

    #[tokio::test]
    async fn test_create_routes_returns_router() {
        let router = create_routes(Db::new(make_pool(), "pm, public, shared"), None);
        let _ = router;
    }

    #[test]
    fn test_parse_date_opt_none() {
        assert!(parse_date_opt(&None).is_none());
    }

    #[test]
    fn test_parse_date_opt_valid() {
        let s = Some("2026-09-01T14:00:00Z".to_string());
        let r = parse_date_opt(&s);
        assert!(r.is_some());
        let dt = r.unwrap();
        assert_eq!(dt.year(), 2026);
        assert_eq!(dt.month(), 9);
    }

    #[test]
    fn test_parse_date_opt_invalid() {
        assert!(parse_date_opt(&Some("bad".to_string())).is_none());
    }
}
