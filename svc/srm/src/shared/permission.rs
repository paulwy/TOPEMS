use sqlx::PgPool;
use topems_shared::auth::Claims;
use topems_shared::response::ApiResponse;

#[derive(Debug, Clone, PartialEq)]
pub enum ModulePermission {
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

impl std::fmt::Display for ModulePermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ModulePermission::SupplierRead => write!(f, "srm:read"),
            ModulePermission::SupplierWrite => write!(f, "srm:write"),
            ModulePermission::ContractRead => write!(f, "srm:read"),
            ModulePermission::ContractWrite => write!(f, "srm:write"),
            ModulePermission::PaymentRead => write!(f, "srm:read"),
            ModulePermission::PaymentWrite => write!(f, "srm:write"),
            ModulePermission::SourcingRead => write!(f, "srm:read"),
            ModulePermission::SourcingWrite => write!(f, "srm:write"),
            ModulePermission::VendorAssessmentRead => write!(f, "srm:read"),
            ModulePermission::VendorAssessmentWrite => write!(f, "srm:write"),
            ModulePermission::All => write!(f, "srm:admin"),
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

    if claims.has_permission("srm:admin") {
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
