use axum::{
    extract::{Extension, Path, State},
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::Utc;
use sqlx::Error as SqlxError;
use std::time::Duration;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use uuid::Uuid;

use crate::cache::{cache_get, cache_set, invalidate_project_cache};
use crate::models::project_phase::{CreatePhaseRequest, ProjectPhase, UpdatePhaseRequest};
use crate::services::project_permission::{check_project_permission, ProjectPermission};
use crate::services::project_progress;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

pub fn create_routes() -> Router<super::ApiState> {
    Router::<super::ApiState>::new()
        .route("/phases", post(create_phase))
        .route(
            "/projects/{project_id}/phases",
            get(get_project_phases).post(create_phase),
        )
        .route("/phases/{id}", put(update_phase))
        .route("/phases/{id}", delete(delete_phase))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["rd:write"])),
    path = "/phases",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "project_phase"
)]
pub async fn create_phase(
    State(_state): State<super::ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(payload): Json<CreatePhaseRequest>,
) -> ApiResponse<ProjectPhase> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let tenant_opt: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap());
    match check_project_permission(
        &mut **txn,
        &claims,
        &payload.project_id,
        &ProjectPermission::ManagePhases,
    )
    .await
    {
        Ok(_) => {}
        Err(e) => return e,
    }

    let request_id = Uuid::new_v4();
    let start_time = Utc::now();

    tracing::info!(
        request_id = %request_id,
        project_id = %payload.project_id,
        phase_name = %payload.name,
        "创建项目阶段请求开始"
    );

    if payload.name.trim().is_empty() {
        tracing::warn!(
            request_id = %request_id,
            "创建项目阶段失败: 阶段名称不能为空"
        );
        return ApiResponse::bad_request("阶段名称不能为空");
    }

    let id = Uuid::new_v4();
    let weight = payload.weight.unwrap_or(0);

    let result = sqlx::query_as::<_, ProjectPhase>(
        r#"
        INSERT INTO rs.project_phases (
            id, tenant_id, project_id, phase_number, name, description, 
            start_date, end_date, status, progress, weight, predecessor_id,
            planned_duration_days, actual_duration_days
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id, tenant_id, project_id, phase_number, name, description, 
                  start_date, end_date, planned_duration_days, actual_duration_days,
                  status, progress, weight, predecessor_id, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .bind(payload.project_id)
    .bind(payload.phase_number)
    .bind(payload.name.trim())
    .bind(payload.description.as_deref())
    .bind(payload.start_date)
    .bind(payload.end_date)
    .bind("not_started")
    .bind(0)
    .bind(weight)
    .bind(payload.predecessor_id)
    .bind(None::<i32>)
    .bind(None::<i32>)
    .fetch_one(&mut **txn)
    .await;

    let duration = Utc::now() - start_time;

    match result {
        Ok(phase) => {
            let _ = project_progress::update_project_progress(&mut **txn, payload.project_id).await;
            invalidate_project_cache(&payload.project_id.to_string()).await;

            tracing::info!(
                request_id = %request_id,
                phase_id = %phase.id,
                duration_ms = duration.num_milliseconds(),
                "创建项目阶段成功"
            );
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return ApiResponse::server_error("提交事务失败");
                }
            }
            ApiResponse::success(phase, "项目阶段创建成功")
        }
        Err(SqlxError::Database(db_err)) => {
            tracing::error!(
                request_id = %request_id,
                error = %db_err,
                duration_ms = duration.num_milliseconds(),
                "创建项目阶段数据库错误"
            );
            if db_err.code().map(|c| c == "23503").unwrap_or(false) {
                ApiResponse::bad_request("关联的项目不存在")
            } else {
                ApiResponse::server_error("数据库操作失败")
            }
        }
        Err(e) => {
            tracing::error!(
                request_id = %request_id,
                error = %e,
                duration_ms = duration.num_milliseconds(),
                "创建项目阶段失败"
            );
            ApiResponse::server_error("创建项目阶段失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["rd:read"])),
    path = "/projects/{project_id}/phases",
    params(
("project_id" = String, Path, description = "project_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "project_phase"
)]
pub async fn get_project_phases(
    State(_state): State<super::ApiState>,
    Path(project_id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<Vec<ProjectPhase>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_project_permission(&mut **txn, &claims, &project_id, &ProjectPermission::Read).await
    {
        Ok(_) => {}
        Err(e) => return e,
    }

    let request_id = Uuid::new_v4();
    let start_time = Utc::now();
    let cache_key = format!("phases:{}", project_id);

    tracing::info!(
        request_id = %request_id,
        project_id = %project_id,
        "获取项目阶段列表请求开始"
    );

    if let Some(cached) = cache_get(&cache_key).await {
        return ApiResponse::success(cached, "获取项目阶段列表成功");
    }

    let result = sqlx::query_as::<_, ProjectPhase>(
        r#"
        SELECT id, tenant_id, project_id, phase_number, name, description, 
                  start_date, end_date, planned_duration_days, actual_duration_days,
                  status, progress, weight, predecessor_id, created_at, updated_at
        FROM rs.project_phases 
        WHERE project_id = $1
        ORDER BY phase_number
        "#,
    )
    .bind(project_id)
    .fetch_all(&mut **txn)
    .await;

    let duration = Utc::now() - start_time;

    match result {
        Ok(phases) => {
            cache_set(&cache_key, phases.clone(), Duration::from_secs(300)).await;
            tracing::info!(
                request_id = %request_id,
                project_id = %project_id,
                phase_count = phases.len(),
                duration_ms = duration.num_milliseconds(),
                "获取项目阶段列表成功"
            );
            ApiResponse::success(phases, "获取项目阶段列表成功")
        }
        Err(e) => {
            tracing::error!(
                request_id = %request_id,
                project_id = %project_id,
                error = %e,
                duration_ms = duration.num_milliseconds(),
                "获取项目阶段列表失败"
            );
            ApiResponse::server_error("获取项目阶段列表失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["rd:write"])),
    path = "/phases/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "project_phase"
)]
pub async fn update_phase(
    State(_state): State<super::ApiState>,
    Path(id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(payload): Json<UpdatePhaseRequest>,
) -> ApiResponse<ProjectPhase> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let project_id = match sqlx::query_scalar::<_, Uuid>(
        "SELECT project_id FROM rs.project_phases WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&mut **txn)
    .await
    {
        Ok(Some(pid)) => pid,
        Ok(None) => return ApiResponse::not_found("阶段不存在"),
        Err(e) => {
            tracing::error!("查询阶段所属项目失败: {}", e);
            return ApiResponse::server_error("查询阶段失败");
        }
    };

    match check_project_permission(
        &mut **txn,
        &claims,
        &project_id,
        &ProjectPermission::ManagePhases,
    )
    .await
    {
        Ok(_) => {}
        Err(e) => return e,
    }

    let request_id = Uuid::new_v4();
    let start_time = Utc::now();

    tracing::info!(
        request_id = %request_id,
        phase_id = %id,
        "更新项目阶段请求开始"
    );

    if let Some(name) = &payload.name {
        if name.trim().is_empty() {
            tracing::warn!(
                request_id = %request_id,
                phase_id = %id,
                "更新项目阶段失败: 阶段名称不能为空"
            );
            return ApiResponse::bad_request("阶段名称不能为空");
        }
    }

    let result = sqlx::query_as::<_, ProjectPhase>(
        r#"
        UPDATE rs.project_phases
        SET 
            name = COALESCE($2, name),
            description = COALESCE($3, description),
            start_date = COALESCE($4, start_date),
            end_date = COALESCE($5, end_date),
            status = COALESCE($6, status),
            progress = COALESCE($7, progress),
            weight = COALESCE($8, weight),
            predecessor_id = COALESCE($9, predecessor_id),
            updated_at = NOW()
        WHERE id = $1
        RETURNING id, tenant_id, project_id, phase_number, name, description, 
                  start_date, end_date, planned_duration_days, actual_duration_days,
                  status, progress, weight, predecessor_id, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(payload.name.as_deref().map(|s| s.trim()))
    .bind(payload.description.as_deref())
    .bind(payload.start_date)
    .bind(payload.end_date)
    .bind(payload.status.map(|s| s.as_db_str()))
    .bind(payload.progress)
    .bind(payload.weight)
    .bind(payload.predecessor_id)
    .fetch_one(&mut **txn)
    .await;

    let duration = Utc::now() - start_time;

    match result {
        Ok(phase) => {
            let _ = project_progress::update_project_progress(&mut **txn, phase.project_id).await;
            invalidate_project_cache(&phase.project_id.to_string()).await;

            tracing::info!(
                request_id = %request_id,
                phase_id = %phase.id,
                duration_ms = duration.num_milliseconds(),
                "更新项目阶段成功"
            );
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return ApiResponse::server_error("提交事务失败");
                }
            }
            ApiResponse::success(phase, "项目阶段更新成功")
        }
        Err(SqlxError::RowNotFound) => {
            tracing::warn!(
                request_id = %request_id,
                phase_id = %id,
                duration_ms = duration.num_milliseconds(),
                "更新项目阶段失败: 阶段不存在"
            );
            ApiResponse::not_found("阶段不存在")
        }
        Err(SqlxError::Database(db_err)) => {
            tracing::error!(
                request_id = %request_id,
                phase_id = %id,
                error = %db_err,
                duration_ms = duration.num_milliseconds(),
                "更新项目阶段数据库错误"
            );
            ApiResponse::server_error("数据库操作失败")
        }
        Err(e) => {
            tracing::error!(
                request_id = %request_id,
                phase_id = %id,
                error = %e,
                duration_ms = duration.num_milliseconds(),
                "更新项目阶段失败"
            );
            ApiResponse::server_error("更新项目阶段失败")
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["rd:write"])),
    path = "/phases/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "project_phase"
)]
pub async fn delete_phase(
    State(_state): State<super::ApiState>,
    Path(id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<()> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let request_id = Uuid::new_v4();
    let start_time = Utc::now();

    tracing::info!(
        request_id = %request_id,
        phase_id = %id,
        "删除项目阶段请求开始"
    );

    let project_id = match sqlx::query_scalar::<_, Uuid>(
        "SELECT project_id FROM rs.project_phases WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&mut **txn)
    .await
    {
        Ok(Some(pid)) => pid,
        Ok(None) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            return ApiResponse::not_found("阶段不存在");
        }

        Err(e) => {
            tracing::error!("查询阶段所属项目失败: {}", e);
            return ApiResponse::server_error("查询阶段失败");
        }
    };

    match check_project_permission(
        &mut **txn,
        &claims,
        &project_id,
        &ProjectPermission::ManagePhases,
    )
    .await
    {
        Ok(_) => {}
        Err(e) => return e,
    }

    let get_result = sqlx::query_scalar::<_, Uuid>(
        r#"
        SELECT project_id FROM rs.project_phases WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    let maybe_project_id = match get_result {
        Ok(pid) => pid,
        Err(e) => {
            tracing::error!(
                request_id = %request_id,
                phase_id = %id,
                error = %e,
                "获取项目阶段项目ID失败"
            );
            return ApiResponse::server_error("数据库操作失败");
        }
    };

    let result = sqlx::query(
        r#"
        DELETE FROM rs.project_phases 
        WHERE id = $1
        "#,
    )
    .bind(id)
    .execute(&mut **txn)
    .await;

    let duration = Utc::now() - start_time;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            if let Some(project_id) = maybe_project_id {
                let _ = project_progress::update_project_progress(&mut **txn, project_id).await;
                invalidate_project_cache(&project_id.to_string()).await;
            }
            tracing::info!(
                request_id = %request_id,
                phase_id = %id,
                duration_ms = duration.num_milliseconds(),
                "删除项目阶段成功"
            );
            ApiResponse::success((), "项目阶段删除成功")
        }
        Ok(_) => {
            tracing::warn!(
                request_id = %request_id,
                phase_id = %id,
                duration_ms = duration.num_milliseconds(),
                "删除项目阶段失败: 阶段不存在"
            );
            ApiResponse::not_found("阶段不存在")
        }
        Err(e) => {
            tracing::error!(
                request_id = %request_id,
                phase_id = %id,
                error = %e,
                duration_ms = duration.num_milliseconds(),
                "删除项目阶段失败"
            );
            ApiResponse::server_error("删除项目阶段失败")
        }
    }
}
