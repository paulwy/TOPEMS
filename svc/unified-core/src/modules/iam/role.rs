//! Role submodule - Role management handlers

use crate::AppState;
use axum::{
    extract::{Path, State},
    Extension, Json,
};
use serde::{Deserialize, Serialize};
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use uuid::Uuid;

use crate::modules::iam::tenant_scope::{self, IamScope, RoleTarget};

fn json_error(code: u16, message: &str) -> Json<serde_json::Value> {
    Json(topems_shared_core::response::error_value(code, message))
}

/// 唯一约束冲突（SQLSTATE 23505）。
///
/// `core_roles.name` 上的唯一约束是全局的：租户通道内的 `EXISTS` 只能看到
/// 本租户 + 全局角色，看不到其他租户同名角色，因此跨租户重名或重名已软删
/// 角色只会在 INSERT 时暴露为 23505，必须映射为 409 而不是 500。
fn is_unique_violation(err: &sqlx::Error) -> bool {
    matches!(err, sqlx::Error::Database(db) if db.code().as_deref() == Some("23505"))
}

/// 解析并校验待授予的权限 ID：
/// - 非法/不存在的 ID -> 400；
/// - 超出操作者自身权限集或平台层码 -> 403（租户管理员提权边界）。
async fn resolve_permission_ids(
    pool: &sqlx::PgPool,
    claims: &Claims,
    raw_ids: &[String],
) -> Result<Vec<Uuid>, Json<serde_json::Value>> {
    let mut unique: Vec<Uuid> = Vec::new();
    for raw in raw_ids {
        match Uuid::parse_str(raw) {
            Ok(id) => {
                if !unique.contains(&id) {
                    unique.push(id);
                }
            }
            Err(_) => return Err(json_error(400, "无效的权限ID格式")),
        }
    }

    if unique.is_empty() {
        return Ok(unique);
    }

    let rows: Vec<(Uuid, String)> = sqlx::query_as(
        "SELECT id, code FROM public.core_permissions WHERE deleted_at IS NULL AND id = ANY($1)",
    )
    .bind(&unique)
    .fetch_all(pool)
    .await
    .map_err(|e| json_error(500, &format!("查询权限失败: {}", e)))?;

    if rows.len() != unique.len() {
        return Err(json_error(400, "存在无效的权限ID"));
    }

    let codes: Vec<String> = rows.into_iter().map(|(_, code)| code).collect();
    if !tenant_scope::can_grant_codes(claims, &codes) {
        return Err(json_error(403, "不能授予平台层权限或超出自身权限集的权限"));
    }

    Ok(unique)
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
struct RoleRow {
    id: uuid::Uuid,
    name: String,
    description: Option<String>,
    tenant_id: Option<uuid::Uuid>,
    // DB 列为 TIMESTAMP（无时区），与 iam/mod.rs DDL 对齐；用 NaiveDateTime 避免 sqlx 解码 500。
    created_at: Option<chrono::DateTime<chrono::Utc>>,
    updated_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Clone, Serialize)]
struct RoleResponse {
    id: String,
    name: String,
    description: Option<String>,
    created_at: Option<chrono::DateTime<chrono::Utc>>,
    permission_count: i64,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["unified-core:iam:role:read"])),
    path = "/iam/roles",
    tag = "IAM-Roles",
    responses(
        (status = 200, description = "角色列表（含权限数）"),
        (status = 500, description = "服务内部错误"),
    )
)]
pub async fn list_roles(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<serde_json::Value> {
    tracing::info!("IAM role list_roles called");

    let scope_kind = match tenant_scope::iam_read_scope(&claims) {
        Ok(s) => s,
        Err(_) => return json_error(403, "缺少租户上下文，无法查看角色"),
    };
    let tenant_filter = match scope_kind {
        IamScope::Platform => None,
        IamScope::Tenant(tenant_id) => Some(tenant_id),
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return json_error(500, "数据库事务上下文缺失");
    };
    let scope_result = match scope_kind {
        IamScope::Platform => state.db.scope_with_system(txn).await,
        IamScope::Tenant(_) => state.db.scope_with(txn).await,
    };
    let mut scope = match scope_result {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("打开角色读作用域失败: {}", e);
            return json_error(500, "获取角色列表失败");
        }
    };

    let roles = sqlx::query_as::<_, RoleRow>(
        "SELECT id, name, description, tenant_id, created_at::timestamptz AS created_at, updated_at::timestamptz AS updated_at FROM public.core_roles WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1 OR tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) ORDER BY created_at DESC",
    )
    .bind(tenant_filter)
    .fetch_all(&mut scope)
    .await;

    let roles = match roles {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch roles: {}", e);
            return json_error(500, "获取角色列表失败");
        }
    };

    let mut role_responses = Vec::new();
    for r in roles {
        let perm_count = match sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM public.core_role_permissions WHERE role_id = $1",
        )
        .bind(r.id)
        .fetch_one(&mut scope)
        .await
        {
            Ok(c) => c,
            Err(e) => {
                tracing::error!("统计角色权限数失败: {}", e);
                return json_error(500, "获取角色列表失败");
            }
        };

        role_responses.push(RoleResponse {
            id: r.id.to_string(),
            name: r.name,
            description: r.description,
            created_at: r.created_at,
            permission_count: perm_count,
        });
    }

    Json(serde_json::json!({
        "success": true,
        "message": "获取角色列表成功",
        "data": role_responses
    }))
}

pub async fn create_role(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
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

    let scope = match tenant_scope::iam_write_scope(&claims, "admin:iam:write") {
        Ok(scope) => scope,
        Err(_) => return json_error(403, "缺少租户上下文，无法创建角色"),
    };

    if tenant_scope::is_reserved_role_name(&name) {
        return json_error(403, "不能创建系统内置角色");
    }

    // 授权上限：任何调用者都不得授予平台层码或超出自身权限集的权限。
    let resolved_permission_ids =
        match resolve_permission_ids(&state.pool, &claims, &permission_ids).await {
            Ok(ids) => ids,
            Err(resp) => return resp,
        };

    let role_id = Uuid::new_v4();
    let tenant_id = match scope {
        IamScope::Platform => claims
            .tenant_id
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok())
            .unwrap_or_else(Uuid::nil),
        IamScope::Tenant(tenant_id) => tenant_id,
    };

    // `core_roles` 是 FORCE RLS 表：裸池无 GUC 时 INSERT 会被 42501 拒绝。
    // 租户管理员写本租户角色走租户通道；平台分支写的是全局/平台角色，
    // tenant-system: 该分支的 `tenant_id` 允许为空/平台值，必须走系统写通道，
    // 且只有 iam_write_scope 判定为 Platform（超管或 admin:iam:write）才会进入。
    let mut guard = txn_arc.lock().await;
    let tx_result = match scope {
        IamScope::Tenant(_) => {
            let Some(txn) = guard.as_mut() else {
                tracing::error!("rls txn missing: RLS 事务中间件未注入");
                return json_error(500, "数据库事务上下文缺失");
            };
            state.db.scope_with(txn).await
        }
        IamScope::Platform => state.db.scope_system().await,
    };
    let mut tx = match tx_result {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!("开始角色写事务失败: {}", e);
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("创建角色失败: {}", e),
            ));
        }
    };

    // 检查角色名是否已存在（在作用域内检查：租户通道能看到本租户角色 + 全局角色）
    let exists: bool = match sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM public.core_roles WHERE deleted_at IS NULL AND name = $1)",
    )
    .bind(&name)
    .fetch_one(&mut tx)
    .await
    {
        Ok(exists) => exists,
        Err(e) => {
            let _ = tx.rollback().await;
            tracing::error!("检查角色名失败: {}", e);
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("创建角色失败: {}", e),
            ));
        }
    };

    if exists {
        let _ = tx.rollback().await;
        return Json(topems_shared_core::response::error_value(
            409,
            "角色名已存在",
        ));
    }

    // 创建角色
    if let Err(e) = sqlx::query(
        "INSERT INTO public.core_roles (id, name, description, tenant_id, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())"
    )
    .bind(role_id)
    .bind(&name)
    .bind(&description)
    .bind(tenant_id)
    .execute(&mut tx)
    .await
    {
        let _ = tx.rollback().await;
        if is_unique_violation(&e) {
            tracing::warn!("创建角色名称冲突: {}", e);
            return Json(topems_shared_core::response::error_value(409, "角色名已存在"));
        }
        tracing::error!("创建角色失败: {}", e);
        return Json(topems_shared_core::response::error_value(500, &format!("创建角色失败: {}", e)));
    }

    // 添加权限关联
    for perm_uuid in &resolved_permission_ids {
        let _ = sqlx::query(
            "INSERT INTO public.core_role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING"
        )
        .bind(role_id)
        .bind(perm_uuid)
        .execute(&mut tx)
        .await;
    }

    if let Err(e) = tx.commit().await {
        tracing::error!("提交事务失败: {}", e);
        return Json(topems_shared_core::response::error_value(
            500,
            &format!("创建角色失败: {}", e),
        ));
    }

    topems_shared_auth::invalidate_all_permission_caches();
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["unified-core:iam:role:read"])),
    path = "/iam/roles/{id}",
    tag = "IAM-Roles",
    params(("id" = String, Path, description = "角色 ID")),
    responses(
        (status = 200, description = "角色详情"),
        (status = 400, description = "无效的角色ID格式"),
        (status = 404, description = "角色不存在"),
    )
)]
pub async fn get_role(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
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

    let scope = match tenant_scope::iam_read_scope(&claims) {
        Ok(scope) => scope,
        Err(_) => return json_error(403, "缺少租户上下文，无法查看角色"),
    };
    let tenant_filter = match scope {
        IamScope::Platform => None,
        IamScope::Tenant(tenant_id) => Some(tenant_id),
    };

    // 与 list_roles 同口径：租户域角色必须经租户读通道才可见。
    let mut guard = txn_arc.lock().await;
    let tx_result = match scope {
        IamScope::Platform => state.db.scope_read_system().await,
        IamScope::Tenant(_) => {
            let Some(txn) = guard.as_mut() else {
                tracing::error!("rls txn missing: RLS 事务中间件未注入");
                return json_error(500, "数据库事务上下文缺失");
            };
            state.db.scope_with(txn).await
        }
    };
    let mut tx = match tx_result {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!("打开角色读作用域失败: {}", e);
            return json_error(500, "获取角色失败：缺少租户上下文");
        }
    };

    let role = sqlx::query_as::<_, RoleRow>(
        "SELECT id, name, description, tenant_id, created_at, updated_at FROM public.core_roles WHERE deleted_at IS NULL AND id = $1 AND ($2::uuid IS NULL OR tenant_id = $2::uuid OR tenant_id = '00000000-0000-0000-0000-000000000000'::uuid)"
    )
    .bind(role_uuid)
    .bind(tenant_filter)
    .fetch_optional(&mut tx)
    .await;

    match role {
        Ok(Some(r)) => {
            // 获取角色的权限列表
            let permissions = match sqlx::query_scalar::<_, String>(
                r#"
                SELECT p.code FROM public.core_permissions p
                INNER JOIN public.core_role_permissions rp ON p.id = rp.permission_id
                WHERE rp.role_id = $1
                ORDER BY p.code
                "#,
            )
            .bind(role_uuid)
            .fetch_all(&mut tx)
            .await
            {
                Ok(v) => v,
                Err(e) => {
                    tracing::error!("查询角色权限失败: {}", e);
                    return json_error(500, "获取角色失败");
                }
            };
            let _ = tx.commit().await;

            Json(serde_json::json!({
                "success": true,
                "message": "获取角色成功",
                "data": {
                    "id": r.id.to_string(),
                    "name": r.name,
                    "description": r.description,
                    "created_at": r.created_at,
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
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
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

    // 写作用域：平台管理员全量；租户管理员仅本租户，缺租户上下文直接拒绝。
    let scope = match tenant_scope::iam_write_scope(&claims, "admin:iam:write") {
        Ok(scope) => scope,
        Err(_) => return json_error(403, "缺少租户上下文，无法更新角色"),
    };

    // 存在性与可写性判定必须走作用域事务：core_roles 是 FORCE RLS 表，
    // 裸池无 GUC 时本租户角色会被过滤成“不存在”，SQL 错误也不得伪装成 404。
    match tenant_scope::check_role_write_target(&state.db, &txn_arc, scope, role_uuid).await {
        Ok(tenant_scope::RoleWriteTarget::Ok) => {}
        Ok(tenant_scope::RoleWriteTarget::NotFound) => {
            return json_error(404, "角色不存在");
        }
        Ok(tenant_scope::RoleWriteTarget::Forbidden) => {
            return json_error(403, "无权修改全局角色，请由平台管理员操作");
        }
        Err(e) => {
            tracing::error!("更新角色前查询角色失败: {}", e);
            return json_error(500, &format!("查询角色失败: {}", e));
        }
    }

    let name = payload
        .get("name")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let description = payload
        .get("description")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let permission_ids: Option<Vec<String>> = match payload.get("permission_ids") {
        None => None,
        Some(value) if value.is_null() => None,
        Some(value) => match serde_json::from_value::<Vec<String>>(value.clone()) {
            Ok(ids) => Some(ids),
            Err(_) => return json_error(400, "permission_ids 格式错误"),
        },
    };

    let resolved_permission_ids = match &permission_ids {
        Some(ids) => match resolve_permission_ids(&state.pool, &claims, ids).await {
            Ok(ids) => Some(ids),
            Err(resp) => return resp,
        },
        None => None,
    };

    // 作用域写事务：core_roles 为 FORCE RLS，裸池事务在严格策略下会 0 行更新。
    let mut guard = txn_arc.lock().await;
    let tx_result = match scope {
        IamScope::Platform => state.db.scope_system().await,
        IamScope::Tenant(_) => {
            let Some(txn) = guard.as_mut() else {
                tracing::error!("rls txn missing: RLS 事务中间件未注入");
                return json_error(500, "数据库事务上下文缺失");
            };
            state.db.scope_with(txn).await
        }
    };
    let mut tx = match tx_result {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!("开始角色写事务失败: {}", e);
            return json_error(500, &format!("更新角色失败: {}", e));
        }
    };

    // 事务内读取当前名称：既做保留名校验，也在角色被并发删除时回 404。
    let current_name: Option<String> = match sqlx::query_scalar(
        "SELECT name FROM public.core_roles WHERE deleted_at IS NULL AND id = $1",
    )
    .bind(role_uuid)
    .fetch_optional(&mut tx)
    .await
    {
        Ok(row) => row,
        Err(e) => {
            let _ = tx.rollback().await;
            tracing::error!("查询角色失败: {}", e);
            return json_error(500, &format!("查询角色失败: {}", e));
        }
    };
    let current_name = match current_name {
        Some(name) => name,
        None => {
            let _ = tx.rollback().await;
            return json_error(404, "角色不存在");
        }
    };

    if let Some(new_name) = &name {
        if tenant_scope::is_reserved_role_name(new_name) && new_name != &current_name {
            let _ = tx.rollback().await;
            return json_error(403, "不能使用系统内置角色名");
        }
        if new_name != &current_name {
            let name_exists: bool = match sqlx::query_scalar(
                "SELECT EXISTS(SELECT 1 FROM public.core_roles WHERE deleted_at IS NULL AND name = $1 AND id <> $2)",
            )
            .bind(new_name)
            .bind(role_uuid)
            .fetch_one(&mut tx)
            .await
            {
                Ok(v) => v,
                Err(e) => {
                    let _ = tx.rollback().await;
                    tracing::error!("检查角色名失败: {}", e);
                    return json_error(500, &format!("检查角色名失败: {}", e));
                }
            };
            if name_exists {
                let _ = tx.rollback().await;
                return json_error(409, "角色名已存在");
            }
        }
    }

    // 更新角色信息（作用域事务内不再附加 tenant_id 谓词；行数必须为 1）
    if let Some(name) = &name {
        match sqlx::query(
            "UPDATE public.core_roles SET name = $1, updated_at = NOW() WHERE id = $2 AND deleted_at IS NULL",
        )
        .bind(name)
        .bind(role_uuid)
        .execute(&mut tx)
        .await
        {
            Ok(result) if result.rows_affected() == 1 => {}
            Ok(_) => {
                let _ = tx.rollback().await;
                return json_error(409, "角色已被删除或状态已变更，请刷新后重试");
            }
            Err(e) => {
                let _ = tx.rollback().await;
                tracing::error!("更新角色名称失败: {}", e);
                return json_error(500, &format!("更新角色失败: {}", e));
            }
        }
    }

    if let Some(desc) = &description {
        match sqlx::query(
            "UPDATE public.core_roles SET description = $1, updated_at = NOW() WHERE id = $2 AND deleted_at IS NULL",
        )
        .bind(desc)
        .bind(role_uuid)
        .execute(&mut tx)
        .await
        {
            Ok(result) if result.rows_affected() == 1 => {}
            Ok(_) => {
                let _ = tx.rollback().await;
                return json_error(409, "角色已被删除或状态已变更，请刷新后重试");
            }
            Err(e) => {
                let _ = tx.rollback().await;
                tracing::error!("更新角色描述失败: {}", e);
                return json_error(500, &format!("更新角色失败: {}", e));
            }
        }
    }

    // 更新权限关联（已在上方完成“不得超出自身权限集”的校验）
    if let Some(perm_ids) = resolved_permission_ids {
        // 删除现有权限关联
        if let Err(e) = sqlx::query("DELETE FROM public.core_role_permissions WHERE role_id = $1")
            .bind(role_uuid)
            .execute(&mut tx)
            .await
        {
            let _ = tx.rollback().await;
            tracing::error!("删除角色权限关联失败: {}", e);
            return json_error(500, &format!("更新角色权限失败: {}", e));
        }

        // 添加新的权限关联
        for perm_uuid in &perm_ids {
            if let Err(e) = sqlx::query(
                "INSERT INTO public.core_role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING"
            )
            .bind(role_uuid)
            .bind(perm_uuid)
            .execute(&mut tx)
            .await
            {
                let _ = tx.rollback().await;
                tracing::error!("添加角色权限关联失败: {}", e);
                return json_error(500, &format!("更新角色权限失败: {}", e));
            }
        }
    }

    if let Err(e) = tx.commit().await {
        tracing::error!("提交事务失败: {}", e);
        return json_error(500, &format!("更新角色失败: {}", e));
    }

    topems_shared_auth::invalidate_all_permission_caches();
    tracing::info!("更新角色成功: {}", id);

    Json(serde_json::json!({
        "success": true,
        "message": "更新角色成功",
        "data": null
    }))
}

pub async fn delete_role(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
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

    // 写作用域：平台管理员全量；租户管理员仅本租户，缺租户上下文直接拒绝。
    let scope = match tenant_scope::iam_write_scope(&claims, "admin:iam:delete") {
        Ok(scope) => scope,
        Err(_) => return json_error(403, "缺少租户上下文，无法删除角色"),
    };

    // 存在性与可写性判定走作用域事务：裸池无 GUC 时本租户角色被 RLS 过滤成“不存在”。
    match tenant_scope::check_role_write_target(&state.db, &txn_arc, scope, role_uuid).await {
        Ok(tenant_scope::RoleWriteTarget::Ok) => {}
        Ok(tenant_scope::RoleWriteTarget::NotFound) => {
            return json_error(404, "角色不存在");
        }
        Ok(tenant_scope::RoleWriteTarget::Forbidden) => {
            return json_error(403, "无权修改全局角色，请由平台管理员操作");
        }
        Err(e) => {
            tracing::error!("删除角色前查询角色失败: {}", e);
            return json_error(500, &format!("查询角色失败: {}", e));
        }
    }

    // 作用域写事务：core_roles 为 FORCE RLS，裸池事务无法删除租户域角色。
    let mut guard = txn_arc.lock().await;
    let tx_result = match scope {
        IamScope::Platform => state.db.scope_system().await,
        IamScope::Tenant(_) => {
            let Some(txn) = guard.as_mut() else {
                tracing::error!("rls txn missing: RLS 事务中间件未注入");
                return json_error(500, "数据库事务上下文缺失");
            };
            state.db.scope_with(txn).await
        }
    };
    let mut tx = match tx_result {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!("开始角色删除事务失败: {}", e);
            return json_error(500, &format!("删除角色失败: {}", e));
        }
    };

    // 事务内读取角色名：拦截系统内置角色；并发已删除时回 404。
    let role_name: Option<String> = match sqlx::query_scalar(
        "SELECT name FROM public.core_roles WHERE deleted_at IS NULL AND id = $1",
    )
    .bind(role_uuid)
    .fetch_optional(&mut tx)
    .await
    {
        Ok(row) => row,
        Err(e) => {
            let _ = tx.rollback().await;
            tracing::error!("查询角色失败: {}", e);
            return json_error(500, &format!("查询角色失败: {}", e));
        }
    };

    let role_name = match role_name {
        Some(name) => name,
        None => {
            let _ = tx.rollback().await;
            return json_error(404, "角色不存在");
        }
    };

    if tenant_scope::is_reserved_role_name(&role_name) {
        let _ = tx.rollback().await;
        return json_error(403, "不能删除系统内置角色");
    }

    // 检查是否有用户使用该角色（错误不得吞成 0 后继续删除）
    let user_count: i64 =
        match sqlx::query_scalar("SELECT COUNT(*) FROM public.core_user_roles WHERE role_id = $1")
            .bind(role_uuid)
            .fetch_one(&mut tx)
            .await
        {
            Ok(count) => count,
            Err(e) => {
                let _ = tx.rollback().await;
                tracing::error!("检查角色使用情况失败: {}", e);
                return json_error(500, &format!("删除角色失败: {}", e));
            }
        };

    if user_count > 0 {
        let _ = tx.rollback().await;
        return json_error(
            409,
            &format!("该角色已被 {} 个用户使用，请先移除用户关联", user_count),
        );
    }

    // 删除角色权限关联
    if let Err(e) = sqlx::query("DELETE FROM public.core_role_permissions WHERE role_id = $1")
        .bind(role_uuid)
        .execute(&mut tx)
        .await
    {
        let _ = tx.rollback().await;
        tracing::error!("删除角色权限关联失败: {}", e);
        return json_error(500, &format!("删除角色失败: {}", e));
    }

    // 删除角色（软删除；作用域事务内不再附加 tenant_id 谓词，行数必须为 1）
    match sqlx::query(
        "UPDATE public.core_roles SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL",
    )
    .bind(role_uuid)
    .execute(&mut tx)
    .await
    {
        Ok(result) if result.rows_affected() == 1 => {}
        Ok(_) => {
            let _ = tx.rollback().await;
            return json_error(409, "角色已被删除或状态已变更，请刷新后重试");
        }
        Err(e) => {
            let _ = tx.rollback().await;
            tracing::error!("删除角色失败: {}", e);
            return json_error(500, &format!("删除角色失败: {}", e));
        }
    }

    if let Err(e) = tx.commit().await {
        tracing::error!("提交事务失败: {}", e);
        return json_error(500, &format!("删除角色失败: {}", e));
    }

    topems_shared_auth::invalidate_all_permission_caches();
    tracing::info!("删除角色成功: {}", id);

    Json(serde_json::json!({
        "success": true,
        "message": "删除角色成功",
        "data": null
    }))
}

/// GET /roles/{id}/permissions — 列出角色已授权的权限 code 列表
pub async fn get_role_permissions(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    let role_uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(topems_shared_core::response::error_value(
                400,
                "无效的角色ID格式",
            ));
        }
    };

    let scope = match tenant_scope::iam_read_scope(&claims) {
        Ok(scope) => scope,
        Err(_) => return json_error(403, "缺少租户上下文，无法查看角色权限"),
    };

    match tenant_scope::check_role_target(&state.db, &txn_arc, scope, role_uuid).await {
        Ok(RoleTarget::Ok) => {}
        // 集合类：角色不存在或跨租户/平台角色时返回空列表，不泄露存在性
        Ok(RoleTarget::NotFound) => {
            return Json(serde_json::json!({
                "success": true,
                "message": "获取角色权限成功",
                "data": []
            }));
        }
        Err(e) => {
            tracing::error!("Failed to check role target scope: {}", e);
            return json_error(500, &format!("查询角色失败: {}", e));
        }
    }

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return json_error(500, "数据库事务上下文缺失");
    };
    let mut rls_scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("打开 IAM 角色作用域失败: {}", e);
            return json_error(500, &format!("查询角色失败: {}", e));
        }
    };

    // 集合类：角色不存在时返回空列表（HTTP 200），不裸 404
    let permissions: Vec<String> = sqlx::query_scalar(
        r#"
        SELECT p.code FROM public.core_permissions p
        INNER JOIN public.core_role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role_id = $1
        ORDER BY p.code
        "#,
    )
    .bind(role_uuid)
    .fetch_all(&mut rls_scope)
    .await
    .unwrap_or_default();

    Json(serde_json::json!({
        "success": true,
        "message": "获取角色权限成功",
        "data": permissions
    }))
}

/// POST /roles/{id}/permissions — 为角色授权权限
/// body 兼容三种形态：{permission_id}、{permission_code}、{permission_ids:[...]}
pub async fn add_role_permission(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    let role_uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(topems_shared_core::response::error_value(
                400,
                "无效的角色ID格式",
            ));
        }
    };

    let scope = match tenant_scope::iam_write_scope(&claims, "admin:iam:write") {
        Ok(scope) => scope,
        Err(_) => return json_error(403, "缺少租户上下文，无法授权角色"),
    };

    // 写路径只允许本租户角色：全局角色为所有租户共用，租户管理员不得改动其权限面。
    match tenant_scope::check_role_write_target(&state.db, &txn_arc, scope, role_uuid).await {
        Ok(tenant_scope::RoleWriteTarget::Ok) => {}
        Ok(tenant_scope::RoleWriteTarget::NotFound) => {
            return json_error(404, "角色不存在");
        }
        Ok(tenant_scope::RoleWriteTarget::Forbidden) => {
            return json_error(403, "无权修改全局角色，请由平台管理员操作");
        }
        Err(e) => {
            tracing::error!("Failed to check role target scope: {}", e);
            return json_error(500, &format!("查询角色失败: {}", e));
        }
    }

    let mut raw_ids: Vec<String> = Vec::new();

    if let Some(values) = payload.get("permission_ids").and_then(|v| v.as_array()) {
        for value in values {
            match value.as_str() {
                Some(id) => raw_ids.push(id.to_string()),
                None => return json_error(400, "permission_ids 格式错误"),
            }
        }
    }
    if let Some(id) = payload.get("permission_id").and_then(|v| v.as_str()) {
        raw_ids.push(id.to_string());
    }
    if let Some(code) = payload.get("permission_code").and_then(|v| v.as_str()) {
        let id: Option<Uuid> = sqlx::query_scalar(
            "SELECT id FROM public.core_permissions WHERE code = $1 AND deleted_at IS NULL",
        )
        .bind(code)
        .fetch_optional(&state.pool)
        .await
        .ok()
        .flatten();
        match id {
            Some(id) => raw_ids.push(id.to_string()),
            None => return json_error(400, "无效的权限标识"),
        }
    }

    if raw_ids.is_empty() {
        return json_error(400, "无效的权限标识");
    }

    // 授权上限：租户管理员只能授予自身权限集内、且非平台层的权限。
    let permission_ids = match resolve_permission_ids(&state.pool, &claims, &raw_ids).await {
        Ok(ids) => ids,
        Err(resp) => return resp,
    };

    let mut tx = match state.pool.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!("开始事务失败: {}", e);
            return json_error(500, &format!("角色权限授权失败: {}", e));
        }
    };

    for permission_id in &permission_ids {
        if let Err(e) = sqlx::query(
            "INSERT INTO public.core_role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        )
        .bind(role_uuid)
        .bind(permission_id)
        .execute(&mut *tx)
        .await
        {
            let _ = tx.rollback().await;
            tracing::error!("角色权限授权失败: {}", e);
            return json_error(500, &format!("角色权限授权失败: {}", e));
        }
    }

    if let Err(e) = tx.commit().await {
        tracing::error!("提交事务失败: {}", e);
        return json_error(500, &format!("角色权限授权失败: {}", e));
    }

    topems_shared_auth::invalidate_all_permission_caches();
    Json(serde_json::json!({
        "success": true,
        "message": "角色权限授权成功",
        "data": null
    }))
}

/// DELETE /roles/{id}/permissions/{permission_id} — 移除角色的权限授权
pub async fn remove_role_permission(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((id, permission_id)): Path<(String, String)>,
) -> Json<serde_json::Value> {
    let role_uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(topems_shared_core::response::error_value(
                400,
                "无效的角色ID格式",
            ));
        }
    };
    let perm_uuid = match Uuid::parse_str(&permission_id) {
        Ok(u) => u,
        Err(_) => {
            return Json(topems_shared_core::response::error_value(
                400,
                "无效的权限ID格式",
            ));
        }
    };

    let scope = match tenant_scope::iam_write_scope(&claims, "admin:iam:delete") {
        Ok(scope) => scope,
        Err(_) => return json_error(403, "缺少租户上下文，无法移除角色权限"),
    };

    // 写路径只允许本租户角色：全局角色为所有租户共用，租户管理员不得改动其权限面。
    match tenant_scope::check_role_write_target(&state.db, &txn_arc, scope, role_uuid).await {
        Ok(tenant_scope::RoleWriteTarget::Ok) => {}
        Ok(tenant_scope::RoleWriteTarget::NotFound) => {
            return json_error(404, "角色不存在");
        }
        Ok(tenant_scope::RoleWriteTarget::Forbidden) => {
            return json_error(403, "无权修改全局角色，请由平台管理员操作");
        }
        Err(e) => {
            tracing::error!("Failed to check role target scope: {}", e);
            return json_error(500, &format!("查询角色失败: {}", e));
        }
    }

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return json_error(500, "数据库事务上下文缺失");
    };
    let mut rls_scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("打开 IAM 角色作用域失败: {}", e);
            return json_error(500, &format!("查询角色失败: {}", e));
        }
    };

    let result = sqlx::query(
        "DELETE FROM public.core_role_permissions WHERE role_id = $1 AND permission_id = $2",
    )
    .bind(role_uuid)
    .bind(perm_uuid)
    .execute(&mut rls_scope)
    .await;

    match result {
        Ok(_) => {
            topems_shared_auth::invalidate_all_permission_caches();
            Json(serde_json::json!({
                "success": true,
                "message": "角色权限移除成功",
                "data": null
            }))
        }
        Err(e) => {
            tracing::error!("角色权限移除失败: {}", e);
            Json(topems_shared_core::response::error_value(
                500,
                &format!("角色权限移除失败: {}", e),
            ))
        }
    }
}
