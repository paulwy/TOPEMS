use axum::{
    extract::{Extension, FromRef, Path, Query, State},
    http::HeaderMap,
    routing::get,
    Json, Router,
};
use chrono::Utc;
use num_traits::cast::ToPrimitive;
use serde::Deserialize;
use sqlx::Row;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::TopemsError;
use uuid::Uuid;

use crate::models::{CreateInventoryItemRequest, InventoryItem, UpdateInventoryItemRequest};
use crate::modules::audit::log_audit_event;
use crate::modules::openapi::Inventory;
use crate::modules::ApiState;
use crate::shared::permission::{check_permission, ModulePermission};
use crate::shared::scope::{movement_no, release_request_txn, tenant_of, wms_db};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::{ApiResponse, ListResponse};
use topems_shared_db::decimal::{big_decimal_to_f64, big_decimal_to_f64_non_opt};
fn inventory_row_to_json(row: &sqlx::postgres::PgRow) -> serde_json::Value {
    serde_json::json!({
        "id": row.get::<uuid::Uuid, _>("id"),
        "sku": row.get::<String, _>("sku"),
        "name": row.get::<String, _>("name"),
        "specification": row.get::<Option<String>, _>("specification"),
        "unit": row.get::<Option<String>, _>("unit"),
        "quantity": big_decimal_to_f64_non_opt(row.get::<bigdecimal::BigDecimal, _>("quantity")),
        "available_quantity": big_decimal_to_f64(row.get::<Option<bigdecimal::BigDecimal>, _>("available_quantity")),
        "location_id": row.get::<Option<Uuid>, _>("location_id"),
        "warehouse_id": row.get::<Option<Uuid>, _>("warehouse_id"),
        "min_quantity": big_decimal_to_f64(row.get::<Option<bigdecimal::BigDecimal>, _>("min_quantity")),
        "max_quantity": big_decimal_to_f64(row.get::<Option<bigdecimal::BigDecimal>, _>("max_quantity")),
        "status": row.get::<String, _>("status"),
        "created_at": row.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
        "updated_at": row.get::<chrono::DateTime<chrono::Utc>, _>("updated_at"),
    })
}

#[derive(Debug, Deserialize)]
pub struct InventoryPaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub warehouse_id: Option<Uuid>,
}

pub fn create_routes<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
    ApiState: FromRef<S>,
{
    Router::new()
        .route("/dashboard", get(get_wms_dashboard))
        .route("/inventory", get(list_inventory).post(create_inventory))
        .route("/inventory/low-stock", get(list_low_stock_inventory))
        .route(
            "/inventory/warehouse/{warehouse_id}",
            get(list_inventory_by_warehouse),
        )
        .route("/inventory/statistics", get(get_inventory_statistics))
        .route("/inventory/abc-analysis", get(get_abc_analysis))
        .route("/inventory/turnover", get(get_turnover))
        .route("/inventory/value-by-warehouse", get(get_value_by_warehouse))
        .route(
            "/inventory/{id}",
            get(get_inventory)
                .put(update_inventory)
                .delete(delete_inventory),
        )
}

/// WMS 总览看板（GET /api/wms/dashboard）。
///
/// 前端 wms/dashboard.ts 真实消费。采用防御式逐指标查询：任一子查询失败
/// 均降级为 0 / 空数组，避免因单表漂移导致整个看板 500。
pub async fn get_wms_dashboard(
    State(state): State<ApiState>,
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
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let scalar_i64 =
        |row: &sqlx::postgres::PgRow, col: &str| -> i64 { row.try_get::<i64, _>(col).unwrap_or(0) };

    let total_inventory: i64 = sqlx::query_scalar(only_own_schema_query!(
        "wms",
        "SELECT COUNT(*) FROM wms.inventory WHERE deleted_at IS NULL"
    ))
    .fetch_one(&mut **txn)
    .await
    .unwrap_or(0);

    let pending_inbound: i64 = sqlx::query_scalar(only_own_schema_query!(
        "wms",
        "SELECT COUNT(*) FROM wms.inbound_orders WHERE deleted_at IS NULL AND status IN ('created','received')"
    ))
    .fetch_one(&mut **txn)
    .await
    .unwrap_or(0);

    let pending_outbound: i64 = sqlx::query_scalar(only_own_schema_query!(
        "wms",
        "SELECT COUNT(*) FROM wms.outbound_orders WHERE deleted_at IS NULL AND status IN ('created','confirmed','picking','packing','shipping')"
    ))
    .fetch_one(&mut **txn)
    .await
    .unwrap_or(0);

    // 库位利用率：取仓库存量利用率均值（无数据则 0）
    let utilization_row = sqlx::query(only_own_schema_query!(
        "wms",
        "SELECT AVG(utilization_rate)::float8 AS avg_util FROM wms.warehouses WHERE deleted_at IS NULL"
    ))
    .fetch_one(&mut **txn)
    .await;
    let location_utilization: f64 = utilization_row
        .as_ref()
        .ok()
        .and_then(|r| r.try_get::<f64, _>("avg_util").ok())
        .unwrap_or(0.0);

    // 出入库趋势（近 7 日）—— 防御式：失败返回空数组
    let inbound_trend: Vec<serde_json::Value> = sqlx::query(only_own_schema_query!(
        "wms",
        r#"
        SELECT to_char(created_at, 'MM-DD') AS day, COUNT(*) AS cnt
        FROM wms.inbound_orders
        WHERE deleted_at IS NULL AND created_at >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY 1 ORDER BY 1
        "#
    ))
    .fetch_all(&mut **txn)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|r| {
        serde_json::json!({
            "name": r.try_get::<String, _>("day").unwrap_or_default(),
            "value": scalar_i64(&r, "cnt"),
        })
    })
    .collect();

    let outbound_trend: Vec<serde_json::Value> = sqlx::query(only_own_schema_query!(
        "wms",
        r#"
        SELECT to_char(created_at, 'MM-DD') AS day, COUNT(*) AS cnt
        FROM wms.outbound_orders
        WHERE deleted_at IS NULL AND created_at >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY 1 ORDER BY 1
        "#
    ))
    .fetch_all(&mut **txn)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|r| {
        serde_json::json!({
            "name": r.try_get::<String, _>("day").unwrap_or_default(),
            "value": scalar_i64(&r, "cnt"),
        })
    })
    .collect();

    ApiResponse::success(
        serde_json::json!({
            "total_inventory": total_inventory,
            "pending_inbound": pending_inbound,
            "pending_outbound": pending_outbound,
            "location_utilization": location_utilization,
            "inbound_trend": inbound_trend,
            "outbound_trend": outbound_trend,
        }),
        "获取WMS看板成功",
    )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:inventory:read"])),
    path = "/api/wms/inventory",
    responses(
        (status = 200, description = "list_inventory OK")
    ),
    tag = "WMS/inventory"
)]
pub async fn list_inventory(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<InventoryPaginationParams>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> ApiResponse<ListResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();
    let warehouse_id = params.warehouse_id;

    let result = sqlx::query(only_own_schema_query!(
        "wms",
        r#"
        SELECT id, material_code as sku, material_name as name, specification, unit, quantity, 
               available_quantity, reserved_quantity, location_id, warehouse_id, 
               min_quantity, max_quantity, reorder_point, quality_status as status,
               batch_number, lot_number, expiry_date, supplier_name, total_value,
               created_at, updated_at
        FROM wms.inventory
        WHERE ($1::text IS NULL OR material_name ILIKE $1 OR material_code ILIKE $1)
          AND ($2::text IS NULL OR quality_status = $2)
          AND ($3::uuid IS NULL OR warehouse_id = $3)
          AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#
    ))
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(warehouse_id)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(items) => {
            let count_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "wms",
                r#"
                SELECT COUNT(*) FROM wms.inventory
                WHERE ($1::text IS NULL OR material_name ILIKE $1 OR material_code ILIKE $1)
                  AND ($2::text IS NULL OR quality_status = $2)
                  AND ($3::uuid IS NULL OR warehouse_id = $3)
                  AND deleted_at IS NULL
                "#
            ))
            .bind(&search_pattern)
            .bind(&status_filter)
            .bind(warehouse_id)
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);
            let items_json: Vec<serde_json::Value> =
                items.iter().map(inventory_row_to_json).collect();

            ApiResponse::success(
                ListResponse::with_pagination(items_json, total, page, page_size),
                "获取库存列表成功",
            )
        }
        Err(e) => {
            tracing::error!("获取库存列表失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取库存列表失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:inventory:read"])),
    path = "/api/wms/inventory",
    responses(
        (status = 201, description = "创建成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 500, description = "服务内部错误")
    ),
    tag = "WMS/inventory"
)]
pub async fn create_inventory(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CreateInventoryItemRequest>,
) -> ApiResponse<InventoryItem> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let request_data = serde_json::to_value(&req).ok();
    let id = Uuid::new_v4();
    let now = Utc::now();

    // 严格租户：超管的租户由中间件从 x-tenant-id 写入 claims，这里不再落 NULL。
    let tenant_id = match tenant_of(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };

    let result = sqlx::query_as::<_, InventoryItem>(
        only_own_schema_query!("wms", r#"
        INSERT INTO wms.inventory (id, org_id, organization_id, warehouse_id, location_id,
                                   material_code, material_name, specification,
                                   quantity, unit, available_quantity,
                                   min_quantity, max_quantity, quality_status, created_at, updated_at, tenant_id)
        VALUES ($1,
                COALESCE($13, '00000000-0000-0000-0000-000000000002'),
                COALESCE($13, '00000000-0000-0000-0000-000000000002'),
                $2, $3, $4, $5, $6, $7, $8, $7, $9, $10,
                'qualified', $11, $12, $13)
        RETURNING id, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000') AS tenant_id,
                  material_code as sku, material_name as name, specification, unit, quantity::float8,
                  location_id, warehouse_id, min_quantity::float8, max_quantity::float8, quality_status as status,
                  created_at, updated_at
        "#),
    )
    .bind(id)
    .bind(req.warehouse_id)
    .bind(req.location_id)
    .bind(&req.sku)
    .bind(&req.name)
    .bind(&req.specification)
    .bind(req.quantity)
    .bind(&req.unit)
    .bind(req.min_quantity)
    .bind(req.max_quantity)
    .bind(now)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await;

    let (response, status, error_msg) = match &result {
        Ok(item) => (
            ApiResponse::success(item.clone(), "库存创建成功"),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("创建库存失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("库存创建失败".to_string())),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(item) = &result {
        serde_json::to_value(item).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "inventory".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status.to_string(),
        error_msg,
        &headers,
    )
    .await;

    if result.is_ok() {
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("事务提交失败: {}", e);
                return ApiResponse::server_error("事务提交失败");
            }
        }
    }

    response
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:inventory:read"])),
    path = "/api/wms/inventory/{id}",
    params(
        ("id" = Uuid, Path, description = "id")
    ),
    responses(
        (status = 200, description = "查询成功", body = Inventory, content_type = "application/json"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误")
    ),
    tag = "WMS/inventory"
)]
pub async fn get_inventory(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let result = sqlx::query(only_own_schema_query!(
        "wms",
        r#"
        SELECT id, material_code as sku, material_name as name, specification, unit, quantity, 
               available_quantity, reserved_quantity, location_id, warehouse_id, 
               min_quantity, max_quantity, reorder_point, quality_status as status,
               batch_number, lot_number, expiry_date, supplier_name, supplier_code, 
               purchase_price, total_value, last_movement_date, last_movement_type,
               created_at, updated_at
        FROM wms.inventory WHERE id = $1 AND deleted_at IS NULL
        "#
    ))
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(item)) => {
            let item_json = inventory_row_to_json(&item);
            ApiResponse::success(item_json, "获取库存成功")
        }
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("库存不存在".to_string())),
        Err(e) => {
            tracing::error!("获取库存失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取库存失败".to_string()))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["wms:inventory:read"])),
    path = "/api/wms/inventory/{id}",
    params(
        ("id" = Uuid, Path, description = "id")
    ),
    responses(
        (status = 200, description = "更新成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误")
    ),
    tag = "WMS/inventory"
)]
pub async fn update_inventory(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<UpdateInventoryItemRequest>,
) -> ApiResponse<serde_json::Value> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant = match tenant_of(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let request_data = serde_json::to_value(&req).ok();

    // D2：绝对值覆盖 + 行锁。改用独立短事务，锁住目标行后读旧值算差额，
    // 并发 PUT 不会出现「读旧值 → 互相覆盖 → movement 差分失真」。
    if let Err(e) = release_request_txn(&txn_arc).await {
        tracing::error!("释放请求事务失败: {}", e);
        return ApiResponse::server_error("事务释放失败");
    }
    let db = wms_db(&state.db);
    let mut scope = match db.scope_for_tenant(tenant).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启库存调整事务失败: {}", e);
            return ApiResponse::server_error("开启事务失败");
        }
    };

    let existing_result = sqlx::query(
        only_own_schema_query!("wms", r#"
        SELECT id, material_code, material_name, specification, unit, quantity::float8, 
               available_quantity::float8, location_id, warehouse_id, min_quantity::float8, max_quantity::float8, quality_status
        FROM wms.inventory WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
        FOR UPDATE
        "#),
    )
    .bind(id)
    .bind(tenant)
    .fetch_optional(&mut scope)
    .await;

    let existing = match existing_result {
        Ok(Some(r)) => r,
        Ok(None) => {
            let _ = scope.rollback().await;
            return ApiResponse::from(TopemsError::ResourceNotFound("库存不存在".to_string()));
        }
        Err(e) => {
            tracing::error!("锁定库存行失败: {}", e);
            let _ = scope.rollback().await;
            return ApiResponse::from(TopemsError::internal("查询库存失败", e));
        }
    };

    let sku = req.sku.unwrap_or_else(|| {
        existing
            .try_get::<String, _>("material_code")
            .unwrap_or_default()
    });
    let name = req.name.unwrap_or_else(|| {
        existing
            .try_get::<String, _>("material_name")
            .unwrap_or_default()
    });
    let specification = req.specification.or_else(|| {
        existing
            .try_get::<Option<String>, _>("specification")
            .ok()
            .flatten()
    });
    let unit = req
        .unit
        .or_else(|| existing.try_get::<Option<String>, _>("unit").ok().flatten());
    let quantity = req
        .quantity
        .unwrap_or_else(|| existing.try_get::<f64, _>("quantity").unwrap_or(0.0));
    let available_quantity = req.quantity.unwrap_or_else(|| {
        existing
            .try_get::<f64, _>("available_quantity")
            .unwrap_or(0.0)
    });
    let location_id = req.location_id.or_else(|| {
        existing
            .try_get::<Option<Uuid>, _>("location_id")
            .ok()
            .flatten()
    });
    let warehouse_id = req.warehouse_id.or_else(|| {
        existing
            .try_get::<Option<Uuid>, _>("warehouse_id")
            .ok()
            .flatten()
    });
    let min_quantity = req.min_quantity.or_else(|| {
        existing
            .try_get::<Option<f64>, _>("min_quantity")
            .ok()
            .flatten()
    });
    let max_quantity = req.max_quantity.or_else(|| {
        existing
            .try_get::<Option<f64>, _>("max_quantity")
            .ok()
            .flatten()
    });
    let status = req.status.unwrap_or_else(|| {
        existing
            .try_get::<String, _>("quality_status")
            .unwrap_or("normal".to_string())
    });
    let now = Utc::now();

    let result = sqlx::query(only_own_schema_query!(
        "wms",
        r#"
        UPDATE wms.inventory SET
            material_code = $2, material_name = $3, specification = $4, unit = $5, 
            quantity = $6, available_quantity = $7, location_id = $8, warehouse_id = $9, 
            min_quantity = $10, max_quantity = $11, quality_status = $12, updated_at = $13
        WHERE id = $1 AND tenant_id = $14 AND deleted_at IS NULL
        RETURNING id, material_code as sku, material_name as name, specification, unit, quantity,
                  available_quantity, location_id, warehouse_id, min_quantity, max_quantity,
                  quality_status as status, created_at, updated_at, quantity::float8 AS quantity_f8
        "#
    ))
    .bind(id)
    .bind(&sku)
    .bind(&name)
    .bind(&specification)
    .bind(&unit)
    .bind(quantity)
    .bind(available_quantity)
    .bind(location_id)
    .bind(warehouse_id)
    .bind(min_quantity)
    .bind(max_quantity)
    .bind(&status)
    .bind(now)
    .bind(tenant)
    .fetch_one(&mut scope)
    .await;

    let (response, status_str, error_msg, response_data) = match &result {
        Ok(item) => {
            let item_json = inventory_row_to_json(item);

            // V19.7: 库存变更时同步写入 inventory_movements 记录
            // 解决"写入断链"问题：之前 update_inventory 只更新主表，下游 smart_replenishment 读空表
            let old_quantity: f64 = existing.try_get::<f64, _>("quantity").unwrap_or(0.0);
            let quantity_diff = quantity - old_quantity;
            if quantity_diff.abs() > f64::EPSILON {
                let movement_no = movement_no(now);
                let movement_id = Uuid::new_v4();
                let operator_id = Uuid::parse_str(&claims.sub).ok();
                let movement_type = if quantity_diff > 0.0 {
                    "adjustment_in"
                } else {
                    "adjustment_out"
                };
                let abs_qty = quantity_diff.abs();

                if let Err(e) = sqlx::query(only_own_schema_query!(
                    "wms",
                    r#"
                    INSERT INTO wms.inventory_movements (
                        id, movement_no, tenant_id, movement_type, reference_id, reference_type,
                        material_id, material_code, material_name, quantity,
                        from_location_id, to_location_id, from_warehouse_id, to_warehouse_id,
                        status, performed_by, performed_at, notes, created_at, updated_at
                    ) VALUES (
                        $1, $2, $3, $4, $5, 'inventory_adjustment',
                        $6, $7, $8, $9,
                        NULL, $10, NULL, $11,
                        'completed', $12, $13, $14, $15, $15
                    )
                    "#
                ))
                .bind(movement_id)
                .bind(&movement_no)
                .bind(tenant)
                .bind(movement_type)
                .bind(id.to_string())
                .bind(id)
                .bind(&sku)
                .bind(&name)
                .bind(abs_qty)
                .bind(location_id)
                .bind(warehouse_id)
                .bind(operator_id)
                .bind(now)
                .bind(format!("库存调整：{} → {}", old_quantity, quantity))
                .bind(now)
                .execute(&mut scope)
                .await
                {
                    tracing::error!("写入 inventory_movements 失败: {}", e);
                    let _ = scope.rollback().await;
                    return ApiResponse::server_error("库存调整流水写入失败");
                }
            }

            if let Err(e) = scope.commit().await {
                tracing::error!("事务提交失败: {}", e);
                return ApiResponse::server_error("事务提交失败");
            }
            (
                ApiResponse::success(item_json.clone(), "库存更新成功"),
                "success",
                None,
                Some(item_json),
            )
        }
        Err(e) => {
            tracing::error!("更新库存失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("库存更新失败".to_string())),
                "error",
                Some(e.to_string()),
                None,
            )
        }
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "inventory".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers,
    )
    .await;

    response
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["wms:inventory:read"])),
    path = "/api/wms/inventory/{id}",
    params(
        ("id" = Uuid, Path, description = "id")
    ),
    responses(
        (status = 200, description = "删除成功"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误")
    ),
    tag = "WMS/inventory"
)]
pub async fn delete_inventory(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> ApiResponse<String> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant = match tenant_of(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let result = sqlx::query(only_own_schema_query!(
        "wms",
        r#"UPDATE wms.inventory SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL"#
    ))
    .bind(id)
    .bind(tenant)
    .execute(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            (
                ApiResponse::success("".to_string(), "库存删除成功"),
                "success",
                None,
            )
        }
        Ok(_) => (
            ApiResponse::from(TopemsError::ResourceNotFound("库存不存在".to_string())),
            "error",
            Some("库存不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除库存失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("库存删除失败".to_string())),
                "error",
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
        "inventory".to_string(),
        Some(id),
        None,
        None,
        None,
        None,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers,
    )
    .await;

    response
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:inventory:read"])),
    path = "/api/wms/inventory/low-stock",
    responses(
        (status = 200, description = "list_low_stock_inventory OK")
    ),
    tag = "WMS/inventory"
)]
pub async fn list_low_stock_inventory(
    State(state): State<ApiState>,
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
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let result = sqlx::query(only_own_schema_query!(
        "wms",
        r#"
        SELECT id, material_code as sku, material_name as name, specification, unit, quantity, 
               available_quantity, min_quantity, reorder_point, warehouse_id, location_id,
               batch_number, expiry_date, total_value
        FROM wms.inventory
        WHERE (min_quantity IS NOT NULL AND quantity <= min_quantity)
           OR (reorder_point IS NOT NULL AND available_quantity <= reorder_point)
          AND deleted_at IS NULL
        ORDER BY quantity ASC
        "#
    ))
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(items) => {
            let items_json: Vec<serde_json::Value> =
                items.iter().map(inventory_row_to_json).collect();
            ApiResponse::success(
                serde_json::json!({
                    "items": items_json,
                    "total": items.len()
                }),
                "获取低库存列表成功",
            )
        }
        Err(e) => {
            tracing::error!("获取低库存列表失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取低库存列表失败".to_string()))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:inventory:read"])),
    path = "/api/wms/inventory/warehouse/{warehouse_id}",
    params(
        ("warehouse_id" = Uuid, Path, description = "warehouse_id")
    ),
    responses(
        (status = 200, description = "list_inventory_by_warehouse OK")
    ),
    tag = "WMS/inventory"
)]
pub async fn list_inventory_by_warehouse(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(warehouse_id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let result = sqlx::query(only_own_schema_query!(
        "wms",
        r#"
        SELECT id, material_code as sku, material_name as name, specification, unit, quantity, 
               available_quantity, reserved_quantity, location_id, min_quantity, max_quantity, 
               quality_status as status, batch_number, expiry_date, total_value,
               quantity::float8 AS quantity_f8, total_value::float8 AS total_value_f8
        FROM wms.inventory
        WHERE warehouse_id = $1 AND deleted_at IS NULL
        ORDER BY material_code ASC
        "#
    ))
    .bind(warehouse_id)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(items) => {
            let items_json: Vec<serde_json::Value> =
                items.iter().map(inventory_row_to_json).collect();
            let total_quantity: f64 = items
                .iter()
                .filter_map(|r| r.try_get::<f64, _>("quantity_f8").ok())
                .sum();
            let total_value: f64 = items
                .iter()
                .filter_map(|r| r.try_get::<f64, _>("total_value_f8").ok())
                .sum();

            ApiResponse::success(
                serde_json::json!({
                    "items": items_json,
                    "total": items.len(),
                    "total_quantity": total_quantity,
                    "total_value": total_value
                }),
                "获取仓库库存列表成功",
            )
        }
        Err(e) => {
            tracing::error!("获取仓库库存列表失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取仓库库存列表失败".to_string()))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:inventory:read"])),
    path = "/api/wms/inventory/statistics",
    responses(
        (status = 200, description = "get_inventory_statistics OK")
    ),
    tag = "WMS/inventory"
)]
pub async fn get_inventory_statistics(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<InventoryPaginationParams>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let warehouse_id = params.warehouse_id;

    let result = sqlx::query(only_own_schema_query!(
        "wms",
        r#"
        SELECT 
            COUNT(*) as total_items,
            SUM(quantity) as total_quantity,
            SUM(available_quantity) as total_available,
            SUM(reserved_quantity) as total_reserved,
            SUM(total_value) as total_value,
            COUNT(*) FILTER (WHERE quantity <= COALESCE(min_quantity, 0)) as low_stock_count,
            COUNT(*) FILTER (WHERE quantity = 0) as out_of_stock_count
        FROM wms.inventory
        WHERE ($1::uuid IS NULL OR warehouse_id = $1)
          AND deleted_at IS NULL
        "#
    ))
    .bind(warehouse_id)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(row) => {
            let total_items = row.try_get::<i64, _>("total_items").unwrap_or(0);
            let total_quantity: f64 = big_decimal_to_f64(
                row.try_get::<Option<bigdecimal::BigDecimal>, _>("total_quantity")
                    .ok()
                    .flatten(),
            );
            let total_available: f64 = big_decimal_to_f64(
                row.try_get::<Option<bigdecimal::BigDecimal>, _>("total_available")
                    .ok()
                    .flatten(),
            );
            let total_reserved: f64 = big_decimal_to_f64(
                row.try_get::<Option<bigdecimal::BigDecimal>, _>("total_reserved")
                    .ok()
                    .flatten(),
            );
            let total_value: f64 = big_decimal_to_f64(
                row.try_get::<Option<bigdecimal::BigDecimal>, _>("total_value")
                    .ok()
                    .flatten(),
            );
            let low_stock_count = row.try_get::<i64, _>("low_stock_count").unwrap_or(0);
            let out_of_stock_count = row.try_get::<i64, _>("out_of_stock_count").unwrap_or(0);

            ApiResponse::success(
                serde_json::json!({
                    "total_items": total_items,
                    "total_quantity": total_quantity,
                    "total_available": total_available,
                    "total_reserved": total_reserved,
                    "total_value": total_value,
                    "low_stock_count": low_stock_count,
                    "out_of_stock_count": out_of_stock_count,
                    "warehouse_id": warehouse_id
                }),
                "获取库存统计成功",
            )
        }
        Err(e) => {
            tracing::error!("获取库存统计失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取库存统计失败".to_string()))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:read"])),
    path = "/api/wms/inventory/abc-analysis",
    responses(
        (status = 200, description = "get_abc_analysis OK")
    ),
    tag = "WMS/inventory"
)]
#[allow(clippy::as_conversions, clippy::cast_possible_wrap)]
pub async fn get_abc_analysis(
    State(state): State<ApiState>,
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
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let result = sqlx::query(only_own_schema_query!(
        "wms",
        r#"
        SELECT 
            material_code,
            material_name,
            SUM(total_value) as value
        FROM wms.inventory
        WHERE deleted_at IS NULL
        GROUP BY material_code, material_name
        ORDER BY value DESC
        "#
    ))
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(rows) => {
            let total_value: f64 = rows
                .iter()
                .filter_map(|r| {
                    r.try_get::<Option<bigdecimal::BigDecimal>, _>("value")
                        .ok()
                        .flatten()
                })
                .filter_map(|v| v.to_f64())
                .sum();

            let mut items: Vec<serde_json::Value> = Vec::new();
            let mut cumulative_value = 0.0;

            for row in rows.iter() {
                let value: f64 = big_decimal_to_f64(
                    row.try_get::<Option<bigdecimal::BigDecimal>, _>("value")
                        .ok()
                        .flatten(),
                );
                cumulative_value += value;
                let percentage = if total_value > 0.0 {
                    cumulative_value / total_value * 100.0
                } else {
                    0.0
                };

                let category = if percentage <= 80.0 {
                    "A"
                } else if percentage <= 95.0 {
                    "B"
                } else {
                    "C"
                };

                items.push(serde_json::json!({
                    "material_code": row.try_get::<String, _>("material_code").unwrap_or_default(),
                    "material_name": row.try_get::<String, _>("material_name").unwrap_or_default(),
                    "value": value,
                    "percentage": percentage,
                    "category": category
                }));
            }

            let a_count = items.iter().filter(|i| i["category"] == "A").count() as i64;
            let b_count = items.iter().filter(|i| i["category"] == "B").count() as i64;
            let c_count = items.iter().filter(|i| i["category"] == "C").count() as i64;

            ApiResponse::success(
                serde_json::json!({
                    "items": items,
                    "total_sku": rows.len() as i64,
                    "total_value": total_value,
                    "a_count": a_count,
                    "b_count": b_count,
                    "c_count": c_count
                }),
                "获取ABC分析成功",
            )
        }
        Err(e) => {
            tracing::error!("获取ABC分析失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取ABC分析失败".to_string()))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:read"])),
    path = "/api/wms/inventory/turnover",
    responses(
        (status = 200, description = "get_turnover OK")
    ),
    tag = "WMS/inventory"
)]
pub async fn get_turnover(
    State(state): State<ApiState>,
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
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let result = sqlx::query(only_own_schema_query!(
        "wms",
        r#"
        SELECT 
            DATE_TRUNC('month', created_at) as period,
            COUNT(*) as transaction_count,
            SUM(quantity) as total_quantity
        FROM wms.inventory
        WHERE deleted_at IS NULL
          AND created_at >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY period ASC
        "#
    ))
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(rows) => {
            let items: Vec<serde_json::Value> = rows
                .iter()
                .map(|row| {
                    let period: Option<String> = row
                        .try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("period")
                        .ok()
                        .flatten()
                        .map(|dt| dt.format("%Y-%m").to_string());
                    let transaction_count = row.try_get::<i64, _>("transaction_count").unwrap_or(0);
                    let total_quantity: f64 = big_decimal_to_f64(
                        row.try_get::<Option<bigdecimal::BigDecimal>, _>("total_quantity")
                            .ok()
                            .flatten(),
                    );

                    serde_json::json!({
                        "period": period,
                        "transaction_count": transaction_count,
                        "total_quantity": total_quantity
                    })
                })
                .collect();

            ApiResponse::success(
                serde_json::json!({ "items": items }),
                "获取库存周转数据成功",
            )
        }
        Err(e) => {
            tracing::error!("获取库存周转数据失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取库存周转数据失败".to_string()))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:read"])),
    path = "/api/wms/inventory/value-by-warehouse",
    responses(
        (status = 200, description = "get_value_by_warehouse OK")
    ),
    tag = "WMS/inventory"
)]
pub async fn get_value_by_warehouse(
    State(state): State<ApiState>,
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
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let result = sqlx::query(only_own_schema_query!(
        "wms",
        r#"
        SELECT 
            i.warehouse_id,
            w.name as warehouse_name,
            SUM(i.total_value) as total_value,
            COUNT(*) as item_count
        FROM wms.inventory i
        LEFT JOIN wms.warehouses w ON i.warehouse_id = w.id
        WHERE i.deleted_at IS NULL
        GROUP BY i.warehouse_id, w.name
        ORDER BY total_value DESC
        "#
    ))
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(rows) => {
            let total_value: f64 = rows
                .iter()
                .filter_map(|r| {
                    r.try_get::<Option<bigdecimal::BigDecimal>, _>("total_value")
                        .ok()
                        .flatten()
                })
                .filter_map(|v| v.to_f64())
                .sum();

            let items: Vec<serde_json::Value> = rows
                .iter()
                .map(|row| {
                    let warehouse_id: Option<Uuid> = row
                        .try_get::<Option<Uuid>, _>("warehouse_id")
                        .ok()
                        .flatten();
                    let warehouse_name: Option<String> = row
                        .try_get::<Option<String>, _>("warehouse_name")
                        .ok()
                        .flatten();
                    let value: f64 = big_decimal_to_f64(
                        row.try_get::<Option<bigdecimal::BigDecimal>, _>("total_value")
                            .ok()
                            .flatten(),
                    );
                    let item_count = row.try_get::<i64, _>("item_count").unwrap_or(0);

                    serde_json::json!({
                        "warehouse_id": warehouse_id,
                        "warehouse_name": warehouse_name,
                        "total_value": value,
                        "item_count": item_count
                    })
                })
                .collect();

            ApiResponse::success(
                serde_json::json!({
                    "items": items,
                    "total_value": total_value
                }),
                "获取按仓库统计库存价值成功",
            )
        }
        Err(e) => {
            tracing::error!("获取按仓库统计库存价值失败: {}", e);
            ApiResponse::from(TopemsError::Internal(
                "获取按仓库统计库存价值失败".to_string(),
            ))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_inventory_pagination_params_deserialize() {
        let query = "search=MAT001&status=active";
        let params: InventoryPaginationParams = serde_urlencoded::from_str(query).unwrap();
        assert_eq!(params.search.as_deref(), Some("MAT001"));
        assert_eq!(params.status.as_deref(), Some("active"));
    }

    #[test]
    fn test_inventory_pagination_params_default() {
        let query = "";
        let params: InventoryPaginationParams = serde_urlencoded::from_str(query).unwrap();
        assert!(params.search.is_none());
        assert!(params.status.is_none());
        assert!(params.page.is_none());
        assert!(params.page_size.is_none());
        assert!(params.warehouse_id.is_none());
    }

    #[test]
    fn test_inventory_pagination_params_only_status() {
        let query = "status=low_stock";
        let params: InventoryPaginationParams = serde_urlencoded::from_str(query).unwrap();
        assert_eq!(params.status.as_deref(), Some("low_stock"));
        assert!(params.search.is_none());
    }

    #[test]
    fn test_inventory_pagination_params_with_pagination() {
        let query = "page=1&page_size=20&search=test";
        let params: InventoryPaginationParams = serde_urlencoded::from_str(query).unwrap();
        assert_eq!(params.page, Some(1));
        assert_eq!(params.page_size, Some(20));
        assert_eq!(params.search.as_deref(), Some("test"));
    }
}
