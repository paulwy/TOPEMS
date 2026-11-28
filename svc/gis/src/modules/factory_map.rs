use crate::models::FactoryMap;
use crate::services::tenant_service::TenantService;
use crate::shared::permission::{check_permission, GisPermission};
use axum::{
    extract::{Extension, Path, State},
    Json,
};
use serde::{Deserialize, Serialize};
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_core::{response::ApiResponse, TopemsError};
use topems_shared_db::scope::Db;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateFactoryMap {
    pub name: String,
    pub code: String,
    pub map_type: String,
    pub file_url: String,
    pub bounds: Option<serde_json::Value>,
    pub description: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["gis:factory_map:read"])),
    path = "/factory-maps",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "factory_map"
)]
pub async fn list_factory_maps(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
) -> ApiResponse<serde_json::Value> {
    let tenant_opt: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| Uuid::parse_str(t).ok())
    };
    let service = TenantService::new(db, tenant_opt);

    match service.list_factory_maps(&txn_arc).await {
        Ok(maps) => ApiResponse::success(
            serde_json::json!({
                "factory_maps": maps,
                "total": maps.len()
            }),
            "获取厂区地图列表成功",
        ),
        Err(e) => ApiResponse::from(TopemsError::internal("数据库查询失败", e)),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["gis:factory_map:write"])),
    path = "/factory-maps",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "factory_map"
)]
pub async fn create_factory_map(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<CreateFactoryMap>,
) -> ApiResponse<FactoryMap> {
    if let Err(e) = check_permission(&db, &claims, &GisPermission::FactoryMapWrite).await {
        return e.0;
    }

    // 写租户表必须显式带租户：缺失即报错，不兜底 …0001 常量。
    let Some(tenant_ctx) = topems_shared_auth::middleware::tenant::current_request_tenant() else {
        return ApiResponse::server_error("RLS context missing: 无租户上下文");
    };
    let service = TenantService::new(db, Some(tenant_ctx.tenant));

    match service
        .create_factory_map(
            &txn_arc,
            &payload.name,
            &payload.code,
            &payload.map_type,
            &payload.file_url,
            payload.bounds,
            payload.description.as_deref(),
        )
        .await
    {
        Ok(map) => ApiResponse::success(map, "创建厂区地图成功"),
        Err(e) => ApiResponse::from(TopemsError::internal("数据库插入失败", e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["gis:factory_map:read"])),
    path = "/factory-maps/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "factory_map"
)]
pub async fn get_factory_map(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<FactoryMap> {
    let tenant_opt: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| Uuid::parse_str(t).ok())
    };
    let service = TenantService::new(db, tenant_opt);

    match service.get_factory_map(&txn_arc, id).await {
        Ok(Some(map)) => ApiResponse::success(map, "获取厂区地图成功"),
        Ok(None) => ApiResponse::not_found("厂区地图未找到"),
        Err(e) => ApiResponse::from(TopemsError::internal("数据库查询失败", e)),
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateFactoryMap {
    pub name: Option<String>,
    pub code: Option<String>,
    pub map_type: Option<String>,
    pub file_url: Option<String>,
    pub bounds: Option<serde_json::Value>,
    pub description: Option<String>,
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["gis:factory_map:write"])),
    path = "/factory-maps/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "factory_map"
)]
pub async fn update_factory_map(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateFactoryMap>,
) -> ApiResponse<FactoryMap> {
    if let Err(e) = check_permission(&db, &claims, &GisPermission::FactoryMapWrite).await {
        return e.0;
    }

    let tenant_opt: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| Uuid::parse_str(t).ok())
    };
    let service = TenantService::new(db, tenant_opt);

    match service
        .update_factory_map(
            &txn_arc,
            id,
            payload.name.as_deref(),
            payload.code.as_deref(),
            payload.map_type.as_deref(),
            payload.file_url.as_deref(),
            payload.bounds,
            payload.description.as_deref(),
        )
        .await
    {
        Ok(Some(map)) => ApiResponse::success(map, "更新厂区地图成功"),
        Ok(None) => ApiResponse::not_found("厂区地图未找到"),
        Err(e) => ApiResponse::from(TopemsError::internal("数据库更新失败", e)),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["gis:factory_map:write"])),
    path = "/factory-maps/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "factory_map"
)]
pub async fn delete_factory_map(
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> ApiResponse<String> {
    if let Err(e) = check_permission(&db, &claims, &GisPermission::FactoryMapWrite).await {
        return e.0;
    }

    let tenant_opt: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| Uuid::parse_str(t).ok())
    };
    let service = TenantService::new(db, tenant_opt);

    match service.delete_factory_map(&txn_arc, id).await {
        Ok(true) => ApiResponse::success("".to_string(), "删除厂区地图成功"),
        Ok(false) => ApiResponse::not_found("厂区地图未找到"),
        Err(e) => ApiResponse::from(TopemsError::internal("数据库删除失败", e)),
    }
}
