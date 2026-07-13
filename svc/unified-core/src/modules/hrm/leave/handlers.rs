use axum::{
    extract::{Path, Query, State},
    Json,
};
use uuid::Uuid;

use crate::AppState;
use topems_shared::{api_error, api_success, ApiResponse};

use super::models::{
    ApproveLeaveRequest, CreateLeaveRequest, Leave, LeaveListResponse, LeaveQuery,
    UpdateLeaveRequest,
};

fn default_tenant_id() -> Uuid {
    Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap()
}

pub async fn list_leaves(
    State(state): State<AppState>,
    Query(query): Query<LeaveQuery>,
) -> Json<ApiResponse<LeaveListResponse>> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(10).clamp(1, 100);
    let offset = (page - 1) * page_size;
    let tenant_id = default_tenant_id();

    let total: i64 = match sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM core_hrm_leaves
           WHERE tenant_id = $1
             AND ($2::uuid IS NULL OR employee_id = $2)
             AND ($3::text IS NULL OR status = $3)
             AND ($4::text IS NULL OR leave_type = $4)"#,
    )
    .bind(tenant_id)
    .bind(query.employee_id)
    .bind(query.status.clone())
    .bind(query.leave_type.clone())
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询请假总数失败: {}", e);
            return Json(api_error(500, "查询请假总数失败"));
        }
    };

    let items: Vec<Leave> = match sqlx::query_as(
        r#"SELECT id, tenant_id, employee_id, leave_type, start_date, end_date, days,
                  reason, status, approver_id, approved_at, created_at, updated_at
           FROM core_hrm_leaves
           WHERE tenant_id = $1
             AND ($2::uuid IS NULL OR employee_id = $2)
             AND ($3::text IS NULL OR status = $3)
             AND ($4::text IS NULL OR leave_type = $4)
           ORDER BY created_at DESC
           LIMIT $5 OFFSET $6"#,
    )
    .bind(tenant_id)
    .bind(query.employee_id)
    .bind(query.status.clone())
    .bind(query.leave_type.clone())
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询请假列表失败: {}", e);
            return Json(api_error(500, "查询请假列表失败"));
        }
    };

    Json(api_success(LeaveListResponse {
        items,
        total,
        page,
        page_size,
    }))
}

pub async fn get_leave(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Leave>> {
    let tenant_id = default_tenant_id();

    let leave: Option<Leave> = match sqlx::query_as(
        r#"SELECT id, tenant_id, employee_id, leave_type, start_date, end_date, days,
                  reason, status, approver_id, approved_at, created_at, updated_at
           FROM core_hrm_leaves WHERE id = $1 AND tenant_id = $2"#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询请假详情失败: {}", e);
            return Json(api_error(500, "查询请假详情失败"));
        }
    };

    match leave {
        Some(leave) => Json(api_success(leave)),
        None => Json(api_error(404, "请假记录不存在")),
    }
}

pub async fn create_leave(
    State(state): State<AppState>,
    Json(req): Json<CreateLeaveRequest>,
) -> Json<ApiResponse<Leave>> {
    if req.leave_type.trim().is_empty() {
        return Json(api_error(400, "请假类型不能为空"));
    }

    let tenant_id = default_tenant_id();

    let leave: Leave = match sqlx::query_as(
        r#"INSERT INTO core_hrm_leaves
               (tenant_id, employee_id, leave_type, start_date, end_date, days, reason, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
           RETURNING id, tenant_id, employee_id, leave_type, start_date, end_date, days,
                     reason, status, approver_id, approved_at, created_at, updated_at"#,
    )
    .bind(tenant_id)
    .bind(req.employee_id)
    .bind(req.leave_type)
    .bind(req.start_date)
    .bind(req.end_date)
    .bind(req.days)
    .bind(req.reason)
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("创建请假记录失败: {}", e);
            return Json(api_error(500, "创建请假记录失败"));
        }
    };

    Json(api_success(leave))
}

pub async fn update_leave(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateLeaveRequest>,
) -> Json<ApiResponse<Leave>> {
    let tenant_id = default_tenant_id();

    let leave: Option<Leave> = match sqlx::query_as(
        r#"UPDATE core_hrm_leaves
           SET leave_type = COALESCE($1, leave_type),
               start_date = COALESCE($2, start_date),
               end_date = COALESCE($3, end_date),
               days = COALESCE($4, days),
               reason = COALESCE($5, reason),
               status = COALESCE($6, status),
               updated_at = NOW()
           WHERE id = $7 AND tenant_id = $8
           RETURNING id, tenant_id, employee_id, leave_type, start_date, end_date, days,
                     reason, status, approver_id, approved_at, created_at, updated_at"#,
    )
    .bind(req.leave_type)
    .bind(req.start_date)
    .bind(req.end_date)
    .bind(req.days)
    .bind(req.reason)
    .bind(req.status)
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("更新请假记录失败: {}", e);
            return Json(api_error(500, "更新请假记录失败"));
        }
    };

    match leave {
        Some(leave) => Json(api_success(leave)),
        None => Json(api_error(404, "请假记录不存在")),
    }
}

pub async fn delete_leave(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    let tenant_id = default_tenant_id();

    let result = sqlx::query(r#"DELETE FROM core_hrm_leaves WHERE id = $1 AND tenant_id = $2"#)
        .bind(id)
        .bind(tenant_id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(api_success(true)),
        Ok(_) => Json(api_error(404, "请假记录不存在")),
        Err(e) => {
            tracing::error!("删除请假记录失败: {}", e);
            Json(api_error(500, "删除请假记录失败"))
        }
    }
}

pub async fn approve_leave(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<ApproveLeaveRequest>,
) -> Json<ApiResponse<Leave>> {
    let tenant_id = default_tenant_id();

    let leave: Option<Leave> = match sqlx::query_as(
        r#"UPDATE core_hrm_leaves
           SET status = $1, approver_id = $2, approved_at = NOW(), updated_at = NOW()
           WHERE id = $3 AND tenant_id = $4 AND status = 'pending'
           RETURNING id, tenant_id, employee_id, leave_type, start_date, end_date, days,
                     reason, status, approver_id, approved_at, created_at, updated_at"#,
    )
    .bind(req.status)
    .bind(req.approver_id)
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("审批请假记录失败: {}", e);
            return Json(api_error(500, "审批请假记录失败"));
        }
    };

    match leave {
        Some(leave) => Json(api_success(leave)),
        None => Json(api_error(404, "请假记录不存在或状态不可审批")),
    }
}
