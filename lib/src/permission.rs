use crate::auth::Claims;
use crate::response::ApiResponse;
use sqlx::PgPool;
use uuid::Uuid;

/// 模块权限 trait - 各服务实现此 trait 定义具体权限
pub trait ModulePermission: std::fmt::Display + Clone + PartialEq {
    /// 获取模块名称，用于构造模块管理权限字符串（如 "erp.manage"）
    fn module_name() -> &'static str;

    /// 获取 "all" 权限值
    fn all_permission() -> Self;

    /// 转换为权限字符串（如 "employee_read"）
    fn to_permission_string(&self) -> String {
        self.to_string()
    }
}

/// 通用权限检查函数
pub async fn check_module_permission<T, P>(
    _db: &PgPool,
    claims: &Claims,
    permission: &P,
) -> Result<(), axum::Json<ApiResponse<T>>>
where
    P: ModulePermission,
{
    if claims.is_superuser {
        return Ok(());
    }

    // 检查模块管理权限
    let module_manage = format!("{}.manage", P::module_name());
    if claims.has_permission(&module_manage) {
        return Ok(());
    }

    // 检查具体权限
    if claims.has_permission(&permission.to_permission_string()) {
        return Ok(());
    }

    Err(axum::Json(ApiResponse::error(
        403,
        &format!("权限不足：需要 {} 权限", permission),
    )))
}

/// 资源级权限检查（如员工、项目等）
pub async fn check_resource_permission<T>(
    _db: &PgPool,
    claims: &Claims,
    resource_id: &Uuid,
    resource_type: &str,
    manage_permission: &str,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    if claims.is_superuser {
        return Ok(());
    }

    // 检查资源管理权限
    if claims.has_permission(manage_permission) {
        return Ok(());
    }

    // 检查用户是否是资源所有者
    let user_id = match claims.user_id() {
        Ok(id) => id,
        Err(_) => {
            return Err(axum::Json(ApiResponse::error(401, "无效的用户ID")));
        }
    };

    if user_id == *resource_id {
        return Ok(());
    }

    Err(axum::Json(ApiResponse::error(
        403,
        &format!(
            "权限不足：您只能访问自己的 {} 或需要 {} 权限",
            resource_type, manage_permission
        ),
    )))
}

/// 检查是否有任一权限
pub fn check_any_module_permission<T, P>(
    claims: &Claims,
    permissions: &[P],
) -> Result<(), axum::Json<ApiResponse<T>>>
where
    P: ModulePermission,
{
    if claims.is_superuser {
        return Ok(());
    }

    // 检查模块管理权限
    let module_manage = format!("{}.manage", P::module_name());
    if claims.has_permission(&module_manage) {
        return Ok(());
    }

    for perm in permissions {
        if claims.has_permission(&perm.to_permission_string()) {
            return Ok(());
        }
    }

    let perm_strs: Vec<String> = permissions.iter().map(|p| p.to_string()).collect();
    Err(axum::Json(ApiResponse::error(
        403,
        &format!("权限不足：需要以下任一权限: {}", perm_strs.join(", ")),
    )))
}
