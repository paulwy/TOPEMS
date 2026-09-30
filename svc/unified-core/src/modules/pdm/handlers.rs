//! PDM 产品数据管理模块 API 处理器

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

/// 获取物料列表（真实数据库查询）
pub async fn list_materials(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询物料列表
    let materials = sqlx::query(
        r#"
        SELECT id, material_no, name, spec, unit, status
        FROM pdm.pdm_materials
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#
    )
    .bind(page_size as i64)
    .bind(offset as i64)
    .fetch_all(&state.pool)
    .await;

    // 查询总数
    let total_row = sqlx::query(
        r#"
        SELECT COUNT(*) as count
        FROM pdm.pdm_materials
        WHERE deleted_at IS NULL
        "#
    )
    .fetch_one(&state.pool)
    .await;

    let total: i64 = match total_row {
        Ok(row) => row.get("count"),
        Err(_) => 0,
    };

    match materials {
        Ok(rows) => {
            let data: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "material_no": r.get::<Option<String>, _>("material_no"),
                        "name": r.get::<Option<String>, _>("name"),
                        "spec": r.get::<Option<String>, _>("spec"),
                        "unit": r.get::<Option<String>, _>("unit"),
                        "status": r.get::<Option<String>, _>("status"),
                    })
                })
                .collect();

            Json(serde_json::json!({
                "data": {
                    "materials": data,
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                },
                "success": true,
                "message": "获取物料列表成功"
            }))
        }
        Err(e) => {
            tracing::error!("Failed to query materials: {}", e);
            Json(serde_json::json!({
                "data": {
                    "materials": [],
                    "total": 0,
                    "page": page,
                    "page_size": page_size,
                },
                "success": false,
                "message": "获取物料列表失败"
            }))
        }
    }
}

/// 获取BOM列表（真实数据库查询）
pub async fn list_boms(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询BOM列表
    let boms = sqlx::query(
        r#"
        SELECT id, bom_no, product_name, product_code, version, status, description, created_at
        FROM pdm.pdm_boms
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#
    )
    .bind(page_size as i64)
    .bind(offset as i64)
    .fetch_all(&state.pool)
    .await;

    // 查询总数
    let total_row = sqlx::query(
        r#"
        SELECT COUNT(*) as count
        FROM pdm.pdm_boms
        WHERE deleted_at IS NULL
        "#
    )
    .fetch_one(&state.pool)
    .await;

    let total: i64 = match total_row {
        Ok(row) => row.get("count"),
        Err(_) => 0,
    };

    match boms {
        Ok(rows) => {
            let data: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "bom_no": r.get::<String, _>("bom_no"),
                        "product_name": r.get::<String, _>("product_name"),
                        "product_code": r.get::<Option<String>, _>("product_code"),
                        "version": r.get::<Option<String>, _>("version"),
                        "status": r.get::<String, _>("status"),
                        "description": r.get::<Option<String>, _>("description"),
                        "created_at": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
                    })
                })
                .collect();

            Json(serde_json::json!({
                "data": data,
                "total": total,
                "page": page,
                "page_size": page_size,
            }))
        }
        Err(e) => {
            tracing::error!("Failed to query boms: {}", e);
            Json(serde_json::json!({
                "data": [],
                "total": 0,
                "page": page,
                "page_size": page_size,
                "error": "获取BOM列表失败"
            }))
        }
    }
}

/// 获取文档列表（真实数据库查询）
pub async fn list_documents(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询文档列表
    let documents = sqlx::query(
        r#"
        SELECT id, document_no, name, description, document_type, file_path, file_size, version, status, created_by, created_at
        FROM pdm.pdm_documents
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#
    )
    .bind(page_size as i64)
    .bind(offset as i64)
    .fetch_all(&state.pool)
    .await;

    // 查询总数
    let total_row = sqlx::query(
        r#"
        SELECT COUNT(*) as count
        FROM pdm.pdm_documents
        WHERE deleted_at IS NULL
        "#
    )
    .fetch_one(&state.pool)
    .await;

    let total: i64 = match total_row {
        Ok(row) => row.get("count"),
        Err(_) => 0,
    };

    match documents {
        Ok(rows) => {
            let data: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "document_no": r.get::<String, _>("document_no"),
                        "name": r.get::<String, _>("name"),
                        "description": r.get::<Option<String>, _>("description"),
                        "document_type": r.get::<Option<String>, _>("document_type"),
                        "file_path": r.get::<Option<String>, _>("file_path"),
                        "file_size": r.get::<Option<i64>, _>("file_size"),
                        "version": r.get::<Option<String>, _>("version"),
                        "status": r.get::<String, _>("status"),
                        "created_by": r.get::<Option<String>, _>("created_by"),
                        "created_at": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
                    })
                })
                .collect();

            Json(serde_json::json!({
                "data": data,
                "total": total,
                "page": page,
                "page_size": page_size,
            }))
        }
        Err(e) => {
            tracing::error!("Failed to query documents: {}", e);
            Json(serde_json::json!({
                "data": [],
                "total": 0,
                "page": page,
                "page_size": page_size,
                "error": "获取文档列表失败"
            }))
        }
    }
}
