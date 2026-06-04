use sqlx::PgPool;
use topems_shared::auth::Claims;
use topems_shared::response::ApiResponse;
use topems_shared::permission::{ModulePermission as SharedModulePermission, check_module_permission};

#[derive(Debug, Clone, PartialEq)]
pub enum ModulePermission {
    WarehouseRead,
    WarehouseWrite,
    InventoryRead,
    InventoryWrite,
    InboundRead,
    InboundWrite,
    OutboundRead,
    OutboundWrite,
    All,
}

impl std::fmt::Display for ModulePermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ModulePermission::WarehouseRead => write!(f, "warehouse_read"),
            ModulePermission::WarehouseWrite => write!(f, "warehouse_write"),
            ModulePermission::InventoryRead => write!(f, "inventory_read"),
            ModulePermission::InventoryWrite => write!(f, "inventory_write"),
            ModulePermission::InboundRead => write!(f, "inbound_read"),
            ModulePermission::InboundWrite => write!(f, "inbound_write"),
            ModulePermission::OutboundRead => write!(f, "outbound_read"),
            ModulePermission::OutboundWrite => write!(f, "outbound_write"),
            ModulePermission::All => write!(f, "all"),
        }
    }
}

impl SharedModulePermission for ModulePermission {
    fn module_name() -> &'static str {
        "wms"
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
