use sqlx::PgPool;
use topems_shared::auth::Claims;
use topems_shared::permission::{
    check_module_permission, ModuleCode, ModulePermission as SharedModulePermission,
    PermissionAction,
};
use topems_shared::response::ApiResponse;

pub enum MonitorPermission {
    AlertView,
    AlertAcknowledge,
    MetricView,
    ConfigEdit,
    All,
}

impl MonitorPermission {
    pub fn to_shared(&self) -> SharedModulePermission {
        match self {
            MonitorPermission::AlertView => {
                SharedModulePermission::new(ModuleCode::System, PermissionAction::Read)
            }
            MonitorPermission::AlertAcknowledge => {
                SharedModulePermission::new(ModuleCode::System, PermissionAction::Write)
            }
            MonitorPermission::MetricView => {
                SharedModulePermission::new(ModuleCode::System, PermissionAction::Read)
            }
            MonitorPermission::ConfigEdit => {
                SharedModulePermission::new(ModuleCode::System, PermissionAction::Admin)
            }
            MonitorPermission::All => {
                SharedModulePermission::new(ModuleCode::System, PermissionAction::Admin)
            }
        }
    }
}

impl std::fmt::Display for MonitorPermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.to_shared())
    }
}

pub type ModulePermission = MonitorPermission;

pub async fn check_permission<T>(
    db: &PgPool,
    claims: &Claims,
    permission: &MonitorPermission,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    let shared_perm = permission.to_shared();
    check_module_permission(db, claims, &shared_perm).await
}

pub fn has_permission(claims: &Claims, permission: MonitorPermission) -> bool {
    if claims.is_superuser {
        return true;
    }
    let perm_str = permission.to_string();
    claims.has_permission(&perm_str) || claims.has_permission("system:admin")
}
