use sqlx::PgPool;
use topems_shared::auth::Claims;
use topems_shared::response::ApiResponse;
use topems_shared::permission::{ModulePermission as SharedModulePermission, check_module_permission};

#[derive(Debug, Clone, PartialEq)]
pub enum ModulePermission {
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

impl std::fmt::Display for ModulePermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ModulePermission::CustomerRead => write!(f, "customer_read"),
            ModulePermission::CustomerWrite => write!(f, "customer_write"),
            ModulePermission::ContactRead => write!(f, "contact_read"),
            ModulePermission::ContactWrite => write!(f, "contact_write"),
            ModulePermission::OpportunityRead => write!(f, "opportunity_read"),
            ModulePermission::OpportunityWrite => write!(f, "opportunity_write"),
            ModulePermission::InteractionRead => write!(f, "interaction_read"),
            ModulePermission::InteractionWrite => write!(f, "interaction_write"),
            ModulePermission::All => write!(f, "all"),
        }
    }
}

impl SharedModulePermission for ModulePermission {
    fn module_name() -> &'static str {
        "crm"
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
