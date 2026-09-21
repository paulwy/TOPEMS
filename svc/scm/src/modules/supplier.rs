// ═══════════════════════════════════════════════════════════
// ⚠️ DEPRECATED: 此模块为 SRM 主数据的本地缓存副本
// 供应商主数据管理（创建/审批/评估）应通过 SRM 服务进行
// SCM 仅保留只读引用用于采购执行链路
// ═══════════════════════════════════════════════════════════

use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::get,
    Json, Router,
};
use chrono::Utc;
use serde_json;
use std::sync::Arc;
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use super::ApiState;
use crate::models::supplier::{CreateSupplierRequest, Supplier, UpdateSupplierRequest};
use crate::modules::audit::log_audit_event;
use crate::services::mdm_event_service::MdmEventService;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::{auth::Claims, ApiResponse};
use topems_shared_core::cache::{record_cache_hit, record_cache_miss};
use topems_shared_core::locale::Locale;
use topems_shared_core::response::api_error;
use topems_shared_core::response::PaginationParams;
use topems_shared_event::event::{MasterDataAction, SupplierDataSyncRequestedPayload};
use topems_shared_event::redis::{CacheService, RedisCacheService};

/// 供应商缓存 TTL: 5分钟
const CACHE_TTL_SECONDS: u64 = 300;

/// 供应商缓存 key 前缀 - 使用统一命名规范: {service}:{entity}
const CACHE_PREFIX_SUPPLIER: &str = "scm:supplier";
/// 供应商列表缓存 key 前缀
const CACHE_PREFIX_SUPPLIERS_LIST: &str = "scm:suppliers:list";

/// 构建供应商缓存 key（locale 用于语言隔离，None 用于失效删除时的无语言 key）
fn supplier_cache_key(tenant_id: &str, id: &Uuid, locale: Option<&str>) -> String {
    match locale {
        Some(l) => format!("{}:{}:get:{}:{}", CACHE_PREFIX_SUPPLIER, tenant_id, id, l),
        None => format!("{}:{}:get:{}", CACHE_PREFIX_SUPPLIER, tenant_id, id),
    }
}

/// 构建供应商列表缓存 key（locale 用于语言隔离）
fn suppliers_list_cache_key(
    tenant_id: &str,
    page: i64,
    page_size: i64,
    search: &Option<String>,
    status: &Option<String>,
    locale: Option<&str>,
) -> String {
    let search_pattern = search.clone().map(|s| format!("%{}%", s));
    match locale {
        Some(l) => format!(
            "{}:{}:page:{}:size:{}:search:{:?}:status:{:?}:{}",
            CACHE_PREFIX_SUPPLIERS_LIST, tenant_id, page, page_size, search_pattern, status, l
        ),
        None => format!(
            "{}:{}:page:{}:size:{}:search:{:?}:status:{:?}",
            CACHE_PREFIX_SUPPLIERS_LIST, tenant_id, page, page_size, search_pattern, status
        ),
    }
}

fn publish_supplier_sync_event(
    event_publisher: &Option<Arc<topems_shared_event::event::EventPublisher>>,
    supplier_id: Uuid,
    supplier_name: String,
    short_name: Option<String>,
    contact_name: Option<String>,
    contact_phone: Option<String>,
    email: Option<String>,
    address: Option<String>,
    tax_number: Option<String>,
    bank_account: Option<String>,
    status: String,
    tenant_id: Option<Uuid>,
) {
    let publisher = match event_publisher {
        Some(p) => p.clone(),
        None => return,
    };

    let now = Utc::now();

    let payload = SupplierDataSyncRequestedPayload {
        supplier_id,
        supplier_name,
        short_name,
        contact_name,
        contact_phone,
        email,
        address,
        tax_number,
        bank_account,
        status,
        sync_direction: "scm_to_srm".to_string(),
        requested_at: now,
        requested_by: None,
        tenant_id,
    };

    tokio::spawn(async move {
        if let Err(e) = publisher
            .publish_supplier_data_sync_requested(payload)
            .await
        {
            tracing::warn!(
                "[scm] SupplierDataSyncRequested(scm_to_srm) 事件发布失败（graceful fallback）: {}",
                e
            );
        }
    });
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["scm:supplier:read"])),
    path = "/scm/suppliers",
    responses(
        (status = 200, description = "list_suppliers OK")
    ),
    tag = "SCM/supplier"
)]
pub async fn list_suppliers(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::SupplierRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    // 从 claims 中获取 tenant_id，用于多租户缓存隔离
    let tenant_id = claims
        .tenant_id
        .clone()
        .unwrap_or_else(|| "default".to_string());
    let cache_key = suppliers_list_cache_key(
        &tenant_id,
        page,
        page_size,
        &params.search,
        &params.status,
        Some(Locale::from_headers(&headers).as_sql()),
    );

    if let Some(cached) = state.supplier_cache.get(&cache_key).await {
        record_cache_hit("scm", "supplier", "list");
        tracing::debug!("📋 内存缓存命中: {}", cache_key);
        return Json(ApiResponse::success(cached, "获取供应商列表成功"));
    }

    // 缓存未命中，记录指标
    record_cache_miss("scm", "supplier", "list");

    if let Some(cache) = &state.cache {
        if let Ok(Some(cached)) = cache.get(&cache_key).await {
            tracing::debug!("📋 Redis缓存命中: {}", cache_key);
            if let Ok(data) = serde_json::from_str::<serde_json::Value>(&cached) {
                state
                    .supplier_cache
                    .set(cache_key.clone(), data.clone())
                    .await;
                return Json(ApiResponse::success(data, "获取供应商列表成功"));
            }
        }
    }

    let result = sqlx::query_as::<_, Supplier>(
        only_own_schema_query!("scm", r#"
        SELECT id, CASE WHEN $5 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, legal_name AS short_name, contact_person AS contact_name, phone AS contact_phone, email, address, bank_account, tax_id AS tax_number, status, created_at, updated_at
        FROM scm.suppliers
        WHERE ($1::text IS NULL OR name ILIKE $1 OR contact_person ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#),
    )
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .bind(Locale::from_headers(&headers).as_sql())
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(suppliers) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                only_own_schema_query!("scm", r#"
                SELECT COUNT(*) FROM scm.suppliers
                WHERE deleted_at IS NULL AND ($1::text IS NULL OR name ILIKE $1 OR contact_person ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                "#),
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&mut **txn)
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
                .set(cache_key.clone(), response_data.clone())
                .await;

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

#[utoipa::path(
    post,
    security(("BearerAuth" = ["scm:supplier:write"])),
    path = "/scm/suppliers",
    request_body = CreateSupplierRequest,
    responses(
        (status = 200, description = "create_supplier OK")
    ),
    tag = "SCM/supplier"
)]
pub async fn create_supplier(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CreateSupplierRequest>,
) -> Json<ApiResponse<Supplier>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::SupplierWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, Supplier>(
        only_own_schema_query!("scm", r#"
        INSERT INTO scm.suppliers (id, name, legal_name, contact_person, phone, email, address, bank_account, tax_id, status, created_at, updated_at, name_en)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', $10, $11, $12)
        RETURNING id, CASE WHEN $13 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, legal_name AS short_name, contact_person AS contact_name, phone AS contact_phone, email, address, bank_account, tax_id AS tax_number, status, created_at, updated_at
        "#),
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
    .bind(&req.name_en)
    .bind(Locale::from_headers(&headers).as_sql())
    .fetch_one(&mut **txn)
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
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("事务提交失败: {}", e);
                return Json(ApiResponse::error(500, "事务提交失败"));
            }
        }
        state.supplier_cache.clear_l1();
        tracing::debug!("🗑️ 供应商内存缓存已清空（创建供应商）");

        // 发布缓存失效事件，通知其他服务失效相关缓存
        if let Some(ref publisher) = state.event_publisher {
            let publisher = publisher.clone();
            tokio::spawn(async move {
                if let Err(e) = publisher
                    .publish_cache_invalidated(
                        "scm:supplier:*",
                        "pattern",
                        Some("supplier_created"),
                    )
                    .await
                {
                    tracing::warn!("发布缓存失效事件失败: {}", e);
                }
            });
        }
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

    if let Ok(supplier) = &result {
        let tid = claims
            .tenant_id
            .as_ref()
            .and_then(|t| Uuid::parse_str(t).ok());
        publish_supplier_sync_event(
            &state.event_publisher,
            supplier.id,
            supplier.name.clone(),
            supplier.short_name.clone(),
            supplier.contact_name.clone(),
            supplier.contact_phone.clone(),
            supplier.email.clone(),
            supplier.address.clone(),
            supplier.tax_number.clone(),
            supplier.bank_account.clone(),
            supplier.status.clone(),
            tid,
        );
    }

    response
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["scm:supplier:read"])),
    path = "/scm/suppliers/{id}",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "get_supplier OK")
    ),
    tag = "SCM/supplier"
)]
pub async fn get_supplier(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<Supplier>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::SupplierRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    // 从 claims 中获取 tenant_id，用于多租户缓存隔离
    let tenant_id = claims
        .tenant_id
        .clone()
        .unwrap_or_else(|| "default".to_string());
    let cache_key = supplier_cache_key(&tenant_id, &id, Some(Locale::from_headers(&headers).as_sql()));

    if let Some(cached) = state.supplier_cache.get(&cache_key).await {
        record_cache_hit("scm", "supplier", "get");
        tracing::debug!("📋 内存缓存命中: {}", cache_key);
        if let Ok(supplier) = serde_json::from_value::<Supplier>(cached) {
            return Json(ApiResponse::success(supplier, "获取供应商成功"));
        }
    }

    // 缓存未命中，记录指标
    record_cache_miss("scm", "supplier", "get");

    if let Some(cache) = &state.cache {
        if let Ok(Some(cached)) = cache.get(&cache_key).await {
            tracing::debug!("📋 Redis缓存命中: {}", cache_key);
            if let Ok(supplier) = serde_json::from_str::<Supplier>(&cached) {
                if let Ok(value) = serde_json::to_value(&supplier) {
                    state.supplier_cache.set(cache_key.clone(), value).await;
                }
                return Json(ApiResponse::success(supplier, "获取供应商成功"));
            }
        }
    }

    let result = sqlx::query_as::<_, Supplier>(
        only_own_schema_query!("scm", r#"
        SELECT id, CASE WHEN $2 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, legal_name AS short_name, contact_person AS contact_name, phone AS contact_phone, email, address, bank_account, tax_id AS tax_number, status, created_at, updated_at
        FROM scm.suppliers WHERE id = $1
        "#),
    )
    .bind(id)
    .bind(Locale::from_headers(&headers).as_sql())
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(supplier)) => {
            if let Ok(value) = serde_json::to_value(&supplier) {
                state.supplier_cache.set(cache_key.clone(), value).await;
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

#[utoipa::path(
    put,
    security(("BearerAuth" = ["scm:supplier:write"])),
    path = "/scm/suppliers/{id}",
    request_body = UpdateSupplierRequest,
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "update_supplier OK")
    ),
    tag = "SCM/supplier"
)]
pub async fn update_supplier(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<UpdateSupplierRequest>,
) -> Json<ApiResponse<Supplier>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::SupplierWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();

    let existing = sqlx::query_as::<_, Supplier>(
        only_own_schema_query!("scm", "SELECT id, name, legal_name AS short_name, contact_person AS contact_name, phone AS contact_phone, email, address, bank_account, tax_id AS tax_number, status, created_at, updated_at FROM scm.suppliers WHERE deleted_at IS NULL AND id = $1"),
    )
    .bind(id)
    .fetch_optional(&mut **txn)
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
        only_own_schema_query!("scm", r#"
        UPDATE scm.suppliers SET
            name = $2, legal_name = $3, contact_person = $4, phone = $5, email = $6, address = $7, bank_account = $8, tax_id = $9, status = $10, updated_at = $11, name_en = COALESCE($12, name_en)
        WHERE id = $1
        RETURNING id, CASE WHEN $13 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, legal_name AS short_name, contact_person AS contact_name, phone AS contact_phone, email, address, bank_account, tax_id AS tax_number, status, created_at, updated_at
        "#),
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
    .bind(&req.name_en)
    .bind(Locale::from_headers(&headers).as_sql())
    .fetch_one(&mut **txn)
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
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("事务提交失败: {}", e);
                return Json(ApiResponse::error(500, "事务提交失败"));
            }
        }
        // 从 claims 中获取 tenant_id，用于多租户缓存隔离
        let tenant_id = claims
            .tenant_id
            .clone()
            .unwrap_or_else(|| "default".to_string());
        let cache_key = supplier_cache_key(&tenant_id, &id, None);
        state.supplier_cache.remove(&cache_key).await;
        state.supplier_cache.clear_l1();
        tracing::debug!("🗑️ 供应商内存缓存已失效: {}", cache_key);

        // 发布缓存失效事件，通知其他服务失效相关缓存
        if let Some(ref publisher) = state.event_publisher {
            let publisher = publisher.clone();
            tokio::spawn(async move {
                if let Err(e) = publisher
                    .publish_cache_invalidated(
                        "scm:supplier:*",
                        "pattern",
                        Some("supplier_updated"),
                    )
                    .await
                {
                    tracing::warn!("发布缓存失效事件失败: {}", e);
                }
            });
        }
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

    if let Ok(supplier) = &result {
        let tid = claims
            .tenant_id
            .as_ref()
            .and_then(|t| Uuid::parse_str(t).ok());
        publish_supplier_sync_event(
            &state.event_publisher,
            supplier.id,
            supplier.name.clone(),
            supplier.short_name.clone(),
            supplier.contact_name.clone(),
            supplier.contact_phone.clone(),
            supplier.email.clone(),
            supplier.address.clone(),
            supplier.tax_number.clone(),
            supplier.bank_account.clone(),
            supplier.status.clone(),
            tid,
        );
    }

    response
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["scm:supplier:admin"])),
    path = "/scm/suppliers/{id}",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "delete_supplier OK")
    ),
    tag = "SCM/supplier"
)]
pub async fn delete_supplier(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<String>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::SupplierWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let result = sqlx::query(only_own_schema_query!(
        "scm",
        "UPDATE scm.suppliers SET deleted_at = NOW() WHERE id = $1"
    ))
    .bind(id)
    .execute(&mut **txn)
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
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("事务提交失败: {}", e);
                return Json(ApiResponse::error(500, "事务提交失败"));
            }
        }
        // 从 claims 中获取 tenant_id，用于多租户缓存隔离
        let tenant_id = claims
            .tenant_id
            .clone()
            .unwrap_or_else(|| "default".to_string());
        let cache_key = supplier_cache_key(&tenant_id, &id, None);
        state.supplier_cache.remove(&cache_key).await;
        state.supplier_cache.clear_l1();
        tracing::debug!("🗑️ 供应商内存缓存已失效: {}", cache_key);

        // 发布缓存失效事件，通知其他服务失效相关缓存
        if let Some(ref publisher) = state.event_publisher {
            let publisher = publisher.clone();
            tokio::spawn(async move {
                if let Err(e) = publisher
                    .publish_cache_invalidated(
                        "scm:supplier:*",
                        "pattern",
                        Some("supplier_deleted"),
                    )
                    .await
                {
                    tracing::warn!("发布缓存失效事件失败: {}", e);
                }
            });
        }
    }

    let status_str_clone = status_str;
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
    if status_str_clone == "success" {
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

        let tid = claims
            .tenant_id
            .as_ref()
            .and_then(|t| Uuid::parse_str(t).ok());
        publish_supplier_sync_event(
            &state.event_publisher,
            id,
            "".to_string(),
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            "deleted".to_string(),
            tid,
        );
    }

    response
}

pub async fn clear_supplier_redis_caches(cache: &Option<Arc<RedisCacheService>>) {
    if let Some(cache) = cache {
        let _ = cache.delete(&format!("{}:*", CACHE_PREFIX_SUPPLIER)).await;
        let _ = cache
            .delete(&format!("{}:*", CACHE_PREFIX_SUPPLIERS_LIST))
            .await;
        tracing::debug!("🗑️ 供应商Redis缓存已清除");
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;

    #[test]
    fn supplier_cache_key_includes_id_with_prefix() {
        let id = Uuid::new_v4();
        let tenant_id = "test-tenant";
        let key = supplier_cache_key(tenant_id, &id, None);
        assert!(
            key.starts_with("scm:supplier:"),
            "key should start with prefix, got {}",
            key
        );
        assert!(
            key.contains(&id.to_string()),
            "key should contain the uuid, got {}",
            key
        );
        assert!(
            key.contains(tenant_id),
            "key should contain tenant_id, got {}",
            key
        );
    }

    #[test]
    fn supplier_cache_key_format_is_deterministic() {
        let id = Uuid::nil();
        let tenant_id = "test-tenant";
        let key = supplier_cache_key(tenant_id, &id, None);
        assert_eq!(key, format!("scm:supplier:{}:get:{}", tenant_id, id));
    }

    #[test]
    fn supplier_cache_key_is_isolated_by_tenant() {
        let id = Uuid::new_v4();
        let key1 = supplier_cache_key("tenant-a", &id, None);
        let key2 = supplier_cache_key("tenant-b", &id, None);
        assert_ne!(
            key1, key2,
            "different tenants should have different cache keys"
        );
    }

    #[test]
    fn suppliers_list_cache_key_includes_pagination_params() {
        let tenant_id = "test-tenant";
        let key = suppliers_list_cache_key(tenant_id, 2, 20, &None, &None, None);
        assert!(
            key.contains("page:2"),
            "key should contain page, got {}",
            key
        );
        assert!(
            key.contains("size:20"),
            "key should contain size, got {}",
            key
        );
        assert!(
            key.starts_with("scm:suppliers:list:"),
            "key should start with prefix, got {}",
            key
        );
        assert!(
            key.contains(tenant_id),
            "key should contain tenant_id, got {}",
            key
        );
    }

    #[test]
    fn suppliers_list_cache_key_includes_search_pattern() {
        let search = Some("acme".to_string());
        let key = suppliers_list_cache_key("test-tenant", 1, 10, &search, &None, None);
        assert!(
            key.contains("search:Some(\"%acme%\")"),
            "key should contain search pattern, got {}",
            key
        );
    }

    #[test]
    fn suppliers_list_cache_key_includes_status_filter() {
        let status = Some("active".to_string());
        let key = suppliers_list_cache_key("test-tenant", 1, 10, &None, &status, None);
        assert!(
            key.contains("status:Some(\"active\")"),
            "key should contain status, got {}",
            key
        );
    }

    #[test]
    fn suppliers_list_cache_key_distinct_for_different_params() {
        let k1 = suppliers_list_cache_key("test-tenant", 1, 10, &None, &None, None);
        let k2 = suppliers_list_cache_key("test-tenant", 2, 10, &None, &None, None);
        assert_ne!(k1, k2);
    }

    #[test]
    fn suppliers_list_cache_key_is_isolated_by_tenant() {
        let k1 = suppliers_list_cache_key("tenant-a", 1, 10, &None, &None, None);
        let k2 = suppliers_list_cache_key("tenant-b", 1, 10, &None, &None, None);
        assert_ne!(k1, k2, "different tenants should have different cache keys");
    }

    #[test]
    fn suppliers_list_cache_key_search_none_renders_none() {
        let key = suppliers_list_cache_key("test-tenant", 1, 10, &None, &None, None);
        assert!(
            key.contains("search:None"),
            "key should contain search:None, got {}",
            key
        );
    }

    #[test]
    fn cache_prefix_constants_are_stable() {
        assert_eq!(CACHE_PREFIX_SUPPLIER, "scm:supplier");
        assert_eq!(CACHE_PREFIX_SUPPLIERS_LIST, "scm:suppliers:list");
    }

    #[test]
    fn cache_ttl_is_five_minutes() {
        assert_eq!(CACHE_TTL_SECONDS, 300);
    }
}
