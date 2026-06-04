use sqlx::PgPool;
use topems_shared::auth::Claims;
use topems_shared::response::ApiResponse;
use topems_shared::permission::{ModulePermission as SharedModulePermission, check_module_permission};

#[derive(Debug, Clone, PartialEq)]
pub enum ModulePermission {
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

impl std::fmt::Display for ModulePermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ModulePermission::SupplierRead => write!(f, "supplier_read"),
            ModulePermission::SupplierWrite => write!(f, "supplier_write"),
            ModulePermission::ContractRead => write!(f, "contract_read"),
            ModulePermission::ContractWrite => write!(f, "contract_write"),
            ModulePermission::PaymentRead => write!(f, "payment_read"),
            ModulePermission::PaymentWrite => write!(f, "payment_write"),
            ModulePermission::SourcingRead => write!(f, "sourcing_read"),
            ModulePermission::SourcingWrite => write!(f, "sourcing_write"),
            ModulePermission::VendorAssessmentRead => write!(f, "vendor_assessment_read"),
            ModulePermission::VendorAssessmentWrite => write!(f, "vendor_assessment_write"),
            ModulePermission::All => write!(f, "all"),
        }
    }
}

impl SharedModulePermission for ModulePermission {
    fn module_name() -> &'static str {
        "srm"
    }
    
    fn all_permission() -> Self {
        ModulePermission::All
    }
}

pub async fn check_permission<T>(
    db: &PgPool,
    claims: &Claims,
    permission: &ModulePermission,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    check_module_permission(db, claims, permission).await
}
