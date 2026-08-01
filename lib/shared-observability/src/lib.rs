//! # TOPEMS Shared Observability
//!
//! 可观测性模块，提供遥测、监控、性能分析、告警等能力。
//!
//! 包含：OpenTelemetry 集成、链路追踪、指标采集、SLO 管理、
//! 日志查询、告警管理、性能监控等。

pub mod monitoring;
pub mod observability;
pub mod performance;
pub mod telemetry;

pub use monitoring::{
    default_alert_rules, Alert, AlertRule, AlertSeverity, MonitoringMetrics, MonitoringState,
    ServiceHealth as MonServiceHealth, ServiceStatus,
};
pub use observability::presets::{standard_slos_for_all_services, standard_slos_for_service};
pub use observability::{
    AlertEvent, AlertManager, AlertRule as ObservabilityAlertRule,
    AlertSeverity as ObservabilityAlertSeverity, AlertState, AlertStats, InMemoryLogStore,
    LogEntry as ObservabilityLogEntry, LogLevel, LogQuery as ObservabilityLogQuery, LogQueryError,
    LogQueryProvider, LogQueryResult, LogStats as ObservabilityLogStats, ObservabilityAggregator,
    ObservabilityDashboard, SLODefinition, SLOManager, SLOMeasurement, SLOReport, SLOStatus,
    SLOType,
};
pub use performance::{
    ApiCallMetrics, ApiStats, CacheMetrics, CacheOperationRecorder, ComprehensiveMetrics,
    ComprehensiveStats, DatabaseQueryMetrics, DatabaseQueryTimer, DatabaseStats, EndpointStats,
    MetricsSnapshot, PerformanceMetrics, RequestTimer, TableStats,
};
pub use telemetry::{
    get_current_trace_context, init_telemetry, inject_trace_context, telemetry_middleware,
    TelemetryConfig, TelemetryExporter, TelemetryExt, TelemetryGuard,
};
