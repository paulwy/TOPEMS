#![allow(dead_code)] // Reserved: 权限共享模块预留扩展，待 RBAC 完整接入后启用

use sqlx::PgPool;
use topems_shared::auth::Claims;
use topems_shared::permission::{
    check_module_permission, ModuleCode, ModulePermission as SharedModulePermission,
    PermissionAction,
};
use topems_shared::response::ApiResponse;

pub enum RsPermission {
    ExperimentView,
    ExperimentCreate,
    MaterialView,
    MaterialEdit,
    FormulaView,
    FormulaEdit,
    All,
}

impl RsPermission {
    pub fn to_shared(&self) -> SharedModulePermission {
        match self {
            RsPermission::ExperimentView => {
                SharedModulePermission::new(ModuleCode::Rs, PermissionAction::Read)
            }
            RsPermission::ExperimentCreate => {
                SharedModulePermission::new(ModuleCode::Rs, PermissionAction::Write)
            }
            RsPermission::MaterialView => {
                SharedModulePermission::new(ModuleCode::Rs, PermissionAction::Read)
            }
            RsPermission::MaterialEdit => {
                SharedModulePermission::new(ModuleCode::Rs, PermissionAction::Write)
            }
            RsPermission::FormulaView => {
                SharedModulePermission::new(ModuleCode::Rs, PermissionAction::Read)
            }
            RsPermission::FormulaEdit => {
                SharedModulePermission::new(ModuleCode::Rs, PermissionAction::Write)
            }
            RsPermission::All => {
                SharedModulePermission::new(ModuleCode::Rs, PermissionAction::Admin)
            }
        }
    }
}

impl std::fmt::Display for RsPermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.to_shared())
    }
}

pub type ModulePermission = RsPermission;

pub async fn check_permission<T>(
    db: &PgPool,
    claims: &Claims,
    permission: &RsPermission,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    let shared_perm = permission.to_shared();
    check_module_permission(db, claims, &shared_perm).await
}

pub fn has_permission(claims: &Claims, permission: RsPermission) -> bool {
    if claims.is_superuser {
        return true;
    }
    let perm_str = permission.to_string();
    claims.has_permission(&perm_str) || claims.has_permission("rs:admin")
}
