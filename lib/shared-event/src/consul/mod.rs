//! Consul 服务发现客户端
//!
//! 提供服务注册、注销、发现功能，支持心跳健康检查。
//! 通过环境变量 CONSUL_HOST（默认 http://localhost:8500）配置 Consul 地址。
//! 通过环境变量 CONSUL_ENABLED 控制是否启用（默认 false，graceful fallback）。

use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::env;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;
use tracing::{info, warn};

use uuid::Uuid;

/// Consul 配置
#[derive(Debug, Clone)]
pub struct ConsulConfig {
    /// Consul HTTP 地址，如 http://localhost:8500
    pub host: String,
    /// 数据中心名称
    pub datacenter: String,
    /// 访问令牌（可选，用于 ACL）
    pub token: Option<String>,
    /// 健康检查间隔（秒）
    pub check_interval_seconds: u64,
    /// 健康检查超时（秒）
    pub check_timeout_seconds: u64,
    /// 注销超时（秒）：服务 critical 多久后自动注销
    pub deregister_critical_after_seconds: u64,
}

impl Default for ConsulConfig {
    fn default() -> Self {
        Self::from_env()
    }
}

impl ConsulConfig {
    /// 从环境变量读取配置
    pub fn from_env() -> Self {
        Self {
            host: env::var("CONSUL_HOST").unwrap_or_else(|_| "http://localhost:8500".to_string()),
            datacenter: env::var("CONSUL_DATACENTER").unwrap_or_else(|_| "dc1".to_string()),
            token: env::var("CONSUL_HTTP_TOKEN").ok(),
            check_interval_seconds: env::var("CONSUL_CHECK_INTERVAL")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(10),
            check_timeout_seconds: env::var("CONSUL_CHECK_TIMEOUT")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(5),
            deregister_critical_after_seconds: env::var("CONSUL_DEREGISTER_CRITICAL_AFTER")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(30),
        }
    }

    /// 检查 Consul 是否启用（CONSUL_ENABLED=true 或 1）
    pub fn is_enabled() -> bool {
        env::var("CONSUL_ENABLED")
            .map(|v| v.eq_ignore_ascii_case("true") || v == "1")
            .unwrap_or(false)
    }
}

/// 服务注册请求体
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceRegistration {
    /// 服务 ID（唯一标识）
    pub id: String,
    /// 服务名称
    pub name: String,
    /// 标签
    #[serde(skip_serializing_if = "Vec::is_empty", default)]
    pub tags: Vec<String>,
    /// 服务地址
    #[serde(skip_serializing_if = "Option::is_none")]
    pub address: Option<String>,
    /// 服务端口
    pub port: u16,
    /// 健康检查配置
    #[serde(skip_serializing_if = "Option::is_none")]
    pub check: Option<HealthCheck>,
    /// 元数据
    #[serde(skip_serializing_if = "HashMap::is_empty", default)]
    pub meta: HashMap<String, String>,
}

impl ServiceRegistration {
    pub fn new(id: impl Into<String>, name: impl Into<String>, port: u16) -> Self {
        Self {
            id: id.into(),
            name: name.into(),
            tags: Vec::new(),
            address: None,
            port,
            check: None,
            meta: HashMap::new(),
        }
    }

    pub fn with_tag(mut self, tag: impl Into<String>) -> Self {
        self.tags.push(tag.into());
        self
    }

    pub fn with_address(mut self, address: impl Into<String>) -> Self {
        self.address = Some(address.into());
        self
    }

    pub fn with_health_check(mut self, http_path: impl Into<String>) -> Self {
        self.check = Some(HealthCheck::http(http_path));
        self
    }

    pub fn with_meta(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {
        self.meta.insert(key.into(), value.into());
        self
    }
}

/// 健康检查配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthCheck {
    /// HTTP 检查路径
    pub http: String,
    /// 检查间隔
    pub interval: String,
    /// 超时
    pub timeout: String,
    /// critical 多久后注销
    #[serde(rename = "DeregisterCriticalServiceAfter")]
    pub deregister_critical_service_after: String,
}

impl HealthCheck {
    pub fn http(path: impl Into<String>) -> Self {
        Self {
            http: path.into(),
            interval: "10s".to_string(),
            timeout: "5s".to_string(),
            deregister_critical_service_after: "30s".to_string(),
        }
    }

    pub fn with_interval(mut self, seconds: u64) -> Self {
        self.interval = format!("{}s", seconds);
        self
    }

    pub fn with_timeout(mut self, seconds: u64) -> Self {
        self.timeout = format!("{}s", seconds);
        self
    }

    pub fn with_deregister_after(mut self, seconds: u64) -> Self {
        self.deregister_critical_service_after = format!("{}s", seconds);
        self
    }
}

/// 服务实例（从 Consul 查询返回）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceInstance {
    pub id: String,
    pub name: String,
    pub address: String,
    pub port: u16,
    pub tags: Vec<String>,
    pub meta: HashMap<String, String>,
    /// 健康状态：passing/warning/critical
    pub status: String,
}

/// Consul 客户端
#[derive(Clone)]
pub struct ConsulClient {
    client: Client,
    config: ConsulConfig,
    /// 已注册的服务 ID（用于优雅注销）
    registered_services: Arc<RwLock<Vec<String>>>,
}

impl ConsulClient {
    /// 创建新的 Consul 客户端
    pub fn new(config: ConsulConfig) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(10))
            .build()
            .expect("Failed to build HTTP client for Consul");

        Self {
            client,
            config,
            registered_services: Arc::new(RwLock::new(Vec::new())),
        }
    }

    /// 从环境变量创建
    pub fn from_env() -> Self {
        Self::new(ConsulConfig::from_env())
    }

    /// 构建请求 URL
    fn url(&self, path: &str) -> String {
        format!("{}{}", self.config.host, path)
    }

    /// 添加 token header
    fn add_token(&self, req: reqwest::RequestBuilder) -> reqwest::RequestBuilder {
        if let Some(ref token) = self.config.token {
            req.header("X-Consul-Token", token)
        } else {
            req
        }
    }

    /// 注册服务到 Consul
    pub async fn register_service(
        &self,
        registration: ServiceRegistration,
    ) -> Result<(), ConsulError> {
        let url = self.url("/v1/agent/service/register");
        let service_id = registration.id.clone();

        let resp = self
            .add_token(self.client.put(&url).json(&registration))
            .send()
            .await
            .map_err(|e| ConsulError::Request(e.to_string()))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(ConsulError::RegistrationFailed(format!(
                "Consul 注册失败 ({}): {}",
                status, body
            )));
        }

        self.registered_services
            .write()
            .await
            .push(service_id.clone());

        info!(
            "✅ 服务已注册到 Consul: id={}, name={}",
            registration.id, registration.name
        );

        Ok(())
    }

    /// 注销服务
    pub async fn deregister_service(&self, service_id: &str) -> Result<(), ConsulError> {
        let url = self.url(&format!("/v1/agent/service/deregister/{}", service_id));

        let resp = self
            .add_token(self.client.put(&url))
            .send()
            .await
            .map_err(|e| ConsulError::Request(e.to_string()))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(ConsulError::DeregistrationFailed(format!(
                "Consul 注销失败 ({}): {}",
                status, body
            )));
        }

        self.registered_services
            .write()
            .await
            .retain(|id| id != service_id);

        info!("✅ 服务已从 Consul 注销: id={}", service_id);

        Ok(())
    }

    /// 注销所有已注册的服务（优雅关闭时调用）
    pub async fn deregister_all(&self) {
        let services: Vec<String> = self.registered_services.read().await.clone();

        for service_id in services {
            if let Err(e) = self.deregister_service(&service_id).await {
                warn!("注销服务 {} 失败: {}", service_id, e);
            }
        }
    }

    /// 按 服务名 查询健康的实例
    pub async fn discover_service(
        &self,
        service_name: &str,
    ) -> Result<Vec<ServiceInstance>, ConsulError> {
        let url = self.url(&format!(
            "/v1/health/service/{}?passing=true&dc={}",
            service_name, self.config.datacenter
        ));

        let resp = self
            .add_token(self.client.get(&url))
            .send()
            .await
            .map_err(|e| ConsulError::Request(e.to_string()))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(ConsulError::DiscoveryFailed(format!(
                "Consul 查询失败 ({}): {}",
                status, body
            )));
        }

        let raw: Vec<ConsulHealthEntry> = resp
            .json()
            .await
            .map_err(|e| ConsulError::Parse(e.to_string()))?;

        let instances = raw
            .into_iter()
            .filter_map(|entry| {
                let service = entry.service?;
                let status = entry
                    .checks
                    .iter()
                    .map(|c| c.status.clone())
                    .next()
                    .unwrap_or_else(|| "unknown".to_string());

                Some(ServiceInstance {
                    id: service.id,
                    name: service.service,
                    address: service.address.unwrap_or_default(),
                    port: service.port,
                    tags: service.tags.unwrap_or_default(),
                    meta: service.meta.unwrap_or_default(),
                    status,
                })
            })
            .collect();

        Ok(instances)
    }

    /// 列出所有已注册的服务
    pub async fn list_services(&self) -> Result<HashMap<String, Vec<String>>, ConsulError> {
        let url = self.url(&format!(
            "/v1/catalog/services?dc={}",
            self.config.datacenter
        ));

        let resp = self
            .add_token(self.client.get(&url))
            .send()
            .await
            .map_err(|e| ConsulError::Request(e.to_string()))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(ConsulError::DiscoveryFailed(format!(
                "Consul 列表查询失败 ({}): {}",
                status, body
            )));
        }

        let services: HashMap<String, Vec<String>> = resp
            .json()
            .await
            .map_err(|e| ConsulError::Parse(e.to_string()))?;

        Ok(services)
    }

    /// 检查 Consul 是否可达
    pub async fn ping(&self) -> Result<bool, ConsulError> {
        let url = self.url("/v1/status/leader");

        let resp = self
            .client
            .get(&url)
            .send()
            .await
            .map_err(|e| ConsulError::Request(e.to_string()))?;

        Ok(resp.status().is_success())
    }

    /// 获取已注册服务 ID 列表
    pub async fn registered_service_ids(&self) -> Vec<String> {
        self.registered_services.read().await.clone()
    }
}

/// Consul 健康检查返回的条目
#[derive(Debug, Deserialize)]
struct ConsulHealthEntry {
    #[serde(rename = "Service")]
    service: Option<ConsulService>,
    #[serde(rename = "Checks", default)]
    checks: Vec<ConsulCheck>,
}

#[derive(Debug, Deserialize)]
struct ConsulService {
    #[serde(rename = "ID")]
    id: String,
    #[serde(rename = "Service")]
    service: String,
    #[serde(rename = "Address")]
    address: Option<String>,
    #[serde(rename = "Port")]
    port: u16,
    #[serde(rename = "Tags", default)]
    tags: Option<Vec<String>>,
    #[serde(rename = "Meta", default)]
    meta: Option<HashMap<String, String>>,
}

#[derive(Debug, Deserialize)]
struct ConsulCheck {
    #[serde(rename = "Status")]
    status: String,
}

/// Consul 错误类型
#[derive(Debug, thiserror::Error)]
pub enum ConsulError {
    #[error("Consul 请求失败: {0}")]
    Request(String),

    #[error("Consul 注册失败: {0}")]
    RegistrationFailed(String),

    #[error("Consul 注销失败: {0}")]
    DeregistrationFailed(String),

    #[error("Consul 服务发现失败: {0}")]
    DiscoveryFailed(String),

    #[error("Consul 响应解析失败: {0}")]
    Parse(String),
}

/// 服务注册守护句柄
///
/// 持有 ConsulClient 引用，Drop 时自动注销服务。
/// 在服务 main 函数中持有此句柄，服务退出时会自动注销。
pub struct ConsulRegistrationGuard {
    client: ConsulClient,
    service_id: String,
    deregistered: bool,
}

impl ConsulRegistrationGuard {
    /// 注册服务并返回守护句柄
    pub async fn register(
        client: ConsulClient,
        registration: ServiceRegistration,
    ) -> Result<Self, ConsulError> {
        let service_id = registration.id.clone();
        client.register_service(registration).await?;

        Ok(Self {
            client,
            service_id,
            deregistered: false,
        })
    }

    /// 主动注销服务
    pub async fn deregister(&mut self) -> Result<(), ConsulError> {
        if !self.deregistered {
            self.client.deregister_service(&self.service_id).await?;
            self.deregistered = true;
        }
        Ok(())
    }
}

/// 便捷函数：尝试注册服务到 Consul
///
/// 如果 Consul 未启用（CONSUL_ENABLED!=true），返回 None 并打印 info 日志。
/// 如果 Consul 启用但注册失败，返回 None 并打印 warn 日志（graceful fallback）。
///
/// # 参数
/// - service_name: 服务名称（如 "topems-erp"）
/// - service_port: 服务端口
/// - health_check_path: 健康检查路径（如 "http://localhost:8080/health"）
///
/// # 示例
/// ```no_run
/// // 在 main.rs 中
/// let _consul_guard = topems_shared::consul::try_register_service(
///     "topems-erp", 8080, "http://localhost:8080/health"
/// ).await;
/// // _consul_guard 在 main 函数退出时自动注销服务
/// ```
pub async fn try_register_service(
    service_name: &str,
    service_port: u16,
    health_check_path: &str,
) -> Option<ConsulRegistrationGuard> {
    if !ConsulConfig::is_enabled() {
        info!("Consul 未启用（CONSUL_ENABLED!=true），跳过服务注册");
        return None;
    }

    let client = ConsulClient::from_env();

    // 先 ping Consul，确认可达
    match client.ping().await {
        Ok(true) => {}
        Ok(false) => {
            warn!("Consul 不可达，跳过服务注册");
            return None;
        }
        Err(e) => {
            warn!("Consul ping 失败: {}，跳过服务注册", e);
            return None;
        }
    }

    let service_id = format!("{}-{}", service_name, Uuid::new_v4());
    let registration = ServiceRegistration::new(service_id.clone(), service_name, service_port)
        .with_address("127.0.0.1")
        .with_health_check(health_check_path)
        .with_tag("topems")
        .with_meta("version", env!("CARGO_PKG_VERSION"));

    match ConsulRegistrationGuard::register(client, registration).await {
        Ok(guard) => {
            info!(
                "✅ 服务 {} 已注册到 Consul (id={})",
                service_name, service_id
            );
            Some(guard)
        }
        Err(e) => {
            warn!("Consul 注册失败: {}，服务将在无 Consul 模式下运行", e);
            None
        }
    }
}

impl Drop for ConsulRegistrationGuard {
    fn drop(&mut self) {
        if !self.deregistered {
            let client = self.client.clone();
            let service_id = self.service_id.clone();
            // 在 Drop 中无法使用 async，用 tokio::spawn 异步注销
            tokio::spawn(async move {
                if let Err(e) = client.deregister_service(&service_id).await {
                    warn!("Drop 时注销服务 {} 失败: {}", service_id, e);
                }
            });
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_service_registration_builder() {
        let reg = ServiceRegistration::new("my-service-1", "my-service", 8080)
            .with_tag("api")
            .with_tag("v1")
            .with_address("127.0.0.1")
            .with_health_check("http://localhost:8080/health")
            .with_meta("version", "1.0.0");

        assert_eq!(reg.id, "my-service-1");
        assert_eq!(reg.name, "my-service");
        assert_eq!(reg.port, 8080);
        assert_eq!(reg.tags, vec!["api", "v1"]);
        assert_eq!(reg.address, Some("127.0.0.1".to_string()));
        assert!(reg.check.is_some());
        assert_eq!(reg.meta.get("version"), Some(&"1.0.0".to_string()));
    }

    #[test]
    fn test_config_from_env_default() {
        // 测试默认值
        env::remove_var("CONSUL_HOST");
        let config = ConsulConfig::from_env();
        assert_eq!(config.host, "http://localhost:8500");
        assert_eq!(config.datacenter, "dc1");
        assert_eq!(config.check_interval_seconds, 10);
    }

    #[test]
    fn test_is_enabled_default_false() {
        env::remove_var("CONSUL_ENABLED");
        assert!(!ConsulConfig::is_enabled());
    }

    #[test]
    fn test_health_check_builder() {
        let check = HealthCheck::http("http://localhost:8080/health")
            .with_interval(15)
            .with_timeout(3)
            .with_deregister_after(60);

        assert_eq!(check.http, "http://localhost:8080/health");
        assert_eq!(check.interval, "15s");
        assert_eq!(check.timeout, "3s");
        assert_eq!(check.deregister_critical_service_after, "60s");
    }
}
