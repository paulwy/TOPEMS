use axum::{extract::Path, extract::Query, extract::State, routing::get, Json, Router};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::AppState;
use topems_shared::ApiResponse;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/api/pdm/versions", get(list_versions).post(create_version))
        .route(
            "/api/pdm/versions/{id}",
            get(get_version).put(update_version).delete(delete_version),
        )
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Version {
    pub id: Uuid,
    pub version_no: String,
    pub target_type: String,
    pub target_id: Uuid,
    pub target_name: Option<String>,
    pub version_label: String,
    pub description: Option<String>,
    pub status: String,
    pub created_by: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateVersionRequest {
    pub version_no: String,
    pub target_type: String,
    pub target_id: Uuid,
    pub target_name: Option<String>,
    pub version_label: String,
    pub description: Option<String>,
    pub created_by: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateVersionRequest {
    pub version_no: Option<String>,
    pub target_type: Option<String>,
    pub target_id: Option<Uuid>,
    pub target_name: Option<String>,
    pub version_label: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub created_by: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct VersionQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub target_type: Option<String>,
    pub target_id: Option<Uuid>,
}

pub async fn list_versions(
    State(state): State<AppState>,
    Query(query): Query<VersionQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(10).min(100);
    let offset = (page - 1) * page_size;
    let search_pattern = query.search.as_ref().map(|s| format!("%{}%", s));

    let result = sqlx::query_as::<_, Version>(
        r#"
        SELECT id, version_no, target_type, target_id, target_name, version_label,
               description, status, created_by, created_at, updated_at
        FROM pdm_versions
        WHERE ($1::text IS NULL OR version_no ILIKE $1 OR target_name ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
          AND ($3::text IS NULL OR target_type = $3)
          AND ($4::uuid IS NULL OR target_id = $4)
        ORDER BY created_at DESC
        LIMIT $5 OFFSET $6
        "#,
    )
    .bind(&search_pattern)
    .bind(&query.status)
    .bind(&query.target_type)
    .bind(query.target_id)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(versions) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM pdm_versions
                WHERE ($1::text IS NULL OR version_no ILIKE $1 OR target_name ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND ($3::text IS NULL OR target_type = $3)
                  AND ($4::uuid IS NULL OR target_id = $4)
                "#,
            )
            .bind(&search_pattern)
            .bind(&query.status)
            .bind(&query.target_type)
            .bind(query.target_id)
            .fetch_one(&state.pool)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "versions": versions,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取版本列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取版本列表失败: {}", e);
            Json(ApiResponse::error(500, "获取版本列表失败"))
        }
    }
}

pub async fn create_version(
    State(state): State<AppState>,
    Json(req): Json<CreateVersionRequest>,
) -> Json<ApiResponse<Version>> {
    if req.version_no.is_empty() {
        return Json(ApiResponse::error(400, "版本号不能为空"));
    }
    if req.version_label.is_empty() {
        return Json(ApiResponse::error(400, "版本标签不能为空"));
    }

    let result = sqlx::query_as::<_, Version>(
        r#"
        INSERT INTO pdm_versions (
            version_no, target_type, target_id, target_name, version_label,
            description, status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, version_no, target_type, target_id, target_name, version_label,
                  description, status, created_by, created_at, updated_at
        "#,
    )
    .bind(&req.version_no)
    .bind(&req.target_type)
    .bind(req.target_id)
    .bind(&req.target_name)
    .bind(&req.version_label)
    .bind(&req.description)
    .bind("draft")
    .bind(&req.created_by)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(version) => Json(ApiResponse::success(version, "版本创建成功")),
        Err(e) => {
            tracing::error!("创建版本失败: {}", e);
            Json(ApiResponse::error(500, "创建版本失败"))
        }
    }
}

pub async fn get_version(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Version>> {
    let result = sqlx::query_as::<_, Version>(
        r#"
        SELECT id, version_no, target_type, target_id, target_name, version_label,
               description, status, created_by, created_at, updated_at
        FROM pdm_versions WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(version)) => Json(ApiResponse::success(version, "获取版本成功")),
        Ok(None) => Json(ApiResponse::error(404, "版本不存在")),
        Err(e) => {
            tracing::error!("获取版本失败: {}", e);
            Json(ApiResponse::error(500, "获取版本失败"))
        }
    }
}

pub async fn update_version(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateVersionRequest>,
) -> Json<ApiResponse<Version>> {
    let now = Utc::now();

    let result = sqlx::query_as::<_, Version>(
        r#"
        UPDATE pdm_versions SET
            version_no = COALESCE($2, version_no),
            target_type = COALESCE($3, target_type),
            target_id = COALESCE($4, target_id),
            target_name = COALESCE($5, target_name),
            version_label = COALESCE($6, version_label),
            description = COALESCE($7, description),
            status = COALESCE($8, status),
            created_by = COALESCE($9, created_by),
            updated_at = $10
        WHERE id = $1
        RETURNING id, version_no, target_type, target_id, target_name, version_label,
                  description, status, created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(req.version_no)
    .bind(req.target_type)
    .bind(req.target_id)
    .bind(req.target_name)
    .bind(req.version_label)
    .bind(req.description)
    .bind(req.status)
    .bind(req.created_by)
    .bind(now)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(version)) => Json(ApiResponse::success(version, "版本更新成功")),
        Ok(None) => Json(ApiResponse::error(404, "版本不存在")),
        Err(e) => {
            tracing::error!("更新版本失败: {}", e);
            Json(ApiResponse::error(500, "更新版本失败"))
        }
    }
}

pub async fn delete_version(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    let result = sqlx::query("DELETE FROM pdm_versions WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(true, "版本删除成功")),
        Ok(_) => Json(ApiResponse::error(404, "版本不存在")),
        Err(e) => {
            tracing::error!("删除版本失败: {}", e);
            Json(ApiResponse::error(500, "删除版本失败"))
        }
    }
}
