use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::get,
    Json, Router,
};
use chrono::Utc;
use serde_json;
use std::sync::Arc;
use uuid::Uuid;

use super::ApiState;
use crate::models::{CreateSupplierRequest, Supplier, UpdateSupplierRequest};
use crate::modules::audit::log_audit_event;
use crate::services::mdm_event_service::MdmEventService;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::event::MasterDataAction;
use topems_shared::{
    api_error,
    auth::Claims,
    redis::{CacheService, RedisCacheService},
    ApiResponse, PaginationParams,
};

/// 供应商缓存 TTL: 5分钟
const CACHE_TTL_SECONDS: u64 = 300;

/// 供应商缓存 key 前缀 - 使用统一命名规范: {service}:{entity}
const CACHE_PREFIX_SUPPLIER: &str = "scm:supplier";
/// 供应商列表缓存 key 前缀
const CACHE_PREFIX_SUPPLIERS_LIST: &str = "scm:suppliers:list";

/// 构建供应商缓存 key
fn supplier_cache_key(id: &Uuid) -> String {
    format!("{}:{}", CACHE_PREFIX_SUPPLIER, id)
}

/// 构建供应商列表缓存 key
fn suppliers_list_cache_key(
    page: i64,
    page_size: i64,
    search: &Option<String>,
    status: &Option<String>,
) -> String {
    let search_pattern = search.clone().map(|s| format!("%{}%", s));
    format!(
        "{}:page:{}:size:{}:search:{:?}:status:{:?}",
        CACHE_PREFIX_SUPPLIERS_LIST, page, page_size, search_pattern, status
    )
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/suppliers", get(list_suppliers).post(create_supplier))
        .route(
            "/suppliers/{id}",
            get(get_supplier)
                .put(update_supplier)
                .delete(delete_supplier),
        )
}

pub async fn list_suppliers(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let cache_key = suppliers_list_cache_key(page, page_size, &params.search, &params.status);

    if let Some(cached) = state.supplier_cache.get(&cache_key) {
        tracing::debug!("📋 内存缓存命中: {}", cache_key);
        return Json(ApiResponse::success(cached, "获取供应商列表成功"));
    }

    if let Some(cache) = &state.cache {
        if let Ok(Some(cached)) = cache.get(&cache_key).await {
            tracing::debug!("📋 Redis缓存命中: {}", cache_key);
            if let Ok(data) = serde_json::from_str::<serde_json::Value>(&cached) {
                state.supplier_cache.set(cache_key.clone(), data.clone());
                return Json(ApiResponse::success(data, "获取供应商列表成功"));
            }
        }
    }

    let result = sqlx::query_as::<_, Supplier>(
        r#"
        SELECT id, name, short_name, contact_name, contact_phone, email, address, bank_account, tax_number, status, created_at, updated_at
        FROM scm.suppliers
        WHERE ($1::text IS NULL OR name ILIKE $1 OR contact_name ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(suppliers) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM scm.suppliers
                WHERE ($1::text IS NULL OR name ILIKE $1 OR contact_name ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            let response_data = serde_json::json!({
                "suppliers": suppliers,
                "total": total,
                "page": page,
                "page_size": page_size
            });

            state
                .supplier_cache
                .set(cache_key.clone(), response_data.clone());

            if let Some(cache) = &state.cache {
                if let Ok(serialized) = serde_json::to_string(&response_data) {
                    let _ = cache
                        .set(&cache_key, &serialized, Some(CACHE_TTL_SECONDS))
                        .await;
                }
            }

            Json(ApiResponse::success(response_data, "获取供应商列表成功"))
        }
        Err(e) => {
            tracing::error!("获取供应商列表失败: {}", e);
            Json(api_error(500, "获取供应商列表失败"))
        }
    }
}

pub async fn create_supplier(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateSupplierRequest>,
) -> Json<ApiResponse<Supplier>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, Supplier>(
        r#"
        INSERT INTO scm.suppliers (id, name, short_name, contact_name, contact_phone, email, address, bank_account, tax_number, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', $10, $11)
        RETURNING id, name, short_name, contact_name, contact_phone, email, address, bank_account, tax_number, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.short_name)
    .bind(&req.contact_name)
    .bind(&req.contact_phone)
    .bind(&req.email)
    .bind(&req.address)
    .bind(&req.bank_account)
    .bind(&req.tax_number)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status, error_msg) = match &result {
        Ok(supplier) => (
            Json(ApiResponse::success(supplier.clone(), "供应商创建成功")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("创建供应商失败: {}", e);
            (
                Json(api_error(500, "供应商创建失败")),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(supplier) = &result {
        serde_json::to_value(supplier).ok()
    } else {
        None
    };

    if status == "success" {
        state.supplier_cache.clear();
        tracing::debug!("🗑️ 供应商内存缓存已清空（创建供应商）");
    }

    let redis_cache = state.cache.clone();
    tokio::spawn(async move {
        clear_supplier_redis_caches(&redis_cache).await;
    });

    log_audit_event(
        &state.db,
        "create".to_string(),
        "supplier".to_string(),
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

    // 发布 MDM 主数据事件
    if let Ok(supplier) = &result {
        let mdm_service = MdmEventService::new();
        let sid = supplier.id;
        let sname = supplier.name.clone();
        let scontact_name = supplier.contact_name.clone();
        let scontact_phone = supplier.contact_phone.clone();
        let semail = supplier.email.clone();
        let sstatus = supplier.status.clone();
        tokio::spawn(async move {
            mdm_service
                .publish_supplier_event(
                    sid,
                    "",
                    &sname,
                    scontact_name.as_deref(),
                    scontact_phone.as_deref(),
                    semail.as_deref(),
                    &sstatus,
                    MasterDataAction::Created,
                    None,
                )
                .await;
        });
    }

    response
}

pub async fn get_supplier(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Supplier>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let cache_key = supplier_cache_key(&id);

    if let Some(cached) = state.supplier_cache.get(&cache_key) {
        tracing::debug!("📋 内存缓存命中: {}", cache_key);
        if let Ok(supplier) = serde_json::from_value::<Supplier>(cached) {
            return Json(ApiResponse::success(supplier, "获取供应商成功"));
        }
    }

    if let Some(cache) = &state.cache {
        if let Ok(Some(cached)) = cache.get(&cache_key).await {
            tracing::debug!("📋 Redis缓存命中: {}", cache_key);
            if let Ok(supplier) = serde_json::from_str::<Supplier>(&cached) {
                if let Ok(value) = serde_json::to_value(&supplier) {
                    state.supplier_cache.set(cache_key.clone(), value);
                }
                return Json(ApiResponse::success(supplier, "获取供应商成功"));
            }
        }
    }

    let result = sqlx::query_as::<_, Supplier>(
        r#"
        SELECT id, name, short_name, contact_name, contact_phone, email, address, bank_account, tax_number, status, created_at, updated_at
        FROM scm.suppliers WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(supplier)) => {
            if let Ok(value) = serde_json::to_value(&supplier) {
                state.supplier_cache.set(cache_key.clone(), value);
            }
            if let Some(cache) = &state.cache {
                if let Ok(serialized) = serde_json::to_string(&supplier) {
                    let _ = cache
                        .set(&cache_key, &serialized, Some(CACHE_TTL_SECONDS))
                        .await;
                }
            }
            Json(ApiResponse::success(supplier, "获取供应商成功"))
        }
        Ok(None) => Json(api_error(404, "供应商不存在")),
        Err(e) => {
            tracing::error!("获取供应商失败: {}", e);
            Json(api_error(500, "获取供应商失败"))
        }
    }
}

pub async fn update_supplier(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateSupplierRequest>,
) -> Json<ApiResponse<Supplier>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();

    let existing = sqlx::query_as::<_, Supplier>(
        "SELECT id, name, short_name, contact_name, contact_phone, email, address, bank_account, tax_number, status, created_at, updated_at FROM scm.suppliers WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(s)) => s,
        Ok(None) => return Json(api_error(404, "供应商不存在")),
        Err(e) => return Json(api_error(500, &format!("查询供应商失败: {}", e))),
    };

    let name = req.name.unwrap_or(existing.name);
    let short_name = req.short_name.or(existing.short_name);
    let contact_name = req.contact_name.or(existing.contact_name);
    let contact_phone = req.contact_phone.or(existing.contact_phone);
    let email = req.email.or(existing.email);
    let address = req.address.or(existing.address);
    let bank_account = req.bank_account.or(existing.bank_account);
    let tax_number = req.tax_number.or(existing.tax_number);
    let status = req.status.unwrap_or(existing.status);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Supplier>(
        r#"
        UPDATE scm.suppliers SET
            name = $2, short_name = $3, contact_name = $4, contact_phone = $5, email = $6, address = $7, bank_account = $8, tax_number = $9, status = $10, updated_at = $11
        WHERE id = $1
        RETURNING id, name, short_name, contact_name, contact_phone, email, address, bank_account, tax_number, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&name)
    .bind(&short_name)
    .bind(&contact_name)
    .bind(&contact_phone)
    .bind(&email)
    .bind(&address)
    .bind(&bank_account)
    .bind(&tax_number)
    .bind(&status)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(supplier) => (
            Json(ApiResponse::success(supplier.clone(), "供应商更新成功")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("更新供应商失败: {}", e);
            (
                Json(api_error(500, "供应商更新失败")),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(supplier) = &result {
        serde_json::to_value(supplier).ok()
    } else {
        None
    };

    if status_str == "success" {
        let cache_key = supplier_cache_key(&id);
        state.supplier_cache.remove(&cache_key);
        state.supplier_cache.clear();
        tracing::debug!("🗑️ 供应商内存缓存已失效: {}", cache_key);
    }

    let redis_cache = state.cache.clone();
    tokio::spawn(async move {
        clear_supplier_redis_caches(&redis_cache).await;
    });

    log_audit_event(
        &state.db,
        "update".to_string(),
        "supplier".to_string(),
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

    // 发布 MDM 主数据事件
    if let Ok(supplier) = &result {
        let mdm_service = MdmEventService::new();
        let sid = supplier.id;
        let sname = supplier.name.clone();
        let scontact_name = supplier.contact_name.clone();
        let scontact_phone = supplier.contact_phone.clone();
        let semail = supplier.email.clone();
        let sstatus = supplier.status.clone();
        tokio::spawn(async move {
            mdm_service
                .publish_supplier_event(
                    sid,
                    "",
                    &sname,
                    scontact_name.as_deref(),
                    scontact_phone.as_deref(),
                    semail.as_deref(),
                    &sstatus,
                    MasterDataAction::Updated,
                    None,
                )
                .await;
        });
    }

    response
}

pub async fn delete_supplier(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let result = sqlx::query("DELETE FROM scm.suppliers WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "供应商删除成功")),
            "success",
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "供应商不存在")),
            "error",
            Some("供应商不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除供应商失败: {}", e);
            (
                Json(api_error(500, "供应商删除失败")),
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
        let cache_key = supplier_cache_key(&id);
        state.supplier_cache.remove(&cache_key);
        state.supplier_cache.clear();
        tracing::debug!("🗑️ 供应商内存缓存已失效: {}", cache_key);
    }

    let redis_cache = state.cache.clone();
    tokio::spawn(async move {
        clear_supplier_redis_caches(&redis_cache).await;
    });

    log_audit_event(
        &state.db,
        "delete".to_string(),
        "supplier".to_string(),
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

    // 发布 MDM 主数据事件
    if status_str == "success" {
        let mdm_service = MdmEventService::new();
        tokio::spawn(async move {
            mdm_service
                .publish_supplier_event(
                    id,
                    "",
                    "",
                    None,
                    None,
                    None,
                    "deleted",
                    MasterDataAction::Deleted,
                    None,
                )
                .await;
        });
    }

    response
}

async fn clear_supplier_redis_caches(cache: &Option<Arc<RedisCacheService>>) {
    if let Some(cache) = cache {
        let _ = cache.delete(&format!("{}:*", CACHE_PREFIX_SUPPLIER)).await;
        let _ = cache
            .delete(&format!("{}:*", CACHE_PREFIX_SUPPLIERS_LIST))
            .await;
        tracing::debug!("🗑️ 供应商Redis缓存已清除");
    }
}
