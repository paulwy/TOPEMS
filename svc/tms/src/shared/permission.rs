//! TMS Permission Module
//!
//! 权限检查模块，用于验证用户对TMS资源的访问权限

use sqlx::PgPool;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::permission::{
    check_module_permission, ModuleCode, ModulePermission as SharedModulePermission,
    PermissionAction,
};
use topems_shared_core::response::ApiResponse;

#[derive(Debug, Clone, PartialEq)]
pub enum TmsPermission {
    VehicleRead,
    VehicleWrite,
    VehicleApprove,
    DriverRead,
    DriverWrite,
    DriverApprove,
    CarrierRead,
    CarrierWrite,
    CarrierApprove,
    ShipmentRead,
    ShipmentWrite,
    ShipmentApprove,
    RouteRead,
    RouteWrite,
    RouteApprove,
    All,
}

impl TmsPermission {
    pub fn to_shared(&self) -> SharedModulePermission {
        // TMS 暂无独立 ModuleCode，复用 Scm（供应链）模块码
        match self {
            TmsPermission::VehicleRead => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Read)
            }
            TmsPermission::VehicleWrite => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Write)
            }
            TmsPermission::VehicleApprove => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Admin)
            }
            TmsPermission::DriverRead => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Read)
            }
            TmsPermission::DriverWrite => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Write)
            }
            TmsPermission::DriverApprove => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Admin)
            }
            TmsPermission::CarrierRead => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Read)
            }
            TmsPermission::CarrierWrite => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Write)
            }
            TmsPermission::CarrierApprove => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Admin)
            }
            TmsPermission::ShipmentRead => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Read)
            }
            TmsPermission::ShipmentWrite => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Write)
            }
            TmsPermission::ShipmentApprove => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Admin)
            }
            TmsPermission::RouteRead => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Read)
            }
            TmsPermission::RouteWrite => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Write)
            }
            TmsPermission::RouteApprove => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Admin)
            }
            TmsPermission::All => {
                SharedModulePermission::new(ModuleCode::Scm, PermissionAction::Admin)
            }
        }
    }
}

impl std::fmt::Display for TmsPermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.to_shared())
    }
}

pub type ModulePermission = TmsPermission;

pub async fn check_permission<T>(
    db: &PgPool,
    claims: &Claims,
    permission: &TmsPermission,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    let shared_perm = permission.to_shared();
    check_module_permission(db, claims, &shared_perm).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use topems_shared_auth::permission::{ModuleCode, PermissionAction};

    #[test]
    fn test_permission_vehicle_read() {
        let p = TmsPermission::VehicleRead.to_shared();
        assert_eq!(p.module, ModuleCode::Scm);
        assert_eq!(p.action, PermissionAction::Read);
    }

    #[test]
    fn test_permission_vehicle_write() {
        let p = TmsPermission::VehicleWrite.to_shared();
        assert_eq!(p.module, ModuleCode::Scm);
        assert_eq!(p.action, PermissionAction::Write);
    }

    #[test]
    fn test_permission_vehicle_approve() {
        let p = TmsPermission::VehicleApprove.to_shared();
        assert_eq!(p.module, ModuleCode::Scm);
        assert_eq!(p.action, PermissionAction::Admin);
    }

    #[test]
    fn test_permission_driver_read() {
        let p = TmsPermission::DriverRead.to_shared();
        assert_eq!(p.module, ModuleCode::Scm);
        assert_eq!(p.action, PermissionAction::Read);
    }

    #[test]
    fn test_permission_driver_write() {
        let p = TmsPermission::DriverWrite.to_shared();
        assert_eq!(p.module, ModuleCode::Scm);
        assert_eq!(p.action, PermissionAction::Write);
    }

    #[test]
    fn test_permission_driver_approve() {
        let p = TmsPermission::DriverApprove.to_shared();
        assert_eq!(p.module, ModuleCode::Scm);
        assert_eq!(p.action, PermissionAction::Admin);
    }

    #[test]
    fn test_permission_carrier_read() {
        let p = TmsPermission::CarrierRead.to_shared();
        assert_eq!(p.module, ModuleCode::Scm);
        assert_eq!(p.action, PermissionAction::Read);
    }

    #[test]
    fn test_permission_carrier_write() {
        let p = TmsPermission::CarrierWrite.to_shared();
        assert_eq!(p.module, ModuleCode::Scm);
        assert_eq!(p.action, PermissionAction::Write);
    }

    #[test]
    fn test_permission_carrier_approve() {
        let p = TmsPermission::CarrierApprove.to_shared();
        assert_eq!(p.module, ModuleCode::Scm);
        assert_eq!(p.action, PermissionAction::Admin);
    }

    #[test]
    fn test_permission_shipment_read() {
        let p = TmsPermission::ShipmentRead.to_shared();
        assert_eq!(p.module, ModuleCode::Scm);
        assert_eq!(p.action, PermissionAction::Read);
    }

    #[test]
    fn test_permission_shipment_write() {
        let p = TmsPermission::ShipmentWrite.to_shared();
        assert_eq!(p.module, ModuleCode::Scm);
        assert_eq!(p.action, PermissionAction::Write);
    }

    #[test]
    fn test_permission_shipment_approve() {
        let p = TmsPermission::ShipmentApprove.to_shared();
        assert_eq!(p.module, ModuleCode::Scm);
        assert_eq!(p.action, PermissionAction::Admin);
    }

    #[test]
    fn test_permission_route_read() {
        let p = TmsPermission::RouteRead.to_shared();
        assert_eq!(p.module, ModuleCode::Scm);
        assert_eq!(p.action, PermissionAction::Read);
    }

    #[test]
    fn test_permission_route_write() {
        let p = TmsPermission::RouteWrite.to_shared();
        assert_eq!(p.module, ModuleCode::Scm);
        assert_eq!(p.action, PermissionAction::Write);
    }

    #[test]
    fn test_permission_route_approve() {
        let p = TmsPermission::RouteApprove.to_shared();
        assert_eq!(p.module, ModuleCode::Scm);
        assert_eq!(p.action, PermissionAction::Admin);
    }

    #[test]
    fn test_permission_all() {
        let p = TmsPermission::All.to_shared();
        assert_eq!(p.module, ModuleCode::Scm);
        assert_eq!(p.action, PermissionAction::Admin);
    }

    #[test]
    fn test_permission_clone_eq() {
        let p1 = TmsPermission::VehicleRead;
        let p2 = p1.clone();
        assert_eq!(p1, p2);
        assert_ne!(p1, TmsPermission::VehicleWrite);
    }

    #[test]
    fn test_permission_display_not_empty() {
        let perms = vec![
            TmsPermission::VehicleRead,
            TmsPermission::DriverApprove,
            TmsPermission::CarrierWrite,
            TmsPermission::All,
        ];
        for p in perms {
            let s = format!("{}", p);
            assert!(!s.is_empty());
        }
    }

    #[test]
    fn test_permission_debug_format() {
        let p = TmsPermission::ShipmentApprove;
        let debug = format!("{:?}", p);
        assert!(debug.contains("ShipmentApprove"));
    }

    // ===== Additional Clone/Eq/Display/Debug tests =====

    #[test]
    fn test_all_read_permissions_map_to_read() {
        let read_perms = vec![
            TmsPermission::VehicleRead,
            TmsPermission::DriverRead,
            TmsPermission::CarrierRead,
            TmsPermission::ShipmentRead,
            TmsPermission::RouteRead,
        ];
        for p in read_perms {
            assert_eq!(p.to_shared().action, PermissionAction::Read);
            assert_eq!(p.to_shared().module, ModuleCode::Scm);
        }
    }

    #[test]
    fn test_all_write_permissions_map_to_write() {
        let write_perms = vec![
            TmsPermission::VehicleWrite,
            TmsPermission::DriverWrite,
            TmsPermission::CarrierWrite,
            TmsPermission::ShipmentWrite,
            TmsPermission::RouteWrite,
        ];
        for p in write_perms {
            assert_eq!(p.to_shared().action, PermissionAction::Write);
            assert_eq!(p.to_shared().module, ModuleCode::Scm);
        }
    }

    #[test]
    fn test_all_approve_permissions_map_to_admin() {
        let approve_perms = vec![
            TmsPermission::VehicleApprove,
            TmsPermission::DriverApprove,
            TmsPermission::CarrierApprove,
            TmsPermission::ShipmentApprove,
            TmsPermission::RouteApprove,
        ];
        for p in approve_perms {
            assert_eq!(p.to_shared().action, PermissionAction::Admin);
            assert_eq!(p.to_shared().module, ModuleCode::Scm);
        }
    }

    #[test]
    fn test_all_permission_clone_roundtrip() {
        let perms = vec![
            TmsPermission::VehicleRead,
            TmsPermission::VehicleWrite,
            TmsPermission::VehicleApprove,
            TmsPermission::DriverRead,
            TmsPermission::DriverWrite,
            TmsPermission::DriverApprove,
            TmsPermission::CarrierRead,
            TmsPermission::CarrierWrite,
            TmsPermission::CarrierApprove,
            TmsPermission::ShipmentRead,
            TmsPermission::ShipmentWrite,
            TmsPermission::ShipmentApprove,
            TmsPermission::RouteRead,
            TmsPermission::RouteWrite,
            TmsPermission::RouteApprove,
            TmsPermission::All,
        ];
        for p in perms {
            let cloned = p.clone();
            assert_eq!(p, cloned);
            assert_eq!(p.to_shared(), cloned.to_shared());
        }
    }

    #[test]
    fn test_all_permission_display_not_empty() {
        let perms = vec![
            TmsPermission::VehicleRead,
            TmsPermission::VehicleWrite,
            TmsPermission::VehicleApprove,
            TmsPermission::DriverRead,
            TmsPermission::DriverWrite,
            TmsPermission::DriverApprove,
            TmsPermission::CarrierRead,
            TmsPermission::CarrierWrite,
            TmsPermission::CarrierApprove,
            TmsPermission::ShipmentRead,
            TmsPermission::ShipmentWrite,
            TmsPermission::ShipmentApprove,
            TmsPermission::RouteRead,
            TmsPermission::RouteWrite,
            TmsPermission::RouteApprove,
            TmsPermission::All,
        ];
        for p in perms {
            let s = format!("{}", p);
            assert!(!s.is_empty());
        }
    }

    #[test]
    fn test_permission_neq_different_variants() {
        let perms = [
            TmsPermission::VehicleRead,
            TmsPermission::VehicleWrite,
            TmsPermission::DriverRead,
            TmsPermission::CarrierApprove,
            TmsPermission::All,
        ];
        for (i, p1) in perms.iter().enumerate() {
            for (j, p2) in perms.iter().enumerate() {
                if i != j {
                    assert_ne!(p1, p2);
                }
            }
        }
    }

    #[test]
    fn test_permission_eq_same_variant() {
        assert_eq!(TmsPermission::All, TmsPermission::All);
        assert_eq!(TmsPermission::VehicleRead, TmsPermission::VehicleRead);
        assert_eq!(
            TmsPermission::ShipmentApprove,
            TmsPermission::ShipmentApprove
        );
    }

    #[test]
    fn test_permission_all_maps_to_admin() {
        let p = TmsPermission::All;
        let shared = p.to_shared();
        assert_eq!(shared.module, ModuleCode::Scm);
        assert_eq!(shared.action, PermissionAction::Admin);
    }

    #[test]
    fn test_module_permission_type_alias() {
        let p: ModulePermission = TmsPermission::RouteRead;
        assert_eq!(p.to_shared().module, ModuleCode::Scm);
        assert_eq!(p.to_shared().action, PermissionAction::Read);
    }

    #[test]
    fn test_permission_display_differs_read_write_approve() {
        let read = format!("{}", TmsPermission::VehicleRead);
        let write = format!("{}", TmsPermission::VehicleWrite);
        let approve = format!("{}", TmsPermission::VehicleApprove);
        assert_ne!(read, write);
        assert_ne!(write, approve);
        assert_ne!(read, approve);
    }
}
