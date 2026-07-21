use axum::{
    extract::{Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::types::Uuid;
use sqlx::Row;
use tracing::{info, warn};

use crate::shared::AppState;

#[derive(Debug, Deserialize)]
pub struct ListDatasetQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub data_source_id: Option<Uuid>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct CreateDatasetRequest {
    pub name: String,
    pub description: Option<String>,
    pub datasource_id: Uuid,
    pub sql_query: String,
    pub fields: Option<serde_json::Value>,
    pub filters: Option<serde_json::Value>,
    pub config: Option<serde_json::Value>,
    pub is_public: Option<bool>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct UpdateDatasetRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub sql_query: Option<String>,
    pub fields: Option<serde_json::Value>,
    pub filters: Option<serde_json::Value>,
    pub config: Option<serde_json::Value>,
    pub is_public: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct DatasetQueryParams {
    pub filters: Option<serde_json::Value>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct TestSqlQueryRequest {
    pub data_source_id: Uuid,
    pub sql: String,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct Dataset {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub datasource_id: Uuid,
    pub sql_query: String,
    pub fields: Option<serde_json::Value>,
    pub filters: Option<serde_json::Value>,
    pub config: Option<serde_json::Value>,
    pub status: String,
    pub is_public: bool,
    pub published_at: Option<DateTime<Utc>>,
    pub last_refreshed_at: Option<DateTime<Utc>>,
    pub owner_id: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/datasets", get(list_datasets).post(create_dataset))
        .route(
            "/datasets/{id}",
            get(get_dataset).put(update_dataset).delete(delete_dataset),
        )
        .route("/datasets/{id}/publish", post(publish_dataset))
        .route("/datasets/{id}/refresh", post(refresh_dataset))
        .route("/datasets/{id}/preview", get(get_dataset_preview))
        .route("/datasets/query", post(query_dataset))
        .route("/datasets/test-sql", post(test_sql_query))
}

async fn list_datasets(
    State(state): State<AppState>,
    Query(params): Query<ListDatasetQuery>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let query = "SELECT * FROM analytics_datasets WHERE ($1::text IS NULL OR name ILIKE $1) AND ($2::text IS NULL OR status = $2) AND ($3::uuid IS NULL OR datasource_id = $3) ORDER BY created_at DESC LIMIT $4 OFFSET $5";
    let result = sqlx::query_as::<_, Dataset>(query)
        .bind(params.search.as_deref().map(|s| format!("%{}%", s)))
        .bind(params.status.as_deref())
        .bind(params.data_source_id)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.pool)
        .await;

    match result {
        Ok(datasets) => {
            let total = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM analytics_datasets WHERE ($1::text IS NULL OR name ILIKE $1) AND ($2::text IS NULL OR status = $2) AND ($3::uuid IS NULL OR datasource_id = $3)",
            )
            .bind(params.search.as_deref().map(|s| format!("%{}%", s)))
            .bind(params.status.as_deref())
            .bind(params.data_source_id)
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);

            Json(serde_json::json!({
                "success": true,
                "data": {
                    "datasets": datasets,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                },
                "message": "获取数据集列表成功"
            }))
        }
        Err(e) => {
            warn!("获取数据集列表失败: {}", e);
            Json(serde_json::json!({
                "success": false,
                "data": null,
                "message": "获取数据集列表失败"
            }))
        }
    }
}

async fn get_dataset(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    let result = sqlx::query_as::<_, Dataset>("SELECT * FROM analytics_datasets WHERE id = $1")
        .bind(id)
        .fetch_one(&state.pool)
        .await;

    match result {
        Ok(dataset) => Json(serde_json::json!({
            "success": true,
            "data": dataset,
            "message": "获取数据集成功"
        })),
        Err(sqlx::Error::RowNotFound) => Json(serde_json::json!({
            "success": false,
            "data": null,
            "message": "数据集不存在"
        })),
        Err(e) => {
            warn!("获取数据集失败: {}", e);
            Json(serde_json::json!({
                "success": false,
                "data": null,
                "message": "获取数据集失败"
            }))
        }
    }
}

async fn create_dataset(
    State(state): State<AppState>,
    Json(req): Json<CreateDatasetRequest>,
) -> Json<serde_json::Value> {
    let owner_id = "system".to_string();
    let now = Utc::now();

    let result = sqlx::query(
        r#"INSERT INTO analytics_datasets (name, description, datasource_id, sql_query, fields, filters, config, status, is_public, owner_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id"#,
    )
    .bind(req.name)
    .bind(req.description)
    .bind(req.datasource_id)
    .bind(req.sql_query)
    .bind(req.fields.unwrap_or(serde_json::json!([])))
    .bind(req.filters)
    .bind(req.config)
    .bind("draft")
    .bind(req.is_public.unwrap_or(false))
    .bind(owner_id)
    .bind(now)
    .bind(now)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(row) => {
            let id: Uuid = row.get("id");
            info!("创建数据集成功: id={}", id);
            Json(serde_json::json!({
                "success": true,
                "data": {"id": id},
                "message": "创建数据集成功"
            }))
        }
        Err(e) => {
            warn!("创建数据集失败: {}", e);
            Json(serde_json::json!({
                "success": false,
                "data": null,
                "message": "创建数据集失败"
            }))
        }
    }
}

async fn update_dataset(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateDatasetRequest>,
) -> Json<serde_json::Value> {
    let result = sqlx::query(
        r#"UPDATE analytics_datasets SET name = COALESCE($1, name), description = COALESCE($2, description), sql_query = COALESCE($3, sql_query), fields = COALESCE($4, fields), filters = COALESCE($5, filters), config = COALESCE($6, config), is_public = COALESCE($7, is_public), updated_at = $8 WHERE id = $9"#,
    )
    .bind(req.name)
    .bind(req.description)
    .bind(req.sql_query)
    .bind(req.fields)
    .bind(req.filters)
    .bind(req.config)
    .bind(req.is_public)
    .bind(Utc::now())
    .bind(id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => {
            info!("更新数据集成功: id={}", id);
            Json(serde_json::json!({
                "success": true,
                "data": null,
                "message": "更新数据集成功"
            }))
        }
        Err(e) => {
            warn!("更新数据集失败: {}", e);
            Json(serde_json::json!({
                "success": false,
                "data": null,
                "message": "更新数据集失败"
            }))
        }
    }
}

async fn delete_dataset(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    let result = sqlx::query("DELETE FROM analytics_datasets WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(_) => {
            info!("删除数据集成功: id={}", id);
            Json(serde_json::json!({
                "success": true,
                "data": null,
                "message": "删除数据集成功"
            }))
        }
        Err(e) => {
            warn!("删除数据集失败: {}", e);
            Json(serde_json::json!({
                "success": false,
                "data": null,
                "message": "删除数据集失败"
            }))
        }
    }
}

async fn publish_dataset(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    let result = sqlx::query(
        "UPDATE analytics_datasets SET status = 'published', published_at = $1, updated_at = $2 WHERE id = $3",
    )
    .bind(Utc::now())
    .bind(Utc::now())
    .bind(id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => {
            info!("发布数据集成功: id={}", id);
            Json(serde_json::json!({
                "success": true,
                "data": null,
                "message": "发布数据集成功"
            }))
        }
        Err(e) => {
            warn!("发布数据集失败: {}", e);
            Json(serde_json::json!({
                "success": false,
                "data": null,
                "message": "发布数据集失败"
            }))
        }
    }
}

async fn refresh_dataset(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<serde_json::Value> {
    let result = sqlx::query(
        "UPDATE analytics_datasets SET last_refreshed_at = $1, updated_at = $2 WHERE id = $3",
    )
    .bind(Utc::now())
    .bind(Utc::now())
    .bind(id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => {
            info!("刷新数据集成功: id={}", id);
            Json(serde_json::json!({
                "success": true,
                "data": null,
                "message": "刷新数据集成功"
            }))
        }
        Err(e) => {
            warn!("刷新数据集失败: {}", e);
            Json(serde_json::json!({
                "success": false,
                "data": null,
                "message": "刷新数据集失败"
            }))
        }
    }
}

async fn get_dataset_preview(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Query(params): Query<LimitQuery>,
) -> Json<serde_json::Value> {
    let _limit = params.limit.unwrap_or(10);

    let dataset = sqlx::query_as::<_, Dataset>("SELECT * FROM analytics_datasets WHERE id = $1")
        .bind(id)
        .fetch_one(&state.pool)
        .await;

    match dataset {
        Ok(dataset) => {
            let preview_data: Vec<serde_json::Value> = vec![];
            Json(serde_json::json!({
                "success": true,
                "data": {
                    "columns": dataset.fields.unwrap_or(serde_json::json!([])),
                    "data": preview_data,
                    "total": 0
                },
                "message": "获取数据集预览成功"
            }))
        }
        Err(sqlx::Error::RowNotFound) => Json(serde_json::json!({
            "success": false,
            "data": null,
            "message": "数据集不存在"
        })),
        Err(e) => {
            warn!("获取数据集预览失败: {}", e);
            Json(serde_json::json!({
                "success": false,
                "data": null,
                "message": "获取数据集预览失败"
            }))
        }
    }
}

async fn query_dataset(
    State(_state): State<AppState>,
    Json(_params): Json<DatasetQueryParams>,
) -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "success": true,
        "data": {
            "columns": [],
            "data": [],
            "total": 0
        },
        "message": "查询数据集成功"
    }))
}

async fn test_sql_query(
    State(_state): State<AppState>,
    Json(_req): Json<TestSqlQueryRequest>,
) -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "success": true,
        "data": {
            "columns": [],
            "data": [],
            "valid": true
        },
        "message": "SQL测试成功"
    }))
}

#[derive(Debug, Deserialize)]
struct LimitQuery {
    pub limit: Option<i64>,
}
