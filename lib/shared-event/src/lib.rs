//! # TOPEMS Shared Event
//!
//! 事件驱动与缓存模块，提供事件总线、消息队列、Saga 分布式事务、缓存管理等能力。
//!
//! 包含：事件发布订阅、领域事件、消息代理（内存/Redis/RabbitMQ）、
//! Saga 编排器、分布式缓存、集群管理、配置中心、服务发现等。

pub mod cache;
pub mod cluster;
pub mod config_center;
pub mod consul;
pub mod event;
pub mod messaging;
pub mod redis;
pub mod saga;
pub mod service_discovery;

/// 通用测试辅助工具（Redis Pub/Sub 两阶段订阅 API、事件模拟等）。
///
/// **注意**：此模块公开导出，目的是让 **依赖 `topems-shared-event` 的其他服务 crate**
/// （如 `topems-master-data`、`topems-portal` 等）也能在自己的集成测试中复用同一套
/// `prepare_subscription` + `wait_for_match` 模式，避免在整个仓库中重复造轮子
/// 并防止"Future 惰性执行 → 发布先于订阅登记 → 消息丢失"的并发竞态反复出现。
///
/// # 为什么不用 `#[cfg(test)]`
/// Rust 中当 `topems-master-data` 以依赖身份引入 `topems-shared-event` 并运行
/// `cargo test -p topems-master-data` 时，`topems-shared-event` 是作为**非 test profile**
/// 编译的。如果此模块加了 `#[cfg(test)]`，外部服务的集成测试将无法 `use topems_shared_event::test_helpers`。
pub mod test_helpers;

// 细粒度 re-export
pub use cache::{
    CacheKeyGenerator, CacheManager, CacheStatistics, CacheWarmer, DistributedCacheManager,
    EvictionPolicy, InMemoryCache, MultiLevelCacheManager, MultiLevelCacheStatistics,
};
pub use cluster::{
    ClusterConfig, ClusterError, ClusterEvent, ClusterEventType, ClusterManager, ClusterMetrics,
    ClusterMode, EventSeverity, FailoverConfig, HealthCheckConfig, LoadBalancerConfig,
    LoadBalancingAlgorithm, NodeConfig, NodeHealth, NodeRole, NodeStatus,
};
pub use config_center::{
    ConfigAuditLog, ConfigCenter, ConfigSchema, ConfigType, ConfigVersion, ValidationRule,
};
pub use consul::{
    try_register_service, ConsulClient, ConsulConfig, ConsulError, ConsulRegistrationGuard,
    HealthCheck, ServiceRegistration,
};
pub use event::{
    CacheInvalidatedPayload, EhsAccidentReportedPayload, EhsHazardReportedPayload, Event,
    EventError, EventPublisher, EventResult, EventSubscriber, EventType,
    HrmDepartmentCreatedPayload, HrmDepartmentDeletedPayload, HrmDepartmentUpdatedPayload,
    HrmEmployeeCreatedPayload, HrmEmployeeUpdatedPayload, LimsInspectionAbnormalDetectedPayload,
    LimsInspectionResultSubmittedPayload, LimsSampleRegisteredPayload, MasterDataAction,
    MasterDataDomain, MasterDataEvent, MasterDataPublisher, MasterDataRef,
    PermissionChangedPayload, PmProjectCreatedPayload, PmProjectUpdatedPayload,
    PmTaskCreatedPayload, PmTaskDeletedPayload, PmTaskUpdatedPayload, PositionCreatedPayload,
    PositionDeletedPayload, PositionUpdatedPayload, QmsCorrectiveActionCreatedPayload,
    QmsInspectionCompletedPayload,
};
pub use messaging::{
    InMemoryMessageBroker, Message, MessageConsumer, MessageProducer, RedisMessageBroker,
};
pub use redis::{
    BloomFilter, CacheKeyGenerator as RedisCacheKeyGenerator, CacheProtectionConfig, CacheService,
    CacheStatisticsCollector, RedisCacheService, RedisPool, UnifiedCacheManager,
};
pub use saga::{
    InMemorySagaStore, PostgresSagaStore, SagaError, SagaInstance, SagaOrchestrator, SagaResult,
    SagaStatus, SagaStep, SagaStepDefinition, SagaStore, StepStatus,
};
pub use service_discovery::{
    ConsulDiscoveryClient, ConsulServiceRegistrar, LocalServiceRegistry, PortalServiceAggregator,
    ServiceCategory, ServiceDiscoveryClient, ServiceHealthStatus, ServiceInfo, ServiceInstance,
    ServiceRegistryStatus, SmartServiceClient,
};
