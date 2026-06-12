use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    routing::*,
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use uuid::Uuid;

use super::ApiState;
use crate::api::audit::{log_audit_event, AuditEventParams};
use crate::models::{Asset, CreateAssetRequest, UpdateAssetRequest};
use topems_shared::{api_error, ApiResponse, PaginatedResponse};

#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/api/v1/assets", get(list_assets).post(create_asset))
        .route(
            "/api/v1/assets/{id}",
            get(get_asset).put(update_asset).delete(delete_asset),
        )
}

async fn list_assets(
    State(state): State<ApiState>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<PaginatedResponse<Asset>>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, Asset>(
        "
        SELECT id, asset_number, name, category, brand, model, purchase_date, purchase_amount, location, responsible_id, status, created_at, updated_at,
               serial_number, manufacturer, rated_power, rated_voltage, rated_current, specifications, image_url, department
        FROM assets
        WHERE ($1::text IS NULL OR name ILIKE $1 OR asset_number ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        ",
    )
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(assets) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                "
                SELECT COUNT(*) FROM assets
                WHERE ($1::text IS NULL OR name ILIKE $1 OR asset_number ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                ",
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                PaginatedResponse::new(assets, total, page, page_size),
                "获取资产列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取资产列表失败: {}", e);
            Json(api_error(500, "获取资产列表失败"))
        }
    }
}

async fn create_asset(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<CreateAssetRequest>,
) -> Json<ApiResponse<Asset>> {
    if req.name.is_empty() {
        return Json(api_error(400, "资产名称不能为空"));
    }

    if req.asset_number.is_empty() {
        return Json(api_error(400, "资产编号不能为空"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, Asset>(
        "
        INSERT INTO assets (id, asset_number, name, category, brand, model, purchase_date, purchase_amount, location, responsible_id, status, created_at, updated_at,
                                 serial_number, manufacturer, rated_power, rated_voltage, rated_current, specifications, image_url, department)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'in_use', $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING id, asset_number, name, category, brand, model, purchase_date, purchase_amount, location, responsible_id, status, created_at, updated_at,
                  serial_number, manufacturer, rated_power, rated_voltage, rated_current, specifications, image_url, department
        ",
    )
    .bind(id)
    .bind(&req.asset_number)
    .bind(&req.name)
    .bind(&req.category)
    .bind(&req.brand)
    .bind(&req.model)
    .bind(req.purchase_date)
    .bind(req.purchase_amount)
    .bind(&req.location)
    .bind(req.responsible_id)
    .bind(now)
    .bind(now)
    .bind(&req.serial_number)
    .bind(&req.manufacturer)
    .bind(req.rated_power)
    .bind(req.rated_voltage)
    .bind(req.rated_current)
    .bind(&req.specifications)
    .bind(&req.image_url)
    .bind(&req.department)
    .fetch_one(&state.db)
    .await;

    let (response, status, error_msg) = match &result {
        Ok(asset) => (
            Json(ApiResponse::success(asset.clone(), "资产创建成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("创建资产失败: {}", e);
            (
                Json(api_error(500, "资产创建失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(asset) = &result {
        serde_json::to_value(asset).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "create".to_string(),
            entity_type: "asset".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: request_data,
            response_details: response_data,
            status,
            error_message: error_msg,
        },
        &headers,
    )
    .await;

    response
}

async fn get_asset(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Asset>> {
    let result = sqlx::query_as::<_, Asset>(
        "
        SELECT id, asset_number, name, category, brand, model, purchase_date, purchase_amount, location, responsible_id, status, created_at, updated_at,
               serial_number, manufacturer, rated_power, rated_voltage, rated_current, specifications, image_url, department
        FROM assets WHERE id = $1
        ",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(asset)) => Json(ApiResponse::success(asset, "获取资产成功")),
        Ok(None) => Json(api_error(404, "资产不存在")),
        Err(e) => {
            tracing::error!("获取资产失败: {}", e);
            Json(api_error(500, "获取资产失败"))
        }
    }
}

async fn update_asset(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateAssetRequest>,
) -> Json<ApiResponse<Asset>> {
    let existing = sqlx::query_as::<_, Asset>(
        "SELECT id, asset_number, name, category, brand, model, purchase_date, purchase_amount, location, responsible_id, status, created_at, updated_at,
                  serial_number, manufacturer, rated_power, rated_voltage, rated_current, specifications, image_url, department
           FROM assets WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(a)) => a,
        Ok(None) => return Json(api_error(404, "资产不存在")),
        Err(e) => return Json(api_error(500, &format!("查询资产失败: {}", e))),
    };

    let request_data = serde_json::to_value(&req).ok();

    let name = req.name.unwrap_or(existing.name);
    let category = req.category.or(existing.category);
    let brand = req.brand.or(existing.brand);
    let model = req.model.or(existing.model);
    let purchase_date = req.purchase_date.or(existing.purchase_date);
    let purchase_amount = req.purchase_amount.or(existing.purchase_amount);
    let location = req.location.or(existing.location);
    let responsible_id = req.responsible_id.or(existing.responsible_id);
    let status = req.status.unwrap_or(existing.status);
    let serial_number = req.serial_number.or(existing.serial_number);
    let manufacturer = req.manufacturer.or(existing.manufacturer);
    let rated_power = req.rated_power.or(existing.rated_power);
    let rated_voltage = req.rated_voltage.or(existing.rated_voltage);
    let rated_current = req.rated_current.or(existing.rated_current);
    let specifications = req.specifications.or(existing.specifications);
    let image_url = req.image_url.or(existing.image_url);
    let department = req.department.or(existing.department);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Asset>(
        "
        UPDATE assets SET
            name = $2, category = $3, brand = $4, model = $5, purchase_date = $6, purchase_amount = $7, location = $8, responsible_id = $9, status = $10, updated_at = $11,
            serial_number = $12, manufacturer = $13, rated_power = $14, rated_voltage = $15, rated_current = $16, specifications = $17, image_url = $18, department = $19
        WHERE id = $1
        RETURNING id, asset_number, name, category, brand, model, purchase_date, purchase_amount, location, responsible_id, status, created_at, updated_at,
                  serial_number, manufacturer, rated_power, rated_voltage, rated_current, specifications, image_url, department
        ",
    )
    .bind(id)
    .bind(&name)
    .bind(&category)
    .bind(&brand)
    .bind(&model)
    .bind(purchase_date)
    .bind(purchase_amount)
    .bind(&location)
    .bind(responsible_id)
    .bind(&status)
    .bind(now)
    .bind(&serial_number)
    .bind(&manufacturer)
    .bind(rated_power)
    .bind(rated_voltage)
    .bind(rated_current)
    .bind(&specifications)
    .bind(&image_url)
    .bind(&department)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(asset) => (
            Json(ApiResponse::success(asset.clone(), "资产更新成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("更新资产失败: {}", e);
            (
                Json(api_error(500, "资产更新失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(asset) = &result {
        serde_json::to_value(asset).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "update".to_string(),
            entity_type: "asset".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: request_data,
            response_details: response_data,
            status: status_str,
            error_message: error_msg,
        },
        &headers,
    )
    .await;

    response
}

async fn delete_asset(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM assets WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "资产删除成功")),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "资产不存在")),
            "error".to_string(),
            Some("资产不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除资产失败: {}", e);
            (
                Json(api_error(500, "资产删除失败")),
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
        AuditEventParams {
            action: "delete".to_string(),
            entity_type: "asset".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: None,
            response_details: response_data,
            status: status_str,
            error_message: error_msg,
        },
        &headers,
    )
    .await;

    response
}
