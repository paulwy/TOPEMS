use sqlx::PgPool;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::permission::{
    check_module_permission, ModuleCode, ModulePermission as SharedModulePermission,
    PermissionAction,
};
use topems_shared_core::response::ApiResponse;

pub enum PmPermission {
    ProjectView,
    ProjectCreate,
    ProjectEdit,
    ProjectDelete,
    BudgetView,
    BudgetEdit,
    ContractView,
    ContractEdit,
}

impl PmPermission {
    pub fn to_shared(&self) -> SharedModulePermission {
        match self {
            PmPermission::ProjectView => {
                SharedModulePermission::new(ModuleCode::Pm, PermissionAction::Read)
            }
            PmPermission::ProjectCreate => {
                SharedModulePermission::new(ModuleCode::Pm, PermissionAction::Write)
            }
            PmPermission::ProjectEdit => {
                SharedModulePermission::new(ModuleCode::Pm, PermissionAction::Write)
            }
            PmPermission::ProjectDelete => {
                SharedModulePermission::new(ModuleCode::Pm, PermissionAction::Delete)
            }
            PmPermission::BudgetView => {
                SharedModulePermission::new(ModuleCode::Pm, PermissionAction::Read)
            }
            PmPermission::BudgetEdit => {
                SharedModulePermission::new(ModuleCode::Pm, PermissionAction::Write)
            }
            PmPermission::ContractView => {
                SharedModulePermission::new(ModuleCode::Pm, PermissionAction::Read)
            }
            PmPermission::ContractEdit => {
                SharedModulePermission::new(ModuleCode::Pm, PermissionAction::Write)
            }
        }
    }
}

impl std::fmt::Display for PmPermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.to_shared())
    }
}

pub type ModulePermission = PmPermission;

pub async fn check_permission<T>(
    db: &PgPool,
    claims: &Claims,
    permission: &PmPermission,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    let shared_perm = permission.to_shared();
    check_module_permission(db, claims, &shared_perm).await
}

pub fn has_permission(claims: &Claims, permission: PmPermission) -> bool {
    if claims.is_superuser {
        return true;
    }
    let perm_str = permission.to_string();
    claims.has_permission(&perm_str) || claims.has_permission("pm:admin")
}

#[cfg(test)]
mod tests {
    use super::*;
    use topems_shared_auth::auth::Claims;

    fn make_claims(is_superuser: bool, permissions: Vec<String>) -> Claims {
        Claims {
            sub: "123e4567-e89b-12d3-a456-426614174000".to_string(),
            username: "u".to_string(),
            role: "user".to_string(),
            roles: vec!["user".to_string()],
            permissions,
            is_superuser,
            exp: 0,
            iat: 0,
            email: None,
            department: None,
            tenant_id: None,
            department_id: None,
            position_id: None,
            position_code: None,
        }
    }

    // ---- PmPermission::to_shared ----

    #[test]
    fn test_project_view_maps_to_pm_read() {
        let sp = PmPermission::ProjectView.to_shared();
        assert_eq!(sp.module, ModuleCode::Pm);
        assert_eq!(sp.action, PermissionAction::Read);
    }

    #[test]
    fn test_project_create_maps_to_pm_write() {
        let sp = PmPermission::ProjectCreate.to_shared();
        assert_eq!(sp.module, ModuleCode::Pm);
        assert_eq!(sp.action, PermissionAction::Write);
    }

    #[test]
    fn test_project_edit_maps_to_pm_write() {
        let sp = PmPermission::ProjectEdit.to_shared();
        assert_eq!(sp.module, ModuleCode::Pm);
        assert_eq!(sp.action, PermissionAction::Write);
    }

    #[test]
    fn test_project_delete_maps_to_pm_delete() {
        let sp = PmPermission::ProjectDelete.to_shared();
        assert_eq!(sp.module, ModuleCode::Pm);
        assert_eq!(sp.action, PermissionAction::Delete);
    }

    #[test]
    fn test_budget_view_maps_to_pm_read() {
        let sp = PmPermission::BudgetView.to_shared();
        assert_eq!(sp.module, ModuleCode::Pm);
        assert_eq!(sp.action, PermissionAction::Read);
    }

    #[test]
    fn test_budget_edit_maps_to_pm_write() {
        let sp = PmPermission::BudgetEdit.to_shared();
        assert_eq!(sp.module, ModuleCode::Pm);
        assert_eq!(sp.action, PermissionAction::Write);
    }

    #[test]
    fn test_contract_view_maps_to_pm_read() {
        let sp = PmPermission::ContractView.to_shared();
        assert_eq!(sp.module, ModuleCode::Pm);
        assert_eq!(sp.action, PermissionAction::Read);
    }

    #[test]
    fn test_contract_edit_maps_to_pm_write() {
        let sp = PmPermission::ContractEdit.to_shared();
        assert_eq!(sp.module, ModuleCode::Pm);
        assert_eq!(sp.action, PermissionAction::Write);
    }

    #[test]
    fn test_all_pm_permissions_map_to_pm_module() {
        let all = [
            PmPermission::ProjectView,
            PmPermission::ProjectCreate,
            PmPermission::ProjectEdit,
            PmPermission::ProjectDelete,
            PmPermission::BudgetView,
            PmPermission::BudgetEdit,
            PmPermission::ContractView,
            PmPermission::ContractEdit,
        ];
        for p in all {
            assert_eq!(p.to_shared().module, ModuleCode::Pm);
        }
    }

    // ---- PmPermission Display ----

    #[test]
    fn test_display_project_view_is_pm_read() {
        assert_eq!(PmPermission::ProjectView.to_string(), "pm:read");
    }

    #[test]
    fn test_display_project_create_is_pm_write() {
        assert_eq!(PmPermission::ProjectCreate.to_string(), "pm:write");
    }

    #[test]
    fn test_display_project_edit_is_pm_write() {
        assert_eq!(PmPermission::ProjectEdit.to_string(), "pm:write");
    }

    #[test]
    fn test_display_project_delete_is_pm_delete() {
        assert_eq!(PmPermission::ProjectDelete.to_string(), "pm:delete");
    }

    #[test]
    fn test_display_budget_view_is_pm_read() {
        assert_eq!(PmPermission::BudgetView.to_string(), "pm:read");
    }

    #[test]
    fn test_display_budget_edit_is_pm_write() {
        assert_eq!(PmPermission::BudgetEdit.to_string(), "pm:write");
    }

    #[test]
    fn test_display_contract_view_is_pm_read() {
        assert_eq!(PmPermission::ContractView.to_string(), "pm:read");
    }

    #[test]
    fn test_display_contract_edit_is_pm_write() {
        assert_eq!(PmPermission::ContractEdit.to_string(), "pm:write");
    }

    // ---- has_permission ----

    #[test]
    fn test_has_permission_superuser_always_true() {
        let claims = make_claims(true, vec![]);
        assert!(has_permission(&claims, PmPermission::ProjectView));
        assert!(has_permission(&claims, PmPermission::ProjectDelete));
        assert!(has_permission(&claims, PmPermission::BudgetEdit));
        assert!(has_permission(&claims, PmPermission::ContractEdit));
    }

    #[test]
    fn test_has_permission_exact_match_project_view() {
        let claims = make_claims(false, vec!["pm:read".to_string()]);
        assert!(has_permission(&claims, PmPermission::ProjectView));
        assert!(has_permission(&claims, PmPermission::BudgetView));
        assert!(has_permission(&claims, PmPermission::ContractView));
    }

    #[test]
    fn test_has_permission_exact_match_project_create() {
        let claims = make_claims(false, vec!["pm:write".to_string()]);
        assert!(has_permission(&claims, PmPermission::ProjectCreate));
        assert!(has_permission(&claims, PmPermission::ProjectEdit));
        assert!(has_permission(&claims, PmPermission::BudgetEdit));
        assert!(has_permission(&claims, PmPermission::ContractEdit));
    }

    #[test]
    fn test_has_permission_exact_match_project_delete() {
        let claims = make_claims(false, vec!["pm:delete".to_string()]);
        assert!(has_permission(&claims, PmPermission::ProjectDelete));
    }

    #[test]
    fn test_has_permission_admin_grants_all_pm_perms() {
        let claims = make_claims(false, vec!["pm:admin".to_string()]);
        assert!(has_permission(&claims, PmPermission::ProjectView));
        assert!(has_permission(&claims, PmPermission::ProjectCreate));
        assert!(has_permission(&claims, PmPermission::ProjectEdit));
        assert!(has_permission(&claims, PmPermission::ProjectDelete));
        assert!(has_permission(&claims, PmPermission::BudgetView));
        assert!(has_permission(&claims, PmPermission::BudgetEdit));
        assert!(has_permission(&claims, PmPermission::ContractView));
        assert!(has_permission(&claims, PmPermission::ContractEdit));
    }

    #[test]
    fn test_has_permission_no_perms_denied() {
        let claims = make_claims(false, vec![]);
        assert!(!has_permission(&claims, PmPermission::ProjectView));
        assert!(!has_permission(&claims, PmPermission::ProjectCreate));
        assert!(!has_permission(&claims, PmPermission::ProjectEdit));
        assert!(!has_permission(&claims, PmPermission::ProjectDelete));
        assert!(!has_permission(&claims, PmPermission::BudgetView));
        assert!(!has_permission(&claims, PmPermission::BudgetEdit));
        assert!(!has_permission(&claims, PmPermission::ContractView));
        assert!(!has_permission(&claims, PmPermission::ContractEdit));
    }

    #[test]
    fn test_has_permission_unrelated_perm_denied() {
        let claims = make_claims(false, vec!["iam:users_read".to_string()]);
        assert!(!has_permission(&claims, PmPermission::ProjectView));
        assert!(!has_permission(&claims, PmPermission::BudgetEdit));
    }

    #[test]
    fn test_has_permission_pm_admin_with_other_perms() {
        let claims = make_claims(
            false,
            vec!["iam:users_read".to_string(), "pm:admin".to_string()],
        );
        assert!(has_permission(&claims, PmPermission::ProjectView));
        assert!(has_permission(&claims, PmPermission::ProjectDelete));
    }

    #[test]
    fn test_module_permission_type_alias() {
        // ModulePermission is a type alias for PmPermission
        let p: ModulePermission = PmPermission::ProjectView;
        assert_eq!(p.to_string(), "pm:read");
    }

    #[test]
    fn test_pm_permission_module_consistency() {
        // All PmPermission variants map to ModuleCode::Pm — verify via to_string prefix
        let all = [
            PmPermission::ProjectView,
            PmPermission::ProjectCreate,
            PmPermission::ProjectEdit,
            PmPermission::ProjectDelete,
            PmPermission::BudgetView,
            PmPermission::BudgetEdit,
            PmPermission::ContractView,
            PmPermission::ContractEdit,
        ];
        for p in all {
            let s = p.to_string();
            assert!(s.starts_with("pm:"), "{} should start with pm:", s);
        }
    }
}
