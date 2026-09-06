//! etcd 服务发现客户端
//!
//! 提供服务注册、注销、发现功能，支持租约（lease）自动续期（keep-alive）。
//! 通过环境变量 ETCD_ENDPOINTS（默认 http://localhost:2379）配置 etcd 地址。
//! 通过环境变量 ETCD_ENABLED 控制是否启用（默认 false，graceful fallback）。

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::env;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;
use tracing::{info, warn};

use uuid::Uuid;

/// etcd 配置
#[derive(Debug, Clone)]
pub struct EtcdConfig {
    /// etcd 端点列表（逗号分隔），如 http://localhost:2379
    pub endpoints: Vec<String>,
    /// 服务注册 key 前缀（默认 /topems/services）
    pub prefix: String,
    /// 租约 TTL（秒），默认 30
    pub lease_ttl_secs: i64,
    /// 用户名（可选，认证模式）
    pub username: Option<String>,
    /// 密码（可选，认证模式）
    pub password: Option<String>,
    /// keep-alive 重连间隔（秒）
    pub reconnect_interval_secs: u64,
}

impl Default for EtcdConfig {
    fn default() -> Self {
        Self::from_env()
    }
}

impl EtcdConfig {
    /// 从环境变量读取配置
    pub fn from_env() -> Self {
        let endpoints = env::var("ETCD_ENDPOINTS")
            .unwrap_or_else(|_| "http://localhost:2379".to_string())
            .split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();
        Self {
            endpoints,
            prefix: env::var("ETCD_PREFIX").unwrap_or_else(|_| "/topems/services".to_string()),
            lease_ttl_secs: env::var("ETCD_TTL_SECS")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(30),
            username: env::var("ETCD_USERNAME").ok().filter(|v| !v.is_empty()),
            password: env::var("ETCD_PASSWORD").ok().filter(|v| !v.is_empty()),
            reconnect_interval_secs: env::var("ETCD_RECONNECT_INTERVAL")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(5),
        }
    }

    /// 检查 etcd 是否启用（ETCD_ENABLED=true 或 1）
    pub fn is_enabled() -> bool {
        env::var("ETCD_ENABLED")
            .map(|v| v.eq_ignore_ascii_case("true") || v == "1")
            .unwrap_or(false)
    }
}

/// 服务注册请求体
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceRegistration {
    /// 服务实例 ID（唯一标识）
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

    pub fn with_meta(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {
        self.meta.insert(key.into(), value.into());
        self
    }
}

/// 服务实例（从 etcd 查询返回）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceInstance {
    pub id: String,
    pub name: String,
    pub address: String,
    pub port: u16,
    pub tags: Vec<String>,
    pub meta: HashMap<String, String>,
    /// 租约 ID（etcd lease）
    pub lease_id: i64,
}

impl ServiceInstance {
    /// 便捷获取完整端点地址（address:port）
    pub fn endpoint(&self) -> String {
        format!("{}:{}", self.address, self.port)
    }
}

/// etcd 客户端
#[derive(Clone)]
pub struct EtcdClient {
    config: EtcdConfig,
    /// 底层 etcd client（KvClient/LeaseClient 均由它派发）
    inner: Arc<etcd_client::Client>,
    /// 已注册的服务 ID（用于优雅注销）
    registered_services: Arc<RwLock<Vec<String>>>,
}

impl EtcdClient {
    /// 创建新的 etcd 客户端（连接到 etcd 集群）
    pub async fn new(config: EtcdConfig) -> Result<Self, EtcdError> {
        let endpoints: Vec<String> = if config.endpoints.is_empty() {
            vec!["http://localhost:2379".to_string()]
        } else {
            config.endpoints.clone()
        };

        let mut options = etcd_client::ConnectOptions::new()
            .with_connect_timeout(Duration::from_secs(5))
            .with_timeout(Duration::from_secs(10));
        if let (Some(username), Some(password)) = (config.username.as_ref(), config.password.as_ref()) {
            options = options.with_user(username.clone(), password.clone());
        }

        let client = etcd_client::Client::connect(endpoints, Some(options))
            .await
            .map_err(|e| EtcdError::Connect(e.to_string()))?;

        Ok(Self {
            config,
            inner: Arc::new(client),
            registered_services: Arc::new(RwLock::new(Vec::new())),
        })
    }

    /// 从环境变量创建
    pub async fn from_env() -> Result<Self, EtcdError> {
        Self::new(EtcdConfig::from_env()).await
    }

    /// 服务 key 前缀（含尾部斜杠）
    pub fn prefix(&self) -> String {
        normalized_prefix(&self.config.prefix)
    }

    /// 单个实例 key：{prefix}/{name}/{id}
    fn instance_key(&self, name: &str, id: &str) -> String {
        format!("{}{}/{}", self.prefix(), name, id)
    }

    /// 注册服务到 etcd（附带租约，自动续期）
    ///
    /// 返回注册守护句柄；句柄 Drop 时自动注销。
    pub async fn register_service(
        &self,
        registration: ServiceRegistration,
    ) -> Result<EtcdRegistrationGuard, EtcdError> {
        let key = self.instance_key(&registration.name, &registration.id);

        // 1. 申请租约
        let lease_id = self
            .grant_lease(self.config.lease_ttl_secs)
            .await?;

        // 2. 写入服务信息（绑定租约）
        let value = serde_json::to_string(&registration)
            .map_err(|e| EtcdError::Serialize(e.to_string()))?;
        self.put_with_lease(key.as_str(), value, lease_id).await?;

        self.registered_services
            .write()
            .await
            .push(registration.id.clone());

        info!(
            "✅ 服务已注册到 etcd: id={}, name={}, lease={}",
            registration.id, registration.name, lease_id
        );

        Ok(EtcdRegistrationGuard {
            client: self.clone(),
            service_name: registration.name,
            service_id: registration.id,
            lease_id,
            deregistered: false,
        })
    }

    /// 申请租约
    pub async fn grant_lease(&self, ttl_secs: i64) -> Result<i64, EtcdError> {
        let mut lease = self.inner.lease_client();
        let resp = lease
            .grant(ttl_secs, None)
            .await
            .map_err(|e| EtcdError::Lease(e.to_string()))?;
        Ok(resp.id())
    }

    /// 撤销租约（同时删除其下所有 key）
    pub async fn revoke_lease(&self, lease_id: i64) -> Result<(), EtcdError> {
        let mut lease = self.inner.lease_client();
        lease
            .revoke(lease_id)
            .await
            .map_err(|e| EtcdError::Lease(e.to_string()))?;
        Ok(())
    }

    /// 带租约写入 key
    pub async fn put_with_lease(
        &self,
        key: impl Into<Vec<u8>>,
        value: impl Into<Vec<u8>>,
        lease_id: i64,
    ) -> Result<(), EtcdError> {
        let mut kv = self.inner.kv_client();
        kv.put(
            key,
            value,
            Some(etcd_client::PutOptions::default().with_lease(lease_id)),
        )
        .await
        .map_err(|e| EtcdError::Kv(e.to_string()))?;
        Ok(())
    }

    /// 租约自动续期循环（keep-alive）
    ///
    /// 按 `ttl_secs/3` 间隔向 etcd 发送 keep-alive 请求，保持租约不过期。
    /// 连接中断时按 reconnect_interval 重试。由 `stop` 通知退出。
    pub async fn keep_alive_loop(
        &self,
        lease_id: i64,
        ttl_secs: i64,
        stop: tokio_util::sync::CancellationToken,
    ) {
        let interval = Duration::from_secs((ttl_secs.max(1) as u64 / 3).max(1));
        let reconnect = Duration::from_secs(self.config.reconnect_interval_secs.max(1));
        loop {
            let mut lease = self.inner.lease_client();
            match lease.keep_alive(lease_id).await {
                Ok((mut keeper, _stream)) => {
                    // 持有 _stream（不 drop，保持双向流通道存活）；
                    // 每 interval 发送一次 keep-alive 请求。
                    loop {
                        tokio::select! {
                            _ = stop.cancelled() => return,
                            _ = tokio::time::sleep(interval) => {
                                if let Err(e) = keeper.keep_alive().await {
                                    warn!("etcd keep-alive 发送失败: {}，准备重连", e);
                                    break;
                                }
                            }
                        }
                    }
                }
                Err(e) => {
                    warn!("etcd keep-alive 建立失败: {}，{} 秒后重试", e, reconnect.as_secs());
                }
            }
            tokio::select! {
                _ = stop.cancelled() => return,
                _ = tokio::time::sleep(reconnect) => {}
            }
        }
    }

    /// 注销服务（撤销租约 + 删除 key）
    pub async fn deregister_service(&self, service_name: &str, lease_id: i64) -> Result<(), EtcdError> {
        // 撤销租约会自动删除绑定的 key
        self.revoke_lease(lease_id).await?;
        self.registered_services
            .write()
            .await
            .retain(|id| id != service_name);

        info!("✅ 服务已从 etcd 注销: name={}, lease={}", service_name, lease_id);
        Ok(())
    }

    /// 注销所有已注册的服务（优雅关闭时调用）
    pub async fn deregister_all(&self) {
        let services: Vec<String> = self.registered_services.read().await.clone();
        for id in services {
            // 由 guard 持有的 lease 已注销；这里仅清理内存记录
            self.registered_services.write().await.retain(|x| x != &id);
        }
    }

    /// 按服务名查询所有实例
    pub async fn discover_service(&self, name: &str) -> Result<Vec<ServiceInstance>, EtcdError> {
        let prefix = self.instance_key(name, "");
        let mut kv = self.inner.kv_client();
        let resp = kv
            .get(prefix, Some(etcd_client::GetOptions::default().with_prefix()))
            .await
            .map_err(|e| EtcdError::Kv(e.to_string()))?;

        let mut instances = Vec::new();
        for kv in resp.kvs() {
            let value = kv.value();
            let reg: ServiceRegistration = match serde_json::from_slice(value) {
                Ok(r) => r,
                Err(e) => {
                    warn!("etcd 服务值解析失败: {}（key 将被忽略）", e);
                    continue;
                }
            };
            instances.push(ServiceInstance {
                id: reg.id,
                name: reg.name,
                address: reg.address.unwrap_or_default(),
                port: reg.port,
                tags: reg.tags,
                meta: reg.meta,
                lease_id: kv.lease(),
            });
        }
        Ok(instances)
    }

    /// 列出所有已注册的服务名 → 实例 ID 列表
    pub async fn list_services(&self) -> Result<HashMap<String, Vec<String>>, EtcdError> {
        let mut kv = self.inner.kv_client();
        let resp = kv
            .get(
                self.prefix(),
                Some(etcd_client::GetOptions::default().with_prefix()),
            )
            .await
            .map_err(|e| EtcdError::Kv(e.to_string()))?;

        let mut services: HashMap<String, Vec<String>> = HashMap::new();
        for kv in resp.kvs() {
            let key = String::from_utf8_lossy(kv.key()).to_string();
            // key 形如 {prefix}/{name}/{id}
            let rest = key.trim_start_matches(&self.prefix());
            let mut parts = rest.split('/');
            if let Some(name) = parts.next() {
                if let Some(id) = parts.next() {
                    services.entry(name.to_string()).or_default().push(id.to_string());
                }
            }
        }
        Ok(services)
    }

    /// 获取底层 KV 客户端（高级操作）
    pub fn kv_client(&self) -> etcd_client::KvClient {
        self.inner.kv_client()
    }

    /// 获取底层租约客户端（高级操作）
    pub fn lease_client(&self) -> etcd_client::LeaseClient {
        self.inner.lease_client()
    }

    /// 检查 etcd 是否可达
    pub async fn ping(&self) -> Result<bool, EtcdError> {
        let mut kv = self.inner.kv_client();
        kv.get("__topems_ping__", None)
            .await
            .map(|_| true)
            .map_err(|e| EtcdError::Kv(e.to_string()))
    }

    /// 获取已注册服务 ID 列表（内存记录）
    pub async fn registered_service_ids(&self) -> Vec<String> {
        self.registered_services.read().await.clone()
    }
}

/// 规范化 key 前缀（保证以斜杠结尾）
fn normalized_prefix(prefix: &str) -> String {
    let p = prefix.trim_end_matches('/').to_string();
    format!("{}/", p)
}

/// etcd 错误类型
#[derive(Debug, thiserror::Error)]
pub enum EtcdError {
    #[error("etcd 连接失败: {0}")]
    Connect(String),

    #[error("etcd KV 操作失败: {0}")]
    Kv(String),

    #[error("etcd 租约操作失败: {0}")]
    Lease(String),

    #[error("etcd 序列化失败: {0}")]
    Serialize(String),
}

/// 服务注册守护句柄
///
/// 持有 EtcdClient 引用与租约 ID，Drop 时自动注销服务并撤销租约。
pub struct EtcdRegistrationGuard {
    client: EtcdClient,
    service_name: String,
    service_id: String,
    lease_id: i64,
    deregistered: bool,
}

impl EtcdRegistrationGuard {
    /// 获取租约 ID（供 keep-alive 任务使用）
    pub fn lease_id(&self) -> i64 {
        self.lease_id
    }

    /// 启动租约自动续期任务（tokio 后台）
    ///
    /// 返回 CancellationToken；调用 `cancel()` 即可停止续期。
    pub fn spawn_keep_alive(&self) -> tokio_util::sync::CancellationToken {
        let client = self.client.clone();
        let lease_id = self.lease_id;
        let ttl_secs = self.client.config.lease_ttl_secs;
        let stop = tokio_util::sync::CancellationToken::new();
        let task_stop = stop.clone();
        tokio::spawn(async move {
            client.keep_alive_loop(lease_id, ttl_secs, task_stop).await;
        });
        stop
    }

    /// 主动注销服务
    pub async fn deregister(&mut self) -> Result<(), EtcdError> {
        if !self.deregistered {
            self.client
                .deregister_service(&self.service_name, self.lease_id)
                .await?;
            self.deregistered = true;
        }
        Ok(())
    }
}

impl Drop for EtcdRegistrationGuard {
    fn drop(&mut self) {
        if !self.deregistered {
            let client = self.client.clone();
            let service_name = self.service_name.clone();
            let lease_id = self.lease_id;
            // Drop 中无法 async，用 tokio::spawn 异步注销
            tokio::spawn(async move {
                if let Err(e) = client.deregister_service(&service_name, lease_id).await {
                    warn!("Drop 时注销服务 {} 失败: {}", service_name, e);
                }
            });
        }
    }
}

/// 便捷函数：尝试注册服务到 etcd
///
/// 如果 etcd 未启用（ETCD_ENABLED!=true），返回 None 并打印 info 日志。
/// 如果 etcd 启用但注册失败，返回 None 并打印 warn 日志（graceful fallback）。
///
/// # 参数
/// - service_name: 服务名称（如 "topems-erp"）
/// - service_port: 服务端口
/// - register_address: 注册地址（Docker 网络下为容器名；本机为 127.0.0.1）
///
/// # 示例
/// ```ignore
/// let _etcd_guard = topems_shared_event::etcd::try_register_service(
///     "topems-erp", 8080, "topems-erp"
/// ).await;
/// ```
pub async fn try_register_service(
    service_name: &str,
    service_port: u16,
    register_address: &str,
) -> Option<EtcdRegistrationGuard> {
    if !EtcdConfig::is_enabled() {
        info!("etcd 未启用（ETCD_ENABLED!=true），跳过服务注册");
        return None;
    }

    let client = match EtcdClient::from_env().await {
        Ok(c) => c,
        Err(e) => {
            warn!("etcd 客户端创建失败: {}，跳过服务注册", e);
            return None;
        }
    };

    // 先 ping，确认可达
    match client.ping().await {
        Ok(true) => {}
        Ok(false) => {
            warn!("etcd 不可达，跳过服务注册");
            return None;
        }
        Err(e) => {
            warn!("etcd ping 失败: {}，跳过服务注册", e);
            return None;
        }
    }

    let service_id = format!("{}-{}", service_name, Uuid::new_v4());
    let registration = ServiceRegistration::new(service_id.clone(), service_name, service_port)
        .with_address(register_address)
        .with_tag("topems")
        .with_meta("version", env!("CARGO_PKG_VERSION"));

    match client.register_service(registration).await {
        Ok(guard) => {
            // 自动启动租约续期
            guard.spawn_keep_alive();
            info!(
                "✅ 服务 {} 已注册到 etcd (id={})，租约续期已启动",
                service_name, service_id
            );
            Some(guard)
        }
        Err(e) => {
            warn!("etcd 注册失败: {}，服务将在无 etcd 模式下运行", e);
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_service_registration_builder() {
        let reg = ServiceRegistration::new("svc-1", "my-service", 8080)
            .with_tag("api")
            .with_address("127.0.0.1")
            .with_meta("version", "1.0.0");

        assert_eq!(reg.id, "svc-1");
        assert_eq!(reg.name, "my-service");
        assert_eq!(reg.port, 8080);
        assert_eq!(reg.tags, vec!["api"]);
        assert_eq!(reg.address, Some("127.0.0.1".to_string()));
        assert_eq!(reg.meta.get("version"), Some(&"1.0.0".to_string()));
    }

    #[test]
    fn test_config_from_env_default() {
        env::remove_var("ETCD_ENDPOINTS");
        env::remove_var("ETCD_PREFIX");
        let config = EtcdConfig::from_env();
        assert_eq!(config.endpoints, vec!["http://localhost:2379".to_string()]);
        assert_eq!(config.prefix, "/topems/services");
        assert_eq!(config.lease_ttl_secs, 30);
    }

    #[test]
    fn test_is_enabled_default_false() {
        env::remove_var("ETCD_ENABLED");
        assert!(!EtcdConfig::is_enabled());
    }

    #[test]
    fn test_prefix_normalization() {
        assert_eq!(normalized_prefix("/custom/"), "/custom/");
        assert_eq!(normalized_prefix("/custom"), "/custom/");
        assert_eq!(normalized_prefix("/topems/services"), "/topems/services/");
        assert_eq!(
            format!("{}{}/{}", normalized_prefix("/custom/"), "erp", "erp-1"),
            "/custom/erp/erp-1"
        );
    }

    #[test]
    fn test_endpoint_format() {
        let inst = ServiceInstance {
            id: "x".into(),
            name: "erp".into(),
            address: "10.0.0.5".into(),
            port: 8080,
            tags: vec![],
            meta: HashMap::new(),
            lease_id: 42,
        };
        assert_eq!(inst.endpoint(), "10.0.0.5:8080");
    }
}
