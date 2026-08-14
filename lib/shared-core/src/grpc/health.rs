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

    // ===== Additional test fixtures =====

    struct CriticalUnhealthy;

    #[async_trait]
    impl DependencyProbe for CriticalUnhealthy {
        fn id(&self) -> HealthProbeId {
            "critical-unhealthy".to_string()
        }
        fn kind(&self) -> ProbeKind {
            ProbeKind::Database
        }
        fn is_critical(&self) -> bool {
            true
        }
        async fn probe(&self) -> GrpcHealthStatus {
            GrpcHealthStatus::NotServing
        }
    }

    struct CountingProbe {
        id: String,
        count: Arc<std::sync::atomic::AtomicU32>,
    }

    #[async_trait]
    impl DependencyProbe for CountingProbe {
        fn id(&self) -> HealthProbeId {
            self.id.clone()
        }
        fn kind(&self) -> ProbeKind {
            ProbeKind::Custom
        }
        fn is_critical(&self) -> bool {
            false
        }
        async fn probe(&self) -> GrpcHealthStatus {
            self.count.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
            GrpcHealthStatus::Serving
        }
    }

    // ===== Additional tests =====

    #[test]
    fn test_grpc_health_status_unknown_is_not_healthy() {
        assert!(!GrpcHealthStatus::Unknown.is_healthy());
    }

    #[test]
    fn test_grpc_health_status_service_unknown_is_not_healthy() {
        assert!(!GrpcHealthStatus::ServiceUnknown.is_healthy());
        assert!(GrpcHealthStatus::Serving.is_healthy());
        assert!(!GrpcHealthStatus::NotServing.is_healthy());
    }

    #[test]
    fn test_grpc_health_status_as_i32_all_variants() {
        assert_eq!(GrpcHealthStatus::Unknown.as_i32(), 0);
        assert_eq!(GrpcHealthStatus::Serving.as_i32(), 1);
        assert_eq!(GrpcHealthStatus::NotServing.as_i32(), 2);
        assert_eq!(GrpcHealthStatus::ServiceUnknown.as_i32(), 3);
    }

    #[test]
    fn test_grpc_health_status_from_i32_all_variants() {
        assert_eq!(GrpcHealthStatus::from(0), GrpcHealthStatus::Unknown);
        assert_eq!(GrpcHealthStatus::from(1), GrpcHealthStatus::Serving);
        assert_eq!(GrpcHealthStatus::from(2), GrpcHealthStatus::NotServing);
        assert_eq!(GrpcHealthStatus::from(3), GrpcHealthStatus::ServiceUnknown);
        // Out-of-range values fall back to Unknown
        assert_eq!(GrpcHealthStatus::from(-1), GrpcHealthStatus::Unknown);
        assert_eq!(GrpcHealthStatus::from(99), GrpcHealthStatus::Unknown);
    }

    #[test]
    fn test_grpc_health_check_response_serving_constructor() {
        let resp = GrpcHealthCheckResponse::serving("my-svc");
        assert_eq!(resp.service, "my-svc");
        assert_eq!(resp.status, GrpcHealthStatus::Serving);
        assert_eq!(resp.message, "Service is healthy");
        assert!(resp.dependencies.is_empty());
    }

    #[test]
    fn test_grpc_health_check_response_not_serving_constructor() {
        let resp = GrpcHealthCheckResponse::not_serving("my-svc", "DB down");
        assert_eq!(resp.service, "my-svc");
        assert_eq!(resp.status, GrpcHealthStatus::NotServing);
        assert_eq!(resp.message, "DB down");
        assert!(resp.dependencies.is_empty());
    }

    #[test]
    fn test_grpc_health_check_response_clone_preserves_fields() {
        let resp = GrpcHealthCheckResponse::serving("svc");
        let cloned = resp.clone();
        assert_eq!(cloned.service, resp.service);
        assert_eq!(cloned.status, resp.status);
        assert_eq!(cloned.message, resp.message);
    }

    #[test]
    fn test_probe_kind_variants_equality() {
        assert_eq!(ProbeKind::Database, ProbeKind::Database);
        assert_ne!(ProbeKind::Database, ProbeKind::Cache);
        assert_ne!(ProbeKind::Cache, ProbeKind::MessageQueue);
        assert_ne!(ProbeKind::MessageQueue, ProbeKind::DownstreamGrpc);
        assert_ne!(ProbeKind::DownstreamGrpc, ProbeKind::DownstreamHttp);
        assert_ne!(ProbeKind::DownstreamHttp, ProbeKind::Custom);
    }

    #[test]
    fn test_probe_kind_is_copy() {
        let a = ProbeKind::Database;
        let b = a; // Copy — no clone needed
        assert_eq!(a, b);
    }

    #[test]
    fn test_grpc_health_state_debug_format() {
        let state = GrpcHealthState::new("debug-svc", Duration::from_secs(30));
        let debug_str = format!("{:?}", state);
        assert!(debug_str.contains("GrpcHealthState"));
        assert!(debug_str.contains("debug-svc"));
        assert!(debug_str.contains("probe_count"));
    }

    #[tokio::test]
    async fn test_critical_failure_marks_not_serving() {
        let state = GrpcHealthState::new("test-service", Duration::from_secs(60));
        state.register_probe(Arc::new(CriticalUnhealthy)).await;
        let response = state.check().await;
        assert_eq!(response.status, GrpcHealthStatus::NotServing);
        assert!(response.message.contains("Critical"));
        assert_eq!(
            response.dependencies.get("critical-unhealthy"),
            Some(&GrpcHealthStatus::NotServing)
        );
    }

    #[tokio::test]
    async fn test_multiple_probes_mixed_statuses_stay_serving_when_non_critical_fails() {
        let state = GrpcHealthState::new("test-service", Duration::from_secs(60));
        // Critical healthy probe + non-critical unhealthy probe
        state
            .register_probe(Arc::new(AlwaysHealthy {
                id: "db-critical".to_string(),
            }))
            .await;
        state.register_probe(Arc::new(AlwaysUnhealthy)).await;
        let response = state.check().await;
        // Non-critical failure → still Serving but degraded message
        assert_eq!(response.status, GrpcHealthStatus::Serving);
        assert!(response.message.contains("degraded"));
        assert_eq!(response.dependencies.len(), 2);
    }

    #[tokio::test]
    async fn test_register_probe_overwrites_same_id() {
        let state = GrpcHealthState::new("test-svc", Duration::from_secs(60));
        state
            .register_probe(Arc::new(AlwaysHealthy {
                id: "dup".to_string(),
            }))
            .await;
        assert_eq!(state.probe_count().await, 1);
        // Re-registering with the same id should overwrite, not add
        state
            .register_probe(Arc::new(AlwaysHealthy {
                id: "dup".to_string(),
            }))
            .await;
        assert_eq!(state.probe_count().await, 1);
    }

    #[tokio::test]
    async fn test_grpc_health_server_check_sets_service_name() {
        let state = Arc::new(GrpcHealthState::new(
            "internal-name",
            Duration::from_secs(60),
        ));
        let server = GrpcHealthServer::new(state);
        let response = server.check("external-name").await;
        // The server overrides the service name with the one passed to check()
        assert_eq!(response.service, "external-name");
        assert_eq!(response.status, GrpcHealthStatus::Serving);
    }

    #[tokio::test]
    async fn test_probe_caching_within_ttl_avoids_reprobe() {
        let count = Arc::new(std::sync::atomic::AtomicU32::new(0));
        let state = GrpcHealthState::new("test-svc", Duration::from_secs(60));
        state
            .register_probe(Arc::new(CountingProbe {
                id: "counter".to_string(),
                count: count.clone(),
            }))
            .await;
        // First check — probe is invoked once and cached
        let _ = state.check().await;
        assert_eq!(count.load(std::sync::atomic::Ordering::SeqCst), 1);
        // Second check within TTL — cache hit, no new probe invocation
        let _ = state.check().await;
        assert_eq!(count.load(std::sync::atomic::Ordering::SeqCst), 1);
    }

    #[tokio::test]
    async fn test_grpc_health_server_watch_emits_responses() {
        let state = Arc::new(GrpcHealthState::new("test-svc", Duration::from_secs(60)));
        let server = GrpcHealthServer::new(state);
        let (tx, mut rx) = tokio::sync::mpsc::channel::<GrpcHealthCheckResponse>(8);
        // Spawn the watch loop in the background
        tokio::spawn(async move {
            server
                .watch("watched-svc", tx, Duration::from_millis(10))
                .await;
        });
        // Wait for at least one response (with a generous timeout)
        let resp = tokio::time::timeout(Duration::from_millis(500), rx.recv())
            .await
            .expect("timed out waiting for watch response")
            .expect("watch channel closed unexpectedly");
        assert_eq!(resp.service, "watched-svc");
        assert_eq!(resp.status, GrpcHealthStatus::Serving);
    }

    #[tokio::test]
    async fn test_unregister_probe_clears_cache() {
        let state = GrpcHealthState::new("test-svc", Duration::from_secs(60));
        state
            .register_probe(Arc::new(AlwaysHealthy {
                id: "temp".to_string(),
            }))
            .await;
        // Trigger a check to populate the cache
        let _ = state.check().await;
        assert_eq!(state.probe_count().await, 1);
        // Unregister should remove both the probe and its cache entry
        state.unregister_probe("temp").await;
        assert_eq!(state.probe_count().await, 0);
        // Subsequent check should return serving (empty state)
        let response = state.check().await;
        assert_eq!(response.status, GrpcHealthStatus::Serving);
    }
}
