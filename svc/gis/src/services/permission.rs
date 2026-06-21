#![allow(dead_code)]

use sqlx::PgPool;
use topems_shared::auth::Claims;
use topems_shared::response::ApiResponse;

#[derive(Debug, Clone, PartialEq)]
pub enum GisPermission {
    FactoryMapRead,
    FactoryMapWrite,
    DeviceLocationRead,
    DeviceLocationWrite,
    PipelineRead,
    PipelineWrite,
    WarehouseLocationRead,
    WarehouseLocationWrite,
    LocationPhotoRead,
    LocationPhotoWrite,
    All,
}

impl std::fmt::Display for GisPermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            GisPermission::FactoryMapRead => write!(f, "gis:read"),
            GisPermission::FactoryMapWrite => write!(f, "gis:write"),
            GisPermission::DeviceLocationRead => write!(f, "gis:read"),
            GisPermission::DeviceLocationWrite => write!(f, "gis:write"),
            GisPermission::PipelineRead => write!(f, "gis:read"),
            GisPermission::PipelineWrite => write!(f, "gis:write"),
            GisPermission::WarehouseLocationRead => write!(f, "gis:read"),
            GisPermission::WarehouseLocationWrite => write!(f, "gis:write"),
            GisPermission::LocationPhotoRead => write!(f, "gis:read"),
            GisPermission::LocationPhotoWrite => write!(f, "gis:write"),
            GisPermission::All => write!(f, "gis:admin"),
        }
    }
}

pub async fn check_permission<T>(
    _db: &PgPool,
    claims: &Claims,
    permission: &GisPermission,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    if claims.is_superuser {
        return Ok(());
    }

    let permission_str = permission.to_string();

    if claims.has_permission(&permission_str) {
        return Ok(());
    }

    if claims.has_permission("gis:admin") {
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
