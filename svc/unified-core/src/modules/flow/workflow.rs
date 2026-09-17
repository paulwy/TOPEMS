use crate::AppState;
use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::Deserialize;
use utoipa::ToSchema;
use uuid::Uuid;

use topems_shared::ApiResponse;
use topems_shared_core::response::{api_error, PaginatedResponse};

use super::models::{CreateWorkflowRequest, UpdateWorkflowRequest, Workflow, WorkflowVersion};

#[derive(Debug, Deserialize, ToSchema)]
#[schema(as = WorkflowQueryParams)]
pub struct WorkflowQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["unified-core:flow:workflow:read"])),
    path = "/api/core/flow/workflows",
    tag = "Flow-Workflow",
    params(
        ("page" = Option<i64>, Query, description = "页码，默认1"),
        ("page_size" = Option<i64>, Query, description = "每页条数，默认20，最大100"),
        ("search" = Option<String>, Query, description = "搜索关键词"),
        ("status" = Option<String>, Query, description = "工作流状态筛选"),
    ),
    responses(
        (status = 200, description = "查询成功", body = ApiResponse<PaginatedResponse<Workflow>>),
        (status = 500, description = "查询失败"),
    ),
)]
pub async fn list_workflows(
    State(state): State<AppState>,
    Query(params): Query<WorkflowQueryParams>,
) -> Json<ApiResponse<PaginatedResponse<Workflow>>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search = params.search.clone().unwrap_or_default();
    let status = params.status.clone();

    let has_filters = !search.is_empty() || status.is_some();

    let total: i64 = if !has_filters {
        sqlx::query_scalar("SELECT COUNT(*) FROM core_workflows")
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0)
    } else {
        match sqlx::query_scalar(
            r#"SELECT COUNT(*) FROM core_workflows 
               WHERE deleted_at IS NULL AND (name ILIKE $1 OR description ILIKE $1 OR $1 = '')
                 AND (status = $2 OR $2 = '')"#,
        )
        .bind(format!("%{}%", search.clone()))
        .bind(status.clone().unwrap_or_default())
        .fetch_one(&state.pool)
        .await
        {
            Ok(v) => v,
            Err(e) => {
                tracing::error!("查询工作流总数失败: {}", e);
                return Json(api_error(500, "查询工作流总数失败"));
            }
        }
    };

    let items: Vec<Workflow> = if !has_filters {
        match sqlx::query_as::<_, Workflow>(
            "SELECT id, name, description, definition, status, version, created_by, created_at, updated_at, published_at FROM core_workflows ORDER BY created_at DESC LIMIT $1 OFFSET $2"
        )
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.pool)
        .await
        {
            Ok(v) => v,
            Err(e) => {
                tracing::error!("查询工作流列表失败: {}", e);
                return Json(api_error(500, "查询工作流列表失败"));
            }
        }
    } else {
        match sqlx::query_as::<_, Workflow>(
            r#"SELECT id, name, description, definition, status, version, created_by, created_at, updated_at, published_at 
               FROM core_workflows 
               WHERE (name ILIKE $1 OR description ILIKE $1 OR $1 = '')
                 AND (status = $2 OR $2 = '')
               ORDER BY created_at DESC LIMIT $3 OFFSET $4"#
        )
        .bind(format!("%{}%", search.clone()))
        .bind(status.clone().unwrap_or_default())
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.pool)
        .await
        {
            Ok(v) => v,
            Err(e) => {
                tracing::error!("查询工作流列表失败: {}", e);
                return Json(api_error(500, "查询工作流列表失败"));
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
    security(("BearerAuth" = ["unified-core:flow:workflow:read"])),
    path = "/api/core/flow/workflows/{id}",
    tag = "Flow-Workflow",
    params(
        ("id" = Uuid, Path, description = "工作流ID"),
    ),
    responses(
        (status = 200, description = "查询成功", body = ApiResponse<Workflow>),
        (status = 404, description = "工作流不存在"),
        (status = 500, description = "查询失败"),
    ),
)]
pub async fn get_workflow(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Workflow>> {
    let workflow = match sqlx::query_as::<_, Workflow>(
        "SELECT id, name, description, definition, status, version, created_by, created_at, updated_at, published_at FROM core_workflows WHERE deleted_at IS NULL AND id = $1",
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                return Json(api_error(404, "工作流不存在"));
            }
            tracing::error!("查询工作流失败: {}", e);
            return Json(api_error(500, "查询工作流失败"));
        }
    };

    Json(ApiResponse::success(workflow, "查询成功"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["unified-core:flow:workflow:write"])),
    path = "/api/core/flow/workflows",
    tag = "Flow-Workflow",
    request_body = CreateWorkflowRequest,
    responses(
        (status = 200, description = "创建成功", body = ApiResponse<Workflow>),
        (status = 500, description = "创建失败"),
    ),
)]
pub async fn create_workflow(
    State(state): State<AppState>,
    Json(payload): Json<CreateWorkflowRequest>,
) -> Json<ApiResponse<Workflow>> {
    let workflow = match sqlx::query_as::<_, Workflow>(
        "INSERT INTO core_workflows (name, description, definition, status, version, created_by) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING id, name, description, definition, status, version, created_by, created_at, updated_at, published_at",
    )
    .bind(payload.name)
    .bind(payload.description)
    .bind(payload.definition.unwrap_or(serde_json::json!({})))
    .bind(payload.status.unwrap_or("draft".to_string()))
    .bind(1)
    .bind(payload.created_by)
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("创建工作流失败: {}", e);
            return Json(api_error(500, "创建工作流失败"));
        }
    };

    Json(ApiResponse::success(workflow, "创建成功"))
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["unified-core:flow:workflow:write"])),
    path = "/api/core/flow/workflows/{id}",
    tag = "Flow-Workflow",
    params(
        ("id" = Uuid, Path, description = "工作流ID"),
    ),
    request_body = UpdateWorkflowRequest,
    responses(
        (status = 200, description = "更新成功", body = ApiResponse<Workflow>),
        (status = 404, description = "工作流不存在"),
        (status = 500, description = "更新失败"),
    ),
)]
pub async fn update_workflow(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateWorkflowRequest>,
) -> Json<ApiResponse<Workflow>> {
    let workflow = match sqlx::query_as::<_, Workflow>(
        "UPDATE core_workflows SET 
         name = COALESCE($1, name), 
         description = COALESCE($2, description), 
         definition = COALESCE($3, definition), 
         status = COALESCE($4, status),
         updated_at = NOW()
         WHERE id = $5 
         RETURNING id, name, description, definition, status, version, created_by, created_at, updated_at, published_at",
    )
    .bind(payload.name)
    .bind(payload.description)
    .bind(payload.definition)
    .bind(payload.status)
    .bind(id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                return Json(api_error(404, "工作流不存在"));
            }
            tracing::error!("更新工作流失败: {}", e);
            return Json(api_error(500, "更新工作流失败"));
        }
    };

    Json(ApiResponse::success(workflow, "更新成功"))
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["unified-core:flow:workflow:admin"])),
    path = "/api/core/flow/workflows/{id}",
    tag = "Flow-Workflow",
    params(
        ("id" = Uuid, Path, description = "工作流ID"),
    ),
    responses(
        (status = 200, description = "删除成功", body = ApiResponse<()>),
        (status = 404, description = "工作流不存在"),
        (status = 500, description = "删除失败"),
    ),
)]
pub async fn delete_workflow(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<()>> {
    let result = sqlx::query("UPDATE core_workflows SET deleted_at = NOW() WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(v) => {
            if v.rows_affected() == 0 {
                Json(api_error(404, "工作流不存在"))
            } else {
                Json(ApiResponse::success_no_data("删除成功"))
            }
        }
        Err(e) => {
            tracing::error!("删除工作流失败: {}", e);
            Json(api_error(500, "删除工作流失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["unified-core:flow:workflow:admin"])),
    path = "/api/core/flow/workflows/{id}/publish",
    tag = "Flow-Workflow",
    params(
        ("id" = Uuid, Path, description = "工作流ID"),
    ),
    responses(
        (status = 200, description = "发布成功", body = ApiResponse<Workflow>),
        (status = 404, description = "工作流不存在"),
        (status = 500, description = "发布失败"),
    ),
)]
pub async fn publish_workflow(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Workflow>> {
    let workflow = match sqlx::query_as::<_, Workflow>(
        "UPDATE core_workflows SET status = 'published', published_at = NOW(), updated_at = NOW() 
         WHERE id = $1 
         RETURNING id, name, description, definition, status, version, created_by, created_at, updated_at, published_at",
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                return Json(api_error(404, "工作流不存在"));
            }
            tracing::error!("发布工作流失败: {}", e);
            return Json(api_error(500, "发布工作流失败"));
        }
    };

    Json(ApiResponse::success(workflow, "发布成功"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["unified-core:flow:workflow:admin"])),
    path = "/api/core/flow/workflows/{id}/unpublish",
    tag = "Flow-Workflow",
    params(
        ("id" = Uuid, Path, description = "工作流ID"),
    ),
    responses(
        (status = 200, description = "取消发布成功", body = ApiResponse<Workflow>),
        (status = 404, description = "工作流不存在"),
        (status = 500, description = "取消发布失败"),
    ),
)]
pub async fn unpublish_workflow(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Workflow>> {
    let workflow = match sqlx::query_as::<_, Workflow>(
        "UPDATE core_workflows SET status = 'draft', published_at = NULL, updated_at = NOW() 
         WHERE id = $1 
         RETURNING id, name, description, definition, status, version, created_by, created_at, updated_at, published_at",
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                return Json(api_error(404, "工作流不存在"));
            }
            tracing::error!("取消发布工作流失败: {}", e);
            return Json(api_error(500, "取消发布工作流失败"));
        }
    };

    Json(ApiResponse::success(workflow, "取消发布成功"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["unified-core:flow:workflow:admin"])),
    path = "/api/core/flow/workflows/{id}/activate",
    tag = "Flow-Workflow",
    params(
        ("id" = Uuid, Path, description = "工作流ID"),
    ),
    responses(
        (status = 200, description = "激活成功", body = ApiResponse<Workflow>),
        (status = 404, description = "工作流不存在"),
        (status = 500, description = "激活失败"),
    ),
)]
pub async fn activate_workflow(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Workflow>> {
    let workflow = match sqlx::query_as::<_, Workflow>(
        "UPDATE core_workflows SET status = 'active', updated_at = NOW() 
         WHERE id = $1 
         RETURNING id, name, description, definition, status, version, created_by, created_at, updated_at, published_at",
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                return Json(api_error(404, "工作流不存在"));
            }
            tracing::error!("激活工作流失败: {}", e);
            return Json(api_error(500, "激活工作流失败"));
        }
    };

    Json(ApiResponse::success(workflow, "激活成功"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["unified-core:flow:workflow:admin"])),
    path = "/api/core/flow/workflows/{id}/deactivate",
    tag = "Flow-Workflow",
    params(
        ("id" = Uuid, Path, description = "工作流ID"),
    ),
    responses(
        (status = 200, description = "停用成功", body = ApiResponse<Workflow>),
        (status = 404, description = "工作流不存在"),
        (status = 500, description = "停用失败"),
    ),
)]
pub async fn deactivate_workflow(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Workflow>> {
    let workflow = match sqlx::query_as::<_, Workflow>(
        "UPDATE core_workflows SET status = 'inactive', updated_at = NOW() 
         WHERE id = $1 
         RETURNING id, name, description, definition, status, version, created_by, created_at, updated_at, published_at",
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                return Json(api_error(404, "工作流不存在"));
            }
            tracing::error!("停用工作流失败: {}", e);
            return Json(api_error(500, "停用工作流失败"));
        }
    };

    Json(ApiResponse::success(workflow, "停用成功"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["unified-core:flow:workflow:admin"])),
    path = "/api/core/flow/workflows/{id}/deploy",
    tag = "Flow-Workflow",
    params(
        ("id" = Uuid, Path, description = "工作流ID"),
    ),
    responses(
        (status = 200, description = "部署成功", body = ApiResponse<Workflow>),
        (status = 404, description = "工作流不存在"),
        (status = 500, description = "部署失败"),
    ),
)]
pub async fn deploy_workflow(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Workflow>> {
    let workflow = match sqlx::query_as::<_, Workflow>(
        "UPDATE core_workflows SET status = 'deployed', updated_at = NOW() 
         WHERE id = $1 
         RETURNING id, name, description, definition, status, version, created_by, created_at, updated_at, published_at",
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                return Json(api_error(404, "工作流不存在"));
            }
            tracing::error!("部署工作流失败: {}", e);
            return Json(api_error(500, "部署工作流失败"));
        }
    };

    Json(ApiResponse::success(workflow, "部署成功"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["unified-core:flow:workflow:admin"])),
    path = "/api/core/flow/workflows/{workflow_id}/rollback",
    tag = "Flow-Workflow",
    params(
        ("workflow_id" = Uuid, Path, description = "工作流ID"),
    ),
    responses(
        (status = 200, description = "回滚成功", body = ApiResponse<Workflow>),
        (status = 404, description = "工作流不存在"),
        (status = 500, description = "回滚失败"),
    ),
)]
pub async fn rollback_workflow(
    State(state): State<AppState>,
    Path(workflow_id): Path<Uuid>,
) -> Json<ApiResponse<Workflow>> {
    let workflow = match sqlx::query_as::<_, Workflow>(
        "UPDATE core_workflows SET status = 'draft', updated_at = NOW() 
         WHERE id = $1 
         RETURNING id, name, description, definition, status, version, created_by, created_at, updated_at, published_at",
    )
    .bind(workflow_id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                return Json(api_error(404, "工作流不存在"));
            }
            tracing::error!("回滚工作流失败: {}", e);
            return Json(api_error(500, "回滚工作流失败"));
        }
    };

    Json(ApiResponse::success(workflow, "回滚成功"))
}

#[derive(Debug, Deserialize)]
pub struct CreateWorkflowVersionRequest {
    pub version: String,
    pub definition: Option<serde_json::Value>,
    pub change_description: Option<String>,
    pub created_by: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["unified-core:flow:workflow:read"])),
    path = "/api/core/flow/workflows/{workflow_id}/versions",
    tag = "Flow-Workflow",
    params(
        ("workflow_id" = Uuid, Path, description = "工作流ID"),
    ),
    responses(
        (status = 200, description = "版本列表", body = ApiResponse<Vec<WorkflowVersion>>),
        (status = 500, description = "查询失败"),
    ),
)]
pub async fn list_workflow_versions(
    State(state): State<AppState>,
    Path(workflow_id): Path<Uuid>,
) -> Json<ApiResponse<Vec<WorkflowVersion>>> {
    let versions = sqlx::query_as::<_, WorkflowVersion>(
        "SELECT id, workflow_id, version, definition, change_description, created_by, isactive, created_at
         FROM core_workflow_versions
         WHERE workflow_id = $1 AND deleted_at IS NULL
         ORDER BY created_at DESC",
    )
    .bind(workflow_id)
    .fetch_all(&state.pool)
    .await;

    match versions {
        Ok(v) => Json(ApiResponse::success(v, "查询成功")),
        Err(e) => {
            tracing::error!("查询工作流版本失败: {}", e);
            Json(api_error(500, "查询工作流版本失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["unified-core:flow:workflow:write"])),
    path = "/api/core/flow/workflows/{workflow_id}/versions",
    tag = "Flow-Workflow",
    params(
        ("workflow_id" = Uuid, Path, description = "工作流ID"),
    ),
    request_body = CreateWorkflowVersionRequest,
    responses(
        (status = 200, description = "创建版本成功", body = ApiResponse<WorkflowVersion>),
        (status = 404, description = "工作流不存在"),
        (status = 500, description = "创建失败"),
    ),
)]
pub async fn create_workflow_version(
    State(state): State<AppState>,
    Path(workflow_id): Path<Uuid>,
    Json(payload): Json<CreateWorkflowVersionRequest>,
) -> Json<ApiResponse<WorkflowVersion>> {
    // definition 未传时从当前工作流快照
    let definition = match payload.definition {
        Some(d) => d,
        None => match sqlx::query_scalar::<_, serde_json::Value>(
            "SELECT definition FROM core_workflows WHERE id = $1 AND deleted_at IS NULL",
        )
        .bind(workflow_id)
        .fetch_optional(&state.pool)
        .await
        {
            Ok(Some(d)) => d,
            Ok(None) => return Json(api_error(404, "工作流不存在")),
            Err(e) => {
                tracing::error!("读取工作流快照失败: {}", e);
                return Json(api_error(500, "创建工作流版本失败"));
            }
        },
    };

    let version = sqlx::query_as::<_, WorkflowVersion>(
        "INSERT INTO core_workflow_versions
         (workflow_id, version, definition, change_description, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, workflow_id, version, definition, change_description, created_by, isactive, created_at",
    )
    .bind(workflow_id)
    .bind(&payload.version)
    .bind(definition)
    .bind(&payload.change_description)
    .bind(payload.created_by.as_deref().unwrap_or("system"))
    .fetch_one(&state.pool)
    .await;

    match version {
        Ok(v) => Json(ApiResponse::success(v, "创建版本成功")),
        Err(e) => {
            tracing::error!("创建工作流版本失败: {}", e);
            Json(api_error(500, "创建工作流版本失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["unified-core:flow:workflow:read"])),
    path = "/api/core/flow/workflows/{workflow_id}/versions/{version_id}",
    tag = "Flow-Workflow",
    params(
        ("workflow_id" = Uuid, Path, description = "工作流ID"),
        ("version_id" = Uuid, Path, description = "版本ID"),
    ),
    responses(
        (status = 200, description = "版本详情", body = ApiResponse<WorkflowVersion>),
        (status = 404, description = "版本不存在"),
        (status = 500, description = "查询失败"),
    ),
)]
pub async fn get_workflow_version(
    State(state): State<AppState>,
    Path((workflow_id, version_id)): Path<(Uuid, Uuid)>,
) -> Json<ApiResponse<WorkflowVersion>> {
    let version = sqlx::query_as::<_, WorkflowVersion>(
        "SELECT id, workflow_id, version, definition, change_description, created_by, isactive, created_at
         FROM core_workflow_versions
         WHERE workflow_id = $1 AND id = $2 AND deleted_at IS NULL",
    )
    .bind(workflow_id)
    .bind(version_id)
    .fetch_one(&state.pool)
    .await;

    match version {
        Ok(v) => Json(ApiResponse::success(v, "查询成功")),
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                return Json(api_error(404, "工作流版本不存在"));
            }
            tracing::error!("查询工作流版本失败: {}", e);
            Json(api_error(500, "查询工作流版本失败"))
        }
    }
}

/// 激活工作流版本（同工作流其他版本置为非激活）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["unified-core:flow:workflow:write"])),
    path = "/api/core/flow/workflows/{workflow_id}/versions/{version_id}/activate",
    tag = "Flow-Workflow",
    params(
        ("workflow_id" = Uuid, Path, description = "工作流ID"),
        ("version_id" = Uuid, Path, description = "版本ID"),
    ),
    responses(
        (status = 200, description = "激活成功", body = ApiResponse<WorkflowVersion>),
        (status = 404, description = "版本不存在"),
        (status = 500, description = "激活失败"),
    ),
)]
pub async fn activate_workflow_version(
    State(state): State<AppState>,
    Path((workflow_id, version_id)): Path<(Uuid, Uuid)>,
) -> Json<ApiResponse<WorkflowVersion>> {
    let mut tx = match state.pool.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!("激活版本开启事务失败: {}", e);
            return Json(api_error(500, "激活工作流版本失败"));
        }
    };

    // 1. 校验版本存在且属于该工作流
    let exists = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM core_workflow_versions
         WHERE id = $1 AND workflow_id = $2 AND deleted_at IS NULL)",
    )
    .bind(version_id)
    .bind(workflow_id)
    .fetch_one(&mut *tx)
    .await;

    match exists {
        Ok(true) => {}
        Ok(false) => {
            return Json(api_error(404, "工作流版本不存在"));
        }
        Err(e) => {
            tracing::error!("校验版本失败: {}", e);
            return Json(api_error(500, "激活工作流版本失败"));
        }
    }

    // 2. 同工作流其他版本置为非激活
    if let Err(e) = sqlx::query("UPDATE core_workflow_versions SET isactive = FALSE WHERE workflow_id = $1")
        .bind(workflow_id)
        .execute(&mut *tx)
        .await
    {
        tracing::error!("去激活其他版本失败: {}", e);
        return Json(api_error(500, "激活工作流版本失败"));
    }

    // 3. 激活目标版本
    let version = sqlx::query_as::<_, WorkflowVersion>(
        "UPDATE core_workflow_versions SET isactive = TRUE
         WHERE id = $1 AND workflow_id = $2 AND deleted_at IS NULL
         RETURNING id, workflow_id, version, definition, change_description, created_by, isactive, created_at",
    )
    .bind(version_id)
    .bind(workflow_id)
    .fetch_one(&mut *tx)
    .await;

    match version {
        Ok(v) => {
            if let Err(e) = tx.commit().await {
                tracing::error!("提交激活版本事务失败: {}", e);
                return Json(api_error(500, "激活工作流版本失败"));
            }
            Json(ApiResponse::success(v, "版本激活成功"))
        }
        Err(e) => {
            tracing::error!("激活工作流版本失败: {}", e);
            Json(api_error(500, "激活工作流版本失败"))
        }
    }
}

/// 删除工作流版本（软删除）
#[utoipa::path(
    delete,
    security(("BearerAuth" = ["unified-core:flow:workflow:write"])),
    path = "/api/core/flow/workflows/{workflow_id}/versions/{version_id}",
    tag = "Flow-Workflow",
    params(
        ("workflow_id" = Uuid, Path, description = "工作流ID"),
        ("version_id" = Uuid, Path, description = "版本ID"),
    ),
    responses(
        (status = 200, description = "删除成功"),
        (status = 404, description = "版本不存在"),
        (status = 500, description = "删除失败"),
    ),
)]
pub async fn delete_workflow_version(
    State(state): State<AppState>,
    Path((workflow_id, version_id)): Path<(Uuid, Uuid)>,
) -> Json<ApiResponse<serde_json::Value>> {
    let result = sqlx::query(
        "UPDATE core_workflow_versions SET deleted_at = NOW()
         WHERE id = $1 AND workflow_id = $2 AND deleted_at IS NULL",
    )
    .bind(version_id)
    .bind(workflow_id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(r) if r.rows_affected() == 0 => Json(api_error(404, "工作流版本不存在")),
        Ok(_) => Json(ApiResponse::success(
            serde_json::json!({ "deleted": true, "version_id": version_id }),
            "版本删除成功",
        )),
        Err(e) => {
            tracing::error!("删除工作流版本失败: {}", e);
            Json(api_error(500, "删除工作流版本失败"))
        }
    }
}
