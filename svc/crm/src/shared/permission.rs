use sqlx::PgPool;
use topems_shared::auth::Claims;
use topems_shared::response::ApiResponse;

#[derive(Debug, Clone, PartialEq)]
pub enum ModulePermission {
    CustomerRead,
    CustomerWrite,
    ContactRead,
    ContactWrite,
    OpportunityRead,
    OpportunityWrite,
    InteractionRead,
    InteractionWrite,
    All,
}

impl std::fmt::Display for ModulePermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ModulePermission::CustomerRead => write!(f, "crm:read"),
            ModulePermission::CustomerWrite => write!(f, "crm:write"),
            ModulePermission::ContactRead => write!(f, "crm:read"),
            ModulePermission::ContactWrite => write!(f, "crm:write"),
            ModulePermission::OpportunityRead => write!(f, "crm:read"),
            ModulePermission::OpportunityWrite => write!(f, "crm:write"),
            ModulePermission::InteractionRead => write!(f, "crm:read"),
            ModulePermission::InteractionWrite => write!(f, "crm:write"),
            ModulePermission::All => write!(f, "crm:admin"),
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

    if claims.has_permission("crm:admin") {
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
