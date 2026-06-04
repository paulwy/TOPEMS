use sqlx::PgPool;
use uuid::Uuid;
use topems_shared::auth::Claims;
use topems_shared::response::ApiResponse;
use topems_shared::permission::{ModulePermission as SharedModulePermission, check_module_permission};

#[derive(Debug, Clone, PartialEq)]
pub enum ModulePermission {
    SampleRead,
    SampleWrite,
    TestRead,
    TestWrite,
    EquipmentRead,
    EquipmentWrite,
    ReportRead,
    ReportWrite,
    All,
}

impl std::fmt::Display for ModulePermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ModulePermission::SampleRead => write!(f, "sample_read"),
            ModulePermission::SampleWrite => write!(f, "sample_write"),
            ModulePermission::TestRead => write!(f, "test_read"),
            ModulePermission::TestWrite => write!(f, "test_write"),
            ModulePermission::EquipmentRead => write!(f, "equipment_read"),
            ModulePermission::EquipmentWrite => write!(f, "equipment_write"),
            ModulePermission::ReportRead => write!(f, "report_read"),
            ModulePermission::ReportWrite => write!(f, "report_write"),
            ModulePermission::All => write!(f, "all"),
        }
    }
}

impl SharedModulePermission for ModulePermission {
    fn module_name() -> &'static str {
        "lims"
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