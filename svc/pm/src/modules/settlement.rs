use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    routing::{get, post, put},
    Json, Router,
};
use chrono::Utc;
use sqlx::PgPool;
use std::sync::Arc;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::TenantContext;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::ApiResponse;
use topems_shared_event::event::{
    EventPublisher, EventType, SettlementApprovedPayload, SettlementCreatedPayload,
};
use uuid::Uuid;

use crate::models::settlement::{
    CreateSettlementAdjustmentRequest, CreateSettlementItemRequest, CreateSettlementRequest,
    Settlement, SettlementAdjustment, SettlementItem, UpdateSettlementItemRequest,
    UpdateSettlementRequest,
};
use crate::modules::effective_tenant_id;

#[derive(Clone)]
struct SettlementState {
    pool: PgPool,
    event_publisher: Option<Arc<EventPublisher>>,
}

pub fn create_routes(pool: PgPool, event_publisher: Option<Arc<EventPublisher>>) -> Router {
    let state = SettlementState {
        pool,
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
) -> Json<ApiResponse<Vec<Settlement>>> {
    let settlements = sqlx::query_as::<_, Settlement>(
        only_own_schema_query!("pm", "id, project_id, settlement_no, settlement_name, settlement_type, status, settlement_date, amount, currency, remarks, settlement_period_start, settlement_period_end, approved_at, created_by, created_at, updated_at FROM pm.settlements WHERE project_id = $1 ORDER BY settlement_date DESC"),
    )
    .bind(project_id)
    .fetch_all(&state.pool)
    .await;

    match settlements {
        Ok(s) => Json(ApiResponse::success(s, "获取决算列表成功")),
        Err(e) => {
            tracing::error!("获取决算失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "获取决算失败",
            ))
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
) -> Json<ApiResponse<Settlement>> {
    let settlement =
        sqlx::query_as::<_, Settlement>(only_own_schema_query!("pm", "id, project_id, settlement_no, settlement_name, settlement_type, status, settlement_date, amount, currency, remarks, settlement_period_start, settlement_period_end, approved_at, created_by, created_at, updated_at FROM pm.settlements WHERE id = $1"))
            .bind(id)
            .fetch_one(&state.pool)
            .await;

    match settlement {
        Ok(s) => Json(ApiResponse::success(s, "获取决算详情成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(
            StatusCode::NOT_FOUND.as_u16(),
            "决算不存在",
        )),
        Err(e) => {
            tracing::error!("获取决算失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "获取决算失败",
            ))
        }
    }
}

async fn create_settlement(
    State(state): State<SettlementState>,
    Path(project_id): Path<Uuid>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateSettlementRequest>,
) -> Json<ApiResponse<Settlement>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let tenant_id = effective_tenant_id(&ctx, &claims);

    // 列对齐真库：settlement_code->settlement_no, description->remarks, actual_amount->amount；
    // 补 NOT NULL：settlement_date=now, amount=0, currency='CNY'。
    let settlement = sqlx::query_as::<_, Settlement>(
        only_own_schema_query!("pm", "INSERT INTO pm.settlements (id, project_id, settlement_no, settlement_name, settlement_type, status, settlement_date, amount, currency, remarks, settlement_period_start, settlement_period_end, approved_at, created_by, created_at, updated_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, 'draft', $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *")
    )
    .bind(id)
    .bind(project_id)
    .bind(&req.settlement_code)
    .bind(&req.settlement_name)
    .bind(&req.settlement_type)
    .bind(now)
    .bind(0.0)
    .bind("CNY")
    .bind(&req.description)
    .bind(parse_date_opt(&req.settlement_period_start))
    .bind(parse_date_opt(&req.settlement_period_end))
    .bind(None::<chrono::DateTime<Utc>>)
    .bind(&req.created_by)
    .bind(now)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match settlement {
        Ok(s) => {
            if let Some(ref publisher) = state.event_publisher {
                let payload = SettlementCreatedPayload {
                    id,
                    tenant_id: Uuid::nil(),
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
                if let Err(e) = publisher
                    .publish_event(EventType::SettlementCreated, payload)
                    .await
                {
                    tracing::warn!("[PM Settlement] 发布 SettlementCreated 事件失败: {}", e);
                }
            }
            Json(ApiResponse::success(s, "创建决算成功"))
        }
        Err(e) => {
            tracing::error!("创建决算失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "创建决算失败",
            ))
        }
    }
}

async fn update_settlement(
    State(state): State<SettlementState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateSettlementRequest>,
) -> Json<ApiResponse<Settlement>> {
    // actual_amount->amount, description->remarks。
    let settlement = sqlx::query_as::<_, Settlement>(only_own_schema_query!(
        "pm",
        "UPDATE pm.settlements SET
            settlement_name = COALESCE($1, settlement_name),
            status = COALESCE($2, status),
            amount = COALESCE($3, amount),
            remarks = COALESCE($4, remarks),
            updated_at = $5
        WHERE id = $6 RETURNING *"
    ))
    .bind(req.settlement_name)
    .bind(req.status)
    .bind(req.actual_amount)
    .bind(req.description)
    .bind(Utc::now())
    .bind(id)
    .fetch_one(&state.pool)
    .await;

    match settlement {
        Ok(s) => Json(ApiResponse::success(s, "更新决算成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(
            StatusCode::NOT_FOUND.as_u16(),
            "决算不存在",
        )),
        Err(e) => {
            tracing::error!("更新决算失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "更新决算失败",
            ))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["pm:write"])),
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
) -> Json<ApiResponse<Settlement>> {
    let now = Utc::now();
    let settlement = sqlx::query_as::<_, Settlement>(only_own_schema_query!(
        "pm",
        "UPDATE pm.settlements SET
            status = 'approved',
            approved_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 RETURNING *"
    ))
    .bind(id)
    .fetch_one(&state.pool)
    .await;

    match settlement {
        Ok(s) => {
            if let Some(ref publisher) = state.event_publisher {
                let payload = SettlementApprovedPayload {
                    id,
                    tenant_id: Uuid::nil(),
                    approved_by: "system".to_string(),
                    approved_at: now,
                };
                if let Err(e) = publisher
                    .publish_event(EventType::SettlementApproved, payload)
                    .await
                {
                    tracing::warn!("[PM Settlement] 发布 SettlementApproved 事件失败: {}", e);
                }
            }
            Json(ApiResponse::success(s, "决算审批通过"))
        }
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(
            StatusCode::NOT_FOUND.as_u16(),
            "决算不存在",
        )),
        Err(e) => {
            tracing::error!("审批决算失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "审批决算失败",
            ))
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
) -> Json<ApiResponse<Vec<SettlementItem>>> {
    let items = sqlx::query_as::<_, SettlementItem>(
        only_own_schema_query!("pm", "SELECT id, settlement_id, item_code, item_name, category, budget_amount, actual_amount, variance_amount, variance_percent, description, expense_ref_id, contract_ref_id, created_at FROM pm.settlement_items WHERE settlement_id = $1 ORDER BY category, item_name"),
    )
    .bind(settlement_id)
    .fetch_all(&state.pool)
    .await;

    match items {
        Ok(i) => Json(ApiResponse::success(i, "获取决算项列表成功")),
        Err(e) => {
            tracing::error!("获取决算项失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "获取决算项失败",
            ))
        }
    }
}

async fn create_settlement_item(
    State(state): State<SettlementState>,
    Path(settlement_id): Path<Uuid>,
    Json(req): Json<CreateSettlementItemRequest>,
) -> Json<ApiResponse<SettlementItem>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let variance_amount = req.actual_amount - req.budget_amount;
    let variance_percent = if req.budget_amount != 0.0 {
        Some((variance_amount / req.budget_amount) * 100.0)
    } else {
        None
    };

    let item = sqlx::query_as::<_, SettlementItem>(
        only_own_schema_query!("pm", "INSERT INTO pm.settlement_items (id, settlement_id, item_code, item_name, category, budget_amount, actual_amount, variance_amount, variance_percent, description, expense_ref_id, contract_ref_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *")
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
    .fetch_one(&state.pool)
    .await;

    match item {
        Ok(i) => Json(ApiResponse::success(i, "创建决算项成功")),
        Err(e) => {
            tracing::error!("创建决算项失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "创建决算项失败",
            ))
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
    Json(req): Json<UpdateSettlementItemRequest>,
) -> Json<ApiResponse<SettlementItem>> {
    let item = sqlx::query_as::<_, SettlementItem>(
        only_own_schema_query!("pm", "UPDATE pm.settlement_items SET
            item_name = COALESCE($1, item_name),
            category = COALESCE($2, category),
            actual_amount = COALESCE($3, actual_amount),
            variance_amount = CASE WHEN $3 IS NOT NULL THEN $3 - budget_amount ELSE variance_amount END,
            variance_percent = CASE WHEN $3 IS NOT NULL AND budget_amount != 0 THEN (($3 - budget_amount) / budget_amount) * 100 ELSE variance_percent END,
            description = COALESCE($4, description),
            updated_at = $5
        WHERE id = $6 RETURNING *"),
    )
    .bind(req.item_name)
    .bind(req.category)
    .bind(req.actual_amount)
    .bind(req.description)
    .bind(Utc::now())
    .bind(id)
    .fetch_one(&state.pool)
    .await;

    match item {
        Ok(i) => Json(ApiResponse::success(i, "更新决算项成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(
            StatusCode::NOT_FOUND.as_u16(),
            "决算项不存在",
        )),
        Err(e) => {
            tracing::error!("更新决算项失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "更新决算项失败",
            ))
        }
    }
}

async fn delete_settlement_item(
    State(state): State<SettlementState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<()>> {
    let result = sqlx::query(only_own_schema_query!(
        "pm",
        "DELETE FROM pm.settlement_items WHERE id = $1"
    ))
    .bind(id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success((), "删除决算项成功")),
        Ok(_) => Json(ApiResponse::error(
            StatusCode::NOT_FOUND.as_u16(),
            "决算项不存在",
        )),
        Err(e) => {
            tracing::error!("删除决算项失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "删除决算项失败",
            ))
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
) -> Json<ApiResponse<Vec<SettlementAdjustment>>> {
    let adjustments = sqlx::query_as::<_, SettlementAdjustment>(
        only_own_schema_query!("pm", "SELECT id, settlement_id, adjustment_type, adjustment_code, description, amount, reason, supporting_documents, created_by, created_at FROM pm.settlement_adjustments WHERE settlement_id = $1 ORDER BY created_at"),
    )
    .bind(settlement_id)
    .fetch_all(&state.pool)
    .await;

    match adjustments {
        Ok(a) => Json(ApiResponse::success(a, "获取调整项列表成功")),
        Err(e) => {
            tracing::error!("获取调整项失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "获取调整项失败",
            ))
        }
    }
}

async fn create_settlement_adjustment(
    State(state): State<SettlementState>,
    Path(settlement_id): Path<Uuid>,
    Json(req): Json<CreateSettlementAdjustmentRequest>,
) -> Json<ApiResponse<SettlementAdjustment>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let adjustment = sqlx::query_as::<_, SettlementAdjustment>(
        only_own_schema_query!("pm", "INSERT INTO pm.settlement_adjustments (id, settlement_id, adjustment_type, adjustment_code, description, amount, reason, supporting_documents, created_by, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *")
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
    .fetch_one(&state.pool)
    .await;

    match adjustment {
        Ok(a) => Json(ApiResponse::success(a, "创建调整项成功")),
        Err(e) => {
            tracing::error!("创建调整项失败: {}", e);
            Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "创建调整项失败",
            ))
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
    use std::str::FromStr;

    fn make_pool() -> PgPool {
        let opts = PgConnectOptions::from_str("postgres://localhost/test").unwrap();
        sqlx::Pool::connect_lazy_with(opts)
    }

    #[tokio::test]
    async fn test_create_routes_returns_router() {
        let router = create_routes(make_pool(), None);
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
