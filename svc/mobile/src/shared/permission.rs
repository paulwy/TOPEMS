// Mobile 服务权限定义
use sqlx::PgPool;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::permission::{
    check_module_permission, ModuleCode, ModulePermission as SharedModulePermission,
    PermissionAction,
};
use topems_shared_core::response::ApiResponse;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum MobilePermission {
    PatrolRead,
    PatrolWrite,
    PatrolDelete,
    ScanRead,
    ScanWrite,
    ScanDelete,
    TaskRead,
    TaskWrite,
    TaskDelete,
    TaskAssign,
    DeviceRegister,
    DeviceManage,
    OfflineSync,
    StatsView,
    Manage,
}

impl MobilePermission {
    pub fn to_shared(&self) -> SharedModulePermission {
        match self {
            MobilePermission::PatrolRead => {
                SharedModulePermission::new(ModuleCode::System, PermissionAction::Read)
            }
            MobilePermission::PatrolWrite => {
                SharedModulePermission::new(ModuleCode::System, PermissionAction::Write)
            }
            MobilePermission::PatrolDelete => {
                SharedModulePermission::new(ModuleCode::System, PermissionAction::Delete)
            }
            MobilePermission::ScanRead => {
                SharedModulePermission::new(ModuleCode::System, PermissionAction::Read)
            }
            MobilePermission::ScanWrite => {
                SharedModulePermission::new(ModuleCode::System, PermissionAction::Write)
            }
            MobilePermission::ScanDelete => {
                SharedModulePermission::new(ModuleCode::System, PermissionAction::Delete)
            }
            MobilePermission::TaskRead => {
                SharedModulePermission::new(ModuleCode::System, PermissionAction::Read)
            }
            MobilePermission::TaskWrite => {
                SharedModulePermission::new(ModuleCode::System, PermissionAction::Write)
            }
            MobilePermission::TaskDelete => {
                SharedModulePermission::new(ModuleCode::System, PermissionAction::Delete)
            }
            MobilePermission::TaskAssign => {
                SharedModulePermission::new(ModuleCode::System, PermissionAction::Write)
            }
            MobilePermission::DeviceRegister => {
                SharedModulePermission::new(ModuleCode::System, PermissionAction::Write)
            }
            MobilePermission::DeviceManage => {
                SharedModulePermission::new(ModuleCode::System, PermissionAction::Admin)
            }
            MobilePermission::OfflineSync => {
                SharedModulePermission::new(ModuleCode::System, PermissionAction::Write)
            }
            MobilePermission::StatsView => {
                SharedModulePermission::new(ModuleCode::System, PermissionAction::Read)
            }
            MobilePermission::Manage => {
                SharedModulePermission::new(ModuleCode::System, PermissionAction::Admin)
            }
        }
    }
}

impl std::fmt::Display for MobilePermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.to_shared())
    }
}

pub type ModulePermission = MobilePermission;

impl MobilePermission {
    pub fn module_name() -> &'static str {
        "mobile"
    }
}

pub async fn check_mobile_permission<T>(
    db: &PgPool,
    claims: &Claims,
    permission: &MobilePermission,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    let shared_perm = permission.to_shared();
    check_module_permission(db, claims, &shared_perm).await
}

pub fn has_mobile_permission(claims: &Claims, permission: &MobilePermission) -> bool {
    if claims.is_superuser {
        return true;
    }
    let perm_str = permission.to_string();
    claims.has_permission(&perm_str) || claims.has_permission("system:admin")
}
