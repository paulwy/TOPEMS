use crate::AppState;
use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::Deserialize;
use uuid::Uuid;

use topems_shared::ApiResponse;
use topems_shared_core::response::{api_error, PaginatedResponse};

use super::models::{CreateWorkflowRequest, UpdateWorkflowRequest, Workflow};

#[derive(Debug, Deserialize)]
pub struct WorkflowQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

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
