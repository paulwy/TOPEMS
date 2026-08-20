use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

use topems_shared_core::{config::ServiceConfig, error::Result, error::TopemsError};

/// 服务元数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceInfo {
    pub name: String,
    pub code: String,
    pub description: String,
    pub icon: Option<String>,
    pub category: ServiceCategory,
    pub status: ServiceRegistryStatus,
    pub url: Option<String>,
    pub api_prefix: Option<String>,
    pub port: u16,
    pub version: String,
    pub order: i32,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ServiceCategory {
    Core,
    Business,
    Support,
    Analytics,
    Integration,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ServiceRegistryStatus {
    Active,
    Inactive,
    Maintenance,
}

/// 服务发现客户端
#[derive(Clone)]
pub struct ServiceDiscoveryClient {
    client: Client,
    registry_url: String,
}

impl ServiceDiscoveryClient {
    pub fn new(registry_url: String) -> Self {
        Self {
            client: Client::new(),
            registry_url,
        }
    }

    pub fn from_config(config: &ServiceConfig) -> Self {
        Self::new(format!("http://localhost:{}", config.port))
    }

    /// 获取所有服务
    pub async fn list_services(&self) -> Result<Vec<ServiceInfo>> {
        let response = self
            .client
            .get(format!("{}/api/services", self.registry_url))
            .send()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to fetch services: {}", e)))?;

        let api_response: topems_shared_core::response::ApiResponse<Vec<ServiceInfo>> = response
            .json()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to parse response: {}", e)))?;

        api_response
            .data
            .ok_or_else(|| TopemsError::Internal(api_response.message))
    }

    /// 按分类获取服务
    pub async fn list_services_by_category(
        &self,
        category: ServiceCategory,
    ) -> Result<Vec<ServiceInfo>> {
        let response = self
            .client
            .get(format!(
                "{}/api/services?category={}",
                self.registry_url,
                serde_json::to_string(&category).unwrap_or_default()
            ))
            .send()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to fetch services: {}", e)))?;

        let api_response: topems_shared_core::response::ApiResponse<Vec<ServiceInfo>> = response
            .json()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to parse response: {}", e)))?;

        api_response
            .data
            .ok_or_else(|| TopemsError::Internal(api_response.message))
    }

    /// 获取单个服务信息
    pub async fn get_service(&self, code: &str) -> Result<ServiceInfo> {
        let response = self
            .client
            .get(format!("{}/api/services/{}", self.registry_url, code))
            .send()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to fetch service: {}", e)))?;

        let api_response: topems_shared_core::response::ApiResponse<ServiceInfo> = response
            .json()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to parse response: {}", e)))?;

        api_response
            .data
            .ok_or_else(|| TopemsError::Internal(api_response.message))
    }

    /// 获取服务健康状态
    pub async fn get_service_health(&self, code: &str) -> Result<ServiceHealthStatus> {
        let response = self
            .client
            .get(format!(
                "{}/api/services/{}/health",
                self.registry_url, code
            ))
            .send()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to fetch health: {}", e)))?;

        let api_response: topems_shared_core::response::ApiResponse<ServiceHealthStatus> = response
            .json()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to parse response: {}", e)))?;

        api_response
            .data
            .ok_or_else(|| TopemsError::Internal(api_response.message))
    }

    /// 批量获取服务健康状态
    pub async fn batch_get_health(
        &self,
        codes: &[String],
    ) -> Result<HashMap<String, ServiceHealthStatus>> {
        let codes_param = codes.join(",");
        let response = self
            .client
            .get(format!(
                "{}/api/services/health/batch?codes={}",
                self.registry_url, codes_param
            ))
            .send()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to fetch health: {}", e)))?;

        let api_response: topems_shared_core::response::ApiResponse<
            HashMap<String, ServiceHealthStatus>,
        > = response
            .json()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to parse response: {}", e)))?;

        api_response
            .data
            .ok_or_else(|| TopemsError::Internal(api_response.message))
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceHealthStatus {
    pub code: String,
    pub name: String,
    pub status: String,
    pub response_time_ms: Option<u64>,
    pub last_check: String,
    pub endpoints: Vec<ServiceEndpoint>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceEndpoint {
    pub path: String,
    pub method: String,
    pub status: String,
    pub response_time_ms: Option<u64>,
}

/// 本地服务注册表（用于没有注册中心的情况）
#[derive(Default)]
pub struct LocalServiceRegistry {
    services: Arc<RwLock<HashMap<String, ServiceInfo>>>,
}

impl LocalServiceRegistry {
    pub fn new() -> Self {
        Self::default()
    }

    pub async fn register(&self, service: ServiceInfo) {
        let mut services = self.services.write().await;
        services.insert(service.code.clone(), service);
    }

    pub async fn unregister(&self, code: &str) -> Option<ServiceInfo> {
        let mut services = self.services.write().await;
        services.remove(code)
    }

    pub async fn get(&self, code: &str) -> Option<ServiceInfo> {
        let services = self.services.read().await;
        services.get(code).cloned()
    }

    pub async fn list_all(&self) -> Vec<ServiceInfo> {
        let services = self.services.read().await;
        let mut result: Vec<_> = services.values().cloned().collect();
        result.sort_by_key(|s| s.order);
        result
    }

    pub async fn list_by_category(&self, category: &ServiceCategory) -> Vec<ServiceInfo> {
        let services = self.services.read().await;
        let mut result: Vec<_> = services
            .values()
            .filter(|s| &s.category == category)
            .cloned()
            .collect();
        result.sort_by_key(|s| s.order);
        result
    }
}

/// Portal 服务信息聚合（用于 Portal 服务调用其他微服务）
#[derive(Default)]
pub struct PortalServiceAggregator {
    pub registry: LocalServiceRegistry,
    http_client: Client,
}

impl PortalServiceAggregator {
    pub fn new() -> Self {
        Self {
            registry: LocalServiceRegistry::new(),
            http_client: Client::new(),
        }
    }

    /// 初始化本地注册表
    pub async fn init_default_services(&self) {
        let default_services = vec![
            ServiceInfo {
                name: "身份认证".to_string(),
                code: "iam".to_string(),
                description: "用户身份认证与权限管理".to_string(),
                icon: Some("Shield".to_string()),
                category: ServiceCategory::Core,
                status: ServiceRegistryStatus::Active,
                url: None,
                api_prefix: Some("/api/iam".to_string()),
                port: 8000,
                version: "1.0.0".to_string(),
                order: 1,
                tags: vec!["auth".to_string(), "permission".to_string()],
            },
            ServiceInfo {
                name: "人力资源".to_string(),
                code: "hrm".to_string(),
                description: "人力资源管理".to_string(),
                icon: Some("Users".to_string()),
                category: ServiceCategory::Business,
                status: ServiceRegistryStatus::Active,
                url: None,
                api_prefix: Some("/api/hrm".to_string()),
                port: 8020,
                version: "1.0.0".to_string(),
                order: 2,
                tags: vec!["hr".to_string(), "employee".to_string()],
            },
            ServiceInfo {
                name: "文档管理".to_string(),
                code: "doc".to_string(),
                description: "企业文档管理".to_string(),
                icon: Some("FileText".to_string()),
                category: ServiceCategory::Business,
                status: ServiceRegistryStatus::Active,
                url: None,
                api_prefix: Some("/api/doc".to_string()),
                port: 8000,
                version: "1.0.0".to_string(),
                order: 3,
                tags: vec!["document".to_string(), "wiki".to_string()],
            },
            ServiceInfo {
                name: "CRM".to_string(),
                code: "crm".to_string(),
                description: "客户关系管理".to_string(),
                icon: Some("BarChart".to_string()),
                category: ServiceCategory::Business,
                status: ServiceRegistryStatus::Active,
                url: None,
                api_prefix: Some("/api/crm".to_string()),
                port: 8016,
                version: "1.0.0".to_string(),
                order: 4,
                tags: vec!["customer".to_string(), "sales".to_string()],
            },
            ServiceInfo {
                name: "项目管理".to_string(),
                code: "pm".to_string(),
                description: "项目管理".to_string(),
                icon: Some("Target".to_string()),
                category: ServiceCategory::Business,
                status: ServiceRegistryStatus::Active,
                url: None,
                api_prefix: Some("/api/pm".to_string()),
                port: 8027,
                version: "1.0.0".to_string(),
                order: 5,
                tags: vec!["project".to_string(), "task".to_string()],
            },
        ];

        for service in &default_services {
            tracing::info!(
                target: "service_discovery",
                service_code = %service.code,
                service_name = %service.name,
                service_port = service.port,
                category = ?service.category,
                api_prefix = ?service.api_prefix,
                "[ServiceDiscovery] 注册默认服务到本地注册表"
            );
            self.registry.register(service.clone()).await;
        }
        tracing::info!(
            target: "service_discovery",
            total = default_services.len(),
            "[ServiceDiscovery] 默认服务注册完成"
        );
    }

    pub async fn get_service_url(&self, code: &str) -> Option<String> {
        let service = self.registry.get(code).await?;
        let url = format!("http://localhost:{}", service.port);
        tracing::debug!(
            target: "service_discovery",
            service_code = %code,
            service_port = service.port,
            resolved_url = %url,
            "[ServiceDiscovery] 本地服务查询成功"
        );
        Some(url)
    }

    pub async fn make_proxy_request(
        &self,
        service_code: &str,
        path: &str,
        method: &str,
    ) -> Result<String> {
        let base_url = self
            .get_service_url(service_code)
            .await
            .ok_or_else(|| TopemsError::Internal(format!("Service {} not found", service_code)))?;

        let url = format!("{}{}", base_url, path);
        tracing::info!(
            target: "service_discovery",
            service_code,
            proxy_url = %url,
            http_method = %method,
            "[ServiceDiscovery] 发起代理请求"
        );

        let response = self
            .http_client
            .request(method.parse().unwrap_or(reqwest::Method::GET), &url)
            .send()
            .await
            .map_err(|e| {
                tracing::error!(
                    target: "service_discovery",
                    service_code,
                    proxy_url = %url,
                    http_method = %method,
                    error = %e,
                    "[ServiceDiscovery] 代理请求失败，请检查目标服务端口是否可达"
                );
                TopemsError::Internal(format!("Request failed: {}", e))
            })?;

        let body = response
            .text()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to read response: {}", e)))?;

        Ok(body)
    }
}

/// Consul 服务实例
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceInstance {
    pub id: String,
    pub name: String,
    pub address: String,
    pub port: u16,
    pub tags: Vec<String>,
}

/// Consul 服务注册器 - 服务启动时向 Consul 注册
pub struct ConsulServiceRegistrar {
    client: Client,
    consul_url: String,
    service_name: String,
    service_id: String,
    service_port: u16,
    health_check_url: String,
}

impl ConsulServiceRegistrar {
    pub fn new(consul_url: String, service_name: String, service_port: u16) -> Self {
        let service_id = format!("{}-{}", service_name, service_port);
        let health_check_url = format!("http://localhost:{}/health", service_port);
        Self {
            client: Client::new(),
            consul_url,
            service_name,
            service_id,
            service_port,
            health_check_url,
        }
    }

    /// 向 Consul 注册服务
    pub async fn register(&self) -> Result<()> {
        let registration = serde_json::json!({
            "ID": self.service_id,
            "Name": self.service_name,
            "Address": "127.0.0.1",
            "Port": self.service_port,
            "Check": {
                "HTTP": self.health_check_url,
                "Interval": "10s",
                "Timeout": "5s",
                "DeregisterCriticalServiceAfter": "30s"
            }
        });

        let url = format!("{}/v1/agent/service/register", self.consul_url);
        let response = self
            .client
            .put(&url)
            .json(&registration)
            .send()
            .await
            .map_err(|e| TopemsError::Internal(format!("Consul registration failed: {}", e)))?;

        if response.status().is_success() {
            tracing::info!(
                "[ServiceDiscovery] Registered {} with Consul at {}",
                self.service_name,
                self.consul_url
            );
        } else {
            tracing::warn!(
                "[ServiceDiscovery] Consul registration failed: {}",
                response.status()
            );
        }
        Ok(())
    }

    /// 从 Consul 注销服务
    pub async fn deregister(&self) -> Result<()> {
        let url = format!(
            "{}/v1/agent/service/deregister/{}",
            self.consul_url, self.service_id
        );
        self.client
            .put(&url)
            .send()
            .await
            .map_err(|e| TopemsError::Internal(format!("Consul deregistration failed: {}", e)))?;
        tracing::info!(
            "[ServiceDiscovery] Deregistered {} from Consul",
            self.service_name
        );
        Ok(())
    }
}

/// Consul 服务发现客户端 - 从 Consul 查询健康服务实例
pub struct ConsulDiscoveryClient {
    client: Client,
    consul_url: String,
}

impl ConsulDiscoveryClient {
    pub fn new(consul_url: String) -> Self {
        Self {
            client: Client::new(),
            consul_url,
        }
    }

    pub fn from_env() -> Option<Self> {
        let consul_url = std::env::var("CONSUL_URL").ok()?;
        Some(Self::new(consul_url))
    }

    /// 获取健康服务实例
    pub async fn get_healthy_instances(&self, service_name: &str) -> Result<Vec<ServiceInstance>> {
        let url = format!(
            "{}/v1/health/service/{}?passing=true",
            self.consul_url, service_name
        );
        let response = self
            .client
            .get(&url)
            .send()
            .await
            .map_err(|e| TopemsError::Internal(format!("Consul query failed: {}", e)))?;

        let instances: Vec<serde_json::Value> = response.json().await.map_err(|e| {
            TopemsError::Internal(format!("Failed to parse Consul response: {}", e))
        })?;

        let service_instances: Vec<ServiceInstance> = instances
            .iter()
            .filter_map(|item| {
                let service = item.get("Service")?;
                Some(ServiceInstance {
                    id: service.get("ID")?.as_str()?.to_string(),
                    name: service.get("Service")?.as_str()?.to_string(),
                    address: service.get("Address")?.as_str()?.to_string(),
                    port: service.get("Port")?.as_u64()? as u16,
                    tags: service
                        .get("Tags")
                        .and_then(|t| serde_json::from_value(t.clone()).ok())
                        .unwrap_or_default(),
                })
            })
            .collect();

        Ok(service_instances)
    }

    /// 获取单个服务地址（带简单负载均衡 - 随机选择）
    pub async fn get_service_url(&self, service_name: &str) -> Option<String> {
        let instances = self.get_healthy_instances(service_name).await.ok()?;
        if instances.is_empty() {
            return None;
        }
        // 简单随机负载均衡
        let idx = rand::random::<usize>() % instances.len();
        let instance = &instances[idx];
        Some(format!("http://{}:{}", instance.address, instance.port))
    }

    /// 获取服务地址（带重试的客户端负载均衡）
    pub async fn get_service_url_with_fallback(
        &self,
        service_name: &str,
        fallback_url: &str,
    ) -> String {
        match self.get_service_url(service_name).await {
            Some(url) => url,
            None => {
                tracing::warn!(
                    "[ServiceDiscovery] Service {} not found in Consul, using fallback: {}",
                    service_name,
                    fallback_url
                );
                fallback_url.to_string()
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rt<T: Serialize + serde::de::DeserializeOwned>(val: &T) -> T {
        let s = serde_json::to_string(val).unwrap();
        serde_json::from_str(&s).unwrap()
    }

    #[test]
    fn service_category_roundtrip_all_variants() {
        for (v, expected) in [
            (ServiceCategory::Core, "\"core\""),
            (ServiceCategory::Business, "\"business\""),
            (ServiceCategory::Support, "\"support\""),
            (ServiceCategory::Analytics, "\"analytics\""),
            (ServiceCategory::Integration, "\"integration\""),
        ] {
            let json = serde_json::to_string(&v).unwrap();
            assert_eq!(json, expected);
            let back: ServiceCategory = serde_json::from_str(&json).unwrap();
            assert_eq!(back, v);
        }
    }

    #[test]
    fn service_registry_status_roundtrip() {
        for (v, expected) in [
            (ServiceRegistryStatus::Active, "\"active\""),
            (ServiceRegistryStatus::Inactive, "\"inactive\""),
            (ServiceRegistryStatus::Maintenance, "\"maintenance\""),
        ] {
            let json = serde_json::to_string(&v).unwrap();
            assert_eq!(json, expected);
            let back: ServiceRegistryStatus = serde_json::from_str(&json).unwrap();
            assert_eq!(back, v);
        }
    }

    #[test]
    fn service_info_roundtrip() {
        let info = ServiceInfo {
            name: "HRM".into(),
            code: "hrm".into(),
            description: "Human Resource Management".into(),
            icon: Some("👤".into()),
            category: ServiceCategory::Business,
            status: ServiceRegistryStatus::Active,
            url: Some("https://hrm.topems.local".into()),
            api_prefix: Some("/api/hrm".into()),
            port: 8020,
            version: "1.0.0".into(),
            order: 1,
            tags: vec!["hr".into(), "employee".into()],
        };
        let back = rt(&info);
        assert_eq!(back.name, "HRM");
        assert_eq!(back.code, "hrm");
        assert_eq!(back.category, ServiceCategory::Business);
        assert_eq!(back.status, ServiceRegistryStatus::Active);
        assert_eq!(back.port, 8020);
        assert_eq!(back.tags.len(), 2);
    }

    #[test]
    fn service_info_minimal_optionals_none() {
        let info = ServiceInfo {
            name: "x".into(),
            code: "x".into(),
            description: "d".into(),
            icon: None,
            category: ServiceCategory::Core,
            status: ServiceRegistryStatus::Maintenance,
            url: None,
            api_prefix: None,
            port: 0,
            version: "0.0.1".into(),
            order: 0,
            tags: vec![],
        };
        let back = rt(&info);
        assert!(back.icon.is_none());
        assert!(back.url.is_none());
        assert!(back.api_prefix.is_none());
        assert!(back.tags.is_empty());
        assert_eq!(back.category, ServiceCategory::Core);
        assert_eq!(back.status, ServiceRegistryStatus::Maintenance);
    }

    #[test]
    fn service_endpoint_roundtrip() {
        let ep = ServiceEndpoint {
            path: "/api/hrm/employees".into(),
            method: "GET".into(),
            status: "ok".into(),
            response_time_ms: Some(42),
        };
        let back = rt(&ep);
        assert_eq!(back.path, "/api/hrm/employees");
        assert_eq!(back.method, "GET");
        assert_eq!(back.response_time_ms, Some(42));
    }

    #[test]
    fn service_health_status_roundtrip_with_endpoints() {
        let health = ServiceHealthStatus {
            code: "hrm".into(),
            name: "HRM Service".into(),
            status: "healthy".into(),
            response_time_ms: Some(15),
            last_check: "2026-08-15T14:00:00Z".into(),
            endpoints: vec![
                ServiceEndpoint {
                    path: "/health".into(),
                    method: "GET".into(),
                    status: "ok".into(),
                    response_time_ms: Some(5),
                },
                ServiceEndpoint {
                    path: "/api/hrm/employees".into(),
                    method: "GET".into(),
                    status: "ok".into(),
                    response_time_ms: Some(25),
                },
            ],
        };
        let back = rt(&health);
        assert_eq!(back.code, "hrm");
        assert_eq!(back.endpoints.len(), 2);
        assert_eq!(back.endpoints[0].path, "/health");
        assert_eq!(back.endpoints[1].response_time_ms, Some(25));
    }

    #[test]
    fn service_instance_roundtrip() {
        let inst = ServiceInstance {
            id: "inst-001".into(),
            name: "hrm-instance-1".into(),
            address: "10.0.0.1".into(),
            port: 8020,
            tags: vec!["primary".into(), "v1".into()],
        };
        let back = rt(&inst);
        assert_eq!(back.id, "inst-001");
        assert_eq!(back.address, "10.0.0.1");
        assert_eq!(back.port, 8020);
        assert_eq!(back.tags, vec!["primary", "v1"]);
    }

    #[test]
    fn nested_enum_serde_values_in_json() {
        let info = ServiceInfo {
            name: "X".into(),
            code: "x".into(),
            description: "d".into(),
            icon: None,
            category: ServiceCategory::Analytics,
            status: ServiceRegistryStatus::Inactive,
            url: None,
            api_prefix: None,
            port: 0,
            version: "1.0".into(),
            order: 0,
            tags: vec![],
        };
        let json = serde_json::to_string(&info).unwrap();
        assert!(json.contains("\"category\":\"analytics\""));
        assert!(json.contains("\"status\":\"inactive\""));
    }
}
