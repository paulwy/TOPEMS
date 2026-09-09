//! ZooKeeper 服务发现客户端
//!
//! 提供服务注册、注销、发现功能，支持 watcher 实时感知与断线重连。
//! 通过环境变量 ZK_CONNECT_STRING（默认 127.0.0.1:2181）配置 ZooKeeper 地址。
//! 通过环境变量 ZK_ENABLED 控制是否启用（默认 false，graceful fallback）。
//!
//! 实现要点：
//! - 使用 `zookeeper` crate（真实 ZooKeeper 客户端），注册采用 Ephemeral 节点
//!   （客户端断开时自动删除，无需租约续期）。
//! - watcher：一次性 watch 循环重设（ZK watch 语义），实时感知服务变更。
//! - 重连：监听 ZkState，session 过期（Expired）时自动重建连接并重注册服务。

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::env;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tokio::sync::RwLock;
use tracing::{info, warn};

use uuid::Uuid;

use zookeeper::{Acl, CreateMode, WatchedEvent, Watcher, ZkState, ZooKeeper};

/// ZooKeeper 配置
#[derive(Debug, Clone)]
pub struct ZkConfig {
    /// 连接字符串，如 127.0.0.1:2181（可逗号分隔多节点）
    pub connect_string: String,
    /// 服务注册节点前缀（默认 /topems/services）
    pub prefix: String,
    /// session 超时（秒），默认 10
    pub session_timeout_secs: u64,
    /// 断线重连间隔（秒），默认 5
    pub reconnect_interval_secs: u64,
}

impl Default for ZkConfig {
    fn default() -> Self {
        Self::from_env()
    }
}

impl ZkConfig {
    /// 从环境变量读取配置
    pub fn from_env() -> Self {
        Self {
            connect_string: env::var("ZK_CONNECT_STRING")
                .unwrap_or_else(|_| "127.0.0.1:2181".to_string()),
            prefix: env::var("ZK_PREFIX").unwrap_or_else(|_| "/topems/services".to_string()),
            session_timeout_secs: env::var("ZK_SESSION_TIMEOUT")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(10),
            reconnect_interval_secs: env::var("ZK_RECONNECT_INTERVAL")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(5),
        }
    }

    /// 检查 ZooKeeper 是否启用（ZK_ENABLED=true 或 1）
    pub fn is_enabled() -> bool {
        env::var("ZK_ENABLED")
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

/// 服务实例（从 ZooKeeper 查询返回）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceInstance {
    pub id: String,
    pub name: String,
    pub address: String,
    pub port: u16,
    pub tags: Vec<String>,
    pub meta: HashMap<String, String>,
}

impl ServiceInstance {
    /// 便捷获取完整端点地址（address:port）
    pub fn endpoint(&self) -> String {
        format!("{}:{}", self.address, self.port)
    }
}

/// ZooKeeper 客户端
///
/// 内部持有同步 ZooKeeper 连接（zookeeper crate 为同步 API），
/// 对外提供 async 方法（操作在 spawn_blocking 中执行，不阻塞 tokio runtime）。
#[derive(Clone)]
pub struct ZkClient {
    config: ZkConfig,
    /// 底层 ZooKeeper 连接（重连时替换）
    inner: Arc<Mutex<ZooKeeper>>,
    /// 已注册的服务（用于断线重连后重放）
    registered: Arc<RwLock<Vec<(String, ServiceRegistration)>>>,
}

impl ZkClient {
    /// 创建新的 ZooKeeper 客户端并连接
    pub async fn new(config: ZkConfig) -> Result<Self, ZkError> {
        let connect_string = if config.connect_string.is_empty() {
            "127.0.0.1:2181".to_string()
        } else {
            config.connect_string.clone()
        };
        let timeout = Duration::from_secs(config.session_timeout_secs.max(1));

        let zk = tokio::task::spawn_blocking(move || {
            ZooKeeper::connect(&connect_string, timeout, ZkSessionWatcher)
        })
        .await
        .map_err(|e| ZkError::Task(e.to_string()))?
        .map_err(|e| ZkError::Connect(e.to_string()))?;

        Ok(Self {
            config,
            inner: Arc::new(Mutex::new(zk)),
            registered: Arc::new(RwLock::new(Vec::new())),
        })
    }

    /// 从环境变量创建
    pub async fn from_env() -> Result<Self, ZkError> {
        Self::new(ZkConfig::from_env()).await
    }

    /// 服务节点前缀（保证以斜杠结尾）
    pub fn prefix(&self) -> String {
        zk_normalized_prefix(&self.config.prefix)
    }

    /// 服务目录路径：{prefix}{name}
    fn service_path(&self, name: &str) -> String {
        format!("{}{}", self.prefix(), name)
    }

    /// 实例节点路径：{prefix}{name}/{id}
    fn instance_path(&self, name: &str, id: &str) -> String {
        format!("{}{}/{}", self.prefix(), name, id)
    }

    /// 确保目录节点存在（持久节点，递归创建）
    async fn ensure_path(&self, path: &str) -> Result<(), ZkError> {
        // 递归创建路径中的每个层级（zookeeper 不支持递归 create）
        let mut current = String::new();
        for part in path
            .trim_start_matches('/')
            .split('/')
            .filter(|p| !p.is_empty())
        {
            current.push('/');
            current.push_str(part);
            let exists = {
                let zk = self.inner.lock().unwrap();
                zk.exists(&current, false)
            };
            match exists {
                Ok(Some(_)) => {}
                Ok(None) | Err(_) => {
                    let zk = self.inner.lock().unwrap();
                    let _ = zk.create(
                        &current,
                        Vec::new(),
                        Acl::open_unsafe().clone(),
                        CreateMode::Persistent,
                    );
                }
            }
        }
        Ok(())
    }

    /// 注册服务到 ZooKeeper（Ephemeral 节点，断开自动删除）
    ///
    /// 返回注册守护句柄；句柄 Drop 时自动注销。
    pub async fn register_service(
        &self,
        registration: ServiceRegistration,
    ) -> Result<ZkRegistrationGuard, ZkError> {
        let path = self.instance_path(&registration.name, &registration.id);
        self.ensure_path(&self.service_path(&registration.name))
            .await?;

        let value =
            serde_json::to_string(&registration).map_err(|e| ZkError::Serialize(e.to_string()))?;
        let acl = Acl::open_unsafe().clone();
        let create_path = path.clone();

        let zk = self.inner.clone();
        tokio::task::spawn_blocking(move || {
            zk.lock()
                .unwrap()
                .create(&create_path, value.into_bytes(), acl, CreateMode::Ephemeral)
        })
        .await
        .map_err(|e| ZkError::Task(e.to_string()))?
        .map_err(|e| ZkError::RegistrationFailed(e.to_string()))?;

        self.registered
            .write()
            .await
            .push((registration.id.clone(), registration.clone()));

        info!(
            "✅ 服务已注册到 ZooKeeper: id={}, name={}, path={}",
            registration.id, registration.name, path
        );

        Ok(ZkRegistrationGuard {
            client: self.clone(),
            service_name: registration.name,
            service_id: registration.id,
            deregistered: false,
        })
    }

    /// 注销服务（删除节点）
    pub async fn deregister_service(&self, name: &str, id: &str) -> Result<(), ZkError> {
        let path = self.instance_path(name, id);
        let zk = self.inner.clone();
        let result = tokio::task::spawn_blocking(move || zk.lock().unwrap().delete(&path, None))
            .await
            .map_err(|e| ZkError::Task(e.to_string()))?;

        // 节点不存在视为已注销（幂等）
        match result {
            Ok(()) => {}
            Err(e) if e.to_string().contains("NoNode") => {}
            Err(e) => return Err(ZkError::DeregistrationFailed(e.to_string())),
        }

        self.registered.write().await.retain(|(sid, _)| sid != id);

        info!("✅ 服务已从 ZooKeeper 注销: id={}", id);
        Ok(())
    }

    /// 按服务名发现所有实例
    pub async fn discover_service(&self, name: &str) -> Result<Vec<ServiceInstance>, ZkError> {
        let path = self.service_path(name);
        let zk = self.inner.clone();
        let children =
            tokio::task::spawn_blocking(move || zk.lock().unwrap().get_children(&path, false))
                .await
                .map_err(|e| ZkError::Task(e.to_string()))?
                .map_err(|e| ZkError::DiscoveryFailed(e.to_string()))?;

        let mut instances = Vec::new();
        for child in children {
            if let Ok(Some(inst)) = self.get_instance(name, &child).await {
                instances.push(inst);
            }
        }
        Ok(instances)
    }

    /// 读取单个实例节点数据
    async fn get_instance(&self, name: &str, id: &str) -> Result<Option<ServiceInstance>, ZkError> {
        let path = self.instance_path(name, id);
        let zk = self.inner.clone();
        let data = tokio::task::spawn_blocking(move || zk.lock().unwrap().get_data(&path, false))
            .await
            .map_err(|e| ZkError::Task(e.to_string()))?;

        match data {
            Ok((bytes, _stat)) => {
                let reg: ServiceRegistration = serde_json::from_slice(&bytes)
                    .map_err(|e| ZkError::Serialize(e.to_string()))?;
                Ok(Some(ServiceInstance {
                    id: reg.id,
                    name: reg.name,
                    address: reg.address.unwrap_or_default(),
                    port: reg.port,
                    tags: reg.tags,
                    meta: reg.meta,
                }))
            }
            Err(e) if e.to_string().contains("NoNode") => Ok(None),
            Err(e) => Err(ZkError::DiscoveryFailed(e.to_string())),
        }
    }

    /// 列出所有已注册的服务名 → 实例 ID 列表
    pub async fn list_services(&self) -> Result<HashMap<String, Vec<String>>, ZkError> {
        let zk = self.inner.clone();
        let prefix_path = self.prefix();
        let prefix_path_clone = prefix_path.trim_end_matches('/').to_string();

        let children = tokio::task::spawn_blocking(move || {
            zk.lock().unwrap().get_children(&prefix_path_clone, false)
        })
        .await
        .map_err(|e| ZkError::Task(e.to_string()))?;

        let names = match children {
            Ok(c) => c,
            Err(e) if e.to_string().contains("NoNode") => return Ok(HashMap::new()),
            Err(e) => return Err(ZkError::DiscoveryFailed(e.to_string())),
        };

        let mut services = HashMap::new();
        for name in names {
            let path = format!("{}{}", prefix_path, name);
            let zk = self.inner.clone();
            let ids =
                tokio::task::spawn_blocking(move || zk.lock().unwrap().get_children(&path, false))
                    .await
                    .map_err(|e| ZkError::Task(e.to_string()))?;
            if let Ok(ids) = ids {
                services.insert(name, ids);
            }
        }
        Ok(services)
    }

    /// 检查 ZooKeeper 是否可达
    pub async fn ping(&self) -> Result<bool, ZkError> {
        let zk = self.inner.clone();
        let path = self.prefix().trim_end_matches('/').to_string();
        tokio::task::spawn_blocking(move || zk.lock().unwrap().exists(&path, false))
            .await
            .map_err(|e| ZkError::Task(e.to_string()))?
            .map(|_| true)
            .map_err(|e| ZkError::DiscoveryFailed(e.to_string()))
    }

    /// 订阅服务目录变更（watcher）
    ///
    /// 循环设置一次性 watch（ZK watch 语义），事件触发时回调 `on_event`，
    /// 回调收到后自动重设 watch。返回句柄，Drop 后停止。
    /// 订阅服务目录变更（watcher）
    ///
    /// 循环设置一次性 watch（ZK watch 语义），事件触发时回调 `on_event` 并自动重设。
    /// 返回句柄，调用 `cancel()` 或 Drop 后停止。
    pub fn spawn_service_watch<F>(&self, service_name: String, on_event: F) -> ZkWatchHandle
    where
        F: Fn(Vec<ServiceInstance>) + Send + Sync + 'static,
    {
        let client = self.clone();
        let (cancel_tx, mut cancel_rx) = tokio::sync::mpsc::channel::<()>(1);
        let task = tokio::spawn(async move {
            let path = client.service_path(&service_name);
            loop {
                tokio::select! {
                    _ = cancel_rx.recv() => return,
                    _ = async {
                        // 一次性 watch：children 变更时触发事件（同步阻塞，放入 spawn_blocking）
                        let (tx, rx) = std::sync::mpsc::channel::<()>();
                        let watcher = move |_event: WatchedEvent| {
                            let _ = tx.send(());
                        };
                        let zk = client.inner.clone();
                        let path_c = path.clone();
                        let children = tokio::task::spawn_blocking(move || {
                            zk.lock().unwrap().get_children_w(&path_c, watcher)
                        })
                        .await;
                        match children {
                            Ok(Ok(names)) => {
                                let instances = client.fetch_instances(&service_name, names).await;
                                on_event(instances);
                            }
                            Ok(Err(e)) => {
                                // 路径尚不存在（NoNode）或会话失效：推送空快照并稍后重试
                                warn!("ZooKeeper watch 设置失败: {}，推送空快照并在 2 秒后重试", e);
                                on_event(Vec::new());
                                tokio::time::sleep(Duration::from_secs(2)).await;
                                return;
                            }
                            Err(e) => {
                                warn!("ZooKeeper watch 任务失败: {}", e);
                                return;
                            }
                        }
                        // 等待事件（带超时保活；通道关闭即退出重设）
                        let _ = tokio::task::spawn_blocking(move || rx.recv_timeout(Duration::from_secs(60))).await;
                    } => {}
                }
            }
        });

        ZkWatchHandle {
            task: Some(task),
            cancel_tx,
        }
    }

    /// 按 ID 列表批量读取实例
    async fn fetch_instances(
        &self,
        service_name: &str,
        children: Vec<String>,
    ) -> Vec<ServiceInstance> {
        let mut out = Vec::new();
        for child in children {
            if let Ok(Some(inst)) = self.get_instance(service_name, &child).await {
                out.push(inst);
            }
        }
        out
    }

    /// 断线自动重连（后台任务）
    ///
    /// 监听 ZkState；session 失效（Closed/AuthFailed）时重建连接并重放已注册服务。
    /// 返回取消句柄；调用 `cancel()` 停止。
    pub fn spawn_reconnect(&self) -> ZkReconnectHandle {
        let client = self.clone();
        let (cancel_tx, mut cancel_rx) = tokio::sync::mpsc::channel::<()>(1);
        let task = tokio::spawn(async move {
            // 注册状态监听（同步回调 → 转发到通道）
            let (state_tx, state_rx) = std::sync::mpsc::channel::<ZkState>();
            let listener = move |state: ZkState| {
                let _ = state_tx.send(state);
            };
            // 锁在作用域块内立即释放（std MutexGuard 不 Send，不得跨 await 存活）
            let _sub = {
                let zk = client.inner.lock().unwrap();
                zk.add_listener(listener)
            };
            // 阻塞接收线程 → tokio channel 转发（Receiver 非 'static，移入线程）
            let (zk_state_tx, mut zk_state_rx) = tokio::sync::mpsc::channel::<ZkState>(16);
            std::thread::spawn(move || {
                while let Ok(state) = state_rx.recv() {
                    if zk_state_tx.blocking_send(state).is_err() {
                        break;
                    }
                }
            });

            loop {
                tokio::select! {
                    _ = cancel_rx.recv() => return,
                    state = zk_state_rx.recv() => {
                        match state {
                            Some(zk_state) => {
                                match zk_state {
                                    ZkState::Closed | ZkState::AuthFailed => {
                                        warn!("ZooKeeper session 失效（{:?}），重建连接并重放注册", zk_state);
                                        client.reconnect_and_rerun().await;
                                    }
                                    _ => {}
                                }
                            }
                            None => return,
                        }
                    }
                }
            }
        });

        ZkReconnectHandle {
            task: Some(task),
            cancel_tx,
        }
    }

    /// 重建连接并重放已注册服务
    async fn reconnect_and_rerun(&self) {
        let config = self.config.clone();
        match Self::new(config).await {
            Ok(new_client) => {
                // 替换底层连接（ZooKeeper 不可 Clone；new_client 持有唯一 Arc）
                let new_zk = match Arc::try_unwrap(new_client.inner) {
                    Ok(mutex) => mutex.into_inner().unwrap_or_else(|p| p.into_inner()),
                    Err(_arc) => {
                        warn!("ZooKeeper 重连：Arc 非唯一引用，跳过连接替换");
                        return;
                    }
                };
                {
                    let mut guard = self.inner.lock().unwrap();
                    *guard = new_zk;
                }

                // 重放注册（Ephemeral 节点已随旧 session 删除）
                let registered = self.registered.read().await.clone();
                let count = registered.len();
                for (_id, reg) in registered {
                    if let Err(e) = self.register_service(reg).await {
                        warn!("重连后重注册失败: {}", e);
                    }
                }
                info!("✅ ZooKeeper 重连完成，已重放 {} 个服务", count);
            }
            Err(e) => {
                warn!("ZooKeeper 重连失败: {}，将在下次状态事件时重试", e);
            }
        }
    }
}

/// ZK 会话级 watcher（连接建立时传入，处理 session 状态事件）
#[derive(Clone)]
struct ZkSessionWatcher;

impl Watcher for ZkSessionWatcher {
    fn handle(&self, event: WatchedEvent) {
        match event.keeper_state {
            zookeeper::KeeperState::Expired => {
                warn!("ZooKeeper session 已过期（session watcher）");
            }
            zookeeper::KeeperState::SyncConnected => {
                info!("ZooKeeper 已连接");
            }
            _ => {}
        }
    }
}

/// 规范化节点前缀（保证以斜杠结尾）
fn zk_normalized_prefix(prefix: &str) -> String {
    let p = prefix.trim_end_matches('/');
    format!("{}/", p)
}

/// ZooKeeper 错误类型
#[derive(Debug, thiserror::Error)]
pub enum ZkError {
    #[error("ZooKeeper 连接失败: {0}")]
    Connect(String),

    #[error("ZooKeeper 注册失败: {0}")]
    RegistrationFailed(String),

    #[error("ZooKeeper 注销失败: {0}")]
    DeregistrationFailed(String),

    #[error("ZooKeeper 服务发现失败: {0}")]
    DiscoveryFailed(String),

    #[error("ZooKeeper 序列化失败: {0}")]
    Serialize(String),

    #[error("后台任务失败: {0}")]
    Task(String),
}

/// 服务注册守护句柄
///
/// 持有 ZkClient 引用，Drop 时自动注销服务。
pub struct ZkRegistrationGuard {
    client: ZkClient,
    service_name: String,
    service_id: String,
    deregistered: bool,
}

impl ZkRegistrationGuard {
    /// 主动注销服务
    pub async fn deregister(&mut self) -> Result<(), ZkError> {
        if !self.deregistered {
            self.client
                .deregister_service(&self.service_name, &self.service_id)
                .await?;
            self.deregistered = true;
        }
        Ok(())
    }
}

impl Drop for ZkRegistrationGuard {
    fn drop(&mut self) {
        if !self.deregistered {
            let client = self.client.clone();
            let name = self.service_name.clone();
            let id = self.service_id.clone();
            tokio::spawn(async move {
                if let Err(e) = client.deregister_service(&name, &id).await {
                    warn!("Drop 时注销服务 {} 失败: {}", id, e);
                }
            });
        }
    }
}

/// 服务 watch 句柄
pub struct ZkWatchHandle {
    task: Option<tokio::task::JoinHandle<()>>,
    cancel_tx: tokio::sync::mpsc::Sender<()>,
}

impl ZkWatchHandle {
    /// 停止 watch 任务
    pub async fn cancel(&mut self) {
        let _ = self.cancel_tx.send(()).await;
        if let Some(task) = self.task.take() {
            let _ = task.await;
        }
    }
}

impl Drop for ZkWatchHandle {
    fn drop(&mut self) {
        let _ = self.cancel_tx.try_send(());
    }
}

/// 重连任务句柄
pub struct ZkReconnectHandle {
    task: Option<tokio::task::JoinHandle<()>>,
    cancel_tx: tokio::sync::mpsc::Sender<()>,
}

impl ZkReconnectHandle {
    /// 停止重连任务
    pub async fn cancel(&mut self) {
        let _ = self.cancel_tx.send(()).await;
        if let Some(task) = self.task.take() {
            let _ = task.await;
        }
    }
}

impl Drop for ZkReconnectHandle {
    fn drop(&mut self) {
        let _ = self.cancel_tx.try_send(());
    }
}

/// 便捷函数：尝试注册服务到 ZooKeeper
///
/// 如果 ZooKeeper 未启用（ZK_ENABLED!=true），返回 None 并打印 info 日志。
/// 如果 ZooKeeper 启用但注册失败，返回 None 并打印 warn 日志（graceful fallback）。
///
/// # 参数
/// - service_name: 服务名称（如 "topems-erp"）
/// - service_port: 服务端口
/// - register_address: 注册地址（Docker 网络下为容器名；本机为 127.0.0.1）
pub async fn try_register_service(
    service_name: &str,
    service_port: u16,
    register_address: &str,
) -> Option<ZkRegistrationGuard> {
    if !ZkConfig::is_enabled() {
        info!("ZooKeeper 未启用（ZK_ENABLED!=true），跳过服务注册");
        return None;
    }

    let client = match ZkClient::from_env().await {
        Ok(c) => c,
        Err(e) => {
            warn!("ZooKeeper 客户端创建失败: {}，跳过服务注册", e);
            return None;
        }
    };

    match client.ping().await {
        Ok(true) => {}
        Ok(false) => {
            warn!("ZooKeeper 不可达，跳过服务注册");
            return None;
        }
        Err(e) => {
            warn!("ZooKeeper ping 失败: {}，跳过服务注册", e);
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
            // 自动启动断线重连
            client.spawn_reconnect();
            info!(
                "✅ 服务 {} 已注册到 ZooKeeper (id={})，重连任务已启动",
                service_name, service_id
            );
            Some(guard)
        }
        Err(e) => {
            warn!("ZooKeeper 注册失败: {}，服务将在无 ZooKeeper 模式下运行", e);
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
        env::remove_var("ZK_CONNECT_STRING");
        env::remove_var("ZK_PREFIX");
        let config = ZkConfig::from_env();
        assert_eq!(config.connect_string, "127.0.0.1:2181");
        assert_eq!(config.prefix, "/topems/services");
        assert_eq!(config.session_timeout_secs, 10);
    }

    #[test]
    fn test_is_enabled_default_false() {
        env::remove_var("ZK_ENABLED");
        assert!(!ZkConfig::is_enabled());
    }

    #[test]
    fn test_paths() {
        let config = ZkConfig {
            connect_string: "127.0.0.1:2181".to_string(),
            prefix: "/topems/services".to_string(),
            session_timeout_secs: 10,
            reconnect_interval_secs: 5,
        };
        assert_eq!(zk_normalized_prefix(&config.prefix), "/topems/services/");
        assert_eq!(
            format!("{}{}", zk_normalized_prefix(&config.prefix), "erp"),
            "/topems/services/erp"
        );
        assert_eq!(
            format!(
                "{}{}/{}",
                zk_normalized_prefix(&config.prefix),
                "erp",
                "erp-1"
            ),
            "/topems/services/erp/erp-1"
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
        };
        assert_eq!(inst.endpoint(), "10.0.0.5:8080");
    }
}
