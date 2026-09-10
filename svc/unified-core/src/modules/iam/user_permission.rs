//! User Permission submodule - User permission management handlers

use crate::AppState;
use axum::{
    extract::{Path, State},
    Extension, Json,
};
use serde::{Deserialize, Serialize};
use topems_shared_auth::auth::Claims;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
struct UserPermissionRow {
    permission_id: Uuid,
    code: String,
    name: String,
    description: Option<String>,
    resource: Option<String>,
    action: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
struct UserPermissionResponse {
    id: String,
    code: String,
    name: String,
    description: Option<String>,
    category: String,
}

pub async fn get_user_permissions(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(user_id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "IAM user_permission get_user_permissions called with user_id: {}",
        user_id
    );

    let user_uuid = match Uuid::parse_str(&user_id) {
        Ok(id) => id,
        Err(_) => {
            return Json(topems_shared_core::response::error_value(
                400,
                "无效的用户ID格式",
            ));
        }
    };

    // 检查用户是否是超级管理员
    let is_superuser: bool =
        match sqlx::query_scalar("SELECT is_superuser FROM core_users WHERE deleted_at IS NULL AND id = $1")
            .bind(user_uuid)
            .fetch_optional(&state.pool)
            .await
        {
            Ok(Some(v)) => v,
            Ok(None) => {
                return Json(topems_shared_core::response::error_value(404, "用户不存在"));
            }
            Err(e) => {
                tracing::error!("查询用户超级管理员状态失败: {}", e);
                return Json(topems_shared_core::response::error_value(
                    500,
                    &format!("查询失败: {}", e),
                ));
            }
        };

    // 超级管理员拥有所有权限
    if is_superuser {
        let all_permissions = match sqlx::query_as::<_, UserPermissionRow>(
            "SELECT p.id as permission_id, p.code, p.name, p.description, p.resource, p.action FROM core_permissions p ORDER BY p.code"
        )
        .fetch_all(&state.pool)
        .await
        {
            Ok(perms) => perms,
            Err(e) => {
                tracing::error!("获取所有权限失败: {}", e);
                return Json(topems_shared_core::response::error_value(500, &format!("获取权限失败: {}", e)));
            }
        };

        let permission_responses: Vec<UserPermissionResponse> = all_permissions
            .into_iter()
            .map(|p| {
                let category = extract_category(&p.code);
                UserPermissionResponse {
                    id: p.permission_id.to_string(),
                    code: p.code,
                    name: p.name,
                    description: p.description,
                    category,
                }
            })
            .collect();

        return Json(serde_json::json!({
            "success": true,
            "message": "获取用户权限成功（超级管理员）",
            "data": permission_responses
        }));
    }

    // 普通用户：从用户角色获取权限
    let result = sqlx::query_as::<_, UserPermissionRow>(
        r#"
        SELECT DISTINCT p.id as permission_id, p.code, p.name, p.description, p.resource, p.action
        FROM core_permissions p
        INNER JOIN core_role_permissions rp ON p.id = rp.permission_id
        INNER JOIN core_user_roles ur ON rp.role_id = ur.role_id
        WHERE ur.user_id = $1
        ORDER BY p.code
        "#,
    )
    .bind(user_uuid)
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(permissions) => {
            let permission_responses: Vec<UserPermissionResponse> = permissions
                .into_iter()
                .map(|p| {
                    let category = extract_category(&p.code);
                    UserPermissionResponse {
                        id: p.permission_id.to_string(),
                        code: p.code,
                        name: p.name,
                        description: p.description,
                        category,
                    }
                })
                .collect();

            Json(serde_json::json!({
                "success": true,
                "message": "获取用户权限成功",
                "data": permission_responses
            }))
        }
        Err(e) => {
            tracing::error!("获取用户权限失败: {}", e);
            Json(topems_shared_core::response::error_value(
                500,
                &format!("获取用户权限失败: {}", e),
            ))
        }
    }
}

pub async fn update_user_permissions(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(user_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "IAM user_permission update_user_permissions called with user_id: {} and payload: {:?}",
        user_id,
        payload
    );

    let user_uuid = match Uuid::parse_str(&user_id) {
        Ok(id) => id,
        Err(_) => {
            return Json(topems_shared_core::response::error_value(
                400,
                "无效的用户ID格式",
            ));
        }
    };

    // 解析请求
    let role_ids: Vec<String> = serde_json::from_value(
        payload
            .get("role_ids")
            .cloned()
            .unwrap_or(serde_json::Value::Array(vec![])),
    )
    .unwrap_or_default();

    // 验证所有角色ID都是有效的 UUID
    for role_id in &role_ids {
        if Uuid::parse_str(role_id).is_err() {
            return Json(topems_shared_core::response::error_value(
                400,
                &format!("无效的角色ID格式: {}", role_id),
            ));
        }
    }

    // 检查用户是否存在
    let user_exists: bool =
        match sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM core_users WHERE deleted_at IS NULL AND id = $1)")
            .bind(user_uuid)
            .fetch_one(&state.pool)
            .await
        {
            Ok(exists) => exists,
            Err(e) => {
                tracing::error!("检查用户存在性失败: {}", e);
                return Json(topems_shared_core::response::error_value(
                    500,
                    &format!("检查用户失败: {}", e),
                ));
            }
        };

    if !user_exists {
        return Json(topems_shared_core::response::error_value(404, "用户不存在"));
    }

    // 事务：删除现有角色关联，添加新角色关联
    let mut tx = match state.pool.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!("开始事务失败: {}", e);
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("开始事务失败: {}", e),
            ));
        }
    };

    // 删除现有用户角色关联
    if let Err(e) = sqlx::query("DELETE FROM core_user_roles WHERE user_id = $1")
        .bind(user_uuid)
        .execute(&mut *tx)
        .await
    {
        let _ = tx.rollback().await;
        tracing::error!("删除用户角色关联失败: {}", e);
        return Json(topems_shared_core::response::error_value(
            500,
            &format!("删除用户角色关联失败: {}", e),
        ));
    }

    // 添加新的角色关联
    for role_id in &role_ids {
        let role_uuid = Uuid::parse_str(role_id).unwrap_or_default();
        if let Err(e) = sqlx::query(
            "INSERT INTO core_user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        )
        .bind(user_uuid)
        .bind(role_uuid)
        .execute(&mut *tx)
        .await
        {
            let _ = tx.rollback().await;
            tracing::error!("添加用户角色关联失败: {}", e);
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("添加用户角色关联失败: {}", e),
            ));
        }
    }

    // 提交事务
    if let Err(e) = tx.commit().await {
        tracing::error!("提交事务失败: {}", e);
        return Json(topems_shared_core::response::error_value(
            500,
            &format!("提交事务失败: {}", e),
        ));
    }

    tracing::info!("更新用户 {} 的角色权限成功", user_id);

    Json(serde_json::json!({
        "success": true,
        "message": "更新用户权限成功",
        "data": {
            "user_id": user_id,
            "role_ids": role_ids
        }
    }))
}

/// 从权限 code 中提取 category（例如 "iam:users_read" -> "iam"）
fn extract_category(code: &str) -> String {
    code.split(':').next().unwrap_or("other").to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_category_standard() {
        assert_eq!(extract_category("iam:users_read"), "iam");
        assert_eq!(extract_category("crm:customers_create"), "crm");
        assert_eq!(extract_category("finance:invoices_approve"), "finance");
    }

    #[test]
    fn test_extract_category_nested() {
        assert_eq!(extract_category("iam:users:read"), "iam");
        assert_eq!(extract_category("a:b:c:d:e"), "a");
    }

    #[test]
    fn test_extract_category_no_colon() {
        assert_eq!(extract_category("admin_access"), "admin_access");
        assert_eq!(extract_category("superuser"), "superuser");
    }

    #[test]
    fn test_extract_category_edge_cases() {
        assert_eq!(extract_category(""), "");
        assert_eq!(extract_category(":test"), "");
        assert_eq!(extract_category("test:"), "test");
    }

    #[test]
    fn test_user_permission_row_struct() {
        let row = UserPermissionRow {
            permission_id: Uuid::nil(),
            code: "iam:users_read".to_string(),
            name: "读取用户".to_string(),
            description: Some("读取用户列表".to_string()),
            resource: Some("users".to_string()),
            action: Some("read".to_string()),
        };
        assert_eq!(row.code, "iam:users_read");
        assert_eq!(extract_category(&row.code), "iam");
    }
}
