use sqlx::PgPool;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::permission::{
    check_module_permission, ModuleCode, ModulePermission as SharedModulePermission,
    PermissionAction,
};
use topems_shared_core::response::ApiResponse;

#[derive(Debug, Clone, PartialEq)]
pub enum WmsPermission {
    WarehouseRead,
    WarehouseWrite,
    InventoryRead,
    InventoryWrite,
    InboundRead,
    InboundWrite,
    OutboundRead,
    OutboundWrite,
    StockTakeRead,
    StockTakeWrite,
    TransferRead,
    TransferWrite,
    WavePickRead,
    WavePickWrite,
    MovementRead,
    MovementWrite,
    DashboardRead,
    InboundApprove,
    OutboundApprove,
    StockTakeApprove,
    TransferApprove,
    All,
}

impl WmsPermission {
    pub fn to_shared(&self) -> SharedModulePermission {
        match self {
            WmsPermission::WarehouseRead => {
                SharedModulePermission::new(ModuleCode::Wms, PermissionAction::Read)
            }
            WmsPermission::WarehouseWrite => {
                SharedModulePermission::new(ModuleCode::Wms, PermissionAction::Write)
            }
            WmsPermission::InventoryRead => {
                SharedModulePermission::new(ModuleCode::Wms, PermissionAction::Read)
            }
            WmsPermission::InventoryWrite => {
                SharedModulePermission::new(ModuleCode::Wms, PermissionAction::Write)
            }
            WmsPermission::InboundRead => {
                SharedModulePermission::new(ModuleCode::Wms, PermissionAction::Read)
            }
            WmsPermission::InboundWrite => {
                SharedModulePermission::new(ModuleCode::Wms, PermissionAction::Write)
            }
            WmsPermission::OutboundRead => {
                SharedModulePermission::new(ModuleCode::Wms, PermissionAction::Read)
            }
            WmsPermission::OutboundWrite => {
                SharedModulePermission::new(ModuleCode::Wms, PermissionAction::Write)
            }
            WmsPermission::StockTakeRead => {
                SharedModulePermission::new(ModuleCode::Wms, PermissionAction::Read)
            }
            WmsPermission::StockTakeWrite => {
                SharedModulePermission::new(ModuleCode::Wms, PermissionAction::Write)
            }
            WmsPermission::TransferRead => {
                SharedModulePermission::new(ModuleCode::Wms, PermissionAction::Read)
            }
            WmsPermission::TransferWrite => {
                SharedModulePermission::new(ModuleCode::Wms, PermissionAction::Write)
            }
            WmsPermission::WavePickRead => {
                SharedModulePermission::new(ModuleCode::Wms, PermissionAction::Read)
            }
            WmsPermission::WavePickWrite => {
                SharedModulePermission::new(ModuleCode::Wms, PermissionAction::Write)
            }
            WmsPermission::MovementRead => {
                SharedModulePermission::new(ModuleCode::Wms, PermissionAction::Read)
            }
            WmsPermission::MovementWrite => {
                SharedModulePermission::new(ModuleCode::Wms, PermissionAction::Write)
            }
            WmsPermission::DashboardRead => {
                SharedModulePermission::new(ModuleCode::Wms, PermissionAction::Read)
            }
            WmsPermission::InboundApprove => {
                SharedModulePermission::new(ModuleCode::Wms, PermissionAction::Admin)
            }
            WmsPermission::OutboundApprove => {
                SharedModulePermission::new(ModuleCode::Wms, PermissionAction::Admin)
            }
            WmsPermission::StockTakeApprove => {
                SharedModulePermission::new(ModuleCode::Wms, PermissionAction::Admin)
            }
            WmsPermission::TransferApprove => {
                SharedModulePermission::new(ModuleCode::Wms, PermissionAction::Admin)
            }
            WmsPermission::All => {
                SharedModulePermission::new(ModuleCode::Wms, PermissionAction::Admin)
            }
        }
    }
}

impl std::fmt::Display for WmsPermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.to_shared())
    }
}

pub type ModulePermission = WmsPermission;

pub async fn check_permission<T>(
    db: &PgPool,
    claims: &Claims,
    permission: &WmsPermission,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    let shared_perm = permission.to_shared();
    check_module_permission(db, claims, &shared_perm).await
}

pub fn has_wms_permission(claims: &Claims, action: &str) -> bool {
    if claims.is_superuser {
        return true;
    }

    let permission_str = format!("wms:{}", action);
    claims.has_permission(&permission_str)
        || claims.has_permission("wms:admin")
        || claims.has_permission("all")
}

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;

    #[test]
    fn wms_permission_warehouse_read_maps_to_read_action() {
        let p = WmsPermission::WarehouseRead.to_shared();
        assert_eq!(p.module, ModuleCode::Wms);
        assert_eq!(p.action, PermissionAction::Read);
    }

    #[test]
    fn wms_permission_warehouse_write_maps_to_write_action() {
        let p = WmsPermission::WarehouseWrite.to_shared();
        assert_eq!(p.action, PermissionAction::Write);
    }

    #[test]
    fn wms_permission_inventory_read_write_mapping() {
        assert_eq!(
            WmsPermission::InventoryRead.to_shared().action,
            PermissionAction::Read
        );
        assert_eq!(
            WmsPermission::InventoryWrite.to_shared().action,
            PermissionAction::Write
        );
    }

    #[test]
    fn wms_permission_inbound_approve_maps_to_admin() {
        assert_eq!(
            WmsPermission::InboundApprove.to_shared().action,
            PermissionAction::Admin
        );
    }

    #[test]
    fn wms_permission_outbound_approve_maps_to_admin() {
        assert_eq!(
            WmsPermission::OutboundApprove.to_shared().action,
            PermissionAction::Admin
        );
    }

    #[test]
    fn wms_permission_all_approve_variants_are_admin() {
        assert_eq!(
            WmsPermission::StockTakeApprove.to_shared().action,
            PermissionAction::Admin
        );
        assert_eq!(
            WmsPermission::TransferApprove.to_shared().action,
            PermissionAction::Admin
        );
        assert_eq!(
            WmsPermission::All.to_shared().action,
            PermissionAction::Admin
        );
    }

    #[test]
    fn wms_permission_all_variants_use_wms_module() {
        let variants = [
            WmsPermission::WarehouseRead,
            WmsPermission::WarehouseWrite,
            WmsPermission::InventoryRead,
            WmsPermission::InventoryWrite,
            WmsPermission::InboundRead,
            WmsPermission::InboundWrite,
            WmsPermission::OutboundRead,
            WmsPermission::OutboundWrite,
            WmsPermission::StockTakeRead,
            WmsPermission::StockTakeWrite,
            WmsPermission::TransferRead,
            WmsPermission::TransferWrite,
            WmsPermission::WavePickRead,
            WmsPermission::WavePickWrite,
            WmsPermission::MovementRead,
            WmsPermission::MovementWrite,
            WmsPermission::DashboardRead,
            WmsPermission::InboundApprove,
            WmsPermission::OutboundApprove,
            WmsPermission::StockTakeApprove,
            WmsPermission::TransferApprove,
            WmsPermission::All,
        ];
        for v in &variants {
            assert_eq!(v.to_shared().module, ModuleCode::Wms);
        }
    }

    #[test]
    fn wms_permission_display_does_not_panic() {
        // Display delegates to to_shared(); ensure it produces a non-empty string.
        let s = WmsPermission::WarehouseRead.to_string();
        assert!(!s.is_empty());
        let s2 = WmsPermission::All.to_string();
        assert!(!s2.is_empty());
    }

    #[test]
    fn wms_permission_equality() {
        assert_eq!(WmsPermission::WarehouseRead, WmsPermission::WarehouseRead);
        assert_ne!(WmsPermission::WarehouseRead, WmsPermission::WarehouseWrite);
        assert_eq!(WmsPermission::All, WmsPermission::All);
    }

    fn make_claims(is_superuser: bool, permissions: Vec<&str>) -> Claims {
        Claims {
            sub: Uuid::new_v4().to_string(),
            username: "tester".into(),
            role: "admin".into(),
            roles: vec![],
            permissions: permissions.into_iter().map(String::from).collect(),
            is_superuser,
            exp: 9999999999,
            iat: 0,
            email: None,
            department: None,
            tenant_id: Some(Uuid::new_v4().to_string()),
            department_id: None,
            position_id: None,
            position_code: None,
        }
    }

    #[test]
    fn has_wms_permission_superuser_always_true() {
        let claims = make_claims(true, vec![]);
        assert!(has_wms_permission(&claims, "read"));
        assert!(has_wms_permission(&claims, "write"));
        assert!(has_wms_permission(&claims, "anything"));
    }

    #[test]
    fn has_wms_permission_with_exact_permission() {
        let claims = make_claims(false, vec!["wms:read"]);
        assert!(has_wms_permission(&claims, "read"));
        assert!(!has_wms_permission(&claims, "write"));
    }

    #[test]
    fn has_wms_permission_with_admin_permission() {
        let claims = make_claims(false, vec!["wms:admin"]);
        assert!(has_wms_permission(&claims, "read"));
        assert!(has_wms_permission(&claims, "write"));
        assert!(has_wms_permission(&claims, "approve"));
    }

    #[test]
    fn has_wms_permission_with_all_permission() {
        let claims = make_claims(false, vec!["all"]);
        assert!(has_wms_permission(&claims, "read"));
        assert!(has_wms_permission(&claims, "write"));
    }

    #[test]
    fn has_wms_permission_no_permissions_returns_false() {
        let claims = make_claims(false, vec![]);
        assert!(!has_wms_permission(&claims, "read"));
        assert!(!has_wms_permission(&claims, "write"));
    }

    #[test]
    fn has_wms_permission_unrelated_permission_returns_false() {
        let claims = make_claims(false, vec!["other:read"]);
        assert!(!has_wms_permission(&claims, "read"));
    }

    // ===================== 扩展覆盖：permission string 构造与边界 =====================

    #[test]
    fn has_wms_permission_formats_wms_prefix_correctly() {
        // 权限字符串格式 "wms:{action}"，验证 action 直接拼接
        let claims = make_claims(false, vec!["wms:approve"]);
        assert!(has_wms_permission(&claims, "approve"));
        // "wms:approve" 不应满足 "read"（精确匹配）
        assert!(!has_wms_permission(&claims, "read"));
    }

    #[test]
    fn has_wms_permission_with_empty_action_string() {
        // action 为空字符串 → 权限串变成 "wms:"，几乎不会匹配
        let claims = make_claims(false, vec!["wms:"]);
        assert!(has_wms_permission(&claims, ""));
        assert!(!has_wms_permission(&claims, "read"));
    }

    #[test]
    fn has_wms_permission_admin_satisfies_arbitrary_action() {
        let claims = make_claims(false, vec!["wms:admin"]);
        for action in &["read", "write", "approve", "delete", "custom_action"] {
            assert!(has_wms_permission(&claims, action));
        }
    }

    #[test]
    fn has_wms_permission_all_satisfies_arbitrary_action() {
        let claims = make_claims(false, vec!["all"]);
        for action in &["read", "write", "approve", "delete", "custom_action"] {
            assert!(has_wms_permission(&claims, action));
        }
    }

    #[test]
    fn has_wms_permission_superuser_overrides_empty_permissions() {
        // is_superuser=true 且 permissions 为空仍然放行
        let claims = make_claims(true, vec![]);
        assert!(has_wms_permission(&claims, "anything"));
    }

    #[test]
    fn wms_permission_clone_preserves_variant() {
        let p = WmsPermission::InventoryWrite;
        let cloned = p.clone();
        assert_eq!(p, cloned);
        // 不同变体不相等
        assert_ne!(cloned, WmsPermission::InventoryRead);
    }

    #[test]
    fn wms_permission_all_read_variants_map_to_read_action() {
        let read_variants = [
            WmsPermission::WarehouseRead,
            WmsPermission::InventoryRead,
            WmsPermission::InboundRead,
            WmsPermission::OutboundRead,
            WmsPermission::StockTakeRead,
            WmsPermission::TransferRead,
            WmsPermission::WavePickRead,
            WmsPermission::MovementRead,
            WmsPermission::DashboardRead,
        ];
        for v in &read_variants {
            assert_eq!(v.to_shared().action, PermissionAction::Read);
        }
    }

    #[test]
    fn wms_permission_all_write_variants_map_to_write_action() {
        let write_variants = [
            WmsPermission::WarehouseWrite,
            WmsPermission::InventoryWrite,
            WmsPermission::InboundWrite,
            WmsPermission::OutboundWrite,
            WmsPermission::StockTakeWrite,
            WmsPermission::TransferWrite,
            WmsPermission::WavePickWrite,
            WmsPermission::MovementWrite,
        ];
        for v in &write_variants {
            assert_eq!(v.to_shared().action, PermissionAction::Write);
        }
    }

    #[test]
    fn wms_permission_display_for_all_distinct() {
        // 至少保证 Display 不抛错且非空
        let all_variants = [
            WmsPermission::WarehouseRead,
            WmsPermission::WarehouseWrite,
            WmsPermission::InboundApprove,
            WmsPermission::OutboundApprove,
            WmsPermission::StockTakeApprove,
            WmsPermission::TransferApprove,
            WmsPermission::All,
        ];
        for v in &all_variants {
            let s = v.to_string();
            assert!(!s.is_empty(), "Display for {:?} produced empty string", v);
        }
    }

    #[test]
    fn has_wms_permission_partial_prefix_does_not_match() {
        // "other:wms:read" 不应匹配 "wms:read"（精确权限串）
        let claims = make_claims(false, vec!["other:wms:read"]);
        assert!(!has_wms_permission(&claims, "read"));
    }
}
