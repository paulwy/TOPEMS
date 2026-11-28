use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::get,
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use std::sync::Arc;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::error::Result;
use topems_shared_core::locale::Locale;
use topems_shared_db::scope::Db;
use uuid::Uuid;

use crate::models::{
    CreateSupplierCategoryRequest, SupplierCategory, UpdateSupplierCategoryRequest,
};
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::error::TopemsError;
use topems_shared_core::response::ApiResponse;

#[derive(Debug, Deserialize)]
pub struct CategoryQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub is_active: Option<bool>,
    pub parent_id: Option<String>,
}

pub struct AppState {
    pub db: Db,
}

pub async fn create_routes(db: Db) -> Result<Router> {
    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route(
            "/supplier-categories",
            get(list_categories).post(create_category),
        )
        .route(
            "/supplier-categories/{id}",
            get(get_category)
                .put(update_category)
                .delete(delete_category),
        )
        .with_state(state);

    Ok(app)
}

// ==================== Category Handlers ====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["srm:supplier_category:read"])),
    path = "/supplier-categories",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SRM/supplier_category"
)]
pub async fn list_categories(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<CategoryQueryParams>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::SupplierRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let is_active_filter = params.is_active;
    let parent_id_filter = params
        .parent_id
        .clone()
        .and_then(|p| Uuid::parse_str(&p).ok());

    let result = sqlx::query_as::<_, SupplierCategory>(only_own_schema_query!(
        "srm",
        r#"
        SELECT id, tenant_id, category_no,
               CASE WHEN $6 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name,
               description, parent_id, level, is_active, created_by, created_at, updated_at,
               (SELECT COUNT(*) FROM srm.suppliers s
                 WHERE s.category = CASE WHEN $6 = 'en' THEN COALESCE(name_en, name) ELSE name END
                   AND s.deleted_at IS NULL) AS supplier_count
        FROM srm.supplier_categories
          WHERE ($1::text IS NULL OR name ILIKE $1 OR category_no ILIKE $1)
          AND ($2::boolean IS NULL OR is_active = $2)
          AND ($3::uuid IS NULL OR parent_id = $3)
        ORDER BY level, category_no
        LIMIT $4 OFFSET $5
        "#,
        "srm"
    ))
    .bind(&search_pattern)
    .bind(is_active_filter)
    .bind(parent_id_filter)
    .bind(page_size)
    .bind(offset)
    .bind(Locale::from_headers(&headers).as_sql())
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(categories) => {
            let count_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "srm",
                r#"
                SELECT COUNT(*) FROM srm.supplier_categories
                WHERE deleted_at IS NULL
                  AND ($1::text IS NULL OR name ILIKE $1 OR category_no ILIKE $1)
                  AND ($2::boolean IS NULL OR is_active = $2)
                  AND ($3::uuid IS NULL OR parent_id = $3)
                "#,
                "srm"
            ))
            .bind(&search_pattern)
            .bind(is_active_filter)
            .bind(parent_id_filter)
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);

            ApiResponse::success(
                serde_json::json!({
                    "categories": categories,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取供应商分类列表成功",
            )
        }
        Err(e) => {
            tracing::error!("获取供应商分类列表失败: {}", e);
            ApiResponse::<serde_json::Value>::server_error("获取供应商分类列表失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["srm:supplier_category:write"])),
    path = "/supplier-categories",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SRM/supplier_category"
)]
pub async fn create_category(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    _headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<CreateSupplierCategoryRequest>,
) -> ApiResponse<SupplierCategory> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::SupplierWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let tenant_id = match crate::shared::permission::require_write_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };

    if req.category_no.is_empty() || req.name.is_empty() {
        return ApiResponse::<SupplierCategory>::bad_request("分类编号和名称不能为空");
    }

    if req.level < 1 || req.level > 5 {
        return ApiResponse::<SupplierCategory>::bad_request("分类层级必须在1-5之间");
    }

    let existing = sqlx::query_scalar::<_, i64>(
        only_own_schema_query!("srm", "SELECT COUNT(*) FROM srm.supplier_categories WHERE deleted_at IS NULL AND category_no = $1", "srm"),
    )
    .bind(&req.category_no)
    .fetch_one(&mut **txn)
    .await;

    if existing.unwrap_or(0) > 0 {
        return ApiResponse::<SupplierCategory>::bad_request("分类编号已存在");
    }

    if let Some(parent_id_str) = &req.parent_id {
        let parent_uuid = match Uuid::parse_str(parent_id_str) {
            Ok(uuid) => uuid,
            Err(_) => {
                return ApiResponse::<SupplierCategory>::bad_request("父分类ID格式错误");
            }
        };

        let parent_exists = sqlx::query_scalar::<_, i64>(
            only_own_schema_query!("srm", "SELECT COUNT(*) FROM srm.supplier_categories WHERE deleted_at IS NULL AND id = $1 AND is_active = true", "srm"),
        )
        .bind(parent_uuid)
        .fetch_one(&mut **txn)
        .await;

        if parent_exists.unwrap_or(0) == 0 {
            return ApiResponse::<SupplierCategory>::bad_request("父分类不存在或已禁用");
        }
    }

    let id = Uuid::new_v4();
    let now = Utc::now();
    let user_id = Uuid::parse_str(&claims.sub).ok();
    let parent_id = req.parent_id.and_then(|p| Uuid::parse_str(&p).ok());

    let result = sqlx::query_as::<_, SupplierCategory>(
        only_own_schema_query!("srm", r#"
        INSERT INTO srm.supplier_categories (id, tenant_id, category_no, name, description, parent_id, level, is_active, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, tenant_id, category_no, name, description, parent_id, level, is_active, created_by, created_at, updated_at
        "#, "srm"),
    )
    .bind(id)
    .bind(tenant_id)
    .bind(&req.category_no)
    .bind(&req.name)
    .bind(&req.description)
    .bind(parent_id)
    .bind(req.level)
    .bind(req.is_active)
    .bind(user_id)
    .bind(now)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(category) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return ApiResponse::server_error("提交事务失败");
                }
            }
            ApiResponse::success(category, "供应商分类创建成功")
        }
        Err(e) => {
            tracing::error!("创建供应商分类失败: {}", e);
            ApiResponse::<SupplierCategory>::server_error("供应商分类创建失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["srm:supplier_category:read"])),
    path = "/supplier-categories/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SRM/supplier_category"
)]
pub async fn get_category(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<SupplierCategory> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::SupplierRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let locale = Locale::from_headers(&headers).as_sql();
    let result = sqlx::query_as::<_, SupplierCategory>(only_own_schema_query!(
        "srm",
        r#"
        SELECT id, tenant_id, category_no,
               CASE WHEN $2 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name,
               description, parent_id, level, is_active, created_by, created_at, updated_at
        FROM srm.supplier_categories WHERE id = $1
        "#,
        "srm"
    ))
    .bind(id)
    .bind(locale)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(category)) => ApiResponse::success(category, "获取供应商分类成功"),
        Ok(None) => ApiResponse::<SupplierCategory>::not_found("供应商分类不存在"),
        Err(e) => {
            tracing::error!("获取供应商分类失败: {}", e);
            ApiResponse::<SupplierCategory>::server_error("获取供应商分类失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["srm:supplier_category:write"])),
    path = "/supplier-categories/{id}",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SRM/supplier_category"
)]
pub async fn update_category(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<UpdateSupplierCategoryRequest>,
) -> ApiResponse<SupplierCategory> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::SupplierWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let tenant_id = match crate::shared::permission::require_write_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };

    let existing = sqlx::query_as::<_, SupplierCategory>(
        only_own_schema_query!("srm", "SELECT id, tenant_id, category_no, name, description, parent_id, level, is_active, created_by, created_at, updated_at FROM srm.supplier_categories WHERE deleted_at IS NULL AND id = $1", "srm"),
    )
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    let existing = match existing {
        Ok(Some(c)) => c,
        Ok(None) => return ApiResponse::<SupplierCategory>::not_found("供应商分类不存在"),
        Err(e) => {
            return ApiResponse::<SupplierCategory>::from(TopemsError::internal(
                "查询供应商分类失败",
                e,
            ))
        }
    };

    if let Some(level) = req.level {
        if !(1..=5).contains(&level) {
            return ApiResponse::<SupplierCategory>::bad_request("分类层级必须在1-5之间");
        }
    }

    if let Some(parent_id_str) = &req.parent_id {
        let parent_uuid = match Uuid::parse_str(parent_id_str) {
            Ok(uuid) => uuid,
            Err(_) => {
                return ApiResponse::<SupplierCategory>::bad_request("父分类ID格式错误");
            }
        };

        if parent_uuid == id {
            return ApiResponse::<SupplierCategory>::bad_request("不能将自己设为父分类");
        }

        let parent_exists = sqlx::query_scalar::<_, i64>(
            only_own_schema_query!("srm", "SELECT COUNT(*) FROM srm.supplier_categories WHERE deleted_at IS NULL AND id = $1 AND is_active = true", "srm"),
        )
        .bind(parent_uuid)
        .fetch_one(&mut **txn)
        .await;

        if parent_exists.unwrap_or(0) == 0 {
            return ApiResponse::<SupplierCategory>::bad_request("父分类不存在或已禁用");
        }
    }

    let category_no = req.category_no.unwrap_or(existing.category_no);
    let name = req.name.unwrap_or(existing.name);
    let description = req.description.or(existing.description);
    let parent_id = req
        .parent_id
        .and_then(|p| Uuid::parse_str(&p).ok())
        .or(existing.parent_id);
    let level = req.level.unwrap_or(existing.level);
    let is_active = req.is_active.unwrap_or(existing.is_active);
    let now = Utc::now();

    let result = sqlx::query_as::<_, SupplierCategory>(
        only_own_schema_query!("srm", r#"
        UPDATE srm.supplier_categories SET
            category_no = $2, name = $3, description = $4, parent_id = $5, level = $6, is_active = $7, updated_at = $8
        WHERE id = $1 AND tenant_id = $9
        RETURNING id, tenant_id, category_no, name, description, parent_id, level, is_active, created_by, created_at, updated_at
        "#, "srm"),
    )
    .bind(id)
    .bind(category_no)
    .bind(name)
    .bind(description)
    .bind(parent_id)
    .bind(level)
    .bind(is_active)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(category) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return ApiResponse::server_error("提交事务失败");
                }
            }
            ApiResponse::success(category, "供应商分类更新成功")
        }
        Err(e) => {
            tracing::error!("更新供应商分类失败: {}", e);
            ApiResponse::<SupplierCategory>::server_error("供应商分类更新失败")
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["srm:supplier_category:write"])),
    path = "/supplier-categories/{id}",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SRM/supplier_category"
)]
pub async fn delete_category(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: axum::http::HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<String> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::SupplierWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let tenant_id = match crate::shared::permission::require_write_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };

    let child_count = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "srm",
        "SELECT COUNT(*) FROM srm.supplier_categories WHERE deleted_at IS NULL AND parent_id = $1",
        "srm"
    ))
    .bind(id)
    .fetch_one(&mut **txn)
    .await;

    if child_count.unwrap_or(0) > 0 {
        return ApiResponse::<String>::bad_request("该分类下存在子分类，无法删除");
    }

    let supplier_count = sqlx::query_scalar::<_, i64>(
        only_own_schema_query!("srm", "SELECT COUNT(*) FROM srm.suppliers s JOIN srm.supplier_categories c ON c.name = s.category WHERE c.deleted_at IS NULL AND c.id = $1", "srm")
    )
    .bind(id)
    .fetch_one(&mut **txn)
    .await;

    if supplier_count.unwrap_or(0) > 0 {
        return ApiResponse::<String>::bad_request("该分类下存在供应商，无法删除");
    }

    let result = sqlx::query(only_own_schema_query!(
        "srm",
        "UPDATE srm.supplier_categories SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2",
        "srm"
    ))
    .bind(id)
    .bind(tenant_id)
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
            ApiResponse::success("".to_string(), "供应商分类删除成功")
        }
        Ok(_) => ApiResponse::<String>::not_found("供应商分类不存在"),
        Err(e) => {
            tracing::error!("删除供应商分类失败: {}", e);
            ApiResponse::<String>::server_error("供应商分类删除失败")
        }
    }
}
