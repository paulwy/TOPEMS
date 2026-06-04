use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::models::{Permission, Role};
use crate::db::RepositoryError;
use crate::api::ApiResponse;

// ============ 请求/响应模型 ============

#[derive(Debug, Deserialize)]
pub struct ListPermissionsQuery {
    pub page: Option<u32>,
    pub page_size: Option<u32>,
    pub resource: Option<String>,
    pub action: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreatePermissionRequest {
    pub name: String,
    pub resource: String,
    pub action: String,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePermissionRequest {
    pub name: Option<String>,
    pub resource: Option<String>,
    pub action: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PermissionResponse {
    pub id: String,
    pub name: String,
    pub resource: String,
    pub action: String,
    pub description: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ListPermissionsResponse {
    pub permissions: Vec<PermissionResponse>,
    pub total: u64,
    pub page: u32,
    pub page_size: u32,
}

// ============ Handler 实现 ============

pub async fn list_permissions(
    State(state): State<crate::AppState>,
    Query(params): Query<ListPermissionsQuery>,
) -> Result<Json<ApiResponse<ListPermissionsResponse>>, impl IntoResponse> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, Permission>(
        r#"
        SELECT id, name, resource, action, description
        FROM iam.permissions
        WHERE ($1::text IS NULL OR resource = $1)
          AND ($2::text IS NULL OR action = $2)
        ORDER BY resource, action
        LIMIT $3 OFFSET $4
        "#
    )
    .bind(&params.resource)
    .bind(&params.action)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(permissions) => {
            let total = permissions.len() as u64;
            let perm_responses: Vec<PermissionResponse> = permissions
                .into_iter()
                .map(|p| PermissionResponse {
                    id: p.id.to_string(),
                    name: p.name,
                    resource: p.resource,
                    action: p.action,
                    description: p.description,
                })
                .collect();

            Ok(Json(ApiResponse::success(
                ListPermissionsResponse {
                    permissions: perm_responses,
                    total,
                    page,
                    page_size,
                },
                "获取权限列表成功",
            )))
        }
        Err(e) => {
            tracing::error!("查询权限列表失败: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::<()>::error(500, "服务器内部错误")),
            ))
        }
    }
}

pub async fn create_permission(
    State(state): State<crate::AppState>,
    Json(req): Json<CreatePermissionRequest>,
) -> Result<Json<ApiResponse<PermissionResponse>>, impl IntoResponse> {
    let permission = Permission {
        id: Uuid::new_v4(),
        name: req.name.clone(),
        resource: req.resource.clone(),
        action: req.action.clone(),
        description: req.description.clone(),
    };

    let result = sqlx::query_as::<_, Permission>(
        r#"
        INSERT INTO iam.permissions (id, name, resource, action, description)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, name, resource, action, description
        "#
    )
    .bind(permission.id)
    .bind(&permission.name)
    .bind(&permission.resource)
    .bind(&permission.action)
    .bind(&permission.description)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(created) => {
            tracing::info!("创建权限成功: {}", created.name);
            Ok(Json(ApiResponse::success(
                PermissionResponse {
                    id: created.id.to_string(),
                    name: created.name,
                    resource: created.resource,
                    action: created.action,
                    description: created.description,
                },
                "创建权限成功",
            )))
        }
        Err(e) => {
            tracing::error!("创建权限失败: {}", e);
            if e.to_string().contains("duplicate") || e.to_string().contains("already exists") {
                Err((
                    StatusCode::CONFLICT,
                    Json(ApiResponse::<()>::error(409, "权限名称已存在")),
                ))
            } else {
                Err((
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ApiResponse::<()>::error(500, "服务器内部错误")),
                ))
            }
        }
    }
}

pub async fn get_permission(
    State(state): State<crate::AppState>,
    Path(permission_id): Path<String>,
) -> Result<Json<ApiResponse<PermissionResponse>>, impl IntoResponse> {
    let result = sqlx::query_as::<_, Permission>(
        "SELECT id, name, resource, action, description FROM iam.permissions WHERE id = $1"
    )
    .bind(&permission_id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(permission)) => Ok(Json(ApiResponse::success(
            PermissionResponse {
                id: permission.id.to_string(),
                name: permission.name,
                resource: permission.resource,
                action: permission.action,
                description: permission.description,
            },
            "获取权限成功",
        ))),
        Ok(None) => Err((
            StatusCode::NOT_FOUND,
            Json(ApiResponse::<()>::error(404, "权限不存在")),
        )),
        Err(e) => {
            tracing::error!("查询权限失败: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::<()>::error(500, "服务器内部错误")),
            ))
        }
    }
}

pub async fn update_permission(
    State(state): State<crate::AppState>,
    Path(permission_id): Path<String>,
    Json(req): Json<UpdatePermissionRequest>,
) -> Result<Json<ApiResponse<PermissionResponse>>, impl IntoResponse> {
    // 先查询权限是否存在
    let existing = sqlx::query_as::<_, Permission>(
        "SELECT id, name, resource, action, description FROM iam.permissions WHERE id = $1"
    )
    .bind(&permission_id)
    .fetch_optional(&state.db)
    .await;

    let existing_permission = match existing {
        Ok(Some(p)) => p,
        Ok(None) => {
            return Err((
                StatusCode::NOT_FOUND,
                Json(ApiResponse::<()>::error(404, "权限不存在")),
            ))
        }
        Err(e) => {
            tracing::error!("查询权限失败: {}", e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::<()>::error(500, "服务器内部错误")),
            ));
        }
    };

    let name = req.name.unwrap_or(existing_permission.name);
    let resource = req.resource.unwrap_or(existing_permission.resource);
    let action = req.action.unwrap_or(existing_permission.action);
    let description = req.description.or(existing_permission.description);

    let result = sqlx::query_as::<_, Permission>(
        r#"
        UPDATE iam.permissions
        SET name = $2, resource = $3, action = $4, description = $5
        WHERE id = $1
        RETURNING id, name, resource, action, description
        "#
    )
    .bind(&permission_id)
    .bind(&name)
    .bind(&resource)
    .bind(&action)
    .bind(&description)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(updated) => {
            tracing::info!("更新权限成功: {}", updated.name);
            Ok(Json(ApiResponse::success(
                PermissionResponse {
                    id: updated.id.to_string(),
                    name: updated.name,
                    resource: updated.resource,
                    action: updated.action,
                    description: updated.description,
                },
                "更新权限成功",
            )))
        }
        Err(e) => {
            tracing::error!("更新权限失败: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::<()>::error(500, "服务器内部错误")),
            ))
        }
    }
}

pub async fn delete_permission(
    State(state): State<crate::AppState>,
    Path(permission_id): Path<String>,
) -> Result<Json<ApiResponse<String>>, impl IntoResponse> {
    let result = sqlx::query("DELETE FROM iam.permissions WHERE id = $1")
        .bind(&permission_id)
        .execute(&state.db)
        .await;

    match result {
        Ok(res) => {
            if res.rows_affected() > 0 {
                tracing::info!("删除权限成功: {}", permission_id);
                Ok(Json(ApiResponse::success(String::new(), "删除权限成功")))
            } else {
                Err((
                    StatusCode::NOT_FOUND,
                    Json(ApiResponse::<()>::error(404, "权限不存在")),
                ))
            }
        }
        Err(e) => {
            tracing::error!("删除权限失败: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::<()>::error(500, "服务器内部错误")),
            ))
        }
    }
}
