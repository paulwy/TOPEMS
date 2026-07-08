use sqlx::PgPool;
use topems_shared::auth::Claims;
use topems_shared::response::ApiResponse;

#[derive(Debug, Clone, PartialEq)]
pub enum ModulePermission {
    WarehouseRead,
    WarehouseWrite,
    InventoryRead,
    InventoryWrite,
    InboundRead,
    InboundWrite,
    OutboundRead,
    OutboundWrite,
    All,
}

impl std::fmt::Display for ModulePermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ModulePermission::WarehouseRead => write!(f, "wms:read"),
            ModulePermission::WarehouseWrite => write!(f, "wms:write"),
            ModulePermission::InventoryRead => write!(f, "wms:read"),
            ModulePermission::InventoryWrite => write!(f, "wms:write"),
            ModulePermission::InboundRead => write!(f, "wms:read"),
            ModulePermission::InboundWrite => write!(f, "wms:write"),
            ModulePermission::OutboundRead => write!(f, "wms:read"),
            ModulePermission::OutboundWrite => write!(f, "wms:write"),
            ModulePermission::All => write!(f, "wms:admin"),
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

    if claims.has_permission("wms:admin") {
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
