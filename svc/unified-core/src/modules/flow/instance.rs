use crate::AppState;
use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::Deserialize;
use uuid::Uuid;

use topems_shared::{api_error, ApiResponse, PaginatedResponse};

use super::models::{CreateInstanceRequest, WorkflowInstance};

#[derive(Debug, Deserialize)]
pub struct InstanceQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub workflow_id: Option<String>,
}

pub async fn list_instances(
    State(state): State<AppState>,
    Query(params): Query<InstanceQueryParams>,
) -> Json<ApiResponse<PaginatedResponse<WorkflowInstance>>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search = params.search.clone().unwrap_or_default();
    let status = params.status.clone();
    let workflow_id = params.workflow_id.clone();

    let has_filters = !search.is_empty() || status.is_some() || workflow_id.is_some();

    let workflow_uuid = workflow_id.and_then(|s| Uuid::parse_str(&s).ok());

    let total: i64 = if !has_filters {
        sqlx::query_scalar("SELECT COUNT(*) FROM core_workflow_instances")
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0)
    } else {
        match sqlx::query_scalar(
            r#"SELECT COUNT(*) FROM core_workflow_instances 
               WHERE (title ILIKE $1 OR $1 = '')
                 AND (status = $2 OR $2 = '')
                 AND (workflow_id = $3 OR $3 IS NULL)"#,
        )
        .bind(format!("%{}%", search.clone()))
        .bind(status.clone().unwrap_or_default())
        .bind(workflow_uuid)
        .fetch_one(&state.pool)
        .await
        {
            Ok(v) => v,
            Err(e) => {
                tracing::error!("查询工作流实例总数失败: {}", e);
                return Json(api_error(500, "查询工作流实例总数失败"));
            }
        }
    };

    let items: Vec<WorkflowInstance> = if !has_filters {
        match sqlx::query_as::<_, WorkflowInstance>(
            "SELECT id, workflow_id, title, initiator_id, current_node_id, status, variables, started_at, completed_at, created_at, updated_at FROM core_workflow_instances ORDER BY created_at DESC LIMIT $1 OFFSET $2"
        )
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.pool)
        .await
        {
            Ok(v) => v,
            Err(e) => {
                tracing::error!("查询工作流实例列表失败: {}", e);
                return Json(api_error(500, "查询工作流实例列表失败"));
            }
        }
    } else {
        let workflow_uuid = params
            .workflow_id
            .clone()
            .and_then(|s| Uuid::parse_str(&s).ok());

        match sqlx::query_as::<_, WorkflowInstance>(
            r#"SELECT id, workflow_id, title, initiator_id, current_node_id, status, variables, started_at, completed_at, created_at, updated_at 
               FROM core_workflow_instances 
               WHERE (title ILIKE $1 OR $1 = '')
                 AND (status = $2 OR $2 = '')
                 AND (workflow_id = $3 OR $3 IS NULL)
               ORDER BY created_at DESC LIMIT $4 OFFSET $5"#
        )
        .bind(format!("%{}%", search.clone()))
        .bind(status.clone().unwrap_or_default())
        .bind(workflow_uuid)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.pool)
        .await
        {
            Ok(v) => v,
            Err(e) => {
                tracing::error!("查询工作流实例列表失败: {}", e);
                return Json(api_error(500, "查询工作流实例列表失败"));
            }
        }
    };

    Json(ApiResponse::success(
        PaginatedResponse::new(items, total, page, page_size),
        "查询成功",
    ))
}

pub async fn get_instance(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<WorkflowInstance>> {
    let instance = match sqlx::query_as::<_, WorkflowInstance>(
        "SELECT id, workflow_id, title, initiator_id, current_node_id, status, variables, started_at, completed_at, created_at, updated_at FROM core_workflow_instances WHERE id = $1",
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                return Json(api_error(404, "工作流实例不存在"));
            }
            tracing::error!("查询工作流实例失败: {}", e);
            return Json(api_error(500, "查询工作流实例失败"));
        }
    };

    Json(ApiResponse::success(instance, "查询成功"))
}

pub async fn create_instance(
    State(state): State<AppState>,
    Json(payload): Json<CreateInstanceRequest>,
) -> Json<ApiResponse<WorkflowInstance>> {
    let instance = match sqlx::query_as::<_, WorkflowInstance>(
        "INSERT INTO core_workflow_instances (workflow_id, title, initiator_id, variables, status, started_at) 
         VALUES ($1, $2, $3, $4, $5, NOW()) 
         RETURNING id, workflow_id, title, initiator_id, current_node_id, status, variables, started_at, completed_at, created_at, updated_at",
    )
    .bind(payload.workflow_id)
    .bind(payload.title)
    .bind(payload.initiator_id)
    .bind(payload.variables)
    .bind("running")
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("创建工作流实例失败: {}", e);
            return Json(api_error(500, "创建工作流实例失败"));
        }
    };

    Json(ApiResponse::success(instance, "创建成功"))
}

pub async fn start_instance(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<WorkflowInstance>> {
    let instance = match sqlx::query_as::<_, WorkflowInstance>(
        "UPDATE core_workflow_instances SET status = 'running', started_at = NOW(), updated_at = NOW() 
         WHERE id = $1 
         RETURNING id, workflow_id, title, initiator_id, current_node_id, status, variables, started_at, completed_at, created_at, updated_at",
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                return Json(api_error(404, "工作流实例不存在"));
            }
            tracing::error!("启动工作流实例失败: {}", e);
            return Json(api_error(500, "启动工作流实例失败"));
        }
    };

    Json(ApiResponse::success(instance, "启动成功"))
}

pub async fn approve_instance(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<WorkflowInstance>> {
    let instance = match sqlx::query_as::<_, WorkflowInstance>(
        "UPDATE core_workflow_instances SET status = 'approved', completed_at = NOW(), updated_at = NOW() 
         WHERE id = $1 
         RETURNING id, workflow_id, title, initiator_id, current_node_id, status, variables, started_at, completed_at, created_at, updated_at",
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                return Json(api_error(404, "工作流实例不存在"));
            }
            tracing::error!("审批工作流实例失败: {}", e);
            return Json(api_error(500, "审批工作流实例失败"));
        }
    };

    Json(ApiResponse::success(instance, "审批通过"))
}

pub async fn reject_instance(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<WorkflowInstance>> {
    let instance = match sqlx::query_as::<_, WorkflowInstance>(
        "UPDATE core_workflow_instances SET status = 'rejected', completed_at = NOW(), updated_at = NOW() 
         WHERE id = $1 
         RETURNING id, workflow_id, title, initiator_id, current_node_id, status, variables, started_at, completed_at, created_at, updated_at",
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                return Json(api_error(404, "工作流实例不存在"));
            }
            tracing::error!("拒绝工作流实例失败: {}", e);
            return Json(api_error(500, "拒绝工作流实例失败"));
        }
    };

    Json(ApiResponse::success(instance, "已拒绝"))
}

pub async fn cancel_instance(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<WorkflowInstance>> {
    let instance = match sqlx::query_as::<_, WorkflowInstance>(
        "UPDATE core_workflow_instances SET status = 'cancelled', completed_at = NOW(), updated_at = NOW() 
         WHERE id = $1 
         RETURNING id, workflow_id, title, initiator_id, current_node_id, status, variables, started_at, completed_at, created_at, updated_at",
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                return Json(api_error(404, "工作流实例不存在"));
            }
            tracing::error!("取消工作流实例失败: {}", e);
            return Json(api_error(500, "取消工作流实例失败"));
        }
    };

    Json(ApiResponse::success(instance, "取消成功"))
}

pub async fn resume_instance(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<WorkflowInstance>> {
    let instance = match sqlx::query_as::<_, WorkflowInstance>(
        "UPDATE core_workflow_instances SET status = 'running', completed_at = NULL, updated_at = NOW() 
         WHERE id = $1 
         RETURNING id, workflow_id, title, initiator_id, current_node_id, status, variables, started_at, completed_at, created_at, updated_at",
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                return Json(api_error(404, "工作流实例不存在"));
            }
            tracing::error!("恢复工作流实例失败: {}", e);
            return Json(api_error(500, "恢复工作流实例失败"));
        }
    };

    Json(ApiResponse::success(instance, "恢复成功"))
}

pub async fn suspend_instance(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<WorkflowInstance>> {
    let instance = match sqlx::query_as::<_, WorkflowInstance>(
        "UPDATE core_workflow_instances SET status = 'suspended', updated_at = NOW() 
         WHERE id = $1 
         RETURNING id, workflow_id, title, initiator_id, current_node_id, status, variables, started_at, completed_at, created_at, updated_at",
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                return Json(api_error(404, "工作流实例不存在"));
            }
            tracing::error!("暂停工作流实例失败: {}", e);
            return Json(api_error(500, "暂停工作流实例失败"));
        }
    };

    Json(ApiResponse::success(instance, "暂停成功"))
}

pub async fn get_instance_details(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<WorkflowInstance>> {
    get_instance(State(state), Path(id)).await
}
