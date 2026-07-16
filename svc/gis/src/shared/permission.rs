#![allow(dead_code)]

use sqlx::PgPool;
use topems_shared::auth::Claims;
use topems_shared::permission::{
    check_module_permission, ModuleCode, ModulePermission as SharedModulePermission,
    PermissionAction,
};
use topems_shared::response::ApiResponse;

#[derive(Debug, Clone, PartialEq)]
pub enum GisPermission {
    FactoryMapRead,
    FactoryMapWrite,
    DeviceLocationRead,
    DeviceLocationWrite,
    PipelineRead,
    PipelineWrite,
    WarehouseLocationRead,
    WarehouseLocationWrite,
    BusinessLocationRead,
    BusinessLocationWrite,
    MapMarkerRead,
    MapMarkerWrite,
    LocationPhotoRead,
    LocationPhotoWrite,
    All,
}

impl GisPermission {
    pub fn to_shared(&self) -> SharedModulePermission {
        match self {
            GisPermission::FactoryMapRead => {
                SharedModulePermission::new(ModuleCode::Gis, PermissionAction::Read)
            }
            GisPermission::FactoryMapWrite => {
                SharedModulePermission::new(ModuleCode::Gis, PermissionAction::Write)
            }
            GisPermission::DeviceLocationRead => {
                SharedModulePermission::new(ModuleCode::Gis, PermissionAction::Read)
            }
            GisPermission::DeviceLocationWrite => {
                SharedModulePermission::new(ModuleCode::Gis, PermissionAction::Write)
            }
            GisPermission::PipelineRead => {
                SharedModulePermission::new(ModuleCode::Gis, PermissionAction::Read)
            }
            GisPermission::PipelineWrite => {
                SharedModulePermission::new(ModuleCode::Gis, PermissionAction::Write)
            }
            GisPermission::WarehouseLocationRead => {
                SharedModulePermission::new(ModuleCode::Gis, PermissionAction::Read)
            }
            GisPermission::WarehouseLocationWrite => {
                SharedModulePermission::new(ModuleCode::Gis, PermissionAction::Write)
            }
            GisPermission::BusinessLocationRead => {
                SharedModulePermission::new(ModuleCode::Gis, PermissionAction::Read)
            }
            GisPermission::BusinessLocationWrite => {
                SharedModulePermission::new(ModuleCode::Gis, PermissionAction::Write)
            }
            GisPermission::MapMarkerRead => {
                SharedModulePermission::new(ModuleCode::Gis, PermissionAction::Read)
            }
            GisPermission::MapMarkerWrite => {
                SharedModulePermission::new(ModuleCode::Gis, PermissionAction::Write)
            }
            GisPermission::LocationPhotoRead => {
                SharedModulePermission::new(ModuleCode::Gis, PermissionAction::Read)
            }
            GisPermission::LocationPhotoWrite => {
                SharedModulePermission::new(ModuleCode::Gis, PermissionAction::Write)
            }
            GisPermission::All => {
                SharedModulePermission::new(ModuleCode::Gis, PermissionAction::Admin)
            }
        }
    }
}

impl std::fmt::Display for GisPermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.to_shared())
    }
}

pub type ModulePermission = GisPermission;

pub async fn check_permission<T>(
    db: &PgPool,
    claims: &Claims,
    permission: &GisPermission,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    let shared_perm = permission.to_shared();
    check_module_permission(db, claims, &shared_perm).await
}
