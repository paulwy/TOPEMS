use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::{config::ServiceConfig, Result, TopemsError};

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
            .get(format!("{}/api/v1/services", self.registry_url))
            .send()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to fetch services: {}", e)))?;

        let api_response: crate::response::ApiResponse<Vec<ServiceInfo>> = response
            .json()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to parse response: {}", e)))?;

        api_response.data.ok_or_else(|| TopemsError::Internal(api_response.message))
    }

    /// 按分类获取服务
    pub async fn list_services_by_category(&self, category: ServiceCategory) -> Result<Vec<ServiceInfo>> {
        let response = self
            .client
            .get(format!("{}/api/v1/services?category={}", self.registry_url, serde_json::to_string(&category).unwrap_or_default()))
            .send()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to fetch services: {}", e)))?;

        let api_response: crate::response::ApiResponse<Vec<ServiceInfo>> = response
            .json()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to parse response: {}", e)))?;

        api_response.data.ok_or_else(|| TopemsError::Internal(api_response.message))
    }

    /// 获取单个服务信息
    pub async fn get_service(&self, code: &str) -> Result<ServiceInfo> {
        let response = self
            .client
            .get(format!("{}/api/v1/services/{}", self.registry_url, code))
            .send()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to fetch service: {}", e)))?;

        let api_response: crate::response::ApiResponse<ServiceInfo> = response
            .json()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to parse response: {}", e)))?;

        api_response.data.ok_or_else(|| TopemsError::Internal(api_response.message))
    }

    /// 获取服务健康状态
    pub async fn get_service_health(&self, code: &str) -> Result<ServiceHealthStatus> {
        let response = self
            .client
            .get(format!("{}/api/v1/services/{}/health", self.registry_url, code))
            .send()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to fetch health: {}", e)))?;

        let api_response: crate::response::ApiResponse<ServiceHealthStatus> = response
            .json()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to parse response: {}", e)))?;

        api_response.data.ok_or_else(|| TopemsError::Internal(api_response.message))
    }

    /// 批量获取服务健康状态
    pub async fn batch_get_health(&self, codes: &[String]) -> Result<HashMap<String, ServiceHealthStatus>> {
        let codes_param = codes.join(",");
        let response = self
            .client
            .get(format!("{}/api/v1/services/health/batch?codes={}", self.registry_url, codes_param))
            .send()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to fetch health: {}", e)))?;

        let api_response: crate::response::ApiResponse<HashMap<String, ServiceHealthStatus>> = response
            .json()
            .await
            .map_err(|e| TopemsError::Internal(format!("Failed to parse response: {}", e)))?;

        api_response.data.ok_or_else(|| TopemsError::Internal(api_response.message))
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
                api_prefix: Some("/api/v1/iam".to_string()),
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
                api_prefix: Some("/api/v1/hrm".to_string()),
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
                api_prefix: Some("/api/v1/doc".to_string()),
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
                api_prefix: Some("/api/v1/crm".to_string()),
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
                api_prefix: Some("/api/v1/pm".to_string()),
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
        let base_url = self.get_service_url(service_code).await
            .ok_or_else(|| TopemsError::Internal(format!("Service {} not found", service_code)))?;

        let url = format!("{}{}", base_url, path);

        let response = self.http_client
            .request(method.parse().unwrap_or(reqwest::Method::GET), &url)
            .send()
            .await
            .map_err(|e| TopemsError::Internal(format!("Request failed: {}", e)))?;

        let body = response.text().await
            .map_err(|e| TopemsError::Internal(format!("Failed to read response: {}", e)))?;

        Ok(body)
    }
}
