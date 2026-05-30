use tracing::info;
use tracing_subscriber::{fmt, layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

pub fn init_logging(service_name: &str) {
    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info"));

    tracing_subscriber::registry()
        .with(filter)
        .with(fmt::Layer::new().with_target(true))
        .init();

    info!("🚀 {} 服务日志系统初始化完成", service_name);
}

pub fn init_logging_with_filter(service_name: &str, filter: Option<&str>) {
    let env_filter = if let Some(f) = filter {
        EnvFilter::new(f)
    } else {
        EnvFilter::try_from_default_env()
            .unwrap_or_else(|_| EnvFilter::new("info"))
    };

    tracing_subscriber::registry()
        .with(env_filter)
        .with(fmt::Layer::new().with_target(true))
        .init();

    info!("🚀 {} 服务日志系统初始化完成", service_name);
}