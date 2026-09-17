use axum::{
    extract::{Extension, FromRef, Path, Query, State},
    http::HeaderMap,
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use crate::models::{CreateLocationRequest, Location, UpdateLocationRequest};
use crate::modules::audit::log_audit_event;
use crate::modules::ApiState;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::{api_error, ApiResponse};

#[derive(Debug, Deserialize)]
pub struct LocationPaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub warehouse_id: Option<String>,
    pub zone_id: Option<String>,
    pub location_type: Option<String>,
    pub storage_type: Option<String>,
    pub isactive: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocationStatusSummary {
    pub warehouse_id: String,
    pub total_locations: i64,
    pub empty_locations: i64,
    pub partially_filled: i64,
    pub full_locations: i64,
    pub inactive_locations: i64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct BatchUpdateRequest {
    pub ids: Vec<String>,
    pub updates: UpdateLocationRequest,
}

pub fn create_routes<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
    ApiState: FromRef<S>,
{
    Router::new()
        .route("/locations", get(list_locations).post(create_location))
        .route(
            "/locations/{id}",
            get(get_location)
                .put(update_location)
                .delete(delete_location),
        )
        .route("/locations/status", get(get_location_status))
        .route(
            "/locations/batch",
            post(batch_create_locations).put(batch_update_locations),
        )
        .route("/locations/batch-delete", post(batch_delete_locations))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:location:read"])),
    path = "/api/wms/locations",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn list_locations(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<LocationPaginationParams>,
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

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();
    let warehouse_id = params.warehouse_id.and_then(|s| Uuid::parse_str(&s).ok());

    let result = sqlx::query_as::<_, Location>(
        only_own_schema_query!("wms", r#"
        SELECT id, tenant_id, warehouse_id, location_code AS code, location_name AS name, location_type AS type, capacity, status, created_at, updated_at
        FROM wms.locations
        WHERE ($1::text IS NULL OR location_name ILIKE $1 OR location_code ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
          AND ($3::uuid IS NULL OR warehouse_id = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#),
    )
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(warehouse_id)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(locations) => {
            let count_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "wms",
                r#"
                SELECT COUNT(*) FROM wms.locations
                WHERE deleted_at IS NULL AND ($1::text IS NULL OR location_name ILIKE $1 OR location_code ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND ($3::uuid IS NULL OR warehouse_id = $3)
                "#
            ))
            .bind(&search_pattern)
            .bind(&status_filter)
            .bind(warehouse_id)
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": locations,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取库位列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取库位列表失败: {}", e);
            Json(api_error(500, "获取库位列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:location:admin"])),
    path = "/api/wms/locations",
    tag = "wms",
    responses(
        (status = 201, description = "创建成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 500, description = "服务内部错误")
    )
)]
pub async fn create_location(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CreateLocationRequest>,
) -> Json<ApiResponse<Location>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, Location>(
        only_own_schema_query!("wms", r#"
        INSERT INTO wms.locations (id, warehouse_id, location_code, location_name, location_type, capacity, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'available', $7, $8)
        RETURNING id, tenant_id, warehouse_id, location_code AS code, location_name AS name, location_type AS type, capacity, status, created_at, updated_at
        "#),
    )
    .bind(id)
    .bind(req.warehouse_id)
    .bind(&req.code)
    .bind(&req.name)
    .bind(&req.r#type)
    .bind(req.capacity)
    .bind(now)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    let (response, status, error_msg) = match &result {
        Ok(location) => (
            Json(ApiResponse::success(location.clone(), "库位创建成功")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("创建库位失败: {}", e);
            (
                Json(api_error(500, "库位创建失败")),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(location) = &result {
        serde_json::to_value(location).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "location".to_string(),
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
    security(("BearerAuth" = ["wms:location:read"])),
    path = "/api/wms/locations/{id}",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn get_location(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<Location>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let location_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的库位ID")),
    };

    let result = sqlx::query_as::<_, Location>(
        only_own_schema_query!("wms", r#"
        SELECT id, tenant_id, warehouse_id, location_code AS code, location_name AS name, location_type AS type, capacity, status, created_at, updated_at
        FROM wms.locations WHERE id = $1
        "#),
    )
    .bind(location_id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(location)) => Json(ApiResponse::success(location, "获取库位成功")),
        Ok(None) => Json(api_error(404, "库位不存在")),
        Err(e) => {
            tracing::error!("获取库位失败: {}", e);
            Json(api_error(500, "获取库位失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["wms:location:admin"])),
    path = "/api/wms/locations/{id}",
    tag = "wms",
    responses(
        (status = 200, description = "更新成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误")
    )
)]
pub async fn update_location(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<UpdateLocationRequest>,
) -> Json<ApiResponse<Location>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let location_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的库位ID")),
    };

    let request_data = serde_json::to_value(&req).ok();

    let existing = sqlx::query_as::<_, Location>(
        only_own_schema_query!("wms", r#"
        SELECT id, tenant_id, warehouse_id, location_code AS code, location_name AS name, location_type AS type, capacity, status, created_at, updated_at FROM wms.locations WHERE deleted_at IS NULL AND id = $1
        "#),
    )
    .bind(location_id)
    .fetch_optional(&mut **txn)
    .await;

    let existing = match existing {
        Ok(Some(l)) => l,
        Ok(None) => return Json(api_error(404, "库位不存在")),
        Err(e) => return Json(api_error(500, &format!("查询库位失败: {}", e))),
    };

    let warehouse_id = req.warehouse_id.or(existing.warehouse_id);
    let code = req.code.unwrap_or(existing.code);
    let name = req.name.or(existing.name);
    let r#type = req.r#type.or(existing.r#type);
    let capacity = req.capacity.or(existing.capacity);
    let status = req.status.unwrap_or(existing.status);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Location>(
        only_own_schema_query!("wms", r#"
        UPDATE wms.locations SET
            warehouse_id = $2, location_code = $3, location_name = $4, location_type = $5, capacity = $6, 
            status = $7, updated_at = $8
        WHERE id = $1
        RETURNING id, tenant_id, warehouse_id, location_code AS code, location_name AS name, location_type AS type, capacity, status, created_at, updated_at
        "#),
    )
    .bind(location_id)
    .bind(warehouse_id)
    .bind(&code)
    .bind(&name)
    .bind(&r#type)
    .bind(capacity)
    .bind(&status)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(location) => (
            Json(ApiResponse::success(location.clone(), "库位更新成功")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("更新库位失败: {}", e);
            (
                Json(api_error(500, "库位更新失败")),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(location) = &result {
        serde_json::to_value(location).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "location".to_string(),
        Some(location_id),
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

// gate: admin-only
#[utoipa::path(
    delete,
    security(("BearerAuth" = ["wms:location:admin"])),
    path = "/api/wms/locations/{id}",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn delete_location(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    headers: HeaderMap,
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

    let location_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的库位ID")),
    };

    let result = sqlx::query(only_own_schema_query!(
        "wms",
        "UPDATE wms.locations SET deleted_at = NOW() WHERE id = $1"
    ))
    .bind(location_id)
    .execute(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return Json(ApiResponse::error(500, "事务提交失败"));
                }
            }
            (
                Json(ApiResponse::success("".to_string(), "库位删除成功")),
                "success",
                None,
            )
        }
        Ok(_) => (
            Json(api_error(404, "库位不存在")),
            "error",
            Some("库位不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除库位失败: {}", e);
            (
                Json(api_error(500, "库位删除失败")),
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
        "location".to_string(),
        Some(location_id),
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

#[derive(Debug, Deserialize)]
pub struct LocationStatusParams {
    pub warehouse_id: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:location:read"])),
    path = "/api/wms/locations/status",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn get_location_status(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<LocationStatusParams>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<LocationStatusSummary>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let warehouse_id: Option<Uuid> = params.warehouse_id.and_then(|s| Uuid::parse_str(&s).ok());

    let result = sqlx::query!(
        r#"
        SELECT 
            COUNT(*) as total_locations,
            SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as empty_locations,
            SUM(CASE WHEN status = 'partial' THEN 1 ELSE 0 END) as partially_filled,
            SUM(CASE WHEN status = 'full' THEN 1 ELSE 0 END) as full_locations,
            SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive_locations
        FROM wms.locations
        WHERE warehouse_id = $1 OR $1 IS NULL
        "#,
        warehouse_id
    )
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(row) => {
            let summary = LocationStatusSummary {
                warehouse_id: warehouse_id.map(|id| id.to_string()).unwrap_or_default(),
                total_locations: row.total_locations.unwrap_or(0),
                empty_locations: row.empty_locations.unwrap_or(0),
                partially_filled: row.partially_filled.unwrap_or(0),
                full_locations: row.full_locations.unwrap_or(0),
                inactive_locations: row.inactive_locations.unwrap_or(0),
            };
            Json(ApiResponse::success(summary, "获取库位状态统计成功"))
        }
        Err(e) => {
            tracing::error!("获取库位状态统计失败: {}", e);
            Json(api_error(500, "获取库位状态统计失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:location:admin"])),
    path = "/api/wms/locations/batch",
    tag = "wms",
    responses(
        (status = 201, description = "批量创建成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 500, description = "服务内部错误")
    )
)]
pub async fn batch_create_locations(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<Vec<CreateLocationRequest>>,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let mut created_locations = Vec::new();
    let now = Utc::now();

    for item in req {
        let id = Uuid::new_v4();
        let result = sqlx::query_as::<_, Location>(
            only_own_schema_query!("wms", r#"
            INSERT INTO wms.locations (id, warehouse_id, location_code, location_name, location_type, capacity, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, 'available', $7, $8)
            RETURNING id, tenant_id, warehouse_id, location_code AS code, location_name AS name, location_type AS type, capacity, status, created_at, updated_at
            "#),
        )
        .bind(id)
        .bind(item.warehouse_id)
        .bind(&item.code)
        .bind(&item.name)
        .bind(&item.r#type)
        .bind(item.capacity)
        .bind(now)
        .bind(now)
        .fetch_one(&mut **txn)
        .await;

        if let Ok(location) = result {
            created_locations.push(location);
        }
    }

    Json(ApiResponse::success(
        serde_json::json!({
            "created_count": created_locations.len(),
            "locations": created_locations
        }),
        "批量创建库位成功",
    ))
}

// gate: admin-only
#[utoipa::path(
    put,
    security(("BearerAuth" = ["wms:location:admin"])),
    path = "/api/wms/locations/batch",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn batch_update_locations(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<BatchUpdateRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let ids: Vec<Uuid> = req
        .ids
        .into_iter()
        .filter_map(|id| Uuid::parse_str(&id).ok())
        .collect();

    if ids.is_empty() {
        return Json(api_error(400, "无效的库位ID列表"));
    }

    let now = Utc::now();

    let result = sqlx::query(only_own_schema_query!(
        "wms",
        r#"
        UPDATE wms.locations SET
            warehouse_id = COALESCE($1, warehouse_id),
            location_code = COALESCE($2, location_code),
            location_name = COALESCE($3, location_name),
            location_type = COALESCE($4, location_type),
            capacity = COALESCE($5, capacity),
            status = COALESCE($6, status),
            updated_at = $7
        WHERE id = ANY($8)
        "#
    ))
    .bind(req.updates.warehouse_id)
    .bind(&req.updates.code)
    .bind(&req.updates.name)
    .bind(&req.updates.r#type)
    .bind(req.updates.capacity)
    .bind(&req.updates.status)
    .bind(now)
    .bind(&ids)
    .execute(&mut **txn)
    .await;

    match result {
        Ok(r) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return Json(ApiResponse::error(500, "事务提交失败"));
                }
            }
            Json(ApiResponse::success(
                serde_json::json!({ "updated_count": r.rows_affected() }),
                "批量更新库位成功",
            ))
        }
        Err(e) => {
            tracing::error!("批量更新库位失败: {}", e);
            Json(api_error(500, "批量更新库位失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:location:admin"])),
    path = "/api/wms/locations/batch-delete",
    tag = "wms",
    responses(
        (status = 200, description = "批量删除成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 500, description = "服务内部错误")
    )
)]
pub async fn batch_delete_locations(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let ids: Vec<Uuid> = req
        .get("ids")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|id| id.as_str().and_then(|s| Uuid::parse_str(s).ok()))
                .collect()
        })
        .unwrap_or_default();

    if ids.is_empty() {
        return Json(api_error(400, "无效的库位ID列表"));
    }

    let result = sqlx::query(only_own_schema_query!(
        "wms",
        "UPDATE wms.locations SET deleted_at = NOW() WHERE id = ANY($1)"
    ))
    .bind(&ids)
    .execute(&mut **txn)
    .await;

    match result {
        Ok(r) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return Json(ApiResponse::error(500, "事务提交失败"));
                }
            }
            Json(ApiResponse::success(
                serde_json::json!({ "deleted_count": r.rows_affected() }),
                "批量删除库位成功",
            ))
        }
        Err(e) => {
            tracing::error!("批量删除库位失败: {}", e);
            Json(api_error(500, "批量删除库位失败"))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_location_pagination_params_deserialize() {
        let query = "search=A01&status=active&warehouse_id=WH001&zone_id=Z01&location_type=storage&storage_type=pallet&isactive=true";
        let params: LocationPaginationParams = serde_urlencoded::from_str(query).unwrap();
        assert_eq!(params.search.as_deref(), Some("A01"));
        assert_eq!(params.status.as_deref(), Some("active"));
        assert_eq!(params.warehouse_id.as_deref(), Some("WH001"));
        assert_eq!(params.zone_id.as_deref(), Some("Z01"));
        assert_eq!(params.location_type.as_deref(), Some("storage"));
        assert_eq!(params.storage_type.as_deref(), Some("pallet"));
        assert_eq!(params.isactive, Some(true));
    }

    #[test]
    fn test_location_pagination_params_default() {
        let query = "";
        let params: LocationPaginationParams = serde_urlencoded::from_str(query).unwrap();
        assert!(params.search.is_none());
        assert!(params.status.is_none());
        assert!(params.warehouse_id.is_none());
        assert!(params.zone_id.is_none());
        assert!(params.location_type.is_none());
        assert!(params.storage_type.is_none());
        assert!(params.isactive.is_none());
        assert!(params.page.is_none());
        assert!(params.page_size.is_none());
    }

    #[test]
    fn test_location_status_summary_serialization() {
        let summary = LocationStatusSummary {
            warehouse_id: "WH001".to_string(),
            total_locations: 100,
            empty_locations: 20,
            partially_filled: 30,
            full_locations: 40,
            inactive_locations: 10,
        };
        let json = serde_json::to_value(&summary).unwrap();
        assert_eq!(json["warehouse_id"], "WH001");
        assert_eq!(json["total_locations"], 100);
        assert_eq!(json["empty_locations"], 20);
        assert_eq!(json["partially_filled"], 30);
        assert_eq!(json["full_locations"], 40);
        assert_eq!(json["inactive_locations"], 10);
    }

    #[test]
    fn test_location_status_summary_clone() {
        let summary = LocationStatusSummary {
            warehouse_id: "WH001".to_string(),
            total_locations: 50,
            empty_locations: 10,
            partially_filled: 15,
            full_locations: 20,
            inactive_locations: 5,
        };
        let cloned = summary.clone();
        assert_eq!(summary.warehouse_id, cloned.warehouse_id);
        assert_eq!(summary.total_locations, cloned.total_locations);
        assert_eq!(summary.empty_locations, cloned.empty_locations);
    }

    #[test]
    fn test_batch_update_request_deserialize() {
        let json = r#"{
            "ids": ["loc1", "loc2", "loc3"],
            "updates": {
                "status": "active",
                "zone_id": "Z01"
            }
        }"#;
        let request: BatchUpdateRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.ids.len(), 3);
        assert_eq!(request.ids[0], "loc1");
        assert_eq!(request.ids[1], "loc2");
        assert_eq!(request.ids[2], "loc3");
    }

    #[test]
    fn test_batch_update_request_empty_ids() {
        let json = r#"{
            "ids": [],
            "updates": {
                "status": "inactive"
            }
        }"#;
        let request: BatchUpdateRequest = serde_json::from_str(json).unwrap();
        assert!(request.ids.is_empty());
    }

    #[test]
    fn test_location_status_params_deserialize() {
        let query = "warehouse_id=WH001";
        let params: LocationStatusParams = serde_urlencoded::from_str(query).unwrap();
        assert_eq!(params.warehouse_id.as_deref(), Some("WH001"));
    }

    #[test]
    fn test_location_status_params_default() {
        let query = "";
        let params: LocationStatusParams = serde_urlencoded::from_str(query).unwrap();
        assert!(params.warehouse_id.is_none());
    }
}
