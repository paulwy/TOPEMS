#![allow(dead_code)]

use sqlx::PgPool;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::permission::{
    check_module_permission, check_resource_permission, ModuleCode,
    ModulePermission as SharedModulePermission, PermissionAction,
};
use topems_shared_core::response::ApiResponse;
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

#[cfg(test)]
mod tests {
    use super::*;
    use topems_shared_auth::permission::{ModuleCode, PermissionAction};

    fn assert_permission_maps(erp: ErpPermission, expected_action: PermissionAction) {
        let shared = erp.to_shared();
        // SharedModulePermission stores ModuleCode and PermissionAction;
        // debug/display contains string values we can inspect via PartialEq on
        // the constructed expected.
        //
        // Note: expected_action is used twice; avoid move-before-borrow by
        // formatting the debug string first, then moving into expected.
        let action_debug = format!("{:?}", expected_action);
        let expected = SharedModulePermission::new(ModuleCode::Erp, expected_action);
        assert_eq!(
            shared, expected,
            "ErpPermission::{:?} should map to ModuleCode::Erp + {}",
            erp, action_debug
        );
    }

    #[test]
    fn test_to_shared_asset_read() {
        assert_permission_maps(ErpPermission::AssetRead, PermissionAction::Read);
    }

    #[test]
    fn test_to_shared_asset_write() {
        assert_permission_maps(ErpPermission::AssetWrite, PermissionAction::Write);
    }

    #[test]
    fn test_to_shared_finance_read() {
        assert_permission_maps(ErpPermission::FinanceRead, PermissionAction::Read);
    }

    #[test]
    fn test_to_shared_finance_write() {
        assert_permission_maps(ErpPermission::FinanceWrite, PermissionAction::Write);
    }

    #[test]
    fn test_to_shared_voucher_read() {
        assert_permission_maps(ErpPermission::VoucherRead, PermissionAction::Read);
    }

    #[test]
    fn test_to_shared_voucher_write() {
        assert_permission_maps(ErpPermission::VoucherWrite, PermissionAction::Write);
    }

    #[test]
    fn test_to_shared_voucher_audit() {
        assert_permission_maps(ErpPermission::VoucherAudit, PermissionAction::Approve);
    }

    #[test]
    fn test_to_shared_voucher_post() {
        assert_permission_maps(ErpPermission::VoucherPost, PermissionAction::Write);
    }

    #[test]
    fn test_to_shared_fixed_asset_read() {
        assert_permission_maps(ErpPermission::FixedAssetRead, PermissionAction::Read);
    }

    #[test]
    fn test_to_shared_fixed_asset_write() {
        assert_permission_maps(ErpPermission::FixedAssetWrite, PermissionAction::Write);
    }

    #[test]
    fn test_to_shared_fixed_asset_depreciate() {
        assert_permission_maps(ErpPermission::FixedAssetDepreciate, PermissionAction::Write);
    }

    #[test]
    fn test_to_shared_report_read() {
        assert_permission_maps(ErpPermission::ReportRead, PermissionAction::Read);
    }

    #[test]
    fn test_to_shared_all_is_admin() {
        assert_permission_maps(ErpPermission::All, PermissionAction::Admin);
    }

    #[test]
    fn test_display_uses_shared_output() {
        // Display delegates to SharedModulePermission Display which produces a
        // stable string like "erp:read".  Just verify non-empty output and the
        // shared permission representation can be formatted.
        let variants = [
            ErpPermission::AssetRead,
            ErpPermission::VoucherAudit,
            ErpPermission::All,
        ];
        for v in variants {
            let s = format!("{}", v);
            assert!(!s.is_empty(), "Display for {:?} should be non-empty", v);
            // SharedModulePermission Display always includes module code prefix
            assert!(
                s.contains("erp"),
                "Display {:?} output '{}' should contain module prefix",
                v,
                s
            );
        }
    }

    #[test]
    fn test_clone_partial_eq_work() {
        let a = ErpPermission::VoucherRead;
        let b = a.clone();
        assert_eq!(a, b);
        assert_ne!(a, ErpPermission::VoucherWrite);
        // Derive debug so format works
        let _ = format!("{:?}", ErpPermission::FixedAssetDepreciate);
    }

    #[test]
    fn test_module_permission_alias() {
        // ModulePermission is a type alias for ErpPermission; verify they're
        // the same type by constructing through both paths.
        let _a: ModulePermission = ErpPermission::AssetRead;
        let _b: ErpPermission = ModulePermission::FinanceWrite;
    }
}
