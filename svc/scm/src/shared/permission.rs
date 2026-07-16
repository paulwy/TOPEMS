use sqlx::PgPool;
use topems_shared::auth::Claims;
use topems_shared::permission::{
    check_module_permission, check_resource_permission, ModuleCode,
    ModulePermission as SharedModulePermission, PermissionAction,
};
use topems_shared::response::ApiResponse;
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq)]
pub enum ScmPermission {
    SupplierRead,
    SupplierWrite,
    PurchaseOrderRead,
    PurchaseOrderWrite,
    PurchaseOrderApprove,
    PurchaseItemRead,
    PurchaseItemWrite,
    SupplierEvaluationRead,
    SupplierEvaluationWrite,
    SupplierDeliveryAppointmentRead,
    SupplierDeliveryAppointmentWrite,
    SupplierDeliveryAppointmentApprove,
    PriceComparisonRead,
    PriceComparisonWrite,
    All,
}

impl ScmPermission {
    pub fn to_shared(&self) -> SharedModulePermission {
        match self {
            ScmPermission::SupplierRead => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Read)
            }
            ScmPermission::SupplierWrite => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Write)
            }
            ScmPermission::PurchaseOrderRead => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Read)
            }
            ScmPermission::PurchaseOrderWrite => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Write)
            }
            ScmPermission::PurchaseOrderApprove => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Approve)
            }
            ScmPermission::PurchaseItemRead => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Read)
            }
            ScmPermission::PurchaseItemWrite => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Write)
            }
            ScmPermission::SupplierEvaluationRead => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Read)
            }
            ScmPermission::SupplierEvaluationWrite => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Write)
            }
            ScmPermission::SupplierDeliveryAppointmentRead => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Read)
            }
            ScmPermission::SupplierDeliveryAppointmentWrite => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Write)
            }
            ScmPermission::SupplierDeliveryAppointmentApprove => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Approve)
            }
            ScmPermission::PriceComparisonRead => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Read)
            }
            ScmPermission::PriceComparisonWrite => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Write)
            }
            ScmPermission::All => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Admin)
            }
        }
    }
}

impl std::fmt::Display for ScmPermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.to_shared())
    }
}

pub type ModulePermission = ScmPermission;

pub async fn check_permission<T>(
    db: &PgPool,
    claims: &Claims,
    permission: &ScmPermission,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    let shared_perm = permission.to_shared();
    check_module_permission(db, claims, &shared_perm).await
}

pub async fn check_supplier_permission<T>(
    db: &PgPool,
    claims: &Claims,
    supplier_id: &Uuid,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    check_resource_permission(db, claims, supplier_id, "supplier", "scm:admin").await
}
