use axum::{
    extract::{Extension, FromRef, Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use sqlx::Row;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use crate::models::{
    Batch, BatchQueryParams, BatchStatistics, CreateBatchRequest, UpdateBatchRequest,
};
use crate::modules::batch_status::{BatchQualityStatus, BatchStatus};
use crate::modules::ApiState;
use crate::shared::permission::{check_permission, ModulePermission};
use crate::shared::scope::tenant_of;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;
use topems_shared_core::TopemsError;

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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:read"])),
    path = "/api/wms/batches",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn list_batches(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Query(params): Query<BatchQueryParams>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let tenant = match tenant_of(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let quality_filter = match params.quality_status.as_deref() {
        None => None,
        Some(raw) => match BatchQualityStatus::from_db_str(raw) {
            Ok(status) => Some(status.as_db_str()),
            Err(msg) => return ApiResponse::bad_request(&msg),
        },
    };
    let status_filter = match params.status.as_deref() {
        None => None,
        Some(raw) => match BatchStatus::from_read_str(raw) {
            Ok(status) => Some(status.as_db_str()),
            Err(msg) => return ApiResponse::bad_request(&msg),
        },
    };

    let result = sqlx::query_as::<_, Batch>(
        only_own_schema_query!("wms", r#"
        SELECT id, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000') AS tenant_id, batch_no, sku, material_name, specification, unit, quantity, available_quantity, warehouse_id, warehouse_name, location_id, location_code, supplier_id, supplier_name, production_date, expiry_date, receipt_date, quality_status, CASE WHEN status = 'active' THEN 'in_stock' ELSE status END AS status, manufacture_date, shelf_life_days, remaining_days, unit_price, total_value, remark, created_at, updated_at FROM wms.batches
        WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR warehouse_id = $1::uuid)
          AND ($2::text IS NULL OR sku ILIKE $2)
          AND ($3::text IS NULL OR batch_no ILIKE $3)
          AND ($4::uuid IS NULL OR supplier_id = $4::uuid)
          AND ($5::text IS NULL OR quality_status = $5)
          AND ($6::text IS NULL OR status = $6 OR ($6 = 'in_stock' AND status = 'active'))
          AND (status = ANY(ARRAY['in_stock','reserved','out_stock','frozen','scrapped'])
               OR status = 'active')
          AND quality_status = ANY(ARRAY['pending','inspecting','qualified','unqualified'])
          AND tenant_id = $9::uuid
        ORDER BY created_at DESC
        LIMIT $7 OFFSET $8
        "#),
    )
    .bind(&params.warehouse_id)
    .bind(params.sku.as_ref().map(|s| format!("%{}%", s)))
    .bind(params.batch_no.as_ref().map(|s| format!("%{}%", s)))
    .bind(params.supplier_id)
    .bind(quality_filter)
    .bind(status_filter)
    .bind(page_size)
    .bind(offset)
    .bind(tenant)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(batches) => {
            let total = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "wms",
                r#"
                SELECT COUNT(*) FROM wms.batches
                WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR warehouse_id = $1::uuid)
                  AND ($2::text IS NULL OR sku ILIKE $2)
                  AND ($3::text IS NULL OR batch_no ILIKE $3)
                  AND ($4::uuid IS NULL OR supplier_id = $4::uuid)
                  AND ($5::text IS NULL OR quality_status = $5)
                  AND ($6::text IS NULL OR status = $6 OR ($6 = 'in_stock' AND status = 'active'))
                  AND (status = ANY(ARRAY['in_stock','reserved','out_stock','frozen','scrapped'])
                       OR status = 'active')
                  AND quality_status = ANY(ARRAY['pending','inspecting','qualified','unqualified'])
                  AND tenant_id = $7::uuid
                "#
            ))
            .bind(&params.warehouse_id)
            .bind(params.sku.as_ref().map(|s| format!("%{}%", s)))
            .bind(params.batch_no.as_ref().map(|s| format!("%{}%", s)))
            .bind(params.supplier_id)
            .bind(quality_filter)
            .bind(status_filter)
            .bind(tenant)
            .fetch_one(&mut **txn)
            .await
            .unwrap_or(0);

            ApiResponse::success(
                serde_json::json!({
                    "items": batches,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取批次列表成功",
            )
        }
        Err(e) => {
            tracing::error!("获取批次列表失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取批次列表失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:write"])),
    path = "/api/wms/batches",
    tag = "wms",
    responses(
        (status = 201, description = "创建成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 500, description = "服务内部错误")
    )
)]
pub async fn create_batch(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<CreateBatchRequest>,
) -> ApiResponse<Batch> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let id = Uuid::new_v4();
    let now = Utc::now();

    // 租户绑定对齐新惯例：超管→SQL NULL（公共行），普通用户→claims.tenant_id。
    let tenant_id: Option<Uuid> = match claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
    {
        Some(t) => Some(t),
        None => return ApiResponse::bad_request("缺少租户上下文（超管需携带 x-tenant-id）"),
    };

    let quality_status = match req.quality_status.as_deref() {
        None => BatchQualityStatus::DEFAULT,
        Some(raw) => match BatchQualityStatus::from_db_str(raw) {
            Ok(status) => status,
            Err(msg) => return ApiResponse::bad_request(&msg),
        },
    };

    let result = sqlx::query_as::<_, Batch>(
        only_own_schema_query!("wms", r#"
        INSERT INTO wms.batches (
            id, batch_no, sku, material_name, specification, unit, quantity,
            available_quantity, warehouse_id, location_id, supplier_id,
            production_date, expiry_date, receipt_date, quality_status, status,
            manufacture_date, shelf_life_days, unit_price, remark, created_at, updated_at,
            tenant_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::timestamptz, $13::timestamptz, $14::timestamptz, $15, $16, $17::timestamptz, $18, $19, $20, $21, $22, $23)
        RETURNING id, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000') AS tenant_id,
                  batch_no, sku, material_name, specification, unit, quantity, available_quantity,
                  warehouse_id, warehouse_name, location_id, location_code, supplier_id, supplier_name,
                  production_date, expiry_date, receipt_date, quality_status, status,
                  manufacture_date, shelf_life_days, remaining_days, unit_price, total_value, remark,
                  created_at, updated_at
        "#),
    )
    .bind(id)
    .bind(&req.batch_no)
    .bind(&req.sku)
    .bind(&req.material_name)
    .bind(&req.specification)
    .bind(&req.unit)
    .bind(req.quantity)
    // available_quantity：请求模型无该字段，创建时默认等于 quantity（全额可用）
    .bind(req.quantity)
    .bind(req.warehouse_id)
    .bind(req.location_id)
    .bind(req.supplier_id)
    .bind(&req.production_date)
    .bind(&req.expiry_date)
    .bind(&req.receipt_date)
    .bind(quality_status.as_db_str())
    .bind(BatchStatus::DEFAULT.as_db_str())
    .bind(&req.manufacture_date)    .bind(req.shelf_life_days)
    .bind(req.unit_price)
    .bind(&req.remark)
    .bind(now)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(batch) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(batch, "创建批次成功")
        }
        Err(e) => {
            tracing::error!("创建批次失败: {}", e);
            ApiResponse::from(TopemsError::Internal("创建批次失败".to_string()))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:read"])),
    path = "/api/wms/batches/{id}",
    tag = "wms",
    responses(
        (status = 200, description = "查询成功"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误")
    )
)]
pub async fn get_batch(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Path(id): Path<String>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<Batch> {
    let tenant = match tenant_of(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let batch_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => {
            return ApiResponse::from(TopemsError::ValidationFailed("无效的批次ID".to_string()))
        }
    };

    let result = sqlx::query_as::<_, Batch>(
        only_own_schema_query!("wms", "SELECT id, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000') AS tenant_id, batch_no, sku, material_name, specification, unit, quantity, available_quantity, warehouse_id, warehouse_name, location_id, location_code, supplier_id, supplier_name, production_date, expiry_date, receipt_date, quality_status, CASE WHEN status = 'active' THEN 'in_stock' ELSE status END AS status, manufacture_date, shelf_life_days, remaining_days, unit_price, total_value, remark, created_at, updated_at FROM wms.batches WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2::uuid AND (status = ANY(ARRAY['in_stock','reserved','out_stock','frozen','scrapped']) OR status = 'active') AND quality_status = ANY(ARRAY['pending','inspecting','qualified','unqualified'])"),
    )
    .bind(batch_id)
    .bind(tenant)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(batch)) => ApiResponse::success(batch, "获取批次成功"),
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("批次不存在".to_string())),
        Err(e) => {
            tracing::error!("获取批次失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取批次失败".to_string()))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["wms:update"])),
    path = "/api/wms/batches/{id}",
    tag = "wms",
    responses(
        (status = 200, description = "更新成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误")
    )
)]
pub async fn update_batch(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<UpdateBatchRequest>,
) -> ApiResponse<Batch> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let batch_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => {
            return ApiResponse::from(TopemsError::ValidationFailed("无效的批次ID".to_string()))
        }
    };

    let now = Utc::now();

    let requested_quality = match req.quality_status.as_deref() {
        None => None,
        Some(raw) => match BatchQualityStatus::from_db_str(raw) {
            Ok(status) => Some(status.as_db_str()),
            Err(msg) => return ApiResponse::bad_request(&msg),
        },
    };
    let requested_status = match req.status.as_deref() {
        None => None,
        Some(raw) => match BatchStatus::from_read_str(raw) {
            Ok(status) => Some(status.as_db_str()),
            Err(msg) => return ApiResponse::bad_request(&msg),
        },
    };

    let result = sqlx::query_as::<_, Batch>(only_own_schema_query!(
        "wms",
        r#"
        UPDATE wms.batches SET
            batch_no = COALESCE($1, batch_no),
            sku = COALESCE($2, sku),
            material_name = COALESCE($3, material_name),
            specification = COALESCE($4, specification),
            unit = COALESCE($5, unit),
            quantity = COALESCE($6, quantity),
            warehouse_id = COALESCE($7::uuid, warehouse_id),
            location_id = COALESCE($8::uuid, location_id),
            supplier_id = COALESCE($9::uuid, supplier_id),
            production_date = COALESCE($10::date, production_date),
            expiry_date = COALESCE($11::date, expiry_date),
            quality_status = COALESCE($12, quality_status),
            status = COALESCE($13, CASE WHEN status = 'active' THEN 'in_stock' ELSE status END),
            manufacture_date = COALESCE($14::date, manufacture_date),
            shelf_life_days = COALESCE($15, shelf_life_days),
            unit_price = COALESCE($16, unit_price),
            remark = COALESCE($17, remark),
            updated_at = $18
        WHERE id = $19 AND deleted_at IS NULL
          AND (status = ANY(ARRAY['in_stock','reserved','out_stock','frozen','scrapped'])
               OR status = 'active')
          AND quality_status = ANY(ARRAY['pending','inspecting','qualified','unqualified'])
          AND (
              $12::text IS NULL OR $12 = quality_status
              OR CASE quality_status
                  WHEN 'pending' THEN $12 IN ('inspecting','qualified','unqualified')
                  WHEN 'inspecting' THEN $12 IN ('qualified','unqualified')
                  WHEN 'qualified' THEN $12 IN ('inspecting','unqualified')
                  WHEN 'unqualified' THEN $12 IN ('inspecting','qualified')
                  ELSE FALSE
              END
          )
          AND (
              $13::text IS NULL OR $13 = status
              OR ($13 = 'in_stock' AND status = 'active')
              OR CASE status
                  WHEN 'in_stock' THEN $13 IN ('reserved','out_stock','frozen','scrapped')
                  WHEN 'active' THEN $13 = 'in_stock'
                  WHEN 'reserved' THEN $13 IN ('in_stock','out_stock','frozen','scrapped')
                  WHEN 'out_stock' THEN $13 IN ('in_stock','scrapped')
                  WHEN 'frozen' THEN $13 IN ('in_stock','scrapped')
                  ELSE FALSE
              END
          )
        RETURNING *
        "#
    ))
    .bind(&req.batch_no)
    .bind(&req.sku)
    .bind(&req.material_name)
    .bind(&req.specification)
    .bind(&req.unit)
    .bind(req.quantity)
    .bind(&req.warehouse_id)
    .bind(req.location_id)
    .bind(req.supplier_id)
    .bind(&req.production_date)
    .bind(&req.expiry_date)
    .bind(requested_quality)
    .bind(requested_status)
    .bind(&req.manufacture_date)
    .bind(req.shelf_life_days)
    .bind(req.unit_price)
    .bind(&req.remark)
    .bind(now)
    .bind(batch_id)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(batch) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(batch, "更新批次成功")
        }
        Err(sqlx::Error::RowNotFound) => {
            ApiResponse::conflict("批次不存在、当前状态非法或不允许该状态流转")
        }
        Err(e) => {
            tracing::error!("更新批次失败: {}", e);
            ApiResponse::from(TopemsError::Internal("更新批次失败".to_string()))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["wms:delete"])),
    path = "/api/wms/batches/{id}",
    tag = "wms",
    responses(
        (status = 200, description = "删除成功"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误")
    )
)]
pub async fn delete_batch(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<String> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let batch_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => {
            return ApiResponse::from(TopemsError::ValidationFailed("无效的批次ID".to_string()))
        }
    };

    let result = sqlx::query(only_own_schema_query!(
        "wms",
        "UPDATE wms.batches SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL"
    ))
    .bind(batch_id)
    .execute(&mut **txn)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success("".to_string(), "删除批次成功")
        }
        Ok(_) => ApiResponse::from(TopemsError::ResourceNotFound("批次不存在".to_string())),
        Err(e) => {
            tracing::error!("删除批次失败: {}", e);
            ApiResponse::from(TopemsError::Internal("删除批次失败".to_string()))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:read"])),
    path = "/api/wms/batches/statistics",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn get_batch_statistics(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<serde_json::Value>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<BatchStatistics> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let warehouse_id = params
        .get("warehouse_id")
        .and_then(|v| v.as_str())
        .and_then(|s| Uuid::parse_str(s).ok());

    let result = sqlx::query(
        r#"
        SELECT
            COUNT(*)::bigint as total_batches,
            COALESCE(SUM(quantity), 0)::float8 as total_quantity,
            COALESCE(SUM(total_value), 0)::float8 as total_value,
            COALESCE(SUM(CASE WHEN remaining_days <= 30 AND remaining_days > 0 THEN 1 ELSE 0 END), 0)::bigint as expiring_soon_count,
            COALESCE(SUM(CASE WHEN remaining_days <= 0 THEN 1 ELSE 0 END), 0)::bigint as expired_count,
            COALESCE(SUM(CASE WHEN quality_status = 'pending' THEN 1 ELSE 0 END), 0)::bigint as quality_pending_count
        FROM wms.batches
        WHERE deleted_at IS NULL
          AND ($1::uuid IS NULL OR warehouse_id = $1::uuid)
          AND (status = ANY(ARRAY['in_stock','reserved','out_stock','frozen','scrapped'])
               OR status = 'active')
          AND quality_status = ANY(ARRAY['pending','inspecting','qualified','unqualified'])
        "#,
    )
    .bind(warehouse_id)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(row) => {
            let statistics = BatchStatistics {
                total_batches: row.try_get("total_batches").unwrap_or(0),
                total_quantity: row.try_get("total_quantity").unwrap_or(0.0),
                total_value: row.try_get("total_value").unwrap_or(0.0),
                expiring_soon_count: row.try_get("expiring_soon_count").unwrap_or(0),
                expired_count: row.try_get("expired_count").unwrap_or(0),
                quality_pending_count: row.try_get("quality_pending_count").unwrap_or(0),
            };
            ApiResponse::success(statistics, "获取批次统计成功")
        }
        Err(e) => {
            tracing::error!("获取批次统计失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取批次统计失败".to_string()))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:read"])),
    path = "/batches/expiring-soon",
    tag = "batch",
    operation_id = "get_expiring_soon",
    responses(
        (status = 200, description = "OK"),
    ),
)]
#[allow(clippy::as_conversions, clippy::cast_possible_truncation)]
pub async fn get_expiring_soon(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Query(params): Query<serde_json::Value>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<Vec<Batch>> {
    let tenant = match tenant_of(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let days: i32 = params.get("days").and_then(|v| v.as_i64()).unwrap_or(30) as i32;
    let warehouse_id = params
        .get("warehouse_id")
        .and_then(|v| v.as_str())
        .and_then(|s| Uuid::parse_str(s).ok());

    let result = sqlx::query_as::<_, Batch>(
        only_own_schema_query!("wms", r#"
        SELECT id, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000') AS tenant_id, batch_no, sku, material_name, specification, unit, quantity, available_quantity, warehouse_id, warehouse_name, location_id, location_code, supplier_id, supplier_name, production_date, expiry_date, receipt_date, quality_status, CASE WHEN status = 'active' THEN 'in_stock' ELSE status END AS status, manufacture_date, shelf_life_days, remaining_days, unit_price, total_value, remark, created_at, updated_at FROM wms.batches
        WHERE deleted_at IS NULL AND remaining_days <= $1 AND remaining_days > 0
          AND (warehouse_id = $2 OR $2 IS NULL)
          AND tenant_id = $3::uuid
          AND status IN ('in_stock','reserved','frozen')
          AND quality_status = ANY(ARRAY['pending','inspecting','qualified','unqualified'])
        ORDER BY remaining_days ASC
        "#),
    )
    .bind(days)
    .bind(warehouse_id)
    .bind(tenant)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(batches) => ApiResponse::success(batches, "获取即将过期批次成功"),
        Err(e) => {
            tracing::error!("获取即将过期批次失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取即将过期批次失败".to_string()))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:read"])),
    path = "/batches/expired",
    tag = "batch",
    operation_id = "get_expired",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_expired(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Query(params): Query<serde_json::Value>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<Vec<Batch>> {
    let tenant = match tenant_of(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let warehouse_id = params
        .get("warehouse_id")
        .and_then(|v| v.as_str())
        .and_then(|s| Uuid::parse_str(s).ok());

    let result = sqlx::query_as::<_, Batch>(
        only_own_schema_query!("wms", r#"
        SELECT id, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000') AS tenant_id, batch_no, sku, material_name, specification, unit, quantity, available_quantity, warehouse_id, warehouse_name, location_id, location_code, supplier_id, supplier_name, production_date, expiry_date, receipt_date, quality_status, CASE WHEN status = 'active' THEN 'in_stock' ELSE status END AS status, manufacture_date, shelf_life_days, remaining_days, unit_price, total_value, remark, created_at, updated_at FROM wms.batches
        WHERE deleted_at IS NULL AND remaining_days <= 0
          AND (warehouse_id = $1::uuid OR $1 IS NULL)
          AND tenant_id = $2::uuid
          AND status IN ('in_stock','reserved','frozen')
          AND quality_status = ANY(ARRAY['pending','inspecting','qualified','unqualified'])
        ORDER BY remaining_days ASC
        "#),
    )
    .bind(warehouse_id)
    .bind(tenant)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(batches) => ApiResponse::success(batches, "获取已过期批次成功"),
        Err(e) => {
            tracing::error!("获取已过期批次失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取已过期批次失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:write"])),
    path = "/batches/{id}/adjust-quantity",
    tag = "batch",
    operation_id = "adjust_quantity",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn adjust_quantity(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(data): Json<serde_json::Value>,
) -> ApiResponse<Batch> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let batch_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => {
            return ApiResponse::from(TopemsError::ValidationFailed("无效的批次ID".to_string()))
        }
    };

    let quantity = data.get("quantity").and_then(|v| v.as_f64()).unwrap_or(0.0);

    let result = sqlx::query_as::<_, Batch>(only_own_schema_query!(
        "wms",
        r#"
        UPDATE wms.batches SET
            quantity = quantity + $1,
            available_quantity = available_quantity + $1,
            updated_at = NOW()
        WHERE id = $2 AND deleted_at IS NULL
          AND status IN ('in_stock','reserved')
        RETURNING *
        "#
    ))
    .bind(quantity)
    .bind(batch_id)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(batch) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(batch, "调整数量成功")
        }
        Err(sqlx::Error::RowNotFound) => {
            ApiResponse::conflict("批次不存在或当前状态不允许调整数量")
        }
        Err(e) => {
            tracing::error!("调整数量失败: {}", e);
            ApiResponse::from(TopemsError::Internal("调整数量失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:transfer:write"])),
    path = "/batches/{id}/transfer-location",
    tag = "batch",
    operation_id = "transfer_location",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn transfer_location(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(data): Json<serde_json::Value>,
) -> ApiResponse<Batch> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let batch_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => {
            return ApiResponse::from(TopemsError::ValidationFailed("无效的批次ID".to_string()))
        }
    };

    // to_location_id 为 UUID 字符串；空串/缺省表示保持原库位，非法 UUID 返回 400
    let to_location_id: Option<Uuid> = match data.get("to_location_id").and_then(|v| v.as_str()) {
        Some(s) if !s.trim().is_empty() => match Uuid::parse_str(s.trim()) {
            Ok(uuid) => Some(uuid),
            Err(_) => {
                return ApiResponse::from(TopemsError::ValidationFailed("无效的库位ID".to_string()))
            }
        },
        _ => None,
    };

    let result = sqlx::query_as::<_, Batch>(only_own_schema_query!(
        "wms",
        r#"
        UPDATE wms.batches SET
            location_id = COALESCE($1::uuid, location_id),
            updated_at = NOW()
        WHERE id = $2 AND deleted_at IS NULL
          AND status IN ('in_stock','reserved')
        RETURNING *
        "#
    ))
    .bind(to_location_id)
    .bind(batch_id)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(batch) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(batch, "转移库位成功")
        }
        Err(sqlx::Error::RowNotFound) => {
            ApiResponse::conflict("批次不存在或当前状态不允许转移库位")
        }
        Err(e) => {
            tracing::error!("转移库位失败: {}", e);
            ApiResponse::from(TopemsError::Internal("转移库位失败".to_string()))
        }
    }
}
