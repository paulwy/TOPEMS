//! 租户域 IAM 作用域判定。
//!
//! `tenant_admin` 复用 `/iam/*` 端点，但只能操作本租户。平台管理员（超管或持有
//! `admin:iam:write` / `admin:iam:delete`）保持既有全量行为。安全边界由本模块的
//! 显式 tenant_id / core_tenant_users 谓词承担；DB RLS 只是纵深防御。

use axum::{http::StatusCode, Json};
use topems_shared_auth::auth::Claims;
use topems_shared_db::scope::Db;
use uuid::Uuid;

pub const TENANT_USER_READ: &str = "tenant:iam:user:read";
pub const TENANT_USER_WRITE: &str = "tenant:iam:user:write";
pub const TENANT_USER_DELETE: &str = "tenant:iam:user:delete";
pub const TENANT_ROLE_READ: &str = "tenant:iam:role:read";
pub const TENANT_ROLE_WRITE: &str = "tenant:iam:role:write";
pub const TENANT_ROLE_DELETE: &str = "tenant:iam:role:delete";

pub const TENANT_IAM_CODES: [&str; 6] = [
    TENANT_USER_READ,
    TENANT_USER_WRITE,
    TENANT_USER_DELETE,
    TENANT_ROLE_READ,
    TENANT_ROLE_WRITE,
    TENANT_ROLE_DELETE,
];

/// 系统内置角色名，租户管理员不得创建、改名或删除。
pub const RESERVED_ROLE_NAMES: [&str; 3] = ["admin", "superadmin", "tenant_admin"];

/// 租户管理员角色名（全局保留）。
const TENANT_ADMIN_ROLE: &str = "tenant_admin";

/// 当前请求是否明确是租户管理员身份。
///
/// 这是“无论如何都碰不到平台层”的最后一道保险：即使历史遗留或人工误授让
/// `tenant_admin` 持有了 `admin:iam:*`，也不把该身份升级为平台管理员。
fn is_tenant_admin_claims(claims: &Claims) -> bool {
    !claims.is_superuser && claims.roles.iter().any(|r| r == TENANT_ADMIN_ROLE)
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum IamScope {
    /// 平台管理员：保持既有全量行为，不追加租户过滤。
    Platform,
    /// 租户管理员：只能操作该租户。
    Tenant(Uuid),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ScopeError {
    MissingTenant,
}

impl From<ScopeError> for topems_shared_core::error::TopemsError {
    fn from(err: ScopeError) -> Self {
        match err {
            ScopeError::MissingTenant => Self::PermissionDenied {
                required: "tenant".to_string(),
            },
        }
    }
}

/// 读作用域：与既有实现保持一致——只有超管看全量，其余一律按租户过滤。
pub fn read_scope(claims: &Claims) -> Result<IamScope, ScopeError> {
    if claims.is_superuser {
        Ok(IamScope::Platform)
    } else {
        tenant_uuid(claims)
            .map(IamScope::Tenant)
            .ok_or(ScopeError::MissingTenant)
    }
}

/// 写/删作用域：持有平台码或超管 -> 平台；否则必须有租户。
///
/// `tenant_admin` 身份始终收敛到租户作用域，不因历史遗留平台码而放大。
pub fn write_scope(claims: &Claims, platform_permission: &str) -> Result<IamScope, ScopeError> {
    if claims.is_superuser
        || (!is_tenant_admin_claims(claims) && claims.has_permission(platform_permission))
    {
        Ok(IamScope::Platform)
    } else {
        tenant_uuid(claims)
            .map(IamScope::Tenant)
            .ok_or(ScopeError::MissingTenant)
    }
}

/// HTTP 403 拒绝响应（权限/作用域越界）。
pub fn forbidden(message: &str) -> (StatusCode, Json<serde_json::Value>) {
    (
        StatusCode::FORBIDDEN,
        Json(topems_shared_core::response::error_value(403, message)),
    )
}

/// 详情类资源不存在：沿用项目既有前端契约，HTTP 200 + 内层 code=404。
pub fn not_found_detail(message: &str) -> (StatusCode, Json<serde_json::Value>) {
    (
        StatusCode::OK,
        Json(topems_shared_core::response::error_value(404, message)),
    )
}

pub fn tenant_uuid(claims: &Claims) -> Option<Uuid> {
    claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
}

pub fn is_platform_admin(claims: &Claims) -> bool {
    if is_tenant_admin_claims(claims) {
        return false;
    }
    claims.is_superuser
        || claims.has_permission("admin:iam:write")
        || claims.has_permission("admin:iam:delete")
}

pub fn is_reserved_role_name(name: &str) -> bool {
    RESERVED_ROLE_NAMES.contains(&name)
}

/// 平台层权限码：租户管理员即使自身持有，也不得再授予任何租户角色。
///
/// `tenant:iam:*` 是本轮新增的租户域管理码，不属于平台层，因此显式放行；
/// 其余 `iam:*`（read/write/delete 及细粒度码）都只用于平台 IAM 端点。
pub fn is_platform_code(code: &str) -> bool {
    code.starts_with("iam:")
        || code.starts_with("admin:")
        || code.starts_with("system:")
        || code.starts_with("migration:")
        || code.starts_with("plugin:")
        || code.starts_with("subscription:")
        || code.starts_with("monitor:")
        || (code.starts_with("tenant:") && !code.starts_with("tenant:iam:"))
}

/// 租户管理员可授予的权限码必须同时满足：
/// 1) 非平台层码；2) 在操作者自身权限集内。
pub fn can_grant_codes(claims: &Claims, codes: &[String]) -> bool {
    if is_platform_admin(claims) {
        return true;
    }
    codes
        .iter()
        .all(|code| !is_platform_code(code) && claims.has_permission(code))
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum UserTarget {
    Ok,
    NotFound,
    /// 目标是超级管理员，操作者不是超管。
    Superuser,
}

/// 校验用户目标是否在作用域内。租户模式按 `core_tenant_users` 成员关系判定，
/// 平台模式不做租户过滤，但仍禁止非超管修改超管目标。
///
/// 判定依赖 `public.core_tenant_users`，必须走作用域事务：
/// - 租户模式 → `scope_read_for_tenant`（租户通道，只能看到本租户 membership）；
/// - 平台模式 → `scope_read_system`（系统通道，CASE 短路不查 membership，但保持口径一致）。
/// 裸池在严格 RLS 下会让 `EXISTS` 恒为 false，把正常用户误判为越权。
pub async fn check_user_target(
    db: &Db,
    scope: IamScope,
    user_id: Uuid,
    operator_is_superuser: bool,
) -> Result<UserTarget, sqlx::Error> {
    let tenant_filter = match scope {
        IamScope::Platform => None,
        IamScope::Tenant(t) => Some(t),
    };

    let mut txn = match scope {
        IamScope::Platform => db.scope_read_system().await?,
        IamScope::Tenant(t) => db.scope_read_for_tenant(t).await?,
    };

    let row: Option<(bool, bool)> = sqlx::query_as(
        r#"
        SELECT u.is_superuser,
               CASE WHEN $2::uuid IS NULL THEN TRUE
                    ELSE EXISTS (
                        SELECT 1 FROM public.core_tenant_users tu
                        WHERE tu.user_id = u.id
                          AND tu.tenant_id = $2::uuid
                          AND tu.status = 'active'
                          AND tu.deleted_at IS NULL
                    )
               END AS in_scope
        FROM iam.users u
        WHERE u.deleted_at IS NULL AND u.id = $1
        "#,
    )
    .bind(user_id)
    .bind(tenant_filter)
    .fetch_optional(&mut txn)
    .await?;

    txn.commit().await?;

    Ok(match row {
        None => UserTarget::NotFound,
        Some((is_superuser, in_scope)) => {
            if !in_scope {
                UserTarget::NotFound
            } else if is_superuser && !operator_is_superuser {
                UserTarget::Superuser
            } else {
                UserTarget::Ok
            }
        }
    })
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RoleTarget {
    Ok,
    NotFound,
}

/// 读取角色归属租户。`Some(None)` 表示全局角色，`None` 表示角色不存在。
///
/// `core_roles` 是 FORCE RLS 表，必须走作用域事务，裸池无 GUC 时租户域角色会被
/// 误判为不存在。
async fn fetch_role_tenant(
    db: &Db,
    scope: IamScope,
    role_id: Uuid,
) -> Result<Option<Option<Uuid>>, sqlx::Error> {
    let mut txn = match scope {
        IamScope::Platform => db.scope_read_system().await?,
        IamScope::Tenant(t) => db.scope_read_for_tenant(t).await?,
    };

    let row: Option<Option<Uuid>> = sqlx::query_scalar(
        "SELECT tenant_id FROM public.core_roles WHERE deleted_at IS NULL AND id = $1",
    )
    .bind(role_id)
    .fetch_optional(&mut txn)
    .await?;

    txn.commit().await?;
    Ok(row)
}

/// 读/授予路径的角色目标校验。租户模式只认 `tenant_id = 本租户` 或全局角色
/// （全局角色是平台角色目录，按产品语义租户可授予本租户成员，权限上限仍由
/// `role_permission_codes` 校验）；他租户角色按不存在处理，避免泄露。
pub async fn check_role_target(
    db: &Db,
    scope: IamScope,
    role_id: Uuid,
) -> Result<RoleTarget, sqlx::Error> {
    let row = fetch_role_tenant(db, scope, role_id).await?;

    Ok(match (scope, row) {
        (_, None) => RoleTarget::NotFound,
        (IamScope::Platform, Some(_)) => RoleTarget::Ok,
        (IamScope::Tenant(_), Some(None)) => RoleTarget::Ok,
        (IamScope::Tenant(tenant), Some(Some(role_tenant))) if role_tenant == tenant => {
            RoleTarget::Ok
        }
        (IamScope::Tenant(_), Some(_)) => RoleTarget::NotFound,
    })
}

/// 角色权限写路径的目标校验结果。
pub enum RoleWriteTarget {
    Ok,
    /// 角色存在，但为全局角色，租户管理员无权修改其权限面。
    Forbidden,
    NotFound,
}

/// 角色权限写路径（`add_role_permission` / `remove_role_permission`）的校验。
///
/// 与读/授予路径不同：租户模式只允许**本租户角色**。全局角色（`tenant_id IS
/// NULL`）为所有租户共用，若允许租户管理员改动其权限面，等于跨租户写入；
/// 平台模式（超管或平台管理员）保持既有全量行为。
pub async fn check_role_write_target(
    db: &Db,
    scope: IamScope,
    role_id: Uuid,
) -> Result<RoleWriteTarget, sqlx::Error> {
    let row = fetch_role_tenant(db, scope, role_id).await?;

    Ok(match (scope, row) {
        (_, None) => RoleWriteTarget::NotFound,
        (IamScope::Platform, Some(_)) => RoleWriteTarget::Ok,
        (IamScope::Tenant(tenant), Some(Some(role_tenant))) if role_tenant == tenant => {
            RoleWriteTarget::Ok
        }
        // 全局角色对租户可见、可授予，但不可改；他租户角色在作用域内不可见。
        (IamScope::Tenant(_), Some(None)) => RoleWriteTarget::Forbidden,
        (IamScope::Tenant(_), Some(_)) => RoleWriteTarget::NotFound,
    })
}

/// 角色当前持有的权限码集合，用于“授予不得超出操作者权限集”的校验。
pub async fn role_permission_codes(
    db: &Db,
    scope: IamScope,
    role_id: Uuid,
) -> Result<Vec<String>, sqlx::Error> {
    let mut txn = match scope {
        IamScope::Platform => db.scope_read_system().await?,
        IamScope::Tenant(t) => db.scope_read_for_tenant(t).await?,
    };

    let codes = sqlx::query_scalar(
        r#"
        SELECT p.code
        FROM public.core_permissions p
        INNER JOIN public.core_role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role_id = $1 AND p.deleted_at IS NULL
        ORDER BY p.code
        "#,
    )
    .bind(role_id)
    .fetch_all(&mut txn)
    .await?;

    txn.commit().await?;
    Ok(codes)
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    fn claims(permissions: &[&str], tenant_id: Option<&str>, is_superuser: bool) -> Claims {
        claims_with_roles(permissions, &[], tenant_id, is_superuser)
    }

    fn claims_with_roles(
        permissions: &[&str],
        roles: &[&str],
        tenant_id: Option<&str>,
        is_superuser: bool,
    ) -> Claims {
        Claims {
            sub: "test-user".to_string(),
            username: "test".to_string(),
            role: "user".to_string(),
            roles: roles.iter().map(|r| r.to_string()).collect(),
            permissions: permissions.iter().map(|p| p.to_string()).collect(),
            is_superuser,
            exp: 0,
            iat: 0,
            email: None,
            department: None,
            tenant_id: tenant_id.map(|t| t.to_string()),
            department_id: None,
            position_id: None,
            position_code: None,
            must_change_password: false,
        }
    }

    #[test]
    fn read_scope_platform_only_for_superuser() {
        let tenant = "00000000-0000-0000-0000-000000000001";
        assert_eq!(
            read_scope(&claims(&["iam:read"], Some(tenant), true)).unwrap(),
            IamScope::Platform
        );
        // 非超管即使持有 iam:read，也仍按租户过滤（保持既有行为）
        assert_eq!(
            read_scope(&claims(&["iam:read"], Some(tenant), false)).unwrap(),
            IamScope::Tenant(Uuid::parse_str(tenant).unwrap())
        );
    }

    #[test]
    fn write_scope_requires_tenant_for_tenant_admin() {
        let tenant = "00000000-0000-0000-0000-000000000001";
        assert_eq!(
            write_scope(
                &claims(&[TENANT_USER_WRITE], Some(tenant), false),
                "admin:iam:write"
            )
            .unwrap(),
            IamScope::Tenant(Uuid::parse_str(tenant).unwrap())
        );
        assert_eq!(
            write_scope(
                &claims(&[TENANT_USER_WRITE], None, false),
                "admin:iam:write"
            ),
            Err(ScopeError::MissingTenant)
        );
        assert_eq!(
            write_scope(
                &claims(&["admin:iam:write"], Some(tenant), false),
                "admin:iam:write"
            )
            .unwrap(),
            IamScope::Platform
        );
    }

    #[test]
    fn platform_code_classification() {
        assert!(is_platform_code("admin:iam:write"));
        assert!(is_platform_code("system:config:write"));
        assert!(is_platform_code("tenant:member:update"));
        assert!(is_platform_code("iam:read"));
        assert!(is_platform_code("iam:users_read"));
        assert!(!is_platform_code("tenant:iam:user:read"));
        assert!(!is_platform_code("finance:budget:read"));
    }

    #[test]
    fn tenant_admin_cannot_grant_platform_or_unowned_codes() {
        let tenant_admin = claims(
            &[TENANT_USER_WRITE, "finance:budget:read"],
            Some("00000000-0000-0000-0000-000000000001"),
            false,
        );

        assert!(can_grant_codes(
            &tenant_admin,
            &[
                "finance:budget:read".to_string(),
                TENANT_USER_WRITE.to_string()
            ]
        ));
        assert!(!can_grant_codes(
            &tenant_admin,
            &["finance:budget:write".to_string()]
        ));
        assert!(!can_grant_codes(
            &tenant_admin,
            &["admin:iam:write".to_string()]
        ));
    }

    #[test]
    fn platform_admin_can_grant_any_code() {
        let superuser = claims(&[], None, true);
        assert!(can_grant_codes(
            &superuser,
            &["admin:iam:write".to_string()]
        ));

        let admin_role = claims(&["admin:iam:write"], None, false);
        assert!(can_grant_codes(
            &admin_role,
            &["admin:iam:write".to_string()]
        ));
    }

    #[test]
    fn reserved_role_names() {
        assert!(is_reserved_role_name("admin"));
        assert!(is_reserved_role_name("superadmin"));
        assert!(is_reserved_role_name("tenant_admin"));
        assert!(!is_reserved_role_name("hr_admin"));
    }

    #[test]
    fn tenant_admin_identity_ignores_legacy_platform_codes() {
        let tenant = "00000000-0000-0000-0000-000000000001";
        let tenant_admin = claims_with_roles(
            &[
                TENANT_USER_WRITE,
                "admin:iam:write",
                "admin:iam:delete",
                "iam:read",
            ],
            &["tenant_admin"],
            Some(tenant),
            false,
        );

        // 即便历史上误授了平台码，身份仍收敛到租户作用域。
        assert!(!is_platform_admin(&tenant_admin));
        assert_eq!(
            write_scope(&tenant_admin, "admin:iam:write").unwrap(),
            IamScope::Tenant(Uuid::parse_str(tenant).unwrap())
        );
        // 也不能把这些平台码再授予任何租户角色。
        assert!(!can_grant_codes(
            &tenant_admin,
            &["admin:iam:write".to_string()]
        ));
        assert!(!can_grant_codes(&tenant_admin, &["iam:read".to_string()]));
    }
}
