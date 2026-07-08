use sqlx::PgPool;
use topems_shared::auth::Claims;
use topems_shared::response::ApiResponse;

#[allow(dead_code)]
#[derive(Debug, Clone, PartialEq)]
pub enum ModulePermission {
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

impl std::fmt::Display for ModulePermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ModulePermission::CompanyRead => write!(f, "hrm:read"),
            ModulePermission::CompanyWrite => write!(f, "hrm:write"),
            ModulePermission::AttendanceRead => write!(f, "hrm:read"),
            ModulePermission::AttendanceWrite => write!(f, "hrm:write"),
            ModulePermission::LeaveRead => write!(f, "hrm:read"),
            ModulePermission::LeaveWrite => write!(f, "hrm:write"),
            ModulePermission::EmployeeRead => write!(f, "hrm:read"),
            ModulePermission::EmployeeWrite => write!(f, "hrm:write"),
            ModulePermission::DepartmentRead => write!(f, "hrm:read"),
            ModulePermission::DepartmentWrite => write!(f, "hrm:write"),
            ModulePermission::PayrollRead => write!(f, "hrm:read"),
            ModulePermission::PayrollWrite => write!(f, "hrm:write"),
            ModulePermission::PerformanceRead => write!(f, "hrm:read"),
            ModulePermission::PerformanceWrite => write!(f, "hrm:write"),
            ModulePermission::All => write!(f, "hrm:admin"),
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

    if claims.has_permission("hrm:admin") {
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
