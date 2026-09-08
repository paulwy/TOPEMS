use axum::{
    extract::{Extension, FromRef},
    http::HeaderMap,
    routing::get,
    Json, Router,
};
use chrono::Utc;
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use crate::models::{CreateWarehouseRequest, UpdateWarehouseRequest, Warehouse};
use crate::modules::audit::log_audit_event;
use crate::modules::ApiState;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::get_tenant_id;
use topems_shared_core::response::{api_error, ApiResponse, PaginationParams};

fn warehouse_cache_key(tenant_id: Uuid, id: Uuid) -> String {
    format!("warehouse:{}:{}", tenant_id, id)
}

fn warehouse_list_cache_key(
    tenant_id: Uuid,
    page: i64,
    page_size: i64,
    search: &Option<String>,
    status: &Option<String>,
) -> String {
    format!(
        "warehouses:{}:page:{}:size:{}:search:{:?}:status:{:?}",
        tenant_id, page, page_size, search, status
    )
}

pub fn create_routes<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
    ApiState: FromRef<S>,
{
    Router::new()
        .route("/warehouses", get(list_warehouses).post(create_warehouse))
        .route(
            "/warehouses/{id}",
            get(get_warehouse)
                .put(update_warehouse)
                .delete(delete_warehouse),
        )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:read"])),
    path = "/api/wms/warehouses",
    responses(
        (status = 200, description = "list_warehouses OK")
    ),
    tag = "WMS/warehouse"
)]
pub async fn list_warehouses(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Query(params): axum::extract::Query<PaginationParams>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let tenant_id = get_tenant_id(&claims, &headers);

    let cache_key =
        warehouse_list_cache_key(tenant_id, page, page_size, &params.search, &params.status);

    if let Some(cached) = state.warehouse_cache.get(&cache_key) {
        tracing::debug!("📋 仓库列表缓存命中: {}", cache_key);
        return Json(ApiResponse::success(cached, "获取仓库列表成功"));
    }

    let result = sqlx::query_as::<_, Warehouse>(
        only_own_schema_query!("wms", r#"
        SELECT id, tenant_id, warehouse_name as name, warehouse_code as code, address, manager, contact_phone as phone, status, created_at, updated_at
        FROM wms.warehouses
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR warehouse_name ILIKE $2 OR warehouse_code ILIKE $2)
          AND ($3::text IS NULL OR status = $3)
          AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#),
    )
    .bind(tenant_id)
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(warehouses) => {
            let count_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "wms",
                r#"
                SELECT COUNT(*) FROM wms.warehouses
                WHERE tenant_id = $1
                  AND ($2::text IS NULL OR warehouse_name ILIKE $2 OR warehouse_code ILIKE $2)
                  AND ($3::text IS NULL OR status = $3)
                  AND deleted_at IS NULL
                "#
            ))
            .bind(tenant_id)
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);

            let response_data = serde_json::json!({
                "warehouses": warehouses,
                "total": total,
                "page": page,
                "page_size": page_size
            });

            state.warehouse_cache.set(cache_key, response_data.clone());

            Json(ApiResponse::success(response_data, "获取仓库列表成功"))
        }
        Err(e) => {
            tracing::error!("获取仓库列表失败: {}", e);
            Json(api_error(500, "获取仓库列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:write"])),
    path = "/api/wms/warehouses",
    responses(
        (status = 201, description = "创建成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 500, description = "服务内部错误")
    ),
    tag = "WMS/warehouse"
)]
pub async fn create_warehouse(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    axum::extract::Json(req): axum::extract::Json<CreateWarehouseRequest>,
) -> Json<ApiResponse<Warehouse>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let request_data = serde_json::to_value(&req).ok();
    let id = Uuid::new_v4();
    let now = Utc::now();
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, Warehouse>(
        only_own_schema_query!("wms", r#"
        INSERT INTO wms.warehouses (id, tenant_id, org_id, warehouse_name, warehouse_code, address, manager, contact_phone, status, created_at, updated_at)
        VALUES ($1, $2, '00000000-0000-0000-0000-000000000001', $3, $4, $5, $6, $7, 'active', $8, $9)
        RETURNING id, tenant_id, warehouse_name as name, warehouse_code as code, address, manager, contact_phone as phone, status, created_at, updated_at
        "#),
    )
    .bind(id)
    .bind(tenant_id)
    .bind(&req.name)
    .bind(&req.code)
    .bind(&req.address)
    .bind(&req.manager)
    .bind(&req.phone)
    .bind(now)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    let (response, status, error_msg) = match &result {
        Ok(warehouse) => (
            Json(ApiResponse::success(warehouse.clone(), "仓库创建成功")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("创建仓库失败: {}", e);
            (
                Json(api_error(500, "仓库创建失败")),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(warehouse) = &result {
        serde_json::to_value(warehouse).ok()
    } else {
        None
    };

    if status == "success" {
        state.warehouse_cache.clear();
        tracing::debug!("🗑️ 仓库列表缓存已清空（创建仓库）");
    }

    log_audit_event(
        &state.db,
        "create".to_string(),
        "warehouse".to_string(),
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
    security(("BearerAuth" = ["wms:read"])),
    path = "/api/wms/warehouses/{id}",
    params(
        ("id" = Uuid, Path, description = "id")
    ),
    responses(
        (status = 200, description = "查询成功", body = Warehouse, content_type = "application/json"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误")
    ),
    tag = "WMS/warehouse"
)]
pub async fn get_warehouse(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<Warehouse>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let tenant_id = get_tenant_id(&claims, &headers);
    let cache_key = warehouse_cache_key(tenant_id, id);

    if let Some(cached) = state.warehouse_cache.get(&cache_key) {
        tracing::debug!("📋 仓库缓存命中: {}", cache_key);
        if let Ok(warehouse) = serde_json::from_value::<Warehouse>(cached) {
            return Json(ApiResponse::success(warehouse, "获取仓库成功"));
        }
    }

    let result = sqlx::query_as::<_, Warehouse>(
        only_own_schema_query!("wms", r#"
        SELECT id, tenant_id, warehouse_name as name, warehouse_code as code, address, manager, contact_phone as phone, status, created_at, updated_at
        FROM wms.warehouses WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
        "#),
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(warehouse)) => {
            if let Ok(value) = serde_json::to_value(&warehouse) {
                state.warehouse_cache.set(cache_key, value);
            }
            Json(ApiResponse::success(warehouse, "获取仓库成功"))
        }
        Ok(None) => Json(api_error(404, "仓库不存在")),
        Err(e) => {
            tracing::error!("获取仓库失败: {}", e);
            Json(api_error(500, "获取仓库失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["wms:update"])),
    path = "/api/wms/warehouses/{id}",
    params(
        ("id" = Uuid, Path, description = "id")
    ),
    responses(
        (status = 200, description = "更新成功", body = Warehouse, content_type = "application/json"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误")
    ),
    tag = "WMS/warehouse"
)]
pub async fn update_warehouse(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    axum::extract::Json(req): axum::extract::Json<UpdateWarehouseRequest>,
) -> Json<ApiResponse<Warehouse>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let request_data = serde_json::to_value(&req).ok();
    let tenant_id = get_tenant_id(&claims, &headers);

    let existing = sqlx::query_as::<_, Warehouse>(
        only_own_schema_query!("wms", r#"
        SELECT id, tenant_id, warehouse_name as name, warehouse_code as code, address, manager, contact_phone as phone, status, created_at, updated_at
        FROM wms.warehouses WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
        "#),
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut **txn)
    .await;

    let existing = match existing {
        Ok(Some(w)) => w,
        Ok(None) => return Json(api_error(404, "仓库不存在")),
        Err(e) => return Json(api_error(500, &format!("查询仓库失败: {}", e))),
    };

    let name = req.name.unwrap_or(existing.name);
    let code = req.code.or(existing.code);
    let address = req.address.or(existing.address);
    let manager = req.manager.or(existing.manager);
    let phone = req.phone.or(existing.phone);
    let status = req.status.unwrap_or(existing.status);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Warehouse>(
        only_own_schema_query!("wms", r#"
        UPDATE wms.warehouses SET
            warehouse_name = $2, warehouse_code = $3, address = $4, manager = $5, contact_phone = $6, status = $7, updated_at = $8
        WHERE id = $1 AND tenant_id = $9 AND deleted_at IS NULL
        RETURNING id, tenant_id, warehouse_name as name, warehouse_code as code, address, manager, contact_phone as phone, status, created_at, updated_at
        "#),
    )
    .bind(id)
    .bind(&name)
    .bind(&code)
    .bind(&address)
    .bind(&manager)
    .bind(&phone)
    .bind(&status)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(warehouse) => (
            Json(ApiResponse::success(warehouse.clone(), "仓库更新成功")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("更新仓库失败: {}", e);
            (
                Json(api_error(500, "仓库更新失败")),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(warehouse) = &result {
        serde_json::to_value(warehouse).ok()
    } else {
        None
    };

    if status_str == "success" {
        let cache_key = warehouse_cache_key(tenant_id, id);
        state.warehouse_cache.remove(&cache_key);
        state.warehouse_cache.clear();
        tracing::debug!("🗑️ 仓库缓存已失效: {}", cache_key);
    }

    log_audit_event(
        &state.db,
        "update".to_string(),
        "warehouse".to_string(),
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
    security(("BearerAuth" = ["wms:delete"])),
    path = "/api/wms/warehouses/{id}",
    params(
        ("id" = Uuid, Path, description = "id")
    ),
    responses(
        (status = 200, description = "删除成功"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误")
    ),
    tag = "WMS/warehouse"
)]
pub async fn delete_warehouse(
    axum::extract::State(state): axum::extract::State<ApiState>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<String>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query(
        only_own_schema_query!("wms", r#"UPDATE wms.warehouses SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL"#),
    )
    .bind(id)
    .bind(tenant_id)
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
                Json(ApiResponse::success("".to_string(), "仓库删除成功")),
                "success",
                None,
            )
        }
        Ok(_) => (
            Json(api_error(404, "仓库不存在")),
            "error",
            Some("仓库不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除仓库失败: {}", e);
            (
                Json(api_error(500, "仓库删除失败")),
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

    if status_str == "success" {
        let cache_key = warehouse_cache_key(tenant_id, id);
        state.warehouse_cache.remove(&cache_key);
        state.warehouse_cache.clear();
        tracing::debug!("🗑️ 仓库缓存已失效: {}", cache_key);
    }

    log_audit_event(
        &state.db,
        "delete".to_string(),
        "warehouse".to_string(),
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_warehouse_cache_key() {
        let tenant_id = Uuid::nil();
        let id = Uuid::nil();
        let key = warehouse_cache_key(tenant_id, id);
        assert_eq!(key, format!("warehouse:{}:{}", tenant_id, id));
        assert!(key.starts_with("warehouse:"));
    }

    #[test]
    fn test_warehouse_cache_key_different_ids() {
        let tenant_id = Uuid::nil();
        let id1 = Uuid::parse_str("11111111-1111-1111-1111-111111111111").unwrap();
        let id2 = Uuid::parse_str("22222222-2222-2222-2222-222222222222").unwrap();
        let key1 = warehouse_cache_key(tenant_id, id1);
        let key2 = warehouse_cache_key(tenant_id, id2);
        assert_ne!(key1, key2);
    }

    #[test]
    fn test_warehouse_list_cache_key() {
        let tenant_id = Uuid::nil();
        let key = warehouse_list_cache_key(
            tenant_id,
            1,
            20,
            &Some("test".to_string()),
            &Some("active".to_string()),
        );
        assert!(key.starts_with("warehouses:"));
        assert!(key.contains("page:1"));
        assert!(key.contains("size:20"));
        assert!(key.contains("search:"));
        assert!(key.contains("status:"));
    }

    #[test]
    fn test_warehouse_list_cache_key_default() {
        let tenant_id = Uuid::nil();
        let key = warehouse_list_cache_key(tenant_id, 1, 10, &None, &None);
        assert!(key.starts_with("warehouses:"));
        assert!(key.contains("page:1"));
        assert!(key.contains("size:10"));
    }

    #[test]
    fn test_warehouse_list_cache_key_different_pages() {
        let tenant_id = Uuid::nil();
        let key1 = warehouse_list_cache_key(tenant_id, 1, 10, &None, &None);
        let key2 = warehouse_list_cache_key(tenant_id, 2, 10, &None, &None);
        assert_ne!(key1, key2);
    }
}
