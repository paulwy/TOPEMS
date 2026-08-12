//! TMS Permission Module
//!
//! 权限检查模块，用于验证用户对TMS资源的访问权限

use sqlx::PgPool;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::permission::{
    check_module_permission, ModuleCode, ModulePermission as SharedModulePermission,
    PermissionAction,
};
use topems_shared_core::response::ApiResponse;

#[derive(Debug, Clone, PartialEq)]
pub enum TmsPermission {
    VehicleRead,
    VehicleWrite,
    VehicleApprove,
    DriverRead,
    DriverWrite,
    DriverApprove,
    CarrierRead,
    CarrierWrite,
    CarrierApprove,
    ShipmentRead,
    ShipmentWrite,
    ShipmentApprove,
    RouteRead,
    RouteWrite,
    RouteApprove,
    All,
}

impl TmsPermission {
    pub fn to_shared(&self) -> SharedModulePermission {
        // TMS 暂无独立 ModuleCode，复用 Scm（供应链）模块码
        match self {
            TmsPermission::VehicleRead => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Read)
            }
            TmsPermission::VehicleWrite => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Write)
            }
            TmsPermission::VehicleApprove => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Admin)
            }
            TmsPermission::DriverRead => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Read)
            }
            TmsPermission::DriverWrite => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Write)
            }
            TmsPermission::DriverApprove => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Admin)
            }
            TmsPermission::CarrierRead => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Read)
            }
            TmsPermission::CarrierWrite => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Write)
            }
            TmsPermission::CarrierApprove => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Admin)
            }
            TmsPermission::ShipmentRead => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Read)
            }
            TmsPermission::ShipmentWrite => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Write)
            }
            TmsPermission::ShipmentApprove => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Admin)
            }
            TmsPermission::RouteRead => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Read)
            }
            TmsPermission::RouteWrite => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Write)
            }
            TmsPermission::RouteApprove => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Admin)
            }
            TmsPermission::All => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Admin)
            }
        }
    }
}

impl std::fmt::Display for TmsPermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.to_shared())
    }
}

pub type ModulePermission = TmsPermission;

pub async fn check_permission<T>(
    db: &PgPool,
    claims: &Claims,
    permission: &TmsPermission,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    let shared_perm = permission.to_shared();
    check_module_permission(db, claims, &shared_perm).await
}
