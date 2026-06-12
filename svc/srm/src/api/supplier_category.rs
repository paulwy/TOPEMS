use anyhow::Result;
use axum::{
    extract::{Extension, Path, Query, State},
    routing::get,
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use sqlx::postgres::PgPool;
use std::sync::Arc;
use uuid::Uuid;

use crate::models::{
    CreateSupplierCategoryRequest, SupplierCategory, UpdateSupplierCategoryRequest,
};
use crate::services::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::ApiResponse;

#[derive(Debug, Deserialize)]
pub struct CategoryQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub is_active: Option<bool>,
    pub parent_id: Option<String>,
}

pub struct AppState {
    pub db: PgPool,
}

pub async fn create_routes(db: PgPool) -> Result<Router> {
    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route(
            "/api/v1/supplier-categories",
            get(list_categories).post(create_category),
        )
        .route(
            "/api/v1/supplier-categories/{id}",
            get(get_category)
                .put(update_category)
                .delete(delete_category),
        )
        .with_state(state);

    Ok(app)
}

// ==================== Category Handlers ====================

async fn list_categories(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<CategoryQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let is_active_filter = params.is_active;
    let parent_id_filter = params
        .parent_id
        .clone()
        .and_then(|p| Uuid::parse_str(&p).ok());

    let result = sqlx::query_as::<_, SupplierCategory>(
        r#"
        SELECT id, category_no, name, description, parent_id, level, is_active, created_by, created_at, updated_at
        FROM srm.supplier_categories
        WHERE ($1::text IS NULL OR name ILIKE $1 OR category_no ILIKE $1)
          AND ($2::boolean IS NULL OR is_active = $2)
          AND ($3::uuid IS NULL OR parent_id = $3)
        ORDER BY level, category_no
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(&search_pattern)
    .bind(is_active_filter)
    .bind(parent_id_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(categories) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM srm.supplier_categories
                WHERE ($1::text IS NULL OR name ILIKE $1 OR category_no ILIKE $1)
                  AND ($2::boolean IS NULL OR is_active = $2)
                  AND ($3::uuid IS NULL OR parent_id = $3)
                "#,
            )
            .bind(&search_pattern)
            .bind(is_active_filter)
            .bind(parent_id_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "categories": categories,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取供应商分类列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取供应商分类列表失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(
                500,
                "获取供应商分类列表失败",
            ))
        }
    }
}

async fn create_category(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateSupplierCategoryRequest>,
) -> Json<ApiResponse<SupplierCategory>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    // 数据验证
    if req.category_no.is_empty() || req.name.is_empty() {
        return Json(ApiResponse::<SupplierCategory>::error(
            400,
            "分类编号和名称不能为空",
        ));
    }

    if req.level < 1 || req.level > 5 {
        return Json(ApiResponse::<SupplierCategory>::error(
            400,
            "分类层级必须在1-5之间",
        ));
    }

    // 检查分类编号是否已存在
    let existing = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM srm.supplier_categories WHERE category_no = $1",
    )
    .bind(&req.category_no)
    .fetch_one(&state.db)
    .await;

    if existing.unwrap_or(0) > 0 {
        return Json(ApiResponse::<SupplierCategory>::error(
            400,
            "分类编号已存在",
        ));
    }

    // 验证父分类是否存在
    if let Some(parent_id_str) = &req.parent_id {
        let parent_uuid = Uuid::parse_str(parent_id_str);
        if parent_uuid.is_err() {
            return Json(ApiResponse::<SupplierCategory>::error(
                400,
                "父分类ID格式错误",
            ));
        }

        let parent_exists = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM srm.supplier_categories WHERE id = $1 AND is_active = true",
        )
        .bind(parent_uuid.unwrap())
        .fetch_one(&state.db)
        .await;

        if parent_exists.unwrap_or(0) == 0 {
            return Json(ApiResponse::<SupplierCategory>::error(
                400,
                "父分类不存在或已禁用",
            ));
        }
    }

    let id = Uuid::new_v4();
    let now = Utc::now();
    let user_id = Uuid::parse_str(&claims.sub).ok();
    let parent_id = req.parent_id.and_then(|p| Uuid::parse_str(&p).ok());

    let result = sqlx::query_as::<_, SupplierCategory>(
        r#"
        INSERT INTO srm.supplier_categories (id, category_no, name, description, parent_id, level, is_active, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, category_no, name, description, parent_id, level, is_active, created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.category_no)
    .bind(&req.name)
    .bind(&req.description)
    .bind(parent_id)
    .bind(req.level)
    .bind(req.is_active)
    .bind(user_id)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(category) => Json(ApiResponse::success(category, "供应商分类创建成功")),
        Err(e) => {
            tracing::error!("创建供应商分类失败: {}", e);
            Json(ApiResponse::<SupplierCategory>::error(
                500,
                "供应商分类创建失败",
            ))
        }
    }
}

async fn get_category(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<SupplierCategory>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result = sqlx::query_as::<_, SupplierCategory>(
        r#"
        SELECT id, category_no, name, description, parent_id, level, is_active, created_by, created_at, updated_at
        FROM srm.supplier_categories WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(category)) => Json(ApiResponse::success(category, "获取供应商分类成功")),
        Ok(None) => Json(ApiResponse::<SupplierCategory>::error(
            404,
            "供应商分类不存在",
        )),
        Err(e) => {
            tracing::error!("获取供应商分类失败: {}", e);
            Json(ApiResponse::<SupplierCategory>::error(
                500,
                "获取供应商分类失败",
            ))
        }
    }
}

async fn update_category(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateSupplierCategoryRequest>,
) -> Json<ApiResponse<SupplierCategory>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let existing = sqlx::query_as::<_, SupplierCategory>(
        "SELECT id, category_no, name, description, parent_id, level, is_active, created_by, created_at, updated_at FROM srm.supplier_categories WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(c)) => c,
        Ok(None) => {
            return Json(ApiResponse::<SupplierCategory>::error(
                404,
                "供应商分类不存在",
            ))
        }
        Err(e) => {
            return Json(ApiResponse::<SupplierCategory>::error(
                500,
                &format!("查询供应商分类失败: {}", e),
            ))
        }
    };

    // 验证层级
    if let Some(level) = req.level {
        if level < 1 || level > 5 {
            return Json(ApiResponse::<SupplierCategory>::error(
                400,
                "分类层级必须在1-5之间",
            ));
        }
    }

    // 验证父分类
    if let Some(parent_id_str) = &req.parent_id {
        let parent_uuid = Uuid::parse_str(parent_id_str);
        if parent_uuid.is_err() {
            return Json(ApiResponse::<SupplierCategory>::error(
                400,
                "父分类ID格式错误",
            ));
        }

        // 不能将自己设为父分类
        if parent_uuid.as_ref().unwrap() == &id {
            return Json(ApiResponse::<SupplierCategory>::error(
                400,
                "不能将自己设为父分类",
            ));
        }

        let parent_exists = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM srm.supplier_categories WHERE id = $1 AND is_active = true",
        )
        .bind(parent_uuid.unwrap())
        .fetch_one(&state.db)
        .await;

        if parent_exists.unwrap_or(0) == 0 {
            return Json(ApiResponse::<SupplierCategory>::error(
                400,
                "父分类不存在或已禁用",
            ));
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
        r#"
        UPDATE srm.supplier_categories SET
            category_no = $2, name = $3, description = $4, parent_id = $5, level = $6, is_active = $7, updated_at = $8
        WHERE id = $1
        RETURNING id, category_no, name, description, parent_id, level, is_active, created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(category_no)
    .bind(name)
    .bind(description)
    .bind(parent_id)
    .bind(level)
    .bind(is_active)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(category) => Json(ApiResponse::success(category, "供应商分类更新成功")),
        Err(e) => {
            tracing::error!("更新供应商分类失败: {}", e);
            Json(ApiResponse::<SupplierCategory>::error(
                500,
                "供应商分类更新失败",
            ))
        }
    }
}

async fn delete_category(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::SupplierWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    // 检查是否有子分类
    let child_count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM srm.supplier_categories WHERE parent_id = $1",
    )
    .bind(id)
    .fetch_one(&state.db)
    .await;

    if child_count.unwrap_or(0) > 0 {
        return Json(ApiResponse::<String>::error(
            400,
            "该分类下存在子分类，无法删除",
        ));
    }

    // 检查是否有供应商使用该分类
    let supplier_count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM srm.suppliers WHERE category = (SELECT category_no FROM srm.supplier_categories WHERE id = $1)"
    )
    .bind(id)
    .fetch_one(&state.db)
    .await;

    if supplier_count.unwrap_or(0) > 0 {
        return Json(ApiResponse::<String>::error(
            400,
            "该分类下存在供应商，无法删除",
        ));
    }

    let result = sqlx::query("DELETE FROM srm.supplier_categories WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            Json(ApiResponse::success("".to_string(), "供应商分类删除成功"))
        }
        Ok(_) => Json(ApiResponse::<String>::error(404, "供应商分类不存在")),
        Err(e) => {
            tracing::error!("删除供应商分类失败: {}", e);
            Json(ApiResponse::<String>::error(500, "供应商分类删除失败"))
        }
    }
}
