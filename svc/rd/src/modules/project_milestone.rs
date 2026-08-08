use axum::{
    extract::{Extension, Path, State},
    http::HeaderMap,
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::Utc;
use sqlx::Error as SqlxError;
use std::time::Duration;
use uuid::Uuid;

use crate::cache::{cache_get, cache_set, invalidate_project_cache};
use crate::models::project_milestone::{
    CreateMilestoneRequest, ProjectMilestone, UpdateMilestoneRequest,
};
use crate::services::project_progress;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

fn get_tenant_id(claims: &Claims, headers: &HeaderMap) -> Uuid {
    claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .or_else(|| {
            headers
                .get("x-tenant-id")
                .and_then(|v| v.to_str().ok())
                .and_then(|s| Uuid::parse_str(s).ok())
        })
        .unwrap_or_else(Uuid::new_v4)
}

pub fn create_routes() -> Router<super::ApiState> {
    Router::<super::ApiState>::new()
        .route("/milestones", post(create_milestone))
        .route(
            "/milestones/project/{project_id}",
            get(get_project_milestones),
        )
        .route("/milestones/{id}", put(update_milestone))
        .route("/milestones/{id}", delete(delete_milestone))
}

pub async fn create_milestone(
    State(state): State<super::ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(payload): Json<CreateMilestoneRequest>,
) -> Json<ApiResponse<ProjectMilestone>> {
    let tenant_id = get_tenant_id(&claims, &headers);
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
            id, tenant_id, project_id, phase_id, name, description, target_date, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, tenant_id, project_id, phase_id, name, description, target_date, actual_date, status, created_at, updated_at, deliverable_type, acceptance_criteria, acceptance_status, accepted_by, accepted_at
        "#,
    )
    .bind(id)
    .bind(tenant_id)
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
    State(state): State<super::ApiState>,
    Path(project_id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
) -> Json<ApiResponse<Vec<ProjectMilestone>>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let request_id = Uuid::new_v4();
    let start_time = Utc::now();
    let cache_key = format!("milestones:{}", project_id);

    tracing::info!(
        request_id = %request_id,
        project_id = %project_id,
        "获取项目里程碑列表请求开始"
    );

    if let Some(cached) = cache_get(&cache_key).await {
        tracing::info!(
            request_id = %request_id,
            project_id = %project_id,
            "从缓存获取项目里程碑列表成功"
        );
        return Json(ApiResponse::success(cached, "获取项目里程碑列表成功"));
    }

    let result = sqlx::query_as::<_, ProjectMilestone>(
        r#"
        SELECT id, tenant_id, project_id, phase_id, name, description, target_date, actual_date, status, created_at, updated_at, deliverable_type, acceptance_criteria, acceptance_status, accepted_by, accepted_at
        FROM rs.project_milestones 
        WHERE project_id = $1 AND tenant_id = $2
        ORDER BY target_date
        "#,
    )
    .bind(project_id)
    .bind(tenant_id)
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
    State(state): State<super::ApiState>,
    Path(id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(payload): Json<UpdateMilestoneRequest>,
) -> Json<ApiResponse<ProjectMilestone>> {
    let tenant_id = get_tenant_id(&claims, &headers);
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
        WHERE id = $1 AND tenant_id = $7
        RETURNING id, tenant_id, project_id, phase_id, name, description, target_date, actual_date, status, created_at, updated_at, deliverable_type, acceptance_criteria, acceptance_status, accepted_by, accepted_at
        "#,
    )
    .bind(id)
    .bind(payload.name.as_deref().map(|s| s.trim()))
    .bind(payload.description.as_deref())
    .bind(payload.target_date)
    .bind(payload.actual_date)
    .bind(payload.status.map(|s| s.to_string()))
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await;

    let duration = Utc::now() - start_time;

    match result {
        Ok(milestone) => {
            invalidate_project_cache(&milestone.project_id.to_string()).await;

            if milestone.status == "achieved" {
                let _ = project_progress::on_milestone_achieved(
                    &state.db,
                    milestone.project_id,
                    milestone.id,
                )
                .await;
                let _ = project_progress::update_project_progress(&state.db, milestone.project_id)
                    .await;
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
    State(state): State<super::ApiState>,
    Path(id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
) -> Json<ApiResponse<()>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let request_id = Uuid::new_v4();
    let start_time = Utc::now();

    tracing::info!(
        request_id = %request_id,
        milestone_id = %id,
        "删除项目里程碑请求开始"
    );

    let project_id_result = sqlx::query_scalar::<_, Uuid>(
        "SELECT project_id FROM rs.project_milestones WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    let result = sqlx::query(
        r#"
        DELETE FROM rs.project_milestones 
        WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .execute(&state.db)
    .await;

    let duration = Utc::now() - start_time;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
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
