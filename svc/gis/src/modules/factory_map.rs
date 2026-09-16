use crate::models::FactoryMap;
use crate::services::tenant_service::TenantService;
use crate::shared::permission::{check_permission, GisPermission};
use axum::{
    extract::{Extension, Path, State},
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::get_tenant_id;
use topems_shared_core::{response::ApiResponse, TopemsError};
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

pub async fn list_factory_maps(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let service = TenantService::new(pool, tenant_id);

    match service.list_factory_maps().await {
        Ok(maps) => Json(ApiResponse::success(
            serde_json::json!({
                "factory_maps": maps,
                "total": maps.len()
            }),
            "获取厂区地图列表成功",
        )),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("数据库查询失败", e))),
    }
}

pub async fn create_factory_map(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<CreateFactoryMap>,
) -> Json<ApiResponse<FactoryMap>> {
    if let Err(e) = check_permission(&pool, &claims, &GisPermission::FactoryMapWrite).await {
        return e;
    }

    let tenant_id = get_tenant_id(&claims, &headers);
    let service = TenantService::new(pool, tenant_id);

    match service
        .create_factory_map(
            &payload.name,
            &payload.code,
            &payload.map_type,
            &payload.file_url,
            payload.bounds,
            payload.description.as_deref(),
        )
        .await
    {
        Ok(map) => Json(ApiResponse::success(map, "创建厂区地图成功")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("数据库插入失败", e))),
    }
}

pub async fn get_factory_map(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<FactoryMap>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let service = TenantService::new(pool, tenant_id);

    match service.get_factory_map(id).await {
        Ok(Some(map)) => Json(ApiResponse::success(map, "获取厂区地图成功")),
        Ok(None) => Json(ApiResponse::error(404, "厂区地图未找到")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("数据库查询失败", e))),
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

pub async fn update_factory_map(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateFactoryMap>,
) -> Json<ApiResponse<FactoryMap>> {
    if let Err(e) = check_permission(&pool, &claims, &GisPermission::FactoryMapWrite).await {
        return e;
    }

    let tenant_id = get_tenant_id(&claims, &headers);
    let service = TenantService::new(pool, tenant_id);

    match service
        .update_factory_map(
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
        Ok(Some(map)) => Json(ApiResponse::success(map, "更新厂区地图成功")),
        Ok(None) => Json(ApiResponse::error(404, "厂区地图未找到")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("数据库更新失败", e))),
    }
}

pub async fn delete_factory_map(
    State(pool): State<PgPool>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    if let Err(e) = check_permission(&pool, &claims, &GisPermission::FactoryMapWrite).await {
        return e;
    }

    let tenant_id = get_tenant_id(&claims, &headers);
    let service = TenantService::new(pool, tenant_id);

    match service.delete_factory_map(id).await {
        Ok(true) => Json(ApiResponse::success("".to_string(), "删除厂区地图成功")),
        Ok(false) => Json(ApiResponse::error(404, "厂区地图未找到")),
        Err(e) => Json(ApiResponse::from(TopemsError::internal("数据库删除失败", e))),
    }
}
