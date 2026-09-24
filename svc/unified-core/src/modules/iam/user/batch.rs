use crate::AppState;
use axum::http::StatusCode;
use axum::Extension;
use axum::{
    extract::{Path, State},
    Json,
};
use serde::Serialize;
use topems_shared_auth::auth::Claims;
use utoipa::ToSchema;
use uuid::Uuid;

use super::models::record_audit_log;

#[derive(Debug, Serialize, ToSchema, sqlx::FromRow)]
#[schema(as = EffectivePermissionRow)]
struct EffectivePermissionRow {
    permission_id: Uuid,
    code: String,
    name: String,
    description: Option<String>,
    resource: Option<String>,
    action: Option<String>,
}

/// GET /users/{userId}/effective-permissions — 返回用户有效权限（direct + role + total）
pub async fn get_effective_permissions(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(user_id): Path<String>,
) -> (StatusCode, Json<serde_json::Value>) {
    tracing::info!(
        "IAM user get_effective_permissions called with user_id: {}",
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

    let is_superuser: bool = match sqlx::query_scalar(
        "SELECT is_superuser FROM public.core_users WHERE deleted_at IS NULL AND id = $1",
    )
    .bind(user_uuid)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(v)) => v,
        Ok(None) => {
            return (
                StatusCode::NOT_FOUND,
                Json(topems_shared_core::response::error_value(404, "用户不存在")),
            );
        }
        Err(e) => {
            tracing::error!("Failed to query user: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(topems_shared_core::response::error_value(
                    500,
                    &format!("查询用户失败: {}", e),
                )),
            );
        }
    };

    let role_permissions: Vec<EffectivePermissionRow> = if is_superuser {
        sqlx::query_as::<_, EffectivePermissionRow>(
            "SELECT id as permission_id, code, name, description, resource, action FROM public.core_permissions ORDER BY code",
        )
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default()
    } else {
        sqlx::query_as::<_, EffectivePermissionRow>(
            r#"
            SELECT DISTINCT p.id as permission_id, p.code, p.name, p.description, p.resource, p.action
            FROM public.core_permissions p
            INNER JOIN public.core_role_permissions rp ON p.id = rp.permission_id
            INNER JOIN public.core_user_roles ur ON rp.role_id = ur.role_id
            WHERE ur.user_id = $1
            ORDER BY p.code
            "#,
        )
        .bind(user_uuid)
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default()
    };

    let to_json = |p: &EffectivePermissionRow| {
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
    };

    // 当前数据模型中没有直接用户权限表，direct_permissions 为空
    let direct_permissions: Vec<serde_json::Value> = vec![];
    let role_permissions_json: Vec<serde_json::Value> =
        role_permissions.iter().map(to_json).collect();
    let all_permissions_json: Vec<serde_json::Value> =
        role_permissions.iter().map(to_json).collect();
    let total = all_permissions_json.len() as i64;

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "success": true,
            "message": "获取用户有效权限成功",
            "data": {
                "direct_permissions": direct_permissions,
                "role_permissions": role_permissions_json,
                "all_permissions": all_permissions_json,
                "total": total
            },
            "code": 200
        })),
    )
}

/// POST /users/batch-delete — 批量删除用户
pub async fn batch_delete_users(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<serde_json::Value>,
) -> (StatusCode, Json<serde_json::Value>) {
    tracing::info!(
        "IAM user batch_delete_users called by: {} with payload: {:?}",
        claims.sub,
        payload
    );

    let operator_id = &claims.sub;

    let user_ids: Vec<String> = payload
        .get("user_ids")
        .or_else(|| payload.get("ids"))
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();

    if user_ids.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(topems_shared_core::response::error_value(
                400,
                "user_ids 不能为空",
            )),
        );
    }

    let mut deleted_count: i64 = 0;
    let mut failed_ids: Vec<String> = Vec::new();

    for id in &user_ids {
        if id == &claims.sub {
            tracing::warn!(
                "batch_delete_users: cannot delete yourself, skipping {}",
                id
            );
            failed_ids.push(id.clone());
            continue;
        }

        let user_uuid = match Uuid::parse_str(id) {
            Ok(uid) => uid,
            Err(_) => {
                tracing::warn!("batch_delete_users: invalid user ID format: {}", id);
                failed_ids.push(id.clone());
                continue;
            }
        };

        let result = sqlx::query("UPDATE public.core_users SET deleted_at = NOW() WHERE id = $1")
            .bind(user_uuid)
            .execute(&state.pool)
            .await;

        match result {
            Ok(r) => {
                if r.rows_affected() > 0 {
                    deleted_count += 1;
                } else {
                    failed_ids.push(id.clone());
                }
            }
            Err(e) => {
                tracing::error!("Failed to delete user {}: {}", id, e);
                failed_ids.push(id.clone());
            }
        }
    }

    tracing::info!(
        "batch_delete_users: deleted {}, failed {}",
        deleted_count,
        failed_ids.len()
    );

    let response_body = serde_json::json!({
        "success": true,
        "message": format!("批量删除完成：删除 {} 个，失败 {} 个", deleted_count, failed_ids.len()),
        "data": {
            "deleted_count": deleted_count,
            "failed_ids": failed_ids
        },
        "code": 200
    });

    record_audit_log(
        &state.pool,
        operator_id,
        "batch_delete",
        "user",
        "-",
        Some(payload),
        Some(response_body.clone()),
        200,
    )
    .await;

    (StatusCode::OK, Json(response_body))
}

/// PUT /users/batch-update — 批量更新用户
pub async fn batch_update_users(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<serde_json::Value>,
) -> (StatusCode, Json<serde_json::Value>) {
    tracing::info!(
        "IAM user batch_update_users called by: {} with payload: {:?}",
        claims.sub,
        payload
    );

    let operator_id = &claims.sub;

    let user_ids: Vec<String> = payload
        .get("user_ids")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();

    if user_ids.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(topems_shared_core::response::error_value(
                400,
                "user_ids 不能为空",
            )),
        );
    }

    // 前端 BatchUpdateUsersRequest 使用 isactive (boolean) 来批量切换用户状态
    let new_status: Option<String> = payload
        .get("isactive")
        .and_then(|v| v.as_bool())
        .map(|active| if active { "active" } else { "inactive" }.to_string());

    let mut updated_count: i64 = 0;

    for id in &user_ids {
        let user_uuid = match Uuid::parse_str(id) {
            Ok(uid) => uid,
            Err(_) => {
                tracing::warn!("batch_update_users: invalid user ID format: {}", id);
                continue;
            }
        };

        let result = if let Some(status) = &new_status {
            sqlx::query(
                "UPDATE public.core_users SET status = $1, updated_at = NOW() WHERE id = $2",
            )
            .bind(status)
            .bind(user_uuid)
            .execute(&state.pool)
            .await
        } else {
            // 没有提供 isactive，尝试更新 full_name / email（兼容任务描述中的 updates 形态）
            sqlx::query(
                r#"
                UPDATE public.core_users
                SET
                    full_name = COALESCE($1, full_name),
                    email = COALESCE($2, email),
                    updated_at = NOW()
                WHERE id = $3
                "#,
            )
            .bind(payload.get("full_name").and_then(|v| v.as_str()))
            .bind(payload.get("email").and_then(|v| v.as_str()))
            .bind(user_uuid)
            .execute(&state.pool)
            .await
        };

        match result {
            Ok(r) => {
                if r.rows_affected() > 0 {
                    updated_count += 1;
                }
            }
            Err(e) => {
                tracing::error!("Failed to update user {}: {}", id, e);
            }
        }
    }

    tracing::info!("batch_update_users: updated {}", updated_count);

    let response_body = serde_json::json!({
        "success": true,
        "message": format!("批量更新完成：更新 {} 个", updated_count),
        "data": {
            "updated_count": updated_count
        },
        "code": 200
    });

    record_audit_log(
        &state.pool,
        operator_id,
        "batch_update",
        "user",
        "-",
        Some(payload),
        Some(response_body.clone()),
        200,
    )
    .await;

    (StatusCode::OK, Json(response_body))
}
