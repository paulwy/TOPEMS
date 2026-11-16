use crate::AppState;
use axum::http::StatusCode;
use axum::Extension;
use axum::{
    extract::{Path, State},
    Json,
};
use serde::Serialize;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use utoipa::ToSchema;
use uuid::Uuid;

use super::models::{record_audit_log, UserResponse, UserRow};
use crate::modules::iam::tenant_scope::{self, IamScope, RoleTarget, UserTarget};

#[derive(Debug, Serialize, ToSchema, sqlx::FromRow)]
#[schema(as = UserRoleRow)]
struct UserRoleRow {
    id: Uuid,
    name: String,
    description: Option<String>,
    created_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Serialize, ToSchema, sqlx::FromRow)]
#[schema(as = UserPermissionRow)]
struct UserPermissionRow {
    permission_id: Uuid,
    code: String,
    name: String,
    description: Option<String>,
    resource: Option<String>,
    action: Option<String>,
}

/// GET /users/{userId}/permissions — 返回指定用户权限（与已有 /user-permissions/{user_id} 不同路径）
#[utoipa::path(
    get,
    security(("BearerAuth" = ["unified-core:iam:user:read"])),
    path = "/iam/users/{user_id}/permissions",
    tag = "IAM-Permissions",
    params(("user_id" = String, Path, description = "用户 ID")),
    responses(
        (status = 200, description = "指定用户权限列表"),
        (status = 400, description = "无效的用户ID格式"),
        (status = 404, description = "用户不存在"),
    )
)]
pub async fn get_user_permissions(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(user_id): Path<String>,
    headers: axum::http::HeaderMap,
) -> (StatusCode, Json<serde_json::Value>) {
    tracing::info!(
        "IAM user get_user_permissions called with user_id: {}",
        user_id
    );

    let user_uuid = match Uuid::parse_str(&user_id) {
        Ok(id) => id,
        Err(e) => {
            tracing::warn!("Invalid user ID format: {}", e);
            return (
                StatusCode::BAD_REQUEST,
                Json(topems_shared_core::response::error_value(
                    400,
                    "无效的用户ID格式",
                )),
            );
        }
    };

    let scope = match tenant_scope::iam_read_scope(&claims) {
        Ok(scope) => scope,
        Err(_) => return tenant_scope::forbidden("缺少租户上下文，无法查看用户权限"),
    };

    match tenant_scope::check_user_target(
        &state.db,
        &txn_arc,
        scope,
        user_uuid,
        claims.is_superuser,
    )
    .await
    {
        Ok(UserTarget::Ok) => {}
        Ok(UserTarget::NotFound) => return tenant_scope::not_found_detail("用户不存在"),
        Ok(UserTarget::Superuser) => return tenant_scope::forbidden("无权查看超级管理员"),
        Err(e) => {
            tracing::error!("Failed to check user target scope: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(topems_shared_core::response::error_value(
                    500,
                    &format!("查询用户失败: {}", e),
                )),
            );
        }
    }

    // `core_roles` 是 FORCE RLS 表：裸池没有租户上下文，严格策略下租户域角色
    // 一律不可见，导致响应里的角色（以及由角色推导权限的消费方）少报。
    // 读取必须走调用者作用域：平台管理员用系统读，租户管理员用本租户读
    // （目标用户的租户可见性已由 check_user_target 校验）。
    let mut guard = txn_arc.lock().await;
    let tx_result = match scope {
        IamScope::Platform => state.db.scope_read_system().await,
        IamScope::Tenant(_) => {
            let Some(txn) = guard.as_mut() else {
                tracing::error!("rls txn missing: RLS 事务中间件未注入");
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(topems_shared_core::response::error_value(
                        500,
                        "数据库事务上下文缺失",
                    )),
                );
            };
            state.db.scope_with(txn).await
        }
    };
    let mut tx = match tx_result {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!("开始用户权限读事务失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(topems_shared_core::response::error_value(
                    500,
                    &format!("查询用户权限失败: {}", e),
                )),
            );
        }
    };

    let user: Option<UserRow> = match sqlx::query_as(
        "SELECT id, username, email, CASE WHEN $2 = 'en' THEN COALESCE(full_name_en, full_name) ELSE full_name END AS full_name, status, is_superuser, created_at FROM iam.users WHERE deleted_at IS NULL AND id = $1",
    )
    .bind(user_uuid)
    .bind(topems_shared_core::locale::Locale::from_headers(&headers).as_sql())
    .fetch_optional(&mut tx)
    .await
    {
        Ok(user) => user,
        Err(e) => {
            let _ = tx.rollback().await;
            tracing::error!("查询用户失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(topems_shared_core::response::error_value(
                    500,
                    &format!("查询用户失败: {}", e),
                )),
            );
        }
    };

    let u = match user {
        Some(u) => u,
        None => {
            let _ = tx.rollback().await;
            tracing::warn!("User not found: {}", user_id);
            // 前端契约：详情类资源不存在返回 HTTP 200 + 内层 code=404
            return (
                StatusCode::OK,
                Json(topems_shared_core::response::error_value(404, "用户不存在")),
            );
        }
    };

    let roles_result: sqlx::Result<Vec<UserRoleRow>> = if u.is_superuser {
        sqlx::query_as::<_, UserRoleRow>(
            "SELECT id, name, description, created_at FROM public.core_roles WHERE deleted_at IS NULL ORDER BY name",
        )
        .fetch_all(&mut tx)
        .await
    } else {
        sqlx::query_as::<_, UserRoleRow>(
            r#"
            SELECT r.id, r.name, r.description, r.created_at
            FROM public.core_roles r
            INNER JOIN public.core_user_roles ur ON r.id = ur.role_id
            WHERE r.deleted_at IS NULL AND ur.user_id = $1
            ORDER BY r.name
            "#,
        )
        .bind(user_uuid)
        .fetch_all(&mut tx)
        .await
    };
    let roles = match roles_result {
        Ok(roles) => roles,
        Err(e) => {
            let _ = tx.rollback().await;
            tracing::error!("查询用户角色失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(topems_shared_core::response::error_value(
                    500,
                    &format!("查询用户角色失败: {}", e),
                )),
            );
        }
    };

    let permissions_result: sqlx::Result<Vec<UserPermissionRow>> = if u.is_superuser {
        sqlx::query_as::<_, UserPermissionRow>(
            "SELECT id as permission_id, code, name, description, resource, action FROM public.core_permissions ORDER BY code",
        )
        .fetch_all(&mut tx)
        .await
    } else {
        sqlx::query_as::<_, UserPermissionRow>(
            r#"
            SELECT DISTINCT p.id as permission_id, p.code, p.name, p.description, p.resource, p.action
            FROM public.core_permissions p
            INNER JOIN public.core_role_permissions rp ON p.id = rp.permission_id
            INNER JOIN public.core_user_roles ur ON rp.role_id = ur.role_id
            WHERE p.deleted_at IS NULL AND ur.user_id = $1
            ORDER BY p.code
            "#,
        )
        .bind(user_uuid)
        .fetch_all(&mut tx)
        .await
    };
    let permissions = match permissions_result {
        Ok(permissions) => permissions,
        Err(e) => {
            let _ = tx.rollback().await;
            tracing::error!("查询用户权限失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(topems_shared_core::response::error_value(
                    500,
                    &format!("查询用户权限失败: {}", e),
                )),
            );
        }
    };

    if let Err(e) = tx.commit().await {
        tracing::error!("提交用户权限读事务失败: {}", e);
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(topems_shared_core::response::error_value(
                500,
                &format!("查询用户权限失败: {}", e),
            )),
        );
    }

    let role_names: Vec<String> = roles.iter().map(|r| r.name.clone()).collect();
    let permission_codes: Vec<String> = permissions.iter().map(|p| p.code.clone()).collect();

    let user_response = UserResponse {
        id: u.id.to_string(),
        username: u.username,
        email: u.email,
        full_name: u.full_name,
        role: if u.is_superuser {
            "admin".to_string()
        } else {
            role_names.first().cloned().unwrap_or_default()
        },
        roles: role_names,
        permissions: permission_codes,
        is_active: u.status == "active",
        is_superuser: u.is_superuser,
        created_at: u.created_at,
    };

    let roles_json: Vec<serde_json::Value> = roles
        .iter()
        .map(|r| {
            serde_json::json!({
                "id": r.id.to_string(),
                "name": r.name,
                "description": r.description,
                "created_at": r.created_at,
            })
        })
        .collect();

    let permissions_json: Vec<serde_json::Value> = permissions
        .iter()
        .map(|p| {
            let category = p.code.split(':').next().unwrap_or("other");
            serde_json::json!({
                "id": p.permission_id.to_string(),
                "name": p.name,
                "code": p.code,
                "category": category,
                "description": p.description,
                "resource": p.resource,
                "action": p.action,
            })
        })
        .collect();

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "success": true,
            "message": "获取用户权限成功",
            "data": {
                "user": user_response,
                "roles": roles_json,
                "permissions": permissions_json
            },
            "code": 200
        })),
    )
}

/// GET /users/{userId}/roles — 返回指定用户角色列表
pub async fn get_user_roles(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(user_id): Path<String>,
) -> (StatusCode, Json<serde_json::Value>) {
    tracing::info!("IAM user get_user_roles called with user_id: {}", user_id);

    let user_uuid = match Uuid::parse_str(&user_id) {
        Ok(id) => id,
        Err(e) => {
            tracing::warn!("Invalid user ID format: {}", e);
            return (
                StatusCode::BAD_REQUEST,
                Json(topems_shared_core::response::error_value(
                    400,
                    "无效的用户ID格式",
                )),
            );
        }
    };

    let scope = match tenant_scope::iam_read_scope(&claims) {
        Ok(scope) => scope,
        Err(_) => return tenant_scope::forbidden("缺少租户上下文，无法查看用户角色"),
    };

    match tenant_scope::check_user_target(
        &state.db,
        &txn_arc,
        scope,
        user_uuid,
        claims.is_superuser,
    )
    .await
    {
        Ok(UserTarget::Ok) => {}
        Ok(UserTarget::NotFound) => return tenant_scope::not_found_detail("用户不存在"),
        Ok(UserTarget::Superuser) => return tenant_scope::forbidden("无权查看超级管理员"),
        Err(e) => {
            tracing::error!("Failed to check user target scope: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(topems_shared_core::response::error_value(
                    500,
                    &format!("查询用户失败: {}", e),
                )),
            );
        }
    }

    // 同 get_user_permissions：`core_roles` 严格 RLS 下裸池读不到租户域角色。
    let mut guard = txn_arc.lock().await;
    let tx_result = match scope {
        IamScope::Platform => state.db.scope_read_system().await,
        IamScope::Tenant(_) => {
            let Some(txn) = guard.as_mut() else {
                tracing::error!("rls txn missing: RLS 事务中间件未注入");
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(topems_shared_core::response::error_value(
                        500,
                        "数据库事务上下文缺失",
                    )),
                );
            };
            state.db.scope_with(txn).await
        }
    };
    let mut tx = match tx_result {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!("开始用户角色读事务失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(topems_shared_core::response::error_value(
                    500,
                    &format!("查询用户角色失败: {}", e),
                )),
            );
        }
    };

    let roles_result: sqlx::Result<Vec<UserRoleRow>> = sqlx::query_as::<_, UserRoleRow>(
        r#"
        SELECT r.id, r.name, r.description, r.created_at
        FROM public.core_roles r
        INNER JOIN public.core_user_roles ur ON r.id = ur.role_id
        WHERE r.deleted_at IS NULL AND ur.user_id = $1
        ORDER BY r.name
        "#,
    )
    .bind(user_uuid)
    .fetch_all(&mut tx)
    .await;

    let roles = match roles_result {
        Ok(roles) => roles,
        Err(e) => {
            let _ = tx.rollback().await;
            tracing::error!("Failed to fetch user roles: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(topems_shared_core::response::error_value(
                    500,
                    &format!("查询用户角色失败: {}", e),
                )),
            );
        }
    };

    if let Err(e) = tx.commit().await {
        tracing::error!("提交用户角色读事务失败: {}", e);
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(topems_shared_core::response::error_value(
                500,
                &format!("查询用户角色失败: {}", e),
            )),
        );
    }

    let roles_json: Vec<serde_json::Value> = roles
        .iter()
        .map(|r| {
            serde_json::json!({
                "id": r.id.to_string(),
                "name": r.name,
                "description": r.description,
                "created_at": r.created_at,
            })
        })
        .collect();

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "success": true,
            "message": "获取用户角色列表成功",
            "data": roles_json,
            "code": 200
        })),
    )
}

/// POST /users/{userId}/roles/{roleId} — 为用户分配角色
pub async fn assign_user_role(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((user_id, role_id)): Path<(String, String)>,
) -> (StatusCode, Json<serde_json::Value>) {
    tracing::info!(
        "IAM user assign_user_role called with user_id: {}, role_id: {}",
        user_id,
        role_id
    );

    let operator_id = &claims.sub;

    let user_uuid = match Uuid::parse_str(&user_id) {
        Ok(id) => id,
        Err(e) => {
            tracing::warn!("Invalid user ID format: {}", e);
            return (
                StatusCode::BAD_REQUEST,
                Json(topems_shared_core::response::error_value(
                    400,
                    "无效的用户ID格式",
                )),
            );
        }
    };

    let role_uuid = match Uuid::parse_str(&role_id) {
        Ok(id) => id,
        Err(e) => {
            tracing::warn!("Invalid role ID format: {}", e);
            return (
                StatusCode::BAD_REQUEST,
                Json(topems_shared_core::response::error_value(
                    400,
                    "无效的角色ID格式",
                )),
            );
        }
    };

    let scope = match tenant_scope::iam_write_scope(&claims, "admin:iam:write") {
        Ok(scope) => scope,
        Err(_) => return tenant_scope::forbidden("缺少租户上下文，无法分配角色"),
    };

    match tenant_scope::check_user_target(
        &state.db,
        &txn_arc,
        scope,
        user_uuid,
        claims.is_superuser,
    )
    .await
    {
        Ok(UserTarget::Ok) => {}
        Ok(UserTarget::NotFound) => return tenant_scope::not_found_detail("用户不存在"),
        Ok(UserTarget::Superuser) => return tenant_scope::forbidden("无权修改超级管理员"),
        Err(e) => {
            tracing::error!("Failed to check user target scope: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(topems_shared_core::response::error_value(
                    500,
                    &format!("查询用户失败: {}", e),
                )),
            );
        }
    }

    match tenant_scope::check_role_target(&state.db, &txn_arc, scope, role_uuid).await {
        Ok(RoleTarget::Ok) => {}
        Ok(RoleTarget::NotFound) => return tenant_scope::not_found_detail("角色不存在"),
        Err(e) => {
            tracing::error!("Failed to check role target scope: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(topems_shared_core::response::error_value(
                    500,
                    &format!("查询角色失败: {}", e),
                )),
            );
        }
    }

    // 租户管理员只能分配本租户内、且权限集不超出自身权限集/不含平台层码的角色，
    // 防止借已有角色提权。
    if let IamScope::Tenant(_) = scope {
        match tenant_scope::role_permission_codes(&state.db, &txn_arc, scope, role_uuid).await {
            Ok(codes) => {
                if !tenant_scope::can_grant_codes(&claims, &codes) {
                    return tenant_scope::forbidden("不能授予平台层权限或超出自身权限集的角色");
                }
            }
            Err(e) => {
                tracing::error!("Failed to load role permissions: {}", e);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(topems_shared_core::response::error_value(
                        500,
                        &format!("查询角色权限失败: {}", e),
                    )),
                );
            }
        }
    }

    let result = sqlx::query(
        "INSERT INTO public.core_user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
    )
    .bind(user_uuid)
    .bind(role_uuid)
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => {
            topems_shared_auth::invalidate_user_permission_cache(user_uuid);
            tracing::info!("Role {} assigned to user {} successfully", role_id, user_id);

            let response_body = serde_json::json!({
                "success": true,
                "message": "分配角色成功",
                "data": null,
                "code": 200
            });

            record_audit_log(
                &state.pool,
                operator_id,
                "assign_role",
                "user_role",
                &format!("{}/{}", user_id, role_id),
                None,
                Some(response_body.clone()),
                200,
            )
            .await;

            (StatusCode::OK, Json(response_body))
        }
        Err(e) => {
            tracing::error!("Failed to assign role: {}", e);
            let response_body =
                topems_shared_core::response::error_value(500, &format!("分配角色失败: {}", e));

            record_audit_log(
                &state.pool,
                operator_id,
                "assign_role",
                "user_role",
                &format!("{}/{}", user_id, role_id),
                None,
                Some(response_body.clone()),
                500,
            )
            .await;

            (StatusCode::INTERNAL_SERVER_ERROR, Json(response_body))
        }
    }
}

/// DELETE /users/{userId}/roles/{roleId} — 移除用户角色
pub async fn remove_user_role(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((user_id, role_id)): Path<(String, String)>,
) -> (StatusCode, Json<serde_json::Value>) {
    tracing::info!(
        "IAM user remove_user_role called with user_id: {}, role_id: {}",
        user_id,
        role_id
    );

    let operator_id = &claims.sub;

    let user_uuid = match Uuid::parse_str(&user_id) {
        Ok(id) => id,
        Err(e) => {
            tracing::warn!("Invalid user ID format: {}", e);
            return (
                StatusCode::BAD_REQUEST,
                Json(topems_shared_core::response::error_value(
                    400,
                    "无效的用户ID格式",
                )),
            );
        }
    };

    let role_uuid = match Uuid::parse_str(&role_id) {
        Ok(id) => id,
        Err(e) => {
            tracing::warn!("Invalid role ID format: {}", e);
            return (
                StatusCode::BAD_REQUEST,
                Json(topems_shared_core::response::error_value(
                    400,
                    "无效的角色ID格式",
                )),
            );
        }
    };

    let scope = match tenant_scope::iam_write_scope(&claims, "admin:iam:delete") {
        Ok(scope) => scope,
        Err(_) => return tenant_scope::forbidden("缺少租户上下文，无法移除角色"),
    };

    match tenant_scope::check_user_target(
        &state.db,
        &txn_arc,
        scope,
        user_uuid,
        claims.is_superuser,
    )
    .await
    {
        Ok(UserTarget::Ok) => {}
        Ok(UserTarget::NotFound) => return tenant_scope::not_found_detail("用户不存在"),
        Ok(UserTarget::Superuser) => return tenant_scope::forbidden("无权修改超级管理员"),
        Err(e) => {
            tracing::error!("Failed to check user target scope: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(topems_shared_core::response::error_value(
                    500,
                    &format!("查询用户失败: {}", e),
                )),
            );
        }
    }

    match tenant_scope::check_role_target(&state.db, &txn_arc, scope, role_uuid).await {
        Ok(RoleTarget::Ok) => {}
        Ok(RoleTarget::NotFound) => return tenant_scope::not_found_detail("角色不存在"),
        Err(e) => {
            tracing::error!("Failed to check role target scope: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(topems_shared_core::response::error_value(
                    500,
                    &format!("查询角色失败: {}", e),
                )),
            );
        }
    }

    let result =
        sqlx::query("DELETE FROM public.core_user_roles WHERE user_id = $1 AND role_id = $2")
            .bind(user_uuid)
            .bind(role_uuid)
            .execute(&state.pool)
            .await;

    match result {
        Ok(r) => {
            if r.rows_affected() == 0 {
                tracing::warn!("User role not found: {}/{}", user_id, role_id);
                // 前端契约：详情类资源不存在返回 HTTP 200 + 内层 code=404
                return (
                    StatusCode::OK,
                    Json(topems_shared_core::response::error_value(
                        404,
                        "用户角色关联不存在",
                    )),
                );
            }

            topems_shared_auth::invalidate_user_permission_cache(user_uuid);
            tracing::info!(
                "Role {} removed from user {} successfully",
                role_id,
                user_id
            );

            let response_body = serde_json::json!({
                "success": true,
                "message": "移除角色成功",
                "data": null,
                "code": 200
            });

            record_audit_log(
                &state.pool,
                operator_id,
                "remove_role",
                "user_role",
                &format!("{}/{}", user_id, role_id),
                None,
                Some(response_body.clone()),
                200,
            )
            .await;

            (StatusCode::OK, Json(response_body))
        }
        Err(e) => {
            tracing::error!("Failed to remove role: {}", e);
            let response_body =
                topems_shared_core::response::error_value(500, &format!("移除角色失败: {}", e));

            record_audit_log(
                &state.pool,
                operator_id,
                "remove_role",
                "user_role",
                &format!("{}/{}", user_id, role_id),
                None,
                Some(response_body.clone()),
                500,
            )
            .await;

            (StatusCode::INTERNAL_SERVER_ERROR, Json(response_body))
        }
    }
}
