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
