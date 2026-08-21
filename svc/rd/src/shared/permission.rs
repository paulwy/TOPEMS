#![allow(dead_code)] // Reserved: 权限共享模块预留扩展，待 RBAC 完整接入后启用

use sqlx::PgPool;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::permission::{
    check_module_permission, ModuleCode, ModulePermission as SharedModulePermission,
    PermissionAction,
};
use topems_shared_core::response::ApiResponse;

#[derive(Debug, Clone, PartialEq)]
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

#[cfg(test)]
mod tests {
    use super::*;
    use topems_shared_auth::auth::Claims;
    use topems_shared_auth::permission::{ModuleCode, PermissionAction};

    fn make_claims(permissions: &[&str], is_superuser: bool) -> Claims {
        Claims {
            sub: "00000000-0000-0000-0000-000000000001".to_string(),
            username: "tester".to_string(),
            role: "researcher".to_string(),
            roles: vec![],
            permissions: permissions.iter().map(|s| s.to_string()).collect(),
            is_superuser,
            exp: 9999999999,
            iat: 0,
            email: None,
            department: None,
            tenant_id: None,
            department_id: None,
            position_id: None,
            position_code: None,
        }
    }

    #[test]
    fn test_permission_experiment_view_maps_read() {
        let p = RsPermission::ExperimentView.to_shared();
        assert_eq!(p.module, ModuleCode::Rs);
        assert_eq!(p.action, PermissionAction::Read);
    }

    #[test]
    fn test_permission_experiment_create_maps_write() {
        let p = RsPermission::ExperimentCreate.to_shared();
        assert_eq!(p.module, ModuleCode::Rs);
        assert_eq!(p.action, PermissionAction::Write);
    }

    #[test]
    fn test_permission_material_view_maps_read() {
        let p = RsPermission::MaterialView.to_shared();
        assert_eq!(p.module, ModuleCode::Rs);
        assert_eq!(p.action, PermissionAction::Read);
    }

    #[test]
    fn test_permission_material_edit_maps_write() {
        let p = RsPermission::MaterialEdit.to_shared();
        assert_eq!(p.module, ModuleCode::Rs);
        assert_eq!(p.action, PermissionAction::Write);
    }

    #[test]
    fn test_permission_formula_view_maps_read() {
        let p = RsPermission::FormulaView.to_shared();
        assert_eq!(p.module, ModuleCode::Rs);
        assert_eq!(p.action, PermissionAction::Read);
    }

    #[test]
    fn test_permission_formula_edit_maps_write() {
        let p = RsPermission::FormulaEdit.to_shared();
        assert_eq!(p.module, ModuleCode::Rs);
        assert_eq!(p.action, PermissionAction::Write);
    }

    #[test]
    fn test_permission_all_maps_admin() {
        let p = RsPermission::All.to_shared();
        assert_eq!(p.module, ModuleCode::Rs);
        assert_eq!(p.action, PermissionAction::Admin);
    }

    #[test]
    fn test_permission_display_format() {
        assert_eq!(RsPermission::ExperimentView.to_string(), "rs:read");
        assert_eq!(RsPermission::ExperimentCreate.to_string(), "rs:write");
        assert_eq!(RsPermission::All.to_string(), "rs:admin");
    }

    #[test]
    fn test_permission_clone_eq() {
        let p1 = RsPermission::ExperimentView;
        let p2 = p1.clone();
        assert_eq!(p1, p2);
        assert_ne!(p1, RsPermission::ExperimentCreate);
    }

    #[test]
    fn test_permission_debug_contains_variant() {
        let perms: Vec<(&str, RsPermission)> = vec![
            ("ExperimentView", RsPermission::ExperimentView),
            ("ExperimentCreate", RsPermission::ExperimentCreate),
            ("MaterialView", RsPermission::MaterialView),
            ("MaterialEdit", RsPermission::MaterialEdit),
            ("FormulaView", RsPermission::FormulaView),
            ("FormulaEdit", RsPermission::FormulaEdit),
            ("All", RsPermission::All),
        ];
        for (name, p) in perms {
            let debug = format!("{:?}", p);
            assert!(debug.contains(name), "debug should contain {}", name);
        }
    }

    #[test]
    fn test_permission_neq_different_variants() {
        let perms = [
            RsPermission::ExperimentView,
            RsPermission::ExperimentCreate,
            RsPermission::MaterialView,
            RsPermission::MaterialEdit,
            RsPermission::FormulaView,
            RsPermission::FormulaEdit,
            RsPermission::All,
        ];
        for (i, a) in perms.iter().enumerate() {
            for (j, b) in perms.iter().enumerate() {
                if i != j {
                    assert_ne!(a, b);
                } else {
                    assert_eq!(a, b);
                }
            }
        }
    }

    #[test]
    fn test_all_read_permissions_map_to_read() {
        for p in [
            RsPermission::ExperimentView,
            RsPermission::MaterialView,
            RsPermission::FormulaView,
        ] {
            assert_eq!(p.to_shared().action, PermissionAction::Read);
            assert_eq!(p.to_shared().module, ModuleCode::Rs);
        }
    }

    #[test]
    fn test_all_write_permissions_map_to_write() {
        for p in [
            RsPermission::ExperimentCreate,
            RsPermission::MaterialEdit,
            RsPermission::FormulaEdit,
        ] {
            assert_eq!(p.to_shared().action, PermissionAction::Write);
            assert_eq!(p.to_shared().module, ModuleCode::Rs);
        }
    }

    #[test]
    fn test_module_permission_type_alias() {
        let p: ModulePermission = RsPermission::FormulaView;
        assert_eq!(p.to_shared().module, ModuleCode::Rs);
        assert_eq!(p.to_shared().action, PermissionAction::Read);
    }

    #[test]
    fn test_display_differs_read_write() {
        let read = format!("{}", RsPermission::ExperimentView);
        let write = format!("{}", RsPermission::ExperimentCreate);
        assert_ne!(read, write);
    }

    // ===== has_permission (pure, Claims-based) tests =====

    #[test]
    fn test_has_permission_superuser_grants_all() {
        let claims = make_claims(&[], true);
        assert!(has_permission(&claims, RsPermission::ExperimentView));
        assert!(has_permission(&claims, RsPermission::ExperimentCreate));
        assert!(has_permission(&claims, RsPermission::All));
    }

    #[test]
    fn test_has_permission_exact_match() {
        let claims = make_claims(&["rs:read"], false);
        assert!(has_permission(&claims, RsPermission::ExperimentView));
        assert!(has_permission(&claims, RsPermission::MaterialView));
        assert!(has_permission(&claims, RsPermission::FormulaView));
    }

    #[test]
    fn test_has_permission_no_match() {
        let claims = make_claims(&["rs:read"], false);
        assert!(!has_permission(&claims, RsPermission::ExperimentCreate));
        assert!(!has_permission(&claims, RsPermission::MaterialEdit));
        assert!(!has_permission(&claims, RsPermission::All));
    }

    #[test]
    fn test_has_permission_admin_grants_everything() {
        let claims = make_claims(&["rs:admin"], false);
        assert!(has_permission(&claims, RsPermission::ExperimentView));
        assert!(has_permission(&claims, RsPermission::ExperimentCreate));
        assert!(has_permission(&claims, RsPermission::All));
    }

    #[test]
    fn test_has_permission_empty_permissions() {
        let claims = make_claims(&[], false);
        assert!(!has_permission(&claims, RsPermission::ExperimentView));
        assert!(!has_permission(&claims, RsPermission::All));
    }

    #[test]
    fn test_has_permission_write_does_not_imply_read() {
        // rs:write does not grant rs:read under strict has_permission
        let claims = make_claims(&["rs:write"], false);
        assert!(!has_permission(&claims, RsPermission::ExperimentView));
        assert!(has_permission(&claims, RsPermission::ExperimentCreate));
    }

    #[test]
    fn test_has_permission_unrelated_permission_denied() {
        let claims = make_claims(&["iam:admin", "pm:read"], false);
        assert!(!has_permission(&claims, RsPermission::ExperimentView));
        assert!(!has_permission(&claims, RsPermission::All));
    }
}
