// ==================== V44.0 AC-16: MDM 服务注册与健康检查 ====================

use axum::extract::{Path, Query, State};
use axum::Json;
use serde::Deserialize;
use std::collections::HashMap;

use topems_shared_core::response::ApiResponse;

use super::ApiState;

#[derive(Debug, Clone, serde::Serialize, Deserialize)]
pub struct MdmServiceInfo {
    pub service_id: String,
    pub service_name: String,
    pub endpoint: String,
    pub domains: Vec<String>,
    pub status: String,
    pub last_heartbeat: String,
    pub capabilities: Vec<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct ServiceRegistryV2 {
    pub services: Vec<MdmServiceInfo>,
    pub health_check_interval: i32,
}

#[derive(Debug, Deserialize)]
pub struct MdmServiceRegisterRequest {
    pub service_id: Option<String>,
    pub service_name: String,
    pub endpoint: String,
    pub domains: Vec<String>,
    pub capabilities: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct MdmServiceQuery {
    pub status: Option<String>,
    pub domain: Option<String>,
}

lazy_static::lazy_static! {
    static ref SERVICE_REGISTRY: tokio::sync::Mutex<ServiceRegistryStore> =
        tokio::sync::Mutex::new(ServiceRegistryStore::new());
}

pub struct ServiceRegistryStore {
    pub services: HashMap<String, MdmServiceInfo>,
    pub health_check_interval: i32,
}

impl ServiceRegistryStore {
    fn new() -> Self {
        let mut services = HashMap::new();
        let now = chrono::Utc::now().to_rfc3339();

        let default_services = vec![
            (
                "svc-erp",
                "ERP 服务",
                "http://erp:8080",
                vec!["customer", "supplier", "material"],
            ),
            ("svc-crm", "CRM 服务", "http://crm:8081", vec!["customer"]),
            (
                "svc-finance",
                "财务服务",
                "http://finance:8082",
                vec!["account_subject"],
            ),
            (
                "svc-hr",
                "人力资源",
                "http://hr:8083",
                vec!["employee", "organization"],
            ),
        ];

        for (id, name, endpoint, domains) in default_services {
            services.insert(
                id.to_string(),
                MdmServiceInfo {
                    service_id: id.to_string(),
                    service_name: name.to_string(),
                    endpoint: endpoint.to_string(),
                    domains: domains.into_iter().map(String::from).collect(),
                    status: "healthy".to_string(),
                    last_heartbeat: now.clone(),
                    capabilities: vec!["read".to_string(), "write".to_string()],
                },
            );
        }

        Self {
            services,
            health_check_interval: 30,
        }
    }
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:mdm:admin"])),
    path = "/erp/master-data/services/register",
    tag = "Master Data",
    responses((status = 200, description = "注册 MDM 服务成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn mdm_service_register(
    State(state): State<ApiState>,
    Json(req): Json<MdmServiceRegisterRequest>,
) -> ApiResponse<MdmServiceInfo> {
    let _ = &state;
    let mut registry = SERVICE_REGISTRY.lock().await;

    let service_id = req
        .service_id
        .unwrap_or_else(|| format!("svc-{}", uuid::Uuid::new_v4()));
    let now = chrono::Utc::now().to_rfc3339();

    let service = MdmServiceInfo {
        service_id: service_id.clone(),
        service_name: req.service_name,
        endpoint: req.endpoint,
        domains: req.domains,
        status: "healthy".to_string(),
        last_heartbeat: now,
        capabilities: req.capabilities.unwrap_or_else(|| vec!["read".to_string()]),
    };

    registry.services.insert(service_id, service.clone());

    ApiResponse::success(service, "服务注册成功")
}

// gate: admin-only
#[utoipa::path(
    delete,
    security(("BearerAuth" = ["erp:mdm:admin"])),
    path = "/master-data/services/{service_id}/deregister",
    tag = "Master Data",
    params(("serviceId" = String, Path, description = "服务ID")),
    responses((status = 200, description = "注销 MDM 服务成功（DELETE 语义同 POST）", body = ApiResponse<serde_json::Value>))
)]
pub async fn mdm_service_deregister_delete(
    state: State<ApiState>,
    path: Path<String>,
) -> ApiResponse<serde_json::Value> {
    mdm_service_deregister(state, path).await
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:mdm:admin"])),
    path = "/master-data/services/{service_id}/deregister",
    tag = "Master Data",
    params(("serviceId" = String, Path, description = "服务ID")),
    responses((status = 200, description = "注销 MDM 服务成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn mdm_service_deregister(
    State(state): State<ApiState>,
    Path(service_id): Path<String>,
) -> ApiResponse<serde_json::Value> {
    let _ = &state;
    let mut registry = SERVICE_REGISTRY.lock().await;

    match registry.services.remove(&service_id) {
        Some(_) => ApiResponse::success(
            serde_json::json!({ "service_id": service_id, "deregistered": true }),
            "服务注销成功",
        ),
        None => ApiResponse::not_found("未找到该服务"),
    }
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:mdm:admin"])),
    path = "/erp/master-data/services/{serviceId}/heartbeat",
    tag = "Master Data",
    params(("serviceId" = String, Path, description = "服务ID")),
    responses((status = 200, description = "MDM 服务心跳成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn mdm_service_heartbeat(
    State(state): State<ApiState>,
    Path(service_id): Path<String>,
) -> ApiResponse<MdmServiceInfo> {
    let _ = &state;
    let mut registry = SERVICE_REGISTRY.lock().await;

    match registry.services.get_mut(&service_id) {
        Some(service) => {
            service.last_heartbeat = chrono::Utc::now().to_rfc3339();
            service.status = "healthy".to_string();
            ApiResponse::success(service.clone(), "心跳更新成功")
        }
        None => ApiResponse::not_found("未找到该服务"),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:mdm:read"])),
    path = "/erp/master-data/services",
    tag = "Master Data",
    responses((status = 200, description = "获取 MDM 服务列表成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn mdm_service_list(
    State(state): State<ApiState>,
    Query(params): Query<MdmServiceQuery>,
) -> ApiResponse<Vec<MdmServiceInfo>> {
    let _ = &state;
    let registry = SERVICE_REGISTRY.lock().await;

    let filtered: Vec<MdmServiceInfo> = registry
        .services
        .values()
        .filter(|s| {
            if let Some(ref status) = params.status {
                if &s.status != status {
                    return false;
                }
            }
            if let Some(ref domain) = params.domain {
                if !s.domains.contains(domain) {
                    return false;
                }
            }
            true
        })
        .cloned()
        .collect();

    ApiResponse::success(filtered, "服务列表")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:mdm:read"])),
    path = "/erp/master-data/services/{serviceId}/health",
    tag = "Master Data",
    params(("serviceId" = String, Path, description = "服务ID")),
    responses((status = 200, description = "获取 MDM 服务健康状态成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn mdm_service_health(
    State(state): State<ApiState>,
    Path(service_id): Path<String>,
) -> ApiResponse<MdmServiceInfo> {
    let _ = &state;
    let registry = SERVICE_REGISTRY.lock().await;

    match registry.services.get(&service_id) {
        Some(service) => ApiResponse::success(service.clone(), "服务健康状态"),
        None => ApiResponse::not_found("未找到该服务"),
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
mod tests {
    use super::*;

    #[test]
    fn test_mdm_service_info_serialization() {
        let info = MdmServiceInfo {
            service_id: "svc-erp".to_string(),
            service_name: "ERP 服务".to_string(),
            endpoint: "http://erp:8080".to_string(),
            domains: vec!["customer".to_string(), "supplier".to_string()],
            status: "active".to_string(),
            last_heartbeat: "2024-01-01T00:00:00Z".to_string(),
            capabilities: vec!["read".to_string(), "write".to_string()],
        };
        let json = serde_json::to_value(&info).unwrap();
        assert_eq!(json["service_id"], "svc-erp");
        assert_eq!(json["service_name"], "ERP 服务");
        assert_eq!(json["endpoint"], "http://erp:8080");
        assert_eq!(json["domains"][0], "customer");
        assert_eq!(json["status"], "active");
        assert_eq!(json["last_heartbeat"], "2024-01-01T00:00:00Z");
        assert_eq!(json["capabilities"][0], "read");
    }

    #[test]
    fn test_mdm_service_info_deserialize() {
        let json = r#"{
            "service_id": "svc-crm",
            "service_name": "CRM 服务",
            "endpoint": "http://crm:8080",
            "domains": ["customer"],
            "status": "inactive",
            "last_heartbeat": "2024-01-02T00:00:00Z",
            "capabilities": ["read"]
        }"#;
        let info: MdmServiceInfo = serde_json::from_str(json).unwrap();
        assert_eq!(info.service_id, "svc-crm");
        assert_eq!(info.service_name, "CRM 服务");
        assert_eq!(info.status, "inactive");
        assert_eq!(info.domains.len(), 1);
    }

    #[test]
    fn test_service_registry_v2_serialization() {
        let registry = ServiceRegistryV2 {
            services: vec![],
            health_check_interval: 30,
        };
        let json = serde_json::to_value(&registry).unwrap();
        assert_eq!(json["health_check_interval"], 30);
        assert!(json["services"].as_array().unwrap().is_empty());
    }

    #[test]
    fn test_mdm_service_register_request_deserialize() {
        let json = r#"{
            "service_id": "svc-wms",
            "service_name": "WMS 服务",
            "endpoint": "http://wms:8080",
            "domains": ["product", "inventory"],
            "capabilities": ["read", "write", "sync"]
        }"#;
        let request: MdmServiceRegisterRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.service_id.as_deref(), Some("svc-wms"));
        assert_eq!(request.service_name, "WMS 服务");
        assert_eq!(request.endpoint, "http://wms:8080");
        assert_eq!(request.domains.len(), 2);
        assert_eq!(request.capabilities.as_ref().unwrap().len(), 3);
    }

    #[test]
    fn test_mdm_service_register_request_minimal() {
        let json = r#"{
            "service_name": "新服务",
            "endpoint": "http://new:8080",
            "domains": ["customer"]
        }"#;
        let request: MdmServiceRegisterRequest = serde_json::from_str(json).unwrap();
        assert!(request.service_id.is_none());
        assert_eq!(request.service_name, "新服务");
        assert!(request.capabilities.is_none());
    }

    #[test]
    fn test_mdm_service_query_deserialize() {
        let query = "status=active&domain=customer";
        let params: MdmServiceQuery = serde_urlencoded::from_str(query).unwrap();
        assert_eq!(params.status.as_deref(), Some("active"));
        assert_eq!(params.domain.as_deref(), Some("customer"));
    }

    #[test]
    fn test_mdm_service_query_default() {
        let query = "";
        let params: MdmServiceQuery = serde_urlencoded::from_str(query).unwrap();
        assert!(params.status.is_none());
        assert!(params.domain.is_none());
    }
}
