use sqlx::PgPool;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::permission::{
    check_module_permission, check_resource_permission, ModuleCode,
    ModulePermission as SharedModulePermission, PermissionAction,
};
use topems_shared_core::response::ApiResponse;
use uuid::Uuid;

#[allow(dead_code)]
#[derive(Debug, Clone, PartialEq)]
pub enum HrmPermission {
    CompanyRead,
    CompanyWrite,
    AttendanceRead,
    AttendanceWrite,
    LeaveRead,
    LeaveWrite,
    EmployeeRead,
    EmployeeWrite,
    DepartmentRead,
    DepartmentWrite,
    PayrollRead,
    PayrollWrite,
    PerformanceRead,
    PerformanceWrite,
    All,
}

impl HrmPermission {
    pub fn to_shared(&self) -> SharedModulePermission {
        match self {
            HrmPermission::CompanyRead => {
                SharedModulePermission::new(ModuleCode::Hrm, PermissionAction::Read)
            }
            HrmPermission::CompanyWrite => {
                SharedModulePermission::new(ModuleCode::Hrm, PermissionAction::Write)
            }
            HrmPermission::AttendanceRead => {
                SharedModulePermission::new(ModuleCode::Hrm, PermissionAction::Read)
            }
            HrmPermission::AttendanceWrite => {
                SharedModulePermission::new(ModuleCode::Hrm, PermissionAction::Write)
            }
            HrmPermission::LeaveRead => {
                SharedModulePermission::new(ModuleCode::Hrm, PermissionAction::Read)
            }
            HrmPermission::LeaveWrite => {
                SharedModulePermission::new(ModuleCode::Hrm, PermissionAction::Write)
            }
            HrmPermission::EmployeeRead => {
                SharedModulePermission::new(ModuleCode::Hrm, PermissionAction::Read)
            }
            HrmPermission::EmployeeWrite => {
                SharedModulePermission::new(ModuleCode::Hrm, PermissionAction::Write)
            }
            HrmPermission::DepartmentRead => {
                SharedModulePermission::new(ModuleCode::Hrm, PermissionAction::Read)
            }
            HrmPermission::DepartmentWrite => {
                SharedModulePermission::new(ModuleCode::Hrm, PermissionAction::Write)
            }
            HrmPermission::PayrollRead => {
                SharedModulePermission::new(ModuleCode::Hrm, PermissionAction::Read)
            }
            HrmPermission::PayrollWrite => {
                SharedModulePermission::new(ModuleCode::Hrm, PermissionAction::Write)
            }
            HrmPermission::PerformanceRead => {
                SharedModulePermission::new(ModuleCode::Hrm, PermissionAction::Read)
            }
            HrmPermission::PerformanceWrite => {
                SharedModulePermission::new(ModuleCode::Hrm, PermissionAction::Write)
            }
            HrmPermission::All => {
                SharedModulePermission::new(ModuleCode::Hrm, PermissionAction::Admin)
            }
        }
    }
}

impl std::fmt::Display for HrmPermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.to_shared())
    }
}

pub type ModulePermission = HrmPermission;

pub async fn check_permission<T>(
    db: &PgPool,
    claims: &Claims,
    permission: &HrmPermission,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    let shared_perm = permission.to_shared();
    check_module_permission(db, claims, &shared_perm).await
}

#[allow(dead_code)]
pub async fn check_employee_permission<T>(
    db: &PgPool,
    claims: &Claims,
    employee_id: &Uuid,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    check_resource_permission(db, claims, employee_id, "employee", "hrm:admin").await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_to_shared_read_variants() {
        let read_variants = [
            HrmPermission::CompanyRead,
            HrmPermission::AttendanceRead,
            HrmPermission::LeaveRead,
            HrmPermission::EmployeeRead,
            HrmPermission::DepartmentRead,
            HrmPermission::PayrollRead,
            HrmPermission::PerformanceRead,
        ];
        for p in &read_variants {
            let shared = p.to_shared();
            let s = format!("{}", shared);
            assert!(!s.is_empty(), "Display output should not be empty");
        }
    }

    #[test]
    fn test_to_shared_write_variants() {
        let write_variants = [
            HrmPermission::CompanyWrite,
            HrmPermission::AttendanceWrite,
            HrmPermission::LeaveWrite,
            HrmPermission::EmployeeWrite,
            HrmPermission::DepartmentWrite,
            HrmPermission::PayrollWrite,
            HrmPermission::PerformanceWrite,
        ];
        for p in &write_variants {
            let shared = p.to_shared();
            let s = format!("{}", shared);
            assert!(!s.is_empty(), "Display output should not be empty");
        }
    }

    #[test]
    fn test_to_shared_all_variant() {
        let shared = HrmPermission::All.to_shared();
        let s = format!("{}", shared);
        assert!(!s.is_empty());
    }

    #[test]
    fn test_read_and_write_produce_different_display() {
        let read = format!("{}", HrmPermission::EmployeeRead.to_shared());
        let write = format!("{}", HrmPermission::EmployeeWrite.to_shared());
        assert_ne!(
            read, write,
            "Read and Write permissions should differ in display"
        );
    }

    #[test]
    fn test_all_differs_from_read_and_write() {
        let all = format!("{}", HrmPermission::All.to_shared());
        let read = format!("{}", HrmPermission::EmployeeRead.to_shared());
        let write = format!("{}", HrmPermission::EmployeeWrite.to_shared());
        assert_ne!(all, read);
        assert_ne!(all, write);
    }

    #[test]
    fn test_display_impl_uses_to_shared() {
        // Display for HrmPermission delegates to to_shared()
        let perm = HrmPermission::PayrollRead;
        let direct = format!("{}", perm.to_shared());
        let via_display = format!("{}", perm);
        assert_eq!(direct, via_display);
    }

    #[test]
    fn test_all_read_variants_equal_action() {
        // All Read variants should map to the same shared permission action
        let a = HrmPermission::CompanyRead.to_shared();
        let b = HrmPermission::AttendanceRead.to_shared();
        let sa = format!("{}", a);
        let sb = format!("{}", b);
        assert_eq!(sa, sb, "All read variants should produce same action");
    }

    #[test]
    fn test_all_write_variants_equal_action() {
        let a = HrmPermission::CompanyWrite.to_shared();
        let b = HrmPermission::AttendanceWrite.to_shared();
        let sa = format!("{}", a);
        let sb = format!("{}", b);
        assert_eq!(sa, sb, "All write variants should produce same action");
    }

    #[test]
    fn test_partial_eq() {
        assert_eq!(HrmPermission::CompanyRead, HrmPermission::CompanyRead);
        assert_ne!(HrmPermission::CompanyRead, HrmPermission::CompanyWrite);
        assert_ne!(HrmPermission::All, HrmPermission::CompanyRead);
    }

    #[test]
    fn test_module_permission_type_alias() {
        let p: ModulePermission = HrmPermission::EmployeeRead;
        let s = format!("{}", p);
        assert!(!s.is_empty());
    }

    #[test]
    fn test_clone_and_debug() {
        let p = HrmPermission::PayrollWrite;
        let cloned = p.clone();
        assert_eq!(p, cloned);
        let debug = format!("{:?}", p);
        assert!(debug.contains("PayrollWrite"));
    }

    #[test]
    fn test_every_variant_display_nonempty() {
        let all_variants = [
            HrmPermission::CompanyRead,
            HrmPermission::CompanyWrite,
            HrmPermission::AttendanceRead,
            HrmPermission::AttendanceWrite,
            HrmPermission::LeaveRead,
            HrmPermission::LeaveWrite,
            HrmPermission::EmployeeRead,
            HrmPermission::EmployeeWrite,
            HrmPermission::DepartmentRead,
            HrmPermission::DepartmentWrite,
            HrmPermission::PayrollRead,
            HrmPermission::PayrollWrite,
            HrmPermission::PerformanceRead,
            HrmPermission::PerformanceWrite,
            HrmPermission::All,
        ];
        for v in &all_variants {
            let s = format!("{}", v);
            assert!(!s.is_empty(), "Display for {:?} should not be empty", v);
        }
    }
}
