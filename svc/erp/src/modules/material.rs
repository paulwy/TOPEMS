use axum::{
    extract::{Extension, Path, Query, State},
    routing::*,
    Json, Router,
};
use serde::Deserialize;
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use super::ApiState;
use crate::models::material::{CreateMaterialRequest, Material, UpdateMaterialRequest};
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::ApiResponse;
use topems_shared_core::response::{api_error, PaginatedResponse};

#[derive(Debug, Deserialize)]
pub struct MaterialListParams {
    #[serde(default, alias = "p")]
    pub page: Option<i64>,
    #[serde(
        default,
        alias = "pagesize",
        alias = "pageSize",
        alias = "size",
        alias = "limit"
    )]
    pub page_size: Option<i64>,
    #[serde(default, alias = "q", alias = "keyword")]
    pub search: Option<String>,
    #[serde(default, alias = "sort", alias = "sortBy", alias = "sortby")]
    pub sort_by: Option<String>,
    #[serde(
        default,
        alias = "sortorder",
        alias = "sortOrder",
        alias = "sort_dir",
        alias = "dir"
    )]
    pub sort_dir: Option<String>,
    pub status: Option<String>,
    pub category: Option<String>,
}

impl MaterialListParams {
    fn page_or_default(&self) -> i64 {
        self.page.unwrap_or(1).max(1)
    }
    fn page_size_or_default(&self) -> i64 {
        self.page_size.unwrap_or(20).clamp(1, 100)
    }
    fn offset(&self) -> i64 {
        (self.page_or_default() - 1) * self.page_size_or_default()
    }
    fn limit(&self) -> i64 {
        self.page_size_or_default()
    }
    fn normalized_sort_dir(&self) -> String {
        match self.sort_dir.as_deref() {
            Some("asc") => "asc".into(),
            _ => "desc".into(),
        }
    }
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/materials", get(list_materials).post(create_material))
        .route("/materials/import", post(import_materials))
        .route(
            "/materials/{id}",
            get(get_material)
                .put(update_material)
                .delete(delete_material),
        )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/materials",
    tag = "ERP",
    params(
        ("page" = Option<i64>, Query, description = "页码"),
        ("pagesize" = Option<i64>, Query, description = "每页数量"),
        ("search" = Option<String>, Query, description = "搜索关键词"),
        ("status" = Option<String>, Query, description = "状态过滤"),
        ("category" = Option<String>, Query, description = "分类过滤"),
    ),
    responses(
        (status = 200, description = "物料列表", body = ApiResponse<PaginatedResponse<Material>>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn list_materials(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<MaterialListParams>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<PaginatedResponse<Material>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    let page = params.page_or_default();
    let page_size = params.page_size_or_default();
    let offset = params.offset();

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();
    let category_filter = params.category.clone();

    let materials_result = if search_pattern.is_some()
        || status_filter.is_some()
        || category_filter.is_some()
    {
        let search = search_pattern.unwrap_or_default();
        let status = status_filter.clone();
        let category = category_filter.clone();

        sqlx::query_as::<_, Material>(
            only_own_schema_query!("erp", r#"SELECT id, code, name, specification, unit, category, brand, model, barcode, safety_stock::float8 AS safety_stock, unit_price::float8 AS unit_price, tax_rate::float8 AS tax_rate, description, status, created_at, updated_at
               FROM erp.materials
               WHERE (code ILIKE $1 OR name ILIKE $1 OR specification ILIKE $1)
                 AND ($2 = '' OR status = $2)
                 AND ($3 = '' OR category = $3)
               ORDER BY created_at DESC LIMIT $4 OFFSET $5"#)
        )
        .bind(search)
        .bind(status.unwrap_or_default())
        .bind(category.unwrap_or_default())
        .bind(page_size)
        .bind(offset)
        .fetch_all(&mut **txn)
        .await
    } else {
        sqlx::query_as::<_, Material>(
            only_own_schema_query!("erp", "SELECT id, code, name, specification, unit, category, brand, model, barcode, safety_stock::float8 AS safety_stock, unit_price::float8 AS unit_price, tax_rate::float8 AS tax_rate, description, status, created_at, updated_at FROM erp.materials ORDER BY created_at DESC LIMIT $1 OFFSET $2")
        )
        .bind(page_size)
        .bind(offset)
        .fetch_all(&mut **txn)
        .await
    };

    let materials = match materials_result {
        Ok(m) => m,
        Err(e) => {
            tracing::error!("查询物料失败: {}", e);
            return Json(api_error(500, "查询物料失败"));
        }
    };

    let total = match sqlx::query_scalar::<_, i64>(
        only_own_schema_query!("erp", r#"SELECT COUNT(*) FROM erp.materials WHERE deleted_at IS NULL AND (code ILIKE $1 OR name ILIKE $1 OR specification ILIKE $1) AND ($2 = '' OR status = $2) AND ($3 = '' OR category = $3)"#)
    )
    .bind(params.search.as_deref().map(|s| format!("%{}%", s)).unwrap_or_else(|| "%%".to_string()))
    .bind(status_filter.as_deref().unwrap_or(""))
    .bind(category_filter.as_deref().unwrap_or(""))
    .fetch_one(&mut **txn)
    .await
    {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("查询物料总数失败: {}", e);
            return Json(api_error(500, "查询物料总数失败"));
        }
    };

    Json(ApiResponse::success(
        PaginatedResponse::new(materials, total, page, page_size),
        "获取物料列表成功",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/materials/{id}",
    tag = "ERP",
    params(("id" = Uuid, Path, description = "物料ID")),
    responses((status = 200, description = "获取物料成功", body = ApiResponse<Material>))
)]
pub async fn get_material(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<Material>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    let result = sqlx::query_as::<_, Material>(
        only_own_schema_query!("erp", "SELECT id, code, name, specification, unit, category, brand, model, barcode, safety_stock::float8 AS safety_stock, unit_price::float8 AS unit_price, tax_rate::float8 AS tax_rate, description, status, created_at, updated_at FROM erp.materials WHERE deleted_at IS NULL AND id = $1"),
    )
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(material)) => Json(ApiResponse::success(material, "获取物料成功")),
        Ok(None) => Json(api_error(404, "物料不存在")),
        Err(e) => {
            tracing::error!("查询物料失败: {}", e);
            Json(api_error(500, "查询物料失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:master-data:write"])),
    path = "/erp/materials",
    tag = "ERP",
    request_body = CreateMaterialRequest,
    responses(
        (status = 200, description = "物料创建成功", body = ApiResponse<Material>),
        (status = 400, description = "请求参数错误"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn create_material(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(body): Json<CreateMaterialRequest>,
) -> Json<ApiResponse<Material>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let result = sqlx::query_as::<_, Material>(
        only_own_schema_query!("erp", "INSERT INTO erp.materials (code, name, specification, unit, category, brand, model, barcode, safety_stock, unit_price, tax_rate, description, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id, code, name, specification, unit, category, brand, model, barcode, safety_stock::float8 AS safety_stock, unit_price::float8 AS unit_price, tax_rate::float8 AS tax_rate, description, status, created_at, updated_at"),
    )
    .bind(body.code)
    .bind(body.name)
    .bind(body.specification)
    .bind(body.unit)
    .bind(body.category)
    .bind(body.brand)
    .bind(body.model)
    .bind(body.barcode)
    .bind(body.safety_stock.unwrap_or(0.0))
    .bind(body.unit_price.unwrap_or(0.0))
    .bind(body.tax_rate.unwrap_or(0.0))
    .bind(body.description)
    .bind(body.status.unwrap_or_else(|| "active".to_string()))
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(material)) => Json(ApiResponse::success(material, "创建物料成功")),
        Ok(None) => Json(api_error(500, "创建物料失败")),
        Err(e) => {
            tracing::error!("创建物料失败: {}", e);
            Json(api_error(500, "创建物料失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["erp:update"])),
    path = "/erp/materials/{id}",
    tag = "ERP",
    params(("id" = Uuid, Path, description = "物料ID")),
    request_body = UpdateMaterialRequest,
    responses((status = 200, description = "更新物料成功", body = ApiResponse<Material>))
)]
pub async fn update_material(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(body): Json<UpdateMaterialRequest>,
) -> Json<ApiResponse<Material>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let result = sqlx::query_as::<_, Material>(
        only_own_schema_query!("erp", "UPDATE erp.materials SET name = COALESCE($1, name), specification = COALESCE($2, specification), unit = COALESCE($3, unit), category = COALESCE($4, category), brand = COALESCE($5, brand), model = COALESCE($6, model), barcode = COALESCE($7, barcode), safety_stock = COALESCE($8, safety_stock), unit_price = COALESCE($9, unit_price), tax_rate = COALESCE($10, tax_rate), description = COALESCE($11, description), status = COALESCE($12, status), updated_at = NOW() WHERE id = $13 RETURNING id, code, name, specification, unit, category, brand, model, barcode, safety_stock::float8 AS safety_stock, unit_price::float8 AS unit_price, tax_rate::float8 AS tax_rate, description, status, created_at, updated_at"),
    )
    .bind(body.name)
    .bind(body.specification)
    .bind(body.unit)
    .bind(body.category)
    .bind(body.brand)
    .bind(body.model)
    .bind(body.barcode)
    .bind(body.safety_stock)
    .bind(body.unit_price)
    .bind(body.tax_rate)
    .bind(body.description)
    .bind(body.status)
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(material)) => Json(ApiResponse::success(material, "更新物料成功")),
        Ok(None) => Json(api_error(404, "物料不存在")),
        Err(e) => {
            tracing::error!("更新物料失败: {}", e);
            Json(api_error(500, "更新物料失败"))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["erp:delete"])),
    path = "/erp/materials/{id}",
    tag = "ERP",
    params(("id" = Uuid, Path, description = "物料ID")),
    responses((status = 200, description = "删除物料成功", body = ApiResponse<String>))
)]
pub async fn delete_material(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<String>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let result = sqlx::query(only_own_schema_query!(
        "erp",
        "UPDATE erp.materials SET deleted_at = NOW() WHERE id = $1"
    ))
    .bind(id)
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
            Json(ApiResponse::success("删除成功".to_string(), "删除物料成功"))
        }
        Ok(_) => Json(api_error(404, "物料不存在")),
        Err(e) => {
            tracing::error!("删除物料失败: {}", e);
            Json(api_error(500, "删除物料失败"))
        }
    }
}

#[derive(Debug, serde::Serialize)]
pub struct MaterialImportResult {
    pub succeeded: i64,
    pub failed: i64,
}

/// POST /materials/import —— 批量创建物料（JSON 数组，来自 RD 物料导入页）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/erp/materials/import",
    tag = "ERP",
    responses(
        (status = 200, description = "导入完成", body = ApiResponse<MaterialImportResult>),
        (status = 500, description = "导入失败"),
    ),
)]
pub async fn import_materials(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(body): Json<Vec<CreateMaterialRequest>>,
) -> Json<ApiResponse<MaterialImportResult>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let mut succeeded = 0i64;
    let mut failed = 0i64;
    for item in &body {
        if item.code.trim().is_empty() || item.name.trim().is_empty() {
            failed += 1;
            continue;
        }
        let result = sqlx::query(
            only_own_schema_query!("erp", "INSERT INTO erp.materials (code, name, specification, unit, category, brand, model, barcode, safety_stock, unit_price, tax_rate, description, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) ON CONFLICT (code) DO NOTHING"),
        )
        .bind(&item.code)
        .bind(&item.name)
        .bind(&item.specification)
        .bind(&item.unit)
        .bind(&item.category)
        .bind(&item.brand)
        .bind(&item.model)
        .bind(&item.barcode)
        .bind(item.safety_stock.unwrap_or(0.0))
        .bind(item.unit_price.unwrap_or(0.0))
        .bind(item.tax_rate.unwrap_or(0.0))
        .bind(&item.description)
        .bind(item.status.as_deref().unwrap_or("active"))
        .execute(&mut **txn)
        .await;
        match result {
            Ok(r) => {
                if r.rows_affected() > 0 {
                    succeeded += 1;
                } else {
                    failed += 1;
                }
            }
            Err(_) => failed += 1,
        }
    }

    Json(ApiResponse::success(
        MaterialImportResult { succeeded, failed },
        "物料导入完成",
    ))
}
