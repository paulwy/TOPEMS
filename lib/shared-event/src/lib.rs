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
pub use consul::{
    try_register_service, ConsulClient, ConsulConfig, ConsulError, ConsulRegistrationGuard,
    HealthCheck, ServiceRegistration,
};
