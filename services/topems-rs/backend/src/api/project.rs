use anyhow::Result;
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::postgres::PgPool;
use std::sync::Arc;
use uuid::Uuid;

use crate::models::{CreateProjectRequest, Project, UpdateProjectRequest};

#[derive(Debug, Serialize)]
pub struct ApiResponse<T> {
    pub code: u16,
    pub success: bool,
    pub data: Option<T>,
    pub message: String,
    pub timestamp: String,
}

impl<T> ApiResponse<T> {
    pub fn success(data: T, message: &str) -> Self {
        Self {
            code: 200,
            success: true,
            data: Some(data),
            message: message.to_string(),
            timestamp: Utc::now().to_rfc3339(),
        }
    }

    pub fn error(code: u16, message: &str) -> Self {
        Self {
            code,
            success: false,
            data: None,
            message: message.to_string(),
            timestamp: Utc::now().to_rfc3339(),
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

pub struct AppState {
    pub db: PgPool,
}

pub async fn create_routes(db: PgPool) -> Result<Router> {
    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route("/health", get(health_check))
        .route("/api/v1/projects", get(list_projects).post(create_project))
        .route(
            "/api/v1/projects/{id}",
            get(get_project).put(update_project).delete(delete_project),
        )
        .with_state(state);

    Ok(app)
}

async fn health_check() -> Json<ApiResponse<&'static str>> {
    Json(ApiResponse::success("TOPEMS-RS is running", "健康检查"))
}

async fn list_projects(
    State(state): State<Arc<AppState>>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, Project>(
        r#"
        SELECT id, name, code, description, project_type, status, leader,
               team_members, start_date, end_date, budget, progress,
               created_by, created_at, updated_at
        FROM projects
        WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(&params.search)
    .bind(&params.status)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(projects) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM projects
                WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(&params.search)
            .bind(&params.status)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "projects": projects,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取项目列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取项目列表失败: {}", e);
            Json(ApiResponse::error(500, "获取项目列表失败"))
        }
    }
}

async fn create_project(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreateProjectRequest>,
) -> Json<ApiResponse<Project>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, Project>(
        r#"
        INSERT INTO projects (
            id, name, code, description, project_type, status, leader,
            team_members, start_date, end_date, budget, progress, created_by,
            created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING id, name, code, description, project_type, status, leader,
                  team_members, start_date, end_date, budget, progress,
                  created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.code)
    .bind(&req.description)
    .bind(&req.project_type)
    .bind("draft")
    .bind(&req.leader)
    .bind(serde_json::to_value(req.team_members).unwrap_or(serde_json::json!([])))
    .bind(req.start_date)
    .bind(req.end_date)
    .bind(req.budget)
    .bind(0)
    .bind(&req.leader)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(project) => Json(ApiResponse::success(project, "项目创建成功")),
        Err(e) => {
            tracing::error!("创建项目失败: {}", e);
            Json(ApiResponse::error(500, "项目创建失败"))
        }
    }
}

async fn get_project(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Project>> {
    let result = sqlx::query_as::<_, Project>(
        r#"
        SELECT id, name, code, description, project_type, status, leader,
               team_members, start_date, end_date, budget, progress,
               created_by, created_at, updated_at
        FROM projects WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(project)) => Json(ApiResponse::success(project, "获取项目成功")),
        Ok(None) => Json(ApiResponse::error(404, "项目不存在")),
        Err(e) => {
            tracing::error!("获取项目失败: {}", e);
            Json(ApiResponse::error(500, "获取项目失败"))
        }
    }
}

async fn update_project(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateProjectRequest>,
) -> Json<ApiResponse<Project>> {
    let existing = sqlx::query_as::<_, Project>(
        "SELECT id, name, code, description, project_type, status, leader, team_members, start_date, end_date, budget, progress, created_by, created_at, updated_at FROM projects WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(p)) => p,
        Ok(None) => return Json(ApiResponse::error(404, "项目不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询项目失败: {}", e))),
    };

    let name = req.name.unwrap_or(existing.name);
    let description = req.description.or(existing.description);
    let status = req.status.unwrap_or(existing.status);
    let leader = req.leader.unwrap_or(existing.leader);
    let team_members = req.team_members.unwrap_or(existing.team_members);
    let end_date = req.end_date.or(existing.end_date);
    let budget = req.budget.or(existing.budget);
    let progress = req.progress.unwrap_or(existing.progress);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Project>(
        r#"
        UPDATE projects SET
            name = $2, description = $3, status = $4, leader = $5,
            team_members = $6, end_date = $7, budget = $8, progress = $9, updated_at = $10
        WHERE id = $1
        RETURNING id, name, code, description, project_type, status, leader,
                  team_members, start_date, end_date, budget, progress,
                  created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&name)
    .bind(&description)
    .bind(&status)
    .bind(&leader)
    .bind(serde_json::to_value(team_members).unwrap())
    .bind(end_date)
    .bind(budget)
    .bind(progress)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(project) => Json(ApiResponse::success(project, "项目更新成功")),
        Err(e) => {
            tracing::error!("更新项目失败: {}", e);
            Json(ApiResponse::error(500, "项目更新失败"))
        }
    }
}

async fn delete_project(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM projects WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success("".to_string(), "项目删除成功")),
        Ok(_) => Json(ApiResponse::error(404, "项目不存在")),
        Err(e) => {
            tracing::error!("删除项目失败: {}", e);
            Json(ApiResponse::error(500, "项目删除失败"))
        }
    }
}
