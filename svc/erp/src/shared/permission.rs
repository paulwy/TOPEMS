#![allow(dead_code)]

use sqlx::PgPool;
use topems_shared::auth::Claims;
use topems_shared::permission::{
    check_module_permission, check_resource_permission, ModuleCode,
    ModulePermission as SharedModulePermission, PermissionAction,
};
use topems_shared::response::ApiResponse;
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq)]
pub enum ErpPermission {
    AssetRead,
    AssetWrite,
    FinanceRead,
    FinanceWrite,
    VoucherRead,
    VoucherWrite,
    VoucherAudit,
    VoucherPost,
    FixedAssetRead,
    FixedAssetWrite,
    FixedAssetDepreciate,
    ReportRead,
    All,
}

impl ErpPermission {
    pub fn to_shared(&self) -> SharedModulePermission {
        match self {
            ErpPermission::AssetRead => {
                SharedModulePermission::new(ModuleCode::Erp, PermissionAction::Read)
            }
            ErpPermission::AssetWrite => {
                SharedModulePermission::new(ModuleCode::Erp, PermissionAction::Write)
            }
            ErpPermission::FinanceRead => {
                SharedModulePermission::new(ModuleCode::Erp, PermissionAction::Read)
            }
            ErpPermission::FinanceWrite => {
                SharedModulePermission::new(ModuleCode::Erp, PermissionAction::Write)
            }
            ErpPermission::VoucherRead => {
                SharedModulePermission::new(ModuleCode::Erp, PermissionAction::Read)
            }
            ErpPermission::VoucherWrite => {
                SharedModulePermission::new(ModuleCode::Erp, PermissionAction::Write)
            }
            ErpPermission::VoucherAudit => {
                SharedModulePermission::new(ModuleCode::Erp, PermissionAction::Approve)
            }
            ErpPermission::VoucherPost => {
                SharedModulePermission::new(ModuleCode::Erp, PermissionAction::Write)
            }
            ErpPermission::FixedAssetRead => {
                SharedModulePermission::new(ModuleCode::Erp, PermissionAction::Read)
            }
            ErpPermission::FixedAssetWrite => {
                SharedModulePermission::new(ModuleCode::Erp, PermissionAction::Write)
            }
            ErpPermission::FixedAssetDepreciate => {
                SharedModulePermission::new(ModuleCode::Erp, PermissionAction::Write)
            }
            ErpPermission::ReportRead => {
                SharedModulePermission::new(ModuleCode::Erp, PermissionAction::Read)
            }
            ErpPermission::All => {
                SharedModulePermission::new(ModuleCode::Erp, PermissionAction::Admin)
            }
        }
    }
}

impl std::fmt::Display for ErpPermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.to_shared())
    }
}

pub type ModulePermission = ErpPermission;

pub async fn check_permission<T>(
    db: &PgPool,
    claims: &Claims,
    permission: &ErpPermission,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    let shared_perm = permission.to_shared();
    check_module_permission(db, claims, &shared_perm).await
}

pub async fn check_resource_permission_for_erp<T>(
    db: &PgPool,
    claims: &Claims,
    resource_id: &Uuid,
    resource_type: &str,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    check_resource_permission(db, claims, resource_id, resource_type, "erp:admin").await
}
