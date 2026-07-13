use crate::AppState;
use axum::{
    extract::{Path, Query, State},
    Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use topems_shared::{api_error, ApiResponse};

use super::models::{TaskActionRequest, Workflow, WorkflowInstance, WorkflowTask};

#[derive(Debug, FromRow)]
pub struct ApprovalTaskRow {
    pub task_id: Uuid,
    pub task_instance_id: Uuid,
    pub task_node_id: String,
    pub task_assignee_id: Uuid,
    pub task_status: String,
    pub task_comment: Option<String>,
    pub task_created_at: DateTime<Utc>,
    pub task_completed_at: Option<DateTime<Utc>>,
    #[sqlx(default)]
    pub instance_id: Option<Uuid>,
    #[sqlx(default)]
    pub instance_workflow_id: Option<Uuid>,
    #[sqlx(default)]
    pub instance_title: Option<String>,
    #[sqlx(default)]
    pub instance_initiator_id: Option<Uuid>,
    #[sqlx(default)]
    pub instance_status: Option<String>,
    #[sqlx(default)]
    pub instance_started_at: Option<DateTime<Utc>>,
    #[sqlx(default)]
    pub instance_completed_at: Option<DateTime<Utc>>,
    #[sqlx(default)]
    pub workflow_id: Option<Uuid>,
    #[sqlx(default)]
    pub workflow_name: Option<String>,
    #[sqlx(default)]
    pub workflow_description: Option<String>,
    #[sqlx(default)]
    pub workflow_definition: Option<serde_json::Value>,
    #[sqlx(default)]
    pub workflow_status: Option<String>,
    #[sqlx(default)]
    pub workflow_version: Option<i32>,
    #[sqlx(default)]
    pub workflow_created_by: Option<Uuid>,
    #[sqlx(default)]
    pub workflow_created_at: Option<DateTime<Utc>>,
    #[sqlx(default)]
    pub workflow_updated_at: Option<DateTime<Utc>>,
    #[sqlx(default)]
    pub workflow_published_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct ApprovalTaskQuery {
    pub status: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub assignee_id: Option<String>,
    pub initiator_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ApprovalTask {
    pub id: String,
    pub workflow_instance_id: Option<String>,
    pub workflow_id: Option<String>,
    pub workflow_name: Option<String>,
    pub node_id: Option<String>,
    pub node_name: Option<String>,
    pub task_name: String,
    pub assignee_id: Option<String>,
    pub assignee_name: Option<String>,
    pub initiator_id: Option<String>,
    pub initiator_name: Option<String>,
    pub status: String,
    pub approval_type: Option<String>,
    pub comment: Option<String>,
    pub created_at: String,
    pub updated_at: Option<String>,
    pub priority: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ApprovalTaskListResponse {
    pub items: Vec<ApprovalTask>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

pub async fn list_approval_tasks(
    State(state): State<AppState>,
    Query(query): Query<ApprovalTaskQuery>,
) -> Json<ApiResponse<ApprovalTaskListResponse>> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(10).min(100);
    let offset = (page - 1) * page_size;

    let status = query.status.clone();
    let assignee_id = query.assignee_id.clone();

    let total: i64 = match sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM core_workflow_tasks t
           JOIN core_workflow_instances i ON t.instance_id = i.id
           JOIN core_workflows w ON i.workflow_id = w.id
           WHERE ($1::text IS NULL OR t.status = $1)
             AND ($2::text IS NULL OR t.assignee_id = $2::UUID)"#,
    )
    .bind(status.clone().unwrap_or_default())
    .bind(assignee_id.clone().unwrap_or_default())
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询审批任务总数失败: {}", e);
            return Json(api_error(500, "查询审批任务总数失败"));
        }
    };

    let tasks: Vec<ApprovalTaskRow> = match sqlx::query_as(
        r#"SELECT t.id as task_id, t.instance_id as task_instance_id, t.node_id as task_node_id, t.assignee_id as task_assignee_id, t.status as task_status, t.comment as task_comment, t.created_at as task_created_at, t.completed_at as task_completed_at,
                  i.id as instance_id, i.workflow_id as instance_workflow_id, i.title as instance_title, i.initiator_id as instance_initiator_id, i.status as instance_status, i.started_at as instance_started_at, i.completed_at as instance_completed_at,
                  w.id as workflow_id, w.name as workflow_name, w.description as workflow_description, w.definition as workflow_definition, w.status as workflow_status, w.version as workflow_version, w.created_by as workflow_created_by, w.created_at as workflow_created_at, w.updated_at as workflow_updated_at, w.published_at as workflow_published_at
           FROM core_workflow_tasks t
           JOIN core_workflow_instances i ON t.instance_id = i.id
           JOIN core_workflows w ON i.workflow_id = w.id
           WHERE ($1::text IS NULL OR t.status = $1)
             AND ($2::text IS NULL OR t.assignee_id = $2::UUID)
           ORDER BY t.created_at DESC
           LIMIT $3 OFFSET $4"#,
    )
    .bind(status.clone().unwrap_or_default())
    .bind(assignee_id.clone().unwrap_or_default())
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询审批任务列表失败: {}", e);
            return Json(api_error(500, "查询审批任务列表失败"));
        }
    };

    let items: Vec<ApprovalTask> = tasks
        .into_iter()
        .map(|row| ApprovalTask {
            id: row.task_id.to_string(),
            workflow_instance_id: row.instance_id.map(|id| id.to_string()),
            workflow_id: row.workflow_id.map(|id| id.to_string()),
            workflow_name: row.workflow_name,
            node_id: Some(row.task_node_id.clone()),
            node_name: Some(row.task_node_id),
            task_name: row.instance_title.unwrap_or_default(),
            assignee_id: Some(row.task_assignee_id.to_string()),
            assignee_name: None,
            initiator_id: row.instance_initiator_id.map(|id| id.to_string()),
            initiator_name: None,
            status: row.task_status,
            approval_type: None,
            comment: row.task_comment,
            created_at: row.task_created_at.to_rfc3339(),
            updated_at: row.task_completed_at.map(|dt| dt.to_rfc3339()),
            priority: None,
        })
        .collect();

    Json(ApiResponse::success(
        ApprovalTaskListResponse {
            items,
            total,
            page,
            page_size,
        },
        "查询成功",
    ))
}

pub async fn get_approval_task(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<ApprovalTask>> {
    let task_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的任务ID")),
    };

    let result: Option<ApprovalTaskRow> = match sqlx::query_as(
        r#"SELECT t.id as task_id, t.instance_id as task_instance_id, t.node_id as task_node_id, t.assignee_id as task_assignee_id, t.status as task_status, t.comment as task_comment, t.created_at as task_created_at, t.completed_at as task_completed_at,
                  i.id as instance_id, i.workflow_id as instance_workflow_id, i.title as instance_title, i.initiator_id as instance_initiator_id, i.status as instance_status, i.started_at as instance_started_at, i.completed_at as instance_completed_at,
                  w.id as workflow_id, w.name as workflow_name, w.description as workflow_description, w.definition as workflow_definition, w.status as workflow_status, w.version as workflow_version, w.created_by as workflow_created_by, w.created_at as workflow_created_at, w.updated_at as workflow_updated_at, w.published_at as workflow_published_at
           FROM core_workflow_tasks t
           JOIN core_workflow_instances i ON t.instance_id = i.id
           JOIN core_workflows w ON i.workflow_id = w.id
           WHERE t.id = $1"#,
    )
    .bind(task_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询审批任务失败: {}", e);
            return Json(api_error(500, "查询审批任务失败"));
        }
    };

    match result {
        Some(row) => Json(ApiResponse::success(
            ApprovalTask {
                id: row.task_id.to_string(),
                workflow_instance_id: row.instance_id.map(|id| id.to_string()),
                workflow_id: row.workflow_id.map(|id| id.to_string()),
                workflow_name: row.workflow_name,
                node_id: Some(row.task_node_id.clone()),
                node_name: Some(row.task_node_id),
                task_name: row.instance_title.unwrap_or_default(),
                assignee_id: Some(row.task_assignee_id.to_string()),
                assignee_name: None,
                initiator_id: row.instance_initiator_id.map(|id| id.to_string()),
                initiator_name: None,
                status: row.task_status,
                approval_type: None,
                comment: row.task_comment,
                created_at: row.task_created_at.to_rfc3339(),
                updated_at: row.task_completed_at.map(|dt| dt.to_rfc3339()),
                priority: None,
            },
            "查询成功",
        )),
        None => Json(api_error(404, "审批任务不存在")),
    }
}

pub async fn list_pending_approvals(
    State(state): State<AppState>,
) -> Json<ApiResponse<Vec<ApprovalTask>>> {
    let tasks: Vec<ApprovalTaskRow> = match sqlx::query_as(
        r#"SELECT t.id as task_id, t.instance_id as task_instance_id, t.node_id as task_node_id, t.assignee_id as task_assignee_id, t.status as task_status, t.comment as task_comment, t.created_at as task_created_at, t.completed_at as task_completed_at,
                  i.id as instance_id, i.workflow_id as instance_workflow_id, i.title as instance_title, i.initiator_id as instance_initiator_id, i.status as instance_status, i.started_at as instance_started_at, i.completed_at as instance_completed_at,
                  w.id as workflow_id, w.name as workflow_name, w.description as workflow_description, w.definition as workflow_definition, w.status as workflow_status, w.version as workflow_version, w.created_by as workflow_created_by, w.created_at as workflow_created_at, w.updated_at as workflow_updated_at, w.published_at as workflow_published_at
           FROM core_workflow_tasks t
           JOIN core_workflow_instances i ON t.instance_id = i.id
           JOIN core_workflows w ON i.workflow_id = w.id
           WHERE t.status = 'pending'
           ORDER BY t.created_at DESC
           LIMIT 20"#,
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询待审批任务失败: {}", e);
            return Json(api_error(500, "查询待审批任务失败"));
        }
    };

    let items: Vec<ApprovalTask> = tasks
        .into_iter()
        .map(|row| ApprovalTask {
            id: row.task_id.to_string(),
            workflow_instance_id: row.instance_id.map(|id| id.to_string()),
            workflow_id: row.workflow_id.map(|id| id.to_string()),
            workflow_name: row.workflow_name,
            node_id: Some(row.task_node_id.clone()),
            node_name: Some(row.task_node_id),
            task_name: row.instance_title.unwrap_or_default(),
            assignee_id: Some(row.task_assignee_id.to_string()),
            assignee_name: None,
            initiator_id: row.instance_initiator_id.map(|id| id.to_string()),
            initiator_name: None,
            status: row.task_status,
            approval_type: None,
            comment: row.task_comment,
            created_at: row.task_created_at.to_rfc3339(),
            updated_at: row.task_completed_at.map(|dt| dt.to_rfc3339()),
            priority: None,
        })
        .collect();

    Json(ApiResponse::success(items, "查询成功"))
}

pub async fn approve_task(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(payload): Json<TaskActionRequest>,
) -> Json<ApiResponse<ApprovalTask>> {
    let task_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的任务ID")),
    };

    let result: Option<ApprovalTaskRow> = match sqlx::query_as(
        r#"UPDATE core_workflow_tasks
           SET status = 'approved',
               comment = COALESCE($1, comment),
               completed_at = NOW(),
               updated_at = NOW()
           WHERE id = $2 AND status = 'pending'
           RETURNING id as task_id, instance_id as task_instance_id, node_id as task_node_id, assignee_id as task_assignee_id, status as task_status, comment as task_comment, created_at as task_created_at, completed_at as task_completed_at"#,
    )
    .bind(payload.comment)
    .bind(task_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("审批任务失败: {}", e);
            return Json(api_error(500, "审批任务失败"));
        }
    };

    match result {
        Some(row) => {
            let instance = match sqlx::query_as::<_, WorkflowInstance>(
                "SELECT id, workflow_id, title, initiator_id, status, started_at, completed_at, created_at, updated_at FROM core_workflow_instances WHERE id = $1",
            )
            .bind(row.task_instance_id)
            .fetch_one(&state.pool)
            .await
            {
                Ok(v) => v,
                Err(_) => return Json(api_error(500, "获取工作流实例失败")),
            };

            let workflow = match sqlx::query_as::<_, Workflow>(
                "SELECT id, name, description, definition, status, version, created_by, created_at, updated_at, published_at FROM core_workflows WHERE id = $1",
            )
            .bind(instance.workflow_id)
            .fetch_one(&state.pool)
            .await
            {
                Ok(v) => v,
                Err(_) => return Json(api_error(500, "获取工作流定义失败")),
            };

            Json(ApiResponse::success(
                ApprovalTask {
                    id: row.task_id.to_string(),
                    workflow_instance_id: Some(instance.id.to_string()),
                    workflow_id: Some(workflow.id.to_string()),
                    workflow_name: Some(workflow.name),
                    node_id: Some(row.task_node_id.clone()),
                    node_name: Some(row.task_node_id),
                    task_name: instance.title,
                    assignee_id: Some(row.task_assignee_id.to_string()),
                    assignee_name: None,
                    initiator_id: Some(instance.initiator_id.to_string()),
                    initiator_name: None,
                    status: row.task_status,
                    approval_type: None,
                    comment: row.task_comment,
                    created_at: row.task_created_at.to_rfc3339(),
                    updated_at: row.task_completed_at.map(|dt| dt.to_rfc3339()),
                    priority: None,
                },
                "审批成功",
            ))
        }
        None => Json(api_error(404, "审批任务不存在或状态不正确")),
    }
}

pub async fn reject_task(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(payload): Json<TaskActionRequest>,
) -> Json<ApiResponse<ApprovalTask>> {
    let task_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的任务ID")),
    };

    let result: Option<ApprovalTaskRow> = match sqlx::query_as(
        r#"UPDATE core_workflow_tasks
           SET status = 'rejected',
               comment = COALESCE($1, comment),
               completed_at = NOW(),
               updated_at = NOW()
           WHERE id = $2 AND status = 'pending'
           RETURNING id as task_id, instance_id as task_instance_id, node_id as task_node_id, assignee_id as task_assignee_id, status as task_status, comment as task_comment, created_at as task_created_at, completed_at as task_completed_at"#,
    )
    .bind(payload.comment)
    .bind(task_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("驳回任务失败: {}", e);
            return Json(api_error(500, "驳回任务失败"));
        }
    };

    match result {
        Some(row) => {
            let instance = match sqlx::query_as::<_, WorkflowInstance>(
                "SELECT id, workflow_id, title, initiator_id, status, started_at, completed_at, created_at, updated_at FROM core_workflow_instances WHERE id = $1",
            )
            .bind(row.task_instance_id)
            .fetch_one(&state.pool)
            .await
            {
                Ok(v) => v,
                Err(_) => return Json(api_error(500, "获取工作流实例失败")),
            };

            let workflow = match sqlx::query_as::<_, Workflow>(
                "SELECT id, name, description, definition, status, version, created_by, created_at, updated_at, published_at FROM core_workflows WHERE id = $1",
            )
            .bind(instance.workflow_id)
            .fetch_one(&state.pool)
            .await
            {
                Ok(v) => v,
                Err(_) => return Json(api_error(500, "获取工作流定义失败")),
            };

            Json(ApiResponse::success(
                ApprovalTask {
                    id: row.task_id.to_string(),
                    workflow_instance_id: Some(instance.id.to_string()),
                    workflow_id: Some(workflow.id.to_string()),
                    workflow_name: Some(workflow.name),
                    node_id: Some(row.task_node_id.clone()),
                    node_name: Some(row.task_node_id),
                    task_name: instance.title,
                    assignee_id: Some(row.task_assignee_id.to_string()),
                    assignee_name: None,
                    initiator_id: Some(instance.initiator_id.to_string()),
                    initiator_name: None,
                    status: row.task_status,
                    approval_type: None,
                    comment: row.task_comment,
                    created_at: row.task_created_at.to_rfc3339(),
                    updated_at: row.task_completed_at.map(|dt| dt.to_rfc3339()),
                    priority: None,
                },
                "驳回成功",
            ))
        }
        None => Json(api_error(404, "审批任务不存在或状态不正确")),
    }
}

pub async fn claim_task(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<ApprovalTask>> {
    let task_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的任务ID")),
    };

    let result: Option<ApprovalTaskRow> = match sqlx::query_as(
        r#"UPDATE core_workflow_tasks
           SET status = 'claimed',
               updated_at = NOW()
           WHERE id = $1 AND status = 'pending'
           RETURNING id as task_id, instance_id as task_instance_id, node_id as task_node_id, assignee_id as task_assignee_id, status as task_status, comment as task_comment, created_at as task_created_at, completed_at as task_completed_at"#,
    )
    .bind(task_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("认领任务失败: {}", e);
            return Json(api_error(500, "认领任务失败"));
        }
    };

    match result {
        Some(row) => {
            let instance = match sqlx::query_as::<_, WorkflowInstance>(
                "SELECT id, workflow_id, title, initiator_id, status, started_at, completed_at, created_at, updated_at FROM core_workflow_instances WHERE id = $1",
            )
            .bind(row.task_instance_id)
            .fetch_one(&state.pool)
            .await
            {
                Ok(v) => v,
                Err(_) => return Json(api_error(500, "获取工作流实例失败")),
            };

            let workflow = match sqlx::query_as::<_, Workflow>(
                "SELECT id, name, description, definition, status, version, created_by, created_at, updated_at, published_at FROM core_workflows WHERE id = $1",
            )
            .bind(instance.workflow_id)
            .fetch_one(&state.pool)
            .await
            {
                Ok(v) => v,
                Err(_) => return Json(api_error(500, "获取工作流定义失败")),
            };

            Json(ApiResponse::success(
                ApprovalTask {
                    id: row.task_id.to_string(),
                    workflow_instance_id: Some(instance.id.to_string()),
                    workflow_id: Some(workflow.id.to_string()),
                    workflow_name: Some(workflow.name),
                    node_id: Some(row.task_node_id.clone()),
                    node_name: Some(row.task_node_id),
                    task_name: instance.title,
                    assignee_id: Some(row.task_assignee_id.to_string()),
                    assignee_name: None,
                    initiator_id: Some(instance.initiator_id.to_string()),
                    initiator_name: None,
                    status: row.task_status,
                    approval_type: None,
                    comment: row.task_comment,
                    created_at: row.task_created_at.to_rfc3339(),
                    updated_at: None,
                    priority: None,
                },
                "认领成功",
            ))
        }
        None => Json(api_error(404, "审批任务不存在或状态不正确")),
    }
}

pub async fn unclaim_task(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<ApprovalTask>> {
    let task_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的任务ID")),
    };

    let result: Option<ApprovalTaskRow> = match sqlx::query_as(
        r#"UPDATE core_workflow_tasks
           SET status = 'pending',
               updated_at = NOW()
           WHERE id = $1 AND status = 'claimed'
           RETURNING id as task_id, instance_id as task_instance_id, node_id as task_node_id, assignee_id as task_assignee_id, status as task_status, comment as task_comment, created_at as task_created_at, completed_at as task_completed_at"#,
    )
    .bind(task_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("取消认领任务失败: {}", e);
            return Json(api_error(500, "取消认领任务失败"));
        }
    };

    match result {
        Some(row) => {
            let instance = match sqlx::query_as::<_, WorkflowInstance>(
                "SELECT id, workflow_id, title, initiator_id, status, started_at, completed_at, created_at, updated_at FROM core_workflow_instances WHERE id = $1",
            )
            .bind(row.task_instance_id)
            .fetch_one(&state.pool)
            .await
            {
                Ok(v) => v,
                Err(_) => return Json(api_error(500, "获取工作流实例失败")),
            };

            let workflow = match sqlx::query_as::<_, Workflow>(
                "SELECT id, name, description, definition, status, version, created_by, created_at, updated_at, published_at FROM core_workflows WHERE id = $1",
            )
            .bind(instance.workflow_id)
            .fetch_one(&state.pool)
            .await
            {
                Ok(v) => v,
                Err(_) => return Json(api_error(500, "获取工作流定义失败")),
            };

            Json(ApiResponse::success(
                ApprovalTask {
                    id: row.task_id.to_string(),
                    workflow_instance_id: Some(instance.id.to_string()),
                    workflow_id: Some(workflow.id.to_string()),
                    workflow_name: Some(workflow.name),
                    node_id: Some(row.task_node_id.clone()),
                    node_name: Some(row.task_node_id),
                    task_name: instance.title,
                    assignee_id: Some(row.task_assignee_id.to_string()),
                    assignee_name: None,
                    initiator_id: Some(instance.initiator_id.to_string()),
                    initiator_name: None,
                    status: row.task_status,
                    approval_type: None,
                    comment: row.task_comment,
                    created_at: row.task_created_at.to_rfc3339(),
                    updated_at: None,
                    priority: None,
                },
                "取消认领成功",
            ))
        }
        None => Json(api_error(404, "审批任务不存在或状态不正确")),
    }
}

pub async fn delegate_task(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Json<ApiResponse<ApprovalTask>> {
    let task_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的任务ID")),
    };

    let delegate_to = match payload.get("delegate_to") {
        Some(v) => v.as_str().unwrap_or_default(),
        None => return Json(api_error(400, "缺少delegate_to参数")),
    };

    let delegate_to_id = match Uuid::parse_str(delegate_to) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的被委托人ID")),
    };

    let result: Option<ApprovalTaskRow> = match sqlx::query_as(
        r#"UPDATE core_workflow_tasks
           SET assignee_id = $1,
               updated_at = NOW()
           WHERE id = $2
           RETURNING id as task_id, instance_id as task_instance_id, node_id as task_node_id, assignee_id as task_assignee_id, status as task_status, comment as task_comment, created_at as task_created_at, completed_at as task_completed_at"#,
    )
    .bind(delegate_to_id)
    .bind(task_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("委托任务失败: {}", e);
            return Json(api_error(500, "委托任务失败"));
        }
    };

    match result {
        Some(row) => {
            let instance = match sqlx::query_as::<_, WorkflowInstance>(
                "SELECT id, workflow_id, title, initiator_id, status, started_at, completed_at, created_at, updated_at FROM core_workflow_instances WHERE id = $1",
            )
            .bind(row.task_instance_id)
            .fetch_one(&state.pool)
            .await
            {
                Ok(v) => v,
                Err(_) => return Json(api_error(500, "获取工作流实例失败")),
            };

            let workflow = match sqlx::query_as::<_, Workflow>(
                "SELECT id, name, description, definition, status, version, created_by, created_at, updated_at, published_at FROM core_workflows WHERE id = $1",
            )
            .bind(instance.workflow_id)
            .fetch_one(&state.pool)
            .await
            {
                Ok(v) => v,
                Err(_) => return Json(api_error(500, "获取工作流定义失败")),
            };

            Json(ApiResponse::success(
                ApprovalTask {
                    id: row.task_id.to_string(),
                    workflow_instance_id: Some(instance.id.to_string()),
                    workflow_id: Some(workflow.id.to_string()),
                    workflow_name: Some(workflow.name),
                    node_id: Some(row.task_node_id.clone()),
                    node_name: Some(row.task_node_id),
                    task_name: instance.title,
                    assignee_id: Some(row.task_assignee_id.to_string()),
                    assignee_name: None,
                    initiator_id: Some(instance.initiator_id.to_string()),
                    initiator_name: None,
                    status: row.task_status,
                    approval_type: None,
                    comment: row.task_comment,
                    created_at: row.task_created_at.to_rfc3339(),
                    updated_at: None,
                    priority: None,
                },
                "委托成功",
            ))
        }
        None => Json(api_error(404, "审批任务不存在")),
    }
}

pub async fn reassign_task(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Json<ApiResponse<ApprovalTask>> {
    let task_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的任务ID")),
    };

    let assignee_id = match payload.get("assignee_id") {
        Some(v) => v.as_str().unwrap_or_default(),
        None => return Json(api_error(400, "缺少assignee_id参数")),
    };

    let assignee_uuid = match Uuid::parse_str(assignee_id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的被分配人ID")),
    };

    let result: Option<ApprovalTaskRow> = match sqlx::query_as(
        r#"UPDATE core_workflow_tasks
           SET assignee_id = $1,
               updated_at = NOW()
           WHERE id = $2
           RETURNING id as task_id, instance_id as task_instance_id, node_id as task_node_id, assignee_id as task_assignee_id, status as task_status, comment as task_comment, created_at as task_created_at, completed_at as task_completed_at"#,
    )
    .bind(assignee_uuid)
    .bind(task_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("重新分配任务失败: {}", e);
            return Json(api_error(500, "重新分配任务失败"));
        }
    };

    match result {
        Some(row) => {
            let instance = match sqlx::query_as::<_, WorkflowInstance>(
                "SELECT id, workflow_id, title, initiator_id, status, started_at, completed_at, created_at, updated_at FROM core_workflow_instances WHERE id = $1",
            )
            .bind(row.task_instance_id)
            .fetch_one(&state.pool)
            .await
            {
                Ok(v) => v,
                Err(_) => return Json(api_error(500, "获取工作流实例失败")),
            };

            let workflow = match sqlx::query_as::<_, Workflow>(
                "SELECT id, name, description, definition, status, version, created_by, created_at, updated_at, published_at FROM core_workflows WHERE id = $1",
            )
            .bind(instance.workflow_id)
            .fetch_one(&state.pool)
            .await
            {
                Ok(v) => v,
                Err(_) => return Json(api_error(500, "获取工作流定义失败")),
            };

            Json(ApiResponse::success(
                ApprovalTask {
                    id: row.task_id.to_string(),
                    workflow_instance_id: Some(instance.id.to_string()),
                    workflow_id: Some(workflow.id.to_string()),
                    workflow_name: Some(workflow.name),
                    node_id: Some(row.task_node_id.clone()),
                    node_name: Some(row.task_node_id),
                    task_name: instance.title,
                    assignee_id: Some(row.task_assignee_id.to_string()),
                    assignee_name: None,
                    initiator_id: Some(instance.initiator_id.to_string()),
                    initiator_name: None,
                    status: row.task_status,
                    approval_type: None,
                    comment: row.task_comment,
                    created_at: row.task_created_at.to_rfc3339(),
                    updated_at: None,
                    priority: None,
                },
                "重新分配成功",
            ))
        }
        None => Json(api_error(404, "审批任务不存在")),
    }
}

pub async fn list_approvals(State(state): State<AppState>) -> Json<ApiResponse<Vec<ApprovalTask>>> {
    let tasks: Vec<ApprovalTaskRow> = match sqlx::query_as(
        r#"SELECT t.id as task_id, t.instance_id as task_instance_id, t.node_id as task_node_id, t.assignee_id as task_assignee_id, t.status as task_status, t.comment as task_comment, t.created_at as task_created_at, t.completed_at as task_completed_at,
                  i.id as instance_id, i.workflow_id as instance_workflow_id, i.title as instance_title, i.initiator_id as instance_initiator_id, i.status as instance_status, i.started_at as instance_started_at, i.completed_at as instance_completed_at,
                  w.id as workflow_id, w.name as workflow_name, w.description as workflow_description, w.definition as workflow_definition, w.status as workflow_status, w.version as workflow_version, w.created_by as workflow_created_by, w.created_at as workflow_created_at, w.updated_at as workflow_updated_at, w.published_at as workflow_published_at
           FROM core_workflow_tasks t
           JOIN core_workflow_instances i ON t.instance_id = i.id
           JOIN core_workflows w ON i.workflow_id = w.id
           ORDER BY t.created_at DESC
           LIMIT 20"#,
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询审批列表失败: {}", e);
            return Json(api_error(500, "查询审批列表失败"));
        }
    };

    let items: Vec<ApprovalTask> = tasks
        .into_iter()
        .map(|row| ApprovalTask {
            id: row.task_id.to_string(),
            workflow_instance_id: row.instance_id.map(|id| id.to_string()),
            workflow_id: row.workflow_id.map(|id| id.to_string()),
            workflow_name: row.workflow_name,
            node_id: Some(row.task_node_id.clone()),
            node_name: Some(row.task_node_id),
            task_name: row.instance_title.unwrap_or_default(),
            assignee_id: Some(row.task_assignee_id.to_string()),
            assignee_name: None,
            initiator_id: row.instance_initiator_id.map(|id| id.to_string()),
            initiator_name: None,
            status: row.task_status,
            approval_type: None,
            comment: row.task_comment,
            created_at: row.task_created_at.to_rfc3339(),
            updated_at: row.task_completed_at.map(|dt| dt.to_rfc3339()),
            priority: None,
        })
        .collect();

    Json(ApiResponse::success(items, "查询成功"))
}

pub async fn get_approval(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<ApprovalTask>> {
    get_approval_task(State(state), Path(id)).await
}

pub async fn create_approval(
    State(state): State<AppState>,
    Json(payload): Json<serde_json::Value>,
) -> Json<ApiResponse<ApprovalTask>> {
    let workflow_id_str = match payload.get("workflow_id") {
        Some(v) => v.as_str().unwrap_or_default(),
        None => return Json(api_error(400, "缺少workflow_id参数")),
    };

    let workflow_id = match Uuid::parse_str(workflow_id_str) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的工作流ID")),
    };

    let title = payload
        .get("title")
        .and_then(|v| v.as_str())
        .unwrap_or("审批申请");
    let initiator_id_str = match payload.get("initiator_id") {
        Some(v) => v.as_str().unwrap_or_default(),
        None => return Json(api_error(400, "缺少initiator_id参数")),
    };

    let initiator_id = match Uuid::parse_str(initiator_id_str) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的发起人ID")),
    };

    let instance = match sqlx::query_as::<_, WorkflowInstance>(
        r#"INSERT INTO core_workflow_instances (workflow_id, title, initiator_id, status)
           VALUES ($1, $2, $3, 'running')
           RETURNING id, workflow_id, title, initiator_id, status, started_at, completed_at, created_at, updated_at"#,
    )
    .bind(workflow_id)
    .bind(title)
    .bind(initiator_id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("创建工作流实例失败: {}", e);
            return Json(api_error(500, "创建工作流实例失败"));
        }
    };

    let assignee_id_str = match payload.get("assignee_id") {
        Some(v) => v.as_str().unwrap_or_default(),
        None => return Json(api_error(400, "缺少assignee_id参数")),
    };

    let assignee_id = match Uuid::parse_str(assignee_id_str) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的审批人ID")),
    };

    let task = match sqlx::query_as::<_, WorkflowTask>(
        r#"INSERT INTO core_workflow_tasks (instance_id, node_id, assignee_id, status)
           VALUES ($1, 'start', $2, 'pending')
           RETURNING id, instance_id, node_id, assignee_id, status, comment, created_at, completed_at"#,
    )
    .bind(instance.id)
    .bind(assignee_id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("创建审批任务失败: {}", e);
            return Json(api_error(500, "创建审批任务失败"));
        }
    };

    let workflow = match sqlx::query_as::<_, Workflow>(
        "SELECT id, name, description, definition, status, version, created_by, created_at, updated_at, published_at FROM core_workflows WHERE id = $1",
    )
    .bind(workflow_id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(_) => return Json(api_error(500, "获取工作流定义失败")),
    };

    Json(ApiResponse::success(
        ApprovalTask {
            id: task.id.to_string(),
            workflow_instance_id: Some(instance.id.to_string()),
            workflow_id: Some(workflow.id.to_string()),
            workflow_name: Some(workflow.name),
            node_id: Some(task.node_id.clone()),
            node_name: Some(task.node_id),
            task_name: instance.title,
            assignee_id: Some(task.assignee_id.to_string()),
            assignee_name: None,
            initiator_id: Some(instance.initiator_id.to_string()),
            initiator_name: None,
            status: task.status,
            approval_type: None,
            comment: task.comment,
            created_at: task.created_at.to_rfc3339(),
            updated_at: None,
            priority: None,
        },
        "创建成功",
    ))
}

pub async fn process_approval(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(payload): Json<TaskActionRequest>,
) -> Json<ApiResponse<ApprovalTask>> {
    let action = match payload.variables.as_ref().and_then(|v| v.get("action")) {
        Some(v) => v.as_str().unwrap_or_default(),
        None => return Json(api_error(400, "缺少action参数")),
    };

    match action {
        "approve" => approve_task(State(state), Path(id), Json(payload)).await,
        "reject" => reject_task(State(state), Path(id), Json(payload)).await,
        _ => Json(api_error(400, "无效的操作类型")),
    }
}
