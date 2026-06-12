use sqlx::PgPool;
use topems_shared::auth::Claims;
use topems_shared::permission::{
    check_module_permission, ModulePermission as SharedModulePermission,
};
use topems_shared::response::ApiResponse;

#[derive(Debug, Clone, PartialEq)]
pub enum ModulePermission {
    ProductionOrderRead,
    ProductionOrderWrite,
    ProductionProcessRead,
    ProductionProcessWrite,
    ProductionRecordRead,
    ProductionRecordWrite,
    EquipmentRead,
    EquipmentWrite,
    WorkStationRead,
    WorkStationWrite,
    All,
}

impl std::fmt::Display for ModulePermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ModulePermission::ProductionOrderRead => write!(f, "production_order_read"),
            ModulePermission::ProductionOrderWrite => write!(f, "production_order_write"),
            ModulePermission::ProductionProcessRead => write!(f, "production_process_read"),
            ModulePermission::ProductionProcessWrite => write!(f, "production_process_write"),
            ModulePermission::ProductionRecordRead => write!(f, "production_record_read"),
            ModulePermission::ProductionRecordWrite => write!(f, "production_record_write"),
            ModulePermission::EquipmentRead => write!(f, "equipment_read"),
            ModulePermission::EquipmentWrite => write!(f, "equipment_write"),
            ModulePermission::WorkStationRead => write!(f, "work_station_read"),
            ModulePermission::WorkStationWrite => write!(f, "work_station_write"),
            ModulePermission::All => write!(f, "all"),
        }
    }
}

impl SharedModulePermission for ModulePermission {
    fn module_name() -> &'static str {
        "mes"
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
