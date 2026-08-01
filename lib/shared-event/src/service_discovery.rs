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
                port: 8001,
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
                port: 8015,
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
                port: 8002,
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

        for service in default_services {
            self.registry.register(service).await;
        }
    }

    pub async fn get_service_url(&self, code: &str) -> Option<String> {
        let service = self.registry.get(code).await?;
        Some(format!("http://localhost:{}", service.port))
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

        let response = self
            .http_client
            .request(method.parse().unwrap_or(reqwest::Method::GET), &url)
            .send()
            .await
            .map_err(|e| TopemsError::Internal(format!("Request failed: {}", e)))?;

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

/// 智能服务客户端 - 优先使用 Consul 服务发现，回退到环境变量
pub struct SmartServiceClient {
    consul_client: Option<ConsulDiscoveryClient>,
    http_client: Client,
    /// 回退地址缓存 (service_name -> fallback_url)
    fallback_urls: HashMap<String, String>,
}

impl SmartServiceClient {
    pub fn from_env() -> Self {
        let consul_client = ConsulDiscoveryClient::from_env();
        let mut fallback_urls = HashMap::new();

        // 从环境变量加载回退地址
        if let Ok(core_url) = std::env::var("CORE_URL") {
            fallback_urls.insert("unified-core".to_string(), core_url);
        }
        if let Ok(erp_url) = std::env::var("ERP_URL") {
            fallback_urls.insert("erp".to_string(), erp_url);
        }
        if let Ok(hrm_url) = std::env::var("HRM_URL") {
            fallback_urls.insert("hrm".to_string(), hrm_url);
        }
        // 可继续添加其他服务...

        Self {
            consul_client,
            http_client: Client::new(),
            fallback_urls,
        }
    }

    /// 获取服务 URL - 优先 Consul，回退环境变量
    pub async fn resolve_service_url(&self, service_name: &str) -> Option<String> {
        // 1. 尝试 Consul
        if let Some(consul) = &self.consul_client {
            if let Some(url) = consul.get_service_url(service_name).await {
                return Some(url);
            }
        }

        // 2. 回退到环境变量
        self.fallback_urls.get(service_name).cloned()
    }

    /// 发起服务调用（自动服务发现 + 回退）
    pub async fn call_service(
        &self,
        service_name: &str,
        method: reqwest::Method,
        path: &str,
        body: Option<serde_json::Value>,
    ) -> Result<reqwest::Response> {
        let base_url = self
            .resolve_service_url(service_name)
            .await
            .ok_or_else(|| {
                TopemsError::Internal(format!("Service {} not available", service_name))
            })?;

        let url = format!("{}{}", base_url.trim_end_matches('/'), path);
        tracing::debug!("[SmartServiceClient] Calling {} -> {}", service_name, url);

        let mut req = self.http_client.request(method, &url);
        if let Some(b) = body {
            req = req.json(&b);
        }
        let response = req.send().await.map_err(|e| {
            TopemsError::Internal(format!("Service call to {} failed: {}", service_name, e))
        })?;

        Ok(response)
    }
}
