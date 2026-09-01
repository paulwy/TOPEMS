use crate::AppState;
use axum::{
    extract::{Extension, Path, Query, State},
    Json,
};
use serde::Deserialize;
use utoipa::ToSchema;
use uuid::Uuid;

use topems_shared::ApiResponse;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::service::is_service_claims;
use topems_shared_core::response::{api_error, PaginatedResponse};

use super::models::{CreateInstanceRequest, WorkflowInstance};

#[derive(Debug, Deserialize, ToSchema)]
#[schema(as = InstanceQueryParams)]
pub struct InstanceQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub workflow_id: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["unified-core:flow:instance:read"])),
    path = "/api/core/flow/instances",
    tag = "Flow-Instance",
    params(
        ("page" = Option<i64>, Query, description = "页码，默认1"),
        ("page_size" = Option<i64>, Query, description = "每页条数，默认20，最大100"),
        ("search" = Option<String>, Query, description = "搜索关键词"),
        ("status" = Option<String>, Query, description = "实例状态筛选"),
        ("workflow_id" = Option<String>, Query, description = "工作流ID"),
    ),
    responses(
        (status = 200, description = "查询成功", body = ApiResponse<PaginatedResponse<WorkflowInstance>>),
        (status = 500, description = "查询失败"),
    ),
)]
pub async fn list_instances(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<InstanceQueryParams>,
) -> Json<ApiResponse<PaginatedResponse<WorkflowInstance>>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    // 用户维度可见性过滤：服务身份（sub 全 0 / role=service）豁免，返回全量；
    // 普通用户仅可见「自己发起的」或「作为任务处理人参与（core_workflow_tasks.assignee_id）」的实例。
    let user_uuid: Option<Uuid> = if is_service_claims(&claims) {
        None
    } else {
        Uuid::parse_str(&claims.sub).ok()
    };

    let search = params.search.clone().unwrap_or_default();
    let status = params.status.clone();
    let workflow_id = params.workflow_id.clone();

    let has_filters = !search.is_empty() || status.is_some() || workflow_id.is_some();

    let workflow_uuid = workflow_id.and_then(|s| Uuid::parse_str(&s).ok());

    let total: i64 = if !has_filters {
        sqlx::query_scalar(
            r#"SELECT COUNT(*) FROM core_workflow_instances
               WHERE ($1::uuid IS NULL OR initiator_id = $1 OR EXISTS (
                   SELECT 1 FROM core_workflow_tasks t
                   WHERE t.instance_id = core_workflow_instances.id AND t.assignee_id = $1 AND t.deleted_at IS NULL
               ))"#,
        )
        .bind(user_uuid)
        .fetch_one(&state.pool)
        .await
        .unwrap_or(0)
    } else {
        match sqlx::query_scalar(
            r#"SELECT COUNT(*) FROM core_workflow_instances
               WHERE (title ILIKE $1 OR $1 = '')
                 AND (status = $2 OR $2 = '')
                 AND (workflow_id = $3 OR $3 IS NULL)
                 AND ($4::uuid IS NULL OR initiator_id = $4 OR EXISTS (
                     SELECT 1 FROM core_workflow_tasks t
                     WHERE t.instance_id = core_workflow_instances.id AND t.assignee_id = $4 AND t.deleted_at IS NULL
                 ))"#,
        )
        .bind(format!("%{}%", search.clone()))
        .bind(status.clone().unwrap_or_default())
        .bind(workflow_uuid)
        .bind(user_uuid)
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
            r#"SELECT id, workflow_id, title, initiator_id, current_node_id, status, variables, started_at, completed_at, created_at, updated_at FROM core_workflow_instances
               WHERE ($1::uuid IS NULL OR initiator_id = $1 OR EXISTS (
                   SELECT 1 FROM core_workflow_tasks t
                   WHERE t.instance_id = core_workflow_instances.id AND t.assignee_id = $1 AND t.deleted_at IS NULL
               ))
               ORDER BY created_at DESC LIMIT $2 OFFSET $3"#
        )
        .bind(user_uuid)
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
                 AND ($4::uuid IS NULL OR initiator_id = $4 OR EXISTS (
                     SELECT 1 FROM core_workflow_tasks t
                     WHERE t.instance_id = core_workflow_instances.id AND t.assignee_id = $4 AND t.deleted_at IS NULL
                 ))
               ORDER BY created_at DESC LIMIT $5 OFFSET $6"#
        )
        .bind(format!("%{}%", search.clone()))
        .bind(status.clone().unwrap_or_default())
        .bind(workflow_uuid)
        .bind(user_uuid)
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["unified-core:flow:instance:read"])),
    path = "/api/core/flow/instances/{id}",
    tag = "Flow-Instance",
    params(
        ("id" = Uuid, Path, description = "实例ID"),
    ),
    responses(
        (status = 200, description = "查询成功", body = ApiResponse<WorkflowInstance>),
        (status = 404, description = "实例不存在"),
        (status = 500, description = "查询失败"),
    ),
)]
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

#[utoipa::path(
    post,
    security(("BearerAuth" = ["unified-core:flow:instance:read"])),
    path = "/api/core/flow/instances",
    tag = "Flow-Instance",
    request_body = CreateInstanceRequest,
    responses(
        (status = 200, description = "创建成功", body = ApiResponse<WorkflowInstance>),
        (status = 500, description = "创建失败"),
    ),
)]
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

#[utoipa::path(
    post,
    security(("BearerAuth" = ["unified-core:flow:instance:read"])),
    path = "/api/core/flow/instances/{id}/start",
    tag = "Flow-Instance",
    params(
        ("id" = Uuid, Path, description = "实例ID"),
    ),
    responses(
        (status = 200, description = "启动成功", body = ApiResponse<WorkflowInstance>),
        (status = 404, description = "实例不存在"),
        (status = 500, description = "启动失败"),
    ),
)]
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

#[utoipa::path(
    post,
    security(("BearerAuth" = ["unified-core:flow:instance:read"])),
    path = "/api/core/flow/instances/{id}/approve",
    tag = "Flow-Instance",
    params(
        ("id" = Uuid, Path, description = "实例ID"),
    ),
    responses(
        (status = 200, description = "审批通过", body = ApiResponse<WorkflowInstance>),
        (status = 404, description = "实例不存在"),
        (status = 500, description = "审批失败"),
    ),
)]
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

#[utoipa::path(
    post,
    security(("BearerAuth" = ["unified-core:flow:instance:read"])),
    path = "/api/core/flow/instances/{id}/reject",
    tag = "Flow-Instance",
    params(
        ("id" = Uuid, Path, description = "实例ID"),
    ),
    responses(
        (status = 200, description = "已拒绝", body = ApiResponse<WorkflowInstance>),
        (status = 404, description = "实例不存在"),
        (status = 500, description = "拒绝失败"),
    ),
)]
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

#[utoipa::path(
    post,
    security(("BearerAuth" = ["unified-core:flow:instance:read"])),
    path = "/api/core/flow/instances/{id}/cancel",
    tag = "Flow-Instance",
    params(
        ("id" = Uuid, Path, description = "实例ID"),
    ),
    responses(
        (status = 200, description = "取消成功", body = ApiResponse<WorkflowInstance>),
        (status = 404, description = "实例不存在"),
        (status = 500, description = "取消失败"),
    ),
)]
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

#[utoipa::path(
    post,
    security(("BearerAuth" = ["unified-core:flow:instance:read"])),
    path = "/api/core/flow/instances/{id}/resume",
    tag = "Flow-Instance",
    params(
        ("id" = Uuid, Path, description = "实例ID"),
    ),
    responses(
        (status = 200, description = "恢复成功", body = ApiResponse<WorkflowInstance>),
        (status = 404, description = "实例不存在"),
        (status = 500, description = "恢复失败"),
    ),
)]
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

#[utoipa::path(
    post,
    security(("BearerAuth" = ["unified-core:flow:instance:read"])),
    path = "/api/core/flow/instances/{id}/suspend",
    tag = "Flow-Instance",
    params(
        ("id" = Uuid, Path, description = "实例ID"),
    ),
    responses(
        (status = 200, description = "暂停成功", body = ApiResponse<WorkflowInstance>),
        (status = 404, description = "实例不存在"),
        (status = 500, description = "暂停失败"),
    ),
)]
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["unified_core:read"])),
    path = "/api/core/flow/instances/{id}/details",
    tag = "Flow-Instance",
    params(
        ("id" = Uuid, Path, description = "实例ID"),
    ),
    responses(
        (status = 200, description = "查询成功", body = ApiResponse<WorkflowInstance>),
        (status = 404, description = "实例不存在"),
        (status = 500, description = "查询失败"),
    ),
)]
pub async fn get_instance_details(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<WorkflowInstance>> {
    get_instance(State(state), Path(id)).await
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["unified-core:flow:instance:read"])),
    path = "/api/core/flow/monitor/instances/error",
    tag = "Flow-Monitor",
    params(
        ("page" = Option<i64>, Query, description = "页码，默认1"),
        ("page_size" = Option<i64>, Query, description = "每页条数，默认20，最大100"),
        ("search" = Option<String>, Query, description = "搜索关键词"),
        ("workflow_id" = Option<String>, Query, description = "工作流ID"),
    ),
    responses(
        (status = 200, description = "查询成功", body = ApiResponse<PaginatedResponse<WorkflowInstance>>),
        (status = 500, description = "查询失败"),
    ),
)]
pub async fn error_instances(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<InstanceQueryParams>,
) -> Json<ApiResponse<PaginatedResponse<WorkflowInstance>>> {
    let mut params = params;
    params.status = Some("error".to_string());
    list_instances(State(state), Extension(claims), Query(params)).await
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["unified-core:flow:instance:read"])),
    path = "/api/core/flow/monitor/instances/overdue",
    tag = "Flow-Monitor",
    params(
        ("page" = Option<i64>, Query, description = "页码，默认1"),
        ("page_size" = Option<i64>, Query, description = "每页条数，默认20，最大100"),
    ),
    responses(
        (status = 200, description = "查询成功", body = ApiResponse<PaginatedResponse<WorkflowInstance>>),
        (status = 500, description = "查询失败"),
    ),
)]
pub async fn overdue_instances(
    State(state): State<AppState>,
    Query(params): Query<InstanceQueryParams>,
) -> Json<ApiResponse<PaginatedResponse<WorkflowInstance>>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let total: i64 = match sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM core_workflow_instances i
           WHERE EXISTS (
               SELECT 1 FROM core_workflow_tasks t
               WHERE t.instance_id = i.id
                 AND t.due_time IS NOT NULL
                 AND t.due_time < NOW()
                 AND t.completed_at IS NULL
           )"#,
    )
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询逾期工作流实例总数失败: {}", e);
            return Json(api_error(500, "查询逾期工作流实例总数失败"));
        }
    };

    let items: Vec<WorkflowInstance> = match sqlx::query_as::<_, WorkflowInstance>(
        r#"SELECT i.id, i.tenant_id, i.workflow_id, i.title, i.initiator_id, i.current_node_id, i.status, i.variables, i.started_at, i.completed_at, i.created_at, i.updated_at
           FROM core_workflow_instances i
           WHERE EXISTS (
               SELECT 1 FROM core_workflow_tasks t
               WHERE t.instance_id = i.id
                 AND t.due_time IS NOT NULL
                 AND t.due_time < NOW()
                 AND t.completed_at IS NULL
           )
           ORDER BY i.created_at DESC
           LIMIT $1 OFFSET $2"#,
    )
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询逾期工作流实例列表失败: {}", e);
            return Json(api_error(500, "查询逾期工作流实例列表失败"));
        }
    };

    Json(ApiResponse::success(
        PaginatedResponse::new(items, total, page, page_size),
        "查询成功",
    ))
}
