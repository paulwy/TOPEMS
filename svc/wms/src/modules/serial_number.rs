use axum::{
    extract::{Extension, FromRef, Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use sqlx::Row;
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use crate::models::{
    CreateSerialNumberRequest, SerialNumber, SerialNumberQueryParams, SerialNumberStatistics,
    UpdateSerialNumberRequest,
};
use crate::modules::ApiState;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::{api_error, ApiResponse};

pub fn create_routes<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
    ApiState: FromRef<S>,
{
    Router::new()
        .route(
            "/serial-numbers",
            get(list_serial_numbers).post(create_serial_number),
        )
        .route("/serial-numbers/bulk", post(bulk_create_serial_numbers))
        .route(
            "/serial-numbers/statistics",
            get(get_serial_number_statistics),
        )
        .route("/serial-numbers/by-batch/{batch_no}", get(get_by_batch))
        .route(
            "/serial-numbers/by-serial/{serial_no}",
            get(get_by_serial_no),
        )
        .route(
            "/serial-numbers/{id}",
            get(get_serial_number)
                .put(update_serial_number)
                .delete(delete_serial_number),
        )
        .route(
            "/serial-numbers/{id}/transfer-location",
            post(transfer_location),
        )
        .route("/serial-numbers/{id}/trace", get(get_trace))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:serial:read"])),
    path = "/api/wms/serial-numbers",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn list_serial_numbers(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<SerialNumberQueryParams>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, SerialNumber>(
        only_own_schema_query!("wms", r#"
        SELECT id, tenant_id, serial_no, sku, material_name, specification, unit, warehouse_id, warehouse_name, location_id, location_code, supplier_id, supplier_name, batch_no, production_date, expiry_date, quality_status, status, warranty_start_date, warranty_end_date, inbound_order_no, outbound_order_no, current_owner, unit_price, remark, created_at, updated_at FROM wms.serial_numbers
        WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR warehouse_id = $1)
          AND ($2::text IS NULL OR sku ILIKE $2)
          AND ($3::text IS NULL OR serial_no ILIKE $3)
          AND ($4::uuid IS NULL OR supplier_id = $4)
          AND ($5::text IS NULL OR batch_no ILIKE $5)
          AND ($6::text IS NULL OR quality_status = $6)
          AND ($7::text IS NULL OR status = $7)
        ORDER BY created_at DESC
        LIMIT $8 OFFSET $9
        "#),
    )
    .bind(params.warehouse_id)
    .bind(params.sku.as_ref().map(|s| format!("%{}%", s)))
    .bind(params.serial_no.as_ref().map(|s| format!("%{}%", s)))
    .bind(params.supplier_id)
    .bind(params.batch_no.as_ref().map(|s| format!("%{}%", s)))
    .bind(&params.quality_status)
    .bind(&params.status)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(serials) => {
            let total = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "wms",
                r#"
                SELECT COUNT(*) FROM wms.serial_numbers
                WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR warehouse_id = $1)
                  AND ($2::text IS NULL OR sku ILIKE $2)
                  AND ($3::text IS NULL OR serial_no ILIKE $3)
                  AND ($4::uuid IS NULL OR supplier_id = $4)
                  AND ($5::text IS NULL OR batch_no ILIKE $5)
                  AND ($6::text IS NULL OR quality_status = $6)
                  AND ($7::text IS NULL OR status = $7)
                "#
            ))
            .bind(params.warehouse_id)
            .bind(params.sku.as_ref().map(|s| format!("%{}%", s)))
            .bind(params.serial_no.as_ref().map(|s| format!("%{}%", s)))
            .bind(params.supplier_id)
            .bind(params.batch_no.as_ref().map(|s| format!("%{}%", s)))
            .bind(&params.quality_status)
            .bind(&params.status)
            .fetch_one(&mut **txn)
            .await
            .unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": serials,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取序列号列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取序列号列表失败: {}", e);
            Json(api_error(500, "获取序列号列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:serial:read"])),
    path = "/api/wms/serial-numbers",
    tag = "wms",
    responses(
        (status = 201, description = "创建成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 500, description = "服务内部错误")
    )
)]
pub async fn create_serial_number(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CreateSerialNumberRequest>,
) -> Json<ApiResponse<SerialNumber>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, SerialNumber>(
        only_own_schema_query!("wms", r#"
        INSERT INTO wms.serial_numbers (
            id, serial_no, sku, material_name, specification, unit,
            warehouse_id, location_id, supplier_id, batch_no,
            production_date, expiry_date, quality_status, status,
            warranty_start_date, warranty_end_date, inbound_order_no,
            unit_price, remark, created_at, updated_at, tenant_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
        RETURNING *
        "#),
    )
    .bind(id)
    .bind(&req.serial_no)
    .bind(&req.sku)
    .bind(&req.material_name)
    .bind(&req.specification)
    .bind(&req.unit)
    .bind(req.warehouse_id)
    .bind(req.location_id)
    .bind(req.supplier_id)
    .bind(&req.batch_no)
    .bind(&req.production_date)
    .bind(&req.expiry_date)
    .bind(req.quality_status.as_deref().unwrap_or("pending"))
    .bind("in_stock")
    .bind(&req.warranty_start_date)
    .bind(&req.warranty_end_date)
    .bind(&req.inbound_order_no)
    .bind(req.unit_price)
    .bind(&req.remark)
    .bind(now)
    .bind(now)
    .bind(claims.tenant_id.as_deref().and_then(|s| Uuid::parse_str(s).ok()).unwrap_or(Uuid::nil()))
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(serial) => Json(ApiResponse::success(serial, "创建序列号成功")),
        Err(e) => {
            tracing::error!("创建序列号失败: {}", e);
            Json(api_error(500, "创建序列号失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:serial:read"])),
    path = "/api/wms/serial-numbers/bulk",
    tag = "wms",
    responses(
        (status = 201, description = "批量创建成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 500, description = "服务内部错误")
    )
)]
pub async fn bulk_create_serial_numbers(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<Vec<CreateSerialNumberRequest>>,
) -> Json<ApiResponse<Vec<SerialNumber>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let mut created_serials = Vec::new();
    let now = Utc::now();
    let tenant_id = claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or(Uuid::nil());

    for item in req {
        let id = Uuid::new_v4();
        let result = sqlx::query_as::<_, SerialNumber>(
            only_own_schema_query!("wms", r#"
            INSERT INTO wms.serial_numbers (
                id, serial_no, sku, material_name, specification, unit,
                warehouse_id, location_id, supplier_id, batch_no,
                production_date, expiry_date, quality_status, status,
                warranty_start_date, warranty_end_date, inbound_order_no,
                unit_price, remark, created_at, updated_at, tenant_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
            RETURNING *
            "#),
        )
        .bind(id)
        .bind(&item.serial_no)
        .bind(&item.sku)
        .bind(&item.material_name)
        .bind(&item.specification)
        .bind(&item.unit)
        .bind(item.warehouse_id)
        .bind(item.location_id)
        .bind(item.supplier_id)
        .bind(&item.batch_no)
        .bind(&item.production_date)
        .bind(&item.expiry_date)
        .bind(item.quality_status.as_deref().unwrap_or("pending"))
        .bind("in_stock")
        .bind(&item.warranty_start_date)
        .bind(&item.warranty_end_date)
        .bind(&item.inbound_order_no)
        .bind(item.unit_price)
        .bind(&item.remark)
        .bind(now)
        .bind(now)
        .bind(tenant_id)
        .fetch_one(&mut **txn)
        .await;

        if let Ok(serial) = result {
            created_serials.push(serial);
        }
    }

    Json(ApiResponse::success(created_serials, "批量创建序列号成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:serial:read"])),
    path = "/api/wms/serial-numbers/{id}",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn get_serial_number(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<SerialNumber>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let serial_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的序列号ID")),
    };

    let result = sqlx::query_as::<_, SerialNumber>(
        only_own_schema_query!("wms", "SELECT id, tenant_id, serial_no, sku, material_name, specification, unit, warehouse_id, warehouse_name, location_id, location_code, supplier_id, supplier_name, batch_no, production_date, expiry_date, quality_status, status, warranty_start_date, warranty_end_date, inbound_order_no, outbound_order_no, current_owner, unit_price, remark, created_at, updated_at FROM wms.serial_numbers WHERE deleted_at IS NULL AND id = $1"),
    )
    .bind(serial_id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(serial)) => Json(ApiResponse::success(serial, "获取序列号成功")),
        Ok(None) => Json(api_error(404, "序列号不存在")),
        Err(e) => {
            tracing::error!("获取序列号失败: {}", e);
            Json(api_error(500, "获取序列号失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:serial:read"])),
    path = "/serial-numbers/by-serial/{serial_no}",
    tag = "serial_number",
    operation_id = "get_by_serial_no",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_by_serial_no(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(serial_no): Path<String>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<SerialNumber>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result = sqlx::query_as::<_, SerialNumber>(
        only_own_schema_query!("wms", "SELECT id, tenant_id, serial_no, sku, material_name, specification, unit, warehouse_id, warehouse_name, location_id, location_code, supplier_id, supplier_name, batch_no, production_date, expiry_date, quality_status, status, warranty_start_date, warranty_end_date, inbound_order_no, outbound_order_no, current_owner, unit_price, remark, created_at, updated_at FROM wms.serial_numbers WHERE deleted_at IS NULL AND serial_no = $1"),
    )
    .bind(serial_no)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(serial)) => Json(ApiResponse::success(serial, "获取序列号成功")),
        Ok(None) => Json(api_error(404, "序列号不存在")),
        Err(e) => {
            tracing::error!("获取序列号失败: {}", e);
            Json(api_error(500, "获取序列号失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:read"])),
    path = "/serial-numbers/by-batch/{batch_no}",
    tag = "serial_number",
    operation_id = "get_by_batch",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_by_batch(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(batch_no): Path<String>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<Vec<SerialNumber>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result = sqlx::query_as::<_, SerialNumber>(
        only_own_schema_query!("wms", "SELECT id, tenant_id, serial_no, sku, material_name, specification, unit, warehouse_id, warehouse_name, location_id, location_code, supplier_id, supplier_name, batch_no, production_date, expiry_date, quality_status, status, warranty_start_date, warranty_end_date, inbound_order_no, outbound_order_no, current_owner, unit_price, remark, created_at, updated_at FROM wms.serial_numbers WHERE deleted_at IS NULL AND batch_no = $1 ORDER BY created_at DESC"),
    )
    .bind(batch_no)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(serials) => Json(ApiResponse::success(serials, "获取批次序列号成功")),
        Err(e) => {
            tracing::error!("获取批次序列号失败: {}", e);
            Json(api_error(500, "获取批次序列号失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["wms:serial:read"])),
    path = "/api/wms/serial-numbers/{id}",
    tag = "wms",
    responses(
        (status = 200, description = "更新成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误")
    )
)]
pub async fn update_serial_number(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<UpdateSerialNumberRequest>,
) -> Json<ApiResponse<SerialNumber>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let serial_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的序列号ID")),
    };

    let now = Utc::now();

    let result = sqlx::query_as::<_, SerialNumber>(only_own_schema_query!(
        "wms",
        r#"
        UPDATE wms.serial_numbers SET
            sku = COALESCE($1, sku),
            material_name = COALESCE($2, material_name),
            specification = COALESCE($3, specification),
            unit = COALESCE($4, unit),
            warehouse_id = COALESCE($5, warehouse_id),
            location_id = COALESCE($6, location_id),
            supplier_id = COALESCE($7, supplier_id),
            batch_no = COALESCE($8, batch_no),
            production_date = COALESCE($9, production_date),
            expiry_date = COALESCE($10, expiry_date),
            quality_status = COALESCE($11, quality_status),
            status = COALESCE($12, status),
            warranty_start_date = COALESCE($13, warranty_start_date),
            warranty_end_date = COALESCE($14, warranty_end_date),
            outbound_order_no = COALESCE($15, outbound_order_no),
            current_owner = COALESCE($16, current_owner),
            unit_price = COALESCE($17, unit_price),
            remark = COALESCE($18, remark),
            updated_at = $19
        WHERE id = $20
        RETURNING *
        "#
    ))
    .bind(&req.sku)
    .bind(&req.material_name)
    .bind(&req.specification)
    .bind(&req.unit)
    .bind(req.warehouse_id)
    .bind(req.location_id)
    .bind(req.supplier_id)
    .bind(&req.batch_no)
    .bind(&req.production_date)
    .bind(&req.expiry_date)
    .bind(&req.quality_status)
    .bind(&req.status)
    .bind(&req.warranty_start_date)
    .bind(&req.warranty_end_date)
    .bind(&req.outbound_order_no)
    .bind(&req.current_owner)
    .bind(req.unit_price)
    .bind(&req.remark)
    .bind(now)
    .bind(serial_id)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(serial) => Json(ApiResponse::success(serial, "更新序列号成功")),
        Err(sqlx::Error::RowNotFound) => Json(api_error(404, "序列号不存在")),
        Err(e) => {
            tracing::error!("更新序列号失败: {}", e);
            Json(api_error(500, "更新序列号失败"))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["wms:serial:read"])),
    path = "/api/wms/serial-numbers/{id}",
    tag = "wms",
    responses(
        (status = 200, description = "删除成功"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误")
    )
)]
pub async fn delete_serial_number(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<String>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let serial_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的序列号ID")),
    };

    let result = sqlx::query(only_own_schema_query!(
        "wms",
        "UPDATE wms.serial_numbers SET deleted_at = NOW() WHERE id = $1"
    ))
    .bind(serial_id)
    .execute(&mut **txn)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return Json(ApiResponse::error(500, "事务提交失败"));
                }
            }
            Json(ApiResponse::success("".to_string(), "删除序列号成功"))
        }
        Ok(_) => Json(api_error(404, "序列号不存在")),
        Err(e) => {
            tracing::error!("删除序列号失败: {}", e);
            Json(api_error(500, "删除序列号失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:serial:read"])),
    path = "/api/wms/serial-numbers/statistics",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn get_serial_number_statistics(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<serde_json::Value>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<SerialNumberStatistics>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let warehouse_id = params
        .get("warehouse_id")
        .and_then(|v| v.as_str())
        .and_then(|s| Uuid::parse_str(s).ok());

    let result = sqlx::query(
        only_own_schema_query!("wms", r#"
        SELECT
            COUNT(*) as total_serials,
            SUM(CASE WHEN status = 'in_stock' THEN 1 ELSE 0 END) as in_stock_count,
            SUM(CASE WHEN status = 'out_stock' THEN 1 ELSE 0 END) as out_stock_count,
            SUM(CASE WHEN quality_status = 'pending' THEN 1 ELSE 0 END) as quality_pending_count,
            SUM(CASE WHEN warranty_end_date IS NOT NULL AND warranty_end_date <= NOW() + INTERVAL '30 days' THEN 1 ELSE 0 END) as warranty_expiring_soon_count
        FROM wms.serial_numbers
        WHERE warehouse_id = $1 OR $1 IS NULL
        "#),
    )
    .bind(warehouse_id)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(row) => {
            let statistics = SerialNumberStatistics {
                total_serials: row.try_get::<i64, _>("total_serials").unwrap_or(0),
                in_stock_count: row.try_get::<i64, _>("in_stock_count").unwrap_or(0),
                out_stock_count: row.try_get::<i64, _>("out_stock_count").unwrap_or(0),
                quality_pending_count: row.try_get::<i64, _>("quality_pending_count").unwrap_or(0),
                warranty_expiring_soon_count: row
                    .try_get::<i64, _>("warranty_expiring_soon_count")
                    .unwrap_or(0),
            };
            Json(ApiResponse::success(statistics, "获取序列号统计成功"))
        }
        Err(e) => {
            tracing::error!("获取序列号统计失败: {}", e);
            Json(api_error(500, "获取序列号统计失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:transfer:write"])),
    path = "/serial-numbers/{id}/transfer-location",
    tag = "serial_number",
    operation_id = "transfer_location",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn transfer_location(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(data): Json<serde_json::Value>,
) -> Json<ApiResponse<SerialNumber>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let serial_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的序列号ID")),
    };

    let to_location_id = data
        .get("to_location_id")
        .and_then(|v| v.as_str())
        .and_then(|s| Uuid::parse_str(s).ok());

    let result = sqlx::query_as::<_, SerialNumber>(only_own_schema_query!(
        "wms",
        r#"
        UPDATE wms.serial_numbers SET
            location_id = $1,
            updated_at = NOW()
        WHERE id = $2
        RETURNING *
        "#
    ))
    .bind(to_location_id)
    .bind(serial_id)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(serial) => Json(ApiResponse::success(serial, "转移库位成功")),
        Err(sqlx::Error::RowNotFound) => Json(api_error(404, "序列号不存在")),
        Err(e) => {
            tracing::error!("转移库位失败: {}", e);
            Json(api_error(500, "转移库位失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:read"])),
    path = "/serial-numbers/{id}/trace",
    tag = "serial_number",
    operation_id = "get_trace",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_trace(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    let mut guard = txn_arc.lock().await;
    let _txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let _serial_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的序列号ID")),
    };

    Json(ApiResponse::success(vec![], "获取序列号追踪成功"))
}
