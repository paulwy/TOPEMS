// ERP · 资产分类管理模块
//
// 第一批-② 前后端对应性修复：前端 assetCategoryApi（apps/web/src/api/asset/assetCategory.ts）
// 契约 5 方法（list/get/create/update/delete），此前后端无路由（审计 P0）。
// 表：erp.asset_categories（迁移 20260908000002）
// 注意：前端契约字段为驼峰 parentId，响应层将 parent_id 映射为 parentId。

use axum::{
    extract::{Extension, Path, Query, State},
    http::{HeaderMap, StatusCode},
    routing::get,
    Json, Router,
};
use serde::Deserialize;
use sqlx::Row;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::locale::Locale;
use topems_shared_core::response::ApiResponse;
use uuid::Uuid;

use super::ApiState;

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route(
            "/asset-categories",
            get(list_asset_categories).post(create_asset_category),
        )
        .route(
            "/asset-categories/{id}",
            get(get_asset_category)
                .put(update_asset_category)
                .delete(delete_asset_category),
        )
}

#[derive(Debug, Deserialize)]
pub struct ListAssetCategoriesQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct CreateAssetCategoryRequest {
    pub name: String,
    pub name_en: Option<String>,
    pub code: String,
    #[serde(rename = "parentId")]
    pub parent_id: Option<Uuid>,
    pub description: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct UpdateAssetCategoryRequest {
    pub name: Option<String>,
    pub name_en: Option<String>,
    pub code: Option<String>,
    #[serde(rename = "parentId")]
    pub parent_id: Option<Uuid>,
    pub description: Option<String>,
    pub status: Option<String>,
}

fn internal_error(msg: &str) -> (StatusCode, ApiResponse<serde_json::Value>) {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        ApiResponse::server_error(msg),
    )
}

fn row_to_json(row: &sqlx::postgres::PgRow) -> serde_json::Value {
    serde_json::json!({
        "id": row.get::<Uuid, _>("id").to_string(),
        "name": row.get::<String, _>("name"),
        "code": row.get::<String, _>("code"),
        "parentId": row.get::<Option<Uuid>, _>("parent_id").map(|v| v.to_string()),
        "description": row.get::<Option<String>, _>("description"),
        "status": row.get::<String, _>("status"),
        "created_at": row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("created_at"),
        "updated_at": row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("updated_at"),
    })
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/asset-categories",
    responses(
        (status = 200, description = "list_asset_categories OK")
    ),
    tag = "ERP/asset_category"
)]

pub async fn list_asset_categories(
    State(_state): State<ApiState>,
    Query(params): Query<ListAssetCategoriesQuery>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> Result<ApiResponse<serde_json::Value>, (StatusCode, ApiResponse<serde_json::Value>)> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;

    // 静态 SQL + $N::text IS NULL OR 模式（schema 边界宏要求字符串字面量）
    let status = params.status.clone();
    let search = params.search.clone();

    let total: i64 = match sqlx::query(only_own_schema_query!(
        "erp",
        "SELECT COUNT(*) FROM erp.asset_categories \
         WHERE deleted_at IS NULL \
           AND ($1::text IS NULL OR status = $1) \
           AND ($2::text IS NULL OR name ILIKE '%' || $2 || '%' \
             OR code ILIKE '%' || $2 || '%')"
    ))
    .bind(&status)
    .bind(&search)
    .fetch_one(&mut **txn)
    .await
    {
        Ok(row) => row.get::<i64, _>(0),
        Err(e) => {
            tracing::error!("统计资产分类失败: {}", e);
            return Err(internal_error("统计资产分类失败"));
        }
    };

    let rows = match sqlx::query(only_own_schema_query!(
        "erp",
        "SELECT id, CASE WHEN $5 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, \
                code, parent_id, description, status, created_at, updated_at \
         FROM erp.asset_categories \
         WHERE deleted_at IS NULL \
           AND ($1::text IS NULL OR status = $1) \
           AND ($2::text IS NULL OR name ILIKE '%' || $2 || '%' \
             OR code ILIKE '%' || $2 || '%') \
         ORDER BY created_at DESC LIMIT $3 OFFSET $4"
    ))
    .bind(&status)
    .bind(&search)
    .bind(page_size)
    .bind(offset)
    .bind(Locale::from_headers(&headers).as_sql())
    .fetch_all(&mut **txn)
    .await
    {
        Ok(rows) => rows,
        Err(e) => {
            tracing::error!("查询资产分类失败: {}", e);
            return Err(internal_error("查询资产分类失败"));
        }
    };

    let items: Vec<serde_json::Value> = rows.iter().map(row_to_json).collect();

    Ok(ApiResponse::success(
        serde_json::json!({ "items": items, "total": total, "page": page, "page_size": page_size }),
        "获取资产分类列表成功",
    ))
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/asset-categories/{id}",
    params(
        ("id" = Uuid, Path, description = "id")
    ),
    responses(
        (status = 200, description = "get_asset_category OK")
    ),
    tag = "ERP/asset_category"
)]

pub async fn get_asset_category(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> Result<ApiResponse<serde_json::Value>, (StatusCode, ApiResponse<serde_json::Value>)> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    let row = match sqlx::query(only_own_schema_query!(
        "erp",
        "SELECT id, CASE WHEN $2 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, \
                code, parent_id, description, status, created_at, updated_at \
         FROM erp.asset_categories WHERE id = $1 AND deleted_at IS NULL"
    ))
    .bind(id)
    .bind(Locale::from_headers(&headers).as_sql())
    .fetch_optional(&mut **txn)
    .await
    {
        Ok(Some(row)) => row,
        Ok(None) => {
            return Ok(ApiResponse::not_found("资产分类不存在"));
        }
        Err(e) => {
            tracing::error!("查询资产分类失败: {}", e);
            return Err(internal_error("查询资产分类失败"));
        }
    };

    Ok(ApiResponse::success(row_to_json(&row), "获取资产分类成功"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/asset-categories",
    tag = "ERP",
    request_body = CreateAssetCategoryRequest,
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad Request"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn create_asset_category(
    State(_state): State<ApiState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    headers: HeaderMap,
    Json(req): Json<CreateAssetCategoryRequest>,
) -> Result<ApiResponse<serde_json::Value>, (StatusCode, ApiResponse<serde_json::Value>)> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    let status = req.status.unwrap_or_else(|| "active".to_string());

    let row = match sqlx::query(only_own_schema_query!(
        "erp",
        "INSERT INTO erp.asset_categories (name, code, parent_id, description, status, name_en) \
         VALUES ($1, $2, $3, $4, $5, $6) \
         RETURNING id, CASE WHEN $7 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, \
                  code, parent_id, description, status, created_at, updated_at"
    ))
    .bind(&req.name)
    .bind(&req.code)
    .bind(req.parent_id)
    .bind(&req.description)
    .bind(&status)
    .bind(&req.name_en)
    .bind(Locale::from_headers(&headers).as_sql())
    .fetch_one(&mut **txn)
    .await
    {
        Ok(row) => row,
        Err(e) => {
            tracing::error!("创建资产分类失败: {}", e);
            return Err(internal_error("创建资产分类失败"));
        }
    };

    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("事务提交失败: {}", e);
            return Ok(ApiResponse::server_error("事务提交失败"));
        }
    }
    Ok(ApiResponse::success(row_to_json(&row), "创建资产分类成功"))
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["erp:write"])),
    path = "/asset-categories/{id}",
    tag = "ERP",
    request_body = UpdateAssetCategoryRequest,
    params(("id" = Uuid, Path, description = "")),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad Request"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn update_asset_category(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<UpdateAssetCategoryRequest>,
) -> Result<ApiResponse<serde_json::Value>, (StatusCode, ApiResponse<serde_json::Value>)> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    let row = match sqlx::query(only_own_schema_query!(
        "erp",
        "UPDATE erp.asset_categories SET \
         name = COALESCE($2, name), \
         code = COALESCE($3, code), \
         parent_id = COALESCE($4, parent_id), \
         description = COALESCE($5, description), \
         status = COALESCE($6, status), \
         name_en = COALESCE($7, name_en), \
         updated_at = NOW() \
         WHERE id = $1 AND deleted_at IS NULL \
         RETURNING id, CASE WHEN $8 = 'en' THEN COALESCE(name_en, name) ELSE name END AS name, \
                  code, parent_id, description, status, created_at, updated_at"
    ))
    .bind(id)
    .bind(&req.name)
    .bind(&req.code)
    .bind(req.parent_id)
    .bind(&req.description)
    .bind(&req.status)
    .bind(&req.name_en)
    .bind(Locale::from_headers(&headers).as_sql())
    .fetch_optional(&mut **txn)
    .await
    {
        Ok(Some(row)) => row,
        Ok(None) => {
            return Ok(ApiResponse::not_found("资产分类不存在"));
        }
        Err(e) => {
            tracing::error!("更新资产分类失败: {}", e);
            return Err(internal_error("更新资产分类失败"));
        }
    };

    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("事务提交失败: {}", e);
            return Ok(ApiResponse::server_error("事务提交失败"));
        }
    }
    Ok(ApiResponse::success(row_to_json(&row), "更新资产分类成功"))
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["erp:write"])),
    path = "/asset-categories/{id}",
    tag = "ERP",
    params(("id" = Uuid, Path, description = "")),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad Request"),
        (status = 404, description = "Not Found"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn delete_asset_category(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> Result<ApiResponse<serde_json::Value>, (StatusCode, ApiResponse<serde_json::Value>)> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    let result = sqlx::query(only_own_schema_query!(
        "erp",
        "UPDATE erp.asset_categories SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL"
    ))
    .bind(id)
    .execute(&mut **txn)
    .await;

    match result {
        Ok(res) => {
            if res.rows_affected() == 0 {
                return Ok(ApiResponse::not_found("资产分类不存在"));
            }
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return Err((
                        StatusCode::INTERNAL_SERVER_ERROR,
                        ApiResponse::server_error("事务提交失败"),
                    ));
                }
            }
            Ok(ApiResponse::success(
                serde_json::json!({ "deleted": true, "id": id.to_string() }),
                "删除资产分类成功",
            ))
        }
        Err(e) => {
            tracing::error!("删除资产分类失败: {}", e);
            Err(internal_error("删除资产分类失败"))
        }
    }
}
