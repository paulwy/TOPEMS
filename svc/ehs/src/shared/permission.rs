use sqlx::PgPool;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::{SystemChannel, TenantScope};
use topems_shared_auth::permission::{
    check_module_permission, ModuleCode, ModulePermission as SharedModulePermission,
    PermissionAction,
};
use topems_shared_core::response::ApiResponse;
use topems_shared_db::scope::{Db, ScopedTxn};

pub enum EhsPermission {
    AccidentView,
    AccidentCreate,
    HazardView,
    HazardEdit,
    EnvironmentView,
    HealthView,
    SafetyView,
    All,
}

impl EhsPermission {
    pub fn to_shared(&self) -> SharedModulePermission {
        match self {
            EhsPermission::AccidentView => {
                SharedModulePermission::new(ModuleCode::Ehs, PermissionAction::Read)
            }
            EhsPermission::AccidentCreate => {
                SharedModulePermission::new(ModuleCode::Ehs, PermissionAction::Write)
            }
            EhsPermission::HazardView => {
                SharedModulePermission::new(ModuleCode::Ehs, PermissionAction::Read)
            }
            EhsPermission::HazardEdit => {
                SharedModulePermission::new(ModuleCode::Ehs, PermissionAction::Write)
            }
            EhsPermission::EnvironmentView => {
                SharedModulePermission::new(ModuleCode::Ehs, PermissionAction::Read)
            }
            EhsPermission::HealthView => {
                SharedModulePermission::new(ModuleCode::Ehs, PermissionAction::Read)
            }
            EhsPermission::SafetyView => {
                SharedModulePermission::new(ModuleCode::Ehs, PermissionAction::Read)
            }
            EhsPermission::All => {
                SharedModulePermission::new(ModuleCode::Ehs, PermissionAction::Admin)
            }
        }
    }
}

impl std::fmt::Display for EhsPermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.to_shared())
    }
}

pub type ModulePermission = EhsPermission;

pub async fn check_permission<T>(
    db: &PgPool,
    claims: &Claims,
    permission: &EhsPermission,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    let shared_perm = permission.to_shared();
    check_module_permission(db, claims, &shared_perm).await
}

pub fn has_permission(claims: &Claims, permission: EhsPermission) -> bool {
    if claims.is_superuser {
        return true;
    }
    let perm_str = permission.to_string();
    claims.has_permission(&perm_str) || claims.has_permission("ehs:admin")
}

/// 统一租户入口：从 Claims 解析当前请求租户。
///
/// 超管的 `x-tenant-id` 已在 `tenant_middleware` 中校验并重写进 `claims.tenant_id`，
/// 因此这里一视同仁：缺失、空串、非法 UUID、nil 一律 400，**绝不降级为 nil 租户**，
/// 也不回落到系统通道。写入侧拿不到租户时由调用方拒写并告警。
pub fn require_tenant<T>(claims: &Claims) -> Result<uuid::Uuid, ApiResponse<T>> {
    let raw = claims
        .tenant_id
        .as_deref()
        .ok_or_else(|| ApiResponse::bad_request("缺少租户上下文：请提供 x-tenant-id，拒绝写入"))?;
    let tenant = uuid::Uuid::parse_str(raw.trim())
        .map_err(|_| ApiResponse::bad_request("租户上下文非法：x-tenant-id 不是合法 UUID"))?;
    if tenant.is_nil() {
        return Err(ApiResponse::bad_request(
            "租户上下文非法：x-tenant-id 不能是 nil UUID",
        ));
    }
    Ok(tenant)
}

/// 超管双路作用域：普通用户走 `Tenant`，超管走显式 `System`。
///
/// 守卫顺序与改造前一致：先 [`require_tenant`]（缺/空/非法/nil → 400），
/// 再按身份选择通道。`System` 只能经 `TenantScope::system` 构造，
/// 会强制落 `tracing::warn!` 与 `topems_tenant_scope_system_total` 计数。
pub fn dual_scope<T>(
    claims: &Claims,
    source: &'static str,
    table: &'static str,
) -> Result<TenantScope, ApiResponse<T>> {
    let tenant = require_tenant(claims)?;
    if claims.is_superuser {
        Ok(TenantScope::system(SystemChannel::Superuser, source, table))
    } else {
        TenantScope::tenant(tenant).map_err(|(_, msg)| ApiResponse::bad_request(&msg))
    }
}

/// 按作用域打开只读事务：`Tenant` → 指定租户，`System` → 系统通道。
pub async fn open_read_scope<'a>(
    db: &'a Db,
    scope: &TenantScope,
) -> Result<ScopedTxn<'a>, sqlx::Error> {
    match scope.tenant_id() {
        Some(tenant) => db.scope_read_for_tenant(tenant).await,
        None => db.scope_read_system().await,
    }
}

/// 按作用域打开读写事务：`Tenant` → 指定租户，`System` → 系统通道。
pub async fn open_write_scope<'a>(
    db: &'a Db,
    scope: &TenantScope,
) -> Result<ScopedTxn<'a>, sqlx::Error> {
    match scope.tenant_id() {
        Some(tenant) => db.scope_for_tenant(tenant).await, // scope-exempt: no-request-txn
        None => db.scope_system().await,
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used)]
mod tests {
    use super::*;

    fn claims(tenant: Option<&str>, superuser: bool) -> Claims {
        Claims {
            sub: "123e4567-e89b-12d3-a456-426614174001".to_string(),
            username: "tester".to_string(),
            role: "user".to_string(),
            roles: vec![],
            permissions: vec![],
            is_superuser: superuser,
            exp: 9_999_999_999,
            iat: 0,
            email: None,
            department: None,
            tenant_id: tenant.map(str::to_string),
            department_id: None,
            position_id: None,
            position_code: None,
            must_change_password: false,
        }
    }

    const TENANT: &str = "123e4567-e89b-12d3-a456-426614174000";

    #[test]
    fn dual_scope_rejects_missing_nil_and_invalid_tenant() {
        for (tenant, label) in [
            (None, "缺失"),
            (Some("00000000-0000-0000-0000-000000000000"), "nil"),
            (Some("garbage"), "非法"),
        ] {
            let resp: ApiResponse<()> =
                dual_scope(&claims(tenant, false), "test", "t").expect_err(label);
            assert_eq!(resp.code, 400, "{label}");
        }
    }

    #[test]
    fn dual_scope_superuser_takes_system_channel() {
        let scope = dual_scope::<()>(&claims(Some(TENANT), true), "test", "t").unwrap();
        assert!(scope.is_system());
        assert_eq!(scope.system_channel(), Some(SystemChannel::Superuser));
        assert_eq!(scope.tenant_id(), None);
    }

    #[test]
    fn dual_scope_plain_user_takes_tenant_channel() {
        let scope = dual_scope::<()>(&claims(Some(TENANT), false), "test", "t").unwrap();
        assert!(!scope.is_system());
        assert_eq!(
            scope.tenant_id().map(|t| t.to_string()),
            Some(TENANT.to_string())
        );
    }
}
