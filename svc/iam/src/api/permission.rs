#![allow(clippy::match_like_matches_macro)]
#![allow(clippy::manual_ok_err)]
#![allow(clippy::redundant_pattern_matching)]
#![allow(clippy::useless_format)]
#![allow(clippy::useless_vec)]
#![allow(clippy::clone_on_copy)]
#![allow(clippy::identity_op)]
#![allow(dead_code)]

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{delete, get, post, put},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::models::Permission;
use crate::AppState;
use topems_shared::ApiResponse;

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
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub category: String,
    pub module: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePermissionRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub category: Option<String>,
    pub module: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PermissionResponse {
    pub id: String,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub category: String,
    pub module: String,
}

#[derive(Debug, Serialize)]
pub struct ListPermissionsResponse {
    pub permissions: Vec<PermissionResponse>,
    pub total: u64,
    pub page: i64,
    pub page_size: i64,
}

// ============ Handler 实现 ============

pub async fn list_permissions(
    State(state): State<crate::AppState>,
    Query(params): Query<ListPermissionsQuery>,
) -> Result<Json<ApiResponse<ListPermissionsResponse>>, impl IntoResponse> {
    let page = params.page.unwrap_or(1).max(1) as i64;
    let page_size = params.page_size.unwrap_or(20).min(100) as i64;
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, Permission>(
        r#"
        SELECT id, code, name, description, category, module, created_at, updated_at
        FROM iam.permissions
        WHERE ($1::text IS NULL OR module = $1)
          AND ($2::text IS NULL OR code = $2)
        ORDER BY module, code
        LIMIT $3 OFFSET $4
        "#,
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
                    code: p.code,
                    name: p.name,
                    description: p.description,
                    category: p.category,
                    module: p.module,
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
    let now = chrono::Utc::now();
    let permission = Permission {
        id: Uuid::new_v4(),
        code: req.code.clone(),
        name: req.name.clone(),
        description: req.description.clone(),
        category: req.category.clone(),
        module: req.module.clone(),
        created_at: now,
        updated_at: now,
    };

    let result = sqlx::query_as::<_, Permission>(
        r#"
        INSERT INTO iam.permissions (id, code, name, description, category, module, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, code, name, description, category, module, created_at, updated_at
        "#
    )
    .bind(permission.id)
    .bind(&permission.code)
    .bind(&permission.name)
    .bind(&permission.description)
    .bind(&permission.category)
    .bind(&permission.module)
    .bind(permission.created_at)
    .bind(permission.updated_at)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(created) => {
            tracing::info!("创建权限成功: {}", created.name);
            Ok(Json(ApiResponse::success(
                PermissionResponse {
                    id: created.id.to_string(),
                    code: created.code,
                    name: created.name,
                    description: created.description,
                    category: created.category,
                    module: created.module,
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
        "SELECT id, code, name, description, category, module, created_at, updated_at FROM iam.permissions WHERE id = $1"
    )
    .bind(&permission_id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(permission)) => Ok(Json(ApiResponse::success(
            PermissionResponse {
                id: permission.id.to_string(),
                code: permission.code,
                name: permission.name,
                description: permission.description,
                category: permission.category,
                module: permission.module,
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
    let existing = sqlx::query_as::<_, Permission>(
        "SELECT id, code, name, description, category, module, created_at, updated_at FROM iam.permissions WHERE id = $1"
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
    let description = req.description.or(existing_permission.description);
    let category = req.category.unwrap_or(existing_permission.category);
    let module = req.module.unwrap_or(existing_permission.module);

    let result = sqlx::query_as::<_, Permission>(
        r#"
        UPDATE iam.permissions
        SET name = $2, description = $3, category = $4, module = $5, updated_at = $6
        WHERE id = $1
        RETURNING id, code, name, description, category, module, created_at, updated_at
        "#,
    )
    .bind(&permission_id)
    .bind(&name)
    .bind(&description)
    .bind(&category)
    .bind(&module)
    .bind(chrono::Utc::now())
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(updated) => {
            tracing::info!("更新权限成功: {}", updated.name);
            Ok(Json(ApiResponse::success(
                PermissionResponse {
                    id: updated.id.to_string(),
                    code: updated.code,
                    name: updated.name,
                    description: updated.description,
                    category: updated.category,
                    module: updated.module,
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

pub fn create_permission_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/api/v1/permissions", get(list_permissions))
        .route("/api/v1/permissions", post(create_permission))
        .route("/api/v1/permissions/{permission_id}", get(get_permission))
        .route(
            "/api/v1/permissions/{permission_id}",
            put(update_permission),
        )
        .route(
            "/api/v1/permissions/{permission_id}",
            delete(delete_permission),
        )
        .with_state(state)
}
