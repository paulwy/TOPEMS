use axum::{
    extract::{Path, State},
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::Utc;
use sqlx::{postgres::PgPool, Error as SqlxError};
use std::sync::Arc;
use std::time::Duration;
use uuid::Uuid;

use crate::models::project_milestone::{
    CreateMilestoneRequest, ProjectMilestone, UpdateMilestoneRequest,
};
use crate::services::project_progress;
use crate::cache::{cache_get, cache_set, invalidate_project_cache};
use topems_shared::response::ApiResponse;

pub struct AppState {
    pub db: PgPool,
}

pub async fn create_routes(db: PgPool) -> topems_shared::Result<Router> {
    let state = Arc::new(AppState { db });

    let router = Router::new()
        .route("/api/v1/milestones", post(create_milestone))
        .route(
            "/api/v1/milestones/project/{project_id}",
            get(get_project_milestones),
        )
        .route("/api/v1/milestones/{id}", put(update_milestone))
        .route("/api/v1/milestones/{id}", delete(delete_milestone))
        .with_state(state);

    Ok(router)
}

pub async fn create_milestone(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateMilestoneRequest>,
) -> Json<ApiResponse<ProjectMilestone>> {
    let request_id = Uuid::new_v4();
    let start_time = Utc::now();

    tracing::info!(
        request_id = %request_id,
        project_id = %payload.project_id,
        milestone_name = %payload.name,
        "创建项目里程碑请求开始"
    );

    if payload.name.trim().is_empty() {
        tracing::warn!(
            request_id = %request_id,
            "创建项目里程碑失败: 里程碑名称不能为空"
        );
        return Json(ApiResponse::error(400, "里程碑名称不能为空"));
    }

    let id = Uuid::new_v4();

    let result = sqlx::query_as::<_, ProjectMilestone>(
        r#"
        INSERT INTO rs.project_milestones (
            id, project_id, phase_id, name, description, target_date, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, project_id, phase_id, name, description, target_date, actual_date, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(payload.project_id)
    .bind(payload.phase_id)
    .bind(payload.name.trim())
    .bind(payload.description.as_deref())
    .bind(payload.target_date)
    .bind("pending")
    .fetch_one(&state.db)
    .await;

    let duration = Utc::now() - start_time;

    match result {
        Ok(milestone) => {
            // 创建成功，失效相关缓存
            invalidate_project_cache(&milestone.project_id.to_string()).await;
            
            tracing::info!(
                request_id = %request_id,
                milestone_id = %milestone.id,
                duration_ms = duration.num_milliseconds(),
                "创建项目里程碑成功"
            );
            Json(ApiResponse::success(milestone, "项目里程碑创建成功"))
        }
        Err(SqlxError::Database(db_err)) => {
            tracing::error!(
                request_id = %request_id,
                error = %db_err,
                duration_ms = duration.num_milliseconds(),
                "创建项目里程碑数据库错误"
            );
            if db_err.code().map(|c| c == "23503").unwrap_or(false) {
                Json(ApiResponse::error(400, "关联的项目或阶段不存在"))
            } else {
                Json(ApiResponse::error(500, "数据库操作失败"))
            }
        }
        Err(e) => {
            tracing::error!(
                request_id = %request_id,
                error = %e,
                duration_ms = duration.num_milliseconds(),
                "创建项目里程碑失败"
            );
            Json(ApiResponse::error(500, "创建项目里程碑失败"))
        }
    }
}

pub async fn get_project_milestones(
    State(state): State<Arc<AppState>>,
    Path(project_id): Path<Uuid>,
) -> Json<ApiResponse<Vec<ProjectMilestone>>> {
    let request_id = Uuid::new_v4();
    let start_time = Utc::now();
    let cache_key = format!("milestones:{}", project_id);

    tracing::info!(
        request_id = %request_id,
        project_id = %project_id,
        "获取项目里程碑列表请求开始"
    );

    // 尝试从缓存获取
    if let Some(cached) = cache_get(&cache_key).await {
        tracing::info!(
            request_id = %request_id,
            project_id = %project_id,
            "从缓存获取项目里程碑列表成功"
        );
        return Json(ApiResponse::success(cached, "获取项目里程碑列表成功"));
    }

    // 缓存未命中，从数据库获取
    let result = sqlx::query_as::<_, ProjectMilestone>(
        r#"
        SELECT id, project_id, phase_id, name, description, target_date, actual_date, status, created_at, updated_at
        FROM rs.project_milestones 
        WHERE project_id = $1 
        ORDER BY target_date
        "#,
    )
    .bind(project_id)
    .fetch_all(&state.db)
    .await;

    let duration = Utc::now() - start_time;

    match result {
        Ok(milestones) => {
            tracing::info!(
                request_id = %request_id,
                project_id = %project_id,
                milestone_count = milestones.len(),
                duration_ms = duration.num_milliseconds(),
                "获取项目里程碑列表成功"
            );
            
            // 写入缓存，有效期5分钟
            cache_set(&cache_key, milestones.clone(), Duration::from_secs(300)).await;
            
            Json(ApiResponse::success(milestones, "获取项目里程碑列表成功"))
        }
        Err(e) => {
            tracing::error!(
                request_id = %request_id,
                project_id = %project_id,
                error = %e,
                duration_ms = duration.num_milliseconds(),
                "获取项目里程碑列表失败"
            );
            Json(ApiResponse::error(500, "获取项目里程碑列表失败"))
        }
    }
}

pub async fn update_milestone(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateMilestoneRequest>,
) -> Json<ApiResponse<ProjectMilestone>> {
    let request_id = Uuid::new_v4();
    let start_time = Utc::now();

    tracing::info!(
        request_id = %request_id,
        milestone_id = %id,
        "更新项目里程碑请求开始"
    );

    if let Some(name) = &payload.name {
        if name.trim().is_empty() {
            tracing::warn!(
                request_id = %request_id,
                milestone_id = %id,
                "更新项目里程碑失败: 里程碑名称不能为空"
            );
            return Json(ApiResponse::error(400, "里程碑名称不能为空"));
        }
    }

    let result = sqlx::query_as::<_, ProjectMilestone>(
        r#"
        UPDATE rs.project_milestones
        SET 
            name = COALESCE($2, name),
            description = COALESCE($3, description),
            target_date = COALESCE($4, target_date),
            actual_date = COALESCE($5, actual_date),
            status = COALESCE($6, status),
            updated_at = NOW()
        WHERE id = $1
        RETURNING id, project_id, phase_id, name, description, target_date, actual_date, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(payload.name.as_deref().map(|s| s.trim()))
    .bind(payload.description.as_deref())
    .bind(payload.target_date)
    .bind(payload.actual_date)
    .bind(payload.status.map(|s| s.to_string()))
    .fetch_one(&state.db)
    .await;

    let duration = Utc::now() - start_time;

    match result {
        Ok(milestone) => {
            // 更新成功，失效相关缓存
            invalidate_project_cache(&milestone.project_id.to_string()).await;
            
            if milestone.status == "achieved" {
                let _ = project_progress::on_milestone_achieved(&state.db, milestone.project_id, milestone.id).await;
                let _ = project_progress::update_project_progress(&state.db, milestone.project_id).await;
            }
            
            tracing::info!(
                request_id = %request_id,
                milestone_id = %milestone.id,
                duration_ms = duration.num_milliseconds(),
                "更新项目里程碑成功"
            );
            Json(ApiResponse::success(milestone, "项目里程碑更新成功"))
        }
        Err(SqlxError::RowNotFound) => {
            tracing::warn!(
                request_id = %request_id,
                milestone_id = %id,
                duration_ms = duration.num_milliseconds(),
                "更新项目里程碑失败: 里程碑不存在"
            );
            Json(ApiResponse::error(404, "里程碑不存在"))
        }
        Err(SqlxError::Database(db_err)) => {
            tracing::error!(
                request_id = %request_id,
                milestone_id = %id,
                error = %db_err,
                duration_ms = duration.num_milliseconds(),
                "更新项目里程碑数据库错误"
            );
            Json(ApiResponse::error(500, "数据库操作失败"))
        }
        Err(e) => {
            tracing::error!(
                request_id = %request_id,
                milestone_id = %id,
                error = %e,
                duration_ms = duration.num_milliseconds(),
                "更新项目里程碑失败"
            );
            Json(ApiResponse::error(500, "更新项目里程碑失败"))
        }
    }
}

pub async fn delete_milestone(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<()>> {
    let request_id = Uuid::new_v4();
    let start_time = Utc::now();

    tracing::info!(
        request_id = %request_id,
        milestone_id = %id,
        "删除项目里程碑请求开始"
    );
    
    // 先查询项目ID
    let project_id_result = sqlx::query_scalar::<_, Uuid>(
        "SELECT project_id FROM rs.project_milestones WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let result = sqlx::query(
        r#"
        DELETE FROM rs.project_milestones 
        WHERE id = $1
        "#,
    )
    .bind(id)
    .execute(&state.db)
    .await;

    let duration = Utc::now() - start_time;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            // 失效项目相关缓存
            if let Ok(Some(project_id)) = project_id_result {
                invalidate_project_cache(&project_id.to_string()).await;
            }
            
            tracing::info!(
                request_id = %request_id,
                milestone_id = %id,
                duration_ms = duration.num_milliseconds(),
                "删除项目里程碑成功"
            );
            Json(ApiResponse::success((), "项目里程碑删除成功"))
        }
        Ok(_) => {
            tracing::warn!(
                request_id = %request_id,
                milestone_id = %id,
                duration_ms = duration.num_milliseconds(),
                "删除项目里程碑失败: 里程碑不存在"
            );
            Json(ApiResponse::error(404, "里程碑不存在"))
        }
        Err(e) => {
            tracing::error!(
                request_id = %request_id,
                milestone_id = %id,
                error = %e,
                duration_ms = duration.num_milliseconds(),
                "删除项目里程碑失败"
            );
            Json(ApiResponse::error(500, "删除项目里程碑失败"))
        }
    }
}