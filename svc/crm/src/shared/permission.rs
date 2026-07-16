use sqlx::PgPool;
use topems_shared::auth::Claims;
use topems_shared::permission::{
    check_module_permission, ModuleCode, ModulePermission as SharedModulePermission,
    PermissionAction,
};
use topems_shared::response::ApiResponse;

#[derive(Debug, Clone, PartialEq)]
pub enum CrmPermission {
    CustomerRead,
    CustomerWrite,
    ContactRead,
    ContactWrite,
    OpportunityRead,
    OpportunityWrite,
    InteractionRead,
    InteractionWrite,
    All,
}

impl CrmPermission {
    pub fn to_shared(&self) -> SharedModulePermission {
        match self {
            CrmPermission::CustomerRead => {
                SharedModulePermission::new(ModuleCode::Crm, PermissionAction::Read)
            }
            CrmPermission::CustomerWrite => {
                SharedModulePermission::new(ModuleCode::Crm, PermissionAction::Write)
            }
            CrmPermission::ContactRead => {
                SharedModulePermission::new(ModuleCode::Crm, PermissionAction::Read)
            }
            CrmPermission::ContactWrite => {
                SharedModulePermission::new(ModuleCode::Crm, PermissionAction::Write)
            }
            CrmPermission::OpportunityRead => {
                SharedModulePermission::new(ModuleCode::Crm, PermissionAction::Read)
            }
            CrmPermission::OpportunityWrite => {
                SharedModulePermission::new(ModuleCode::Crm, PermissionAction::Write)
            }
            CrmPermission::InteractionRead => {
                SharedModulePermission::new(ModuleCode::Crm, PermissionAction::Read)
            }
            CrmPermission::InteractionWrite => {
                SharedModulePermission::new(ModuleCode::Crm, PermissionAction::Write)
            }
            CrmPermission::All => {
                SharedModulePermission::new(ModuleCode::Crm, PermissionAction::Admin)
            }
        }
    }
}

impl std::fmt::Display for CrmPermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.to_shared())
    }
}

pub type ModulePermission = CrmPermission;

pub async fn check_permission<T>(
    db: &PgPool,
    claims: &Claims,
    permission: &CrmPermission,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    let shared_perm = permission.to_shared();
    check_module_permission(db, claims, &shared_perm).await
}
