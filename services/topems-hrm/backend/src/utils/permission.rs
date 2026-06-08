use sqlx::PgPool;
use uuid::Uuid;
use topems_shared::auth::Claims;
use topems_shared::response::ApiResponse;

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
            ModulePermission::CompanyRead => write!(f, "company_read"),
            ModulePermission::CompanyWrite => write!(f, "company_write"),
            ModulePermission::AttendanceRead => write!(f, "attendance_read"),
            ModulePermission::AttendanceWrite => write!(f, "attendance_write"),
            ModulePermission::LeaveRead => write!(f, "leave_read"),
            ModulePermission::LeaveWrite => write!(f, "leave_write"),
            ModulePermission::EmployeeRead => write!(f, "employee_read"),
            ModulePermission::EmployeeWrite => write!(f, "employee_write"),
            ModulePermission::DepartmentRead => write!(f, "department_read"),
            ModulePermission::DepartmentWrite => write!(f, "department_write"),
            ModulePermission::PayrollRead => write!(f, "payroll_read"),
            ModulePermission::PayrollWrite => write!(f, "payroll_write"),
            ModulePermission::PerformanceRead => write!(f, "performance_read"),
            ModulePermission::PerformanceWrite => write!(f, "performance_write"),
            ModulePermission::All => write!(f, "all"),
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

    if claims.has_permission("hrm.manage") {
        return Ok(());
    }

    let permission_str = permission.to_string();
    
    if claims.has_permission(&permission_str) {
        return Ok(());
    }

    Err(axum::Json(ApiResponse::error(403, &format!(
        "权限不足：需要 {} 权限", 
        permission
    ))))
}

pub async fn check_self_permission<T>(
    _db: &PgPool,
    claims: &Claims,
    resource_id: &Uuid,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    if claims.is_superuser {
        return Ok(());
    }

    if claims.has_permission("hrm.manage") {
        return Ok(());
    }

    let user_id = match claims.user_id() {
        Ok(id) => id,
        Err(_) => {
            return Err(axum::Json(ApiResponse::error(401, "无效的用户ID")));
        }
    };

    if user_id == *resource_id {
        return Ok(());
    }

    Err(axum::Json(ApiResponse::error(403, "权限不足：您只能访问自己的信息")))
}