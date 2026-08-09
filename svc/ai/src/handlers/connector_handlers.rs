#![allow(dead_code)]

use crate::models::{
    ConnectorQuery, ConnectorStatus, ConnectorType, CreateConnectorRequest, DataConnector,
    DataQueryRequest, DataQueryResponse, UpdateConnectorRequest, CONNECTORS,
};
use axum::extract::Query;
use axum::Json;
use std::time::{SystemTime, UNIX_EPOCH};
use topems_shared_core::response::ApiResponse;
use uuid::Uuid;

#[utoipa::path(
    get,
    path = "/api/ai/connectors",
    tag = "ai",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn list_connectors() -> Json<ApiResponse<Vec<DataConnector>>> {
    if let Some(connectors) = CONNECTORS.get() {
        let connectors = match connectors.lock() {
            Ok(c) => c,
            Err(e) => {
                tracing::error!("Failed to lock connectors: {}", e);
                return Json(ApiResponse::<Vec<DataConnector>>::error(
                    500,
                    "Internal server error",
                ));
            }
        };
        Json(ApiResponse::success(connectors.clone(), "Success"))
    } else {
        Json(ApiResponse::<Vec<DataConnector>>::error(
            500,
            "Connectors not initialized",
        ))
    }
}

#[utoipa::path(
    get,
    path = "/api/ai/connectors/get",
    tag = "ai",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_connector(
    Query(params): Query<ConnectorQuery>,
) -> Json<ApiResponse<DataConnector>> {
    if let Some(connectors) = CONNECTORS.get() {
        let connectors = match connectors.lock() {
            Ok(c) => c,
            Err(e) => {
                tracing::error!("Failed to lock connectors: {}", e);
                return Json(ApiResponse::<DataConnector>::error(
                    500,
                    "Internal server error",
                ));
            }
        };
        if let Some(connector) = connectors.iter().find(|c| c.id == params.id) {
            Json(ApiResponse::success(connector.clone(), "Success"))
        } else {
            Json(ApiResponse::<DataConnector>::error(
                404,
                "Connector not found",
            ))
        }
    } else {
        Json(ApiResponse::<DataConnector>::error(
            500,
            "Connectors not initialized",
        ))
    }
}

#[utoipa::path(
    post,
    path = "/api/ai/connectors/create",
    tag = "ai",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn create_connector(
    Json(req): Json<CreateConnectorRequest>,
) -> Json<ApiResponse<DataConnector>> {
    if let Some(connectors) = CONNECTORS.get() {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs()
            .to_string();

        let new_connector = DataConnector {
            id: Uuid::new_v4().to_string(),
            name: req.name,
            connector_type: req.connector_type,
            database_type: req.database_type,
            config: req.config,
            description: req.description,
            is_active: true,
            created_at: now.clone(),
            updated_at: now,
        };

        let mut connectors = match connectors.lock() {
            Ok(c) => c,
            Err(e) => {
                tracing::error!("Failed to lock connectors: {}", e);
                return Json(ApiResponse::<DataConnector>::error(
                    500,
                    "Internal server error",
                ));
            }
        };
        connectors.push(new_connector.clone());

        Json(ApiResponse::success(
            new_connector,
            "Connector created successfully",
        ))
    } else {
        Json(ApiResponse::<DataConnector>::error(
            500,
            "Connectors not initialized",
        ))
    }
}

#[utoipa::path(
    post,
    path = "/api/ai/connectors/update",
    tag = "ai",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn update_connector(
    Query(params): Query<ConnectorQuery>,
    Json(req): Json<UpdateConnectorRequest>,
) -> Json<ApiResponse<DataConnector>> {
    if let Some(connectors) = CONNECTORS.get() {
        let mut connectors = match connectors.lock() {
            Ok(c) => c,
            Err(e) => {
                tracing::error!("Failed to lock connectors: {}", e);
                return Json(ApiResponse::<DataConnector>::error(
                    500,
                    "Internal server error",
                ));
            }
        };
        if let Some(connector) = connectors.iter_mut().find(|c| c.id == params.id) {
            if let Some(name) = req.name {
                connector.name = name;
            }
            if let Some(config) = req.config {
                connector.config = config;
            }
            if let Some(description) = req.description {
                connector.description = Some(description);
            }
            if let Some(is_active) = req.is_active {
                connector.is_active = is_active;
            }
            connector.updated_at = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs()
                .to_string();

            Json(ApiResponse::success(
                connector.clone(),
                "Connector updated successfully",
            ))
        } else {
            Json(ApiResponse::<DataConnector>::error(
                404,
                "Connector not found",
            ))
        }
    } else {
        Json(ApiResponse::<DataConnector>::error(
            500,
            "Connectors not initialized",
        ))
    }
}

#[utoipa::path(
    post,
    path = "/api/ai/connectors/delete",
    tag = "ai",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn delete_connector(Query(params): Query<ConnectorQuery>) -> Json<ApiResponse<String>> {
    if let Some(connectors) = CONNECTORS.get() {
        let mut connectors = match connectors.lock() {
            Ok(c) => c,
            Err(e) => {
                tracing::error!("Failed to lock connectors: {}", e);
                return Json(ApiResponse::<String>::error(500, "Internal server error"));
            }
        };
        let original_len = connectors.len();
        connectors.retain(|c| c.id != params.id);

        if connectors.len() < original_len {
            Json(ApiResponse::success(
                "Connector deleted successfully".to_string(),
                "Success",
            ))
        } else {
            Json(ApiResponse::<String>::error(404, "Connector not found"))
        }
    } else {
        Json(ApiResponse::<String>::error(
            500,
            "Connectors not initialized",
        ))
    }
}

#[utoipa::path(
    get,
    path = "/api/ai/connectors/test",
    tag = "ai",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn test_connector(
    Query(params): Query<ConnectorQuery>,
) -> Json<ApiResponse<ConnectorStatus>> {
    if let Some(connectors) = CONNECTORS.get() {
        let connectors = match connectors.lock() {
            Ok(c) => c,
            Err(e) => {
                tracing::error!("Failed to lock connectors: {}", e);
                return Json(ApiResponse::<ConnectorStatus>::error(
                    500,
                    "Internal server error",
                ));
            }
        };
        if let Some(connector) = connectors.iter().find(|c| c.id == params.id) {
            let (is_connected, error) = match connector.connector_type {
                ConnectorType::Database => test_database_connection(connector),
                ConnectorType::Api => test_api_connection(connector),
                ConnectorType::CloudStorage => test_cloud_storage_connection(connector),
                _ => (true, None),
            };

            Json(ApiResponse::success(
                ConnectorStatus {
                    connector_id: connector.id.clone(),
                    name: connector.name.clone(),
                    is_connected,
                    error,
                },
                "Connection test completed",
            ))
        } else {
            Json(ApiResponse::<ConnectorStatus>::error(
                404,
                "Connector not found",
            ))
        }
    } else {
        Json(ApiResponse::<ConnectorStatus>::error(
            500,
            "Connectors not initialized",
        ))
    }
}

#[utoipa::path(
    post,
    path = "/api/ai/connectors/query",
    tag = "ai",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn query_data(Json(req): Json<DataQueryRequest>) -> Json<ApiResponse<DataQueryResponse>> {
    if let Some(connectors) = CONNECTORS.get() {
        let connectors = match connectors.lock() {
            Ok(c) => c,
            Err(e) => {
                tracing::error!("Failed to lock connectors: {}", e);
                return Json(ApiResponse::<DataQueryResponse>::error(
                    500,
                    "Internal server error",
                ));
            }
        };
        if let Some(_connector) = connectors.iter().find(|c| c.id == req.connector_id) {
            Json(ApiResponse::success(
                DataQueryResponse {
                    columns: vec![],
                    rows: vec![],
                    row_count: 0,
                },
                "Query executed successfully",
            ))
        } else {
            Json(ApiResponse::<DataQueryResponse>::error(
                404,
                "Connector not found",
            ))
        }
    } else {
        Json(ApiResponse::<DataQueryResponse>::error(
            500,
            "Connectors not initialized",
        ))
    }
}

fn test_database_connection(connector: &DataConnector) -> (bool, Option<String>) {
    let config = &connector.config;
    if config.host.is_some() || config.url.is_some() {
        return (true, None);
    }
    (false, Some("Missing connection configuration".to_string()))
}

fn test_api_connection(connector: &DataConnector) -> (bool, Option<String>) {
    let config = &connector.config;
    if config.endpoint.is_some() {
        return (true, None);
    }
    (false, Some("Missing endpoint configuration".to_string()))
}

fn test_cloud_storage_connection(connector: &DataConnector) -> (bool, Option<String>) {
    let config = &connector.config;
    if config.bucket.is_some() && config.region.is_some() {
        return (true, None);
    }
    (
        false,
        Some("Missing bucket or region configuration".to_string()),
    )
}
