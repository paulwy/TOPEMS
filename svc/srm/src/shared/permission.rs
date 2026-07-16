use sqlx::PgPool;
use topems_shared::auth::Claims;
use topems_shared::permission::{
    check_module_permission, ModuleCode, ModulePermission as SharedModulePermission,
    PermissionAction,
};
use topems_shared::response::ApiResponse;

#[derive(Debug, Clone, PartialEq)]
pub enum SrmPermission {
    SupplierRead,
    SupplierWrite,
    ContractRead,
    ContractWrite,
    PaymentRead,
    PaymentWrite,
    SourcingRead,
    SourcingWrite,
    VendorAssessmentRead,
    VendorAssessmentWrite,
    All,
}

impl SrmPermission {
    pub fn to_shared(&self) -> SharedModulePermission {
        match self {
            SrmPermission::SupplierRead => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Read)
            }
            SrmPermission::SupplierWrite => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Write)
            }
            SrmPermission::ContractRead => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Read)
            }
            SrmPermission::ContractWrite => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Write)
            }
            SrmPermission::PaymentRead => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Read)
            }
            SrmPermission::PaymentWrite => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Write)
            }
            SrmPermission::SourcingRead => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Read)
            }
            SrmPermission::SourcingWrite => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Write)
            }
            SrmPermission::VendorAssessmentRead => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Read)
            }
            SrmPermission::VendorAssessmentWrite => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Write)
            }
            SrmPermission::All => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Admin)
            }
        }
    }
}

impl std::fmt::Display for SrmPermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.to_shared())
    }
}

pub type ModulePermission = SrmPermission;

pub async fn check_permission<T>(
    db: &PgPool,
    claims: &Claims,
    permission: &SrmPermission,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    let shared_perm = permission.to_shared();
    check_module_permission(db, claims, &shared_perm).await
}
