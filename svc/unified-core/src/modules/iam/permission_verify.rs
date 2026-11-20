use crate::modules::iam::tenant_scope::{self, IamScope};
use crate::AppState;
use axum::{extract::State, Extension, Json};
use serde::{Deserialize, Serialize};
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerifyPermissionRequest {
    pub permission: String,
    pub resource_id: Option<Uuid>,
    pub resource_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerifyPermissionResponse {
    pub has_permission: bool,
    pub permission: String,
    pub message: Option<String>,
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["unified-core:iam:permission:read"])),
    path = "/iam/permissions/verify",
    tag = "IAM-Permissions",
    request_body = serde_json::Value,
    responses(
        (status = 200, description = "权限校验结果（has_permission）"),
        (status = 500, description = "服务内部错误"),
    )
)]
pub async fn verify_permission(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<VerifyPermissionRequest>,
) -> Json<serde_json::Value> {
    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return Json(topems_shared_core::response::error_value(
                400,
                "无效的用户ID",
            ));
        }
    };
    let scope_kind = match tenant_scope::iam_read_scope(&claims) {
        Ok(scope) => scope,
        Err(_) => {
            return Json(topems_shared_core::response::error_value(
                403,
                "缺少租户上下文",
            ))
        }
    };
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return Json(topems_shared_core::response::error_value(
            500,
            "数据库事务上下文缺失",
        ));
    };
    let scope = match scope_kind {
        IamScope::Platform => state.db.scope_with_system(txn).await,
        IamScope::Tenant(_) => state.db.scope_with(txn).await,
    };
    let mut scope = match scope {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("打开权限校验作用域失败: {}", e);
            return Json(topems_shared_core::response::error_value(
                500,
                "权限校验失败",
            ));
        }
    };
    let result = verify_user_permission(&mut scope, &user_id, &req.permission).await;
    let permission = req.permission.clone();

    Json(serde_json::json!({
        "success": true,
        "data": VerifyPermissionResponse {
            has_permission: result,
            permission: req.permission,
            message: if result { None } else { Some(format!("无权访问：{}", permission)) },
        },
        "code": 200,
    }))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerifyMultiplePermissionsRequest {
    pub permissions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerifyMultiplePermissionsResponse {
    pub results: Vec<VerifyPermissionResponse>,
    pub all_granted: bool,
    pub any_granted: bool,
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["unified-core:iam:permission:read"])),
    path = "/iam/permissions/verify-multiple",
    tag = "IAM-Permissions",
    request_body = serde_json::Value,
    responses(
        (status = 200, description = "批量权限校验结果（results/all_granted/any_granted）"),
        (status = 500, description = "服务内部错误"),
    )
)]
pub async fn verify_multiple_permissions(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<VerifyMultiplePermissionsRequest>,
) -> Json<serde_json::Value> {
    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return Json(topems_shared_core::response::error_value(
                400,
                "无效的用户ID",
            ));
        }
    };

    let scope_kind = match tenant_scope::iam_read_scope(&claims) {
        Ok(scope) => scope,
        Err(_) => {
            return Json(topems_shared_core::response::error_value(
                403,
                "缺少租户上下文",
            ))
        }
    };
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return Json(topems_shared_core::response::error_value(
            500,
            "数据库事务上下文缺失",
        ));
    };
    let scope = match scope_kind {
        IamScope::Platform => state.db.scope_with_system(txn).await,
        IamScope::Tenant(_) => state.db.scope_with(txn).await,
    };
    let mut scope = match scope {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("打开批量权限校验作用域失败: {}", e);
            return Json(topems_shared_core::response::error_value(
                500,
                "权限校验失败",
            ));
        }
    };
    let mut results = Vec::new();

    for permission in req.permissions {
        let has_permission = verify_user_permission(&mut scope, &user_id, &permission).await;
        results.push(VerifyPermissionResponse {
            has_permission,
            permission: permission.clone(),
            message: if has_permission {
                None
            } else {
                Some(format!("无权访问：{}", permission))
            },
        });
    }

    let all_granted = results.iter().all(|r| r.has_permission);
    let any_granted = results.iter().any(|r| r.has_permission);

    Json(serde_json::json!({
        "success": true,
        "data": VerifyMultiplePermissionsResponse {
            results,
            all_granted,
            any_granted,
        },
        "code": 200,
    }))
}

async fn verify_user_permission(
    scope: &mut topems_shared_db::ScopedTxn<'_>,
    user_id: &Uuid,
    permission_code: &str,
) -> bool {
    // 超级管理员拥有所有权限
    let is_superuser: Option<bool> = sqlx::query_scalar(
        "SELECT is_superuser FROM iam.users WHERE deleted_at IS NULL AND id = $1",
    )
    .bind(user_id)
    .fetch_optional(&mut *scope)
    .await
    .ok()
    .flatten();

    match is_superuser {
        Some(true) => return true,
        None => return false,
        Some(false) => {}
    }

    // 检查用户是否通过角色关联拥有该权限
    let count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM public.core_role_permissions rp
        JOIN public.core_permissions p ON rp.permission_id = p.id
        JOIN public.core_user_roles ur ON rp.role_id = ur.role_id
        WHERE ur.user_id = $1 AND p.code = $2
        "#,
    )
    .bind(user_id)
    .bind(permission_code)
    .fetch_one(&mut *scope)
    .await
    .unwrap_or(0);

    count > 0
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckResourcePermissionRequest {
    pub resource_type: String,
    pub resource_id: Uuid,
    pub action: String,
}

pub async fn check_resource_permission(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CheckResourcePermissionRequest>,
) -> Json<serde_json::Value> {
    // 从 Claims 获取当前用户 ID，不接受请求体传入的 user_id
    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return Json(topems_shared_core::response::error_value(
                400,
                "无效的用户ID",
            ));
        }
    };

    let has_permission = check_user_resource_permission(
        &state,
        &txn_arc,
        &claims,
        &user_id,
        &req.resource_type,
        &req.resource_id,
        &req.action,
    )
    .await;

    Json(serde_json::json!({
        "success": true,
        "data": VerifyPermissionResponse {
            has_permission,
            permission: format!("{}:{}:{}", req.resource_type, req.resource_id, req.action),
            message: if has_permission { None } else { Some("无权访问此资源".to_string()) },
        },
        "code": 200,
    }))
}

/// 资源级 ACL 判定顺序：用户例外优先于角色授予；角色授予先看平台级、再看本租户；
/// 三层都没有命中则默认拒绝。
///
/// 平台级授予（`scope='platform'`，`tenant_id` 为 NULL）与租户级授予在读取时由 RLS
/// 决定可见性：租户通道看不到平台行，系统通道两者都可见。两者对结果都是 allow，
/// 因此合并为“任一命中即允许”。
fn decide_resource_permission(
    user_effect: Option<&str>,
    platform_allowed: bool,
    tenant_allowed: bool,
) -> bool {
    match user_effect {
        Some("deny") => false,
        Some(_) => true,
        None => platform_allowed || tenant_allowed,
    }
}

/// 资源级 ACL 判定查询。
///
/// 三个分支都必须带 `deleted_at IS NULL`：撤销写的是 `deleted_at`，软删后不可见。
/// 用户例外按租户过滤（`$5` 为空时不限制），平台授予不按租户过滤（RLS 负责隔离），
/// 租户授予必须命中 `$5` 指向的租户，没有租户上下文时租户分支恒为空。
const RESOURCE_ACL_QUERY: &str = r#"
        SELECT
            (SELECT rp.effect
               FROM iam.resource_permissions rp
              WHERE rp.user_id = $1
                AND rp.role_id IS NULL
                AND rp.resource_type = $2
                AND rp.resource_id = $3
                AND rp.permission = $4
                AND rp.deleted_at IS NULL
                AND ($5::uuid IS NULL OR rp.tenant_id = $5::uuid)
              ORDER BY (rp.effect = 'deny') DESC
              LIMIT 1) AS user_effect,
            EXISTS (
                SELECT 1
                  FROM iam.resource_permissions rp
                  JOIN public.core_user_roles ur ON ur.role_id = rp.role_id
                 WHERE ur.user_id = $1
                   AND rp.resource_type = $2
                   AND rp.resource_id = $3
                   AND rp.permission = $4
                   AND rp.effect = 'allow'
                   AND rp.deleted_at IS NULL
                   AND rp.scope = 'platform'
            ) AS platform_allowed,
            EXISTS (
                SELECT 1
                  FROM iam.resource_permissions rp
                  JOIN public.core_user_roles ur ON ur.role_id = rp.role_id
                 WHERE ur.user_id = $1
                   AND rp.resource_type = $2
                   AND rp.resource_id = $3
                   AND rp.permission = $4
                   AND rp.effect = 'allow'
                   AND rp.deleted_at IS NULL
                   AND rp.scope = 'tenant'
                   AND rp.tenant_id = $5::uuid
            ) AS tenant_allowed
        "#;

async fn check_user_resource_permission(
    state: &AppState,
    txn_arc: &RlsTxnCell,
    claims: &Claims,
    user_id: &Uuid,
    resource_type: &str,
    resource_id: &Uuid,
    action: &str,
) -> bool {
    // `iam.resource_permissions` 是租户隔离表：裸池无 GUC 时策略 fail-closed，
    // 判定恒为 false，必须复用与角色管理一致的作用域事务。
    let mut guard = txn_arc.lock().await;
    let scope_result = if claims.is_superuser {
        state.db.scope_read_system().await
    } else {
        match tenant_scope::iam_read_scope(claims) {
            Ok(IamScope::Tenant(_)) => {
                let Some(txn) = guard.as_mut() else {
                    tracing::error!("rls txn missing: RLS 事务中间件未注入");
                    return false;
                };
                state.db.scope_with(txn).await
            }
            _ => return false,
        }
    };
    let mut scope = match scope_result {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("资源权限判定作用域创建失败: {}", e);
            return false;
        }
    };

    let tenant_filter = tenant_scope::tenant_uuid(claims).filter(|t| !t.is_nil());

    let row: Result<(Option<String>, bool, bool), sqlx::Error> = sqlx::query_as(RESOURCE_ACL_QUERY)
        .bind(user_id)
        .bind(resource_type)
        .bind(resource_id)
        .bind(action)
        .bind(tenant_filter)
        .fetch_one(&mut scope)
        .await;
    let _ = scope.commit().await;

    match row {
        Ok((user_effect, platform_allowed, tenant_allowed)) => {
            decide_resource_permission(user_effect.as_deref(), platform_allowed, tenant_allowed)
        }
        Err(e) => {
            tracing::error!("资源权限判定查询失败: {}", e);
            false
        }
    }
}

pub async fn get_my_permissions(
    State(state): State<AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
) -> Json<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        return Json(topems_shared_core::response::error_value(
            500,
            "数据库事务上下文缺失",
        ));
    };
    let mut rls_scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("打开 IAM 权限作用域失败: {}", e);
            return Json(topems_shared_core::response::error_value(
                500,
                &format!("查询权限失败: {}", e),
            ));
        }
    };

    let user_id = match Uuid::parse_str(&claims.sub) {
        Ok(id) => id,
        Err(_) => {
            return Json(topems_shared_core::response::error_value(
                400,
                "无效的用户ID",
            ));
        }
    };

    let permissions: Vec<String> = if claims.is_superuser {
        // 超级管理员返回所有权限
        sqlx::query_scalar("SELECT code FROM public.core_permissions ORDER BY code")
            .fetch_all(&mut rls_scope)
            .await
            .unwrap_or_default()
    } else {
        // 普通用户返回通过角色关联的权限
        sqlx::query_scalar(
            r#"
            SELECT DISTINCT p.code
            FROM public.core_permissions p
            JOIN public.core_role_permissions rp ON p.id = rp.permission_id
            JOIN public.core_user_roles ur ON rp.role_id = ur.role_id
            WHERE ur.user_id = $1
            ORDER BY p.code
            "#,
        )
        .bind(user_id)
        .fetch_all(&mut rls_scope)
        .await
        .unwrap_or_default()
    };

    Json(serde_json::json!({
        "success": true,
        "data": permissions,
        "code": 200,
    }))
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
mod tests {
    use super::*;

    #[test]
    fn test_verify_permission_request_deserialization() {
        let json = r#"{"permission": "iam:users_read"}"#;
        let req: VerifyPermissionRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.permission, "iam:users_read");
        assert!(req.resource_id.is_none());
        assert!(req.resource_type.is_none());
    }

    #[test]
    fn test_verify_permission_request_with_resource() {
        let json = r#"{"permission": "crm:customers_read", "resource_id": "550e8400-e29b-41d4-a716-446655440000", "resource_type": "customer"}"#;
        let req: VerifyPermissionRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.permission, "crm:customers_read");
        assert!(req.resource_id.is_some());
        assert_eq!(req.resource_type.as_deref(), Some("customer"));
    }

    #[test]
    fn test_verify_permission_response_serialization_granted() {
        let resp = VerifyPermissionResponse {
            has_permission: true,
            permission: "iam:users_read".to_string(),
            message: None,
        };
        let json = serde_json::to_value(&resp).unwrap();
        assert_eq!(json["has_permission"], true);
        assert_eq!(json["permission"], "iam:users_read");
        assert!(json["message"].is_null());
    }

    #[test]
    fn test_verify_permission_response_serialization_denied() {
        let resp = VerifyPermissionResponse {
            has_permission: false,
            permission: "iam:users_delete".to_string(),
            message: Some("无权访问".to_string()),
        };
        let json = serde_json::to_value(&resp).unwrap();
        assert_eq!(json["has_permission"], false);
        assert_eq!(json["message"], "无权访问");
    }

    #[test]
    fn test_verify_multiple_permissions_request() {
        let json = r#"{"permissions": ["iam:users_read", "iam:users_write"]}"#;
        let req: VerifyMultiplePermissionsRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.permissions.len(), 2);
        assert_eq!(req.permissions[0], "iam:users_read");
        assert_eq!(req.permissions[1], "iam:users_write");
    }

    #[test]
    fn test_verify_multiple_permissions_empty() {
        let json = r#"{"permissions": []}"#;
        let req: VerifyMultiplePermissionsRequest = serde_json::from_str(json).unwrap();
        assert!(req.permissions.is_empty());
    }

    #[test]
    fn test_check_resource_permission_request() {
        let json = r#"{
            "user_id": "550e8400-e29b-41d4-a716-446655440000",
            "resource_type": "customer",
            "resource_id": "660e8400-e29b-41d4-a716-446655440001",
            "action": "read"
        }"#;
        let req: CheckResourcePermissionRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.resource_type, "customer");
        assert_eq!(req.action, "read");
    }

    #[test]
    fn resource_acl_role_grant_only_allows() {
        // 平台授予或租户授予任一命中即允许
        assert!(decide_resource_permission(None, false, true));
        assert!(decide_resource_permission(None, true, false));
    }

    #[test]
    fn resource_acl_platform_scope_grant_allows() {
        assert!(decide_resource_permission(None, true, false));
    }

    #[test]
    fn resource_acl_tenant_scope_grant_allows() {
        assert!(decide_resource_permission(None, false, true));
    }

    #[test]
    fn resource_acl_user_allow_only_allows() {
        assert!(decide_resource_permission(Some("allow"), false, false));
    }

    #[test]
    fn resource_acl_user_deny_overrides_role_grant() {
        assert!(!decide_resource_permission(Some("deny"), true, true));
    }

    #[test]
    fn resource_acl_no_grant_falls_back_to_deny() {
        assert!(!decide_resource_permission(None, false, false));
    }

    /// 软删契约：三条读取分支都必须过滤 `deleted_at IS NULL`，否则撤销后的授予
    /// 仍然生效。这里对查询文本做静态断言（判定查询无法在无库单测中执行）。
    #[test]
    fn resource_acl_query_excludes_soft_deleted_rows() {
        assert_eq!(
            RESOURCE_ACL_QUERY.matches("rp.deleted_at IS NULL").count(),
            3
        );
        assert!(!RESOURCE_ACL_QUERY.contains("is_active"));
    }
}
