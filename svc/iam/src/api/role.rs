use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{delete, get, post, put},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::models::{Permission, Role};
use crate::AppState;
use topems_shared::ApiResponse;

// ============ 请求/响应模型 ============

#[derive(Debug, Deserialize)]
pub struct ListRolesQuery {
    pub page: Option<u32>,
    pub page_size: Option<u32>,
    pub name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateRoleRequest {
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateRoleRequest {
    pub name: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct RoleResponse {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
pub struct RoleDetailResponse {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: String,
    pub permissions: Vec<PermissionInfo>,
}

#[derive(Debug, Serialize)]
pub struct PermissionInfo {
    pub id: String,
    pub name: String,
    pub code: String,
    pub category: String,
    pub description: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ListRolesResponse {
    pub roles: Vec<RoleResponse>,
    pub total: u64,
    pub page: u32,
    pub page_size: u32,
}

#[derive(Debug, Deserialize)]
pub struct AssignPermissionsRequest {
    pub permission_ids: Vec<String>,
}

// ============ Handler 实现 ============

pub async fn list_roles(
    State(state): State<crate::AppState>,
    Query(params): Query<ListRolesQuery>,
) -> Result<Json<ApiResponse<ListRolesResponse>>, impl IntoResponse> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = ((page - 1) * page_size) as i64;

    let result = sqlx::query_as::<_, Role>(
        r#"
        SELECT id, code, name, description, is_system, is_active, created_at, updated_at
        FROM iam.roles
        WHERE ($1::text IS NULL OR name ILIKE '%' || $1 || '%')
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        "#
    )
    .bind(&params.name)
    .bind(page_size as i64)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(roles) => {
            let total = roles.len() as u64;
            let role_responses: Vec<RoleResponse> = roles
                .into_iter()
                .map(|r| RoleResponse {
                    id: r.id.to_string(),
                    name: r.name,
                    description: r.description,
                    created_at: r.created_at.to_rfc3339(),
                })
                .collect();

            Ok(Json(ApiResponse::success(
                ListRolesResponse {
                    roles: role_responses,
                    total,
                    page,
                    page_size,
                },
                "获取角色列表成功",
            )))
        }
        Err(e) => {
            tracing::error!("查询角色列表失败: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::<()>::error(500, "服务器内部错误")),
            ))
        }
    }
}

pub async fn create_role(
    State(state): State<crate::AppState>,
    Json(req): Json<CreateRoleRequest>,
) -> Result<Json<ApiResponse<RoleResponse>>, impl IntoResponse> {
    let now = chrono::Utc::now();
    let role = Role {
        id: Uuid::new_v4(),
        code: req.name.to_lowercase().replace(" ", "_"),
        name: req.name.clone(),
        description: req.description.clone(),
        is_system: false,
        is_active: true,
        created_at: now,
        updated_at: now,
    };

    let result = sqlx::query_as::<_, Role>(
        r#"
        INSERT INTO iam.roles (id, code, name, description, is_system, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, code, name, description, is_system, is_active, created_at, updated_at
        "#
    )
    .bind(role.id)
    .bind(&role.code)
    .bind(&role.name)
    .bind(&role.description)
    .bind(role.is_system)
    .bind(role.is_active)
    .bind(role.created_at)
    .bind(role.updated_at)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(created) => {
            tracing::info!("创建角色成功: {}", created.name);
            Ok(Json(ApiResponse::success(
                RoleResponse {
                    id: created.id.to_string(),
                    name: created.name,
                    description: created.description,
                    created_at: created.created_at.to_rfc3339(),
                },
                "创建角色成功",
            )))
        }
        Err(e) => {
            tracing::error!("创建角色失败: {}", e);
            if e.to_string().contains("duplicate") || e.to_string().contains("already exists") {
                Err((
                    StatusCode::CONFLICT,
                    Json(ApiResponse::<()>::error(409, "角色名称已存在")),
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

pub async fn get_role(
    State(state): State<crate::AppState>,
    Path(role_id): Path<String>,
) -> Result<Json<ApiResponse<RoleDetailResponse>>, impl IntoResponse> {
    // 先查询角色信息
    let role_result = sqlx::query_as::<_, Role>(
        "SELECT id, name, description, created_at FROM iam.roles WHERE id = $1"
    )
    .bind(&role_id)
    .fetch_optional(&state.db)
    .await;

    let role = match role_result {
        Ok(Some(r)) => r,
        Ok(None) => {
            return Err((
                StatusCode::NOT_FOUND,
                Json(ApiResponse::<()>::error(404, "角色不存在")),
            ))
        }
        Err(e) => {
            tracing::error!("查询角色失败: {}", e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::<()>::error(500, "服务器内部错误")),
            ));
        }
    };

    // 查询角色的权限列表
    let permissions_result = sqlx::query_as::<_, Permission>(
        r#"
        SELECT p.id, p.name, p.code, p.category, p.description
        FROM iam.permissions p
        INNER JOIN iam.role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role_id = $1
        ORDER BY p.category, p.code
        "#
    )
    .bind(&role_id)
    .fetch_all(&state.db)
    .await;

    let permissions = match permissions_result {
        Ok(perms) => perms
            .into_iter()
            .map(|p| PermissionInfo {
                id: p.id.to_string(),
                name: p.name,
                code: p.code,
                category: p.category,
                description: p.description,
            })
            .collect(),
        Err(e) => {
            tracing::error!("查询角色权限失败: {}", e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::<()>::error(500, "服务器内部错误")),
            ));
        }
    };

    Ok(Json(ApiResponse::success(
        RoleDetailResponse {
            id: role.id.to_string(),
            name: role.name,
            description: role.description,
            created_at: role.created_at.to_rfc3339(),
            permissions,
        },
        "获取角色详情成功",
    )))
}

pub async fn update_role(
    State(state): State<crate::AppState>,
    Path(role_id): Path<String>,
    Json(req): Json<UpdateRoleRequest>,
) -> Result<Json<ApiResponse<RoleResponse>>, impl IntoResponse> {
    // 先查询角色是否存在
    let existing = sqlx::query_as::<_, Role>(
        "SELECT id, name, description, created_at FROM iam.roles WHERE id = $1"
    )
    .bind(&role_id)
    .fetch_optional(&state.db)
    .await;

    let existing_role = match existing {
        Ok(Some(r)) => r,
        Ok(None) => {
            return Err((
                StatusCode::NOT_FOUND,
                Json(ApiResponse::<()>::error(404, "角色不存在")),
            ))
        }
        Err(e) => {
            tracing::error!("查询角色失败: {}", e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::<()>::error(500, "服务器内部错误")),
            ));
        }
    };

    let name = req.name.unwrap_or(existing_role.name);
    let description = req.description.or(existing_role.description);

    let result = sqlx::query_as::<_, Role>(
        r#"
        UPDATE iam.roles
        SET name = $2, description = $3
        WHERE id = $1
        RETURNING id, name, description, created_at
        "#
    )
    .bind(&role_id)
    .bind(&name)
    .bind(&description)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(updated) => {
            tracing::info!("更新角色成功: {}", updated.name);
            Ok(Json(ApiResponse::success(
                RoleResponse {
                    id: updated.id.to_string(),
                    name: updated.name,
                    description: updated.description,
                    created_at: updated.created_at.to_rfc3339(),
                },
                "更新角色成功",
            )))
        }
        Err(e) => {
            tracing::error!("更新角色失败: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::<()>::error(500, "服务器内部错误")),
            ))
        }
    }
}

pub async fn delete_role(
    State(state): State<crate::AppState>,
    Path(role_id): Path<String>,
) -> Result<Json<ApiResponse<String>>, impl IntoResponse> {
    // 检查是否为系统角色（管理员角色不可删除）
    let role_check = sqlx::query_scalar::<_, String>(
        "SELECT name FROM iam.roles WHERE id = $1"
    )
    .bind(&role_id)
    .fetch_optional(&state.db)
    .await;

    match role_check {
        Ok(Some(name)) => {
            if name == "管理员" || name == "admin" {
                return Err((
                    StatusCode::FORBIDDEN,
                    Json(ApiResponse::<()>::error(403, "系统角色不可删除")),
                ));
            }
        }
        Ok(None) => {
            return Err((
                StatusCode::NOT_FOUND,
                Json(ApiResponse::<()>::error(404, "角色不存在")),
            ))
        }
        Err(e) => {
            tracing::error!("查询角色失败: {}", e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::<()>::error(500, "服务器内部错误")),
            ));
        }
    }

    let result = sqlx::query("DELETE FROM iam.roles WHERE id = $1")
        .bind(&role_id)
        .execute(&state.db)
        .await;

    match result {
        Ok(res) => {
            if res.rows_affected() > 0 {
                tracing::info!("删除角色成功: {}", role_id);
                Ok(Json(ApiResponse::success(String::new(), "删除角色成功")))
            } else {
                Err((
                    StatusCode::NOT_FOUND,
                    Json(ApiResponse::<()>::error(404, "角色不存在")),
                ))
            }
        }
        Err(e) => {
            tracing::error!("删除角色失败: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::<()>::error(500, "服务器内部错误")),
            ))
        }
    }
}

pub async fn assign_permissions_to_role(
    State(state): State<crate::AppState>,
    Path(role_id): Path<String>,
    Json(req): Json<AssignPermissionsRequest>,
) -> Result<Json<ApiResponse<String>>, impl IntoResponse> {
    // 检查角色是否存在
    let role_exists = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM iam.roles WHERE id = $1)"
    )
    .bind(&role_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(false);

    if !role_exists {
        return Err((
            StatusCode::NOT_FOUND,
            Json(ApiResponse::<()>::error(404, "角色不存在")),
        ));
    }

    // 分配权限
    for permission_id in &req.permission_ids {
        let result = sqlx::query(
            r#"
            INSERT INTO iam.role_permissions (role_id, permission_id)
            VALUES ($1, $2)
            ON CONFLICT (role_id, permission_id) DO NOTHING
            "#
        )
        .bind(&role_id)
        .bind(permission_id)
        .execute(&state.db)
        .await;

        if let Err(e) = result {
            tracing::error!("分配权限失败: permission_id={}, error={}", permission_id, e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::<()>::error(500, "分配权限失败")),
            ));
        }
    }

    tracing::info!("为角色 {} 分配了 {} 个权限", role_id, req.permission_ids.len());
    Ok(Json(ApiResponse::success(String::new(), "分配权限成功")))
}

pub async fn remove_permission_from_role(
    State(state): State<crate::AppState>,
    Path((role_id, permission_id)): Path<(String, String)>,
) -> Result<Json<ApiResponse<String>>, impl IntoResponse> {
    let result = sqlx::query(
        "DELETE FROM iam.role_permissions WHERE role_id = $1 AND permission_id = $2"
    )
    .bind(&role_id)
    .bind(&permission_id)
    .execute(&state.db)
    .await;

    match result {
        Ok(res) => {
            if res.rows_affected() > 0 {
                tracing::info!("从角色 {} 移除权限 {}", role_id, permission_id);
                Ok(Json(ApiResponse::success(String::new(), "移除权限成功")))
            } else {
                Err((
                    StatusCode::NOT_FOUND,
                    Json(ApiResponse::<()>::error(404, "角色权限关联不存在")),
                ))
            }
        }
        Err(e) => {
            tracing::error!("移除权限失败: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::<()>::error(500, "服务器内部错误")),
            ))
        }
    }
}

pub fn create_role_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/api/v1/roles", get(list_roles))
        .route("/api/v1/roles", post(create_role))
        .route("/api/v1/roles/{role_id}", get(get_role))
        .route("/api/v1/roles/{role_id}", put(update_role))
        .route("/api/v1/roles/{role_id}", delete(delete_role))
        .route("/api/v1/roles/{role_id}/permissions", post(assign_permissions_to_role))
        .route("/api/v1/roles/{role_id}/permissions/{permission_id}", delete(remove_permission_from_role))
        .with_state(state)
}