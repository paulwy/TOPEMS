//! Role submodule - Role management handlers

use crate::AppState;
use axum::{
    extract::{Path, State},
    Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
struct RoleRow {
    id: uuid::Uuid,
    name: String,
    description: Option<String>,
    tenant_id: Option<uuid::Uuid>,
    created_at: Option<chrono::NaiveDateTime>,
    updated_at: Option<chrono::NaiveDateTime>,
}

#[derive(Debug, Clone, Serialize)]
struct RoleResponse {
    id: String,
    name: String,
    description: Option<String>,
    created_at: Option<String>,
    permission_count: i64,
}

pub async fn list_roles(State(state): State<AppState>) -> Json<serde_json::Value> {
    tracing::info!("IAM role list_roles called");

    let result = sqlx::query_as::<_, RoleRow>(
        "SELECT id, name, description, tenant_id, created_at, updated_at FROM core_roles ORDER BY created_at DESC"
    )
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(roles) => {
            let mut role_responses = Vec::new();
            for r in roles {
                // 获取每个角色的权限数量
                let perm_count: i64 = sqlx::query_scalar(
                    "SELECT COUNT(*) FROM core_role_permissions WHERE role_id = $1",
                )
                .bind(r.id)
                .fetch_one(&state.pool)
                .await
                .unwrap_or(0);

                role_responses.push(RoleResponse {
                    id: r.id.to_string(),
                    name: r.name,
                    description: r.description,
                    created_at: r.created_at.map(|t| t.to_string()),
                    permission_count: perm_count,
                });
            }

            Json(serde_json::json!({
                "success": true,
                "message": "获取角色列表成功",
                "data": role_responses
            }))
        }
        Err(e) => {
            tracing::error!("Failed to fetch roles: {}", e);
            Json(topems_shared_core::response::error_value(
                500,
                &format!("获取角色列表失败: {}", e),
            ))
        }
    }
}

pub async fn create_role(
    State(state): State<AppState>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!("IAM role create_role called with: {:?}", payload);

    let name = match payload.get("name").and_then(|v| v.as_str()) {
        Some(n) => n.to_string(),
        None => {
            return Json(topems_shared_core::response::error_value(
                400,
                "角色名称不能为空",
            ));
        }
    };

    let description = payload
        .get("description")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let permission_ids: Vec<String> = serde_json::from_value(
        payload
            .get("permission_ids")
            .cloned()
            .unwrap_or(serde_json::Value::Array(vec![])),
    )
    .unwrap_or_default();

    // 检查角色名是否已存在
    let exists: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM core_roles WHERE deleted_at IS NULL AND name = $1)",
    )
    .bind(&name)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(false);

    if exists {
        return Json(topems_shared_core::response::error_value(
            409,
            "角色名已存在",
        ));
    }

    let role_id = Uuid::new_v4();

    // 事务创建角色和权限关联
    let mut tx = match state.pool.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!("开始事务失败: {}", e);
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("创建角色失败: {}", e),
            ));
        }
    };

    // 创建角色
    if let Err(e) = sqlx::query(
        "INSERT INTO core_roles (id, name, description, tenant_id, created_at, updated_at) VALUES ($1, $2, $3, '00000000-0000-0000-0000-000000000001', NOW(), NOW())"
    )
    .bind(role_id)
    .bind(&name)
    .bind(&description)
    .execute(&mut *tx)
    .await
    {
        let _ = tx.rollback().await;
        tracing::error!("创建角色失败: {}", e);
        return Json(topems_shared_core::response::error_value(500, &format!("创建角色失败: {}", e)));
    }

    // 添加权限关联
    for perm_id in &permission_ids {
        if let Ok(perm_uuid) = Uuid::parse_str(perm_id) {
            let _ = sqlx::query(
                "INSERT INTO core_role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING"
            )
            .bind(role_id)
            .bind(perm_uuid)
            .execute(&mut *tx)
            .await;
        }
    }

    if let Err(e) = tx.commit().await {
        tracing::error!("提交事务失败: {}", e);
        return Json(topems_shared_core::response::error_value(
            500,
            &format!("创建角色失败: {}", e),
        ));
    }

    tracing::info!("创建角色成功: {}", name);

    Json(serde_json::json!({
        "success": true,
        "message": "创建角色成功",
        "data": {
            "id": role_id.to_string(),
            "name": name,
            "description": description
        }
    }))
}

pub async fn get_role(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("IAM role get_role called with id: {}", id);

    let role_uuid = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => {
            return Json(topems_shared_core::response::error_value(
                400,
                "无效的角色ID格式",
            ));
        }
    };

    let role = sqlx::query_as::<_, RoleRow>(
        "SELECT id, name, description, tenant_id, created_at, updated_at FROM core_roles WHERE deleted_at IS NULL AND id = $1"
    )
    .bind(role_uuid)
    .fetch_optional(&state.pool)
    .await;

    match role {
        Ok(Some(r)) => {
            // 获取角色的权限列表
            let permissions: Vec<String> = sqlx::query_scalar(
                r#"
                SELECT p.code FROM core_permissions p
                INNER JOIN core_role_permissions rp ON p.id = rp.permission_id
                WHERE rp.role_id = $1
                ORDER BY p.code
                "#,
            )
            .bind(role_uuid)
            .fetch_all(&state.pool)
            .await
            .unwrap_or_default();

            Json(serde_json::json!({
                "success": true,
                "message": "获取角色成功",
                "data": {
                    "id": r.id.to_string(),
                    "name": r.name,
                    "description": r.description,
                    "created_at": r.created_at.map(|t| t.to_string()),
                    "permissions": permissions
                }
            }))
        }
        Ok(None) => Json(topems_shared_core::response::error_value(404, "角色不存在")),
        Err(e) => {
            tracing::error!("获取角色失败: {}", e);
            Json(topems_shared_core::response::error_value(
                500,
                &format!("获取角色失败: {}", e),
            ))
        }
    }
}

pub async fn update_role(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    tracing::info!(
        "IAM role update_role called with id: {} and payload: {:?}",
        id,
        payload
    );

    let role_uuid = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => {
            return Json(topems_shared_core::response::error_value(
                400,
                "无效的角色ID格式",
            ));
        }
    };

    // 检查角色是否存在
    let exists: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM core_roles WHERE deleted_at IS NULL AND id = $1)",
    )
    .bind(role_uuid)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(false);

    if !exists {
        return Json(topems_shared_core::response::error_value(404, "角色不存在"));
    }

    let name = payload
        .get("name")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let description = payload
        .get("description")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let permission_ids: Option<Vec<String>> = serde_json::from_value(
        payload
            .get("permission_ids")
            .cloned()
            .unwrap_or(serde_json::Value::Null),
    )
    .ok();

    // 事务更新角色和权限
    let mut tx = match state.pool.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!("开始事务失败: {}", e);
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("更新角色失败: {}", e),
            ));
        }
    };

    // 更新角色信息
    if let Some(name) = &name {
        if let Err(e) =
            sqlx::query("UPDATE core_roles SET name = $1, updated_at = NOW() WHERE id = $2")
                .bind(name)
                .bind(role_uuid)
                .execute(&mut *tx)
                .await
        {
            let _ = tx.rollback().await;
            tracing::error!("更新角色名称失败: {}", e);
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("更新角色失败: {}", e),
            ));
        }
    }

    if let Some(desc) = &description {
        if let Err(e) =
            sqlx::query("UPDATE core_roles SET description = $1, updated_at = NOW() WHERE id = $2")
                .bind(desc)
                .bind(role_uuid)
                .execute(&mut *tx)
                .await
        {
            let _ = tx.rollback().await;
            tracing::error!("更新角色描述失败: {}", e);
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("更新角色失败: {}", e),
            ));
        }
    }

    // 更新权限关联
    if let Some(perm_ids) = permission_ids {
        // 删除现有权限关联
        if let Err(e) = sqlx::query("DELETE FROM core_role_permissions WHERE role_id = $1")
            .bind(role_uuid)
            .execute(&mut *tx)
            .await
        {
            let _ = tx.rollback().await;
            tracing::error!("删除角色权限关联失败: {}", e);
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("更新角色权限失败: {}", e),
            ));
        }

        // 添加新的权限关联
        for perm_id in &perm_ids {
            if let Ok(perm_uuid) = Uuid::parse_str(perm_id) {
                let _ = sqlx::query(
                    "INSERT INTO core_role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING"
                )
                .bind(role_uuid)
                .bind(perm_uuid)
                .execute(&mut *tx)
                .await;
            }
        }
    }

    if let Err(e) = tx.commit().await {
        tracing::error!("提交事务失败: {}", e);
        return Json(topems_shared_core::response::error_value(
            500,
            &format!("更新角色失败: {}", e),
        ));
    }

    tracing::info!("更新角色成功: {}", id);

    Json(serde_json::json!({
        "success": true,
        "message": "更新角色成功",
        "data": null
    }))
}

pub async fn delete_role(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    tracing::info!("IAM role delete_role called with id: {}", id);

    let role_uuid = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => {
            return Json(topems_shared_core::response::error_value(
                400,
                "无效的角色ID格式",
            ));
        }
    };

    // 检查是否是系统内置角色（不能删除）
    let role_name: Option<String> =
        sqlx::query_scalar("SELECT name FROM core_roles WHERE deleted_at IS NULL AND id = $1")
            .bind(role_uuid)
            .fetch_optional(&state.pool)
            .await
            .unwrap_or(None);

    if let Some(name) = &role_name {
        if ["superadmin", "admin"].contains(&name.as_str()) {
            return Json(topems_shared_core::response::error_value(
                403,
                "不能删除系统内置角色",
            ));
        }
    }

    // 检查是否有用户使用该角色
    let user_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM core_user_roles WHERE role_id = $1")
            .bind(role_uuid)
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);

    if user_count > 0 {
        return Json(topems_shared_core::response::error_value(
            409,
            &format!("该角色已被 {} 个用户使用，请先移除用户关联", user_count),
        ));
    }

    // 删除角色权限关联
    if let Err(e) = sqlx::query("DELETE FROM core_role_permissions WHERE role_id = $1")
        .bind(role_uuid)
        .execute(&state.pool)
        .await
    {
        tracing::error!("删除角色权限关联失败: {}", e);
        return Json(topems_shared_core::response::error_value(
            500,
            &format!("删除角色失败: {}", e),
        ));
    }

    // 删除角色
    if let Err(e) = sqlx::query("UPDATE core_roles SET deleted_at = NOW() WHERE id = $1")
        .bind(role_uuid)
        .execute(&state.pool)
        .await
    {
        tracing::error!("删除角色失败: {}", e);
        return Json(topems_shared_core::response::error_value(
            500,
            &format!("删除角色失败: {}", e),
        ));
    }

    tracing::info!("删除角色成功: {}", id);

    Json(serde_json::json!({
        "success": true,
        "message": "删除角色成功",
        "data": null
    }))
}
