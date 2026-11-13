use sqlx::PgPool;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::permission::{
    check_module_permission, ModuleCode, ModulePermission as SharedModulePermission,
    PermissionAction,
};
use topems_shared_core::response::ApiResponse;

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
    let raw = claims.tenant_id.as_deref().ok_or_else(|| {
        ApiResponse::bad_request("缺少租户上下文：请提供 x-tenant-id，拒绝写入")
    })?;
    let tenant = uuid::Uuid::parse_str(raw.trim())
        .map_err(|_| ApiResponse::bad_request("租户上下文非法：x-tenant-id 不是合法 UUID"))?;
    if tenant.is_nil() {
        return Err(ApiResponse::bad_request(
            "租户上下文非法：x-tenant-id 不能是 nil UUID",
        ));
    }
    Ok(tenant)
}
