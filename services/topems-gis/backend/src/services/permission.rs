use sqlx::PgPool;
use topems_shared::auth::Claims;
use topems_shared::response::ApiResponse;
use topems_shared::permission::{ModulePermission as SharedModulePermission, check_module_permission};

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
    LocationPhotoRead,
    LocationPhotoWrite,
    All,
}

impl std::fmt::Display for GisPermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            GisPermission::FactoryMapRead => write!(f, "gis.factory_map_read"),
            GisPermission::FactoryMapWrite => write!(f, "gis.factory_map_write"),
            GisPermission::DeviceLocationRead => write!(f, "gis.device_location_read"),
            GisPermission::DeviceLocationWrite => write!(f, "gis.device_location_write"),
            GisPermission::PipelineRead => write!(f, "gis.pipeline_read"),
            GisPermission::PipelineWrite => write!(f, "gis.pipeline_write"),
            GisPermission::WarehouseLocationRead => write!(f, "gis.warehouse_location_read"),
            GisPermission::WarehouseLocationWrite => write!(f, "gis.warehouse_location_write"),
            GisPermission::LocationPhotoRead => write!(f, "gis.location_photo_read"),
            GisPermission::LocationPhotoWrite => write!(f, "gis.location_photo_write"),
            GisPermission::All => write!(f, "all"),
        }
    }
}

impl SharedModulePermission for GisPermission {
    fn module_name() -> &'static str {
        "gis"
    }
    
    fn all_permission() -> Self {
        GisPermission::All
    }
}

pub async fn check_permission<T>(
    db: &PgPool,
    claims: &Claims,
    permission: &GisPermission,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    check_module_permission(db, claims, permission).await
}
