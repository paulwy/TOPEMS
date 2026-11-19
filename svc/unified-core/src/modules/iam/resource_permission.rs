//! Resource permission submodule - 资源级 ACL 的授予 / 撤销写入路径。
//!
//! 复用 `iam.resource_permissions`：
//! - `role_id` 非空 = 角色 → 资源批量授予（主路径，只表达 allow）；
//! - `user_id` 非空 = 用户显式例外（次要路径，`effect` 可为 allow / deny）；
//! - `scope` = platform（tenant_id 为 NULL，仅系统通道可见）/ tenant（本租户可见）。
//!
//! 撤销一律写 `deleted_at`，保留审计；所有读写都带 `deleted_at IS NULL`。
//! 判定顺序见 `permission_verify::decide_resource_permission`。

use crate::modules::iam::tenant_scope::{self, IamScope};
use crate::AppState;
use axum::{
    extract::{Path, State},
    Extension, Json,
};
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use uuid::Uuid;

const MAX_RESOURCE_IDS: usize = 200;
const MAX_ACTIONS: usize = 32;
const PLATFORM_SCOPE: &str = "platform";
const TENANT_SCOPE: &str = "tenant";

fn json_error(code: u16, message: &str) -> Json<serde_json::Value> {
    Json(topems_shared_core::response::error_value(code, message))
}

/// resource_type / action 的字符白名单：避免空白、通配符等把 ACL 键写脏。
fn is_valid_token(value: &str, max_len: usize) -> bool {
    !value.is_empty()
        && value.len() <= max_len
        && value
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '_' | '-' | ':' | '.'))
}

struct ResourceBatch {
    resource_type: String,
    resource_ids: Vec<Uuid>,
    actions: Vec<String>,
}

fn parse_batch(payload: &serde_json::Value) -> Result<ResourceBatch, Json<serde_json::Value>> {
    let resource_type = payload
        .get("resource_type")
        .and_then(|v| v.as_str())
        .map(str::trim)
        .unwrap_or_default();
    if !is_valid_token(resource_type, 64) {
        return Err(json_error(400, "resource_type 格式错误"));
    }

    let raw_ids = payload
        .get("resource_ids")
        .and_then(|v| v.as_array())
        .ok_or_else(|| json_error(400, "resource_ids 必须为数组"))?;
    if raw_ids.is_empty() {
        return Err(json_error(400, "resource_ids 不能为空"));
    }
    if raw_ids.len() > MAX_RESOURCE_IDS {
        return Err(json_error(
            400,
            &format!("单次最多授予 {} 个资源", MAX_RESOURCE_IDS),
        ));
    }

    let mut resource_ids: Vec<Uuid> = Vec::new();
    for value in raw_ids {
        let raw = value
            .as_str()
            .ok_or_else(|| json_error(400, "resource_ids 元素必须为字符串"))?;
        let id =
            Uuid::parse_str(raw).map_err(|_| json_error(400, "resource_ids 含无效的资源ID"))?;
        if !resource_ids.contains(&id) {
            resource_ids.push(id);
        }
    }

    let raw_actions = payload
        .get("actions")
        .and_then(|v| v.as_array())
        .ok_or_else(|| json_error(400, "actions 必须为数组"))?;
    if raw_actions.is_empty() {
        return Err(json_error(400, "actions 不能为空"));
    }
    if raw_actions.len() > MAX_ACTIONS {
        return Err(json_error(
            400,
            &format!("单次最多授予 {} 种动作", MAX_ACTIONS),
        ));
    }

    let mut actions: Vec<String> = Vec::new();
    for value in raw_actions {
        let action = value
            .as_str()
            .map(str::trim)
            .ok_or_else(|| json_error(400, "actions 元素必须为字符串"))?;
        if !is_valid_token(action, 128) {
            return Err(json_error(400, "actions 含非法动作标识"));
        }
        if !actions.iter().any(|a| a == action) {
            actions.push(action.to_string());
        }
    }

    Ok(ResourceBatch {
        resource_type: resource_type.to_string(),
        resource_ids,
        actions,
    })
}

fn parse_effect(payload: &serde_json::Value) -> Result<&'static str, Json<serde_json::Value>> {
    match payload.get("effect").and_then(|v| v.as_str()) {
        Some("allow") => Ok("allow"),
        Some("deny") => Ok("deny"),
        _ => Err(json_error(400, "effect 必须为 allow 或 deny")),
    }
}

/// 授予范围：平台级授予 tenant_id 为空，只有系统通道可见；
/// 租户级授予必须带 tenant_id。
struct GrantScope {
    scope: &'static str,
    tenant_id: Option<Uuid>,
}

fn resolve_grant_scope(scope: IamScope, role_tenant: Option<Uuid>) -> GrantScope {
    match (scope, role_tenant) {
        (IamScope::Tenant(tenant_id), _) => GrantScope {
            scope: TENANT_SCOPE,
            tenant_id: Some(tenant_id),
        },
        (IamScope::Platform, Some(tenant_id)) if !tenant_id.is_nil() => GrantScope {
            scope: TENANT_SCOPE,
            tenant_id: Some(tenant_id),
        },
        // 全局角色在平台通道授予：平台级 ACL，tenant_id 为 NULL
        (IamScope::Platform, _) => GrantScope {
            scope: PLATFORM_SCOPE,
            tenant_id: None,
        },
    }
}

/// POST /iam/roles/{id}/resource-permissions — 角色 → 资源批量授予（主入口）。
#[utoipa::path(
    post,
    security(("BearerAuth" = ["unified-core:iam:role:write"])),
    path = "/iam/roles/{id}/resource-permissions",
    tag = "IAM-ResourceAcl",
    params(("id" = String, Path, description = "角色 ID")),
    request_body = serde_json::Value,
    responses(
        (status = 200, description = "角色资源授权成功"),
        (status = 400, description = "参数错误"),
        (status = 403, description = "无权限修改该角色"),
        (status = 404, description = "角色不存在"),
    )
)]
pub async fn grant_role_resource_permissions(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(role_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    let role_uuid = match Uuid::parse_str(&role_id) {
        Ok(id) => id,
        Err(_) => return json_error(400, "无效的角色ID格式"),
    };
    let batch = match parse_batch(&payload) {
        Ok(batch) => batch,
        Err(resp) => return resp,
    };

    let scope = match tenant_scope::iam_write_scope(&claims, "admin:iam:write") {
        Ok(scope) => scope,
        Err(_) => return json_error(403, "缺少租户上下文，无法授予角色资源权限"),
    };

    match tenant_scope::check_role_write_target(&state.db, &txn_arc, scope, role_uuid).await {
        Ok(tenant_scope::RoleWriteTarget::Ok) => {}
        Ok(tenant_scope::RoleWriteTarget::NotFound) => return json_error(404, "角色不存在"),
        Ok(tenant_scope::RoleWriteTarget::Forbidden) => {
            return json_error(403, "无权修改全局角色，请由平台管理员操作");
        }
        Err(e) => {
            tracing::error!("授予角色资源权限前查询角色失败: {}", e);
            return json_error(500, &format!("查询角色失败: {}", e));
        }
    }

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
            tracing::error!("开始角色资源授权事务失败: {}", e);
            return json_error(500, &format!("授予资源权限失败: {}", e));
        }
    };

    let role_tenant: Option<Option<Uuid>> = match sqlx::query_scalar(
        "SELECT tenant_id FROM public.core_roles WHERE deleted_at IS NULL AND id = $1",
    )
    .bind(role_uuid)
    .fetch_optional(&mut tx)
    .await
    {
        Ok(Some(row)) => row,
        Ok(None) => {
            let _ = tx.rollback().await;
            return json_error(404, "角色不存在");
        }
        Err(e) => {
            let _ = tx.rollback().await;
            tracing::error!("查询角色租户失败: {}", e);
            return json_error(500, &format!("查询角色失败: {}", e));
        }
    };
    // 角色已确认存在；None 表示全局角色
    let grant_scope = resolve_grant_scope(scope, role_tenant.flatten());

    let mut granted = 0u64;
    for resource_id in &batch.resource_ids {
        for action in &batch.actions {
            // 先复活/更新同键授予（软删后重新授予），没有再插入
            let revived = sqlx::query(
                r#"
                UPDATE iam.resource_permissions
                   SET deleted_at = NULL, effect = 'allow', scope = $1, tenant_id = $2
                 WHERE role_id = $3
                   AND resource_type = $4
                   AND resource_id = $5
                   AND permission = $6
                   AND scope = $1
                   AND COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid)
                       = COALESCE($2, '00000000-0000-0000-0000-000000000000'::uuid)
                "#,
            )
            .bind(grant_scope.scope)
            .bind(grant_scope.tenant_id)
            .bind(role_uuid)
            .bind(&batch.resource_type)
            .bind(resource_id)
            .bind(action)
            .execute(&mut tx)
            .await;

            let affected = match revived {
                Ok(done) => done.rows_affected(),
                Err(e) => {
                    let _ = tx.rollback().await;
                    tracing::error!("复活角色资源授权失败: {}", e);
                    return json_error(500, &format!("授予资源权限失败: {}", e));
                }
            };
            if affected > 0 {
                granted += affected;
                continue;
            }

            let inserted = sqlx::query(
                r#"
                INSERT INTO iam.resource_permissions
                    (id, resource_type, resource_id, role_id, permission, tenant_id, scope, effect, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, 'allow', NOW())
                "#,
            )
            .bind(Uuid::new_v4())
            .bind(&batch.resource_type)
            .bind(resource_id)
            .bind(role_uuid)
            .bind(action)
            .bind(grant_scope.tenant_id)
            .bind(grant_scope.scope)
            .execute(&mut tx)
            .await;

            match inserted {
                Ok(done) => granted += done.rows_affected(),
                Err(e) => {
                    let _ = tx.rollback().await;
                    tracing::error!("角色资源授权写入失败: {}", e);
                    return json_error(500, &format!("授予资源权限失败: {}", e));
                }
            }
        }
    }

    if let Err(e) = tx.commit().await {
        tracing::error!("提交角色资源授权事务失败: {}", e);
        return json_error(500, &format!("授予资源权限失败: {}", e));
    }

    Json(serde_json::json!({
        "success": true,
        "message": "角色资源授权成功",
        "data": {
            "granted": granted,
            "scope": grant_scope.scope,
            "requested": batch.resource_ids.len() * batch.actions.len()
        }
    }))
}

/// DELETE /iam/roles/{id}/resource-permissions — 撤销角色 → 资源授予（软删，保留审计）。
#[utoipa::path(
    delete,
    security(("BearerAuth" = ["unified-core:iam:role:delete"])),
    path = "/iam/roles/{id}/resource-permissions",
    tag = "IAM-ResourceAcl",
    params(("id" = String, Path, description = "角色 ID")),
    request_body = serde_json::Value,
    responses(
        (status = 200, description = "角色资源权限撤销成功"),
        (status = 400, description = "参数错误"),
        (status = 403, description = "无权限修改该角色"),
        (status = 404, description = "角色不存在"),
    )
)]
pub async fn revoke_role_resource_permissions(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(role_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    let role_uuid = match Uuid::parse_str(&role_id) {
        Ok(id) => id,
        Err(_) => return json_error(400, "无效的角色ID格式"),
    };
    let batch = match parse_batch(&payload) {
        Ok(batch) => batch,
        Err(resp) => return resp,
    };

    let scope = match tenant_scope::iam_write_scope(&claims, "admin:iam:delete") {
        Ok(scope) => scope,
        Err(_) => return json_error(403, "缺少租户上下文，无法撤销角色资源权限"),
    };

    match tenant_scope::check_role_write_target(&state.db, &txn_arc, scope, role_uuid).await {
        Ok(tenant_scope::RoleWriteTarget::Ok) => {}
        Ok(tenant_scope::RoleWriteTarget::NotFound) => return json_error(404, "角色不存在"),
        Ok(tenant_scope::RoleWriteTarget::Forbidden) => {
            return json_error(403, "无权修改全局角色，请由平台管理员操作");
        }
        Err(e) => {
            tracing::error!("撤销角色资源权限前查询角色失败: {}", e);
            return json_error(500, &format!("查询角色失败: {}", e));
        }
    }

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
            tracing::error!("开始角色资源撤销事务失败: {}", e);
            return json_error(500, &format!("撤销资源权限失败: {}", e));
        }
    };

    let role_tenant: Option<Option<Uuid>> = match sqlx::query_scalar(
        "SELECT tenant_id FROM public.core_roles WHERE deleted_at IS NULL AND id = $1",
    )
    .bind(role_uuid)
    .fetch_optional(&mut tx)
    .await
    {
        Ok(Some(row)) => row,
        Ok(None) => {
            let _ = tx.rollback().await;
            return json_error(404, "角色不存在");
        }
        Err(e) => {
            let _ = tx.rollback().await;
            tracing::error!("查询角色租户失败: {}", e);
            return json_error(500, &format!("查询角色失败: {}", e));
        }
    };
    let grant_scope = resolve_grant_scope(scope, role_tenant.flatten());

    let mut revoked = 0u64;
    for resource_id in &batch.resource_ids {
        for action in &batch.actions {
            // 软删保留审计：撤销只写 deleted_at，不物理删除
            let result = sqlx::query(
                r#"
                UPDATE iam.resource_permissions
                   SET deleted_at = NOW()
                 WHERE role_id = $1
                   AND resource_type = $2
                   AND resource_id = $3
                   AND permission = $4
                   AND scope = $5
                   AND COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid)
                       = COALESCE($6, '00000000-0000-0000-0000-000000000000'::uuid)
                   AND deleted_at IS NULL
                "#,
            )
            .bind(role_uuid)
            .bind(&batch.resource_type)
            .bind(resource_id)
            .bind(action)
            .bind(grant_scope.scope)
            .bind(grant_scope.tenant_id)
            .execute(&mut tx)
            .await;

            match result {
                Ok(done) => revoked += done.rows_affected(),
                Err(e) => {
                    let _ = tx.rollback().await;
                    tracing::error!("角色资源权限撤销失败: {}", e);
                    return json_error(500, &format!("撤销资源权限失败: {}", e));
                }
            }
        }
    }

    if let Err(e) = tx.commit().await {
        tracing::error!("提交角色资源撤销事务失败: {}", e);
        return json_error(500, &format!("撤销资源权限失败: {}", e));
    }

    Json(serde_json::json!({
        "success": true,
        "message": "角色资源权限撤销成功",
        "data": {
            "revoked": revoked,
            "scope": grant_scope.scope,
            "requested": batch.resource_ids.len() * batch.actions.len()
        }
    }))
}

/// PUT /iam/users/{user_id}/resource-permissions — 用户显式例外（allow / deny）。
///
/// 显式操作：必须指定 effect，写入后覆盖同键的角色授予结果。
#[utoipa::path(
    put,
    security(("BearerAuth" = ["unified-core:iam:resource_acl:write"])),
    path = "/iam/users/{user_id}/resource-permissions",
    tag = "IAM-ResourceAcl",
    params(("user_id" = String, Path, description = "用户 ID")),
    request_body = serde_json::Value,
    responses(
        (status = 200, description = "用户资源例外设置成功"),
        (status = 400, description = "参数错误或缺少租户上下文"),
        (status = 403, description = "无权限修改该用户的资源例外"),
        (status = 404, description = "用户不存在"),
    )
)]
pub async fn set_user_resource_exception(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(user_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    let user_uuid = match Uuid::parse_str(&user_id) {
        Ok(id) => id,
        Err(_) => return json_error(400, "无效的用户ID格式"),
    };
    let batch = match parse_batch(&payload) {
        Ok(batch) => batch,
        Err(resp) => return resp,
    };
    let effect = match parse_effect(&payload) {
        Ok(effect) => effect,
        Err(resp) => return resp,
    };

    let scope = match tenant_scope::iam_write_scope(&claims, "iam:resource_acl:write") {
        Ok(scope) => scope,
        Err(_) => return json_error(403, "缺少租户上下文，无法设置用户资源例外"),
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
        Ok(tenant_scope::UserTarget::Ok) => {}
        Ok(tenant_scope::UserTarget::NotFound) => return json_error(404, "用户不存在"),
        Ok(tenant_scope::UserTarget::Superuser) => {
            return json_error(403, "无权修改超级管理员的资源例外");
        }
        Err(e) => {
            tracing::error!("设置用户资源例外前查询用户失败: {}", e);
            return json_error(500, &format!("查询用户失败: {}", e));
        }
    }

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
            tracing::error!("开始用户资源例外事务失败: {}", e);
            return json_error(500, &format!("设置资源例外失败: {}", e));
        }
    };

    // 例外记录的租户归属：租户管理员取本租户；平台管理员优先取操作者租户，
    // 否则回落到目标用户的活跃租户成员关系，避免写入租户判定看不见的行。
    let tenant_id = match scope {
        IamScope::Tenant(tenant_id) => Some(tenant_id),
        IamScope::Platform => {
            let from_claims = tenant_scope::tenant_uuid(&claims).filter(|t| !t.is_nil());
            match from_claims {
                Some(tenant_id) => Some(tenant_id),
                None => match sqlx::query_scalar(
                    r#"
                    SELECT tenant_id FROM public.core_tenant_users
                    WHERE user_id = $1 AND status = 'active' AND deleted_at IS NULL
                    ORDER BY tenant_id
                    LIMIT 1
                    "#,
                )
                .bind(user_uuid)
                .fetch_optional(&mut tx)
                .await
                {
                    Ok(row) => row,
                    Err(e) => {
                        let _ = tx.rollback().await;
                        tracing::error!("查询用户租户归属失败: {}", e);
                        return json_error(500, &format!("查询用户租户失败: {}", e));
                    }
                },
            }
        }
    };
    let Some(tenant_id) = tenant_id else {
        let _ = tx.rollback().await;
        return json_error(400, "缺少租户上下文，无法设置用户资源例外");
    };

    let mut affected = 0u64;
    for resource_id in &batch.resource_ids {
        for action in &batch.actions {
            // 同键例外覆盖（含软删行复活），写入即恢复可见
            let updated = sqlx::query(
                r#"
                UPDATE iam.resource_permissions
                   SET effect = $1, scope = 'tenant', tenant_id = $2, deleted_at = NULL
                 WHERE user_id = $3
                   AND role_id IS NULL
                   AND resource_type = $4
                   AND resource_id = $5
                   AND permission = $6
                "#,
            )
            .bind(effect)
            .bind(tenant_id)
            .bind(user_uuid)
            .bind(&batch.resource_type)
            .bind(resource_id)
            .bind(action)
            .execute(&mut tx)
            .await;

            let updated_rows = match updated {
                Ok(done) => done.rows_affected(),
                Err(e) => {
                    let _ = tx.rollback().await;
                    tracing::error!("覆盖用户资源例外失败: {}", e);
                    return json_error(500, &format!("设置资源例外失败: {}", e));
                }
            };
            if updated_rows > 0 {
                affected += updated_rows;
                continue;
            }

            let inserted = sqlx::query(
                r#"
                INSERT INTO iam.resource_permissions
                    (id, resource_type, resource_id, user_id, permission, tenant_id, scope, effect, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, 'tenant', $7, NOW())
                "#,
            )
            .bind(Uuid::new_v4())
            .bind(&batch.resource_type)
            .bind(resource_id)
            .bind(user_uuid)
            .bind(action)
            .bind(tenant_id)
            .bind(effect)
            .execute(&mut tx)
            .await;

            match inserted {
                Ok(done) => affected += done.rows_affected(),
                Err(e) => {
                    let _ = tx.rollback().await;
                    tracing::error!("写入用户资源例外失败: {}", e);
                    return json_error(500, &format!("设置资源例外失败: {}", e));
                }
            }
        }
    }

    if let Err(e) = tx.commit().await {
        tracing::error!("提交用户资源例外事务失败: {}", e);
        return json_error(500, &format!("设置资源例外失败: {}", e));
    }

    Json(serde_json::json!({
        "success": true,
        "message": "用户资源例外设置成功",
        "data": {
            "effect": effect,
            "affected": affected,
            "requested": batch.resource_ids.len() * batch.actions.len()
        }
    }))
}

/// DELETE /iam/users/{user_id}/resource-permissions — 移除用户显式例外（软删，保留审计）。
///
/// 移除后回落到角色授予；无角色授予则默认拒绝。
#[utoipa::path(
    delete,
    security(("BearerAuth" = ["unified-core:iam:resource_acl:delete"])),
    path = "/iam/users/{user_id}/resource-permissions",
    tag = "IAM-ResourceAcl",
    params(("user_id" = String, Path, description = "用户 ID")),
    request_body = serde_json::Value,
    responses(
        (status = 200, description = "用户资源例外移除成功"),
        (status = 400, description = "参数错误"),
        (status = 403, description = "无权限修改该用户的资源例外"),
        (status = 404, description = "用户不存在"),
    )
)]
pub async fn remove_user_resource_exception(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(user_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Json<serde_json::Value> {
    let user_uuid = match Uuid::parse_str(&user_id) {
        Ok(id) => id,
        Err(_) => return json_error(400, "无效的用户ID格式"),
    };
    let batch = match parse_batch(&payload) {
        Ok(batch) => batch,
        Err(resp) => return resp,
    };

    let scope = match tenant_scope::iam_write_scope(&claims, "iam:resource_acl:delete") {
        Ok(scope) => scope,
        Err(_) => return json_error(403, "缺少租户上下文，无法移除用户资源例外"),
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
        Ok(tenant_scope::UserTarget::Ok) => {}
        Ok(tenant_scope::UserTarget::NotFound) => return json_error(404, "用户不存在"),
        Ok(tenant_scope::UserTarget::Superuser) => {
            return json_error(403, "无权修改超级管理员的资源例外");
        }
        Err(e) => {
            tracing::error!("移除用户资源例外前查询用户失败: {}", e);
            return json_error(500, &format!("查询用户失败: {}", e));
        }
    }

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
            tracing::error!("开始移除用户资源例外事务失败: {}", e);
            return json_error(500, &format!("移除资源例外失败: {}", e));
        }
    };

    let mut removed = 0u64;
    for resource_id in &batch.resource_ids {
        for action in &batch.actions {
            // 软删保留审计
            let result = sqlx::query(
                r#"
                UPDATE iam.resource_permissions
                   SET deleted_at = NOW()
                 WHERE user_id = $1
                   AND role_id IS NULL
                   AND resource_type = $2
                   AND resource_id = $3
                   AND permission = $4
                   AND deleted_at IS NULL
                "#,
            )
            .bind(user_uuid)
            .bind(&batch.resource_type)
            .bind(resource_id)
            .bind(action)
            .execute(&mut tx)
            .await;

            match result {
                Ok(done) => removed += done.rows_affected(),
                Err(e) => {
                    let _ = tx.rollback().await;
                    tracing::error!("移除用户资源例外失败: {}", e);
                    return json_error(500, &format!("移除资源例外失败: {}", e));
                }
            }
        }
    }

    if let Err(e) = tx.commit().await {
        tracing::error!("提交移除用户资源例外事务失败: {}", e);
        return json_error(500, &format!("移除资源例外失败: {}", e));
    }

    Json(serde_json::json!({
        "success": true,
        "message": "用户资源例外移除成功",
        "data": {
            "removed": removed,
            "requested": batch.resource_ids.len() * batch.actions.len()
        }
    }))
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn parse_batch_accepts_batch_shape() {
        let batch = parse_batch(&serde_json::json!({
            "resource_type": "project",
            "resource_ids": [
                "550e8400-e29b-41d4-a716-446655440000",
                "550e8400-e29b-41d4-a716-446655440000",
                "660e8400-e29b-41d4-a716-446655440001"
            ],
            "actions": ["read", "write", "read"]
        }))
        .unwrap();

        assert_eq!(batch.resource_type, "project");
        assert_eq!(batch.resource_ids.len(), 2);
        assert_eq!(batch.actions, vec!["read", "write"]);
    }

    #[test]
    fn parse_batch_rejects_empty_ids_and_invalid_tokens() {
        assert!(parse_batch(&serde_json::json!({
            "resource_type": "project",
            "resource_ids": [],
            "actions": ["read"]
        }))
        .is_err());

        assert!(parse_batch(&serde_json::json!({
            "resource_type": "project *",
            "resource_ids": ["550e8400-e29b-41d4-a716-446655440000"],
            "actions": ["read"]
        }))
        .is_err());

        assert!(parse_batch(&serde_json::json!({
            "resource_type": "project",
            "resource_ids": ["not-a-uuid"],
            "actions": ["read"]
        }))
        .is_err());
    }

    #[test]
    fn parse_effect_requires_explicit_value() {
        assert_eq!(
            parse_effect(&serde_json::json!({"effect": "allow"})).unwrap(),
            "allow"
        );
        assert_eq!(
            parse_effect(&serde_json::json!({"effect": "deny"})).unwrap(),
            "deny"
        );
        assert!(parse_effect(&serde_json::json!({})).is_err());
        assert!(parse_effect(&serde_json::json!({"effect": "maybe"})).is_err());
    }

    #[test]
    fn resolve_scope_tenant_channel_is_tenant_scoped() {
        let tenant = Uuid::new_v4();
        let resolved = resolve_grant_scope(IamScope::Tenant(tenant), Some(Uuid::new_v4()));
        assert_eq!(resolved.scope, TENANT_SCOPE);
        assert_eq!(resolved.tenant_id, Some(tenant));
    }

    #[test]
    fn resolve_scope_platform_global_role_is_platform() {
        let resolved = resolve_grant_scope(IamScope::Platform, None);
        assert_eq!(resolved.scope, PLATFORM_SCOPE);
        assert_eq!(resolved.tenant_id, None);
    }

    #[test]
    fn resolve_scope_platform_tenant_role_is_tenant() {
        let role_tenant = Uuid::new_v4();
        let resolved = resolve_grant_scope(IamScope::Platform, Some(role_tenant));
        assert_eq!(resolved.scope, TENANT_SCOPE);
        assert_eq!(resolved.tenant_id, Some(role_tenant));
    }
}
