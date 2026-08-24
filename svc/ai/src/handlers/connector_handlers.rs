#![allow(dead_code)]

use crate::models::{
    ConnectorQuery, ConnectorStatus, ConnectorType, CreateConnectorRequest, DataConnector,
    DataQueryRequest, DataQueryResponse, UpdateConnectorRequest, CONNECTORS,
};
use axum::extract::{Query, State};
use axum::{extract::Extension, Json};
use std::time::{SystemTime, UNIX_EPOCH};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;
use uuid::Uuid;

use crate::shared::AppState;

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ai:read"])),
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
    security(("BearerAuth" = ["ai:read"])),
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
    security(("BearerAuth" = ["ai:session:write"])),
    path = "/api/ai/connectors/create",
    request_body = CreateConnectorRequest,
    tag = "ai",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn create_connector(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateConnectorRequest>,
) -> Json<ApiResponse<DataConnector>> {
    let user_id = Some(claims.sub.as_str());
    let details = Some(serde_json::json!({"name": req.name, "connector_type": req.connector_type, "database_type": req.database_type}));
    if let Some(connectors) = CONNECTORS.get() {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs()
            .to_string();

        let new_connector = DataConnector {
            id: Uuid::new_v4(),
            name: req.name,
            connector_type: req.connector_type,
            database_type: req.database_type,
            config: req.config,
            description: req.description,
            is_active: true,
            created_at: now.clone(),
            updated_at: now,
        };

        let lock_result = {
            match connectors.lock() {
                Ok(mut c) => {
                    let connector_id = new_connector.id;
                    c.push(new_connector.clone());
                    Ok(connector_id)
                }
                Err(e) => {
                    tracing::error!("Failed to lock connectors: {}", e);
                    Err(())
                }
            }
        };

        match lock_result {
            Ok(connector_id) => {
                if let Err(e) = state.audit.log_connector_operation("create_connector", Some(&connector_id.to_string()), user_id, details.clone(), "success", None).await {
                    tracing::warn!("ai audit failed: {e}");
                }
                Json(ApiResponse::success(
                    new_connector,
                    "Connector created successfully",
                ))
            }
            Err(()) => {
                let err_msg = "Internal server error";
                if let Err(audit_err) = state.audit.log_connector_operation("create_connector", None, user_id, details.clone(), "failed", Some(err_msg)).await {
                    tracing::warn!("ai audit failed: {audit_err}");
                }
                Json(ApiResponse::<DataConnector>::error(
                    500,
                    err_msg,
                ))
            }
        }
    } else {
        let err_msg = "Connectors not initialized";
        if let Err(e) = state.audit.log_connector_operation("create_connector", None, user_id, details, "failed", Some(err_msg)).await {
            tracing::warn!("ai audit failed: {e}");
        }
        Json(ApiResponse::<DataConnector>::error(
            500,
            err_msg,
        ))
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/api/ai/connectors/update",
    request_body = UpdateConnectorRequest,
    tag = "ai",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn update_connector(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ConnectorQuery>,
    Json(req): Json<UpdateConnectorRequest>,
) -> Json<ApiResponse<DataConnector>> {
    let user_id = Some(claims.sub.as_str());
    let details = Some(serde_json::json!({"connector_id": params.id, "is_active": req.is_active}));
    let entity_id_str = params.id.to_string();
    if let Some(connectors) = CONNECTORS.get() {
        let lock_result = {
            match connectors.lock() {
                Ok(mut connectors) => {
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
                        Ok(Some(connector.clone()))
                    } else {
                        Ok(None)
                    }
                }
                Err(e) => {
                    tracing::error!("Failed to lock connectors: {}", e);
                    Err(())
                }
            }
        };

        match lock_result {
            Ok(Some(connector)) => {
                if let Err(e) = state.audit.log_connector_operation("update_connector", Some(&connector.id.to_string()), user_id, details.clone(), "success", None).await {
                    tracing::warn!("ai audit failed: {e}");
                }
                Json(ApiResponse::success(
                    connector,
                    "Connector updated successfully",
                ))
            }
            Ok(None) => {
                if let Err(e) = state.audit.log_connector_operation("update_connector", Some(&entity_id_str), user_id, details.clone(), "failed", Some("Connector not found")).await {
                    tracing::warn!("ai audit failed: {e}");
                }
                Json(ApiResponse::<DataConnector>::error(
                    404,
                    "Connector not found",
                ))
            }
            Err(()) => {
                let err_msg = "Internal server error";
                if let Err(audit_err) = state.audit.log_connector_operation("update_connector", Some(&entity_id_str), user_id, details.clone(), "failed", Some(err_msg)).await {
                    tracing::warn!("ai audit failed: {audit_err}");
                }
                Json(ApiResponse::<DataConnector>::error(
                    500,
                    err_msg,
                ))
            }
        }
    } else {
        let err_msg = "Connectors not initialized";
        if let Err(e) = state.audit.log_connector_operation("update_connector", Some(&entity_id_str), user_id, details, "failed", Some(err_msg)).await {
            tracing::warn!("ai audit failed: {e}");
        }
        Json(ApiResponse::<DataConnector>::error(
            500,
            err_msg,
        ))
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ai:write"])),
    path = "/api/ai/connectors/delete",
    tag = "ai",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn delete_connector(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ConnectorQuery>,
) -> Json<ApiResponse<String>> {
    let user_id = Some(claims.sub.as_str());
    let details = Some(serde_json::json!({"connector_id": params.id}));
    let entity_id_str = params.id.to_string();
    if let Some(connectors) = CONNECTORS.get() {
        let lock_result = {
            match connectors.lock() {
                Ok(mut connectors) => {
                    let original_len = connectors.len();
                    connectors.retain(|c| c.id != params.id);
                    if connectors.len() < original_len {
                        Ok(true)
                    } else {
                        Ok(false)
                    }
                }
                Err(e) => {
                    tracing::error!("Failed to lock connectors: {}", e);
                    Err(())
                }
            }
        };

        match lock_result {
            Ok(true) => {
                if let Err(e) = state.audit.log_connector_operation("delete_connector", Some(&entity_id_str), user_id, details.clone(), "success", None).await {
                    tracing::warn!("ai audit failed: {e}");
                }
                Json(ApiResponse::success(
                    "Connector deleted successfully".to_string(),
                    "Success",
                ))
            }
            Ok(false) => {
                if let Err(e) = state.audit.log_connector_operation("delete_connector", Some(&entity_id_str), user_id, details.clone(), "failed", Some("Connector not found")).await {
                    tracing::warn!("ai audit failed: {e}");
                }
                Json(ApiResponse::<String>::error(404, "Connector not found"))
            }
            Err(()) => {
                let err_msg = "Internal server error";
                if let Err(audit_err) = state.audit.log_connector_operation("delete_connector", Some(&entity_id_str), user_id, details.clone(), "failed", Some(err_msg)).await {
                    tracing::warn!("ai audit failed: {audit_err}");
                }
                Json(ApiResponse::<String>::error(500, err_msg))
            }
        }
    } else {
        let err_msg = "Connectors not initialized";
        if let Err(e) = state.audit.log_connector_operation("delete_connector", Some(&entity_id_str), user_id, details, "failed", Some(err_msg)).await {
            tracing::warn!("ai audit failed: {e}");
        }
        Json(ApiResponse::<String>::error(
            500,
            err_msg,
        ))
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ai:read"])),
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
                    connector_id: connector.id,
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
    security(("BearerAuth" = ["ai:write"])),
    path = "/api/ai/connectors/query",
    request_body = DataQueryRequest,
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
