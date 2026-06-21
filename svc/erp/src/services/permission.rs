#![allow(dead_code)]

use sqlx::PgPool;
use topems_shared::auth::Claims;
use topems_shared::permission::check_resource_permission;
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
            ModulePermission::EmployeeRead => write!(f, "erp:read"),
            ModulePermission::EmployeeWrite => write!(f, "erp:write"),
            ModulePermission::DepartmentRead => write!(f, "erp:read"),
            ModulePermission::DepartmentWrite => write!(f, "erp:write"),
            ModulePermission::CompanyRead => write!(f, "erp:read"),
            ModulePermission::CompanyWrite => write!(f, "erp:write"),
            ModulePermission::FinanceRead => write!(f, "erp:read"),
            ModulePermission::FinanceWrite => write!(f, "erp:write"),
            ModulePermission::AssetRead => write!(f, "erp:read"),
            ModulePermission::AssetWrite => write!(f, "erp:write"),
            ModulePermission::All => write!(f, "erp:admin"),
        }
    }
}

pub async fn check_permission<T>(
    _db: &PgPool,
    claims: &Claims,
    permission: &ModulePermission,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    if claims.is_superuser {
        return Ok(());
    }

    let permission_str = permission.to_string();

    if claims.has_permission(&permission_str) {
        return Ok(());
    }

    if claims.has_permission("erp:admin") {
        return Ok(());
    }

    if claims.has_permission("all") {
        return Ok(());
    }

    Err(axum::Json(ApiResponse::error(
        403,
        &format!("权限不足：需要 {} 权限", permission),
    )))
}

pub async fn check_employee_permission<T>(
    db: &PgPool,
    claims: &Claims,
    employee_id: &Uuid,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    check_resource_permission(db, claims, employee_id, "信息", "employee.manage").await
}
