use anyhow::Result;
use axum::{
    extract::{Extension, Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use sqlx::postgres::PgPool;
use std::sync::Arc;
use uuid::Uuid;

use crate::models::{
    CreateSupplierRequest, Supplier, SupplierContract, SupplierPerformance, SupplierProduct,
    UpdateSupplierRequest,
};
use crate::shared::cache::InMemoryCache;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::event::{
    EventPublisher, EventType, SrmSupplierCreatedPayload, SrmSupplierRegisteredPayload,
    SrmSupplierStatusChangedPayload, SrmSupplierUpdatedPayload,
};
use topems_shared::service_client::{CreateInstanceRequest, WorkflowServiceClient};
use topems_shared::ApiResponse;

#[derive(Debug, Deserialize)]
pub struct ListQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub category: Option<String>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
}

pub struct AppState {
    pub db: PgPool,
    pub event_publisher: Option<Arc<EventPublisher>>,
    pub workflow_client: WorkflowServiceClient,
    pub supplier_cache: Arc<InMemoryCache<serde_json::Value>>,
}

pub async fn create_routes(
    db: PgPool,
    event_publisher: Option<Arc<EventPublisher>>,
    workflow_client: WorkflowServiceClient,
    supplier_cache: Arc<InMemoryCache<serde_json::Value>>,
) -> Result<Router> {
    let state = Arc::new(AppState {
        db,
        event_publisher,
        workflow_client,
        supplier_cache,
    });

    let app = Router::new()
        .route(
            "/api/srm/suppliers",
            get(list_suppliers).post(create_supplier),
        )
        .route(
            "/api/srm/suppliers/{id}",
            get(get_supplier)
                .put(update_supplier)
                .delete(delete_supplier),
        )
        .route(
            "/api/srm/suppliers/{id}/products",
            get(get_supplier_products),
        )
        .route(
            "/api/srm/suppliers/{id}/contracts",
            get(get_supplier_contracts),
        )
        .route(
            "/api/srm/suppliers/{id}/performance",
            get(get_supplier_performance),
        )
        .route(
            "/api/srm/suppliers/{id}/approval/start",
            post(start_supplier_approval),
        )
        .route(
            "/api/srm/suppliers/{id}/approval/approve",
            post(approve_supplier),
        )
        .route(
            "/api/srm/suppliers/{id}/approval/reject",
            post(reject_supplier),
        )
        .with_state(state);

    Ok(app)
}

fn get_tenant_id(claims: &Claims, headers: &axum::http::HeaderMap) -> Uuid {
    claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .or_else(|| {
            headers
                .get("x-tenant-id")
                .and_then(|v| v.to_str().ok())
                .and_then(|s| Uuid::parse_str(s).ok())
        })
        .unwrap_or_else(Uuid::new_v4)
}

fn supplier_cache_key(tenant_id: Uuid, id: Uuid) -> String {
    format!("srm:supplier:{}:{}", tenant_id, id)
}

fn suppliers_list_cache_key(
    tenant_id: Uuid,
    page: i64,
    page_size: i64,
    search: &Option<String>,
    status: &Option<String>,
    category: &Option<String>,
    sort_by: &str,
    sort_order: &str,
) -> String {
    format!(
        "srm:suppliers:{}:page:{}:size:{}:search:{:?}:status:{:?}:category:{:?}:sort:{}:order:{}",
        tenant_id, page, page_size, search, status, category, sort_by, sort_order
    )
}

// ==================== Supplier Handlers ====================

async fn list_suppliers(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ListQueryParams>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let sort_by = params
        .sort_by
        .clone()
        .unwrap_or_else(|| "created_at".to_string());
    let sort_order = params
        .sort_order
        .clone()
        .unwrap_or_else(|| "DESC".to_string());

    let cache_key = suppliers_list_cache_key(
        tenant_id,
        page,
        page_size,
        &params.search,
        &params.status,
        &params.category,
        &sort_by,
        &sort_order,
    );

    if let Some(cached) = state.supplier_cache.get(&cache_key) {
        tracing::debug!("📋 供应商列表缓存命中: {}", cache_key);
        return Json(ApiResponse::success(cached, "获取供应商列表成功"));
    }

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();
    let category_filter = params.category.clone();

    let order_clause = if sort_order == "ASC" { "ASC" } else { "DESC" };

    let sort_field = match sort_by.as_str() {
        "name" => "name",
        "supplier_no" => "supplier_no",
        "status" => "status",
        "category" => "category",
        "created_at" => "created_at",
        "updated_at" => "updated_at",
        _ => "created_at",
    };

    let query = format!(
        r#"
        SELECT id, tenant_id, supplier_no, name, legal_name, category, status, tax_id, address, contact_person, phone, email, website, credit_rating, risk_level, created_by, created_at, updated_at
        FROM plugin_srm.suppliers
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR name ILIKE $2 OR supplier_no ILIKE $2)
          AND ($3::text IS NULL OR status = $3)
          AND ($4::text IS NULL OR category = $4)
        ORDER BY {} {}
        LIMIT $5 OFFSET $6
        "#,
        sort_field, order_clause
    );

    let result = sqlx::query_as::<_, Supplier>(&query)
        .bind(tenant_id)
        .bind(&search_pattern)
        .bind(&status_filter)
        .bind(&category_filter)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.db)
        .await;

    match result {
        Ok(suppliers) => {
            let count_query = format!(
                r#"
                SELECT COUNT(*) FROM plugin_srm.suppliers
                WHERE tenant_id = $1
                  AND ($2::text IS NULL OR name ILIKE $2 OR supplier_no ILIKE $2)
                  AND ($3::text IS NULL OR status = $3)
                  AND ($4::text IS NULL OR category = $4)
                "#,
            );

            let count_result = sqlx::query_scalar::<_, i64>(&count_query)
                .bind(tenant_id)
                .bind(&search_pattern)
                .bind(&status_filter)
                .bind(&category_filter)
                .fetch_one(&state.db)
                .await;

            let total = count_result.unwrap_or(0);

            let response_data = serde_json::json!({
                "suppliers": suppliers,
                "total": total,
                "page": page,
                "page_size": page_size
            });

            state.supplier_cache.set(cache_key, response_data.clone());

            Json(ApiResponse::success(response_data, "获取供应商列表成功"))
        }
        Err(e) => {
            tracing::error!("获取供应商列表失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(
                500,
                "获取供应商列表失败",
            ))
        }
    }
}

async fn create_supplier(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateSupplierRequest>,
) -> Json<ApiResponse<Supplier>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    if req.supplier_no.is_empty() || req.name.is_empty() {
        return Json(ApiResponse::<Supplier>::error(
            400,
            "供应商编号和名称不能为空",
        ));
    }

    let existing = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM plugin_srm.suppliers WHERE tenant_id = $1 AND supplier_no = $2",
    )
    .bind(tenant_id)
    .bind(&req.supplier_no)
    .fetch_one(&state.db)
    .await;

    if existing.unwrap_or(0) > 0 {
        return Json(ApiResponse::<Supplier>::error(400, "供应商编号已存在"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();
    let user_id = Uuid::parse_str(&claims.sub).ok();

    let result = sqlx::query_as::<_, Supplier>(
        r#"
        INSERT INTO plugin_srm.suppliers (id, tenant_id, supplier_no, name, legal_name, category, status, tax_id, address, contact_person, phone, email, website, credit_rating, risk_level, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING id, tenant_id, supplier_no, name, legal_name, category, status, tax_id, address, contact_person, phone, email, website, credit_rating, risk_level, created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .bind(&req.supplier_no)
    .bind(&req.name)
    .bind(&req.legal_name)
    .bind(&req.category)
    .bind(&req.status)
    .bind(&req.tax_id)
    .bind(&req.address)
    .bind(&req.contact_person)
    .bind(&req.phone)
    .bind(&req.email)
    .bind(&req.website)
    .bind(&req.credit_rating)
    .bind(&req.risk_level)
    .bind(user_id)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(supplier) => {
            state.supplier_cache.clear();
            tracing::debug!("🗑️ 供应商缓存已清空（创建供应商）");

            record_audit_log(
                &state.db,
                "suppliers",
                id,
                "create",
                None,
                Some(serde_json::to_value(&supplier).ok()),
                user_id,
                tenant_id,
            )
            .await;

            if let Some(ref publisher) = state.event_publisher {
                let publisher = publisher.clone();
                let supplier_id = id;
                let supplier_no = supplier.supplier_no.clone();
                let supplier_name = supplier.name.clone();
                let category = Some(supplier.category.clone());
                let status = supplier.status.clone();
                let contact_person = supplier.contact_person.clone();
                let contact_email = supplier.email.clone();
                let registered_by = user_id.map(|u| u.to_string());
                let registered_at = Some(now);
                let created_by = user_id;
                let created_at = Some(now);
                let tenant_id_evt = tenant_id;
                tokio::spawn(async move {
                    let registered_payload = SrmSupplierRegisteredPayload {
                        supplier_id,
                        supplier_name: supplier_name.clone(),
                        contact_person: contact_person.clone(),
                        contact_email: contact_email.clone(),
                        registered_by,
                        registered_at,
                    };
                    if let Err(e) = publisher
                        .publish_event(EventType::SrmSupplierRegistered, registered_payload)
                        .await
                    {
                        tracing::warn!(
                            "[srm] SrmSupplierRegistered 事件发布失败（graceful fallback）: {}",
                            e
                        );
                    } else {
                        tracing::info!(
                            "[srm] SrmSupplierRegistered 事件发布成功 - supplier_id={}",
                            supplier_id
                        );
                    }

                    // P3 事件驱动规范化：发布供应商主数据创建事件，通知 SCM/Finance 同步供应商主数据
                    let created_payload = SrmSupplierCreatedPayload {
                        supplier_id,
                        supplier_no,
                        supplier_name,
                        category,
                        status,
                        contact_person,
                        contact_email,
                        tenant_id: Some(tenant_id_evt),
                        created_by,
                        created_at,
                    };
                    if let Err(e) = publisher
                        .publish_event(EventType::SrmSupplierCreated, created_payload)
                        .await
                    {
                        tracing::warn!(
                            "[srm] SrmSupplierCreated 事件发布失败（graceful fallback）: {}",
                            e
                        );
                    } else {
                        tracing::info!(
                            "[srm] SrmSupplierCreated 事件发布成功 - supplier_id={}",
                            supplier_id
                        );
                    }
                });
            }

            Json(ApiResponse::success(supplier, "供应商创建成功"))
        }
        Err(e) => {
            tracing::error!("创建供应商失败: {}", e);
            Json(ApiResponse::<Supplier>::error(500, "供应商创建失败"))
        }
    }
}

async fn get_supplier(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<Supplier>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);
    let cache_key = supplier_cache_key(tenant_id, id);

    if let Some(cached) = state.supplier_cache.get(&cache_key) {
        tracing::debug!("📋 供应商缓存命中: {}", cache_key);
        if let Ok(supplier) = serde_json::from_value::<Supplier>(cached) {
            return Json(ApiResponse::success(supplier, "获取供应商成功"));
        }
    }

    let result = sqlx::query_as::<_, Supplier>(
        r#"
        SELECT id, tenant_id, supplier_no, name, legal_name, category, status, tax_id, address, contact_person, phone, email, website, credit_rating, risk_level, created_by, created_at, updated_at
        FROM plugin_srm.suppliers WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(supplier)) => {
            if let Ok(value) = serde_json::to_value(&supplier) {
                state.supplier_cache.set(cache_key, value);
            }
            Json(ApiResponse::success(supplier, "获取供应商成功"))
        }
        Ok(None) => Json(ApiResponse::<Supplier>::error(404, "供应商不存在")),
        Err(e) => {
            tracing::error!("获取供应商失败: {}", e);
            Json(ApiResponse::<Supplier>::error(500, "获取供应商失败"))
        }
    }
}

async fn update_supplier(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(req): Json<UpdateSupplierRequest>,
) -> Json<ApiResponse<Supplier>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    let existing = sqlx::query_as::<_, Supplier>(
        "SELECT id, tenant_id, supplier_no, name, legal_name, category, status, tax_id, address, contact_person, phone, email, website, credit_rating, risk_level, created_by, created_at, updated_at FROM plugin_srm.suppliers WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(s)) => s,
        Ok(None) => return Json(ApiResponse::<Supplier>::error(404, "供应商不存在")),
        Err(e) => {
            return Json(ApiResponse::<Supplier>::error(
                500,
                &format!("查询供应商失败: {}", e),
            ))
        }
    };

    let old_values = serde_json::to_value(&existing).ok();

    let supplier_no = req.supplier_no.unwrap_or(existing.supplier_no);
    let name = req.name.unwrap_or(existing.name);
    let legal_name = req.legal_name.or(existing.legal_name);
    let category = req.category.unwrap_or(existing.category);
    let status = req.status.unwrap_or(existing.status);
    let tax_id = req.tax_id.or(existing.tax_id);
    let address = req.address.or(existing.address);
    let contact_person = req.contact_person.or(existing.contact_person);
    let phone = req.phone.or(existing.phone);
    let email = req.email.or(existing.email);
    let website = req.website.or(existing.website);
    let credit_rating = req.credit_rating.or(existing.credit_rating);
    let risk_level = req.risk_level.unwrap_or(existing.risk_level);
    let now = Utc::now();
    let user_id = Uuid::parse_str(&claims.sub).ok();

    let result = sqlx::query_as::<_, Supplier>(
        r#"
        UPDATE plugin_srm.suppliers SET
            supplier_no = $2, name = $3, legal_name = $4, category = $5, status = $6, tax_id = $7, address = $8, contact_person = $9, phone = $10, email = $11, website = $12, credit_rating = $13, risk_level = $14, updated_at = $15
        WHERE id = $1 AND tenant_id = $16
        RETURNING id, tenant_id, supplier_no, name, legal_name, category, status, tax_id, address, contact_person, phone, email, website, credit_rating, risk_level, created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(supplier_no)
    .bind(name)
    .bind(legal_name)
    .bind(category)
    .bind(status)
    .bind(tax_id)
    .bind(address)
    .bind(contact_person)
    .bind(phone)
    .bind(email)
    .bind(website)
    .bind(credit_rating)
    .bind(risk_level)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(supplier) => {
            let cache_key = supplier_cache_key(tenant_id, id);
            state.supplier_cache.remove(&cache_key);
            state.supplier_cache.clear();
            tracing::debug!("🗑️ 供应商缓存已失效: {}", cache_key);

            let new_data = serde_json::to_value(&supplier).ok();
            record_audit_log(
                &state.db,
                "suppliers",
                id,
                "update",
                Some(old_values.clone()),
                Some(new_data.clone()),
                user_id,
                tenant_id,
            )
            .await;

            // P3 事件驱动规范化：发布供应商更新事件，通知 SCM/Finance 同步供应商快照
            if let Some(ref publisher) = state.event_publisher {
                let updated_fields = diff_json_fields(&old_values, &new_data);
                let publisher = publisher.clone();
                let supplier_id = id;
                let supplier_no = supplier.supplier_no.clone();
                let supplier_name = supplier.name.clone();
                let tenant_id_evt = tenant_id;
                let updated_by = user_id;
                let updated_at = Some(now);
                let old_data_evt = old_values.clone();
                let new_data_evt = new_data.clone();
                tokio::spawn(async move {
                    let payload = SrmSupplierUpdatedPayload {
                        supplier_id,
                        supplier_no,
                        supplier_name,
                        updated_fields,
                        old_data: old_data_evt,
                        new_data: new_data_evt,
                        tenant_id: Some(tenant_id_evt),
                        updated_by,
                        updated_at,
                    };
                    if let Err(e) = publisher
                        .publish_event(EventType::SrmSupplierUpdated, payload)
                        .await
                    {
                        tracing::warn!(
                            "[srm] SrmSupplierUpdated 事件发布失败（graceful fallback）: {}",
                            e
                        );
                    } else {
                        tracing::info!(
                            "[srm] SrmSupplierUpdated 事件发布成功 - supplier_id={}",
                            supplier_id
                        );
                    }
                });
            }

            Json(ApiResponse::success(supplier, "供应商更新成功"))
        }
        Err(e) => {
            tracing::error!("更新供应商失败: {}", e);
            Json(ApiResponse::<Supplier>::error(500, "供应商更新失败"))
        }
    }
}

async fn delete_supplier(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    let existing = sqlx::query_as::<_, Supplier>(
        "SELECT id, tenant_id, supplier_no, name, legal_name, category, status, tax_id, address, contact_person, phone, email, website, credit_rating, risk_level, created_by, created_at, updated_at FROM plugin_srm.suppliers WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    let old_values = existing
        .ok()
        .flatten()
        .and_then(|s| serde_json::to_value(&s).ok());
    let user_id = Uuid::parse_str(&claims.sub).ok();

    let result = sqlx::query(
        "UPDATE plugin_srm.suppliers SET status = 'deleted', updated_at = $2 WHERE id = $1 AND tenant_id = $3",
    )
    .bind(id)
    .bind(Utc::now())
    .bind(tenant_id)
    .execute(&state.db)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            let cache_key = supplier_cache_key(tenant_id, id);
            state.supplier_cache.remove(&cache_key);
            state.supplier_cache.clear();
            tracing::debug!("🗑️ 供应商缓存已失效: {}", cache_key);

            record_audit_log(
                &state.db,
                "suppliers",
                id,
                "delete",
                Some(old_values),
                None,
                user_id,
                tenant_id,
            )
            .await;

            Json(ApiResponse::success("".to_string(), "供应商删除成功"))
        }
        Ok(_) => Json(ApiResponse::<String>::error(404, "供应商不存在")),
        Err(e) => {
            tracing::error!("删除供应商失败: {}", e);
            Json(ApiResponse::<String>::error(500, "供应商删除失败"))
        }
    }
}

// ==================== Supplier Products Handler ====================

async fn get_supplier_products(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<Vec<SupplierProduct>>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, SupplierProduct>(
        r#"
        SELECT id, tenant_id, product_no, supplier_id, name, description, category, unit, unit_price, currency, min_order_qty, lead_time_days, status, specifications, created_by, created_at, updated_at
        FROM plugin_srm.supplier_products
        WHERE supplier_id = $1 AND tenant_id = $2
        ORDER BY created_at DESC
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(products) => Json(ApiResponse::success(products, "获取供应商产品列表成功")),
        Err(e) => {
            tracing::error!("获取供应商产品列表失败: {}", e);
            Json(ApiResponse::<Vec<SupplierProduct>>::error(
                500,
                "获取供应商产品列表失败",
            ))
        }
    }
}

// ==================== Supplier Contracts Handler ====================

async fn get_supplier_contracts(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<Vec<SupplierContract>>> {
    match check_permission(&state.db, &claims, &ModulePermission::ContractRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, SupplierContract>(
        r#"
        SELECT id, tenant_id, contract_no, supplier_id, supplier_name, title, contract_type, total_amount, currency, sign_date, start_date, end_date, status, remarks, created_by, created_at, updated_at
        FROM plugin_srm.supplier_contracts
        WHERE supplier_id = $1 AND tenant_id = $2
        ORDER BY created_at DESC
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(contracts) => Json(ApiResponse::success(contracts, "获取供应商合同列表成功")),
        Err(e) => {
            tracing::error!("获取供应商合同列表失败: {}", e);
            Json(ApiResponse::<Vec<SupplierContract>>::error(
                500,
                "获取供应商合同列表失败",
            ))
        }
    }
}

// ==================== Supplier Performance Handler ====================

async fn get_supplier_performance(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<SupplierPerformance>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    let supplier_query = sqlx::query_as::<_, Supplier>(
        "SELECT id, tenant_id, supplier_no, name, legal_name, category, status, tax_id, address, contact_person, phone, email, website, credit_rating, risk_level, created_by, created_at, updated_at FROM plugin_srm.suppliers WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db);

    let order_stats_query = sqlx::query_as::<_, (i64, Option<f64>)>(
        r#"
        SELECT COUNT(*) as total_orders, COALESCE(SUM(total_amount), 0) as total_amount
        FROM plugin_srm.purchase_orders
        WHERE supplier_id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&state.db);

    let eval_stats_query = sqlx::query_as::<
        _,
        (
            Option<f64>,
            Option<f64>,
            Option<f64>,
            Option<f64>,
            Option<f64>,
            i64,
            Option<chrono::DateTime<Utc>>,
        ),
    >(
        r#"
        SELECT 
            AVG(quality_score) as avg_quality,
            AVG(delivery_score) as avg_delivery,
            AVG(service_score) as avg_service,
            AVG(price_score) as avg_price,
            AVG(overall_score) as avg_overall,
            COUNT(*) as eval_count,
            MAX(evaluation_date) as last_eval_date
        FROM plugin_srm.supplier_evaluations
        WHERE supplier_id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&state.db);

    let (supplier_result, order_stats, eval_stats) =
        tokio::join!(supplier_query, order_stats_query, eval_stats_query);

    let supplier = match supplier_result {
        Ok(Some(s)) => s,
        Ok(None) => {
            return Json(ApiResponse::<SupplierPerformance>::error(
                404,
                "供应商不存在",
            ))
        }
        Err(_) => {
            return Json(ApiResponse::<SupplierPerformance>::error(
                500,
                "查询供应商失败",
            ))
        }
    };

    let (total_orders, total_amount) = order_stats.unwrap_or((0, Some(0.0)));
    let total_amount = total_amount.unwrap_or(0.0);

    let (
        avg_quality,
        avg_delivery,
        avg_service,
        avg_price,
        avg_overall,
        eval_count,
        last_eval_date,
    ) = eval_stats.unwrap_or((None, None, None, None, None, 0, None));

    let performance = SupplierPerformance {
        supplier_id: id,
        supplier_name: supplier.name,
        total_orders,
        total_amount,
        avg_quality_score: avg_quality,
        avg_delivery_score: avg_delivery,
        avg_service_score: avg_service,
        avg_price_score: avg_price,
        avg_overall_score: avg_overall,
        on_time_delivery_rate: None,
        defect_rate: None,
        last_evaluation_date: last_eval_date,
        evaluation_count: eval_count,
    };

    Json(ApiResponse::success(performance, "获取供应商绩效评估成功"))
}

// ==================== Audit Log Helper ====================

/// 比较两个 JSON 对象，返回值不同的顶层字段名列表（用于事件 payload 的 updated_fields）
fn diff_json_fields(
    old: &Option<serde_json::Value>,
    new: &Option<serde_json::Value>,
) -> Vec<String> {
    let (Some(old_obj), Some(new_obj)) = (
        old.as_ref().and_then(|v| v.as_object()),
        new.as_ref().and_then(|v| v.as_object()),
    ) else {
        return Vec::new();
    };
    let mut fields = Vec::new();
    for (key, new_val) in new_obj {
        match old_obj.get(key) {
            Some(old_val) if old_val == new_val => {}
            _ => fields.push(key.clone()),
        }
    }
    fields
}

async fn record_audit_log(
    db: &PgPool,
    table_name: &str,
    record_id: Uuid,
    action: &str,
    old_values: Option<Option<serde_json::Value>>,
    new_values: Option<Option<serde_json::Value>>,
    changed_by: Option<Uuid>,
    tenant_id: Uuid,
) {
    let log_id = Uuid::new_v4();

    let result = sqlx::query(
        r#"
        INSERT INTO plugin_srm.audit_logs (id, tenant_id, table_name, record_id, action, old_values, new_values, changed_by, changed_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        "#,
    )
    .bind(log_id)
    .bind(tenant_id)
    .bind(table_name)
    .bind(record_id)
    .bind(action)
    .bind(old_values.flatten())
    .bind(new_values.flatten())
    .bind(changed_by)
    .bind(Utc::now())
    .execute(db)
    .await;

    if let Err(e) = result {
        tracing::error!("记录审计日志失败: {}", e);
    }
}

// ==================== Supplier Approval Workflow ====================

#[derive(Debug, Deserialize)]
pub struct StartApprovalRequest {
    pub workflow_id: Uuid,
    pub comment: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ApprovalActionRequest {
    pub comment: Option<String>,
}

async fn start_supplier_approval(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Path(id): Path<Uuid>,
    Json(req): Json<StartApprovalRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);
    let user_id = Uuid::parse_str(&claims.sub).ok();

    let supplier = sqlx::query_as::<_, Supplier>(
        "SELECT id, tenant_id, supplier_no, name, legal_name, category, status, tax_id, address, contact_person, phone, email, website, credit_rating, risk_level, created_by, created_at, updated_at FROM plugin_srm.suppliers WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await;

    if supplier.is_err() {
        return Json(ApiResponse::<serde_json::Value>::error(404, "供应商不存在"));
    }

    let supplier_ref = supplier.as_ref().expect("supplier checked above");
    let old_status = supplier_ref.status.clone();
    let supplier_no = supplier_ref.supplier_no.clone();
    let supplier_name = supplier_ref.name.clone();

    tracing::info!(
        "Starting approval for supplier {}: workflow_id={}",
        id,
        req.workflow_id
    );

    let workflow_client = state.workflow_client.clone();
    let id_str = id.to_string();
    tokio::spawn(async move {
        let request = CreateInstanceRequest {
            workflow_id: req.workflow_id,
            title: format!("供应商准入审批 - {}", id_str),
            variables: Some(serde_json::json!({
                "supplier_id": id_str,
            })),
        };
        match workflow_client.create_instance(request).await {
            Ok(instance) => {
                tracing::info!("[srm] 供应商审批流程启动成功 - instance_id={}", instance.id);
            }
            Err(e) => {
                tracing::warn!("[srm] 供应商审批流程启动失败（graceful fallback）: {}", e);
            }
        }
    });

    let result = sqlx::query(
        "UPDATE plugin_srm.suppliers SET status = 'pending_approval', updated_at = NOW() WHERE id = $1",
    )
    .bind(id)
    .execute(&state.db)
    .await;

    if result.is_ok() {
        state.supplier_cache.clear();

        // P3 事件驱动规范化：状态变更 → pending_approval，通知 SCM/Finance/Portal
        if let Some(ref publisher) = state.event_publisher {
            let publisher = publisher.clone();
            let supplier_id = id;
            let tenant_id_evt = tenant_id;
            let changed_by = user_id;
            let change_reason = req.comment.clone();
            let changed_at = Some(Utc::now());
            tokio::spawn(async move {
                let payload = SrmSupplierStatusChangedPayload {
                    supplier_id,
                    supplier_no,
                    supplier_name,
                    old_status,
                    new_status: "pending_approval".to_string(),
                    change_reason,
                    tenant_id: Some(tenant_id_evt),
                    changed_by,
                    changed_at,
                };
                if let Err(e) = publisher
                    .publish_event(EventType::SrmSupplierStatusChanged, payload)
                    .await
                {
                    tracing::warn!(
                        "[srm] SrmSupplierStatusChanged 事件发布失败（graceful fallback）: {}",
                        e
                    );
                } else {
                    tracing::info!(
                        "[srm] SrmSupplierStatusChanged 事件发布成功 - supplier_id={}",
                        supplier_id
                    );
                }
            });
        }
    }

    record_audit_log(
        &state.db,
        "suppliers",
        id,
        "start_approval",
        None,
        Some(Some(serde_json::json!({
            "workflow_id": req.workflow_id.to_string(),
            "comment": req.comment,
        }))),
        user_id,
        tenant_id,
    )
    .await;

    Json(ApiResponse::success(
        serde_json::json!({
            "supplier_id": id,
            "workflow_id": req.workflow_id,
            "approval_status": "pending"
        }),
        "供应商审批流程已启动",
    ))
}

async fn approve_supplier(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Path(id): Path<Uuid>,
    Json(req): Json<ApprovalActionRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);
    let user_id = Uuid::parse_str(&claims.sub).ok();

    let supplier = sqlx::query_as::<_, Supplier>(
        "SELECT id, tenant_id, supplier_no, name, legal_name, category, status, tax_id, address, contact_person, phone, email, website, credit_rating, risk_level, created_by, created_at, updated_at FROM plugin_srm.suppliers WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await;

    if supplier.is_err() {
        return Json(ApiResponse::<serde_json::Value>::error(404, "供应商不存在"));
    }

    let supplier_ref = supplier.as_ref().expect("supplier checked above");
    let old_status = supplier_ref.status.clone();
    let supplier_no = supplier_ref.supplier_no.clone();
    let supplier_name = supplier_ref.name.clone();

    let result = sqlx::query(
        "UPDATE plugin_srm.suppliers SET status = 'approved', updated_at = NOW() WHERE id = $1",
    )
    .bind(id)
    .execute(&state.db)
    .await;

    if result.is_ok() {
        state.supplier_cache.clear();

        // P3 事件驱动规范化：状态变更 → approved，通知 SCM（采购资格）/Finance（应付启用）
        if let Some(ref publisher) = state.event_publisher {
            let publisher = publisher.clone();
            let supplier_id = id;
            let tenant_id_evt = tenant_id;
            let changed_by = user_id;
            let change_reason = req.comment.clone();
            let changed_at = Some(Utc::now());
            tokio::spawn(async move {
                let payload = SrmSupplierStatusChangedPayload {
                    supplier_id,
                    supplier_no,
                    supplier_name,
                    old_status,
                    new_status: "approved".to_string(),
                    change_reason,
                    tenant_id: Some(tenant_id_evt),
                    changed_by,
                    changed_at,
                };
                if let Err(e) = publisher
                    .publish_event(EventType::SrmSupplierStatusChanged, payload)
                    .await
                {
                    tracing::warn!(
                        "[srm] SrmSupplierStatusChanged 事件发布失败（graceful fallback）: {}",
                        e
                    );
                } else {
                    tracing::info!(
                        "[srm] SrmSupplierStatusChanged 事件发布成功 - supplier_id={}",
                        supplier_id
                    );
                }
            });
        }
    }

    record_audit_log(
        &state.db,
        "suppliers",
        id,
        "approve",
        None,
        Some(Some(serde_json::json!({
            "status": "approved",
        }))),
        user_id,
        tenant_id,
    )
    .await;

    Json(ApiResponse::success(
        serde_json::json!({
            "supplier_id": id,
            "approval_status": "approved"
        }),
        "供应商审批通过",
    ))
}

async fn reject_supplier(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Path(id): Path<Uuid>,
    Json(req): Json<ApprovalActionRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);
    let user_id = Uuid::parse_str(&claims.sub).ok();

    let supplier = sqlx::query_as::<_, Supplier>(
        "SELECT id, tenant_id, supplier_no, name, legal_name, category, status, tax_id, address, contact_person, phone, email, website, credit_rating, risk_level, created_by, created_at, updated_at FROM plugin_srm.suppliers WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await;

    if supplier.is_err() {
        return Json(ApiResponse::<serde_json::Value>::error(404, "供应商不存在"));
    }

    let supplier_ref = supplier.as_ref().expect("supplier checked above");
    let old_status = supplier_ref.status.clone();
    let supplier_no = supplier_ref.supplier_no.clone();
    let supplier_name = supplier_ref.name.clone();

    let result = sqlx::query(
        "UPDATE plugin_srm.suppliers SET status = 'rejected', updated_at = NOW() WHERE id = $1",
    )
    .bind(id)
    .execute(&state.db)
    .await;

    if result.is_ok() {
        state.supplier_cache.clear();

        // P3 事件驱动规范化：状态变更 → rejected，通知 SCM（采购冻结）/Finance/Portal
        if let Some(ref publisher) = state.event_publisher {
            let publisher = publisher.clone();
            let supplier_id = id;
            let tenant_id_evt = tenant_id;
            let changed_by = user_id;
            let change_reason = req.comment.clone();
            let changed_at = Some(Utc::now());
            tokio::spawn(async move {
                let payload = SrmSupplierStatusChangedPayload {
                    supplier_id,
                    supplier_no,
                    supplier_name,
                    old_status,
                    new_status: "rejected".to_string(),
                    change_reason,
                    tenant_id: Some(tenant_id_evt),
                    changed_by,
                    changed_at,
                };
                if let Err(e) = publisher
                    .publish_event(EventType::SrmSupplierStatusChanged, payload)
                    .await
                {
                    tracing::warn!(
                        "[srm] SrmSupplierStatusChanged 事件发布失败（graceful fallback）: {}",
                        e
                    );
                } else {
                    tracing::info!(
                        "[srm] SrmSupplierStatusChanged 事件发布成功 - supplier_id={}",
                        supplier_id
                    );
                }
            });
        }
    }

    record_audit_log(
        &state.db,
        "suppliers",
        id,
        "reject",
        None,
        Some(Some(serde_json::json!({
            "status": "rejected",
        }))),
        user_id,
        tenant_id,
    )
    .await;

    Json(ApiResponse::success(
        serde_json::json!({
            "supplier_id": id,
            "approval_status": "rejected"
        }),
        "供应商审批已驳回",
    ))
}
