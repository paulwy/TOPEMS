use sqlx::PgPool;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::permission::{
    check_module_permission, ModuleCode, ModulePermission as SharedModulePermission,
    PermissionAction,
};
use topems_shared_core::response::ApiResponse;

#[derive(Debug, Clone, PartialEq)]
pub enum ApsPermission {
    ProductionPlanRead,
    ProductionPlanWrite,
    ScheduleRead,
    ScheduleWrite,
    CapacityRead,
    CapacityWrite,
    MaterialPlanRead,
    MaterialPlanWrite,
    ForecastRead,
    ForecastWrite,
    All,
}

impl ApsPermission {
    pub fn to_shared(&self) -> SharedModulePermission {
        match self {
            ApsPermission::ProductionPlanRead => {
                SharedModulePermission::new(ModuleCode::Mes, PermissionAction::Read)
            }
            ApsPermission::ProductionPlanWrite => {
                SharedModulePermission::new(ModuleCode::Mes, PermissionAction::Write)
            }
            ApsPermission::ScheduleRead => {
                SharedModulePermission::new(ModuleCode::Mes, PermissionAction::Read)
            }
            ApsPermission::ScheduleWrite => {
                SharedModulePermission::new(ModuleCode::Mes, PermissionAction::Write)
            }
            ApsPermission::CapacityRead => {
                SharedModulePermission::new(ModuleCode::Mes, PermissionAction::Read)
            }
            ApsPermission::CapacityWrite => {
                SharedModulePermission::new(ModuleCode::Mes, PermissionAction::Write)
            }
            ApsPermission::MaterialPlanRead => {
                SharedModulePermission::new(ModuleCode::Mes, PermissionAction::Read)
            }
            ApsPermission::MaterialPlanWrite => {
                SharedModulePermission::new(ModuleCode::Mes, PermissionAction::Write)
            }
            ApsPermission::ForecastRead => {
                SharedModulePermission::new(ModuleCode::Mes, PermissionAction::Read)
            }
            ApsPermission::ForecastWrite => {
                SharedModulePermission::new(ModuleCode::Mes, PermissionAction::Write)
            }
            ApsPermission::All => {
                SharedModulePermission::new(ModuleCode::Mes, PermissionAction::Admin)
            }
        }
    }
}

impl std::fmt::Display for ApsPermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.to_shared())
    }
}

pub type ModulePermission = ApsPermission;

pub async fn check_permission<T>(
    db: &PgPool,
    claims: &Claims,
    permission: &ApsPermission,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    let shared_perm = permission.to_shared();
    check_module_permission(db, claims, &shared_perm).await
}
