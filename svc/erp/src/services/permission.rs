#![allow(dead_code)]

use sqlx::PgPool;
use topems_shared::auth::Claims;
use topems_shared::permission::{
    check_module_permission, check_resource_permission, ModulePermission as SharedModulePermission,
};
use topems_shared::response::ApiResponse;
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq)]
pub enum ModulePermission {
    EmployeeRead,
    EmployeeWrite,
    DepartmentRead,
    DepartmentWrite,
    CompanyRead,
    CompanyWrite,
    FinanceRead,
    FinanceWrite,
    AssetRead,
    AssetWrite,
    All,
}

impl std::fmt::Display for ModulePermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ModulePermission::EmployeeRead => write!(f, "employee_read"),
            ModulePermission::EmployeeWrite => write!(f, "employee_write"),
            ModulePermission::DepartmentRead => write!(f, "department_read"),
            ModulePermission::DepartmentWrite => write!(f, "department_write"),
            ModulePermission::CompanyRead => write!(f, "company_read"),
            ModulePermission::CompanyWrite => write!(f, "company_write"),
            ModulePermission::FinanceRead => write!(f, "finance_read"),
            ModulePermission::FinanceWrite => write!(f, "finance_write"),
            ModulePermission::AssetRead => write!(f, "asset_read"),
            ModulePermission::AssetWrite => write!(f, "asset_write"),
            ModulePermission::All => write!(f, "all"),
        }
    }
}

impl SharedModulePermission for ModulePermission {
    fn module_name() -> &'static str {
        "erp"
    }

    fn all_permission() -> Self {
        ModulePermission::All
    }
}

pub async fn check_permission<T>(
    db: &PgPool,
    claims: &Claims,
    permission: &ModulePermission,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    check_module_permission(db, claims, permission).await
}

pub async fn check_employee_permission<T>(
    db: &PgPool,
    claims: &Claims,
    employee_id: &Uuid,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    check_resource_permission(db, claims, employee_id, "信息", "employee.manage").await
}
