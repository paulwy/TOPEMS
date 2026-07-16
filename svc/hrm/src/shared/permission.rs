use sqlx::PgPool;
use topems_shared::auth::Claims;
use topems_shared::permission::{
    check_module_permission, check_resource_permission, ModuleCode,
    ModulePermission as SharedModulePermission, PermissionAction,
};
use topems_shared::response::ApiResponse;
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

pub async fn check_employee_permission<T>(
    db: &PgPool,
    claims: &Claims,
    employee_id: &Uuid,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    check_resource_permission(db, claims, employee_id, "employee", "hrm:admin").await
}
