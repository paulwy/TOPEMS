use axum::{
    extract::{Path, State},
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::Utc;
use sqlx::{Error as SqlxError};
use std::sync::Arc;
use uuid::Uuid;

use crate::models::project_member::{
    CreateMemberRequest, MemberStatus, ProjectMember, UpdateMemberRequest,
};
use topems_shared::response::ApiResponse;

pub async fn create_routes() -> topems_shared::Result<Router> {
    let router = Router::new()
        .route("/api/v1/members", post(create_member))
        .route(
            "/api/v1/members/project/{project_id}",
            get(get_project_members),
        )
        .route("/api/v1/members/{id}", put(update_member))
        .route("/api/v1/members/{id}", delete(delete_member));
    Ok(router)
}

pub async fn create_member(
    State(state): State<Arc<super::ApiState>>,
    Json(payload): Json<CreateMemberRequest>,
) -> Json<ApiResponse<ProjectMember>> {
    let request_id = Uuid::new_v4();
    let start_time = Utc::now();

    tracing::info!(
        request_id = %request_id,
        project_id = %payload.project_id,
        employee_id = %payload.employee_id,
        role = %payload.role,
        "创建项目成员请求开始"
    );

    let allocation = payload.allocation.unwrap_or(1.0);
    if allocation <= 0.0 || allocation > 1.0 {
        tracing::warn!(
            request_id = %request_id,
            "创建项目成员失败: 分配比例必须在0到1之间"
        );
        return Json(ApiResponse::error(400, "分配比例必须在0到1之间"));
    }

    let id = Uuid::new_v4();
    let status = MemberStatus::Active.to_string();

    let result = sqlx::query_as::<_, ProjectMember>(
        r#"
        INSERT INTO rs.project_members (
            id, project_id, employee_id, role, responsibility, allocation, join_date, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, project_id, employee_id, role, responsibility, allocation, join_date, leave_date, status, hourly_rate, cost_rate, budgeted_hours, actual_hours, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(payload.project_id)
    .bind(payload.employee_id)
    .bind(payload.role.to_string())
    .bind(payload.responsibility.as_deref())
    .bind(allocation)
    .bind(payload.join_date)
    .bind(status)
    .fetch_one(&state.db)
    .await;

    let duration = Utc::now() - start_time;

    match result {
        Ok(member) => {
            tracing::info!(
                request_id = %request_id,
                member_id = %member.id,
                duration_ms = duration.num_milliseconds(),
                "创建项目成员成功"
            );
            Json(ApiResponse::success(member, "项目成员创建成功"))
        }
        Err(SqlxError::Database(db_err)) => {
            tracing::error!(
                request_id = %request_id,
                error = %db_err,
                duration_ms = duration.num_milliseconds(),
                "创建项目成员数据库错误"
            );
            if db_err.code().map(|c| c == "23503").unwrap_or(false) {
                Json(ApiResponse::error(400, "关联的项目不存在"))
            } else if db_err.code().map(|c| c == "23505").unwrap_or(false) {
                Json(ApiResponse::error(400, "该成员已加入此项目"))
            } else {
                Json(ApiResponse::error(500, "数据库操作失败"))
            }
        }
        Err(e) => {
            tracing::error!(
                request_id = %request_id,
                error = %e,
                duration_ms = duration.num_milliseconds(),
                "创建项目成员失败"
            );
            Json(ApiResponse::error(500, "创建项目成员失败"))
        }
    }
}

pub async fn get_project_members(
    State(state): State<Arc<super::ApiState>>,
    Path(project_id): Path<Uuid>,
) -> Json<ApiResponse<Vec<ProjectMember>>> {
    let request_id = Uuid::new_v4();
    let start_time = Utc::now();

    tracing::info!(
        request_id = %request_id,
        project_id = %project_id,
        "获取项目成员列表请求开始"
    );

    let result = sqlx::query_as::<_, ProjectMember>(
        r#"SELECT id, project_id, employee_id, role, responsibility, allocation, join_date, leave_date, status, hourly_rate, cost_rate, budgeted_hours, actual_hours, created_at, updated_at
           FROM rs.project_members WHERE project_id = $1 ORDER BY join_date"#,
    )
    .bind(project_id)
    .fetch_all(&state.db)
    .await;

    let duration = Utc::now() - start_time;

    match result {
        Ok(members) => {
            tracing::info!(
                request_id = %request_id,
                project_id = %project_id,
                member_count = members.len(),
                duration_ms = duration.num_milliseconds(),
                "获取项目成员列表成功"
            );
            Json(ApiResponse::success(members, "获取项目成员列表成功"))
        }
        Err(e) => {
            tracing::error!(
                request_id = %request_id,
                project_id = %project_id,
                error = %e,
                duration_ms = duration.num_milliseconds(),
                "获取项目成员列表失败"
            );
            Json(ApiResponse::error(500, "获取项目成员列表失败"))
        }
    }
}

pub async fn update_member(
    State(state): State<Arc<super::ApiState>>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateMemberRequest>,
) -> Json<ApiResponse<ProjectMember>> {
    let request_id = Uuid::new_v4();
    let start_time = Utc::now();

    tracing::info!(
        request_id = %request_id,
        member_id = %id,
        "更新项目成员请求开始"
    );

    if let Some(allocation) = payload.allocation {
        if allocation <= 0.0 || allocation > 1.0 {
            tracing::warn!(
                request_id = %request_id,
                member_id = %id,
                "更新项目成员失败: 分配比例必须在0到1之间"
            );
            return Json(ApiResponse::error(400, "分配比例必须在0到1之间"));
        }
    }

    let result = sqlx::query_as::<_, ProjectMember>(
        r#"
        UPDATE rs.project_members
        SET 
            role = COALESCE($2, role),
            responsibility = COALESCE($3, responsibility),
            allocation = COALESCE($4, allocation),
            leave_date = COALESCE($5, leave_date),
            status = COALESCE($6, status),
            updated_at = NOW()
        WHERE id = $1
        RETURNING id, project_id, employee_id, role, responsibility, allocation, join_date, leave_date, status, hourly_rate, cost_rate, budgeted_hours, actual_hours, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(payload.role.map(|r| r.to_string()))
    .bind(payload.responsibility.as_deref())
    .bind(payload.allocation)
    .bind(payload.leave_date)
    .bind(payload.status.map(|s| s.to_string()))
    .fetch_one(&state.db)
    .await;

    let duration = Utc::now() - start_time;

    match result {
        Ok(member) => {
            tracing::info!(
                request_id = %request_id,
                member_id = %member.id,
                duration_ms = duration.num_milliseconds(),
                "更新项目成员成功"
            );
            Json(ApiResponse::success(member, "项目成员更新成功"))
        }
        Err(SqlxError::RowNotFound) => {
            tracing::warn!(
                request_id = %request_id,
                member_id = %id,
                duration_ms = duration.num_milliseconds(),
                "更新项目成员失败: 成员不存在"
            );
            Json(ApiResponse::error(404, "成员不存在"))
        }
        Err(SqlxError::Database(db_err)) => {
            tracing::error!(
                request_id = %request_id,
                member_id = %id,
                error = %db_err,
                duration_ms = duration.num_milliseconds(),
                "更新项目成员数据库错误"
            );
            Json(ApiResponse::error(500, "数据库操作失败"))
        }
        Err(e) => {
            tracing::error!(
                request_id = %request_id,
                member_id = %id,
                error = %e,
                duration_ms = duration.num_milliseconds(),
                "更新项目成员失败"
            );
            Json(ApiResponse::error(500, "更新项目成员失败"))
        }
    }
}

pub async fn delete_member(
    State(state): State<Arc<super::ApiState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<()>> {
    let request_id = Uuid::new_v4();
    let start_time = Utc::now();

    tracing::info!(
        request_id = %request_id,
        member_id = %id,
        "删除项目成员请求开始"
    );

    let result = sqlx::query(r#"DELETE FROM rs.project_members WHERE id = $1"#)
        .bind(id)
        .execute(&state.db)
        .await;

    let duration = Utc::now() - start_time;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            tracing::info!(
                request_id = %request_id,
                member_id = %id,
                duration_ms = duration.num_milliseconds(),
                "删除项目成员成功"
            );
            Json(ApiResponse::success((), "项目成员删除成功"))
        }
        Ok(_) => {
            tracing::warn!(
                request_id = %request_id,
                member_id = %id,
                duration_ms = duration.num_milliseconds(),
                "删除项目成员失败: 成员不存在"
            );
            Json(ApiResponse::error(404, "成员不存在"))
        }
        Err(e) => {
            tracing::error!(
                request_id = %request_id,
                member_id = %id,
                error = %e,
                duration_ms = duration.num_milliseconds(),
                "删除项目成员失败"
            );
            Json(ApiResponse::error(500, "删除项目成员失败"))
        }
    }
}
