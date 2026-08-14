use sqlx::PgPool;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::permission::{
    check_module_permission, ModuleCode, ModulePermission as SharedModulePermission,
    PermissionAction,
};
use topems_shared_core::response::ApiResponse;

#[derive(Debug, Clone, PartialEq)]
pub enum SrmPermission {
    SupplierRead,
    SupplierWrite,
    ContractRead,
    ContractWrite,
    PaymentRead,
    PaymentWrite,
    SourcingRead,
    SourcingWrite,
    VendorAssessmentRead,
    VendorAssessmentWrite,
    All,
}

impl SrmPermission {
    pub fn to_shared(&self) -> SharedModulePermission {
        match self {
            SrmPermission::SupplierRead => {
                SharedModulePermission::new(ModuleCode::Srm, PermissionAction::Read)
            }
            SrmPermission::SupplierWrite => {
                SharedModulePermission::new(ModuleCode::Srm, PermissionAction::Write)
            }
            SrmPermission::ContractRead => {
                SharedModulePermission::new(ModuleCode::Srm, PermissionAction::Read)
            }
            SrmPermission::ContractWrite => {
                SharedModulePermission::new(ModuleCode::Srm, PermissionAction::Write)
            }
            SrmPermission::PaymentRead => {
                SharedModulePermission::new(ModuleCode::Srm, PermissionAction::Read)
            }
            SrmPermission::PaymentWrite => {
                SharedModulePermission::new(ModuleCode::Srm, PermissionAction::Write)
            }
            SrmPermission::SourcingRead => {
                SharedModulePermission::new(ModuleCode::Srm, PermissionAction::Read)
            }
            SrmPermission::SourcingWrite => {
                SharedModulePermission::new(ModuleCode::Srm, PermissionAction::Write)
            }
            SrmPermission::VendorAssessmentRead => {
                SharedModulePermission::new(ModuleCode::Srm, PermissionAction::Read)
            }
            SrmPermission::VendorAssessmentWrite => {
                SharedModulePermission::new(ModuleCode::Srm, PermissionAction::Write)
            }
            SrmPermission::All => {
                SharedModulePermission::new(ModuleCode::Srm, PermissionAction::Admin)
            }
        }
    }
}

impl std::fmt::Display for SrmPermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.to_shared())
    }
}

pub type ModulePermission = SrmPermission;

pub async fn check_permission<T>(
    db: &PgPool,
    claims: &Claims,
    permission: &SrmPermission,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    let shared_perm = permission.to_shared();
    check_module_permission(db, claims, &shared_perm).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use topems_shared_auth::permission::{ModuleCode, PermissionAction};

    #[test]
    fn test_supplier_read_to_shared() {
        let perm = SrmPermission::SupplierRead;
        let shared = perm.to_shared();
        assert_eq!(shared.module, ModuleCode::Srm);
        assert_eq!(shared.action, PermissionAction::Read);
    }

    #[test]
    fn test_supplier_write_to_shared() {
        let perm = SrmPermission::SupplierWrite;
        let shared = perm.to_shared();
        assert_eq!(shared.module, ModuleCode::Srm);
        assert_eq!(shared.action, PermissionAction::Write);
    }

    #[test]
    fn test_contract_read_to_shared() {
        let perm = SrmPermission::ContractRead;
        let shared = perm.to_shared();
        assert_eq!(shared.module, ModuleCode::Srm);
        assert_eq!(shared.action, PermissionAction::Read);
    }

    #[test]
    fn test_contract_write_to_shared() {
        let perm = SrmPermission::ContractWrite;
        let shared = perm.to_shared();
        assert_eq!(shared.module, ModuleCode::Srm);
        assert_eq!(shared.action, PermissionAction::Write);
    }

    #[test]
    fn test_payment_read_to_shared() {
        let perm = SrmPermission::PaymentRead;
        let shared = perm.to_shared();
        assert_eq!(shared.module, ModuleCode::Srm);
        assert_eq!(shared.action, PermissionAction::Read);
    }

    #[test]
    fn test_payment_write_to_shared() {
        let perm = SrmPermission::PaymentWrite;
        let shared = perm.to_shared();
        assert_eq!(shared.module, ModuleCode::Srm);
        assert_eq!(shared.action, PermissionAction::Write);
    }

    #[test]
    fn test_sourcing_read_to_shared() {
        let perm = SrmPermission::SourcingRead;
        let shared = perm.to_shared();
        assert_eq!(shared.module, ModuleCode::Srm);
        assert_eq!(shared.action, PermissionAction::Read);
    }

    #[test]
    fn test_sourcing_write_to_shared() {
        let perm = SrmPermission::SourcingWrite;
        let shared = perm.to_shared();
        assert_eq!(shared.module, ModuleCode::Srm);
        assert_eq!(shared.action, PermissionAction::Write);
    }

    #[test]
    fn test_vendor_assessment_read_to_shared() {
        let perm = SrmPermission::VendorAssessmentRead;
        let shared = perm.to_shared();
        assert_eq!(shared.module, ModuleCode::Srm);
        assert_eq!(shared.action, PermissionAction::Read);
    }

    #[test]
    fn test_vendor_assessment_write_to_shared() {
        let perm = SrmPermission::VendorAssessmentWrite;
        let shared = perm.to_shared();
        assert_eq!(shared.module, ModuleCode::Srm);
        assert_eq!(shared.action, PermissionAction::Write);
    }

    #[test]
    fn test_all_to_shared_admin() {
        let perm = SrmPermission::All;
        let shared = perm.to_shared();
        assert_eq!(shared.module, ModuleCode::Srm);
        assert_eq!(shared.action, PermissionAction::Admin);
    }

    #[test]
    fn test_display_supplier_read() {
        let s = format!("{}", SrmPermission::SupplierRead);
        assert!(s.contains("srm"), "Display should contain module code");
    }

    #[test]
    fn test_display_all() {
        let s = format!("{}", SrmPermission::All);
        assert!(s.contains("srm"), "Display should contain module code");
    }

    #[test]
    fn test_clone_equality() {
        let a = SrmPermission::SupplierWrite;
        let b = a.clone();
        assert_eq!(a, b);
    }

    #[test]
    fn test_inequality_different_variants() {
        assert_ne!(SrmPermission::SupplierRead, SrmPermission::SupplierWrite);
        assert_ne!(SrmPermission::ContractRead, SrmPermission::PaymentRead);
        assert_ne!(SrmPermission::All, SrmPermission::SupplierRead);
    }

    #[test]
    fn test_all_read_variants_produce_read_action() {
        let read_variants = [
            SrmPermission::SupplierRead,
            SrmPermission::ContractRead,
            SrmPermission::PaymentRead,
            SrmPermission::SourcingRead,
            SrmPermission::VendorAssessmentRead,
        ];
        for v in &read_variants {
            assert_eq!(v.to_shared().action, PermissionAction::Read);
        }
    }

    #[test]
    fn test_all_write_variants_produce_write_action() {
        let write_variants = [
            SrmPermission::SupplierWrite,
            SrmPermission::ContractWrite,
            SrmPermission::PaymentWrite,
            SrmPermission::SourcingWrite,
            SrmPermission::VendorAssessmentWrite,
        ];
        for v in &write_variants {
            assert_eq!(v.to_shared().action, PermissionAction::Write);
        }
    }

    #[test]
    fn test_all_variants_map_to_srm_module() {
        let all_variants = [
            SrmPermission::SupplierRead,
            SrmPermission::SupplierWrite,
            SrmPermission::ContractRead,
            SrmPermission::ContractWrite,
            SrmPermission::PaymentRead,
            SrmPermission::PaymentWrite,
            SrmPermission::SourcingRead,
            SrmPermission::SourcingWrite,
            SrmPermission::VendorAssessmentRead,
            SrmPermission::VendorAssessmentWrite,
            SrmPermission::All,
        ];
        for v in &all_variants {
            assert_eq!(v.to_shared().module, ModuleCode::Srm);
        }
    }

    #[tokio::test]
    async fn test_check_permission_unreachable_db_returns_err() {
        let pool = PgPool::connect_lazy("postgres://unreachable:5432/nodb")
            .expect("connect_lazy should succeed");
        let claims = Claims {
            sub: "00000000-0000-0000-0000-000000000001".to_string(),
            username: "test".to_string(),
            role: "user".to_string(),
            roles: vec![],
            permissions: vec![],
            is_superuser: false,
            exp: 9999999999,
            iat: 0,
            email: None,
            department: None,
            tenant_id: Some("00000000-0000-0000-0000-000000000002".to_string()),
            department_id: None,
            position_id: None,
            position_code: None,
        };
        let result: Result<(), axum::Json<ApiResponse<()>>> =
            check_permission(&pool, &claims, &SrmPermission::SupplierRead).await;
        assert!(result.is_err(), "unreachable DB should return Err");
    }
}
