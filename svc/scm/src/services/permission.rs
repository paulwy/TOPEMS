use sqlx::PgPool;
use topems_shared::auth::Claims;
use topems_shared::permission::{
    check_module_permission, ModulePermission as SharedModulePermission,
};
use topems_shared::response::ApiResponse;
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq)]
pub enum ModulePermission {
    SupplierRead,
    SupplierWrite,
    PurchaseOrderRead,
    PurchaseOrderWrite,
    PurchaseItemRead,
    PurchaseItemWrite,
    SupplierEvaluationRead,
    SupplierEvaluationWrite,
    All,
}

impl std::fmt::Display for ModulePermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ModulePermission::SupplierRead => write!(f, "supplier_read"),
            ModulePermission::SupplierWrite => write!(f, "supplier_write"),
            ModulePermission::PurchaseOrderRead => write!(f, "purchase_order_read"),
            ModulePermission::PurchaseOrderWrite => write!(f, "purchase_order_write"),
            ModulePermission::PurchaseItemRead => write!(f, "purchase_item_read"),
            ModulePermission::PurchaseItemWrite => write!(f, "purchase_item_write"),
            ModulePermission::SupplierEvaluationRead => write!(f, "supplier_evaluation_read"),
            ModulePermission::SupplierEvaluationWrite => write!(f, "supplier_evaluation_write"),
            ModulePermission::All => write!(f, "all"),
        }
    }
}

impl SharedModulePermission for ModulePermission {
    fn module_name() -> &'static str {
        "scm"
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
