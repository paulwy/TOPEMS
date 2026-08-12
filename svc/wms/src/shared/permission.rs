use sqlx::PgPool;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::permission::{
    check_module_permission, ModuleCode, ModulePermission as SharedModulePermission,
    PermissionAction,
};
use topems_shared_core::response::ApiResponse;

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
    StockTakeRead,
    StockTakeWrite,
    TransferRead,
    TransferWrite,
    WavePickRead,
    WavePickWrite,
    MovementRead,
    MovementWrite,
    DashboardRead,
    InboundApprove,
    OutboundApprove,
    StockTakeApprove,
    TransferApprove,
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
            WmsPermission::StockTakeRead => {
                SharedModulePermission::new(ModuleCode::Wms, PermissionAction::Read)
            }
            WmsPermission::StockTakeWrite => {
                SharedModulePermission::new(ModuleCode::Wms, PermissionAction::Write)
            }
            WmsPermission::TransferRead => {
                SharedModulePermission::new(ModuleCode::Wms, PermissionAction::Read)
            }
            WmsPermission::TransferWrite => {
                SharedModulePermission::new(ModuleCode::Wms, PermissionAction::Write)
            }
            WmsPermission::WavePickRead => {
                SharedModulePermission::new(ModuleCode::Wms, PermissionAction::Read)
            }
            WmsPermission::WavePickWrite => {
                SharedModulePermission::new(ModuleCode::Wms, PermissionAction::Write)
            }
            WmsPermission::MovementRead => {
                SharedModulePermission::new(ModuleCode::Wms, PermissionAction::Read)
            }
            WmsPermission::MovementWrite => {
                SharedModulePermission::new(ModuleCode::Wms, PermissionAction::Write)
            }
            WmsPermission::DashboardRead => {
                SharedModulePermission::new(ModuleCode::Wms, PermissionAction::Read)
            }
            WmsPermission::InboundApprove => {
                SharedModulePermission::new(ModuleCode::Wms, PermissionAction::Admin)
            }
            WmsPermission::OutboundApprove => {
                SharedModulePermission::new(ModuleCode::Wms, PermissionAction::Admin)
            }
            WmsPermission::StockTakeApprove => {
                SharedModulePermission::new(ModuleCode::Wms, PermissionAction::Admin)
            }
            WmsPermission::TransferApprove => {
                SharedModulePermission::new(ModuleCode::Wms, PermissionAction::Admin)
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

pub fn has_wms_permission(claims: &Claims, action: &str) -> bool {
    if claims.is_superuser {
        return true;
    }

    let permission_str = format!("wms:{}", action);
    claims.has_permission(&permission_str)
        || claims.has_permission("wms:admin")
        || claims.has_permission("all")
}
