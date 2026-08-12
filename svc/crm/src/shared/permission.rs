use sqlx::PgPool;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::permission::{
    check_module_permission, ModuleCode, ModulePermission as SharedModulePermission,
    PermissionAction,
};
use topems_shared_core::response::ApiResponse;

#[derive(Debug, Clone, PartialEq)]
pub enum CrmPermission {
    CustomerRead,
    CustomerWrite,
    ContactRead,
    ContactWrite,
    OpportunityRead,
    OpportunityWrite,
    InteractionRead,
    InteractionWrite,
    ReturnRead,
    ReturnWrite,
    BillingRead,
    BillingWrite,
    All,
}

impl CrmPermission {
    pub fn to_shared(&self) -> SharedModulePermission {
        match self {
            CrmPermission::CustomerRead => {
                SharedModulePermission::new(ModuleCode::Crm, PermissionAction::Read)
            }
            CrmPermission::CustomerWrite => {
                SharedModulePermission::new(ModuleCode::Crm, PermissionAction::Write)
            }
            CrmPermission::ContactRead => {
                SharedModulePermission::new(ModuleCode::Crm, PermissionAction::Read)
            }
            CrmPermission::ContactWrite => {
                SharedModulePermission::new(ModuleCode::Crm, PermissionAction::Write)
            }
            CrmPermission::OpportunityRead => {
                SharedModulePermission::new(ModuleCode::Crm, PermissionAction::Read)
            }
            CrmPermission::OpportunityWrite => {
                SharedModulePermission::new(ModuleCode::Crm, PermissionAction::Write)
            }
            CrmPermission::InteractionRead => {
                SharedModulePermission::new(ModuleCode::Crm, PermissionAction::Read)
            }
            CrmPermission::InteractionWrite => {
                SharedModulePermission::new(ModuleCode::Crm, PermissionAction::Write)
            }
            CrmPermission::ReturnRead => {
                SharedModulePermission::new(ModuleCode::Crm, PermissionAction::Read)
            }
            CrmPermission::ReturnWrite => {
                SharedModulePermission::new(ModuleCode::Crm, PermissionAction::Write)
            }
            CrmPermission::BillingRead => {
                SharedModulePermission::new(ModuleCode::Crm, PermissionAction::Read)
            }
            CrmPermission::BillingWrite => {
                SharedModulePermission::new(ModuleCode::Crm, PermissionAction::Write)
            }
            CrmPermission::All => {
                SharedModulePermission::new(ModuleCode::Crm, PermissionAction::Admin)
            }
        }
    }
}

impl std::fmt::Display for CrmPermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.to_shared())
    }
}

pub type ModulePermission = CrmPermission;

pub async fn check_permission<T>(
    db: &PgPool,
    claims: &Claims,
    permission: &CrmPermission,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    let shared_perm = permission.to_shared();
    check_module_permission(db, claims, &shared_perm).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_crm_permission_all_variants() {
        let variants = [
            CrmPermission::CustomerRead,
            CrmPermission::CustomerWrite,
            CrmPermission::ContactRead,
            CrmPermission::ContactWrite,
            CrmPermission::OpportunityRead,
            CrmPermission::OpportunityWrite,
            CrmPermission::InteractionRead,
            CrmPermission::InteractionWrite,
            CrmPermission::ReturnRead,
            CrmPermission::ReturnWrite,
            CrmPermission::BillingRead,
            CrmPermission::BillingWrite,
            CrmPermission::All,
        ];
        for v in &variants {
            let debug = format!("{:?}", v);
            assert!(!debug.is_empty());
        }
    }

    #[test]
    fn test_crm_permission_clone_and_eq() {
        let a = CrmPermission::CustomerRead;
        let b = a.clone();
        assert_eq!(a, b);

        let c = CrmPermission::CustomerWrite;
        assert_ne!(a, c);
        assert_ne!(CrmPermission::All, CrmPermission::ContactRead);
        assert_ne!(CrmPermission::ReturnRead, CrmPermission::BillingRead);
    }

    #[test]
    fn test_crm_permission_to_shared_returns_value() {
        let read_perms = [
            CrmPermission::CustomerRead,
            CrmPermission::ContactRead,
            CrmPermission::OpportunityRead,
            CrmPermission::InteractionRead,
            CrmPermission::ReturnRead,
            CrmPermission::BillingRead,
        ];
        for p in &read_perms {
            let shared = p.to_shared();
            let s = format!("{}", shared);
            assert!(!s.is_empty());
        }

        let write_perms = [
            CrmPermission::CustomerWrite,
            CrmPermission::ContactWrite,
            CrmPermission::OpportunityWrite,
            CrmPermission::InteractionWrite,
            CrmPermission::ReturnWrite,
            CrmPermission::BillingWrite,
        ];
        for p in &write_perms {
            let shared = p.to_shared();
            let s = format!("{}", shared);
            assert!(!s.is_empty());
        }

        let shared = CrmPermission::All.to_shared();
        let s = format!("{}", shared);
        assert!(!s.is_empty());
    }

    #[test]
    fn test_crm_permission_display_not_empty() {
        let all = [
            CrmPermission::CustomerRead,
            CrmPermission::CustomerWrite,
            CrmPermission::ContactRead,
            CrmPermission::ContactWrite,
            CrmPermission::OpportunityRead,
            CrmPermission::OpportunityWrite,
            CrmPermission::InteractionRead,
            CrmPermission::InteractionWrite,
            CrmPermission::ReturnRead,
            CrmPermission::ReturnWrite,
            CrmPermission::BillingRead,
            CrmPermission::BillingWrite,
            CrmPermission::All,
        ];
        for v in &all {
            let display = format!("{}", v);
            assert!(
                !display.is_empty(),
                "Display for {:?} should not be empty",
                v
            );
        }
    }

    #[test]
    fn test_crm_permission_partial_ne() {
        assert_ne!(CrmPermission::CustomerRead, CrmPermission::CustomerWrite);
        assert_ne!(CrmPermission::ContactRead, CrmPermission::ContactWrite);
        assert_ne!(
            CrmPermission::OpportunityRead,
            CrmPermission::OpportunityWrite
        );
        assert_ne!(
            CrmPermission::InteractionRead,
            CrmPermission::InteractionWrite
        );
        assert_ne!(CrmPermission::ReturnRead, CrmPermission::ReturnWrite);
        assert_ne!(CrmPermission::BillingRead, CrmPermission::BillingWrite);
        assert_ne!(CrmPermission::ReturnRead, CrmPermission::BillingRead);
    }
}
