use axum::{extract::{Path, Query, State}, http::StatusCode, response::Json, routing::Router};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use topems_shared::{ConfigCenterClient, ConfigChange, ConfigItem, VersionHistory};

#[derive(Debug, Clone, Deserialize)]
pub struct ConfigQueryParams {
    #[serde(default)]
    pub tenant_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SetConfigRequest {
    pub value: String,
    #[serde(default)]
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,
}

impl<T> ApiResponse<T> {
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            message: "操作成功".to_string(),
            data: Some(data),
        }
    }

    pub fn error(message: &str) -> Self {
        Self {
            success: false,
            message: message.to_string(),
            data: None,
        }
    }
}

pub async fn get_config(
    Path((service, key)): Path<(String, String)>,
    Query(params): Query<ConfigQueryParams>,
    State(client): State<Arc<ConfigCenterClient>>,
) -> Result<Json<ApiResponse<ConfigItem>>, StatusCode> {
    let tenant_id = params.tenant_id.as_deref();
    
    match client.get(&service, &key, tenant_id).await {
        Ok(item) => Ok(Json(ApiResponse::success(item))),
        Err(e) => Err(StatusCode::NOT_FOUND),
    }
}

pub async fn set_config(
    Path((service, key)): Path<(String, String)>,
    Query(params): Query<ConfigQueryParams>,
    State(client): State<Arc<ConfigCenterClient>>,
    Json(body): Json<SetConfigRequest>,
) -> Result<Json<ApiResponse<ConfigItem>>, StatusCode> {
    let tenant_id = params.tenant_id.as_deref();
    
    match client.set(&service, &key, &body.value, tenant_id, body.description.as_deref()).await {
        Ok(item) => Ok(Json(ApiResponse::success(item))),
        Err(e) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

pub async fn delete_config(
    Path((service, key)): Path<(String, String)>,
    Query(params): Query<ConfigQueryParams>,
    State(client): State<Arc<ConfigCenterClient>>,
) -> Result<Json<ApiResponse<()>>, StatusCode> {
    let tenant_id = params.tenant_id.as_deref();
    
    match client.delete(&service, &key, tenant_id).await {
        Ok(_) => Ok(Json(ApiResponse::success(()))),
        Err(e) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

pub async fn list_configs(
    Path(service): Path<String>,
    Query(params): Query<ConfigQueryParams>,
    State(client): State<Arc<ConfigCenterClient>>,
) -> Result<Json<ApiResponse<Vec<ConfigItem>>>, StatusCode> {
    let tenant_id = params.tenant_id.as_deref();
    
    match client.list(&service, tenant_id).await {
        Ok(items) => Ok(Json(ApiResponse::success(items))),
        Err(e) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

pub async fn get_history(
    Path((service, key)): Path<(String, String)>,
    Query(params): Query<ConfigQueryParams>,
    State(client): State<Arc<ConfigCenterClient>>,
) -> Result<Json<ApiResponse<VersionHistory>>, StatusCode> {
    let tenant_id = params.tenant_id.as_deref();
    
    match client.get_history(&service, &key, tenant_id).await {
        Ok(history) => Ok(Json(ApiResponse::success(history))),
        Err(e) => Err(StatusCode::NOT_FOUND),
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct RollbackRequest {
    pub version: u64,
}

pub async fn rollback_config(
    Path((service, key)): Path<(String, String)>,
    Query(params): Query<ConfigQueryParams>,
    State(client): State<Arc<ConfigCenterClient>>,
    Json(body): Json<RollbackRequest>,
) -> Result<Json<ApiResponse<ConfigItem>>, StatusCode> {
    let tenant_id = params.tenant_id.as_deref();
    
    match client.rollback(&service, &key, body.version, tenant_id).await {
        Ok(item) => Ok(Json(ApiResponse::success(item))),
        Err(e) => Err(StatusCode::NOT_FOUND),
    }
}

pub async fn exists_config(
    Path((service, key)): Path<(String, String)>,
    Query(params): Query<ConfigQueryParams>,
    State(client): State<Arc<ConfigCenterClient>>,
) -> Result<Json<ApiResponse<bool>>, StatusCode> {
    let tenant_id = params.tenant_id.as_deref();
    
    match client.exists(&service, &key, tenant_id).await {
        Ok(exists) => Ok(Json(ApiResponse::success(exists))),
        Err(e) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

pub fn create_routes(client: Arc<ConfigCenterClient>) -> Router {
    Router::new()
        .route("/config/:service/:key", axum::routing::get(get_config))
        .route("/config/:service/:key", axum::routing::put(set_config))
        .route("/config/:service/:key", axum::routing::delete(delete_config))
        .route("/config/:service", axum::routing::get(list_configs))
        .route("/config/:service/:key/history", axum::routing::get(get_history))
        .route("/config/:service/:key/rollback", axum::routing::post(rollback_config))
        .route("/config/:service/:key/exists", axum::routing::get(exists_config))
        .with_state(client)
}
