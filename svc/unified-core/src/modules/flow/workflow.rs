use crate::AppState;
use axum::{
    extract::{Extension, Path, Query, State},
    Json,
};
use serde::Deserialize;
use topems_shared_core::TopemsError;
use utoipa::ToSchema;
use uuid::Uuid;

use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_core::response::ApiResponse;
use topems_shared_core::response::PaginatedResponse;

use super::models::{CreateWorkflowRequest, UpdateWorkflowRequest, Workflow, WorkflowVersion};
use super::workflow_status::WorkflowStatus;

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
    Extension(txn_arc): Extension<RlsTxnCell>,
    Query(params): Query<WorkflowQueryParams>,
) -> ApiResponse<PaginatedResponse<Workflow>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化工作流列表事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化工作流列表事务作用域失败".to_string(),
            ));
        }
    };
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search = params.search.clone().unwrap_or_default();
    let status = match params.status.as_deref() {
        None | Some("") | Some("all") => None,
        Some(raw) => match WorkflowStatus::from_db_str(raw) {
            Some(status) => Some(status.as_db_str()),
            None => {
                return ApiResponse::from(TopemsError::ValidationFailed(
                    "无效的工作流状态".to_string(),
                ))
            }
        },
    };

    let has_filters = !search.is_empty() || status.is_some();

    let total: i64 = if !has_filters {
        match sqlx::query_scalar(
            "SELECT COUNT(*) FROM public.core_workflows WHERE deleted_at IS NULL",
        )
        .fetch_one(&mut scope)
        .await
        {
            Ok(v) => v,
            Err(e) => {
                tracing::error!("查询工作流总数失败: {}", e);
                return ApiResponse::from(TopemsError::Internal("查询工作流总数失败".to_string()));
            }
        }
    } else {
        match sqlx::query_scalar(
            r#"SELECT COUNT(*) FROM public.core_workflows 
               WHERE deleted_at IS NULL AND (name ILIKE $1 OR description ILIKE $1 OR $1 = '')
                 AND (status = $2 OR $2 = '')"#,
        )
        .bind(format!("%{}%", search.clone()))
        .bind(status.unwrap_or_default())
        .fetch_one(&mut scope)
        .await
        {
            Ok(v) => v,
            Err(e) => {
                tracing::error!("查询工作流总数失败: {}", e);
                return ApiResponse::from(TopemsError::Internal("查询工作流总数失败".to_string()));
            }
        }
    };

    let items: Vec<Workflow> = if !has_filters {
        match sqlx::query_as::<_, Workflow>(
            "SELECT id, tenant_id, name, code, description, definition, status, version, created_by, created_at, updated_at, published_at FROM public.core_workflows ORDER BY created_at DESC LIMIT $1 OFFSET $2"
        )
        .bind(page_size)
        .bind(offset)
        .fetch_all(&mut scope)
        .await
        {
            Ok(v) => v,
            Err(e) => {
                tracing::error!("查询工作流列表失败: {}", e);
                return ApiResponse::from(TopemsError::Internal("查询工作流列表失败".to_string()));
            }
        }
    } else {
        match sqlx::query_as::<_, Workflow>(
            r#"SELECT id, tenant_id, name, code, description, definition, status, version, created_by, created_at, updated_at, published_at 
               FROM public.core_workflows 
               WHERE (name ILIKE $1 OR description ILIKE $1 OR $1 = '')
                 AND (status = $2 OR $2 = '')
               ORDER BY created_at DESC LIMIT $3 OFFSET $4"#
        )
        .bind(format!("%{}%", search.clone()))
        .bind(status.unwrap_or_default())
        .bind(page_size)
        .bind(offset)
        .fetch_all(&mut scope)
        .await
        {
            Ok(v) => v,
            Err(e) => {
                tracing::error!("查询工作流列表失败: {}", e);
                return ApiResponse::from(TopemsError::Internal("查询工作流列表失败".to_string()));
            }
        }
    };

    ApiResponse::success(
        PaginatedResponse::new(items, total, page, page_size),
        "查询成功",
    )
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
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<Workflow> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化工作流详情事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化工作流详情事务作用域失败".to_string(),
            ));
        }
    };
    let workflow = match sqlx::query_as::<_, Workflow>(
        "SELECT id, tenant_id, name, code, description, definition, status, version, created_by, created_at, updated_at, published_at FROM public.core_workflows WHERE deleted_at IS NULL AND id = $1",
    )
    .bind(id)
    .fetch_one(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                return ApiResponse::from(TopemsError::ResourceNotFound("工作流不存在".to_string()));
            }
            tracing::error!("查询工作流失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("查询工作流失败".to_string()));
        }
    };

    ApiResponse::success(workflow, "查询成功")
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
#[allow(clippy::unwrap_used)]
pub async fn create_workflow(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(payload): Json<CreateWorkflowRequest>,
) -> ApiResponse<Workflow> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化创建工作流事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("创建工作流失败".to_string()));
        }
    };
    // 租户绑定对齐 nil 上下文惯例（与本文件其余写路径一致）：
    // 超管/无 claims → None（SQL NULL，命中 tenant_id IS NULL 分支）；普通用户 → Some(claims.tenant_id)。
    let tenant_opt: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| Uuid::parse_str(t).ok())
    };
    let create_status = match payload.status.as_deref() {
        None | Some("") => WorkflowStatus::DEFAULT,
        Some(raw) => match WorkflowStatus::from_db_str(raw) {
            Some(status) => status,
            None => {
                return ApiResponse::from(TopemsError::ValidationFailed(
                    "无效的工作流状态".to_string(),
                ))
            }
        },
    };
    let workflow = match sqlx::query_as::<_, Workflow>(
        "INSERT INTO public.core_workflows (name, code, description, definition, status, version, created_by, tenant_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
         RETURNING id, tenant_id, name, code, description, definition, status, version, created_by, created_at, updated_at, published_at",
    )
    .bind(payload.name)
    .bind(None::<String>)
    .bind(payload.description)
    .bind(payload.definition.unwrap_or(serde_json::json!({})))
    .bind(create_status.as_db_str())
    .bind(1)
    .bind(payload.created_by.or_else(|| Uuid::parse_str(&claims.sub).ok()))
    .bind(tenant_opt)
    .fetch_one(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("创建工作流失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("创建工作流失败".to_string()));
        }
    };

    ApiResponse::success(workflow, "创建成功")
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
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateWorkflowRequest>,
) -> ApiResponse<Workflow> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化更新工作流事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("更新工作流失败".to_string()));
        }
    };
    let update_status = match payload.status.as_deref() {
        None | Some("") => None,
        Some(raw) => match WorkflowStatus::from_db_str(raw) {
            Some(status) => Some(status.as_db_str()),
            None => {
                return ApiResponse::from(TopemsError::ValidationFailed(
                    "无效的工作流状态".to_string(),
                ))
            }
        },
    };
    let workflow = match sqlx::query_as::<_, Workflow>(
        "UPDATE public.core_workflows SET 
         name = COALESCE($1, name), 
         description = COALESCE($2, description), 
         definition = COALESCE($3, definition), 
         status = COALESCE($4, status),
         updated_at = NOW()
         WHERE id = $5
         RETURNING id, tenant_id, name, code, description, definition, status, version, created_by, created_at, updated_at, published_at",
    )
    .bind(payload.name)
    .bind(payload.description)
    .bind(payload.definition)
    .bind(update_status)
    .bind(id)
    .fetch_one(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                return ApiResponse::from(TopemsError::ResourceNotFound("工作流不存在".to_string()));
            }
            tracing::error!("更新工作流失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("更新工作流失败".to_string()));
        }
    };

    ApiResponse::success(workflow, "更新成功")
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
        (status = 200, description = "删除成功"),
        (status = 404, description = "工作流不存在"),
        (status = 500, description = "删除失败"),
    ),
)]
pub async fn delete_workflow(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<()> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化删除工作流事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("删除工作流失败".to_string()));
        }
    };
    let result = sqlx::query("UPDATE public.core_workflows SET deleted_at = NOW() WHERE id = $1")
        .bind(id)
        .execute(&mut scope)
        .await;

    match result {
        Ok(v) => {
            if v.rows_affected() == 0 {
                ApiResponse::from(TopemsError::ResourceNotFound("工作流不存在".to_string()))
            } else {
                ApiResponse::success_no_data("删除成功")
            }
        }
        Err(e) => {
            tracing::error!("删除工作流失败: {}", e);
            ApiResponse::from(TopemsError::Internal("删除工作流失败".to_string()))
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
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<Workflow> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化发布工作流事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("发布工作流失败".to_string()));
        }
    };
    let workflow = match sqlx::query_as::<_, Workflow>(
        "UPDATE public.core_workflows SET status = $2, published_at = NOW(), updated_at = NOW() 
         WHERE id = $1 
         RETURNING id, tenant_id, name, code, description, definition, status, version, created_by, created_at, updated_at, published_at",
    )
    .bind(id)
    .bind(WorkflowStatus::Published.as_db_str())
    .fetch_one(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                return ApiResponse::from(TopemsError::ResourceNotFound("工作流不存在".to_string()));
            }
            tracing::error!("发布工作流失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("发布工作流失败".to_string()));
        }
    };

    ApiResponse::success(workflow, "发布成功")
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
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<Workflow> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化取消发布事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("取消发布工作流失败".to_string()));
        }
    };
    let workflow = match sqlx::query_as::<_, Workflow>(
        "UPDATE public.core_workflows SET status = $2, published_at = NULL, updated_at = NOW() 
         WHERE id = $1 
         RETURNING id, tenant_id, name, code, description, definition, status, version, created_by, created_at, updated_at, published_at",
    )
    .bind(id)
    .bind(WorkflowStatus::Draft.as_db_str())
    .fetch_one(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                return ApiResponse::from(TopemsError::ResourceNotFound("工作流不存在".to_string()));
            }
            tracing::error!("取消发布工作流失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("取消发布工作流失败".to_string()));
        }
    };

    ApiResponse::success(workflow, "取消发布成功")
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
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<Workflow> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化激活工作流事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("激活工作流失败".to_string()));
        }
    };
    let workflow = match sqlx::query_as::<_, Workflow>(
        "UPDATE public.core_workflows SET status = $2, updated_at = NOW() 
         WHERE id = $1 
         RETURNING id, tenant_id, name, code, description, definition, status, version, created_by, created_at, updated_at, published_at",
    )
    .bind(id)
    .bind(WorkflowStatus::Active.as_db_str())
    .fetch_one(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                return ApiResponse::from(TopemsError::ResourceNotFound("工作流不存在".to_string()));
            }
            tracing::error!("激活工作流失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("激活工作流失败".to_string()));
        }
    };

    ApiResponse::success(workflow, "激活成功")
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
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<Workflow> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化停用工作流事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("停用工作流失败".to_string()));
        }
    };
    let workflow = match sqlx::query_as::<_, Workflow>(
        "UPDATE public.core_workflows SET status = $2, updated_at = NOW() 
         WHERE id = $1 
         RETURNING id, tenant_id, name, code, description, definition, status, version, created_by, created_at, updated_at, published_at",
    )
    .bind(id)
    .bind(WorkflowStatus::Inactive.as_db_str())
    .fetch_one(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                return ApiResponse::from(TopemsError::ResourceNotFound("工作流不存在".to_string()));
            }
            tracing::error!("停用工作流失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("停用工作流失败".to_string()));
        }
    };

    ApiResponse::success(workflow, "停用成功")
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
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(id): Path<Uuid>,
) -> ApiResponse<Workflow> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化部署工作流事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("部署工作流失败".to_string()));
        }
    };
    let workflow = match sqlx::query_as::<_, Workflow>(
        "UPDATE public.core_workflows SET status = $2, updated_at = NOW() 
         WHERE id = $1 
         RETURNING id, tenant_id, name, code, description, definition, status, version, created_by, created_at, updated_at, published_at",
    )
    .bind(id)
    .bind(WorkflowStatus::Deployed.as_db_str())
    .fetch_one(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                return ApiResponse::from(TopemsError::ResourceNotFound("工作流不存在".to_string()));
            }
            tracing::error!("部署工作流失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("部署工作流失败".to_string()));
        }
    };

    ApiResponse::success(workflow, "部署成功")
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["unified-core:flow:workflow:admin"])),
    path = "/api/core/flow/workflows/{workflow_id}/rollback",
    tag = "Flow-Workflow",
    params(
        ("workflow_id" = Uuid, Path, description = "工作流ID"),
    ),
    request_body = RollbackWorkflowRequest,
    responses(
        (status = 200, description = "回滚成功", body = ApiResponse<Workflow>),
        (status = 400, description = "版本号格式非法"),
        (status = 404, description = "工作流或目标版本不存在"),
        (status = 500, description = "回滚失败"),
    ),
)]
pub async fn rollback_workflow(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(workflow_id): Path<Uuid>,
    Json(payload): Json<RollbackWorkflowRequest>,
) -> ApiResponse<Workflow> {
    let to_version: i32 = match payload.to_version.trim().parse::<i32>() {
        Ok(v) => v,
        Err(_) => {
            return ApiResponse::from(TopemsError::ValidationFailed("无效的版本号".to_string()))
        }
    };
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化回滚事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("回滚失败".to_string()));
        }
    };
    // 1) 取目标版本 definition（to_version 可能命中多行，取最新一条）
    let target_definition = match sqlx::query_as::<_, (serde_json::Value,)>(
        "SELECT definition FROM public.core_workflow_versions
         WHERE workflow_id = $1 AND version = $2 AND deleted_at IS NULL
         AND EXISTS (SELECT 1 FROM public.core_workflows cw WHERE cw.id = public.core_workflow_versions.workflow_id AND cw.deleted_at IS NULL) 
         ORDER BY created_at DESC LIMIT 1",
    )
    .bind(workflow_id)
    .bind(to_version)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(Some(t)) => t.0,
        Ok(None) => return ApiResponse::from(TopemsError::ResourceNotFound("目标版本不存在".to_string())),
        Err(e) => {
            tracing::error!("回滚查询目标版本失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("回滚失败".to_string()));
        }
    };

    // 2) 用目标版本定义覆盖工作流当前定义（主表 version 为整型计数，保持不动）
    let workflow = match sqlx::query_as::<_, Workflow>(
        "UPDATE public.core_workflows SET definition = $2, updated_at = NOW()
         WHERE id = $1
         RETURNING id, tenant_id, name, code, description, definition, status, version, created_by, created_at, updated_at, published_at",
    )
    .bind(workflow_id)
    .bind(&target_definition)
    .fetch_one(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                return ApiResponse::from(TopemsError::ResourceNotFound("工作流不存在".to_string()));
            }
            tracing::error!("回滚工作流失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("回滚工作流失败".to_string()));
        }
    };

    // 3) 版本表激活状态：仅最新一条目标版本激活，其余全部置 false（唯一激活）
    match sqlx::query(
        "UPDATE public.core_workflow_versions SET isactive = (id = (
            SELECT id FROM public.core_workflow_versions
            WHERE workflow_id = $1 AND version = $2 AND deleted_at IS NULL
            ORDER BY created_at DESC LIMIT 1
         ))
         WHERE workflow_id = $1 AND deleted_at IS NULL
         AND EXISTS (SELECT 1 FROM public.core_workflows cw WHERE cw.id = public.core_workflow_versions.workflow_id AND cw.deleted_at IS NULL) ",
    )
    .bind(workflow_id)
    .bind(to_version)
    .execute(&mut scope)
    .await
    {
        Ok(_) => {}
        Err(e) => {
            tracing::error!("回滚切换版本激活状态失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("回滚失败".to_string()));
        }
    }

    ApiResponse::success(workflow, "回滚成功")
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct RollbackWorkflowRequest {
    pub to_version: String,
    pub reason: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
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
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(workflow_id): Path<Uuid>,
) -> ApiResponse<Vec<WorkflowVersion>> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化工作流版本列表事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化工作流版本列表事务作用域失败".to_string(),
            ));
        }
    };
    let versions = sqlx::query_as::<_, WorkflowVersion>(
        // public.core_workflow_versions.version 为 integer、created_by 为 uuid，
        // 而 WorkflowVersion 模型二者均为 String，显式 ::text 对齐解码（API 仍输出字符串）
        "SELECT id, workflow_id, version::text, definition, change_description, created_by::text, isactive, created_at
         FROM public.core_workflow_versions
         WHERE workflow_id = $1 AND deleted_at IS NULL
         AND EXISTS (SELECT 1 FROM public.core_workflows cw WHERE cw.id = public.core_workflow_versions.workflow_id AND cw.deleted_at IS NULL)
         ORDER BY created_at DESC",
    )
    .bind(workflow_id)
    .fetch_all(&mut scope)
    .await;

    match versions {
        Ok(v) => ApiResponse::success(v, "查询成功"),
        Err(e) => {
            tracing::error!("查询工作流版本失败: {}", e);
            ApiResponse::from(TopemsError::Internal("查询工作流版本失败".to_string()))
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
        (status = 400, description = "版本号或创建人格式非法"),
        (status = 404, description = "工作流不存在"),
        (status = 500, description = "创建失败"),
    ),
)]
#[allow(clippy::unwrap_used)]
pub async fn create_workflow_version(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(workflow_id): Path<Uuid>,
    Json(payload): Json<CreateWorkflowVersionRequest>,
) -> ApiResponse<WorkflowVersion> {
    let version_no: i32 = match payload.version.trim().parse::<i32>() {
        Ok(v) => v,
        Err(_) => {
            return ApiResponse::from(TopemsError::ValidationFailed("无效的版本号".to_string()))
        }
    };
    let created_by: Option<Uuid> = match payload.created_by.as_deref() {
        Some(raw) => match Uuid::parse_str(raw) {
            Ok(id) => Some(id),
            Err(_) => {
                return ApiResponse::from(TopemsError::ValidationFailed(
                    "无效的创建人ID".to_string(),
                ))
            }
        },
        None => Uuid::parse_str(&claims.sub).ok(),
    };
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化创建工作流版本事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("创建工作流版本失败".to_string()));
        }
    };
    let tenant_opt: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| Uuid::parse_str(t).ok())
    };
    let wf_ok: bool = match sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM public.core_workflows WHERE id = $1 AND deleted_at IS NULL)",
    )
    .bind(workflow_id)
    .fetch_one(&mut scope)
    .await
    {
        Ok(b) => b,
        Err(e) => {
            tracing::error!("校验工作流失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("创建工作流版本失败".to_string()));
        }
    };
    if !wf_ok {
        return ApiResponse::from(TopemsError::ResourceNotFound("工作流不存在".to_string()));
    }
    // definition 未传时从当前工作流快照
    let definition = match payload.definition {
        Some(d) => d,
        None => match sqlx::query_scalar::<_, serde_json::Value>(
            "SELECT definition FROM public.core_workflows WHERE id = $1 AND deleted_at IS NULL",
        )
        .bind(workflow_id)
        .fetch_optional(&mut scope)
        .await
        {
            Ok(Some(d)) => d,
            Ok(None) => {
                return ApiResponse::from(TopemsError::ResourceNotFound("工作流不存在".to_string()))
            }
            Err(e) => {
                tracing::error!("读取工作流快照失败: {}", e);
                return ApiResponse::from(TopemsError::Internal("创建工作流版本失败".to_string()));
            }
        },
    };

    // 新版本创建后成为唯一激活版本：先将该工作流旧版本全部置为非激活
    match sqlx::query(
        "UPDATE public.core_workflow_versions SET isactive = FALSE WHERE workflow_id = $1 AND deleted_at IS NULL AND EXISTS (SELECT 1 FROM public.core_workflows cw WHERE cw.id = public.core_workflow_versions.workflow_id AND cw.deleted_at IS NULL) ",
    )
    .bind(workflow_id)
    .execute(&mut scope)
    .await
    {
        Ok(_) => {}
        Err(e) => {
            tracing::error!("创建版本前重置激活状态失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("创建版本失败".to_string()));
        }
    }

    let version = sqlx::query_as::<_, WorkflowVersion>(
        "INSERT INTO public.core_workflow_versions
         (workflow_id, version, definition, change_description, created_by, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, workflow_id, version::text, definition, change_description, created_by::text, isactive, created_at",
    )
    .bind(workflow_id)
    .bind(version_no)
    .bind(definition)
    .bind(&payload.change_description)
    .bind(created_by)
    .bind(tenant_opt)
    .fetch_one(&mut scope)
    .await;

    match version {
        Ok(v) => ApiResponse::success(v, "创建版本成功"),
        Err(e) => {
            tracing::error!("创建工作流版本失败: {}", e);
            ApiResponse::from(TopemsError::Internal("创建工作流版本失败".to_string()))
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
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path((workflow_id, version_id)): Path<(Uuid, Uuid)>,
) -> ApiResponse<WorkflowVersion> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化工作流版本详情事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化工作流版本详情事务作用域失败".to_string(),
            ));
        }
    };
    let version = sqlx::query_as::<_, WorkflowVersion>(
        // version integer / created_by uuid → 模型 String，显式 ::text 对齐解码
        "SELECT id, workflow_id, version::text, definition, change_description, created_by::text, isactive, created_at
         FROM public.core_workflow_versions
         WHERE workflow_id = $1 AND id = $2 AND deleted_at IS NULL
         AND EXISTS (SELECT 1 FROM public.core_workflows cw WHERE cw.id = public.core_workflow_versions.workflow_id AND cw.deleted_at IS NULL) ",
    )
    .bind(workflow_id)
    .bind(version_id)
    .fetch_one(&mut scope)
    .await;

    match version {
        Ok(v) => ApiResponse::success(v, "查询成功"),
        Err(e) => {
            if matches!(e, sqlx::Error::RowNotFound) {
                return ApiResponse::from(TopemsError::ResourceNotFound(
                    "工作流版本不存在".to_string(),
                ));
            }
            tracing::error!("查询工作流版本失败: {}", e);
            ApiResponse::from(TopemsError::Internal("查询工作流版本失败".to_string()))
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
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path((workflow_id, version_id)): Path<(Uuid, Uuid)>,
) -> ApiResponse<WorkflowVersion> {
    let mut guard = txn_arc.lock().await;
    let Some(tx) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(tx).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化激活版本事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("激活工作流版本失败".to_string()));
        }
    };

    // 1. 校验版本存在且属于该工作流
    let exists = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM public.core_workflow_versions
         WHERE id = $1 AND workflow_id = $2 AND deleted_at IS NULL
         AND EXISTS (SELECT 1 FROM public.core_workflows cw WHERE cw.id = public.core_workflow_versions.workflow_id AND cw.deleted_at IS NULL) )",
    )
    .bind(version_id)
    .bind(workflow_id)
    .fetch_one(&mut scope)
    .await;

    match exists {
        Ok(true) => {}
        Ok(false) => {
            return ApiResponse::from(TopemsError::ResourceNotFound(
                "工作流版本不存在".to_string(),
            ));
        }
        Err(e) => {
            tracing::error!("校验版本失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("激活工作流版本失败".to_string()));
        }
    }

    // 2. 同工作流其他版本置为非激活
    match sqlx::query("UPDATE public.core_workflow_versions SET isactive = FALSE WHERE workflow_id = $1 AND EXISTS (SELECT 1 FROM public.core_workflows cw WHERE cw.id = public.core_workflow_versions.workflow_id AND cw.deleted_at IS NULL) ")
        .bind(workflow_id)
        .execute(&mut scope)
        .await
    {
        Ok(_) => {}
        Err(e) => {
            tracing::error!("去激活其他版本失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("激活工作流版本失败".to_string()));
        }
    }

    // 3. 激活目标版本
    let version = sqlx::query_as::<_, WorkflowVersion>(
        "UPDATE public.core_workflow_versions SET isactive = TRUE
         WHERE id = $1 AND workflow_id = $2 AND deleted_at IS NULL
         AND EXISTS (SELECT 1 FROM public.core_workflows cw WHERE cw.id = public.core_workflow_versions.workflow_id AND cw.deleted_at IS NULL)
         RETURNING id, workflow_id, version::text, definition, change_description, created_by::text, isactive, created_at",
    )
    .bind(version_id)
    .bind(workflow_id)
    .fetch_one(&mut scope)
    .await;

    match version {
        Ok(v) => ApiResponse::success(v, "版本激活成功"),
        Err(e) => {
            tracing::error!("激活工作流版本失败: {}", e);
            ApiResponse::from(TopemsError::Internal("激活工作流版本失败".to_string()))
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
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path((workflow_id, version_id)): Path<(Uuid, Uuid)>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return ApiResponse::from(TopemsError::Internal("数据库事务上下文缺失".to_string()));
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化删除工作流版本事务作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal(
                "初始化删除工作流版本事务作用域失败".to_string(),
            ));
        }
    };
    let result = sqlx::query(
        "UPDATE public.core_workflow_versions SET deleted_at = NOW()
         WHERE id = $1 AND workflow_id = $2 AND deleted_at IS NULL
         AND EXISTS (SELECT 1 FROM public.core_workflows cw WHERE cw.id = public.core_workflow_versions.workflow_id AND cw.deleted_at IS NULL) ",
    )
    .bind(version_id)
    .bind(workflow_id)
    .execute(&mut scope)
    .await;

    match result {
        Ok(r) if r.rows_affected() == 0 => ApiResponse::from(TopemsError::ResourceNotFound(
            "工作流版本不存在".to_string(),
        )),
        Ok(_) => ApiResponse::success(
            serde_json::json!({ "deleted": true, "version_id": version_id }),
            "版本删除成功",
        ),
        Err(e) => {
            tracing::error!("删除工作流版本失败: {}", e);
            ApiResponse::from(TopemsError::Internal("删除工作流版本失败".to_string()))
        }
    }
}
