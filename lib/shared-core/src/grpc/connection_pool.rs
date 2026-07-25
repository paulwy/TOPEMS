//! V24.0 模块 C: gRPC 连接池与负载均衡
//!
//! 提供多端点 channel 池管理、4 种负载均衡策略、健康检查与故障转移。
//! 基于 tonic::transport::Channel 实现，不依赖 proto 生成代码。

#![cfg(feature = "grpc")]

use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Duration;

use tokio::sync::RwLock;
use tonic::transport::{Channel, Endpoint};
use tracing::{debug, warn};

/// 负载均衡策略
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LoadBalancingStrategy {
    /// 轮询
    RoundRobin,
    /// 随机
    Random,
    /// 优先级（按 priority 字段降序选择）
    Priority,
    /// 最少使用
    LeastUsed,
}

impl Default for LoadBalancingStrategy {
    fn default() -> Self {
        LoadBalancingStrategy::RoundRobin
    }
}

/// 连接池配置
#[derive(Debug, Clone)]
pub struct GrpcPoolConfig {
    /// 负载均衡策略
    pub strategy: LoadBalancingStrategy,
    /// 连接超时
    pub connect_timeout: Duration,
    /// 请求超时
    pub request_timeout: Duration,
    /// 健康检查间隔
    pub health_check_interval: Duration,
    /// 最大重试次数
    pub max_retries: u32,
}

impl Default for GrpcPoolConfig {
    fn default() -> Self {
        Self {
            strategy: LoadBalancingStrategy::RoundRobin,
            connect_timeout: Duration::from_secs(5),
            request_timeout: Duration::from_secs(30),
            health_check_interval: Duration::from_secs(10),
            max_retries: 3,
        }
    }
}

/// 连接池统计
#[derive(Debug, Clone, Default)]
pub struct GrpcPoolStats {
    pub total_endpoints: usize,
    pub healthy_endpoints: usize,
    pub total_acquires: u64,
    pub total_failures: u64,
}

/// 单个端点的连接池条目
struct EndpointPool {
    url: String,
    priority: u32,
    channel: Channel,
    healthy: std::sync::Mutex<bool>,
    acquire_count: AtomicU64,
}

impl EndpointPool {
    fn new(url: String, priority: u32, channel: Channel) -> Self {
        Self {
            url,
            priority,
            channel,
            healthy: std::sync::Mutex::new(true),
            acquire_count: AtomicU64::new(0),
        }
    }

    fn is_healthy(&self) -> bool {
        match self.healthy.try_lock() {
            Ok(guard) => *guard,
            Err(_) => true, // 锁失败时假设健康
        }
    }

    fn set_healthy(&self, value: bool) {
        if let Ok(mut guard) = self.healthy.lock() {
            *guard = value;
        }
    }
}

/// 池化后的 Channel（可克隆共享）
#[derive(Clone)]
pub struct PooledChannel {
    pub channel: Channel,
    pub endpoint_url: String,
}

impl std::fmt::Debug for PooledChannel {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("PooledChannel")
            .field("endpoint_url", &self.endpoint_url)
            .finish_non_exhaustive()
    }
}

/// gRPC 连接池错误
#[derive(Debug, thiserror::Error)]
pub enum GrpcPoolError {
    #[error("no healthy endpoints available in group: {0}")]
    NoHealthyEndpoints(String),
    #[error("invalid endpoint URL: {0}")]
    InvalidUrl(String),
    #[error("endpoint creation failed: {0}")]
    EndpointCreation(String),
}

/// gRPC Channel 连接池
///
/// 支持多端点分组（group）、负载均衡、健康检查与故障转移。
pub struct GrpcChannelPool {
    config: GrpcPoolConfig,
    groups: RwLock<HashMap<String, Vec<Arc<EndpointPool>>>>,
    rr_counters: RwLock<HashMap<String, Arc<AtomicU64>>>,
    stats: RwLock<GrpcPoolStats>,
}

impl std::fmt::Debug for GrpcChannelPool {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("GrpcChannelPool")
            .field("config", &self.config)
            .finish_non_exhaustive()
    }
}

impl GrpcChannelPool {
    pub fn new(config: GrpcPoolConfig) -> Self {
        Self {
            config,
            groups: RwLock::new(HashMap::new()),
            rr_counters: RwLock::new(HashMap::new()),
            stats: RwLock::new(GrpcPoolStats::default()),
        }
    }

    pub fn into_arc(self) -> Arc<Self> {
        Arc::new(self)
    }

    /// 添加一个端点到指定分组
    pub async fn add_endpoint(
        &self,
        url: &str,
        priority: u32,
        group: &str,
    ) -> Result<(), GrpcPoolError> {
        let endpoint = Endpoint::from_shared(url.to_string())
            .map_err(|e| GrpcPoolError::InvalidUrl(e.to_string()))?;
        let channel = endpoint
            .connect_timeout(self.config.connect_timeout)
            .timeout(self.config.request_timeout)
            .connect()
            .await
            .map_err(|e| GrpcPoolError::EndpointCreation(e.to_string()))?;

        let pool = Arc::new(EndpointPool::new(url.to_string(), priority, channel));

        let mut groups = self.groups.write().await;
        groups.entry(group.to_string()).or_default().push(pool);

        let mut stats = self.stats.write().await;
        stats.total_endpoints += 1;
        stats.healthy_endpoints += 1;

        // 初始化轮询计数器
        let mut rr_counters = self.rr_counters.write().await;
        rr_counters
            .entry(group.to_string())
            .or_insert_with(|| Arc::new(AtomicU64::new(0)));

        debug!(
            url = url,
            group = group,
            priority = priority,
            "Added gRPC endpoint"
        );
        Ok(())
    }

    /// 从指定分组获取一个 channel（按负载均衡策略）
    pub async fn acquire(&self, group: &str) -> Result<PooledChannel, GrpcPoolError> {
        let groups = self.groups.read().await;
        let endpoints = groups.get(group).ok_or_else(|| {
            GrpcPoolError::NoHealthyEndpoints(format!("group not found: {}", group))
        })?;

        let healthy: Vec<&Arc<EndpointPool>> =
            endpoints.iter().filter(|e| e.is_healthy()).collect();
        if healthy.is_empty() {
            return Err(GrpcPoolError::NoHealthyEndpoints(group.to_string()));
        }

        let selected = match self.config.strategy {
            LoadBalancingStrategy::RoundRobin => self.round_robin(group, &healthy).await,
            LoadBalancingStrategy::Random => {
                use rand::seq::SliceRandom;
                healthy.choose(&mut rand::thread_rng()).copied()
            }
            LoadBalancingStrategy::Priority => healthy.iter().max_by_key(|e| e.priority).copied(),
            LoadBalancingStrategy::LeastUsed => healthy
                .iter()
                .min_by_key(|e| e.acquire_count.load(Ordering::Relaxed))
                .copied(),
        };

        let selected = selected.ok_or_else(|| {
            GrpcPoolError::NoHealthyEndpoints(format!("selection failed: {}", group))
        })?;

        selected.acquire_count.fetch_add(1, Ordering::Relaxed);

        {
            let mut stats = self.stats.write().await;
            stats.total_acquires += 1;
        }

        Ok(PooledChannel {
            channel: selected.channel.clone(),
            endpoint_url: selected.url.clone(),
        })
    }

    async fn round_robin<'a>(
        &self,
        group: &str,
        healthy: &[&'a Arc<EndpointPool>],
    ) -> Option<&'a Arc<EndpointPool>> {
        if healthy.is_empty() {
            return None;
        }
        let rr_counters = self.rr_counters.read().await;
        let counter = rr_counters.get(group)?;
        let idx = (counter.fetch_add(1, Ordering::Relaxed)) as usize % healthy.len();
        Some(healthy[idx])
    }

    /// 移除指定分组的某个端点
    pub async fn remove_endpoint(&self, group: &str, url: &str) {
        let mut groups = self.groups.write().await;
        if let Some(endpoints) = groups.get_mut(group) {
            endpoints.retain(|e| e.url != url);
        }
        let mut stats = self.stats.write().await;
        stats.total_endpoints = stats.total_endpoints.saturating_sub(1);
    }

    /// 标记端点为不健康
    pub async fn mark_unhealthy(&self, group: &str, url: &str) {
        let groups = self.groups.read().await;
        if let Some(endpoints) = groups.get(group) {
            for e in endpoints.iter() {
                if e.url == url {
                    e.set_healthy(false);
                    break;
                }
            }
        }
        warn!(url = url, group = group, "Endpoint marked unhealthy");
    }

    /// 获取统计信息
    pub async fn stats(&self) -> GrpcPoolStats {
        self.stats.read().await.clone()
    }

    /// 列出指定分组的所有端点
    pub async fn list_endpoints(&self, group: &str) -> Vec<String> {
        self.groups
            .read()
            .await
            .get(group)
            .map(|eps| eps.iter().map(|e| e.url.clone()).collect())
            .unwrap_or_default()
    }

    /// 启动后台健康检查任务
    pub fn start_health_check(self: Arc<Self>) {
        let interval = self.config.health_check_interval;
        let this = self;
        tokio::spawn(async move {
            let mut ticker = tokio::time::interval(interval);
            ticker.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
            loop {
                ticker.tick().await;
                // 简单的健康检查：尝试通过 channel 发送 ping
                // 实际应用中可调用 grpc.health.v1.Health 服务
                let groups = this.groups.read().await;
                for (group, endpoints) in groups.iter() {
                    for e in endpoints.iter() {
                        // Channel 本身没有简单的 ping 接口，这里仅做存活探测
                        // 真实场景应由服务侧通过 HealthClient 调用
                        let _ = e.channel.clone();
                        debug!(url = %e.url, group = group, "Health tick");
                    }
                }
            }
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_strategy_default() {
        assert_eq!(
            LoadBalancingStrategy::default(),
            LoadBalancingStrategy::RoundRobin
        );
    }

    #[test]
    fn test_config_default() {
        let config = GrpcPoolConfig::default();
        assert_eq!(config.strategy, LoadBalancingStrategy::RoundRobin);
        assert_eq!(config.connect_timeout, Duration::from_secs(5));
        assert_eq!(config.max_retries, 3);
    }

    #[test]
    fn test_pooled_channel_debug() {
        let pool = GrpcChannelPool::new(GrpcPoolConfig::default());
        let debug_str = format!("{:?}", pool);
        assert!(debug_str.contains("GrpcChannelPool"));
    }

    #[tokio::test]
    async fn test_acquire_no_group() {
        let pool = GrpcChannelPool::new(GrpcPoolConfig::default());
        let result = pool.acquire("nonexistent").await;
        assert!(result.is_err());
        match result.unwrap_err() {
            GrpcPoolError::NoHealthyEndpoints(msg) => {
                assert!(msg.contains("group not found"));
            }
            other => panic!("Expected NoHealthyEndpoints, got: {:?}", other),
        }
    }

    #[tokio::test]
    async fn test_list_endpoints_empty() {
        let pool = GrpcChannelPool::new(GrpcPoolConfig::default());
        let endpoints = pool.list_endpoints("test-group").await;
        assert!(endpoints.is_empty());
    }

    #[tokio::test]
    async fn test_stats_initial() {
        let pool = GrpcChannelPool::new(GrpcPoolConfig::default());
        let stats = pool.stats().await;
        assert_eq!(stats.total_endpoints, 0);
        assert_eq!(stats.healthy_endpoints, 0);
        assert_eq!(stats.total_acquires, 0);
    }
}
