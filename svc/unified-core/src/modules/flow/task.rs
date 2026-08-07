use crate::AppState;
use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::Deserialize;
use utoipa::ToSchema;

use uuid::Uuid;

use topems_shared::{api_error, ApiResponse, PaginatedResponse};

use super::models::{
    TaskActionRequest, TaskBatchRequest, TaskBatchResult, TaskFailure, TaskStats, WorkflowTask,
};

#[derive(Debug, Deserialize, ToSchema)]
#[schema(as = TaskQueryParams)]
pub struct TaskQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub assignee_id: Option<String>,
    pub workflow_id: Option<String>,
    pub instance_id: Option<String>,
}

#[utoipa::path(
    get,
    path = "/tasks",
    tag = "Flow-Task",
    params(
        ("page" = Option<i64>, Query, description = "页码，默认1"),
        ("page_size" = Option<i64>, Query, description = "每页条数，默认20，最大100"),
        ("search" = Option<String>, Query, description = "搜索关键词"),
        ("status" = Option<String>, Query, description = "任务状态筛选"),
        ("assignee_id" = Option<String>, Query, description = "处理人ID"),
        ("workflow_id" = Option<String>, Query, description = "流程ID"),
        ("instance_id" = Option<String>, Query, description = "实例ID"),
    ),
    responses(
        (status = 200, description = "查询成功", body = ApiResponse<PaginatedResponse<WorkflowTask>>),
        (status = 500, description = "查询失败"),
    ),
)]
pub async fn list_tasks(
    State(state): State<AppState>,
    Query(params): Query<TaskQueryParams>,
) -> Json<ApiResponse<PaginatedResponse<WorkflowTask>>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search = params.search.clone().unwrap_or_default();
    let status = params.status.clone();
    let assignee_id = params.assignee_id.clone();
    let instance_id = params.instance_id.clone();

    let has_filters =
        !search.is_empty() || status.is_some() || assignee_id.is_some() || instance_id.is_some();

    let total: i64 = if !has_filters {
        sqlx::query_scalar("SELECT COUNT(*) FROM core_workflow_tasks")
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0)
    } else {
        let assignee_uuid = assignee_id.clone().and_then(|s| Uuid::parse_str(&s).ok());
        let instance_uuid = instance_id.clone().and_then(|s| Uuid::parse_str(&s).ok());

        let result = sqlx::query_scalar(
            r#"SELECT COUNT(*) FROM core_workflow_tasks 
               WHERE (node_id ILIKE $1 OR comment ILIKE $1 OR $1 = '')
                 AND (status = $2 OR $2 = '')
                 AND (assignee_id = $3 OR $3 IS NULL)
                 AND (instance_id = $4 OR $4 IS NULL)"#,
        )
        .bind(format!("%{}%", search.clone()))
        .bind(status.clone().unwrap_or_default())
        .bind(assignee_uuid)
        .bind(instance_uuid)
        .fetch_one(&state.pool)
        .await;

        match result {
            Ok(v) => v,
            Err(e) => {
                tracing::error!("查询任务总数失败: {}", e);
                return Json(api_error(500, "查询任务总数失败"));
            }
        }
    };

    let items: Vec<WorkflowTask> = if !has_filters {
        match sqlx::query_as::<_, WorkflowTask>(
            "SELECT id, instance_id, node_id, assignee_id, status, comment, priority, due_time, created_at, completed_at, claimed_at FROM core_workflow_tasks ORDER BY created_at DESC LIMIT $1 OFFSET $2"
        )
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.pool)
        .await
        {
            Ok(v) => v,
            Err(e) => {
                tracing::error!("查询任务列表失败: {}", e);
                return Json(api_error(500, "查询任务列表失败"));
            }
        }
    } else {
        let assignee_uuid = assignee_id.and_then(|s| Uuid::parse_str(&s).ok());
        let instance_uuid = instance_id.and_then(|s| Uuid::parse_str(&s).ok());

        match sqlx::query_as::<_, WorkflowTask>(
            r#"SELECT id, instance_id, node_id, assignee_id, status, comment, priority, due_time, created_at, completed_at, claimed_at 
               FROM core_workflow_tasks 
               WHERE (node_id ILIKE $1 OR comment ILIKE $1 OR $1 = '')
                 AND (status = $2 OR $2 = '')
                 AND (assignee_id = $3 OR $3 IS NULL)
                 AND (instance_id = $4 OR $4 IS NULL)
               ORDER BY created_at DESC LIMIT $5 OFFSET $6"#
        )
        .bind(format!("%{}%", search))
        .bind(status.clone().unwrap_or_default())
        .bind(assignee_uuid)
        .bind(instance_uuid)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.pool)
        .await
        {
            Ok(v) => v,
            Err(e) => {
                tracing::error!("查询任务列表失败: {}", e);
                return Json(api_error(500, "查询任务列表失败"));
            }
        }
    };

    Json(ApiResponse::success(
        PaginatedResponse::new(items, total, page, page_size),
        "查询成功",
    ))
}

#[utoipa::path(
    get,
    path = "/tasks/{id}",
    tag = "Flow-Task",
    params(
        ("id" = Uuid, Path, description = "任务ID"),
    ),
    responses(
        (status = 200, description = "查询成功", body = ApiResponse<WorkflowTask>),
        (status = 404, description = "任务不存在"),
        (status = 500, description = "查询失败"),
    ),
)]
pub async fn get_task(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<WorkflowTask>> {
    let task = match sqlx::query_as::<_, WorkflowTask>(
        "SELECT id, instance_id, node_id, assignee_id, status, comment, priority, due_time, created_at, completed_at, claimed_at FROM core_workflow_tasks WHERE id = $1",
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                return Json(api_error(404, "任务不存在"));
            }
            tracing::error!("查询任务失败: {}", e);
            return Json(api_error(500, "查询任务失败"));
        }
    };

    Json(ApiResponse::success(task, "查询成功"))
}

#[utoipa::path(
    post,
    path = "/tasks/{id}/claim",
    tag = "Flow-Task",
    params(
        ("id" = Uuid, Path, description = "任务ID"),
    ),
    responses(
        (status = 200, description = "认领成功", body = ApiResponse<WorkflowTask>),
        (status = 404, description = "任务不存在"),
        (status = 500, description = "认领失败"),
    ),
)]
pub async fn claim_task(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<WorkflowTask>> {
    let task = match sqlx::query_as::<_, WorkflowTask>(
        "UPDATE core_workflow_tasks SET status = 'claimed', claimed_at = NOW() WHERE id = $1 RETURNING id, instance_id, node_id, assignee_id, status, comment, priority, due_time, created_at, completed_at, claimed_at",
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                return Json(api_error(404, "任务不存在"));
            }
            tracing::error!("认领任务失败: {}", e);
            return Json(api_error(500, "认领任务失败"));
        }
    };

    Json(ApiResponse::success(task, "认领成功"))
}

pub async fn unclaim_task(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<WorkflowTask>> {
    let task = match sqlx::query_as::<_, WorkflowTask>(
        "UPDATE core_workflow_tasks SET status = 'pending', claimed_at = NULL WHERE id = $1 RETURNING id, instance_id, node_id, assignee_id, status, comment, priority, due_time, created_at, completed_at, claimed_at",
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                return Json(api_error(404, "任务不存在"));
            }
            tracing::error!("取消认领任务失败: {}", e);
            return Json(api_error(500, "取消认领任务失败"));
        }
    };

    Json(ApiResponse::success(task, "取消认领成功"))
}

#[utoipa::path(
    post,
    path = "/tasks/{id}/approve",
    tag = "Flow-Task",
    params(
        ("id" = Uuid, Path, description = "任务ID"),
    ),
    request_body = TaskActionRequest,
    responses(
        (status = 200, description = "审批成功", body = ApiResponse<WorkflowTask>),
        (status = 404, description = "任务不存在"),
        (status = 500, description = "审批失败"),
    ),
)]
pub async fn approve_task(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<TaskActionRequest>,
) -> Json<ApiResponse<WorkflowTask>> {
    let task = match sqlx::query_as::<_, WorkflowTask>(
        "UPDATE core_workflow_tasks SET status = 'approved', comment = COALESCE($2, comment), completed_at = NOW() WHERE id = $1 RETURNING id, instance_id, node_id, assignee_id, status, comment, priority, due_time, created_at, completed_at, claimed_at",
    )
    .bind(id)
    .bind(payload.comment)
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                return Json(api_error(404, "任务不存在"));
            }
            tracing::error!("审批任务失败: {}", e);
            return Json(api_error(500, "审批任务失败"));
        }
    };

    Json(ApiResponse::success(task, "审批通过"))
}

#[utoipa::path(
    post,
    path = "/tasks/{id}/reject",
    tag = "Flow-Task",
    params(
        ("id" = Uuid, Path, description = "任务ID"),
    ),
    request_body = TaskActionRequest,
    responses(
        (status = 200, description = "拒绝成功", body = ApiResponse<WorkflowTask>),
        (status = 404, description = "任务不存在"),
        (status = 500, description = "拒绝失败"),
    ),
)]
pub async fn reject_task(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<TaskActionRequest>,
) -> Json<ApiResponse<WorkflowTask>> {
    let task = match sqlx::query_as::<_, WorkflowTask>(
        "UPDATE core_workflow_tasks SET status = 'rejected', comment = COALESCE($2, comment), completed_at = NOW() WHERE id = $1 RETURNING id, instance_id, node_id, assignee_id, status, comment, priority, due_time, created_at, completed_at, claimed_at",
    )
    .bind(id)
    .bind(payload.comment)
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                return Json(api_error(404, "任务不存在"));
            }
            tracing::error!("拒绝任务失败: {}", e);
            return Json(api_error(500, "拒绝任务失败"));
        }
    };

    Json(ApiResponse::success(task, "已拒绝"))
}

pub async fn complete_task(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<TaskActionRequest>,
) -> Json<ApiResponse<WorkflowTask>> {
    let task = match sqlx::query_as::<_, WorkflowTask>(
        "UPDATE core_workflow_tasks SET status = 'completed', comment = COALESCE($2, comment), completed_at = NOW() WHERE id = $1 RETURNING id, instance_id, node_id, assignee_id, status, comment, priority, due_time, created_at, completed_at, claimed_at",
    )
    .bind(id)
    .bind(payload.comment)
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                return Json(api_error(404, "任务不存在"));
            }
            tracing::error!("完成任务失败: {}", e);
            return Json(api_error(500, "完成任务失败"));
        }
    };

    Json(ApiResponse::success(task, "完成成功"))
}

pub async fn delegate_task(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<TaskActionRequest>,
) -> Json<ApiResponse<WorkflowTask>> {
    let task = match sqlx::query_as::<_, WorkflowTask>(
        "UPDATE core_workflow_tasks SET status = 'delegated', comment = COALESCE($2, comment) WHERE id = $1 RETURNING id, instance_id, node_id, assignee_id, status, comment, priority, due_time, created_at, completed_at, claimed_at",
    )
    .bind(id)
    .bind(payload.comment)
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                return Json(api_error(404, "任务不存在"));
            }
            tracing::error!("委托任务失败: {}", e);
            return Json(api_error(500, "委托任务失败"));
        }
    };

    Json(ApiResponse::success(task, "委托成功"))
}

#[utoipa::path(
    post,
    path = "/tasks/batch/approve",
    tag = "Flow-Task",
    request_body = TaskBatchRequest,
    responses(
        (status = 200, description = "批量操作完成", body = ApiResponse<TaskBatchResult>),
    ),
)]
pub async fn batch_approve(
    State(state): State<AppState>,
    Json(payload): Json<TaskBatchRequest>,
) -> Json<ApiResponse<TaskBatchResult>> {
    let mut success_count = 0;
    let mut failed_tasks = Vec::new();

    for task_id_str in &payload.task_ids {
        if let Ok(task_id) = Uuid::parse_str(task_id_str) {
            let result = sqlx::query(
                "UPDATE core_workflow_tasks SET status = 'approved', comment = COALESCE($2, comment), completed_at = NOW() WHERE id = $1",
            )
            .bind(task_id)
            .bind(&payload.comment)
            .execute(&state.pool)
            .await;

            match result {
                Ok(_) => success_count += 1,
                Err(e) => {
                    failed_tasks.push(TaskFailure {
                        task_id: task_id_str.clone(),
                        error: e.to_string(),
                    });
                }
            }
        } else {
            failed_tasks.push(TaskFailure {
                task_id: task_id_str.clone(),
                error: "无效的任务ID".to_string(),
            });
        }
    }

    Json(ApiResponse::success(
        TaskBatchResult {
            success_count,
            failed_count: failed_tasks.len() as i32,
            failed_tasks,
        },
        "批量操作完成",
    ))
}

pub async fn batch_complete(
    State(state): State<AppState>,
    Json(payload): Json<TaskBatchRequest>,
) -> Json<ApiResponse<TaskBatchResult>> {
    let mut success_count = 0;
    let mut failed_tasks = Vec::new();

    for task_id_str in &payload.task_ids {
        if let Ok(task_id) = Uuid::parse_str(task_id_str) {
            let result = sqlx::query(
                "UPDATE core_workflow_tasks SET status = 'completed', comment = COALESCE($2, comment), completed_at = NOW() WHERE id = $1",
            )
            .bind(task_id)
            .bind(&payload.comment)
            .execute(&state.pool)
            .await;

            match result {
                Ok(_) => success_count += 1,
                Err(e) => {
                    failed_tasks.push(TaskFailure {
                        task_id: task_id_str.clone(),
                        error: e.to_string(),
                    });
                }
            }
        } else {
            failed_tasks.push(TaskFailure {
                task_id: task_id_str.clone(),
                error: "无效的任务ID".to_string(),
            });
        }
    }

    Json(ApiResponse::success(
        TaskBatchResult {
            success_count,
            failed_count: failed_tasks.len() as i32,
            failed_tasks,
        },
        "批量操作完成",
    ))
}

pub async fn batch_delegate(
    State(state): State<AppState>,
    Json(payload): Json<TaskBatchRequest>,
) -> Json<ApiResponse<TaskBatchResult>> {
    let mut success_count = 0;
    let mut failed_tasks = Vec::new();

    for task_id_str in &payload.task_ids {
        if let Ok(task_id) = Uuid::parse_str(task_id_str) {
            let result = sqlx::query(
                "UPDATE core_workflow_tasks SET status = 'delegated', comment = COALESCE($2, comment) WHERE id = $1",
            )
            .bind(task_id)
            .bind(&payload.comment)
            .execute(&state.pool)
            .await;

            match result {
                Ok(_) => success_count += 1,
                Err(e) => {
                    failed_tasks.push(TaskFailure {
                        task_id: task_id_str.clone(),
                        error: e.to_string(),
                    });
                }
            }
        } else {
            failed_tasks.push(TaskFailure {
                task_id: task_id_str.clone(),
                error: "无效的任务ID".to_string(),
            });
        }
    }

    Json(ApiResponse::success(
        TaskBatchResult {
            success_count,
            failed_count: failed_tasks.len() as i32,
            failed_tasks,
        },
        "批量操作完成",
    ))
}

pub async fn my_tasks(
    State(state): State<AppState>,
    Query(params): Query<TaskQueryParams>,
) -> Json<ApiResponse<PaginatedResponse<WorkflowTask>>> {
    list_tasks(State(state), Query(params)).await
}

pub async fn my_pending_tasks(
    State(state): State<AppState>,
    Query(mut params): Query<TaskQueryParams>,
) -> Json<ApiResponse<PaginatedResponse<WorkflowTask>>> {
    params.status = Some("pending".to_string());
    list_tasks(State(state), Query(params)).await
}

pub async fn my_completed_tasks(
    State(state): State<AppState>,
    Query(mut params): Query<TaskQueryParams>,
) -> Json<ApiResponse<PaginatedResponse<WorkflowTask>>> {
    params.status = Some("completed".to_string());
    list_tasks(State(state), Query(params)).await
}

pub async fn candidate_tasks(
    State(state): State<AppState>,
    Query(params): Query<TaskQueryParams>,
) -> Json<ApiResponse<PaginatedResponse<WorkflowTask>>> {
    list_tasks(State(state), Query(params)).await
}

pub async fn get_task_count(
    State(state): State<AppState>,
    Query(params): Query<TaskQueryParams>,
) -> Json<ApiResponse<i64>> {
    let status = params.status.clone();
    let assignee_id = params.assignee_id.clone();

    let count_result = if status.is_none() && assignee_id.is_none() {
        sqlx::query_scalar("SELECT COUNT(*) FROM core_workflow_tasks")
            .fetch_one(&state.pool)
            .await
    } else {
        let assignee_uuid = assignee_id.and_then(|s| Uuid::parse_str(&s).ok());

        sqlx::query_scalar(
            r#"SELECT COUNT(*) FROM core_workflow_tasks 
               WHERE (status = $1 OR $1 = '')
                 AND (assignee_id = $2 OR $2 IS NULL)"#,
        )
        .bind(status.clone().unwrap_or_default())
        .bind(assignee_uuid)
        .fetch_one(&state.pool)
        .await
    };

    let count: i64 = match count_result {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询任务数量失败: {}", e);
            return Json(api_error(500, "查询任务数量失败"));
        }
    };

    Json(ApiResponse::success(count, "查询成功"))
}

#[utoipa::path(
    get,
    path = "/tasks/my/stats",
    tag = "Flow-Task",
    responses(
        (status = 200, description = "查询成功", body = ApiResponse<TaskStats>),
    ),
)]
pub async fn get_task_stats(State(_state): State<AppState>) -> Json<ApiResponse<TaskStats>> {
    Json(ApiResponse::success(
        TaskStats {
            todo: 0,
            done: 0,
            sent: 0,
            cc: 0,
            my_pending: 0,
            my_completed: 0,
            my_involved: 0,
            my_created: 0,
            candidate: 0,
        },
        "查询成功",
    ))
}

pub async fn high_priority_tasks(
    State(state): State<AppState>,
    Query(mut params): Query<TaskQueryParams>,
) -> Json<ApiResponse<PaginatedResponse<WorkflowTask>>> {
    params.status = Some("pending".to_string());
    list_tasks(State(state), Query(params)).await
}

pub async fn overdue_tasks(
    State(state): State<AppState>,
    Query(params): Query<TaskQueryParams>,
) -> Json<ApiResponse<PaginatedResponse<WorkflowTask>>> {
    list_tasks(State(state), Query(params)).await
}
