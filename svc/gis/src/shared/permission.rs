#![allow(dead_code)]

use sqlx::PgPool;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::permission::{
    check_module_permission, ModuleCode, ModulePermission as SharedModulePermission,
    PermissionAction,
};
use topems_shared_core::response::ApiResponse;

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

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== to_shared 映射测试（15 个变体） ====================

    #[test]
    fn test_factory_map_read_to_shared() {
        let p = GisPermission::FactoryMapRead.to_shared();
        assert_eq!(p.module, ModuleCode::Gis);
        assert_eq!(p.action, PermissionAction::Read);
    }

    #[test]
    fn test_factory_map_write_to_shared() {
        let p = GisPermission::FactoryMapWrite.to_shared();
        assert_eq!(p.module, ModuleCode::Gis);
        assert_eq!(p.action, PermissionAction::Write);
    }

    #[test]
    fn test_device_location_read_to_shared() {
        let p = GisPermission::DeviceLocationRead.to_shared();
        assert_eq!(p.module, ModuleCode::Gis);
        assert_eq!(p.action, PermissionAction::Read);
    }

    #[test]
    fn test_device_location_write_to_shared() {
        let p = GisPermission::DeviceLocationWrite.to_shared();
        assert_eq!(p.module, ModuleCode::Gis);
        assert_eq!(p.action, PermissionAction::Write);
    }

    #[test]
    fn test_pipeline_read_to_shared() {
        let p = GisPermission::PipelineRead.to_shared();
        assert_eq!(p.module, ModuleCode::Gis);
        assert_eq!(p.action, PermissionAction::Read);
    }

    #[test]
    fn test_pipeline_write_to_shared() {
        let p = GisPermission::PipelineWrite.to_shared();
        assert_eq!(p.module, ModuleCode::Gis);
        assert_eq!(p.action, PermissionAction::Write);
    }

    #[test]
    fn test_warehouse_location_read_to_shared() {
        let p = GisPermission::WarehouseLocationRead.to_shared();
        assert_eq!(p.module, ModuleCode::Gis);
        assert_eq!(p.action, PermissionAction::Read);
    }

    #[test]
    fn test_warehouse_location_write_to_shared() {
        let p = GisPermission::WarehouseLocationWrite.to_shared();
        assert_eq!(p.module, ModuleCode::Gis);
        assert_eq!(p.action, PermissionAction::Write);
    }

    #[test]
    fn test_business_location_read_to_shared() {
        let p = GisPermission::BusinessLocationRead.to_shared();
        assert_eq!(p.module, ModuleCode::Gis);
        assert_eq!(p.action, PermissionAction::Read);
    }

    #[test]
    fn test_business_location_write_to_shared() {
        let p = GisPermission::BusinessLocationWrite.to_shared();
        assert_eq!(p.module, ModuleCode::Gis);
        assert_eq!(p.action, PermissionAction::Write);
    }

    #[test]
    fn test_map_marker_read_to_shared() {
        let p = GisPermission::MapMarkerRead.to_shared();
        assert_eq!(p.module, ModuleCode::Gis);
        assert_eq!(p.action, PermissionAction::Read);
    }

    #[test]
    fn test_map_marker_write_to_shared() {
        let p = GisPermission::MapMarkerWrite.to_shared();
        assert_eq!(p.module, ModuleCode::Gis);
        assert_eq!(p.action, PermissionAction::Write);
    }

    #[test]
    fn test_location_photo_read_to_shared() {
        let p = GisPermission::LocationPhotoRead.to_shared();
        assert_eq!(p.module, ModuleCode::Gis);
        assert_eq!(p.action, PermissionAction::Read);
    }

    #[test]
    fn test_location_photo_write_to_shared() {
        let p = GisPermission::LocationPhotoWrite.to_shared();
        assert_eq!(p.module, ModuleCode::Gis);
        assert_eq!(p.action, PermissionAction::Write);
    }

    #[test]
    fn test_all_to_shared() {
        let p = GisPermission::All.to_shared();
        assert_eq!(p.module, ModuleCode::Gis);
        assert_eq!(p.action, PermissionAction::Admin);
    }

    // ==================== Display trait 测试 ====================

    #[test]
    fn test_display_read_permission() {
        let p = GisPermission::FactoryMapRead;
        let s = format!("{}", p);
        assert_eq!(s, "gis:read");
    }

    #[test]
    fn test_display_write_permission() {
        let p = GisPermission::PipelineWrite;
        let s = format!("{}", p);
        assert_eq!(s, "gis:write");
    }

    #[test]
    fn test_display_admin_permission() {
        let p = GisPermission::All;
        let s = format!("{}", p);
        assert_eq!(s, "gis:admin");
    }

    // ==================== 一致性和分组测试 ====================

    #[test]
    fn test_all_read_variants_map_to_read() {
        let read_variants = [
            GisPermission::FactoryMapRead,
            GisPermission::DeviceLocationRead,
            GisPermission::PipelineRead,
            GisPermission::WarehouseLocationRead,
            GisPermission::BusinessLocationRead,
            GisPermission::MapMarkerRead,
            GisPermission::LocationPhotoRead,
        ];
        for v in &read_variants {
            assert_eq!(v.to_shared().action, PermissionAction::Read);
        }
    }

    #[test]
    fn test_all_write_variants_map_to_write() {
        let write_variants = [
            GisPermission::FactoryMapWrite,
            GisPermission::DeviceLocationWrite,
            GisPermission::PipelineWrite,
            GisPermission::WarehouseLocationWrite,
            GisPermission::BusinessLocationWrite,
            GisPermission::MapMarkerWrite,
            GisPermission::LocationPhotoWrite,
        ];
        for v in &write_variants {
            assert_eq!(v.to_shared().action, PermissionAction::Write);
        }
    }

    #[test]
    fn test_all_variants_use_gis_module() {
        let all_variants = [
            GisPermission::FactoryMapRead,
            GisPermission::FactoryMapWrite,
            GisPermission::DeviceLocationRead,
            GisPermission::DeviceLocationWrite,
            GisPermission::PipelineRead,
            GisPermission::PipelineWrite,
            GisPermission::WarehouseLocationRead,
            GisPermission::WarehouseLocationWrite,
            GisPermission::BusinessLocationRead,
            GisPermission::BusinessLocationWrite,
            GisPermission::MapMarkerRead,
            GisPermission::MapMarkerWrite,
            GisPermission::LocationPhotoRead,
            GisPermission::LocationPhotoWrite,
            GisPermission::All,
        ];
        for v in &all_variants {
            assert_eq!(v.to_shared().module, ModuleCode::Gis);
        }
    }
}
