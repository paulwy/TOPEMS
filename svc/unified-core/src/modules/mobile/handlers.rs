use crate::AppState;
use axum::{
    extract::{Extension, Path, Query, State},
    Json, Router,
};
use serde::Deserialize;
use topems_shared::auth::Claims;
use topems_shared::ApiResponse;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct MobileQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

pub fn create_mobile_api_routes(_state: &AppState) -> Router<AppState> {
    use axum::routing::{get, post};

    Router::new()
        .route("/approval/tasks", get(mobile_get_approvals))
        .route("/approval/tasks/pending", get(mobile_get_pending_approvals))
        .route("/approval/tasks/{id}", get(mobile_get_approval_detail))
        .route("/approval/tasks/{id}/approve", post(mobile_approve_task))
        .route("/approval/tasks/{id}/reject", post(mobile_reject_task))
        .route("/attendance/stats", get(mobile_get_attendance_stats))
        .route("/attendance/records", get(mobile_get_attendance_records))
        .route("/attendance/today", get(mobile_get_today_attendance))
        .route("/attendance/checkin", post(mobile_checkin))
        .route("/attendance/checkout", post(mobile_checkout))
        .route("/task/list", get(mobile_get_tasks))
        .route("/task/pending", get(mobile_get_pending_tasks))
        .route("/task/{id}", get(mobile_get_task_detail))
        .route("/dashboard/stats", get(mobile_get_dashboard_stats))
        .route("/dashboard/quick-actions", get(mobile_get_quick_actions))
        .route("/dashboard/events", get(mobile_get_events))
        .route("/dashboard/tasks", get(mobile_get_dashboard_tasks))
        .route("/scan/items", get(mobile_get_scan_items))
}

pub async fn mobile_get_approvals(
    State(state): State<AppState>,
    Query(params): Query<MobileQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);

    let rows = sqlx::query!(
        r#"SELECT 
            t.id,
            t.instance_id,
            t.node_id,
            t.status,
            t.comment,
            t.created_at,
            t.completed_at,
            COALESCE(i.title, '') as instance_title,
            COALESCE(w.name, '') as workflow_name
           FROM core_workflow_tasks t
           LEFT JOIN core_workflow_instances i ON t.instance_id = i.id
           LEFT JOIN core_workflows w ON i.workflow_id = w.id
           ORDER BY t.created_at DESC
           LIMIT $1 OFFSET $2"#,
        page_size as i64,
        ((page - 1) * page_size) as i64,
    )
    .fetch_all(&state.pool)
    .await;

    match rows {
        Ok(rows) => {
            let tasks: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|row| {
                    serde_json::json!({
                        "id": row.id.to_string(),
                        "instance_id": if row.instance_id.is_nil() { serde_json::Value::Null } else { serde_json::Value::String(row.instance_id.to_string()) },
                        "node_id": row.node_id,
                        "status": row.status,
                        "comment": row.comment,
                        "created_at": row.created_at,
                        "completed_at": row.completed_at,
                        "title": row.instance_title,
                        "workflow_name": row.workflow_name,
                    })
                })
                .collect();

            let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM core_workflow_tasks")
                .fetch_one(&state.pool)
                .await
                .unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": tasks,
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                }),
                "获取审批列表成功",
            ))
        }
        Err(_e) => Json(ApiResponse::error(500, "查询失败")),
    }
}

pub async fn mobile_get_pending_approvals(
    State(state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    let rows = sqlx::query!(
        r#"SELECT 
            t.id,
            t.instance_id,
            t.node_id,
            t.status,
            t.comment,
            t.created_at,
            COALESCE(i.title, '') as instance_title,
            COALESCE(w.name, '') as workflow_name
           FROM core_workflow_tasks t
           LEFT JOIN core_workflow_instances i ON t.instance_id = i.id
           LEFT JOIN core_workflows w ON i.workflow_id = w.id
           WHERE t.status = 'pending'
           ORDER BY t.created_at DESC
           LIMIT 20"#,
    )
    .fetch_all(&state.pool)
    .await;

    match rows {
        Ok(rows) => {
            let tasks: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|row| {
                    serde_json::json!({
                        "id": row.id.to_string(),
                        "instance_id": if row.instance_id.is_nil() { serde_json::Value::Null } else { serde_json::Value::String(row.instance_id.to_string()) },
                        "node_id": row.node_id,
                        "status": row.status,
                        "comment": row.comment,
                        "created_at": row.created_at,
                        "title": row.instance_title,
                        "workflow_name": row.workflow_name,
                    })
                })
                .collect();

            Json(ApiResponse::success(
                serde_json::Value::Array(tasks),
                "获取待审批列表成功",
            ))
        }
        Err(_e) => Json(ApiResponse::error(500, "查询失败")),
    }
}

pub async fn mobile_get_approval_detail(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    let uuid = match uuid::Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的任务ID")),
    };

    let row = sqlx::query!(
        r#"SELECT 
            t.id,
            t.instance_id,
            t.node_id,
            t.status,
            t.comment,
            t.created_at,
            t.completed_at,
            t.assignee_id,
            COALESCE(i.title, '') as instance_title,
            i.status as instance_status,
            i.started_at as instance_started_at,
            i.completed_at as instance_completed_at,
            COALESCE(w.name, '') as workflow_name,
            COALESCE(w.description, '') as workflow_description,
            w.version as workflow_version
           FROM core_workflow_tasks t
           LEFT JOIN core_workflow_instances i ON t.instance_id = i.id
           LEFT JOIN core_workflows w ON i.workflow_id = w.id
           WHERE t.id = $1"#,
        uuid,
    )
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(row) => {
            let detail = serde_json::json!({
                "id": row.id.to_string(),
                "instance_id": if row.instance_id.is_nil() { serde_json::Value::Null } else { serde_json::Value::String(row.instance_id.to_string()) },
                "node_id": row.node_id,
                "status": row.status,
                "comment": row.comment,
                "created_at": row.created_at,
                "completed_at": row.completed_at,
                "assignee_id": if row.assignee_id.is_nil() { serde_json::Value::Null } else { serde_json::Value::String(row.assignee_id.to_string()) },
                "title": row.instance_title,
                "description": row.workflow_description,
                "instance_status": row.instance_status,
                "started_at": row.instance_started_at,
                "completed_at": row.instance_completed_at,
                "workflow_name": row.workflow_name,
                "workflow_description": row.workflow_description,
                "workflow_version": row.workflow_version,
            });

            Json(ApiResponse::success(detail, "获取审批详情成功"))
        }
        Err(_e) => Json(ApiResponse::error(500, "查询失败")),
    }
}

#[derive(Debug, Deserialize)]
pub struct ApproveRequest {
    pub comment: Option<String>,
}

pub async fn mobile_approve_task(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(body): Json<ApproveRequest>,
) -> Json<ApiResponse<()>> {
    let uuid = match uuid::Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的任务ID")),
    };

    let _ = sqlx::query!(
        r#"UPDATE core_workflow_tasks 
           SET status = 'approved', comment = $1, completed_at = NOW()
           WHERE id = $2"#,
        body.comment,
        uuid,
    )
    .execute(&state.pool)
    .await;

    Json(ApiResponse::success((), "审批通过成功"))
}

pub async fn mobile_reject_task(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(body): Json<ApproveRequest>,
) -> Json<ApiResponse<()>> {
    let uuid = match uuid::Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的任务ID")),
    };

    let _ = sqlx::query!(
        r#"UPDATE core_workflow_tasks 
           SET status = 'rejected', comment = $1, completed_at = NOW()
           WHERE id = $2"#,
        body.comment,
        uuid,
    )
    .execute(&state.pool)
    .await;

    Json(ApiResponse::success((), "审批拒绝成功"))
}

pub async fn mobile_get_attendance_stats(
    State(state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    let row = sqlx::query!(
        r#"SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'normal' THEN 1 ELSE 0 END) as normal_count,
            SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_count,
            SUM(CASE WHEN status = 'early_leave' THEN 1 ELSE 0 END) as early_leave_count,
            SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_count
           FROM core_hrm_attendance
           WHERE DATE(created_at) >= DATE(NOW() - INTERVAL '30 days')"#,
    )
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(row) => {
            let stats = serde_json::json!({
                "total": row.total.unwrap_or(0),
                "normal_count": row.normal_count.unwrap_or(0),
                "late_count": row.late_count.unwrap_or(0),
                "early_leave_count": row.early_leave_count.unwrap_or(0),
                "absent_count": row.absent_count.unwrap_or(0),
                "on_time_rate": if row.total.unwrap_or(0) > 0 {
                    ((row.normal_count.unwrap_or(0) as f64 / row.total.unwrap_or(1) as f64) * 100.0).round()
                } else {
                    100.0
                },
            });

            Json(ApiResponse::success(stats, "获取考勤统计成功"))
        }
        Err(_e) => Json(ApiResponse::error(500, "查询失败")),
    }
}

pub async fn mobile_get_attendance_records(
    State(state): State<AppState>,
    Query(params): Query<MobileQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);

    let rows = sqlx::query!(
        r#"SELECT 
            id,
            employee_id,
            check_in_time,
            check_out_time,
            status,
            remarks,
            created_at,
            updated_at
           FROM core_hrm_attendance
           ORDER BY created_at DESC
           LIMIT $1 OFFSET $2"#,
        page_size as i64,
        ((page - 1) * page_size) as i64,
    )
    .fetch_all(&state.pool)
    .await;

    match rows {
        Ok(rows) => {
            let records: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|row| {
                    serde_json::json!({
                        "id": row.id.to_string(),
                        "employee_id": row.employee_id.to_string(),
                        "checkin_time": row.check_in_time,
                        "checkout_time": row.check_out_time,
                        "status": row.status,
                        "location": serde_json::Value::Null,
                        "notes": row.remarks,
                        "created_at": row.created_at,
                        "updated_at": row.updated_at,
                    })
                })
                .collect();

            let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM core_hrm_attendance")
                .fetch_one(&state.pool)
                .await
                .unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": records,
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                }),
                "获取考勤记录成功",
            ))
        }
        Err(_e) => Json(ApiResponse::error(500, "查询失败")),
    }
}

pub async fn mobile_get_today_attendance(
    State(state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    let row = sqlx::query!(
        r#"SELECT 
            id,
            employee_id,
            check_in_time,
            check_out_time,
            status,
            remarks,
            created_at,
            updated_at
           FROM core_hrm_attendance
           WHERE DATE(created_at) = DATE(NOW())
           ORDER BY created_at DESC
           LIMIT 1"#,
    )
    .fetch_optional(&state.pool)
    .await;

    match row {
        Ok(Some(row)) => {
            let record = serde_json::json!({
                "id": row.id.to_string(),
                "employee_id": row.employee_id.to_string(),
                "checkin_time": row.check_in_time,
                "checkout_time": row.check_out_time,
                "status": row.status,
                "location": serde_json::Value::Null,
                "notes": row.remarks,
                "created_at": row.created_at,
                "updated_at": row.updated_at,
            });

            Json(ApiResponse::success(record, "获取今日考勤成功"))
        }
        Ok(None) => Json(ApiResponse::success(
            serde_json::Value::Null,
            "今日暂无考勤记录",
        )),
        Err(_e) => Json(ApiResponse::error(500, "查询失败")),
    }
}

#[derive(Debug, Deserialize)]
pub struct CheckInRequest {
    pub location: Option<String>,
    pub notes: Option<String>,
}

pub async fn mobile_checkin(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(body): Json<CheckInRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(e) => {
            tracing::error!("Invalid user ID: {}", e);
            return Json(ApiResponse::error(400, "无效的用户ID"));
        }
    };

    let tenant_id = match claims.tenant_id.as_ref() {
        Some(tid) => match Uuid::parse_str(tid) {
            Ok(id) => id,
            Err(_) => Uuid::new_v4(),
        },
        None => Uuid::new_v4(),
    };

    let employee_id: Uuid = match sqlx::query!(
        r#"SELECT id FROM core_hrm_employees WHERE tenant_id = $1 LIMIT 1"#,
        tenant_id,
    )
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(row)) => row.id,
        Ok(None) => {
            let emp_id = Uuid::new_v4();
            let _ = sqlx::query!(
                r#"INSERT INTO core_hrm_employees 
                   (id, tenant_id, employee_no, name, status)
                   VALUES ($1, $2, $3, $4, 'active')"#,
                emp_id,
                tenant_id,
                format!(
                    "EMP{}",
                    user_id.to_string().split('-').next().unwrap_or("000")
                ),
                claims.username,
            )
            .execute(&state.pool)
            .await;
            emp_id
        }
        Err(e) => {
            tracing::error!("查询员工失败: {}", e);
            Uuid::new_v4()
        }
    };

    let row = sqlx::query!(
        r#"INSERT INTO core_hrm_attendance 
           (tenant_id, employee_id, date, check_in_time, status, remarks)
           VALUES ($1, $2, CURRENT_DATE, NOW(), 'normal', $3)
           RETURNING id, check_in_time"#,
        tenant_id,
        employee_id,
        body.notes,
    )
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(row) => {
            let record = serde_json::json!({
                "id": row.id.to_string(),
                "checkin_time": row.check_in_time,
            });

            Json(ApiResponse::success(record, "签到成功"))
        }
        Err(e) => {
            tracing::error!("签到失败: {}", e);
            Json(ApiResponse::error(500, "签到失败"))
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct CheckOutRequest {
    pub location: Option<String>,
    pub notes: Option<String>,
}

pub async fn mobile_checkout(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(body): Json<CheckOutRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let _user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(e) => {
            tracing::error!("Invalid user ID: {}", e);
            return Json(ApiResponse::error(400, "无效的用户ID"));
        }
    };

    let tenant_id = match claims.tenant_id.as_ref() {
        Some(tid) => match Uuid::parse_str(tid) {
            Ok(id) => id,
            Err(_) => Uuid::new_v4(),
        },
        None => Uuid::new_v4(),
    };

    let row = sqlx::query!(
        r#"UPDATE core_hrm_attendance 
           SET check_out_time = NOW(), remarks = $1, status = 'normal'
           WHERE tenant_id = $2 AND date = CURRENT_DATE AND check_out_time IS NULL
           RETURNING id, check_out_time"#,
        body.notes,
        tenant_id,
    )
    .fetch_optional(&state.pool)
    .await;

    match row {
        Ok(Some(row)) => {
            let record = serde_json::json!({
                "id": row.id.to_string(),
                "checkout_time": row.check_out_time,
            });

            Json(ApiResponse::success(record, "签退成功"))
        }
        Ok(None) => Json(ApiResponse::error(400, "今日无签到记录或已签退")),
        Err(e) => {
            tracing::error!("签退失败: {}", e);
            Json(ApiResponse::error(500, "签退失败"))
        }
    }
}

pub async fn mobile_get_tasks(
    State(state): State<AppState>,
    Query(params): Query<MobileQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);

    let rows = sqlx::query!(
        r#"SELECT 
            t.id,
            COALESCE(i.title, '') as title,
            t.status,
            t.assignee_id,
            t.created_at,
            t.completed_at,
            t.node_id,
            t.comment
           FROM core_workflow_tasks t
           LEFT JOIN core_workflow_instances i ON t.instance_id = i.id
           ORDER BY t.created_at DESC
           LIMIT $1 OFFSET $2"#,
        page_size as i64,
        ((page - 1) * page_size) as i64,
    )
    .fetch_all(&state.pool)
    .await;

    match rows {
        Ok(rows) => {
            let tasks: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|row| {
                    serde_json::json!({
                        "id": row.id.to_string(),
                        "title": row.title,
                        "description": serde_json::Value::Null,
                        "status": row.status,
                        "priority": serde_json::Value::Null,
                        "assignee_id": if row.assignee_id.is_nil() { serde_json::Value::Null } else { serde_json::Value::String(row.assignee_id.to_string()) },
                        "due_date": serde_json::Value::Null,
                        "created_at": row.created_at,
                        "updated_at": row.created_at,
                        "node_id": row.node_id,
                        "comment": row.comment,
                    })
                })
                .collect();

            let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM core_workflow_tasks")
                .fetch_one(&state.pool)
                .await
                .unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": tasks,
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                }),
                "获取任务列表成功",
            ))
        }
        Err(_e) => Json(ApiResponse::error(500, "查询失败")),
    }
}

pub async fn mobile_get_pending_tasks(
    State(state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    let rows = sqlx::query!(
        r#"SELECT 
            t.id,
            COALESCE(i.title, '') as title,
            t.status,
            t.assignee_id,
            t.created_at,
            t.node_id
           FROM core_workflow_tasks t
           LEFT JOIN core_workflow_instances i ON t.instance_id = i.id
           WHERE t.status = 'pending'
           ORDER BY t.created_at DESC
           LIMIT 20"#,
    )
    .fetch_all(&state.pool)
    .await;

    match rows {
        Ok(rows) => {
            let tasks: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|row| {
                    serde_json::json!({
                        "id": row.id.to_string(),
                        "title": row.title,
                        "description": serde_json::Value::Null,
                        "status": row.status,
                        "priority": serde_json::Value::Null,
                        "assignee_id": if row.assignee_id.is_nil() { serde_json::Value::Null } else { serde_json::Value::String(row.assignee_id.to_string()) },
                        "due_date": serde_json::Value::Null,
                        "created_at": row.created_at,
                    })
                })
                .collect();

            Json(ApiResponse::success(
                serde_json::Value::Array(tasks),
                "获取待处理任务成功",
            ))
        }
        Err(_e) => Json(ApiResponse::error(500, "查询失败")),
    }
}

pub async fn mobile_get_task_detail(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    let uuid = match uuid::Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的任务ID")),
    };

    let row = sqlx::query!(
        r#"SELECT 
            t.id,
            COALESCE(i.title, '') as title,
            t.status,
            t.assignee_id,
            t.created_at,
            t.completed_at,
            t.instance_id,
            t.node_id,
            t.comment
           FROM core_workflow_tasks t
           LEFT JOIN core_workflow_instances i ON t.instance_id = i.id
           WHERE t.id = $1"#,
        uuid,
    )
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(row) => {
            let detail = serde_json::json!({
                "id": row.id.to_string(),
                "title": row.title,
                "description": serde_json::Value::Null,
                "status": row.status,
                "priority": serde_json::Value::Null,
                "assignee_id": if row.assignee_id.is_nil() { serde_json::Value::Null } else { serde_json::Value::String(row.assignee_id.to_string()) },
                "due_date": serde_json::Value::Null,
                "created_at": row.created_at,
                "updated_at": row.created_at,
                "completed_at": row.completed_at,
                "instance_id": if row.instance_id.is_nil() { serde_json::Value::Null } else { serde_json::Value::String(row.instance_id.to_string()) },
                "node_id": row.node_id,
                "comment": row.comment,
            });

            Json(ApiResponse::success(detail, "获取任务详情成功"))
        }
        Err(_e) => Json(ApiResponse::error(500, "查询失败")),
    }
}

pub async fn mobile_get_dashboard_stats(
    State(state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    let workflow_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM core_workflows")
        .fetch_one(&state.pool)
        .await
        .unwrap_or(0);

    let task_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM core_workflow_tasks")
        .fetch_one(&state.pool)
        .await
        .unwrap_or(0);

    let pending_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM core_workflow_tasks WHERE status = 'pending'")
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);

    let attendance_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM core_hrm_attendance WHERE DATE(created_at) = DATE(NOW())",
    )
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);

    let stats = serde_json::json!({
        "workflow_count": workflow_count,
        "task_count": task_count,
        "pending_count": pending_count,
        "attendance_count": attendance_count,
        "today": chrono::Utc::now().format("%Y-%m-%d").to_string(),
    });

    Json(ApiResponse::success(stats, "获取仪表盘统计成功"))
}

pub async fn mobile_get_quick_actions(
    State(_state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    let actions = serde_json::json!([
        {"id": "checkin", "name": "签到", "icon": "check-circle", "color": "#10B981"},
        {"id": "scan", "name": "扫码", "icon": "scan-line", "color": "#3B82F6"},
        {"id": "approval", "name": "审批", "icon": "file-check", "color": "#F59E0B"},
        {"id": "task", "name": "任务", "icon": "list-todo", "color": "#8B5CF6"},
    ]);

    Json(ApiResponse::success(actions, "获取快捷操作成功"))
}

pub async fn mobile_get_events(
    State(state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    let rows = sqlx::query!(
        r#"SELECT 
            i.id,
            COALESCE(i.title, '') as title,
            i.status,
            i.started_at,
            COALESCE(w.name, '') as workflow_name
           FROM core_workflow_instances i
           LEFT JOIN core_workflows w ON i.workflow_id = w.id
           ORDER BY i.started_at DESC
           LIMIT 10"#,
    )
    .fetch_all(&state.pool)
    .await;

    match rows {
        Ok(rows) => {
            let events: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|row| {
                    serde_json::json!({
                        "id": row.id.to_string(),
                        "title": row.title,
                        "status": row.status,
                        "created_at": row.started_at,
                        "workflow_name": row.workflow_name,
                    })
                })
                .collect();

            Json(ApiResponse::success(
                serde_json::Value::Array(events),
                "获取最近事件成功",
            ))
        }
        Err(_e) => Json(ApiResponse::error(500, "查询失败")),
    }
}

pub async fn mobile_get_dashboard_tasks(
    State(state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    let rows = sqlx::query!(
        r#"SELECT 
            t.id,
            COALESCE(i.title, '') as title,
            t.status,
            t.created_at
           FROM core_workflow_tasks t
           LEFT JOIN core_workflow_instances i ON t.instance_id = i.id
           ORDER BY t.created_at DESC
           LIMIT 10"#,
    )
    .fetch_all(&state.pool)
    .await;

    match rows {
        Ok(rows) => {
            let tasks: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|row| {
                    serde_json::json!({
                        "id": row.id.to_string(),
                        "title": row.title,
                        "status": row.status,
                        "priority": serde_json::Value::Null,
                        "due_date": serde_json::Value::Null,
                        "created_at": row.created_at,
                    })
                })
                .collect();

            Json(ApiResponse::success(
                serde_json::Value::Array(tasks),
                "获取最近任务成功",
            ))
        }
        Err(_e) => Json(ApiResponse::error(500, "查询失败")),
    }
}

pub async fn mobile_get_scan_items(
    State(state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    let rows = sqlx::query!(
        r#"SELECT 
            id,
            material_code as code,
            material_name as name,
            warehouse_id,
            quantity,
            unit,
            location_code as location,
            created_at
           FROM core_wms_inventory
           ORDER BY created_at DESC
           LIMIT 20"#,
    )
    .fetch_all(&state.pool)
    .await;

    match rows {
        Ok(rows) => {
            let items: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|row| {
                    serde_json::json!({
                        "id": row.id.to_string(),
                        "code": row.code,
                        "name": row.name,
                        "description": serde_json::Value::Null,
                        "category": serde_json::Value::Null,
                        "location": row.location,
                        "status": serde_json::Value::Null,
                        "created_at": row.created_at,
                    })
                })
                .collect();

            Json(ApiResponse::success(
                serde_json::Value::Array(items),
                "获取扫描物品成功",
            ))
        }
        Err(_e) => Json(ApiResponse::error(500, "查询失败")),
    }
}
