use sqlx::PgPool;
use topems_shared::auth::Claims;
use topems_shared::permission::{
    check_module_permission, ModuleCode, ModulePermission as SharedModulePermission,
    PermissionAction,
};
use topems_shared::response::ApiResponse;

#[derive(Debug, Clone, PartialEq)]
pub enum WmsPermission {
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

impl WmsPermission {
    pub fn to_shared(&self) -> SharedModulePermission {
        match self {
            WmsPermission::WarehouseRead => {
                SharedModulePermission::new(ModuleCode::Wms, PermissionAction::Read)
            }
            WmsPermission::WarehouseWrite => {
                SharedModulePermission::new(ModuleCode::Wms, PermissionAction::Write)
            }
            WmsPermission::InventoryRead => {
                SharedModulePermission::new(ModuleCode::Wms, PermissionAction::Read)
            }
            WmsPermission::InventoryWrite => {
                SharedModulePermission::new(ModuleCode::Wms, PermissionAction::Write)
            }
            WmsPermission::InboundRead => {
                SharedModulePermission::new(ModuleCode::Wms, PermissionAction::Read)
            }
            WmsPermission::InboundWrite => {
                SharedModulePermission::new(ModuleCode::Wms, PermissionAction::Write)
            }
            WmsPermission::OutboundRead => {
                SharedModulePermission::new(ModuleCode::Wms, PermissionAction::Read)
            }
            WmsPermission::OutboundWrite => {
                SharedModulePermission::new(ModuleCode::Wms, PermissionAction::Write)
            }
            WmsPermission::All => {
                SharedModulePermission::new(ModuleCode::Wms, PermissionAction::Admin)
            }
        }
    }
}

impl std::fmt::Display for WmsPermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.to_shared())
    }
}

pub type ModulePermission = WmsPermission;

pub async fn check_permission<T>(
    db: &PgPool,
    claims: &Claims,
    permission: &WmsPermission,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    let shared_perm = permission.to_shared();
    check_module_permission(db, claims, &shared_perm).await
}
