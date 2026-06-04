use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::{get, post, put, delete},
    Json,
    Router,
};
use chrono::Utc;
use sqlx::PgPool;
use topems_shared::ApiResponse;
use uuid::Uuid;

use crate::models::settlement::{
    Settlement,
    SettlementItem,
    SettlementAdjustment,
    CreateSettlementRequest,
    CreateSettlementItemRequest,
    CreateSettlementAdjustmentRequest,
    UpdateSettlementRequest,
    UpdateSettlementItemRequest,
};

pub fn create_routes(pool: PgPool) -> Router {
    Router::new()
        .route("/api/v1/projects/{project_id}/settlements", get(get_project_settlements).post(create_settlement))
        .route("/api/v1/settlements/{id}", get(get_settlement).put(update_settlement))
        .route("/api/v1/settlements/{id}/approve", post(approve_settlement))
        .route("/api/v1/settlements/{settlement_id}/items", get(get_settlement_items).post(create_settlement_item))
        .route("/api/v1/settlement-items/{id}", put(update_settlement_item).delete(delete_settlement_item))
        .route("/api/v1/settlements/{settlement_id}/adjustments", get(get_settlement_adjustments).post(create_settlement_adjustment))
        .with_state(pool)
}

async fn get_project_settlements(
    State(pool): State<PgPool>,
    Path(project_id): Path<Uuid>,
) -> Json<ApiResponse<Vec<Settlement>>> {
    let settlements = sqlx::query_as::<_, Settlement>("SELECT * FROM pm.settlements WHERE project_id = $1 ORDER BY settlement_period_end DESC")
        .bind(project_id)
        .fetch_all(&pool)
        .await;

    match settlements {
        Ok(s) => Json(ApiResponse::success(s, "获取决算列表成功")),
        Err(e) => {
            tracing::error!("获取决算失败: {}", e);
            Json(ApiResponse::error(StatusCode::INTERNAL_SERVER_ERROR.as_u16(), "获取决算失败"))
        }
    }
}

async fn get_settlement(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Settlement>> {
    let settlement = sqlx::query_as::<_, Settlement>("SELECT * FROM pm.settlements WHERE id = $1")
        .bind(id)
        .fetch_one(&pool)
        .await;

    match settlement {
        Ok(s) => Json(ApiResponse::success(s, "获取决算详情成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(StatusCode::NOT_FOUND.as_u16(), "决算不存在")),
        Err(e) => {
            tracing::error!("获取决算失败: {}", e);
            Json(ApiResponse::error(StatusCode::INTERNAL_SERVER_ERROR.as_u16(), "获取决算失败"))
        }
    }
}

async fn create_settlement(
    State(pool): State<PgPool>,
    Path(project_id): Path<Uuid>,
    Json(req): Json<CreateSettlementRequest>,
) -> Json<ApiResponse<Settlement>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    
    let settlement = sqlx::query_as::<_, Settlement>(
        "INSERT INTO pm.settlements (id, project_id, settlement_code, settlement_name, settlement_type, status, settlement_period_start, settlement_period_end, description, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, 'draft', $6, $7, $8, $9, $10, $11) RETURNING *"
    )
    .bind(id)
    .bind(project_id)
    .bind(req.settlement_code)
    .bind(&req.settlement_name)
    .bind(&req.settlement_type)
    .bind(parse_date_opt(&req.settlement_period_start))
    .bind(parse_date_opt(&req.settlement_period_end))
    .bind(req.description)
    .bind(req.created_by)
    .bind(now)
    .bind(now)
    .fetch_one(&pool)
    .await;

    match settlement {
        Ok(s) => Json(ApiResponse::success(s, "创建决算成功")),
        Err(e) => {
            tracing::error!("创建决算失败: {}", e);
            Json(ApiResponse::error(StatusCode::INTERNAL_SERVER_ERROR.as_u16(), "创建决算失败"))
        }
    }
}

async fn update_settlement(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateSettlementRequest>,
) -> Json<ApiResponse<Settlement>> {
    let settlement = sqlx::query_as::<_, Settlement>(
        "UPDATE pm.settlements SET
            settlement_name = COALESCE($1, settlement_name),
            status = COALESCE($2, status),
            actual_amount = COALESCE($3, actual_amount),
            description = COALESCE($4, description),
            updated_at = $5
        WHERE id = $6 RETURNING *"
    )
    .bind(req.settlement_name)
    .bind(req.status)
    .bind(req.actual_amount)
    .bind(req.description)
    .bind(Utc::now())
    .bind(id)
    .fetch_one(&pool)
    .await;

    match settlement {
        Ok(s) => Json(ApiResponse::success(s, "更新决算成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(StatusCode::NOT_FOUND.as_u16(), "决算不存在")),
        Err(e) => {
            tracing::error!("更新决算失败: {}", e);
            Json(ApiResponse::error(StatusCode::INTERNAL_SERVER_ERROR.as_u16(), "更新决算失败"))
        }
    }
}

async fn approve_settlement(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Settlement>> {
    let settlement = sqlx::query_as::<_, Settlement>(
        "UPDATE pm.settlements SET
            status = 'approved',
            approved_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 RETURNING *"
    )
    .bind(id)
    .fetch_one(&pool)
    .await;

    match settlement {
        Ok(s) => Json(ApiResponse::success(s, "决算审批通过")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(StatusCode::NOT_FOUND.as_u16(), "决算不存在")),
        Err(e) => {
            tracing::error!("审批决算失败: {}", e);
            Json(ApiResponse::error(StatusCode::INTERNAL_SERVER_ERROR.as_u16(), "审批决算失败"))
        }
    }
}

async fn get_settlement_items(
    State(pool): State<PgPool>,
    Path(settlement_id): Path<Uuid>,
) -> Json<ApiResponse<Vec<SettlementItem>>> {
    let items = sqlx::query_as::<_, SettlementItem>("SELECT * FROM pm.settlement_items WHERE settlement_id = $1 ORDER BY category, item_name")
        .bind(settlement_id)
        .fetch_all(&pool)
        .await;

    match items {
        Ok(i) => Json(ApiResponse::success(i, "获取决算项列表成功")),
        Err(e) => {
            tracing::error!("获取决算项失败: {}", e);
            Json(ApiResponse::error(StatusCode::INTERNAL_SERVER_ERROR.as_u16(), "获取决算项失败"))
        }
    }
}

async fn create_settlement_item(
    State(pool): State<PgPool>,
    Path(settlement_id): Path<Uuid>,
    Json(req): Json<CreateSettlementItemRequest>,
) -> Json<ApiResponse<SettlementItem>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let variance_amount = req.actual_amount - req.budget_amount;
    let variance_percent = if req.budget_amount != 0.0 { Some((variance_amount / req.budget_amount) * 100.0) } else { None };
    
    let item = sqlx::query_as::<_, SettlementItem>(
        "INSERT INTO pm.settlement_items (id, settlement_id, item_code, item_name, category, budget_amount, actual_amount, variance_amount, variance_percent, description, expense_ref_id, contract_ref_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *"
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
    .fetch_one(&pool)
    .await;

    match item {
        Ok(i) => Json(ApiResponse::success(i, "创建决算项成功")),
        Err(e) => {
            tracing::error!("创建决算项失败: {}", e);
            Json(ApiResponse::error(StatusCode::INTERNAL_SERVER_ERROR.as_u16(), "创建决算项失败"))
        }
    }
}

async fn update_settlement_item(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateSettlementItemRequest>,
) -> Json<ApiResponse<SettlementItem>> {
    let item = sqlx::query_as::<_, SettlementItem>(
        "UPDATE pm.settlement_items SET
            item_name = COALESCE($1, item_name),
            category = COALESCE($2, category),
            actual_amount = COALESCE($3, actual_amount),
            variance_amount = CASE WHEN $3 IS NOT NULL THEN $3 - budget_amount ELSE variance_amount END,
            variance_percent = CASE WHEN $3 IS NOT NULL AND budget_amount != 0 THEN (($3 - budget_amount) / budget_amount) * 100 ELSE variance_percent END,
            description = COALESCE($4, description),
            updated_at = $5
        WHERE id = $6 RETURNING *"
    )
    .bind(req.item_name)
    .bind(req.category)
    .bind(req.actual_amount)
    .bind(req.description)
    .bind(Utc::now())
    .bind(id)
    .fetch_one(&pool)
    .await;

    match item {
        Ok(i) => Json(ApiResponse::success(i, "更新决算项成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(StatusCode::NOT_FOUND.as_u16(), "决算项不存在")),
        Err(e) => {
            tracing::error!("更新决算项失败: {}", e);
            Json(ApiResponse::error(StatusCode::INTERNAL_SERVER_ERROR.as_u16(), "更新决算项失败"))
        }
    }
}

async fn delete_settlement_item(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<()>> {
    let result = sqlx::query("DELETE FROM pm.settlement_items WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success((), "删除决算项成功")),
        Ok(_) => Json(ApiResponse::error(StatusCode::NOT_FOUND.as_u16(), "决算项不存在")),
        Err(e) => {
            tracing::error!("删除决算项失败: {}", e);
            Json(ApiResponse::error(StatusCode::INTERNAL_SERVER_ERROR.as_u16(), "删除决算项失败"))
        }
    }
}

async fn get_settlement_adjustments(
    State(pool): State<PgPool>,
    Path(settlement_id): Path<Uuid>,
) -> Json<ApiResponse<Vec<SettlementAdjustment>>> {
    let adjustments = sqlx::query_as::<_, SettlementAdjustment>("SELECT * FROM pm.settlement_adjustments WHERE settlement_id = $1 ORDER BY created_at")
        .bind(settlement_id)
        .fetch_all(&pool)
        .await;

    match adjustments {
        Ok(a) => Json(ApiResponse::success(a, "获取调整项列表成功")),
        Err(e) => {
            tracing::error!("获取调整项失败: {}", e);
            Json(ApiResponse::error(StatusCode::INTERNAL_SERVER_ERROR.as_u16(), "获取调整项失败"))
        }
    }
}

async fn create_settlement_adjustment(
    State(pool): State<PgPool>,
    Path(settlement_id): Path<Uuid>,
    Json(req): Json<CreateSettlementAdjustmentRequest>,
) -> Json<ApiResponse<SettlementAdjustment>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    
    let adjustment = sqlx::query_as::<_, SettlementAdjustment>(
        "INSERT INTO pm.settlement_adjustments (id, settlement_id, adjustment_type, adjustment_code, description, amount, reason, supporting_documents, created_by, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *"
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
    .fetch_one(&pool)
    .await;

    match adjustment {
        Ok(a) => Json(ApiResponse::success(a, "创建调整项成功")),
        Err(e) => {
            tracing::error!("创建调整项失败: {}", e);
            Json(ApiResponse::error(StatusCode::INTERNAL_SERVER_ERROR.as_u16(), "创建调整项失败"))
        }
    }
}

fn parse_date_opt(date_str: &Option<String>) -> Option<chrono::DateTime<chrono::Utc>> {
    date_str.as_ref().and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok()).map(|d| d.with_timezone(&chrono::Utc))
}