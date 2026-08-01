//! V79-1: Bootstrap 初始化流程（从 main.rs SECTION 3 抽出）
//!
//! 负责：ServiceConfig 构造 → bootstrap_service → START_TIME → Prometheus 初始化 → 事件订阅者启动。
//! 后续拆分项（dotenv / panic hook 等）若迁入 ServiceConfig 内部，可在本文件逐步扩展。
//!
//! 设计说明：
//! - 为避免类型爆炸（内部仅返回具体值给 main 消费），对外暴露具名结构体 `BootstrapOutcome`。
//! - 所有 `use xxx::*;` 均在本文件内部显式声明，不与 main.rs 共享 use 区块。

use crate::event_handlers;
use crate::prelude::*;
use axum_prometheus::metrics_exporter_prometheus::PrometheusHandle;
use std::time::Instant;

/// Bootstrap 流程的产物，供 main.rs 后续阶段消费。
///
/// 字段说明：
/// - `config`    ：服务配置（后续端口解析等仍需使用）
/// - `ctx`       ：service_bootstrap 返回的服务上下文（DB / EventPublisher 等）
/// - `prometheus_layer` ：PrometheusMetricLayer，用于 Router layer
/// - `metric_handle`    ：Prometheus metrics handle（PrometheusHandle 而非 axum_prometheus::Handle）
/// - `custom_gauge`     ：自定义 Gauge 指标，保留引用供后续业务上报
pub struct BootstrapOutcome {
    pub config: ServiceConfig,
    pub ctx: topems_shared::service_bootstrap::ServiceContext,
    pub prometheus_layer: PrometheusMetricLayer<'static>,
    pub metric_handle: PrometheusHandle,
    pub custom_gauge: Gauge,
}

/// Portal 初始化入口（V79 新标准）。
///
/// 内部顺序：
/// 1. 构造 ServiceConfig
/// 2. 调用 `bootstrap_service(&config)` 完成 DB / RLS / Events / telemetry 等底层初始化
/// 3. 设置 `START_TIME` 全局启动时间戳（供 health_check 使用）
/// 4. 初始化 Prometheus metrics（PrometheusMetricLayer + custom_gauge 注册）
/// 5. 启动事件订阅者（失败仅 warn，不阻塞主流程）
///
/// # 错误
/// - `bootstrap_service` 失败时（DB 连接失败等）向上传播，由 tokio::main 处理
/// - 事件订阅者失败不返回错误，仅打印 warn 日志
pub async fn bootstrap_services() -> anyhow::Result<BootstrapOutcome> {
    let config = ServiceConfig {
        name: "topems-portal",
        port: 8063,
        port_env_var: Some("PORTAL_PORT"),
        max_db_connections: 5,
        enable_events: true,
        enable_rls: true,
        api_prefix: "/api/portal",
        legacy_prefixes: &["/api/v1/portal"],
        ..Default::default()
    };

    let ctx = bootstrap_service(&config).await?;
    crate::START_TIME.get_or_init(Instant::now);

    let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();
    let custom_gauge = Gauge::new(
        "topems_portal_custom_metric",
        "This is a custom metric for TOPEMS-PORTAL",
    )
    .unwrap_or_else(|e| {
        tracing::error!("Failed to create Prometheus gauge: {}", e);
        panic!("Prometheus gauge creation failed - check for duplicate metric registrations")
    });
    default_registry()
        .register(Box::new(custom_gauge.clone()))
        .unwrap_or_else(|e| {
            tracing::error!("Failed to register Prometheus gauge: {}", e);
            panic!(
                "Prometheus gauge registration failed - check for duplicate metric registrations"
            )
        });
    custom_gauge.set(42.0);
    tracing::info!("✅ Prometheus 监控已初始化");

    if let Err(e) =
        event_handlers::start_event_subscribers(ctx.db.clone(), ctx.event_publisher.clone()).await
    {
        tracing::warn!("⚠️ PORTAL 事件订阅者启动失败: {}", e);
    }

    Ok(BootstrapOutcome {
        config,
        ctx,
        prometheus_layer,
        metric_handle,
        custom_gauge,
    })
}
