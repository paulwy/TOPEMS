use sqlx::PgPool;
use topems_shared::auth::Claims;
use topems_shared::response::ApiResponse;
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq)]
pub enum ModulePermission {
    SupplierRead,
    SupplierWrite,
    PurchaseOrderRead,
    PurchaseOrderWrite,
    PurchaseOrderApprove,
    PurchaseItemRead,
    PurchaseItemWrite,
    SupplierEvaluationRead,
    SupplierEvaluationWrite,
    SupplierDeliveryAppointmentRead,
    SupplierDeliveryAppointmentWrite,
    SupplierDeliveryAppointmentApprove,
    PriceComparisonRead,
    PriceComparisonWrite,
    All,
}

impl std::fmt::Display for ModulePermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ModulePermission::SupplierRead => write!(f, "scm:read"),
            ModulePermission::SupplierWrite => write!(f, "scm:write"),
            ModulePermission::PurchaseOrderRead => write!(f, "scm:read"),
            ModulePermission::PurchaseOrderWrite => write!(f, "scm:write"),
            ModulePermission::PurchaseOrderApprove => write!(f, "scm:purchase_order:approve"),
            ModulePermission::PurchaseItemRead => write!(f, "scm:read"),
            ModulePermission::PurchaseItemWrite => write!(f, "scm:write"),
            ModulePermission::SupplierEvaluationRead => write!(f, "scm:read"),
            ModulePermission::SupplierEvaluationWrite => write!(f, "scm:write"),
            ModulePermission::SupplierDeliveryAppointmentRead => write!(f, "scm:read"),
            ModulePermission::SupplierDeliveryAppointmentWrite => write!(f, "scm:write"),
            ModulePermission::SupplierDeliveryAppointmentApprove => {
                write!(f, "scm:delivery_appointment:approve")
            }
            ModulePermission::PriceComparisonRead => write!(f, "scm:read"),
            ModulePermission::PriceComparisonWrite => write!(f, "scm:write"),
            ModulePermission::All => write!(f, "scm:admin"),
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

    if claims.has_permission("scm:admin") {
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

pub async fn check_supplier_permission<T>(
    _db: &PgPool,
    claims: &Claims,
    _supplier_id: &Uuid,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    if claims.is_superuser {
        return Ok(());
    }

    if claims.has_permission("scm.manage") {
        return Ok(());
    }

    if claims.has_permission("supplier.manage") {
        return Ok(());
    }

    Err(axum::Json(ApiResponse::error(
        403,
        "权限不足：需要供应商管理权限",
    )))
}
