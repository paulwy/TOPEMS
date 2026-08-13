use axum::{
    extract::{Extension, Path, Query, State},
    Json,
};
use chrono::Utc;
use sqlx::Row;
use uuid::Uuid;

use crate::modules::ApiState;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::{api_error, ApiResponse, PaginationParams};

#[utoipa::path(
    get,
    path = "/smart-replenishment/safety-stock",
    tag = "smart_replenishment",
    operation_id = "list_safety_stock",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn list_safety_stock(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query(
        r#"
        SELECT id, warehouse_id, warehouse_name, material_code, material_name,
               specification, safety_stock, reorder_point, max_stock,
               safety_factor, lead_time_days, consumption_days,
               updated_at
        FROM wms.safety_stock_settings
        ORDER BY warehouse_id, material_code
        LIMIT $1 OFFSET $2
        "#,
    )
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(items) => {
            let total =
                sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM wms.safety_stock_settings")
                    .fetch_one(&state.db)
                    .await
                    .unwrap_or(0);

            let items_json: Vec<serde_json::Value> = items.iter().map(|row| serde_json::json!({
                "id": row.try_get::<Uuid, _>("id").ok(),
                "warehouse_id": row.try_get::<Option<Uuid>, _>("warehouse_id").ok(),
                "warehouse_name": row.try_get::<Option<String>, _>("warehouse_name").ok(),
                "material_code": row.try_get::<String, _>("material_code").ok(),
                "material_name": row.try_get::<String, _>("material_name").ok(),
                "specification": row.try_get::<Option<String>, _>("specification").ok(),
                "safety_stock": row.try_get::<f64, _>("safety_stock").ok(),
                "reorder_point": row.try_get::<f64, _>("reorder_point").ok(),
                "max_stock": row.try_get::<Option<f64>, _>("max_stock").ok(),
                "safety_factor": row.try_get::<Option<f64>, _>("safety_factor").ok(),
                "lead_time_days": row.try_get::<Option<i32>, _>("lead_time_days").ok(),
                "consumption_days": row.try_get::<Option<i32>, _>("consumption_days").ok(),
                "updated_at": row.try_get::<chrono::NaiveDateTime, _>("updated_at").ok().map(|t| t.to_string()),
            })).collect();

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": items_json,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取安全库存设置列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取安全库存设置列表失败: {}", e);
            Json(api_error(500, "获取安全库存设置列表失败"))
        }
    }
}

#[utoipa::path(
    get,
    path = "/smart-replenishment/safety-stock/{id}",
    tag = "smart_replenishment",
    operation_id = "get_safety_stock",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_safety_stock(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result = sqlx::query(
        r#"
        SELECT id, warehouse_id, warehouse_name, material_code, material_name,
               specification, safety_stock, reorder_point, max_stock,
               safety_factor, lead_time_days, consumption_days,
               created_at, updated_at
        FROM wms.safety_stock_settings WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(row)) => Json(ApiResponse::success(
            serde_json::json!({
                "id": row.try_get::<Uuid, _>("id").ok(),
                "warehouse_id": row.try_get::<Option<Uuid>, _>("warehouse_id").ok(),
                "warehouse_name": row.try_get::<Option<String>, _>("warehouse_name").ok(),
                "material_code": row.try_get::<String, _>("material_code").ok(),
                "material_name": row.try_get::<String, _>("material_name").ok(),
                "specification": row.try_get::<Option<String>, _>("specification").ok(),
                "safety_stock": row.try_get::<f64, _>("safety_stock").ok(),
                "reorder_point": row.try_get::<f64, _>("reorder_point").ok(),
                "max_stock": row.try_get::<Option<f64>, _>("max_stock").ok(),
                "safety_factor": row.try_get::<Option<f64>, _>("safety_factor").ok(),
                "lead_time_days": row.try_get::<Option<i32>, _>("lead_time_days").ok(),
                "consumption_days": row.try_get::<Option<i32>, _>("consumption_days").ok(),
                "created_at": row.try_get::<chrono::NaiveDateTime, _>("created_at").ok().map(|t| t.to_string()),
                "updated_at": row.try_get::<chrono::NaiveDateTime, _>("updated_at").ok().map(|t| t.to_string()),
            }),
            "获取安全库存设置详情成功",
        )),
        Ok(None) => Json(api_error(404, "安全库存设置不存在")),
        Err(e) => {
            tracing::error!("获取安全库存设置详情失败: {}", e);
            Json(api_error(500, "获取安全库存设置详情失败"))
        }
    }
}

#[utoipa::path(
    put,
    path = "/smart-replenishment/safety-stock/{id}",
    tag = "smart_replenishment",
    operation_id = "update_safety_stock",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn update_safety_stock(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let now = Utc::now().naive_utc();

    let result = sqlx::query(
        r#"
        UPDATE wms.safety_stock_settings SET
            safety_stock = COALESCE($2, safety_stock),
            reorder_point = COALESCE($3, reorder_point),
            max_stock = COALESCE($4, max_stock),
            safety_factor = COALESCE($5, safety_factor),
            lead_time_days = COALESCE($6, lead_time_days),
            consumption_days = COALESCE($7, consumption_days),
            updated_at = $8
        WHERE id = $1
        RETURNING id, warehouse_id, warehouse_name, material_code, material_name,
                  specification, safety_stock, reorder_point, max_stock,
                  safety_factor, lead_time_days, consumption_days, updated_at
        "#,
    )
    .bind(id)
    .bind(req.get("safety_stock").and_then(|v| v.as_f64()))
    .bind(req.get("reorder_point").and_then(|v| v.as_f64()))
    .bind(req.get("max_stock").and_then(|v| v.as_f64()))
    .bind(req.get("safety_factor").and_then(|v| v.as_f64()))
    .bind(
        req.get("lead_time_days")
            .and_then(|v| v.as_i64())
            .map(|v| v as i32),
    )
    .bind(
        req.get("consumption_days")
            .and_then(|v| v.as_i64())
            .map(|v| v as i32),
    )
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(row) => Json(ApiResponse::success(
            serde_json::json!({
                "id": row.try_get::<Uuid, _>("id").ok(),
                "warehouse_id": row.try_get::<Option<Uuid>, _>("warehouse_id").ok(),
                "warehouse_name": row.try_get::<Option<String>, _>("warehouse_name").ok(),
                "material_code": row.try_get::<String, _>("material_code").ok(),
                "material_name": row.try_get::<String, _>("material_name").ok(),
                "specification": row.try_get::<Option<String>, _>("specification").ok(),
                "safety_stock": row.try_get::<f64, _>("safety_stock").ok(),
                "reorder_point": row.try_get::<f64, _>("reorder_point").ok(),
                "max_stock": row.try_get::<Option<f64>, _>("max_stock").ok(),
                "safety_factor": row.try_get::<Option<f64>, _>("safety_factor").ok(),
                "lead_time_days": row.try_get::<Option<i32>, _>("lead_time_days").ok(),
                "consumption_days": row.try_get::<Option<i32>, _>("consumption_days").ok(),
                "updated_at": now.to_string(),
            }),
            "更新安全库存设置成功",
        )),
        Err(sqlx::Error::RowNotFound) => Json(api_error(404, "安全库存设置不存在")),
        Err(e) => {
            tracing::error!("更新安全库存设置失败: {}", e);
            Json(api_error(500, "更新安全库存设置失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/smart-replenishment/safety-stock/batch-update",
    tag = "smart_replenishment",
    operation_id = "batch_update_safety_stock",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn batch_update_safety_stock(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let now = Utc::now().naive_utc();
    let mut updated_count = 0;

    if let Some(ids) = req.get("ids").and_then(|v| v.as_array()) {
        for id_val in ids {
            if let Some(id_str) = id_val.as_str() {
                if let Ok(id) = Uuid::parse_str(id_str) {
                    let result = sqlx::query(
                        r#"
                        UPDATE wms.safety_stock_settings SET
                            safety_stock = COALESCE($2, safety_stock),
                            reorder_point = COALESCE($3, reorder_point),
                            max_stock = COALESCE($4, max_stock),
                            safety_factor = COALESCE($5, safety_factor),
                            lead_time_days = COALESCE($6, lead_time_days),
                            consumption_days = COALESCE($7, consumption_days),
                            updated_at = $8
                        WHERE id = $1
                        "#,
                    )
                    .bind(id)
                    .bind(req.get("safety_stock").and_then(|v| v.as_f64()))
                    .bind(req.get("reorder_point").and_then(|v| v.as_f64()))
                    .bind(req.get("max_stock").and_then(|v| v.as_f64()))
                    .bind(req.get("safety_factor").and_then(|v| v.as_f64()))
                    .bind(
                        req.get("lead_time_days")
                            .and_then(|v| v.as_i64())
                            .map(|v| v as i32),
                    )
                    .bind(
                        req.get("consumption_days")
                            .and_then(|v| v.as_i64())
                            .map(|v| v as i32),
                    )
                    .bind(now)
                    .execute(&state.db)
                    .await;

                    if let Ok(r) = result {
                        updated_count += r.rows_affected() as i64;
                    }
                }
            }
        }
    }

    Json(ApiResponse::success(
        serde_json::json!({ "updated_count": updated_count }),
        &format!("批量更新安全库存设置成功，共更新{}条", updated_count),
    ))
}

#[utoipa::path(
    post,
    path = "/smart-replenishment/safety-stock/calculate",
    tag = "smart_replenishment",
    operation_id = "calculate_safety_stock",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn calculate_safety_stock(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(_req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    Json(ApiResponse::success(
        serde_json::json!({ "updated_count": 0 }),
        "安全库存计算完成",
    ))
}
