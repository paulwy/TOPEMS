use topems_shared::Result;
use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::api::ApiState;
use crate::api::audit::log_audit_event;
use topems_shared::response::ApiResponse;

#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub category: Option<String>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct Reagent {
    pub id: Uuid,
    pub name: String,
    pub code: String,
    pub category: Option<String>,
    pub specification: Option<String>,
    pub supplier: Option<String>,
    pub batch_number: Option<String>,
    pub quantity: f64,
    pub unit: String,
    pub location: Option<String>,
    pub storage_condition: Option<String>,
    pub expiration_date: Option<chrono::DateTime<chrono::Utc>>,
    pub status: String,
    pub description: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateReagentRequest {
    pub name: String,
    pub code: String,
    pub category: Option<String>,
    pub specification: Option<String>,
    pub supplier: Option<String>,
    pub batch_number: Option<String>,
    pub quantity: f64,
    pub unit: String,
    pub location: Option<String>,
    pub storage_condition: Option<String>,
    pub expiration_date: Option<String>,
    pub status: String,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateReagentRequest {
    pub name: Option<String>,
    pub category: Option<String>,
    pub specification: Option<String>,
    pub supplier: Option<String>,
    pub batch_number: Option<String>,
    pub quantity: Option<f64>,
    pub unit: Option<String>,
    pub location: Option<String>,
    pub storage_condition: Option<String>,
    pub expiration_date: Option<String>,
    pub status: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ReagentUsageRequest {
    pub quantity: f64,
    pub usage_date: String,
    pub purpose: String,
    pub used_by: String,
}

pub async fn create_routes() -> Result<Router<ApiState>> {
    let app = Router::new()
        .route("/api/v1/reagents", get(list_reagents).post(create_reagent))
        .route(
            "/api/v1/reagents/{id}",
            get(get_reagent).put(update_reagent).delete(delete_reagent),
        )
        .route("/api/v1/reagents/{id}/usage", post(record_usage))
        .route("/api/v1/reagents/low-stock", get(list_low_stock));

    Ok(app)
}

async fn list_reagents(
    State(state): State<ApiState>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, Reagent>(
        r#"
        SELECT id, name, code, category, specification, supplier, batch_number,
               quantity, unit, location, storage_condition, expiration_date,
               status, description, created_at, updated_at
        FROM lims.reagents
        WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
          AND ($3::text IS NULL OR category = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(&params.search)
    .bind(&params.status)
    .bind(&params.category)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(reagents) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM lims.reagents
                WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND ($3::text IS NULL OR category = $3)
                "#,
            )
            .bind(&params.search)
            .bind(&params.status)
            .bind(&params.category)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "reagents": reagents,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取试剂列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取试剂列表失败: {}", e);
            Json(ApiResponse::error(500, "获取试剂列表失败"))
        }
    }
}

async fn create_reagent(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<CreateReagentRequest>,
) -> Json<ApiResponse<Reagent>> {
    if req.name.is_empty() {
        return Json(ApiResponse::error(400, "试剂名称不能为空"));
    }

    if req.code.is_empty() {
        return Json(ApiResponse::error(400, "试剂编码不能为空"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, Reagent>(
        r#"
        INSERT INTO lims.reagents (
            id, name, code, category, specification, supplier, batch_number,
            quantity, unit, location, storage_condition, expiration_date,
            status, description, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id, name, code, category, specification, supplier, batch_number,
                  quantity, unit, location, storage_condition, expiration_date,
                  status, description, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.code)
    .bind(&req.category)
    .bind(&req.specification)
    .bind(&req.supplier)
    .bind(&req.batch_number)
    .bind(req.quantity)
    .bind(&req.unit)
    .bind(&req.location)
    .bind(&req.storage_condition)
    .bind(req.expiration_date)
    .bind(&req.status)
    .bind(&req.description)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(reagent) => (
            Json(ApiResponse::success(reagent.clone(), "试剂创建成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("创建试剂失败: {}", e);
            (
                Json(ApiResponse::error(500, "创建试剂失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(reagent) = &result {
        serde_json::to_value(reagent).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "reagent".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str,
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn get_reagent(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Reagent>> {
    let result = sqlx::query_as::<_, Reagent>(
        r#"
        SELECT id, name, code, category, specification, supplier, batch_number,
               quantity, unit, location, storage_condition, expiration_date,
               status, description, created_at, updated_at
        FROM lims.reagents WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(reagent)) => Json(ApiResponse::success(reagent, "获取试剂成功")),
        Ok(None) => Json(ApiResponse::error(404, "试剂不存在")),
        Err(e) => {
            tracing::error!("获取试剂失败: {}", e);
            Json(ApiResponse::error(500, "获取试剂失败"))
        }
    }
}

async fn update_reagent(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateReagentRequest>,
) -> Json<ApiResponse<Reagent>> {
    let existing = sqlx::query_as::<_, Reagent>(
        "SELECT id, name, code, category, specification, supplier, batch_number, quantity, unit, location, storage_condition, expiration_date, status, description, created_at, updated_at FROM lims.reagents WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(r)) => r,
        Ok(None) => return Json(ApiResponse::error(404, "试剂不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询试剂失败: {}", e))),
    };

    let request_data = serde_json::to_value(&req).ok();

    let name = req.name.unwrap_or(existing.name);
    let status = req.status.unwrap_or(existing.status);
    let quantity = req.quantity.unwrap_or(existing.quantity);
    let unit = req.unit.unwrap_or(existing.unit);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Reagent>(
        r#"
        UPDATE lims.reagents SET
            name = $2, category = $3, specification = $4, supplier = $5,
            batch_number = $6, quantity = $7, unit = $8, location = $9,
            storage_condition = $10, expiration_date = $11, status = $12,
            description = $13, updated_at = $14
        WHERE id = $1
        RETURNING id, name, code, category, specification, supplier, batch_number,
                  quantity, unit, location, storage_condition, expiration_date,
                  status, description, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&name)
    .bind(&req.category)
    .bind(&req.specification)
    .bind(&req.supplier)
    .bind(&req.batch_number)
    .bind(quantity)
    .bind(&unit)
    .bind(&req.location)
    .bind(&req.storage_condition)
    .bind(req.expiration_date)
    .bind(&status)
    .bind(&req.description)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(reagent) => (
            Json(ApiResponse::success(reagent.clone(), "试剂更新成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("更新试剂失败: {}", e);
            (
                Json(ApiResponse::error(500, "更新试剂失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(reagent) = &result {
        serde_json::to_value(reagent).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "reagent".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str,
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn delete_reagent(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM lims.reagents WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "试剂删除成功")),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            Json(ApiResponse::error(404, "试剂不存在")),
            "error".to_string(),
            Some("试剂不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除试剂失败: {}", e);
            (
                Json(ApiResponse::error(500, "删除试剂失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(r) = &result {
        Some(serde_json::json!({ "rows_affected": r.rows_affected() }))
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "delete".to_string(),
        "reagent".to_string(),
        Some(id),
        None,
        None,
        None,
        None,
        response_data,
        status_str,
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn record_usage(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Json(req): Json<ReagentUsageRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let existing = sqlx::query_as::<_, (f64,)>(
        "SELECT quantity FROM lims.reagents WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing_quantity = match existing {
        Ok(Some((q,))) => q,
        Ok(None) => return Json(ApiResponse::error(404, "试剂不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询试剂失败: {}", e))),
    };

    if existing_quantity < req.quantity {
        return Json(ApiResponse::error(400, "库存不足"));
    }

    let usage_id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query(
        r#"
        INSERT INTO lims.reagent_usages (
            id, reagent_id, quantity, usage_date, purpose, used_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        "#,
    )
    .bind(usage_id)
    .bind(id)
    .bind(req.quantity)
    .bind(&req.usage_date)
    .bind(&req.purpose)
    .bind(&req.used_by)
    .bind(now)
    .execute(&state.db)
    .await;

    if let Ok(_) = result {
        let _ = sqlx::query(
            r#"
            UPDATE lims.reagents SET
                quantity = quantity - $2,
                updated_at = $3
            WHERE id = $1
            "#,
        )
        .bind(id)
        .bind(req.quantity)
        .bind(now)
        .execute(&state.db)
        .await;
    }

    Json(ApiResponse::success(
        serde_json::json!({
            "id": usage_id,
            "remaining_quantity": existing_quantity - req.quantity,
            "created_at": now
        }),
        "试剂使用记录创建成功",
    ))
}

async fn list_low_stock(
    State(state): State<ApiState>,
) -> Json<ApiResponse<Vec<Reagent>>> {
    let result = sqlx::query_as::<_, Reagent>(
        r#"
        SELECT id, name, code, category, specification, supplier, batch_number,
               quantity, unit, location, storage_condition, expiration_date,
               status, description, created_at, updated_at
        FROM lims.reagents
        WHERE quantity < 10 AND status = 'in_stock'
        ORDER BY quantity ASC
        "#,
    )
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(reagents) => Json(ApiResponse::success(reagents, "获取低库存试剂成功")),
        Err(e) => {
            tracing::error!("获取低库存试剂失败: {}", e);
            Json(ApiResponse::error(500, "获取低库存试剂失败"))
        }
    }
}
