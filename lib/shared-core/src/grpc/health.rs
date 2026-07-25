//! V24.0 模块 C: gRPC 健康检查抽象
//!
//! 实现 grpc.health.v1 协议语义（兼容标准 gRPC 健康检查客户端），
//! 但不依赖 proto 生成代码 —— 服务可基于此抽象实现自己的 HealthService。

#![cfg(feature = "grpc")]

use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use tokio::sync::RwLock;
use tracing::{debug, warn};

/// gRPC 健康状态（grpc.health.v1.ServingStatus 对应）
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
#[repr(i32)]
pub enum GrpcHealthStatus {
    /// 0 - 未知状态
    Unknown = 0,
    /// 1 - 正在服务
    Serving = 1,
    /// 2 - 不在服务
    NotServing = 2,
    /// 3 - 服务未知
    ServiceUnknown = 3,
}

impl GrpcHealthStatus {
    pub fn as_i32(self) -> i32 {
        self as i32
    }

    pub fn is_healthy(self) -> bool {
        matches!(self, GrpcHealthStatus::Serving)
    }
}

impl From<i32> for GrpcHealthStatus {
    fn from(value: i32) -> Self {
        match value {
            1 => GrpcHealthStatus::Serving,
            2 => GrpcHealthStatus::NotServing,
            3 => GrpcHealthStatus::ServiceUnknown,
            _ => GrpcHealthStatus::Unknown,
        }
    }
}

/// 健康检查响应（V24.0 扩展 grpc.health.v1.HealthCheckResponse）
#[derive(Debug, Clone)]
pub struct GrpcHealthCheckResponse {
    /// 服务名
    pub service: String,
    /// 服务状态
    pub status: GrpcHealthStatus,
    /// 人类可读消息
    pub message: String,
    /// 检查时间（UTC）
    pub checked_at: DateTime<Utc>,
    /// 依赖项状态明细
    pub dependencies: HashMap<String, GrpcHealthStatus>,
}

impl GrpcHealthCheckResponse {
    pub fn serving(service: impl Into<String>) -> Self {
        Self {
            service: service.into(),
            status: GrpcHealthStatus::Serving,
            message: "Service is healthy".to_string(),
            checked_at: Utc::now(),
            dependencies: HashMap::new(),
        }
    }

    pub fn not_serving(service: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            service: service.into(),
            status: GrpcHealthStatus::NotServing,
            message: message.into(),
            checked_at: Utc::now(),
            dependencies: HashMap::new(),
        }
    }
}

/// 探针 ID（用于唯一标识一个依赖探针）
pub type HealthProbeId = String;

/// 探针类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum ProbeKind {
    /// 数据库探针
    Database,
    /// 缓存探针（Redis 等）
    Cache,
    /// 消息队列探针
    MessageQueue,
    /// 下游 gRPC 服务探针
    DownstreamGrpc,
    /// 下游 HTTP 服务探针
    DownstreamHttp,
    /// 自定义探针
    Custom,
}

/// 依赖探针 trait
///
/// 实现此 trait 的探针会被 HealthState 周期性调用以检查依赖项状态。
#[async_trait]
pub trait DependencyProbe: Send + Sync {
    /// 探针唯一标识
    fn id(&self) -> HealthProbeId;
    /// 探针类型
    fn kind(&self) -> ProbeKind;
    /// 是否为关键依赖（关键依赖失败将导致整体 NotServing）
    fn is_critical(&self) -> bool;
    /// 执行探测
    async fn probe(&self) -> GrpcHealthStatus;
}

/// 健康检查器 trait（聚合多个探针）
#[async_trait]
pub trait GrpcHealthChecker: Send + Sync {
    /// 执行一次健康检查，返回聚合后状态
    async fn check(&self, service: &str) -> GrpcHealthCheckResponse;
    /// 订阅健康状态变化（watch RPC 后端）
    async fn watch(&self, service: &str, tx: tokio::sync::mpsc::Sender<GrpcHealthCheckResponse>);
}

/// 健康状态聚合器
///
/// 维护多个 DependencyProbe，定期执行探测并缓存结果。
/// 支持关键依赖失败时整体降级为 NotServing。
pub struct GrpcHealthState {
    service_name: String,
    probes: RwLock<HashMap<HealthProbeId, Arc<dyn DependencyProbe>>>,
    cached: RwLock<HashMap<HealthProbeId, (GrpcHealthStatus, DateTime<Utc>)>>,
    cache_ttl: Duration,
}

impl std::fmt::Debug for GrpcHealthState {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let probe_count = self.probes.blocking_read().len();
        let cached_count = self.cached.blocking_read().len();
        f.debug_struct("GrpcHealthState")
            .field("service_name", &self.service_name)
            .field("cache_ttl", &self.cache_ttl)
            .field("probe_count", &probe_count)
            .field("cached_count", &cached_count)
            .finish_non_exhaustive()
    }
}

impl GrpcHealthState {
    pub fn new(service_name: impl Into<String>, cache_ttl: Duration) -> Self {
        Self {
            service_name: service_name.into(),
            probes: RwLock::new(HashMap::new()),
            cached: RwLock::new(HashMap::new()),
            cache_ttl,
        }
    }

    /// 注册一个依赖探针
    pub async fn register_probe(&self, probe: Arc<dyn DependencyProbe>) {
        let id = probe.id();
        debug!(probe_id = %id, kind = ?probe.kind(), "Registering health probe");
        self.probes.write().await.insert(id, probe);
    }

    /// 移除一个依赖探针
    pub async fn unregister_probe(&self, id: &str) {
        self.probes.write().await.remove(id);
        self.cached.write().await.remove(id);
    }

    /// 执行一次完整健康检查（聚合所有探针）
    pub async fn check(&self) -> GrpcHealthCheckResponse {
        let probes = self.probes.read().await;
        if probes.is_empty() {
            return GrpcHealthCheckResponse::serving(&self.service_name);
        }

        let mut dependencies = HashMap::with_capacity(probes.len());
        let mut has_critical_failure = false;
        let mut has_degraded = false;

        for (id, probe) in probes.iter() {
            let status = self.probe_one(id, probe).await;
            if probe.is_critical() && !status.is_healthy() {
                has_critical_failure = true;
            }
            if !status.is_healthy() {
                has_degraded = true;
            }
            dependencies.insert(id.clone(), status);
        }

        let (status, message) = if has_critical_failure {
            (
                GrpcHealthStatus::NotServing,
                "Critical dependency unhealthy".to_string(),
            )
        } else if has_degraded {
            (
                GrpcHealthStatus::Serving,
                "Service is healthy but some non-critical dependencies are degraded".to_string(),
            )
        } else {
            (
                GrpcHealthStatus::Serving,
                "All dependencies healthy".to_string(),
            )
        };

        GrpcHealthCheckResponse {
            service: self.service_name.clone(),
            status,
            message,
            checked_at: Utc::now(),
            dependencies,
        }
    }

    /// 执行单个探针（带缓存）
    async fn probe_one(&self, id: &str, probe: &Arc<dyn DependencyProbe>) -> GrpcHealthStatus {
        // 检查缓存
        let now = Utc::now();
        if let Some((status, ts)) = self.cached.read().await.get(id) {
            let elapsed = now
                .signed_duration_since(*ts)
                .to_std()
                .unwrap_or(self.cache_ttl);
            if elapsed < self.cache_ttl {
                return *status;
            }
        }

        // 执行探测
        let status = probe.probe().await;
        self.cached
            .write()
            .await
            .insert(id.to_string(), (status, Utc::now()));
        status
    }

    /// 启动后台周期性探测任务
    pub fn start_background_probe(self: Arc<Self>, interval: Duration) {
        tokio::spawn(async move {
            let mut ticker = tokio::time::interval(interval);
            ticker.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
            loop {
                ticker.tick().await;
                let response = self.check().await;
                if !response.status.is_healthy() {
                    warn!(
                        status = response.status.as_i32(),
                        service = %response.service,
                        "Health check indicates unhealthy state"
                    );
                }
            }
        });
    }

    /// 当前注册的探针数量
    pub async fn probe_count(&self) -> usize {
        self.probes.read().await.len()
    }
}

/// gRPC 健康检查服务（可直接作为 tonic service 使用）
///
/// 服务可包装此结构体实现自己的 `health_service_server::HealthService` trait。
pub struct GrpcHealthServer {
    state: Arc<GrpcHealthState>,
}

impl GrpcHealthServer {
    pub fn new(state: Arc<GrpcHealthState>) -> Self {
        Self { state }
    }

    pub async fn check(&self, service: &str) -> GrpcHealthCheckResponse {
        let mut response = self.state.check().await;
        response.service = service.to_string();
        response
    }

    /// 启动 watch 流（向 channel 推送周期性健康状态）
    pub async fn watch(
        &self,
        service: &str,
        tx: tokio::sync::mpsc::Sender<GrpcHealthCheckResponse>,
        interval: Duration,
    ) {
        let mut ticker = tokio::time::interval(interval);
        loop {
            ticker.tick().await;
            let response = self.check(service).await;
            if tx.send(response).await.is_err() {
                break;
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    struct AlwaysHealthy {
        id: String,
    }

    #[async_trait]
    impl DependencyProbe for AlwaysHealthy {
        fn id(&self) -> HealthProbeId {
            self.id.clone()
        }
        fn kind(&self) -> ProbeKind {
            ProbeKind::Database
        }
        fn is_critical(&self) -> bool {
            true
        }
        async fn probe(&self) -> GrpcHealthStatus {
            GrpcHealthStatus::Serving
        }
    }

    struct AlwaysUnhealthy;

    #[async_trait]
    impl DependencyProbe for AlwaysUnhealthy {
        fn id(&self) -> HealthProbeId {
            "always-unhealthy".to_string()
        }
        fn kind(&self) -> ProbeKind {
            ProbeKind::Cache
        }
        fn is_critical(&self) -> bool {
            false
        }
        async fn probe(&self) -> GrpcHealthStatus {
            GrpcHealthStatus::NotServing
        }
    }

    #[tokio::test]
    async fn test_empty_state_is_serving() {
        let state = GrpcHealthState::new("test-service", Duration::from_secs(60));
        let response = state.check().await;
        assert_eq!(response.status, GrpcHealthStatus::Serving);
        assert!(response.dependencies.is_empty());
    }

    #[tokio::test]
    async fn test_healthy_probe_returns_serving() {
        let state = GrpcHealthState::new("test-service", Duration::from_secs(60));
        state
            .register_probe(Arc::new(AlwaysHealthy {
                id: "db".to_string(),
            }))
            .await;
        let response = state.check().await;
        assert_eq!(response.status, GrpcHealthStatus::Serving);
        assert_eq!(response.dependencies.len(), 1);
        assert_eq!(response.dependencies["db"], GrpcHealthStatus::Serving);
    }

    #[tokio::test]
    async fn test_non_critical_failure_still_serving() {
        let state = GrpcHealthState::new("test-service", Duration::from_secs(60));
        state.register_probe(Arc::new(AlwaysUnhealthy)).await;
        let response = state.check().await;
        assert_eq!(response.status, GrpcHealthStatus::Serving);
        assert_eq!(
            response.dependencies["always-unhealthy"],
            GrpcHealthStatus::NotServing
        );
    }

    #[tokio::test]
    async fn test_status_conversion() {
        assert_eq!(GrpcHealthStatus::Serving.as_i32(), 1);
        assert_eq!(GrpcHealthStatus::NotServing.as_i32(), 2);
        assert_eq!(GrpcHealthStatus::from(1), GrpcHealthStatus::Serving);
        assert_eq!(GrpcHealthStatus::from(99), GrpcHealthStatus::Unknown);
    }

    #[tokio::test]
    async fn test_probe_registration() {
        let state = GrpcHealthState::new("test-service", Duration::from_secs(60));
        assert_eq!(state.probe_count().await, 0);
        state
            .register_probe(Arc::new(AlwaysHealthy {
                id: "db".to_string(),
            }))
            .await;
        assert_eq!(state.probe_count().await, 1);
        state.unregister_probe("db").await;
        assert_eq!(state.probe_count().await, 0);
    }
}
