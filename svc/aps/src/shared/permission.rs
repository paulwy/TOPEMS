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

#[cfg(test)]
mod tests {
    use super::*;
    use topems_shared_auth::permission::{ModuleCode, PermissionAction};

    #[test]
    fn test_permission_production_plan_read() {
        let p = ApsPermission::ProductionPlanRead.to_shared();
        assert_eq!(p.module, ModuleCode::Mes);
        assert_eq!(p.action, PermissionAction::Read);
    }

    #[test]
    fn test_permission_production_plan_write() {
        let p = ApsPermission::ProductionPlanWrite.to_shared();
        assert_eq!(p.module, ModuleCode::Mes);
        assert_eq!(p.action, PermissionAction::Write);
    }

    #[test]
    fn test_permission_schedule_read() {
        let p = ApsPermission::ScheduleRead.to_shared();
        assert_eq!(p.module, ModuleCode::Mes);
        assert_eq!(p.action, PermissionAction::Read);
    }

    #[test]
    fn test_permission_schedule_write() {
        let p = ApsPermission::ScheduleWrite.to_shared();
        assert_eq!(p.module, ModuleCode::Mes);
        assert_eq!(p.action, PermissionAction::Write);
    }

    #[test]
    fn test_permission_capacity_read() {
        let p = ApsPermission::CapacityRead.to_shared();
        assert_eq!(p.module, ModuleCode::Mes);
        assert_eq!(p.action, PermissionAction::Read);
    }

    #[test]
    fn test_permission_capacity_write() {
        let p = ApsPermission::CapacityWrite.to_shared();
        assert_eq!(p.module, ModuleCode::Mes);
        assert_eq!(p.action, PermissionAction::Write);
    }

    #[test]
    fn test_permission_material_plan_read() {
        let p = ApsPermission::MaterialPlanRead.to_shared();
        assert_eq!(p.module, ModuleCode::Mes);
        assert_eq!(p.action, PermissionAction::Read);
    }

    #[test]
    fn test_permission_material_plan_write() {
        let p = ApsPermission::MaterialPlanWrite.to_shared();
        assert_eq!(p.module, ModuleCode::Mes);
        assert_eq!(p.action, PermissionAction::Write);
    }

    #[test]
    fn test_permission_forecast_read() {
        let p = ApsPermission::ForecastRead.to_shared();
        assert_eq!(p.module, ModuleCode::Mes);
        assert_eq!(p.action, PermissionAction::Read);
    }

    #[test]
    fn test_permission_forecast_write() {
        let p = ApsPermission::ForecastWrite.to_shared();
        assert_eq!(p.module, ModuleCode::Mes);
        assert_eq!(p.action, PermissionAction::Write);
    }

    #[test]
    fn test_permission_all() {
        let p = ApsPermission::All.to_shared();
        assert_eq!(p.module, ModuleCode::Mes);
        assert_eq!(p.action, PermissionAction::Admin);
    }

    #[test]
    fn test_permission_clone_eq() {
        let p1 = ApsPermission::ProductionPlanRead;
        let p2 = p1.clone();
        assert_eq!(p1, p2);
        assert_ne!(p1, ApsPermission::ProductionPlanWrite);
    }

    #[test]
    fn test_permission_display_not_empty() {
        let perms = vec![
            ApsPermission::ProductionPlanRead,
            ApsPermission::ProductionPlanWrite,
            ApsPermission::ScheduleRead,
            ApsPermission::All,
        ];
        for p in perms {
            let s = format!("{}", p);
            assert!(!s.is_empty());
        }
    }

    #[test]
    fn test_permission_debug_format() {
        let p = ApsPermission::CapacityWrite;
        let debug_str = format!("{:?}", p);
        assert!(debug_str.contains("CapacityWrite"));
    }

    // ===== Additional Clone/Eq/Display/Debug tests =====

    #[test]
    fn test_all_read_permissions_map_to_read() {
        let read_perms = vec![
            ApsPermission::ProductionPlanRead,
            ApsPermission::ScheduleRead,
            ApsPermission::CapacityRead,
            ApsPermission::MaterialPlanRead,
            ApsPermission::ForecastRead,
        ];
        for p in read_perms {
            assert_eq!(p.to_shared().action, PermissionAction::Read);
            assert_eq!(p.to_shared().module, ModuleCode::Mes);
        }
    }

    #[test]
    fn test_all_write_permissions_map_to_write() {
        let write_perms = vec![
            ApsPermission::ProductionPlanWrite,
            ApsPermission::ScheduleWrite,
            ApsPermission::CapacityWrite,
            ApsPermission::MaterialPlanWrite,
            ApsPermission::ForecastWrite,
        ];
        for p in write_perms {
            assert_eq!(p.to_shared().action, PermissionAction::Write);
            assert_eq!(p.to_shared().module, ModuleCode::Mes);
        }
    }

    #[test]
    fn test_all_permission_clone_roundtrip() {
        let perms = vec![
            ApsPermission::ProductionPlanRead,
            ApsPermission::ProductionPlanWrite,
            ApsPermission::ScheduleRead,
            ApsPermission::ScheduleWrite,
            ApsPermission::CapacityRead,
            ApsPermission::CapacityWrite,
            ApsPermission::MaterialPlanRead,
            ApsPermission::MaterialPlanWrite,
            ApsPermission::ForecastRead,
            ApsPermission::ForecastWrite,
            ApsPermission::All,
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
            ApsPermission::ProductionPlanRead,
            ApsPermission::ProductionPlanWrite,
            ApsPermission::ScheduleRead,
            ApsPermission::ScheduleWrite,
            ApsPermission::CapacityRead,
            ApsPermission::CapacityWrite,
            ApsPermission::MaterialPlanRead,
            ApsPermission::MaterialPlanWrite,
            ApsPermission::ForecastRead,
            ApsPermission::ForecastWrite,
            ApsPermission::All,
        ];
        for p in perms {
            let s = format!("{}", p);
            assert!(!s.is_empty());
        }
    }

    #[test]
    fn test_all_permission_debug_contains_variant_name() {
        let perms: Vec<(&str, ApsPermission)> = vec![
            ("ProductionPlanRead", ApsPermission::ProductionPlanRead),
            ("ProductionPlanWrite", ApsPermission::ProductionPlanWrite),
            ("ScheduleRead", ApsPermission::ScheduleRead),
            ("ScheduleWrite", ApsPermission::ScheduleWrite),
            ("CapacityRead", ApsPermission::CapacityRead),
            ("CapacityWrite", ApsPermission::CapacityWrite),
            ("MaterialPlanRead", ApsPermission::MaterialPlanRead),
            ("MaterialPlanWrite", ApsPermission::MaterialPlanWrite),
            ("ForecastRead", ApsPermission::ForecastRead),
            ("ForecastWrite", ApsPermission::ForecastWrite),
            ("All", ApsPermission::All),
        ];
        for (name, p) in perms {
            let debug = format!("{:?}", p);
            assert!(debug.contains(name), "debug should contain {}", name);
        }
    }

    #[test]
    fn test_permission_neq_different_variants() {
        let perms = vec![
            ApsPermission::ProductionPlanRead,
            ApsPermission::ProductionPlanWrite,
            ApsPermission::ScheduleRead,
            ApsPermission::CapacityWrite,
            ApsPermission::All,
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
        assert_eq!(ApsPermission::All, ApsPermission::All);
        assert_eq!(
            ApsPermission::ProductionPlanRead,
            ApsPermission::ProductionPlanRead
        );
        assert_eq!(ApsPermission::ForecastWrite, ApsPermission::ForecastWrite);
    }

    #[test]
    fn test_permission_all_maps_to_admin() {
        let p = ApsPermission::All;
        let shared = p.to_shared();
        assert_eq!(shared.module, ModuleCode::Mes);
        assert_eq!(shared.action, PermissionAction::Admin);
    }

    #[test]
    fn test_module_permission_type_alias() {
        let p: ModulePermission = ApsPermission::ScheduleRead;
        assert_eq!(p.to_shared().module, ModuleCode::Mes);
        assert_eq!(p.to_shared().action, PermissionAction::Read);
    }

    #[test]
    fn test_permission_display_differs_read_write() {
        let read = format!("{}", ApsPermission::CapacityRead);
        let write = format!("{}", ApsPermission::CapacityWrite);
        assert_ne!(read, write);
    }
}
