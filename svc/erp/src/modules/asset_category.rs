// ERP · 资产分类管理模块
//
// 第一批-② 前后端对应性修复：前端 assetCategoryApi（apps/web/src/api/asset/assetCategory.ts）
// 契约 5 方法（list/get/create/update/delete），此前后端无路由（审计 P0）。
// 表：erp.asset_categories（迁移 20260908000002）
// 注意：前端契约字段为驼峰 parentId，响应层将 parent_id 映射为 parentId。

use axum::{
    extract::{Extension, Path, Query, State},
    http::StatusCode,
    routing::get,
    Json, Router,
};
use serde::Deserialize;
use sqlx::Row;
use topems_shared_boundary::only_own_schema_query;
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
    pub pagesize: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateAssetCategoryRequest {
    pub name: String,
    pub code: String,
    #[serde(rename = "parentId")]
    pub parent_id: Option<Uuid>,
    pub description: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateAssetCategoryRequest {
    pub name: Option<String>,
    pub code: Option<String>,
    #[serde(rename = "parentId")]
    pub parent_id: Option<Uuid>,
    pub description: Option<String>,
    pub status: Option<String>,
}

fn internal_error(msg: &str) -> (StatusCode, Json<ApiResponse<serde_json::Value>>) {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(ApiResponse::error(500, msg)),
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

pub async fn list_asset_categories(
    State(_state): State<ApiState>,
    Query(params): Query<ListAssetCategoriesQuery>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Result<Json<ApiResponse<serde_json::Value>>, (StatusCode, Json<ApiResponse<serde_json::Value>>)>
{
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let page = params.page.unwrap_or(1).max(1);
    let pagesize = params.pagesize.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * pagesize;

    // 静态 SQL + $N::text IS NULL OR 模式（schema 边界宏要求字符串字面量）
    let status = params.status.clone();
    let search = params.search.clone();

    let total: i64 = match sqlx::query(only_own_schema_query!(
        "erp",
        "SELECT COUNT(*) FROM erp.asset_categories \
         WHERE ($1::text IS NULL OR status = $1) \
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
        "SELECT id, name, code, parent_id, description, status, created_at, updated_at \
         FROM erp.asset_categories \
         WHERE ($1::text IS NULL OR status = $1) \
           AND ($2::text IS NULL OR name ILIKE '%' || $2 || '%' \
             OR code ILIKE '%' || $2 || '%') \
         ORDER BY created_at DESC LIMIT $3 OFFSET $4"
    ))
    .bind(&status)
    .bind(&search)
    .bind(pagesize)
    .bind(offset)
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

    Ok(Json(ApiResponse::success(
        serde_json::json!({ "items": items, "total": total, "page": page, "pagesize": pagesize }),
        "获取资产分类列表成功",
    )))
}

pub async fn get_asset_category(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Result<Json<ApiResponse<serde_json::Value>>, (StatusCode, Json<ApiResponse<serde_json::Value>>)>
{
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let row = match sqlx::query(only_own_schema_query!(
        "erp",
        "SELECT id, name, code, parent_id, description, status, created_at, updated_at \
         FROM erp.asset_categories WHERE id = $1"
    ))
    .bind(id)
    .fetch_optional(&mut **txn)
    .await
    {
        Ok(Some(row)) => row,
        Ok(None) => {
            return Err((
                StatusCode::NOT_FOUND,
                Json(ApiResponse::error(404, "资产分类不存在")),
            ))
        }
        Err(e) => {
            tracing::error!("查询资产分类失败: {}", e);
            return Err(internal_error("查询资产分类失败"));
        }
    };

    Ok(Json(ApiResponse::success(
        row_to_json(&row),
        "获取资产分类成功",
    )))
}

pub async fn create_asset_category(
    State(_state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CreateAssetCategoryRequest>,
) -> Result<Json<ApiResponse<serde_json::Value>>, (StatusCode, Json<ApiResponse<serde_json::Value>>)>
{
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let status = req.status.unwrap_or_else(|| "active".to_string());

    let row = match sqlx::query(only_own_schema_query!(
        "erp",
        "INSERT INTO erp.asset_categories (name, code, parent_id, description, status) \
         VALUES ($1, $2, $3, $4, $5) \
         RETURNING id, name, code, parent_id, description, status, created_at, updated_at"
    ))
    .bind(&req.name)
    .bind(&req.code)
    .bind(&req.parent_id)
    .bind(&req.description)
    .bind(&status)
    .fetch_one(&mut **txn)
    .await
    {
        Ok(row) => row,
        Err(e) => {
            tracing::error!("创建资产分类失败: {}", e);
            return Err(internal_error("创建资产分类失败"));
        }
    };

    Ok(Json(ApiResponse::success(
        row_to_json(&row),
        "创建资产分类成功",
    )))
}

pub async fn update_asset_category(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<UpdateAssetCategoryRequest>,
) -> Result<Json<ApiResponse<serde_json::Value>>, (StatusCode, Json<ApiResponse<serde_json::Value>>)>
{
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let row = match sqlx::query(only_own_schema_query!(
        "erp",
        "UPDATE erp.asset_categories SET \
         name = COALESCE($2, name), \
         code = COALESCE($3, code), \
         parent_id = COALESCE($4, parent_id), \
         description = COALESCE($5, description), \
         status = COALESCE($6, status), \
         updated_at = NOW() \
         WHERE id = $1 \
         RETURNING id, name, code, parent_id, description, status, created_at, updated_at"
    ))
    .bind(id)
    .bind(&req.name)
    .bind(&req.code)
    .bind(&req.parent_id)
    .bind(&req.description)
    .bind(&req.status)
    .fetch_optional(&mut **txn)
    .await
    {
        Ok(Some(row)) => row,
        Ok(None) => {
            return Err((
                StatusCode::NOT_FOUND,
                Json(ApiResponse::error(404, "资产分类不存在")),
            ))
        }
        Err(e) => {
            tracing::error!("更新资产分类失败: {}", e);
            return Err(internal_error("更新资产分类失败"));
        }
    };

    Ok(Json(ApiResponse::success(
        row_to_json(&row),
        "更新资产分类成功",
    )))
}

pub async fn delete_asset_category(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Result<Json<ApiResponse<serde_json::Value>>, (StatusCode, Json<ApiResponse<serde_json::Value>>)>
{
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query(only_own_schema_query!(
        "erp",
        "DELETE FROM erp.asset_categories WHERE id = $1"
    ))
    .bind(id)
    .execute(&mut **txn)
    .await;

    match result {
        Ok(res) => {
            if res.rows_affected() == 0 {
                return Err((
                    StatusCode::NOT_FOUND,
                    Json(ApiResponse::error(404, "资产分类不存在")),
                ));
            }
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return Err((
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(ApiResponse::error(500, "事务提交失败")),
                    ));
                }
            }
            Ok(Json(ApiResponse::success(
                serde_json::json!({ "deleted": true, "id": id.to_string() }),
                "删除资产分类成功",
            )))
        }
        Err(e) => {
            tracing::error!("删除资产分类失败: {}", e);
            Err(internal_error("删除资产分类失败"))
        }
    }
}
