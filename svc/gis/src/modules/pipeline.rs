use crate::models::Pipeline;
use crate::shared::permission::{check_permission, GisPermission};
use axum::{
    extract::{Extension, Path, Query, State},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use topems_shared_auth::auth::Claims;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::ApiResponse;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePipeline {
    pub name: String,
    pub code: String,
    pub pipeline_type: String,
    pub path: serde_json::Value,
    pub status: Option<String>,
    pub description: Option<String>,
}

pub async fn list_pipelines(
    State(pool): State<PgPool>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page: i64 = params.get("page").and_then(|s| s.parse().ok()).unwrap_or(1);
    let page_size: i64 = params
        .get("page_size")
        .and_then(|s| s.parse().ok())
        .unwrap_or(20);
    let offset = (page - 1) * page_size;

    match sqlx::query_as::<_, Pipeline>(
        only_own_schema_query!("gis", "id, tenant_id, map_id, name, code, pipeline_type, path, properties, status, created_at, updated_at FROM gis.pipelines ORDER BY created_at DESC LIMIT $1 OFFSET $2"),
    )
    .bind(page_size)
    .bind(offset)
    .fetch_all(&pool)
    .await
    {
        Ok(pipelines) => {
            let total: i64 = sqlx::query(only_own_schema_query!("gis", "SELECT COUNT(*) FROM gis.pipelines WHERE deleted_at IS NULL"))
                .fetch_one(&pool)
                .await
                .map(|row| row.get::<i64, _>(0))
                .unwrap_or(0);
            Json(ApiResponse::success(
                serde_json::json!({
                    "pipelines": pipelines,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取管道列表成功",
            ))
        }
        Err(e) => Json(ApiResponse::error(500, &format!("数据库查询失败: {}", e))),
    }
}

pub async fn create_pipeline(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CreatePipeline>,
) -> Json<ApiResponse<Pipeline>> {
    if let Err(e) = check_permission(&pool, &claims, &GisPermission::PipelineWrite).await {
        return e;
    }
    let status = payload.status.unwrap_or_else(|| "active".to_string());
    match sqlx::query_as::<_, Pipeline>(only_own_schema_query!(
        "gis",
        r#"
        INSERT INTO gis.pipelines (name, code, pipeline_type, path, status, description)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
        "#
    ))
    .bind(&payload.name)
    .bind(&payload.code)
    .bind(&payload.pipeline_type)
    .bind(&payload.path)
    .bind(&status)
    .bind(&payload.description)
    .fetch_one(&pool)
    .await
    {
        Ok(pipeline) => Json(ApiResponse::success(pipeline, "创建管道成功")),
        Err(e) => Json(ApiResponse::error(500, &format!("数据库插入失败: {}", e))),
    }
}

pub async fn get_pipeline(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Pipeline>> {
    match sqlx::query_as::<_, Pipeline>(
        only_own_schema_query!("gis", "id, tenant_id, map_id, name, code, pipeline_type, path, properties, status, created_at, updated_at FROM gis.pipelines WHERE deleted_at IS NULL AND id = $1"),
    )
    .bind(id)
    .fetch_one(&pool)
    .await
    {
        Ok(pipeline) => Json(ApiResponse::success(pipeline, "获取管道成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "管道未找到")),
        Err(e) => Json(ApiResponse::error(500, &format!("数据库查询失败: {}", e))),
    }
}

pub async fn update_pipeline(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<CreatePipeline>,
) -> Json<ApiResponse<Pipeline>> {
    if let Err(e) = check_permission(&pool, &claims, &GisPermission::PipelineWrite).await {
        return e;
    }
    let status = payload.status.unwrap_or_else(|| "active".to_string());
    match sqlx::query_as::<_, Pipeline>(
        only_own_schema_query!("gis", r#"
        UPDATE gis.pipelines 
        SET name = $1, code = $2, pipeline_type = $3, path = $4, status = $5, description = $6, updated_at = NOW()
        WHERE id = $7
        RETURNING *
        "#),
    )
    .bind(&payload.name)
    .bind(&payload.code)
    .bind(&payload.pipeline_type)
    .bind(&payload.path)
    .bind(&status)
    .bind(&payload.description)
    .bind(id)
    .fetch_one(&pool)
    .await
    {
        Ok(pipeline) => Json(ApiResponse::success(pipeline, "更新管道成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "管道未找到")),
        Err(e) => Json(ApiResponse::error(500, &format!("数据库更新失败: {}", e))),
    }
}

pub async fn delete_pipeline(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    if let Err(e) = check_permission(&pool, &claims, &GisPermission::PipelineWrite).await {
        return e;
    }
    match sqlx::query(only_own_schema_query!(
        "gis",
        "UPDATE gis.pipelines SET deleted_at = NOW() WHERE id = $1"
    ))
    .bind(id)
    .execute(&pool)
    .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                Json(ApiResponse::success(true, "删除管道成功"))
            } else {
                Json(ApiResponse::error(404, "管道未找到"))
            }
        }
        Err(e) => Json(ApiResponse::error(500, &format!("数据库删除失败: {}", e))),
    }
}

pub async fn list_pipelines_by_map(
    State(pool): State<PgPool>,
    Path(map_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    match sqlx::query_as::<_, Pipeline>(
        only_own_schema_query!("gis", "id, tenant_id, map_id, name, code, pipeline_type, path, properties, status, created_at, updated_at FROM gis.pipelines WHERE deleted_at IS NULL AND map_id = $1 ORDER BY created_at DESC"),
    )
    .bind(map_id)
    .fetch_all(&pool)
    .await
    {
        Ok(pipelines) => Json(ApiResponse::success(
            serde_json::json!({
                "pipelines": pipelines,
                "total": pipelines.len()
            }),
            "获取管道列表成功",
        )),
        Err(e) => Json(ApiResponse::error(500, &format!("数据库查询失败: {}", e))),
    }
}

pub fn create_routes() -> Router<PgPool> {
    Router::new()
        .route("/pipelines", axum::routing::get(list_pipelines))
        .route("/pipelines", axum::routing::post(create_pipeline))
        .route("/pipelines/{id}", axum::routing::get(get_pipeline))
        .route("/pipelines/{id}", axum::routing::put(update_pipeline))
        .route("/pipelines/{id}", axum::routing::delete(delete_pipeline))
        .route(
            "/pipelines/map/{map_id}",
            axum::routing::get(list_pipelines_by_map),
        )
}
