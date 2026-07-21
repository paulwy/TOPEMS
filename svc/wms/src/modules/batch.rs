use axum::{
    extract::{Extension, FromRef, Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use num_traits::cast::ToPrimitive;
use uuid::Uuid;

use crate::models::{
    Batch, BatchQueryParams, BatchStatistics, CreateBatchRequest, UpdateBatchRequest,
};
use crate::modules::ApiState;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::{api_error, ApiResponse};

pub fn create_routes<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
    ApiState: FromRef<S>,
{
    Router::new()
        .route("/batches", get(list_batches).post(create_batch))
        .route("/batches/statistics", get(get_batch_statistics))
        .route("/batches/expiring-soon", get(get_expiring_soon))
        .route("/batches/expired", get(get_expired))
        .route(
            "/batches/{id}",
            get(get_batch).put(update_batch).delete(delete_batch),
        )
        .route("/batches/{id}/adjust-quantity", post(adjust_quantity))
        .route("/batches/{id}/transfer-location", post(transfer_location))
}

pub async fn list_batches(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<BatchQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, Batch>(
        r#"
        SELECT * FROM wms.batches
        WHERE ($1::text IS NULL OR warehouse_id = $1)
          AND ($2::text IS NULL OR sku ILIKE $2)
          AND ($3::text IS NULL OR batch_no ILIKE $3)
          AND ($4::text IS NULL OR supplier_id = $4)
          AND ($5::text IS NULL OR quality_status = $5)
          AND ($6::text IS NULL OR status = $6)
        ORDER BY created_at DESC
        LIMIT $7 OFFSET $8
        "#,
    )
    .bind(&params.warehouse_id)
    .bind(params.sku.as_ref().map(|s| format!("%{}%", s)))
    .bind(params.batch_no.as_ref().map(|s| format!("%{}%", s)))
    .bind(&params.supplier_id)
    .bind(&params.quality_status)
    .bind(&params.status)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(batches) => {
            let total = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM wms.batches
                WHERE ($1::text IS NULL OR warehouse_id = $1)
                  AND ($2::text IS NULL OR sku ILIKE $2)
                  AND ($3::text IS NULL OR batch_no ILIKE $3)
                  AND ($4::text IS NULL OR supplier_id = $4)
                  AND ($5::text IS NULL OR quality_status = $5)
                  AND ($6::text IS NULL OR status = $6)
                "#,
            )
            .bind(&params.warehouse_id)
            .bind(params.sku.as_ref().map(|s| format!("%{}%", s)))
            .bind(params.batch_no.as_ref().map(|s| format!("%{}%", s)))
            .bind(&params.supplier_id)
            .bind(&params.quality_status)
            .bind(&params.status)
            .fetch_one(&state.db)
            .await
            .unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": batches,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取批次列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取批次列表失败: {}", e);
            Json(api_error(500, "获取批次列表失败"))
        }
    }
}

pub async fn create_batch(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateBatchRequest>,
) -> Json<ApiResponse<Batch>> {
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, Batch>(
        r#"
        INSERT INTO wms.batches (
            id, batch_no, sku, material_name, specification, unit, quantity,
            available_quantity, warehouse_id, location_id, supplier_id,
            production_date, expiry_date, receipt_date, quality_status, status,
            manufacture_date, shelf_life_days, unit_price, remark, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
        RETURNING *
        "#,
    )
    .bind(id)
    .bind(&req.batch_no)
    .bind(&req.sku)
    .bind(&req.material_name)
    .bind(&req.specification)
    .bind(&req.unit)
    .bind(req.quantity)
    .bind(req.quantity)
    .bind(&req.warehouse_id)
    .bind(&req.location_id)
    .bind(&req.supplier_id)
    .bind(&req.production_date)
    .bind(&req.expiry_date)
    .bind(&req.receipt_date)
    .bind(req.quality_status.as_deref().unwrap_or("pending"))
    .bind("active")
    .bind(&req.manufacture_date)
    .bind(&req.shelf_life_days)
    .bind(&req.unit_price)
    .bind(&req.remark)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(batch) => Json(ApiResponse::success(batch, "创建批次成功")),
        Err(e) => {
            tracing::error!("创建批次失败: {}", e);
            Json(api_error(500, "创建批次失败"))
        }
    }
}

pub async fn get_batch(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<Batch>> {
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let batch_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的批次ID")),
    };

    let result = sqlx::query_as::<_, Batch>("SELECT * FROM wms.batches WHERE id = $1")
        .bind(batch_id)
        .fetch_optional(&state.db)
        .await;

    match result {
        Ok(Some(batch)) => Json(ApiResponse::success(batch, "获取批次成功")),
        Ok(None) => Json(api_error(404, "批次不存在")),
        Err(e) => {
            tracing::error!("获取批次失败: {}", e);
            Json(api_error(500, "获取批次失败"))
        }
    }
}

pub async fn update_batch(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(req): Json<UpdateBatchRequest>,
) -> Json<ApiResponse<Batch>> {
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let batch_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的批次ID")),
    };

    let now = Utc::now();

    let result = sqlx::query_as::<_, Batch>(
        r#"
        UPDATE wms.batches SET
            batch_no = COALESCE($1, batch_no),
            sku = COALESCE($2, sku),
            material_name = COALESCE($3, material_name),
            specification = COALESCE($4, specification),
            unit = COALESCE($5, unit),
            quantity = COALESCE($6, quantity),
            warehouse_id = COALESCE($7, warehouse_id),
            location_id = COALESCE($8, location_id),
            supplier_id = COALESCE($9, supplier_id),
            production_date = COALESCE($10, production_date),
            expiry_date = COALESCE($11, expiry_date),
            quality_status = COALESCE($12, quality_status),
            status = COALESCE($13, status),
            manufacture_date = COALESCE($14, manufacture_date),
            shelf_life_days = COALESCE($15, shelf_life_days),
            unit_price = COALESCE($16, unit_price),
            remark = COALESCE($17, remark),
            updated_at = $18
        WHERE id = $19
        RETURNING *
        "#,
    )
    .bind(&req.batch_no)
    .bind(&req.sku)
    .bind(&req.material_name)
    .bind(&req.specification)
    .bind(&req.unit)
    .bind(&req.quantity)
    .bind(&req.warehouse_id)
    .bind(&req.location_id)
    .bind(&req.supplier_id)
    .bind(&req.production_date)
    .bind(&req.expiry_date)
    .bind(&req.quality_status)
    .bind(&req.status)
    .bind(&req.manufacture_date)
    .bind(&req.shelf_life_days)
    .bind(&req.unit_price)
    .bind(&req.remark)
    .bind(now)
    .bind(batch_id)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(batch) => Json(ApiResponse::success(batch, "更新批次成功")),
        Err(sqlx::Error::RowNotFound) => Json(api_error(404, "批次不存在")),
        Err(e) => {
            tracing::error!("更新批次失败: {}", e);
            Json(api_error(500, "更新批次失败"))
        }
    }
}

pub async fn delete_batch(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let batch_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的批次ID")),
    };

    let result = sqlx::query("DELETE FROM wms.batches WHERE id = $1")
        .bind(batch_id)
        .execute(&state.db)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            Json(ApiResponse::success("".to_string(), "删除批次成功"))
        }
        Ok(_) => Json(api_error(404, "批次不存在")),
        Err(e) => {
            tracing::error!("删除批次失败: {}", e);
            Json(api_error(500, "删除批次失败"))
        }
    }
}

pub async fn get_batch_statistics(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<serde_json::Value>,
) -> Json<ApiResponse<BatchStatistics>> {
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let warehouse_id = params.get("warehouse_id").and_then(|v| v.as_str());

    let result = sqlx::query!(
        r#"
        SELECT 
            COUNT(*) as total_batches,
            SUM(quantity) as total_quantity,
            SUM(total_value) as total_value,
            SUM(CASE WHEN remaining_days <= 30 AND remaining_days > 0 THEN 1 ELSE 0 END) as expiring_soon_count,
            SUM(CASE WHEN remaining_days <= 0 THEN 1 ELSE 0 END) as expired_count,
            SUM(CASE WHEN quality_status = 'pending' THEN 1 ELSE 0 END) as quality_pending_count
        FROM wms.batches
        WHERE warehouse_id = $1 OR $1 IS NULL
        "#,
        warehouse_id
    )
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(row) => {
            let statistics = BatchStatistics {
                total_batches: row.total_batches.unwrap_or(0),
                total_quantity: row
                    .total_quantity
                    .unwrap_or_default()
                    .to_f64()
                    .unwrap_or(0.0),
                total_value: row.total_value.unwrap_or_default().to_f64().unwrap_or(0.0),
                expiring_soon_count: row.expiring_soon_count.unwrap_or(0),
                expired_count: row.expired_count.unwrap_or(0),
                quality_pending_count: row.quality_pending_count.unwrap_or(0),
            };
            Json(ApiResponse::success(statistics, "获取批次统计成功"))
        }
        Err(e) => {
            tracing::error!("获取批次统计失败: {}", e);
            Json(api_error(500, "获取批次统计失败"))
        }
    }
}

pub async fn get_expiring_soon(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<serde_json::Value>,
) -> Json<ApiResponse<Vec<Batch>>> {
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let days: i32 = params.get("days").and_then(|v| v.as_i64()).unwrap_or(30) as i32;
    let warehouse_id = params.get("warehouse_id").and_then(|v| v.as_str());

    let result = sqlx::query_as::<_, Batch>(
        r#"
        SELECT * FROM wms.batches
        WHERE remaining_days <= $1 AND remaining_days > 0
          AND (warehouse_id = $2 OR $2 IS NULL)
        ORDER BY remaining_days ASC
        "#,
    )
    .bind(days)
    .bind(warehouse_id)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(batches) => Json(ApiResponse::success(batches, "获取即将过期批次成功")),
        Err(e) => {
            tracing::error!("获取即将过期批次失败: {}", e);
            Json(api_error(500, "获取即将过期批次失败"))
        }
    }
}

pub async fn get_expired(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<serde_json::Value>,
) -> Json<ApiResponse<Vec<Batch>>> {
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let warehouse_id = params.get("warehouse_id").and_then(|v| v.as_str());

    let result = sqlx::query_as::<_, Batch>(
        r#"
        SELECT * FROM wms.batches
        WHERE remaining_days <= 0
          AND (warehouse_id = $1 OR $1 IS NULL)
        ORDER BY remaining_days ASC
        "#,
    )
    .bind(warehouse_id)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(batches) => Json(ApiResponse::success(batches, "获取已过期批次成功")),
        Err(e) => {
            tracing::error!("获取已过期批次失败: {}", e);
            Json(api_error(500, "获取已过期批次失败"))
        }
    }
}

pub async fn adjust_quantity(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(data): Json<serde_json::Value>,
) -> Json<ApiResponse<Batch>> {
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let batch_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的批次ID")),
    };

    let quantity = data.get("quantity").and_then(|v| v.as_f64()).unwrap_or(0.0);

    let result = sqlx::query_as::<_, Batch>(
        r#"
        UPDATE wms.batches SET
            quantity = quantity + $1,
            available_quantity = available_quantity + $1,
            updated_at = NOW()
        WHERE id = $2
        RETURNING *
        "#,
    )
    .bind(quantity)
    .bind(batch_id)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(batch) => Json(ApiResponse::success(batch, "调整数量成功")),
        Err(sqlx::Error::RowNotFound) => Json(api_error(404, "批次不存在")),
        Err(e) => {
            tracing::error!("调整数量失败: {}", e);
            Json(api_error(500, "调整数量失败"))
        }
    }
}

pub async fn transfer_location(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(data): Json<serde_json::Value>,
) -> Json<ApiResponse<Batch>> {
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let batch_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的批次ID")),
    };

    let to_location_id = data
        .get("to_location_id")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    let result = sqlx::query_as::<_, Batch>(
        r#"
        UPDATE wms.batches SET
            location_id = $1,
            updated_at = NOW()
        WHERE id = $2
        RETURNING *
        "#,
    )
    .bind(to_location_id)
    .bind(batch_id)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(batch) => Json(ApiResponse::success(batch, "转移库位成功")),
        Err(sqlx::Error::RowNotFound) => Json(api_error(404, "批次不存在")),
        Err(e) => {
            tracing::error!("转移库位失败: {}", e);
            Json(api_error(500, "转移库位失败"))
        }
    }
}
