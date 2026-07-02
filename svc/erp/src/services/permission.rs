use sqlx::PgPool;
use topems_shared::auth::Claims;
use topems_shared::permission::check_resource_permission;
use topems_shared::response::ApiResponse;
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq)]
pub enum ModulePermission {
    // 资产管理权限
    AssetRead,
    AssetWrite,
    // 财务管理权限
    FinanceRead,
    FinanceWrite,
    // 凭证管理权限
    VoucherRead,
    VoucherWrite,
    VoucherAudit,
    VoucherPost,
    // 固定资产权限
    FixedAssetRead,
    FixedAssetWrite,
    FixedAssetDepreciate,
    // 报表权限
    ReportRead,
    // 完整权限
    All,
}

impl std::fmt::Display for ModulePermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ModulePermission::AssetRead => write!(f, "erp:asset:read"),
            ModulePermission::AssetWrite => write!(f, "erp:asset:write"),
            ModulePermission::FinanceRead => write!(f, "erp:finance:read"),
            ModulePermission::FinanceWrite => write!(f, "erp:finance:write"),
            ModulePermission::VoucherRead => write!(f, "erp:voucher:read"),
            ModulePermission::VoucherWrite => write!(f, "erp:voucher:write"),
            ModulePermission::VoucherAudit => write!(f, "erp:voucher:audit"),
            ModulePermission::VoucherPost => write!(f, "erp:voucher:post"),
            ModulePermission::FixedAssetRead => write!(f, "erp:fixed_asset:read"),
            ModulePermission::FixedAssetWrite => write!(f, "erp:fixed_asset:write"),
            ModulePermission::FixedAssetDepreciate => write!(f, "erp:fixed_asset:depreciate"),
            ModulePermission::ReportRead => write!(f, "erp:report:read"),
            ModulePermission::All => write!(f, "erp:admin"),
        }
    }
}

pub async fn check_permission<T>(
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
