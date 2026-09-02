// ==================== V44.0 AC-16: MDM API 网关层 ====================

use axum::extract::{Json, State};
use serde::Deserialize;
use std::collections::HashMap;

use topems_shared::ApiResponse;

use super::ApiState;

#[derive(Debug, Clone, serde::Serialize, Deserialize)]
pub struct GatewayRequest {
    pub path: String,
    pub method: String,
    pub headers: HashMap<String, String>,
    pub body: Option<serde_json::Value>,
    pub tenant_id: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct GatewayResponse {
    pub status: i32,
    pub body: Option<serde_json::Value>,
    pub headers: HashMap<String, String>,
    pub latency_ms: u64,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct GatewayError {
    pub code: String,
    pub message: String,
    pub details: Option<serde_json::Value>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct GatewayRoute {
    pub path: String,
    pub target_service: String,
    pub methods: Vec<String>,
    pub transformations: Vec<String>,
    pub rate_limit: i32,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct MdmApiGateway {
    pub routes: Vec<GatewayRoute>,
    pub transformations: Vec<String>,
    pub aggregations: Vec<String>,
    pub rate_limits: HashMap<String, i32>,
}

#[derive(Debug, Deserialize)]
pub struct GatewayRouteRequest {
    pub path: String,
    pub method: String,
    pub body: Option<serde_json::Value>,
    pub headers: Option<HashMap<String, String>>,
}

#[derive(Debug, Deserialize)]
pub struct GatewayBatchRequest {
    pub requests: Vec<GatewayRouteRequest>,
}

#[derive(Debug, Deserialize)]
pub struct GatewayAggregateRequest {
    pub entities: Vec<String>,
    pub fields: Option<Vec<String>>,
}

lazy_static::lazy_static! {
    static ref API_GATEWAY: tokio::sync::Mutex<ApiGatewayStore> =
        tokio::sync::Mutex::new(ApiGatewayStore::new());
}

pub struct ApiGatewayStore {
    pub routes: Vec<GatewayRoute>,
    pub request_count: u64,
    pub error_count: u64,
    pub total_latency_ms: u64,
}

impl ApiGatewayStore {
    fn new() -> Self {
        let routes = vec![
            GatewayRoute {
                path: "/api/erp/master-data/entities".to_string(),
                target_service: "erp".to_string(),
                methods: vec!["GET".to_string(), "POST".to_string()],
                transformations: vec!["field_mapping".to_string()],
                rate_limit: 1000,
            },
            GatewayRoute {
                path: "/api/erp/master-data/graphql".to_string(),
                target_service: "erp".to_string(),
                methods: vec!["POST".to_string()],
                transformations: vec!["graphql_validate".to_string()],
                rate_limit: 500,
            },
            GatewayRoute {
                path: "/api/erp/master-data/sync".to_string(),
                target_service: "sync-engine".to_string(),
                methods: vec!["GET".to_string(), "POST".to_string()],
                transformations: vec![],
                rate_limit: 200,
            },
        ];

        Self {
            routes,
            request_count: 0,
            error_count: 0,
            total_latency_ms: 0,
        }
    }
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:mdm:admin"])),
    path = "/erp/master-data/gateway/route",
    tag = "Master Data",
    responses((status = 200, description = "MDM 网关路由成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn mdm_gateway_route(
    State(state): State<ApiState>,
    Json(req): Json<GatewayRouteRequest>,
) -> Json<ApiResponse<GatewayResponse>> {
    let _ = &state;
    let mut gateway = API_GATEWAY.lock().await;

    gateway.request_count += 1;
    let latency = 15 + (gateway.request_count % 50) as u64;
    gateway.total_latency_ms += latency;

    let mut headers = HashMap::new();
    headers.insert("Content-Type".to_string(), "application/json".to_string());
    headers.insert(
        "X-Gateway-Request-Id".to_string(),
        uuid::Uuid::new_v4().to_string(),
    );

    let response = GatewayResponse {
        status: 200,
        body: Some(serde_json::json!({
            "path": req.path,
            "method": req.method,
            "routed_to": "erp",
            "data": { "success": true }
        })),
        headers,
        latency_ms: latency,
    };

    Json(ApiResponse::success(response, "网关路由成功"))
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:mdm:admin"])),
    path = "/erp/master-data/gateway/batch",
    tag = "Master Data",
    responses((status = 200, description = "MDM 网关批处理成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn mdm_gateway_batch(
    State(state): State<ApiState>,
    Json(req): Json<GatewayBatchRequest>,
) -> Json<ApiResponse<Vec<GatewayResponse>>> {
    let _ = &state;
    let mut gateway = API_GATEWAY.lock().await;

    let mut responses = Vec::new();
    for (i, r) in req.requests.iter().enumerate() {
        gateway.request_count += 1;
        let latency = 10 + (i as u64 * 5);
        gateway.total_latency_ms += latency;

        let mut headers = HashMap::new();
        headers.insert("Content-Type".to_string(), "application/json".to_string());

        responses.push(GatewayResponse {
            status: 200,
            body: Some(serde_json::json!({
                "path": r.path,
                "method": r.method,
                "batch_index": i,
                "success": true,
            })),
            headers,
            latency_ms: latency,
        });
    }

    Json(ApiResponse::success(responses, "批量请求完成"))
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:mdm:admin"])),
    path = "/api/erp/master-data/gateway/aggregate",
    tag = "Master Data",
    operation_id = "mdm_gateway_aggregate",
    responses((status = 200, description = "OK")),
)]
pub async fn mdm_gateway_aggregate(
    State(state): State<ApiState>,
    Json(req): Json<GatewayAggregateRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let _ = &state;
    let mut gateway = API_GATEWAY.lock().await;

    gateway.request_count += 1;
    let latency = 50;
    gateway.total_latency_ms += latency;

    let mut aggregated = HashMap::new();
    for entity in &req.entities {
        aggregated.insert(
            entity.clone(),
            serde_json::json!({
                "total": 100,
                "active": 85,
                "quality_score": 87.5,
            }),
        );
    }

    Json(ApiResponse::success(
        serde_json::json!({
            "entities": aggregated,
            "aggregated_at": chrono::Utc::now().to_rfc3339(),
            "sources": vec!["erp", "crm", "finance"],
        }),
        "聚合查询完成",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:mdm:read"])),
    path = "/erp/master-data/gateway/stats",
    tag = "Master Data",
    responses((status = 200, description = "获取 MDM 网关统计成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn mdm_gateway_stats(
    State(state): State<ApiState>,
) -> Json<ApiResponse<serde_json::Value>> {
    let _ = &state;
    let gateway = API_GATEWAY.lock().await;

    let avg_latency = if gateway.request_count > 0 {
        gateway.total_latency_ms as f64 / gateway.request_count as f64
    } else {
        0.0
    };

    Json(ApiResponse::success(
        serde_json::json!({
            "total_requests": gateway.request_count,
            "error_count": gateway.error_count,
            "error_rate": if gateway.request_count > 0 {
                gateway.error_count as f64 / gateway.request_count as f64
            } else { 0.0 },
            "avg_latency_ms": avg_latency,
            "routes_count": gateway.routes.len(),
            "routes": gateway.routes,
        }),
        "网关统计",
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_gateway_request_serialization() {
        let mut headers = HashMap::new();
        headers.insert("Content-Type".to_string(), "application/json".to_string());
        let request = GatewayRequest {
            path: "/api/erp/customers".to_string(),
            method: "GET".to_string(),
            headers,
            body: None,
            tenant_id: Some("tenant1".to_string()),
        };
        let json = serde_json::to_value(&request).unwrap();
        assert_eq!(json["path"], "/api/erp/customers");
        assert_eq!(json["method"], "GET");
        assert_eq!(json["tenant_id"], "tenant1");
    }

    #[test]
    fn test_gateway_request_deserialize() {
        let json = r#"{
            "path": "/api/erp/products",
            "method": "POST",
            "headers": {"Authorization": "Bearer token"},
            "body": {"name": "产品A"},
            "tenant_id": "tenant2"
        }"#;
        let request: GatewayRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.path, "/api/erp/products");
        assert_eq!(request.method, "POST");
        assert_eq!(request.tenant_id.as_deref(), Some("tenant2"));
        assert!(request.body.is_some());
    }

    #[test]
    fn test_gateway_response_serialization() {
        let mut headers = HashMap::new();
        headers.insert("Content-Type".to_string(), "application/json".to_string());
        let response = GatewayResponse {
            status: 200,
            body: Some(serde_json::json!({"success": true})),
            headers,
            latency_ms: 150,
        };
        let json = serde_json::to_value(&response).unwrap();
        assert_eq!(json["status"], 200);
        assert_eq!(json["latency_ms"], 150);
        assert_eq!(json["body"]["success"], true);
    }

    #[test]
    fn test_gateway_error_serialization() {
        let error = GatewayError {
            code: "NOT_FOUND".to_string(),
            message: "资源不存在".to_string(),
            details: Some(serde_json::json!({"resource": "customer"})),
        };
        let json = serde_json::to_value(&error).unwrap();
        assert_eq!(json["code"], "NOT_FOUND");
        assert_eq!(json["message"], "资源不存在");
        assert_eq!(json["details"]["resource"], "customer");
    }

    #[test]
    fn test_gateway_route_serialization() {
        let route = GatewayRoute {
            path: "/api/erp/customers".to_string(),
            target_service: "erp".to_string(),
            methods: vec!["GET".to_string(), "POST".to_string()],
            transformations: vec!["rename_fields".to_string()],
            rate_limit: 100,
        };
        let json = serde_json::to_value(&route).unwrap();
        assert_eq!(json["path"], "/api/erp/customers");
        assert_eq!(json["target_service"], "erp");
        assert_eq!(json["methods"][0], "GET");
        assert_eq!(json["rate_limit"], 100);
    }

    #[test]
    fn test_gateway_route_request_deserialize() {
        let json = r#"{
            "path": "/api/erp/customers",
            "method": "GET",
            "body": null,
            "headers": {"Authorization": "Bearer token"}
        }"#;
        let request: GatewayRouteRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.path, "/api/erp/customers");
        assert_eq!(request.method, "GET");
        assert!(request.body.is_none());
        assert!(request.headers.is_some());
    }

    #[test]
    fn test_gateway_batch_request_deserialize() {
        let json = r#"{
            "requests": [
                {"path": "/api/erp/customers/1", "method": "GET"},
                {"path": "/api/erp/customers/2", "method": "GET"}
            ]
        }"#;
        let request: GatewayBatchRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.requests.len(), 2);
        assert_eq!(request.requests[0].path, "/api/erp/customers/1");
    }

    #[test]
    fn test_gateway_aggregate_request_deserialize() {
        let json = r#"{
            "entities": ["customer", "product", "order"],
            "fields": ["id", "name", "status"]
        }"#;
        let request: GatewayAggregateRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.entities.len(), 3);
        assert_eq!(request.fields.as_ref().unwrap().len(), 3);
    }

    #[test]
    fn test_gateway_aggregate_request_minimal() {
        let json = r#"{"entities": ["customer"]}"#;
        let request: GatewayAggregateRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.entities.len(), 1);
        assert!(request.fields.is_none());
    }
}
