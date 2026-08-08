use sqlx::PgPool;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::permission::{
    check_module_permission, ModuleCode, ModulePermission as SharedModulePermission,
    PermissionAction,
};
use topems_shared_core::response::ApiResponse;

pub enum PmPermission {
    ProjectView,
    ProjectCreate,
    ProjectEdit,
    ProjectDelete,
    BudgetView,
    BudgetEdit,
    ContractView,
    ContractEdit,
}

impl PmPermission {
    pub fn to_shared(&self) -> SharedModulePermission {
        match self {
            PmPermission::ProjectView => {
                SharedModulePermission::new(ModuleCode::Pm, PermissionAction::Read)
            }
            PmPermission::ProjectCreate => {
                SharedModulePermission::new(ModuleCode::Pm, PermissionAction::Write)
            }
            PmPermission::ProjectEdit => {
                SharedModulePermission::new(ModuleCode::Pm, PermissionAction::Write)
            }
            PmPermission::ProjectDelete => {
                SharedModulePermission::new(ModuleCode::Pm, PermissionAction::Delete)
            }
            PmPermission::BudgetView => {
                SharedModulePermission::new(ModuleCode::Pm, PermissionAction::Read)
            }
            PmPermission::BudgetEdit => {
                SharedModulePermission::new(ModuleCode::Pm, PermissionAction::Write)
            }
            PmPermission::ContractView => {
                SharedModulePermission::new(ModuleCode::Pm, PermissionAction::Read)
            }
            PmPermission::ContractEdit => {
                SharedModulePermission::new(ModuleCode::Pm, PermissionAction::Write)
            }
        }
    }
}

impl std::fmt::Display for PmPermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.to_shared())
    }
}

pub type ModulePermission = PmPermission;

pub async fn check_permission<T>(
    db: &PgPool,
    claims: &Claims,
    permission: &PmPermission,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    let shared_perm = permission.to_shared();
    check_module_permission(db, claims, &shared_perm).await
}

pub fn has_permission(claims: &Claims, permission: PmPermission) -> bool {
    if claims.is_superuser {
        return true;
    }
    let perm_str = permission.to_string();
    claims.has_permission(&perm_str) || claims.has_permission("pm:admin")
}
