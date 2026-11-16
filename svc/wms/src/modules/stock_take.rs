use axum::{
    extract::{Extension, FromRef, Path, Query, State},
    http::HeaderMap,
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_boundary::only_own_schema_query;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::models::stock_take::*;
use crate::modules::audit::log_audit_event;
use crate::modules::ApiState;
use crate::shared::permission::{check_permission, ModulePermission};
use crate::shared::scope::{arm_short_txn, release_request_txn, tenant_of, wms_db, ShortTxnTimer};
use topems_shared_auth::auth::Claims;
use topems_shared_auth::require_tenant;
use topems_shared_core::response::ApiResponse;
use topems_shared_core::TopemsError;

fn stock_take_row_to_json(row: &sqlx::postgres::PgRow) -> serde_json::Value {
    serde_json::json!({
        "id": row.try_get::<Uuid, _>("id").ok(),
        "stock_take_number": row.try_get::<String, _>("stock_take_number").ok(),
        "warehouse_id": row.try_get::<Uuid, _>("warehouse_id").ok(),
        "warehouse_name": row.try_get::<Option<String>, _>("warehouse_name").ok(),
        "status": row.try_get::<String, _>("status").ok(),
        "description": row.try_get::<Option<String>, _>("description").ok(),
        "created_by": row.try_get::<Option<String>, _>("created_by").ok(),
        "created_at": row.try_get::<DateTime<Utc>, _>("created_at").ok(),
        "started_at": row.try_get::<Option<DateTime<Utc>>, _>("started_at").ok().flatten(),
        "completed_at": row.try_get::<Option<DateTime<Utc>>, _>("completed_at").ok().flatten(),
        "adjusted_at": row.try_get::<Option<DateTime<Utc>>, _>("adjusted_at").ok().flatten(),
    })
}

fn stock_take_item_row_to_json(row: &sqlx::postgres::PgRow) -> serde_json::Value {
    serde_json::json!({
        "id": row.try_get::<Uuid, _>("id").ok(),
        "line_number": row.try_get::<i32, _>("line_number").ok(),
        "material_code": row.try_get::<String, _>("material_code").ok(),
        "material_name": row.try_get::<String, _>("material_name").ok(),
        "specification": row.try_get::<Option<String>, _>("specification").ok(),
        "batch_number": row.try_get::<Option<String>, _>("batch_number").ok(),
        "system_quantity": row.try_get::<f64, _>("system_quantity").ok(),
        "counted_quantity": row.try_get::<Option<f64>, _>("counted_quantity").ok(),
        "discrepancy_quantity": row.try_get::<Option<f64>, _>("discrepancy_quantity").ok(),
        "discrepancy_type": row.try_get::<Option<String>, _>("discrepancy_type").ok(),
        "discrepancy_reason": row.try_get::<Option<String>, _>("discrepancy_reason").ok(),
        "unit": row.try_get::<String, _>("unit").ok(),
        "status": row.try_get::<Option<String>, _>("status").ok(),
    })
}

#[derive(Debug, Deserialize)]
pub struct StockTakePaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub warehouse_id: Option<Uuid>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct CountItemRequest {
    pub item_id: Uuid,
    pub counted_quantity: f64,
    pub discrepancy_reason: Option<String>,
    pub remarks: Option<String>,
}

pub fn create_routes<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
    ApiState: FromRef<S>,
{
    Router::new()
        .route(
            "/stock-takes",
            get(list_stock_takes).post(create_stock_take),
        )
        .route(
            "/stock-takes/{id}",
            get(get_stock_take)
                .put(update_stock_take)
                .delete(delete_stock_take),
        )
        .route(
            "/stock-takes/{id}/items",
            get(list_stock_take_items).post(create_stock_take_item),
        )
        .route(
            "/stock-takes/{id}/items/{item_id}",
            get(get_stock_take_item)
                .put(update_stock_take_item)
                .delete(delete_stock_take_item),
        )
        .route("/stock-takes/{id}/start", post(start_stock_take))
        .route("/stock-takes/{id}/count", post(count_stock_take))
        .route("/stock-takes/{id}/complete", post(complete_stock_take))
        .route("/stock-takes/{id}/adjust", post(adjust_stock_take))
        .route(
            "/stock-takes/{id}/approval/start",
            post(start_stock_take_approval),
        )
        .route(
            "/stock-takes/{id}/approval/approve",
            post(approve_stock_take),
        )
        .route("/stock-takes/{id}/approval/reject", post(reject_stock_take))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:stocktake:read"])),
    path = "/api/wms/stock-takes",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn list_stock_takes(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<StockTakePaginationParams>,
    Extension(txn_arc): Extension<RlsTxnCell>,
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
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();
    let warehouse_id = params.warehouse_id;

    let result = sqlx::query(only_own_schema_query!(
        "wms",
        r#"
        SELECT id, warehouse_id, warehouse_name, location_id, location_code, location_name,
               stock_take_number, stock_take_type, status, planned_date, actual_date,
               total_items, counted_items, discrepancy_items, total_quantity, counted_quantity,
               discrepancy_quantity, discrepancy_value, accuracy_rate,
               approval_status, adjustment_status, remarks, created_at, updated_at
        FROM wms.stock_takes
        WHERE ($1::text IS NULL OR stock_take_number ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
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
        Ok(stock_takes) => {
            let count_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "wms",
                r#"
                SELECT COUNT(*) FROM wms.stock_takes
                WHERE ($1::text IS NULL OR stock_take_number ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
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
            let stock_takes_json: Vec<serde_json::Value> =
                stock_takes.iter().map(stock_take_row_to_json).collect();

            ApiResponse::success(
                serde_json::json!({
                    "stock_takes": stock_takes_json,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取盘点列表成功",
            )
        }
        Err(e) => {
            tracing::error!("获取盘点列表失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取盘点列表失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:stocktake:admin"])),
    path = "/api/wms/stock-takes",
    tag = "wms",
    responses(
        (status = 201, description = "创建成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 500, description = "服务内部错误")
    )
)]
pub async fn create_stock_take(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<CreateStockTakeRequest>,
) -> ApiResponse<StockTake> {
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

    // 租户绑定对齐新惯例：超管→SQL NULL（公共行），普通用户→claims.tenant_id。
    let tenant_id: Option<Uuid> = match claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
    {
        Some(t) => Some(t),
        None => return ApiResponse::bad_request("缺少租户上下文（超管需携带 x-tenant-id）"),
    };

    let result = sqlx::query_as::<_, StockTake>(
        only_own_schema_query!("wms", r#"
        INSERT INTO wms.stock_takes (id, organization_id, stock_take_number, stock_take_type,
                                     warehouse_id, location_id, status, planned_date,
                                     remarks, created_at, updated_at, tenant_id)
        VALUES ($1, $9, $2, 'full', $3, $4, 'planned', $5, $6, $7, $8, $9)
        RETURNING id, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000') AS tenant_id, warehouse_id, location_id, stock_take_number, status,
                  start_time, end_time, remarks, created_at, updated_at
        "#),
    )
    .bind(id)
    .bind(&req.stock_take_number)
    .bind(req.warehouse_id)
    .bind(req.location_id)
    .bind(now.date_naive())
    .bind(&req.remarks)
    .bind(now)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await;

    let (response, status, error_msg) = match &result {
        Ok(stock_take) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("盘点事务提交失败: {}", e);
                    return ApiResponse::from(TopemsError::Internal("盘点创建失败".to_string()));
                }
            }
            (
                ApiResponse::success(stock_take.clone(), "盘点创建成功"),
                "success",
                None,
            )
        }
        Err(e) => {
            tracing::error!("创建盘点失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("盘点创建失败".to_string())),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(stock_take) = &result {
        serde_json::to_value(stock_take).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "stock_take".to_string(),
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

    response
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:stocktake:read"])),
    path = "/api/wms/stock-takes/{id}",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn get_stock_take(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
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
        SELECT id, warehouse_id, warehouse_name, location_id, location_code, location_name,
               stock_take_number, stock_take_type, status, planned_date, actual_date,
               total_items, counted_items, discrepancy_items, total_quantity, counted_quantity,
               discrepancy_quantity, discrepancy_value, accuracy_rate,
               approval_status, adjustment_status, remarks, created_at, updated_at
        FROM wms.stock_takes WHERE id = $1 AND deleted_at IS NULL
        "#
    ))
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(stock_take)) => {
            let stock_take_json = stock_take_row_to_json(&stock_take);
            ApiResponse::success(stock_take_json, "获取盘点成功")
        }
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("盘点不存在".to_string())),
        Err(e) => {
            tracing::error!("获取盘点失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取盘点失败".to_string()))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["wms:stocktake:admin"])),
    path = "/api/wms/stock-takes/{id}",
    tag = "wms",
    responses(
        (status = 200, description = "更新成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误")
    )
)]
pub async fn update_stock_take(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<UpdateStockTakeRequest>,
) -> ApiResponse<StockTake> {
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

    let existing = sqlx::query_as::<_, StockTake>(only_own_schema_query!(
        "wms",
        r#"
        SELECT id, tenant_id, warehouse_id, location_id, stock_take_number, status, 
               planned_date as start_time, actual_date as end_time, remarks, created_at, updated_at 
        FROM wms.stock_takes WHERE id = $1 AND deleted_at IS NULL
        "#
    ))
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    let existing = match existing {
        Ok(Some(s)) => s,
        Ok(None) => {
            return ApiResponse::from(TopemsError::ResourceNotFound("盘点不存在".to_string()))
        }
        Err(e) => return ApiResponse::from(TopemsError::internal("查询盘点失败", e)),
    };

    let warehouse_id = req.warehouse_id.or(existing.warehouse_id);
    let location_id = req.location_id.or(existing.location_id);
    let status = req.status.unwrap_or(existing.status);
    let end_time = req.end_time.or(existing.end_time);
    let remarks = req.remarks.or(existing.remarks);
    let now = Utc::now();

    let result = sqlx::query_as::<_, StockTake>(
        only_own_schema_query!("wms", r#"
        UPDATE wms.stock_takes SET
            warehouse_id = $2, location_id = $3, status = $4, actual_date = $5, remarks = $6, updated_at = $7
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id, tenant_id, warehouse_id, location_id, stock_take_number, status, 
                  planned_date as start_time, actual_date as end_time, remarks, created_at, updated_at
        "#),
    )
    .bind(id)
    .bind(warehouse_id)
    .bind(location_id)
    .bind(&status)
    .bind(end_time)
    .bind(&remarks)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(stock_take) => (
            ApiResponse::success(stock_take.clone(), "盘点更新成功"),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("更新盘点失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("盘点更新失败".to_string())),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(stock_take) = &result {
        serde_json::to_value(stock_take).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "stock_take".to_string(),
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

// gate: admin-only
#[utoipa::path(
    delete,
    security(("BearerAuth" = ["wms:stocktake:admin"])),
    path = "/api/wms/stock-takes/{id}",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn delete_stock_take(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
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
    let result = sqlx::query(only_own_schema_query!(
        "wms",
        r#"UPDATE wms.stock_takes SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL"#
    ))
    .bind(id)
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
                ApiResponse::success("".to_string(), "盘点删除成功"),
                "success",
                None,
            )
        }
        Ok(_) => (
            ApiResponse::from(TopemsError::ResourceNotFound("盘点不存在".to_string())),
            "error",
            Some("盘点不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除盘点失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("盘点删除失败".to_string())),
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
        "stock_take".to_string(),
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
    post,
    security(("BearerAuth" = ["wms:stocktake:admin"])),
    path = "/api/wms/stock-takes/{id}/start",
    tag = "wms",
    responses(
        (status = 200, description = "开始盘点成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误")
    )
)]
pub async fn start_stock_take(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant = match tenant_of(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let now = Utc::now();

    if let Err(e) = release_request_txn(&txn_arc).await {
        tracing::error!("释放请求事务失败: {}", e);
        return ApiResponse::server_error("事务释放失败");
    }
    let txn_timer = ShortTxnTimer::start("stock_take.start");
    let db = wms_db(&state.db);
    // wms-short-txn-exempt: W-01 盘点开始独立短事务（连接 GUC 收敛防 RLS 误过滤；行锁边界；每请求连接占用见 m1-acceptance §10）
    let mut scope = match db.scope_for_tenant(tenant).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启盘点事务失败: {}", e);
            return ApiResponse::server_error("开启事务失败");
        }
    };
    if let Err(e) = arm_short_txn(&mut scope).await {
        tracing::error!("设置短事务 lock_timeout 失败: {}", e);
        let _ = scope.rollback().await;
        return ApiResponse::server_error("开启事务失败");
    }

    // 状态类 0 行 → 409；不存在 → 404。
    let started = sqlx::query(only_own_schema_query!(
        "wms",
        r#"
        UPDATE wms.stock_takes SET
            status = 'in_progress', actual_date = $1::date, updated_at = $1::timestamptz
        WHERE id = $2 AND tenant_id = $3 AND status = 'planned' AND deleted_at IS NULL
        "#
    ))
    .bind(now.date_naive())
    .bind(id)
    .bind(tenant)
    .execute(&mut scope)
    .await;
    match started {
        Ok(r) if r.rows_affected() == 1 => {}
        Ok(_) => {
            let exists = sqlx::query_scalar::<_, Uuid>(only_own_schema_query!(
                "wms",
                r#"SELECT id FROM wms.stock_takes WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL"#
            ))
            .bind(id)
            .bind(tenant)
            .fetch_optional(&mut scope)
            .await;
            let _ = scope.rollback().await;
            return match exists {
                Ok(Some(_)) => ApiResponse::conflict("盘点单当前状态不允许开始"),
                Ok(None) => {
                    ApiResponse::from(TopemsError::ResourceNotFound("盘点单不存在".to_string()))
                }
                Err(e) => {
                    tracing::error!("查询盘点单失败: {}", e);
                    ApiResponse::server_error("开始盘点失败")
                }
            };
        }
        Err(e) => {
            tracing::error!("更新盘点单状态失败: {}", e);
            let _ = scope.rollback().await;
            return ApiResponse::server_error("开始盘点失败");
        }
    }

    let warehouse_id = sqlx::query_scalar::<_, Option<Uuid>>(only_own_schema_query!(
        "wms",
        r#"SELECT warehouse_id FROM wms.stock_takes WHERE id = $1 AND tenant_id = $2"#
    ))
    .bind(id)
    .bind(tenant)
    .fetch_optional(&mut scope)
    .await;
    let warehouse_id = match warehouse_id {
        Ok(Some(warehouse_id)) => warehouse_id,
        Ok(None) => None,
        Err(e) => {
            tracing::error!("查询盘点仓库失败: {}", e);
            let _ = scope.rollback().await;
            return ApiResponse::server_error("开始盘点失败");
        }
    };

    if let Some(warehouse_id) = warehouse_id {
        let seeded = sqlx::query(only_own_schema_query!(
            "wms",
            r#"
            INSERT INTO wms.stock_take_items (id, organization_id, stock_take_id, line_number,
                                              material_code, material_name, specification,
                                              batch_number, location_id, system_quantity, unit,
                                              quality_status, created_at, updated_at, tenant_id)
            SELECT uuid_generate_v4(), $3, $1, ROW_NUMBER() OVER (ORDER BY i.material_code),
                   i.material_code, i.material_name, i.specification,
                   i.batch_number, i.location_id, i.quantity, i.unit,
                   i.quality_status, NOW(), NOW(), $3
            FROM wms.inventory i
            WHERE i.warehouse_id = $2 AND i.tenant_id = $3 AND i.deleted_at IS NULL
            "#
        ))
        .bind(id)
        .bind(warehouse_id)
        .bind(tenant)
        .execute(&mut scope)
        .await;
        if let Err(e) = seeded {
            tracing::error!("生成盘点明细失败: {}", e);
            let _ = scope.rollback().await;
            return ApiResponse::server_error("生成盘点明细失败");
        }
    }

    if let Err(e) = scope.commit().await {
        tracing::error!("盘点事务提交失败: {}", e);
        return ApiResponse::from(TopemsError::Internal("开始盘点失败".to_string()));
    }
    txn_timer.finish();

    // wms-short-txn-exempt: R-01 提交后只读回读（独立只读短事务，不占请求事务连接；见 m1-acceptance §10）
    let mut read_scope = match db.scope_read_for_tenant(tenant).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启盘点只读作用域失败: {}", e);
            return ApiResponse::server_error("开始盘点失败");
        }
    };

    let result = sqlx::query(only_own_schema_query!(
        "wms",
        r#"
        SELECT id, warehouse_id, warehouse_name, location_id, location_code, location_name,
               stock_take_number, stock_take_type, status, planned_date, actual_date,
               total_items, counted_items, discrepancy_items, remarks, created_at, updated_at
        FROM wms.stock_takes WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
        "#
    ))
    .bind(id)
    .bind(tenant)
    .fetch_one(&mut read_scope)
    .await;

    let (response, status_str, error_msg, response_data) = match result {
        Ok(stock_take) => {
            let stock_take_json = stock_take_row_to_json(&stock_take);
            (
                ApiResponse::success(stock_take_json.clone(), "盘点已开始"),
                "success",
                None,
                Some(stock_take_json),
            )
        }
        Err(sqlx::Error::RowNotFound) => (
            ApiResponse::from(TopemsError::ResourceNotFound("盘点单不存在".to_string())),
            "not_found",
            None,
            None,
        ),
        Err(e) => {
            tracing::error!("获取盘点失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("开始盘点失败".to_string())),
                "error",
                Some(e.to_string()),
                None,
            )
        }
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "stock_take".to_string(),
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
    security(("BearerAuth" = ["wms:stocktake:read"])),
    path = "/api/wms/stock-takes/{id}/items",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
#[allow(clippy::as_conversions, clippy::cast_possible_wrap)]
pub async fn list_stock_take_items(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
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
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let result = sqlx::query(only_own_schema_query!(
        "wms",
        r#"
        SELECT id, stock_take_id, line_number, material_code, material_name, specification,
               batch_number, location_id, location_code, location_name,
               system_quantity::float8, counted_quantity::float8, discrepancy_quantity::float8, discrepancy_type,
               unit, unit_price, discrepancy_value, quality_status,
               counter, counting_time, recount_required, recount_quantity,
               discrepancy_reason, discrepancy_notes, adjustment_required, adjustment_quantity,
               adjustment_status, notes as remarks, created_at, updated_at
        FROM wms.stock_take_items
        WHERE stock_take_id = $1 AND deleted_at IS NULL AND tenant_id = $2::uuid
        ORDER BY line_number ASC
        "#
    ))
    .bind(id)
    .bind(tenant)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(items) => {
            let total = items.len() as i64;
            let completed_count = items
                .iter()
                .filter(|i| {
                    i.try_get::<Option<f64>, _>("counted_quantity")
                        .ok()
                        .flatten()
                        .is_some()
                })
                .count() as i64;
            let discrepancy_count = items
                .iter()
                .filter(|i| {
                    i.try_get::<Option<String>, _>("discrepancy_type")
                        .ok()
                        .flatten()
                        != Some("none".to_string())
                })
                .count() as i64;

            let items_json: Vec<serde_json::Value> =
                items.iter().map(stock_take_item_row_to_json).collect();
            ApiResponse::success(
                serde_json::json!({
                    "items": items_json,
                    "total": total,
                    "completed_count": completed_count,
                    "discrepancy_count": discrepancy_count,
                }),
                "获取盘点明细成功",
            )
        }
        Err(e) => {
            tracing::error!("获取盘点明细失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取盘点明细失败".to_string()))
        }
    }
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:stocktake:admin"])),
    path = "/api/wms/stock-takes/{id}/items",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn create_stock_take_item(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<CreateStockTakeItemRequest>,
) -> ApiResponse<serde_json::Value> {
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
    let item_id = Uuid::new_v4();
    let now = Utc::now();
    // 盘点明细必须落明确租户，禁止再写 NULL（NULL 行对所有租户可见）。
    let item_tenant = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };

    let variance = if let Some(actual) = req.actual_quantity {
        Some(actual - req.expected_quantity)
    } else {
        None
    };

    let discrepancy_type = if let Some(v) = variance {
        if v > 0.0 {
            Some("over".to_string())
        } else if v < 0.0 {
            Some("under".to_string())
        } else {
            Some("none".to_string())
        }
    } else {
        None
    };

    let result = sqlx::query(
        only_own_schema_query!("wms", r#"
        INSERT INTO wms.stock_take_items (id, organization_id, stock_take_id, material_code,
                                          material_name, specification, batch_number, location_id,
                                          system_quantity, counted_quantity, discrepancy_quantity,
                                          discrepancy_type, unit, unit_price, discrepancy_value,
                                          notes, created_at, updated_at, tenant_id)
        VALUES ($1, $18, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING id, stock_take_id, material_code, material_name, specification, batch_number,
                  system_quantity::float8, counted_quantity::float8, discrepancy_quantity::float8, discrepancy_type,
                  unit, unit_price, discrepancy_value, notes as remarks, created_at, updated_at
        "#),
    )
    .bind(item_id)
    .bind(id)
    .bind(req.inventory_item_id.to_string())
    .bind("")
    .bind(&req.remarks)
    .bind(None::<String>)
    .bind(None::<Uuid>)
    .bind(req.expected_quantity)
    .bind(req.actual_quantity)
    .bind(variance)
    .bind(discrepancy_type)
    .bind("")
    .bind(None::<f64>)
    .bind(None::<f64>)
    .bind(&req.remarks)
    .bind(now)
    .bind(now)
    .bind(item_tenant)
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg, response_data) = match &result {
        Ok(item) => {
            let item_json = stock_take_item_row_to_json(item);
            (
                ApiResponse::success(item_json.clone(), "盘点明细创建成功"),
                "success",
                None,
                Some(item_json),
            )
        }
        Err(e) => {
            tracing::error!("创建盘点明细失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("盘点明细创建失败".to_string())),
                "error",
                Some(e.to_string()),
                None,
            )
        }
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "stock_take_item".to_string(),
        Some(item_id),
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
    post,
    security(("BearerAuth" = ["wms:stocktake:admin"])),
    path = "/api/wms/stock-takes/{id}/count",
    tag = "wms",
    responses(
        (status = 200, description = "盘点计数成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误")
    )
)]
pub async fn count_stock_take(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(items): Json<Vec<CountItemRequest>>,
) -> ApiResponse<serde_json::Value> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant = match tenant_of(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let now = Utc::now();

    if let Err(e) = release_request_txn(&txn_arc).await {
        tracing::error!("释放请求事务失败: {}", e);
        return ApiResponse::server_error("事务释放失败");
    }
    let txn_timer = ShortTxnTimer::start("stock_take.count");
    let db = wms_db(&state.db);
    // wms-short-txn-exempt: W-02 盘点计数独立短事务（连接 GUC 收敛防 RLS 误过滤；行锁边界；每请求连接占用见 m1-acceptance §10）
    let mut scope = match db.scope_for_tenant(tenant).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启盘点计数事务失败: {}", e);
            return ApiResponse::server_error("开启事务失败");
        }
    };
    if let Err(e) = arm_short_txn(&mut scope).await {
        tracing::error!("设置短事务 lock_timeout 失败: {}", e);
        let _ = scope.rollback().await;
        return ApiResponse::server_error("开启事务失败");
    }

    for item in &items {
        if item.counted_quantity < 0.0 {
            let _ = scope.rollback().await;
            return ApiResponse::bad_request(&format!("实盘数量不能为负（明细 {}）", item.item_id));
        }

        // 明细必须属于本盘点单且同租户：0 行 → 404，绝不跨单/跨租户写入。
        let system_qty = sqlx::query_scalar::<_, f64>(only_own_schema_query!(
            "wms",
            r#"
            SELECT system_quantity::float8 FROM wms.stock_take_items
            WHERE id = $1 AND stock_take_id = $2 AND tenant_id = $3 AND deleted_at IS NULL
            FOR UPDATE
            "#
        ))
        .bind(item.item_id)
        .bind(id)
        .bind(tenant)
        .fetch_optional(&mut scope)
        .await;

        let system_qty = match system_qty {
            Ok(Some(v)) => v,
            Ok(None) => {
                let _ = scope.rollback().await;
                return ApiResponse::not_found(&format!(
                    "盘点明细不存在或不属于该盘点单: {}",
                    item.item_id
                ));
            }
            Err(e) => {
                tracing::error!("查询盘点明细失败: {}", e);
                let _ = scope.rollback().await;
                return ApiResponse::server_error("盘点计数失败");
            }
        };

        let discrepancy = item.counted_quantity - system_qty;
        let discrepancy_type = if discrepancy > 0.0 {
            "over"
        } else if discrepancy < 0.0 {
            "under"
        } else {
            "none"
        };

        let updated = sqlx::query(only_own_schema_query!(
            "wms",
            r#"
            UPDATE wms.stock_take_items SET
                counted_quantity = $1,
                discrepancy_quantity = $2,
                discrepancy_type = $3,
                discrepancy_reason = $4,
                notes = $5,
                counting_time = $6,
                updated_at = $6
            WHERE id = $7 AND stock_take_id = $8 AND tenant_id = $9 AND deleted_at IS NULL
            "#
        ))
        .bind(item.counted_quantity)
        .bind(discrepancy)
        .bind(discrepancy_type)
        .bind(&item.discrepancy_reason)
        .bind(&item.remarks)
        .bind(now)
        .bind(item.item_id)
        .bind(id)
        .bind(tenant)
        .execute(&mut scope)
        .await;
        match updated {
            Ok(r) if r.rows_affected() == 1 => {}
            Ok(_) => {
                let _ = scope.rollback().await;
                return ApiResponse::conflict(&format!("盘点明细状态已变化: {}", item.item_id));
            }
            Err(e) => {
                tracing::error!("更新盘点明细失败: {}", e);
                let _ = scope.rollback().await;
                return ApiResponse::server_error("盘点计数失败");
            }
        }
    }

    if let Err(e) = scope.commit().await {
        tracing::error!("盘点计数事务提交失败: {}", e);
        return ApiResponse::from(TopemsError::Internal("盘点计数失败".to_string()));
    }
    txn_timer.finish();

    ApiResponse::success(
        serde_json::json!({ "message": "盘点计数完成" }),
        "盘点计数成功",
    )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:stocktake:read"])),
    path = "/api/wms/stock-takes/{id}/items/{item_id}",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn get_stock_take_item(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path((id, item_id)): Path<(Uuid, Uuid)>,
    Extension(txn_arc): Extension<RlsTxnCell>,
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
        SELECT id, stock_take_id, line_number, material_code, material_name, specification,
               batch_number, location_id, location_code, location_name,
               system_quantity::float8, counted_quantity::float8, discrepancy_quantity::float8, discrepancy_type,
               unit, unit_price, discrepancy_value, quality_status,
               counter, counting_time, recount_required, recount_quantity,
               discrepancy_reason, discrepancy_notes, adjustment_required, adjustment_quantity,
               adjustment_status, notes as remarks, created_at, updated_at
        FROM wms.stock_take_items WHERE stock_take_id = $1 AND id = $2 AND deleted_at IS NULL
        "#
    ))
    .bind(id)
    .bind(item_id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(item)) => {
            let item_json = stock_take_item_row_to_json(&item);
            ApiResponse::success(item_json, "获取盘点明细成功")
        }
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("盘点明细不存在".to_string())),
        Err(e) => {
            tracing::error!("获取盘点明细失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取盘点明细失败".to_string()))
        }
    }
}

// gate: admin-only
#[utoipa::path(
    put,
    security(("BearerAuth" = ["wms:stocktake:admin"])),
    path = "/api/wms/stock-takes/{id}/items/{item_id}",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn update_stock_take_item(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path((id, item_id)): Path<(Uuid, Uuid)>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<UpdateStockTakeItemRequest>,
) -> ApiResponse<serde_json::Value> {
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

    let existing = sqlx::query(only_own_schema_query!(
        "wms",
        r#"
        SELECT id, stock_take_id, system_quantity::float8, counted_quantity::float8, discrepancy_quantity::float8, 
               discrepancy_type, status, notes FROM wms.stock_take_items 
        WHERE stock_take_id = $1 AND id = $2 AND deleted_at IS NULL
        "#
    ))
    .bind(id)
    .bind(item_id)
    .fetch_optional(&mut **txn)
    .await;

    let existing = match existing {
        Ok(Some(i)) => i,
        Ok(None) => {
            return ApiResponse::from(TopemsError::ResourceNotFound("盘点明细不存在".to_string()))
        }
        Err(e) => return ApiResponse::from(TopemsError::internal("查询盘点明细失败", e)),
    };

    let system_qty = existing.try_get::<f64, _>("system_quantity").unwrap_or(0.0);
    let actual_quantity = req.actual_quantity.or_else(|| {
        existing
            .try_get::<Option<f64>, _>("counted_quantity")
            .ok()
            .flatten()
    });
    let variance = actual_quantity.map(|actual| actual - system_qty);
    let discrepancy_type = if let Some(v) = variance {
        if v > 0.0 {
            "over".to_string()
        } else if v < 0.0 {
            "under".to_string()
        } else {
            "none".to_string()
        }
    } else {
        existing
            .try_get::<String, _>("discrepancy_type")
            .unwrap_or("none".to_string())
    };
    let status = req.status.unwrap_or_else(|| {
        if actual_quantity.is_some() {
            "completed".to_string()
        } else {
            "pending".to_string()
        }
    });
    let remarks = req.remarks.or_else(|| {
        existing
            .try_get::<Option<String>, _>("notes")
            .ok()
            .flatten()
    });
    let now = Utc::now();

    let result = sqlx::query(only_own_schema_query!(
        "wms",
        r#"
        UPDATE wms.stock_take_items SET
            counted_quantity = $1, discrepancy_quantity = $2, discrepancy_type = $3, 
            status = $4, notes = $5, updated_at = $6
        WHERE stock_take_id = $7 AND id = $8 AND deleted_at IS NULL
        RETURNING id, stock_take_id, material_code, material_name, specification, batch_number,
                  system_quantity::float8, counted_quantity::float8, discrepancy_quantity::float8, discrepancy_type,
                  unit, unit_price, discrepancy_value, notes as remarks, created_at, updated_at
        "#
    ))
    .bind(actual_quantity)
    .bind(variance)
    .bind(discrepancy_type)
    .bind(&status)
    .bind(&remarks)
    .bind(now)
    .bind(id)
    .bind(item_id)
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg, response_data) = match &result {
        Ok(item) => {
            let item_json = stock_take_item_row_to_json(item);
            (
                ApiResponse::success(item_json.clone(), "盘点明细更新成功"),
                "success",
                None,
                Some(item_json),
            )
        }
        Err(e) => {
            tracing::error!("更新盘点明细失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("盘点明细更新失败".to_string())),
                "error",
                Some(e.to_string()),
                None,
            )
        }
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "stock_take_item".to_string(),
        Some(item_id),
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

// gate: admin-only
#[utoipa::path(
    delete,
    security(("BearerAuth" = ["wms:stocktake:admin"])),
    path = "/api/wms/stock-takes/{id}/items/{item_id}",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn delete_stock_take_item(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path((id, item_id)): Path<(Uuid, Uuid)>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<String> {
    let tenant = match tenant_of(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let result = sqlx::query(only_own_schema_query!("wms", r#"UPDATE wms.stock_take_items SET deleted_at = NOW() WHERE stock_take_id = $1 AND id = $2 AND deleted_at IS NULL AND tenant_id = $3::uuid"#))
        .bind(id)
        .bind(item_id)
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
                ApiResponse::success("".to_string(), "盘点明细删除成功"),
                "success",
                None,
            )
        }
        Ok(_) => (
            ApiResponse::from(TopemsError::ResourceNotFound("盘点明细不存在".to_string())),
            "error",
            Some("盘点明细不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除盘点明细失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("盘点明细删除失败".to_string())),
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
        "stock_take_item".to_string(),
        Some(item_id),
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
    post,
    security(("BearerAuth" = ["wms:stocktake:admin"])),
    path = "/api/wms/stock-takes/{id}/complete",
    tag = "wms",
    responses(
        (status = 200, description = "完成盘点成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误")
    )
)]
#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
pub async fn complete_stock_take(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant = match tenant_of(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let now = Utc::now();

    if let Err(e) = release_request_txn(&txn_arc).await {
        tracing::error!("释放请求事务失败: {}", e);
        return ApiResponse::server_error("事务释放失败");
    }
    let txn_timer = ShortTxnTimer::start("stock_take.complete");
    let db = wms_db(&state.db);
    // wms-short-txn-exempt: W-03 盘点完成独立短事务（连接 GUC 收敛防 RLS 误过滤；行锁边界；每请求连接占用见 m1-acceptance §10）
    let mut scope = match db.scope_for_tenant(tenant).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启盘点事务失败: {}", e);
            return ApiResponse::server_error("开启事务失败");
        }
    };
    if let Err(e) = arm_short_txn(&mut scope).await {
        tracing::error!("设置短事务 lock_timeout 失败: {}", e);
        let _ = scope.rollback().await;
        return ApiResponse::server_error("开启事务失败");
    }

    let stats_result = sqlx::query(
        only_own_schema_query!("wms", r#"
        SELECT 
            COUNT(*) as total_items,
            COUNT(CASE WHEN counted_quantity IS NOT NULL THEN 1 END) as counted_items,
            COUNT(CASE WHEN discrepancy_type != 'none' AND discrepancy_type IS NOT NULL THEN 1 END) as discrepancy_items,
            SUM(system_quantity)::float8 as total_quantity,
            SUM(counted_quantity)::float8 as counted_quantity,
            SUM(CASE WHEN discrepancy_type IS NOT NULL THEN discrepancy_quantity ELSE 0 END)::float8 as discrepancy_quantity
        FROM wms.stock_take_items
        WHERE stock_take_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
        "#),
    )
    .bind(id)
    .bind(tenant)
    .fetch_one(&mut scope)
    .await;

    let (total_items, counted_items, discrepancy_items, total_qty, counted_qty, discrepancy_qty) =
        match stats_result {
            Ok(r) => {
                let total_items = match r.try_get::<i64, _>("total_items") {
                    Ok(v) => v,
                    Err(e) => {
                        tracing::error!("读取盘点统计失败: {}", e);
                        let _ = scope.rollback().await;
                        return ApiResponse::server_error("完成盘点失败");
                    }
                };
                let counted_items = match r.try_get::<i64, _>("counted_items") {
                    Ok(v) => v,
                    Err(e) => {
                        tracing::error!("读取盘点统计失败: {}", e);
                        let _ = scope.rollback().await;
                        return ApiResponse::server_error("完成盘点失败");
                    }
                };
                let discrepancy_items = match r.try_get::<i64, _>("discrepancy_items") {
                    Ok(v) => v,
                    Err(e) => {
                        tracing::error!("读取盘点统计失败: {}", e);
                        let _ = scope.rollback().await;
                        return ApiResponse::server_error("完成盘点失败");
                    }
                };
                (
                    total_items,
                    counted_items,
                    discrepancy_items,
                    r.try_get::<Option<f64>, _>("total_quantity")
                        .ok()
                        .flatten()
                        .unwrap_or(0.0),
                    r.try_get::<Option<f64>, _>("counted_quantity")
                        .ok()
                        .flatten()
                        .unwrap_or(0.0),
                    r.try_get::<Option<f64>, _>("discrepancy_quantity")
                        .ok()
                        .flatten()
                        .unwrap_or(0.0),
                )
            }
            Err(e) => {
                tracing::error!("统计盘点明细失败: {}", e);
                let _ = scope.rollback().await;
                return ApiResponse::server_error("完成盘点失败");
            }
        };

    let accuracy_rate = if total_items > 0 {
        (counted_items as f64 / total_items as f64) * 100.0
    } else {
        0.0
    };

    let updated = sqlx::query(only_own_schema_query!(
        "wms",
        r#"
        UPDATE wms.stock_takes SET
            status = 'completed',
            total_items = $1,
            counted_items = $2,
            discrepancy_items = $3,
            total_quantity = $4,
            counted_quantity = $5,
            discrepancy_quantity = $6,
            accuracy_rate = $7,
            updated_at = $8
        WHERE id = $9 AND tenant_id = $10 AND deleted_at IS NULL
          AND status NOT IN ('completed', 'cancelled')
        "#
    ))
    .bind(total_items)
    .bind(counted_items)
    .bind(discrepancy_items)
    .bind(total_qty)
    .bind(counted_qty)
    .bind(discrepancy_qty)
    .bind(accuracy_rate)
    .bind(now)
    .bind(id)
    .bind(tenant)
    .execute(&mut scope)
    .await;
    match updated {
        Ok(r) if r.rows_affected() == 1 => {}
        Ok(_) => {
            let exists = sqlx::query_scalar::<_, Uuid>(only_own_schema_query!(
                "wms",
                r#"SELECT id FROM wms.stock_takes WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL"#
            ))
            .bind(id)
            .bind(tenant)
            .fetch_optional(&mut scope)
            .await;
            let _ = scope.rollback().await;
            return match exists {
                Ok(Some(_)) => ApiResponse::conflict("盘点单当前状态不允许完成"),
                Ok(None) => {
                    ApiResponse::from(TopemsError::ResourceNotFound("盘点单不存在".to_string()))
                }
                Err(e) => {
                    tracing::error!("查询盘点单失败: {}", e);
                    ApiResponse::server_error("完成盘点失败")
                }
            };
        }
        Err(e) => {
            tracing::error!("更新盘点单失败: {}", e);
            let _ = scope.rollback().await;
            return ApiResponse::server_error("完成盘点失败");
        }
    }

    if let Err(e) = scope.commit().await {
        tracing::error!("完成盘点事务提交失败: {}", e);
        return ApiResponse::from(TopemsError::Internal("完成盘点失败".to_string()));
    }
    txn_timer.finish();

    // wms-short-txn-exempt: R-02 提交后只读回读（独立只读短事务，不占请求事务连接；见 m1-acceptance §10）
    let mut read_scope = match db.scope_read_for_tenant(tenant).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启盘点只读作用域失败: {}", e);
            return ApiResponse::server_error("完成盘点失败");
        }
    };

    let result = sqlx::query(only_own_schema_query!(
        "wms",
        r#"
        SELECT id, warehouse_id, warehouse_name, location_id, location_code, location_name,
               stock_take_number, stock_take_type, status, planned_date, actual_date,
               total_items, counted_items, discrepancy_items, total_quantity, counted_quantity,
               discrepancy_quantity, discrepancy_value, accuracy_rate,
               approval_status, adjustment_status, remarks, created_at, updated_at
        FROM wms.stock_takes WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
        "#
    ))
    .bind(id)
    .bind(tenant)
    .fetch_one(&mut read_scope)
    .await;

    let (response, status_str, error_msg, response_data) = match result {
        Ok(stock_take) => {
            let stock_take_json = stock_take_row_to_json(&stock_take);
            (
                ApiResponse::success(stock_take_json.clone(), "盘点完成"),
                "success",
                None,
                Some(stock_take_json),
            )
        }
        Err(sqlx::Error::RowNotFound) => (
            ApiResponse::from(TopemsError::ResourceNotFound("盘点单不存在".to_string())),
            "not_found",
            None,
            None,
        ),
        Err(e) => {
            tracing::error!("获取盘点失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("完成盘点失败".to_string())),
                "error",
                Some(e.to_string()),
                None,
            )
        }
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "stock_take".to_string(),
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
    post,
    security(("BearerAuth" = ["wms:stocktake:admin"])),
    path = "/api/wms/stock-takes/{id}/adjust",
    tag = "wms",
    responses(
        (status = 200, description = "调整库存成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误")
    )
)]
pub async fn adjust_stock_take(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant = match tenant_of(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let now = Utc::now();

    if let Err(e) = release_request_txn(&txn_arc).await {
        tracing::error!("释放请求事务失败: {}", e);
        return ApiResponse::server_error("事务释放失败");
    }
    let txn_timer = ShortTxnTimer::start("stock_take.adjust");
    let db = wms_db(&state.db);
    // wms-short-txn-exempt: W-04 盘点调整独立短事务（连接 GUC 收敛防 RLS 误过滤；行锁边界；每请求连接占用见 m1-acceptance §10）
    let mut scope = match db.scope_for_tenant(tenant).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启盘点调整事务失败: {}", e);
            return ApiResponse::server_error("开启事务失败");
        }
    };
    if let Err(e) = arm_short_txn(&mut scope).await {
        tracing::error!("设置短事务 lock_timeout 失败: {}", e);
        let _ = scope.rollback().await;
        return ApiResponse::server_error("开启事务失败");
    }

    let organization_id = sqlx::query_scalar::<_, Uuid>(only_own_schema_query!(
        "wms",
        r#"
        SELECT organization_id FROM wms.stock_takes
        WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
        "#
    ))
    .bind(id)
    .bind(tenant)
    .fetch_optional(&mut scope)
    .await;
    let organization_id = match organization_id {
        Ok(Some(v)) => v,
        Ok(None) => {
            let _ = scope.rollback().await;
            return ApiResponse::from(TopemsError::ResourceNotFound("盘点单不存在".to_string()));
        }
        Err(e) => {
            tracing::error!("查询盘点单失败: {}", e);
            let _ = scope.rollback().await;
            return ApiResponse::server_error("库存调整失败");
        }
    };

    let discrepancies = sqlx::query_as::<_, (String, Option<String>, f64)>(only_own_schema_query!(
        "wms",
        r#"
        SELECT material_code, batch_number, discrepancy_quantity::float8
        FROM wms.stock_take_items
        WHERE stock_take_id = $1 AND tenant_id = $2
          AND discrepancy_type != 'none' AND discrepancy_type IS NOT NULL
          AND deleted_at IS NULL
        "#
    ))
    .bind(id)
    .bind(tenant)
    .fetch_all(&mut scope)
    .await;

    let discrepancies = match discrepancies {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询盘点差异失败: {}", e);
            let _ = scope.rollback().await;
            return ApiResponse::server_error("库存调整失败");
        }
    };

    for (material_code, batch_number, discrepancy_qty) in discrepancies {
        if discrepancy_qty == 0.0 {
            continue;
        }

        // 一次只锁一行（带批次则精确到批次；无批次按最早到期取一行），
        // 杜绝「同物料多批次各加一次差异」。
        let stock_id = sqlx::query_scalar::<_, Uuid>(only_own_schema_query!(
            "wms",
            r#"
            SELECT id FROM wms.inventory
            WHERE organization_id = $1
              AND material_code = $2
              AND tenant_id = $3
              AND deleted_at IS NULL
              AND ($4::varchar IS NULL OR batch_number = $4::varchar)
            ORDER BY expiry_date NULLS LAST, created_at, id
            LIMIT 1
            FOR UPDATE
            "#
        ))
        .bind(organization_id)
        .bind(&material_code)
        .bind(tenant)
        .bind(batch_number.as_deref())
        .fetch_optional(&mut scope)
        .await;
        let stock_id = match stock_id {
            Ok(Some(v)) => v,
            Ok(None) => {
                let _ = scope.rollback().await;
                return ApiResponse::conflict(&format!(
                    "物料 {} 批次 {:?} 的库存行不存在，无法调整",
                    material_code, batch_number
                ));
            }
            Err(e) => {
                tracing::error!("锁定库存行失败: {}", e);
                let _ = scope.rollback().await;
                return ApiResponse::server_error("库存调整失败");
            }
        };

        let adjusted = sqlx::query(only_own_schema_query!(
            "wms",
            r#"
            UPDATE wms.inventory SET
                quantity = quantity + $2,
                available_quantity = available_quantity + $2,
                updated_at = $3
            WHERE id = $1 AND tenant_id = $4 AND deleted_at IS NULL
              AND available_quantity + $2 >= 0
            "#
        ))
        .bind(stock_id)
        .bind(discrepancy_qty)
        .bind(now)
        .bind(tenant)
        .execute(&mut scope)
        .await;
        match adjusted {
            Ok(r) if r.rows_affected() == 1 => {}
            Ok(_) => {
                let _ = scope.rollback().await;
                return ApiResponse::conflict(&format!(
                    "物料 {} 调整后库存将为负，已拒绝",
                    material_code
                ));
            }
            Err(e) => {
                tracing::error!("调整库存失败: {}", e);
                let _ = scope.rollback().await;
                return ApiResponse::server_error("库存调整失败");
            }
        }
    }

    let updated = sqlx::query(only_own_schema_query!(
        "wms",
        r#"
        UPDATE wms.stock_takes SET
            adjustment_status = 'completed',
            adjusted_by = 'system',
            adjustment_date = $1::date,
            updated_at = $1::timestamptz
        WHERE id = $2 AND tenant_id = $3 AND deleted_at IS NULL
        "#
    ))
    .bind(now.date_naive())
    .bind(id)
    .bind(tenant)
    .execute(&mut scope)
    .await;
    match updated {
        Ok(r) if r.rows_affected() == 1 => {}
        Ok(_) => {
            let _ = scope.rollback().await;
            return ApiResponse::conflict("盘点单状态已变化，调整未生效");
        }
        Err(e) => {
            tracing::error!("更新盘点单调整状态失败: {}", e);
            let _ = scope.rollback().await;
            return ApiResponse::server_error("库存调整失败");
        }
    }

    if let Err(e) = scope.commit().await {
        tracing::error!("库存调整事务提交失败: {}", e);
        return ApiResponse::from(TopemsError::Internal("库存调整失败".to_string()));
    }
    txn_timer.finish();

    ApiResponse::success(
        serde_json::json!({ "message": "库存调整完成" }),
        "库存调整成功",
    )
}

#[derive(Debug, serde::Deserialize, ToSchema)]
pub struct ApprovalRequest {
    pub operator: String,
    pub comment: Option<String>,
    pub discrepancy_threshold: Option<f64>,
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:stocktake:admin"])),
    path = "/api/wms/stock-takes/{id}/approval/start",
    tag = "WMS - StockTake",
    request_body = ApprovalRequest,
    responses((status = 200, description = "OK")),
)]
pub async fn start_stock_take_approval(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<ApprovalRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::StockTakeApprove).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(tenant) => tenant,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };

    let current = sqlx::query(
        only_own_schema_query!("wms", "SELECT status FROM wms.stock_takes WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2"),
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await;

    match current {
        Ok(row) => {
            let current_status = row.get::<Option<String>, _>("status").unwrap_or_default();
            if !crate::shared::fsm::stock_take_requires_approval(&current_status, "completed") {
                return ApiResponse::bad_request("当前状态无需审批");
            }
            if let Err(e) = crate::models::audit_log::log_approval_event(
                &mut **txn,
                &tenant_id.to_string(),
                "stock_take",
                &id.to_string(),
                "start_approval",
                &req.operator,
                &current_status,
                &current_status,
                req.comment.as_deref(),
            )
            .await
            {
                tracing::warn!("审计日志写入失败: {}", e);
            }
            ApiResponse::success(
                serde_json::json!({"status": current_status, "approval_started": true}),
                "审批启动成功",
            )
        }
        Err(e) => {
            tracing::error!("找不到盘点单: {}", e);
            ApiResponse::not_found("盘点单不存在")
        }
    }
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:stocktake:admin"])),
    path = "/api/wms/stock-takes/{id}/approval/approve",
    tag = "WMS - StockTake",
    request_body = ApprovalRequest,
    responses((status = 200, description = "OK")),
)]
pub async fn approve_stock_take(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<ApprovalRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::StockTakeApprove).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(tenant) => tenant,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };

    let current = sqlx::query(
        only_own_schema_query!("wms", "SELECT status FROM wms.stock_takes WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2"),
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await;

    match current {
        Ok(row) => {
            let current_status = row.get::<Option<String>, _>("status").unwrap_or_default();
            if crate::shared::fsm::stock_take_requires_approval(&current_status, "completed")
                && crate::shared::fsm::stock_take_can_transition(&current_status, "completed")
                    .is_err()
            {
                return ApiResponse::bad_request("当前状态不允许审批通过");
            }
            let result = sqlx::query(
                only_own_schema_query!("wms", "UPDATE wms.stock_takes SET status = 'completed', updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING *"),
            )
            .bind(id)
            .bind(tenant_id)
            .fetch_one(&mut **txn)
            .await;
            match result {
                Ok(_) => {
                    if let Err(e) = crate::models::audit_log::log_approval_event(
                        &mut **txn,
                        &tenant_id.to_string(),
                        "stock_take",
                        &id.to_string(),
                        "approve",
                        &req.operator,
                        &current_status,
                        "completed",
                        req.comment.as_deref(),
                    )
                    .await
                    {
                        tracing::warn!("审计日志写入失败: {}", e);
                    }
                    if let Some(t) = guard.take() {
                        if let Err(e) = t.commit().await {
                            tracing::error!("事务提交失败: {}", e);
                            return ApiResponse::server_error("事务提交失败");
                        }
                    }
                    ApiResponse::success(
                        serde_json::json!({"id": id, "status": "completed"}),
                        "审批通过",
                    )
                }
                Err(e) => {
                    tracing::error!("审批盘点单失败: {}", e);
                    ApiResponse::server_error("审批失败")
                }
            }
        }
        Err(e) => {
            tracing::error!("找不到盘点单: {}", e);
            ApiResponse::not_found("盘点单不存在")
        }
    }
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:stocktake:admin"])),
    path = "/api/wms/stock-takes/{id}/approval/reject",
    tag = "WMS - StockTake",
    request_body = ApprovalRequest,
    responses((status = 200, description = "OK")),
)]
pub async fn reject_stock_take(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<ApprovalRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::StockTakeApprove).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(tenant) => tenant,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };

    let current = sqlx::query(
        only_own_schema_query!("wms", "SELECT status FROM wms.stock_takes WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2"),
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await;

    match current {
        Ok(row) => {
            let current_status = row.get::<Option<String>, _>("status").unwrap_or_default();
            if current_status != "in_progress" {
                return ApiResponse::bad_request("当前状态不允许驳回返工");
            }
            if let Err(e) = crate::models::audit_log::log_approval_event(
                &mut **txn,
                &tenant_id.to_string(),
                "stock_take",
                &id.to_string(),
                "reject_rework",
                &req.operator,
                &current_status,
                &current_status,
                req.comment.as_deref(),
            )
            .await
            {
                tracing::warn!("审计日志写入失败: {}", e);
            }
            ApiResponse::success(
                serde_json::json!({"id": id, "status": current_status, "rework": true}),
                "审批驳回，需重新盘点(rework)",
            )
        }
        Err(e) => {
            tracing::error!("找不到盘点单: {}", e);
            ApiResponse::not_found("盘点单不存在")
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_stock_take_pagination_params_deserialize() {
        let query = "search=ST001&status=pending";
        let params: StockTakePaginationParams = serde_urlencoded::from_str(query).unwrap();
        assert_eq!(params.search.as_deref(), Some("ST001"));
        assert_eq!(params.status.as_deref(), Some("pending"));
    }

    #[test]
    fn test_stock_take_pagination_params_default() {
        let query = "";
        let params: StockTakePaginationParams = serde_urlencoded::from_str(query).unwrap();
        assert!(params.search.is_none());
        assert!(params.status.is_none());
        assert!(params.page.is_none());
        assert!(params.page_size.is_none());
        assert!(params.warehouse_id.is_none());
    }

    #[test]
    fn test_stock_take_pagination_params_only_status() {
        let query = "status=completed";
        let params: StockTakePaginationParams = serde_urlencoded::from_str(query).unwrap();
        assert_eq!(params.status.as_deref(), Some("completed"));
        assert!(params.search.is_none());
    }

    #[test]
    fn test_count_item_request_serialization() {
        let request = CountItemRequest {
            item_id: Uuid::nil(),
            counted_quantity: 95.0,
            discrepancy_reason: Some("损耗".to_string()),
            remarks: Some("盘点完成".to_string()),
        };
        let json = serde_json::to_value(&request).unwrap();
        assert_eq!(json["counted_quantity"], 95.0);
        assert_eq!(json["discrepancy_reason"], "损耗");
        assert_eq!(json["remarks"], "盘点完成");
    }

    #[test]
    fn test_count_item_request_minimal() {
        let request = CountItemRequest {
            item_id: Uuid::nil(),
            counted_quantity: 100.0,
            discrepancy_reason: None,
            remarks: None,
        };
        let json = serde_json::to_value(&request).unwrap();
        assert_eq!(json["counted_quantity"], 100.0);
        assert!(json["discrepancy_reason"].is_null());
        assert!(json["remarks"].is_null());
    }

    #[test]
    fn test_count_item_request_deserialize() {
        let json = r#"{
            "item_id": "00000000-0000-0000-0000-000000000000",
            "counted_quantity": 80.0,
            "discrepancy_reason": "丢失",
            "remarks": "差异较大"
        }"#;
        let request: CountItemRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.counted_quantity, 80.0);
        assert_eq!(request.discrepancy_reason.as_deref(), Some("丢失"));
        assert_eq!(request.remarks.as_deref(), Some("差异较大"));
    }

    #[test]
    fn test_approval_request_deserialize() {
        let json = r#"{
            "operator": "admin",
            "comment": "同意盘点结果",
            "discrepancy_threshold": 5.0
        }"#;
        let request: ApprovalRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.operator, "admin");
        assert_eq!(request.comment.as_deref(), Some("同意盘点结果"));
        assert_eq!(request.discrepancy_threshold, Some(5.0));
    }

    #[test]
    fn test_approval_request_no_comment() {
        let json = r#"{
            "operator": "manager"
        }"#;
        let request: ApprovalRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.operator, "manager");
        assert!(request.comment.is_none());
        assert!(request.discrepancy_threshold.is_none());
    }

    #[test]
    fn test_approval_request_with_threshold() {
        let json = r#"{
            "operator": "auditor",
            "comment": "差异在阈值内",
            "discrepancy_threshold": 10.0
        }"#;
        let request: ApprovalRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.operator, "auditor");
        assert_eq!(request.comment.as_deref(), Some("差异在阈值内"));
        assert_eq!(request.discrepancy_threshold, Some(10.0));
    }
}
