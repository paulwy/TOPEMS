//! Master-data 主数据管理模块 API 处理器

use axum::{
    extract::{Query, State},
    Json,
};
use serde::Deserialize;
use sqlx::Row;

use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct ListParams {
    #[serde(default)]
    pub page: Option<u32>,
    #[serde(default)]
    pub page_size: Option<u32>,
}

/// 获取字典类型列表（真实数据库查询）
pub async fn list_dict_types(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询字典类型列表
    let dict_types = sqlx::query(
        r#"
        SELECT id, code, name, status, created_at
        FROM master_data.core_dict_types
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#,
    )
    .bind(page_size as i64)
    .bind(offset as i64)
    .fetch_all(&state.pool)
    .await;

    // 查询总数
    let total_row = sqlx::query(
        r#"
        SELECT COUNT(*) as count
        FROM master_data.core_dict_types
        "#,
    )
    .fetch_one(&state.pool)
    .await;

    match (dict_types, total_row) {
        (Ok(rows), Ok(total_row)) => {
            let total: i64 = total_row.get("count");
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "typeCode": r.get::<String, _>("code"),
                        "typeName": r.get::<String, _>("name"),
                        "status": r.get::<String, _>("status"),
                        "createdAt": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
                    })
                })
                .collect();

            Json(serde_json::json!({
                "code": 200,
                "message": "成功",
                "data": {
                    "list": data,
                    "total": total,
                    "page": page,
                    "pageSize": page_size
                }
            }))
        }
        (Err(e), _) | (_, Err(e)) => {
            tracing::error!("Failed to query master_data dict types: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取字典类型列表失败: {}", e),
                "data": null
            }))
        }
    }
}

/// 获取字典项列表（真实数据库查询）
pub async fn list_dict_items(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询字典项列表
    let dict_items = sqlx::query(
        r#"
        SELECT id, dict_type_id, code, name, status, created_at
        FROM master_data.core_dict_items
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#,
    )
    .bind(page_size as i64)
    .bind(offset as i64)
    .fetch_all(&state.pool)
    .await;

    // 查询总数
    let total_row = sqlx::query(
        r#"
        SELECT COUNT(*) as count
        FROM master_data.core_dict_items
        "#,
    )
    .fetch_one(&state.pool)
    .await;

    match (dict_items, total_row) {
        (Ok(rows), Ok(total_row)) => {
            let total: i64 = total_row.get("count");
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "typeId": r.get::<uuid::Uuid, _>("dict_type_id").to_string(),
                        "itemCode": r.get::<String, _>("code"),
                        "itemName": r.get::<String, _>("name"),
                        "status": r.get::<String, _>("status"),
                        "createdAt": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
                    })
                })
                .collect();

            Json(serde_json::json!({
                "code": 200,
                "message": "成功",
                "data": {
                    "list": data,
                    "total": total,
                    "page": page,
                    "pageSize": page_size
                }
            }))
        }
        (Err(e), _) | (_, Err(e)) => {
            tracing::error!("Failed to query master_data dict items: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取字典项列表失败: {}", e),
                "data": null
            }))
        }
    }
}

/// 获取Schema注册表列表（真实数据库查询）
pub async fn list_schema_registry(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询Schema注册表列表
    let schema_registry = sqlx::query(
        r#"
        SELECT id, name, title, description, is_active, created_at
        FROM master_data.schema_registry
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#,
    )
    .bind(page_size as i64)
    .bind(offset as i64)
    .fetch_all(&state.pool)
    .await;

    // 查询总数
    let total_row = sqlx::query(
        r#"
        SELECT COUNT(*) as count
        FROM master_data.schema_registry
        "#,
    )
    .fetch_one(&state.pool)
    .await;

    match (schema_registry, total_row) {
        (Ok(rows), Ok(total_row)) => {
            let total: i64 = total_row.get("count");
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "schemaName": r.get::<String, _>("name"),
                        "title": r.get::<String, _>("title"),
                        "description": r.get::<Option<String>, _>("description"),
                        "status": if r.get::<bool, _>("is_active") { "active" } else { "inactive" },
                        "createdAt": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
                    })
                })
                .collect();

            Json(serde_json::json!({
                "code": 200,
                "message": "成功",
                "data": {
                    "list": data,
                    "total": total,
                    "page": page,
                    "pageSize": page_size
                }
            }))
        }
        (Err(e), _) | (_, Err(e)) => {
            tracing::error!("Failed to query master_data schema registry: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取Schema注册表列表失败: {}", e),
                "data": null
            }))
        }
    }
}

/// 获取动态数据列表（真实数据库查询）
pub async fn list_dynamic_data(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询动态数据列表
    let dynamic_data = sqlx::query(
        r#"
        SELECT id, schema_id, data_json, created_at
        FROM master_data.dynamic_data
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#,
    )
    .bind(page_size as i64)
    .bind(offset as i64)
    .fetch_all(&state.pool)
    .await;

    // 查询总数
    let total_row = sqlx::query(
        r#"
        SELECT COUNT(*) as count
        FROM master_data.dynamic_data
        "#,
    )
    .fetch_one(&state.pool)
    .await;

    match (dynamic_data, total_row) {
        (Ok(rows), Ok(total_row)) => {
            let total: i64 = total_row.get("count");
            let data: Vec<serde_json::Value> = rows
                .iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "schemaId": r.get::<uuid::Uuid, _>("schema_id").to_string(),
                        "dataValue": r.get::<serde_json::Value, _>("data_json"),
                        "createdAt": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_rfc3339(),
                    })
                })
                .collect();

            Json(serde_json::json!({
                "code": 200,
                "message": "成功",
                "data": {
                    "list": data,
                    "total": total,
                    "page": page,
                    "pageSize": page_size
                }
            }))
        }
        (Err(e), _) | (_, Err(e)) => {
            tracing::error!("Failed to query master_data dynamic data: {}", e);
            Json(serde_json::json!({
                "code": 500,
                "message": format!("获取动态数据列表失败: {}", e),
                "data": null
            }))
        }
    }
}
