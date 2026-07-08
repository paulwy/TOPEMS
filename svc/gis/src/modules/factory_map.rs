use crate::models::FactoryMap;
use crate::shared::permission::{check_permission, GisPermission};
use axum::{
    extract::{Extension, Path, State},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use topems_shared::{auth::Claims, ApiResponse};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateFactoryMap {
    pub name: String,
    pub code: String,
    pub map_type: String,
    pub file_url: String,
    pub bounds: Option<serde_json::Value>,
    pub description: Option<String>,
}

pub async fn list_factory_maps(State(pool): State<PgPool>) -> Json<ApiResponse<serde_json::Value>> {
    match sqlx::query_as::<_, FactoryMap>("SELECT * FROM factory_maps ORDER BY created_at DESC")
        .fetch_all(&pool)
        .await
    {
        Ok(maps) => Json(ApiResponse::success(
            serde_json::json!({
                "factory_maps": maps,
                "total": maps.len()
            }),
            "获取厂区地图列表成功",
        )),
        Err(e) => Json(ApiResponse::error(500, &format!("数据库查询失败: {}", e))),
    }
}

pub async fn create_factory_map(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CreateFactoryMap>,
) -> Json<ApiResponse<FactoryMap>> {
    if let Err(e) = check_permission(&pool, &claims, &GisPermission::FactoryMapWrite).await {
        return e;
    }
    match sqlx::query_as::<_, FactoryMap>(
        r#"
        INSERT INTO factory_maps (name, code, map_type, file_url, bounds, description)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
        "#,
    )
    .bind(&payload.name)
    .bind(&payload.code)
    .bind(&payload.map_type)
    .bind(&payload.file_url)
    .bind(&payload.bounds)
    .bind(&payload.description)
    .fetch_one(&pool)
    .await
    {
        Ok(map) => Json(ApiResponse::success(map, "创建厂区地图成功")),
        Err(e) => Json(ApiResponse::error(500, &format!("数据库插入失败: {}", e))),
    }
}

pub async fn get_factory_map(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<FactoryMap>> {
    match sqlx::query_as::<_, FactoryMap>("SELECT * FROM factory_maps WHERE id = $1")
        .bind(id)
        .fetch_one(&pool)
        .await
    {
        Ok(map) => Json(ApiResponse::success(map, "获取厂区地图成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "厂区地图未找到")),
        Err(e) => Json(ApiResponse::error(500, &format!("数据库查询失败: {}", e))),
    }
}

pub async fn update_factory_map(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<CreateFactoryMap>,
) -> Json<ApiResponse<FactoryMap>> {
    if let Err(e) = check_permission(&pool, &claims, &GisPermission::FactoryMapWrite).await {
        return e;
    }
    match sqlx::query_as::<_, FactoryMap>(
        r#"
        UPDATE factory_maps 
        SET name = $1, code = $2, map_type = $3, file_url = $4, bounds = $5, description = $6, updated_at = NOW()
        WHERE id = $7
        RETURNING *
        "#,
    )
    .bind(&payload.name)
    .bind(&payload.code)
    .bind(&payload.map_type)
    .bind(&payload.file_url)
    .bind(&payload.bounds)
    .bind(&payload.description)
    .bind(id)
    .fetch_one(&pool)
    .await
    {
        Ok(map) => Json(ApiResponse::success(map, "更新厂区地图成功")),
        Err(sqlx::Error::RowNotFound) => {
            Json(ApiResponse::error(404, "厂区地图未找到"))
        }
        Err(e) => Json(ApiResponse::error(
            500,
            &format!("数据库更新失败: {}", e),
        )),
    }
}

pub async fn delete_factory_map(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    if let Err(e) = check_permission(&pool, &claims, &GisPermission::FactoryMapWrite).await {
        return e;
    }
    match sqlx::query("DELETE FROM factory_maps WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                Json(ApiResponse::success(true, "删除厂区地图成功"))
            } else {
                Json(ApiResponse::error(404, "厂区地图未找到"))
            }
        }
        Err(e) => Json(ApiResponse::error(500, &format!("数据库删除失败: {}", e))),
    }
}

pub fn create_routes() -> Router<PgPool> {
    Router::new()
        .route("/factory-maps", axum::routing::get(list_factory_maps))
        .route("/factory-maps", axum::routing::post(create_factory_map))
        .route("/factory-maps/:id", axum::routing::get(get_factory_map))
        .route("/factory-maps/:id", axum::routing::put(update_factory_map))
        .route(
            "/factory-maps/:id",
            axum::routing::delete(delete_factory_map),
        )
}
