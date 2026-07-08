//! Quality Standard handlers

use axum::{
    extract::State,
    routing::{delete, get, post, put},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, FromRow};
use topems_shared::ApiResponse;

#[derive(Debug, Deserialize)]
pub struct StandardQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub category: Option<String>,
    pub status: Option<String>,
    pub search: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ListStandardsResponse {
    pub standards: Vec<QualityStandard>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Serialize, FromRow)]
pub struct QualityStandard {
    pub id: String,
    pub code: String,
    pub name: String,
    pub category: String,
    pub level: Option<String>,
    pub specification: Option<String>,
    pub description: Option<String>,
    pub version: Option<String>,
    pub status: Option<String>,
    pub created_by: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateStandardRequest {
    pub name: String,
    pub category: String,
    pub level: Option<String>,
    pub specification: Option<String>,
    pub description: Option<String>,
    pub version: Option<String>,
    pub created_by: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateStandardRequest {
    pub name: Option<String>,
    pub category: Option<String>,
    pub level: Option<String>,
    pub specification: Option<String>,
    pub description: Option<String>,
    pub version: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct StandardRevision {
    pub id: String,
    pub standard_id: Uuid,
    pub version: Option<String>,
    pub name: String,
    pub category: String,
    pub level: Option<String>,
    pub specification: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub created_by: Option<String>,
    pub created_at: Option<String>,
}

pub async fn list_standards(
    State(state): State<crate::AppState>,
    axum::extract::Query(query): axum::extract::Query<StandardQuery>,
) -> Json<ApiResponse<ListStandardsResponse>> {
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let mut params: Vec<serde_json::Value> = Vec::new();
    let mut where_clause = String::new();

    if let Some(category) = &query.category {
        where_clause.push_str(" WHERE category = $1");
        params.push(serde_json::Value::String(category.clone()));
    }

    if let Some(status) = &query.status {
        if where_clause.is_empty() {
            where_clause.push_str(" WHERE status = $1");
            params.push(serde_json::Value::String(status.clone()));
        } else {
            where_clause.push_str(&format!(" AND status = ${}", params.len() + 1));
            params.push(serde_json::Value::String(status.clone()));
        }
    }

    if let Some(search) = &query.search {
        let pattern = format!("%{}%", search);
        if where_clause.is_empty() {
            where_clause
                .push_str(" WHERE (code ILIKE $1 OR name ILIKE $1 OR description ILIKE $1)");
            params.push(serde_json::Value::String(pattern));
        } else {
            where_clause.push_str(&format!(
                " AND (code ILIKE ${} OR name ILIKE ${} OR description ILIKE ${})",
                params.len() + 1,
                params.len() + 1,
                params.len() + 1
            ));
            params.push(serde_json::Value::String(pattern));
        }
    }

    let count_sql = format!("SELECT COUNT(*) as total FROM qa_standards{}", where_clause);

    let mut count_query = sqlx::query_scalar(&count_sql);
    for p in &params {
        count_query = count_query.bind(p.clone());
    }

    let total: Option<i64> = match count_query.fetch_one(&state.pool).await {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("Failed to count standards: {}", e);
            return Json(ApiResponse::error(500, "获取质量标准列表失败"));
        }
    };

    let fetch_sql = format!(
        r#"
        SELECT id, code, name, category, level, specification,
            description, version, status, created_by,
            created_at::TEXT, updated_at::TEXT
        FROM qa_standards
        {}
        ORDER BY created_at DESC
        LIMIT ${} OFFSET ${}
        "#,
        where_clause,
        params.len() + 1,
        params.len() + 2
    );

    let mut fetch_query = sqlx::query_as::<_, QualityStandard>(&fetch_sql);
    for p in &params {
        fetch_query = fetch_query.bind(p.clone());
    }
    fetch_query = fetch_query.bind(page_size).bind(offset);

    match fetch_query.fetch_all(&state.pool).await {
        Ok(data) => Json(ApiResponse::success(
            ListStandardsResponse {
                standards: data,
                total: total.unwrap_or(0),
                page,
                page_size,
            },
            "获取质量标准列表成功",
        )),
        Err(e) => {
            tracing::error!("Failed to fetch standards: {}", e);
            Json(ApiResponse::error(500, "获取质量标准列表失败"))
        }
    }
}

pub async fn create_standard(
    State(state): State<crate::AppState>,
    Json(req): Json<CreateStandardRequest>,
) -> Json<ApiResponse<QualityStandard>> {
    let code = format!(
        "QS-{}",
        uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
    );
    let version = req.version.unwrap_or_else(|| "1.0".to_string());

    let standard = sqlx::query_as::<_, QualityStandard>(r#"INSERT INTO qa_standards (code, name, category, level, specification, description, version, status, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8) RETURNING id, code, name, category, level, specification, description, version, status, created_by, created_at::TEXT, updated_at::TEXT"#).bind(code).bind(req.name).bind(req.category).bind(req.level).bind(req.specification).bind(req.description).bind(version).bind(req.created_by)
    .fetch_one(&state.pool)
    .await;

    match standard {
        Ok(data) => {
            let created_by = data.created_by.clone();
            if let Ok(standard_id) = Uuid::parse_str(&data.id) {
                let _ = sqlx::query(r#"INSERT INTO qa_standard_revisions (standard_id, version, name, category, level, specification, description, status, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)"#).bind(standard_id).bind(data.version.clone()).bind(data.name.clone()).bind(data.category.clone()).bind(data.level.clone()).bind(data.specification.clone()).bind(data.description.clone()).bind(data.status.clone()).bind(created_by)
                .execute(&state.pool)
                .await;
            }
            Json(ApiResponse::success(data, "质量标准创建成功"))
        }
        Err(e) => {
            tracing::error!("Failed to create standard: {}", e);
            Json(ApiResponse::error(500, "质量标准创建失败"))
        }
    }
}

pub async fn get_standard(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<QualityStandard>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的标准ID")),
    };

    let standard = sqlx::query_as::<_, QualityStandard>(r#"SELECT id, code, name, category, level, specification, description, version, status, created_by, created_at::TEXT, updated_at::TEXT FROM qa_standards WHERE id = $1"#).bind(id)
    .fetch_one(&state.pool)
    .await;

    match standard {
        Ok(data) => Json(ApiResponse::success(data, "获取质量标准成功")),
        Err(e) => {
            tracing::error!("Failed to fetch standard: {}", e);
            Json(ApiResponse::error(500, "获取质量标准失败"))
        }
    }
}

pub async fn update_standard(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateStandardRequest>,
) -> Json<ApiResponse<QualityStandard>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的标准ID")),
    };

    let current = sqlx::query_as::<_, QualityStandard>(r#"SELECT id, code, name, category, level, specification, description, version, status, created_by, created_at::TEXT, updated_at::TEXT FROM qa_standards WHERE id = $1"#).bind(id)
    .fetch_one(&state.pool)
    .await;

    if let Ok(current_data) = current {
        if let Ok(standard_id) = Uuid::parse_str(&current_data.id) {
            let _ = sqlx::query(r#"INSERT INTO qa_standard_revisions (standard_id, version, name, category, level, specification, description, status, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)"#).bind(standard_id).bind(current_data.version).bind(current_data.name).bind(current_data.category).bind(current_data.level).bind(current_data.specification).bind(current_data.description).bind(current_data.status).bind(current_data.created_by)
            .execute(&state.pool)
            .await;
        }
    }

    let standard = sqlx::query_as::<_, QualityStandard>(r#"UPDATE qa_standards SET name = COALESCE($2, name), category = COALESCE($3, category), level = COALESCE($4, level), specification = COALESCE($5, specification), description = COALESCE($6, description), version = COALESCE($7, version), status = COALESCE($8, status), updated_at = NOW() WHERE id = $1 RETURNING id, code, name, category, level, specification, description, version, status, created_by, created_at::TEXT, updated_at::TEXT"#).bind(id).bind(req.name).bind(req.category).bind(req.level).bind(req.specification).bind(req.description).bind(req.version).bind(req.status)
    .fetch_one(&state.pool)
    .await;

    match standard {
        Ok(data) => Json(ApiResponse::success(data, "质量标准更新成功")),
        Err(e) => {
            tracing::error!("Failed to update standard: {}", e);
            Json(ApiResponse::error(500, "质量标准更新失败"))
        }
    }
}

pub async fn delete_standard(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<bool>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的标准ID")),
    };

    let result = sqlx::query(r#"DELETE FROM qa_standards WHERE id = $1"#)
        .bind(id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(_) => Json(ApiResponse::success(true, "质量标准删除成功")),
        Err(e) => {
            tracing::error!("Failed to delete standard: {}", e);
            Json(ApiResponse::error(500, "质量标准删除失败"))
        }
    }
}

pub async fn list_revisions(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<Vec<StandardRevision>>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的标准ID")),
    };

    let revisions = sqlx::query_as::<_, StandardRevision>(r#"SELECT id, standard_id, version, name, category, level, specification, description, status, created_by, created_at::TEXT FROM qa_standard_revisions WHERE standard_id = $1 ORDER BY created_at DESC"#).bind(id)
    .fetch_all(&state.pool)
    .await;

    match revisions {
        Ok(data) => Json(ApiResponse::success(data, "获取质量标准修订记录成功")),
        Err(e) => {
            tracing::error!("Failed to fetch revisions: {}", e);
            Json(ApiResponse::error(500, "获取质量标准修订记录失败"))
        }
    }
}

pub async fn create_revision(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateStandardRequest>,
) -> Json<ApiResponse<QualityStandard>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的标准ID")),
    };

    let current = sqlx::query_as::<_, QualityStandard>(r#"SELECT id, code, name, category, level, specification, description, version, status, created_by, created_at::TEXT, updated_at::TEXT FROM qa_standards WHERE id = $1"#).bind(id)
    .fetch_one(&state.pool)
    .await;

    match current {
        Ok(current_data) => {
            let version = current_data.version.clone();
            let name = current_data.name.clone();
            let category = current_data.category.clone();
            let level = current_data.level.clone();
            let specification = current_data.specification.clone();
            let description = current_data.description.clone();
            let status = current_data.status.clone();
            let created_by = current_data.created_by.clone();

            if let Ok(standard_id) = Uuid::parse_str(&current_data.id) {
                let _ = sqlx::query(r#"INSERT INTO qa_standard_revisions (standard_id, version, name, category, level, specification, description, status, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)"#).bind(standard_id).bind(version.clone()).bind(name).bind(category).bind(level).bind(specification).bind(description).bind(status).bind(created_by)
                    .execute(&state.pool)
                    .await;
            }

            let new_version = req.version.unwrap_or_else(|| {
                let current_version = version.as_deref().unwrap_or("1.0");
                let parts: Vec<&str> = current_version.split('.').collect();
                if parts.len() >= 2 {
                    let mut v: Vec<String> = parts.iter().map(|s| s.to_string()).collect();
                    if let Ok(patch) = v[1].parse::<i32>() {
                        v[1] = (patch + 1).to_string();
                    }
                    v.join(".")
                } else {
                    format!("{}.1", current_version)
                }
            });

            let standard = sqlx::query_as::<_, QualityStandard>(r#"UPDATE qa_standards SET name = COALESCE($2, name), category = COALESCE($3, category), level = COALESCE($4, level), specification = COALESCE($5, specification), description = COALESCE($6, description), version = $7, status = COALESCE($8, status), updated_at = NOW() WHERE id = $1 RETURNING id, code, name, category, level, specification, description, version, status, created_by, created_at::TEXT, updated_at::TEXT"#).bind(id).bind(req.name).bind(req.category).bind(req.level).bind(req.specification).bind(req.description).bind(new_version).bind(req.status)
            .fetch_one(&state.pool)
            .await;

            match standard {
                Ok(data) => Json(ApiResponse::success(data, "质量标准版本创建成功")),
                Err(e) => {
                    tracing::error!("Failed to create revision: {}", e);
                    Json(ApiResponse::error(500, "质量标准版本创建失败"))
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to find standard: {}", e);
            Json(ApiResponse::error(404, "质量标准不存在"))
        }
    }
}

pub fn create_routes() -> Router<crate::AppState> {
    Router::new()
        .route("/api/qms/standards", get(list_standards))
        .route("/api/qms/standards", post(create_standard))
        .route("/api/qms/standards/{id}", get(get_standard))
        .route("/api/qms/standards/{id}", put(update_standard))
        .route("/api/qms/standards/{id}", delete(delete_standard))
        .route("/api/qms/standards/{id}/revisions", get(list_revisions))
        .route("/api/qms/standards/{id}/revisions", post(create_revision))
}
