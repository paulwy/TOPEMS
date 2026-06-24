use axum::{Router, Server};
use std::sync::Arc;
use tokio::sync::mpsc;
use tracing::{info, warn};
use topems_shared::{
    ConfigCenterClient, ConfigCenterOptions, ConfigChange, ConfigWatcher, WatchOptionsBuilder,
};

mod api;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize tracing
    tracing_subscriber::fmt::init();

    info!("🚀 Starting Config Center Service...");

    // Configure etcd connection
    let etcd_endpoints: Vec<String> = std::env::var("ETCD_ENDPOINTS")
        .unwrap_or_else(|_| "http://localhost:2379".to_string())
        .split(',')
        .map(|s| s.trim().to_string())
        .collect();

    info!("📡 Connecting to etcd: {:?}", etcd_endpoints);

    let options = ConfigCenterOptions {
        endpoints: etcd_endpoints,
        prefix: std::env::var("CONFIG_PREFIX").unwrap_or_else(|_| "/topems/config".to_string()),
        timeout_ms: Some(5000),
        tls_enabled: false,
    };

    // Create config center client
    let client = match ConfigCenterClient::new(options).await {
        Ok(c) => Arc::new(c),
        Err(e) => {
            warn!("⚠️ Failed to connect to etcd, running in standalone mode: {}", e);
            return Err(e.into());
        }
    };

    info!("✅ Config Center client initialized");

    // Start config watcher for hot reload
    start_config_watcher(Arc::clone(&client)).await;

    // Create routes
    let app = Router::new()
        .merge(api::config::create_routes(Arc::clone(&client)))
        .layer(axum::middleware::from_fn(trace_middleware));

    // Get port from environment or use default
    let port: u16 = std::env::var("PORT")
        .unwrap_or_else(|_| "8088".to_string())
        .parse()
        .unwrap_or(8088);

    info!("🌐 Starting server on http://0.0.0.0:{}", port);

    Server::bind(&([0, 0, 0, 0], port).into())
        .serve(app.into_make_service())
        .await?;

    Ok(())
}

async fn start_config_watcher(client: Arc<ConfigCenterClient>) {
    let (tx, mut rx) = mpsc::channel(100);

    let filter = WatchOptionsBuilder::new().build();
    let mut watcher = client.create_watcher_with_filter(filter).with_notify_channel(tx);

    if let Err(e) = watcher.start().await {
        warn!("⚠️ Failed to start config watcher: {}", e);
        return;
    }

    info!("🔍 Config watcher started");

    tokio::spawn(async move {
        while let Some(change) = rx.recv().await {
            handle_config_change(&change).await;
        }
    });
}

async fn handle_config_change(change: &ConfigChange) {
    info!(
        "🔄 Config changed: {} {} {} -> {}",
        change.change_type,
        change.service,
        change.key,
        change.new_value.as_deref().unwrap_or("(deleted)")
    );

    // Here you can add logic to handle specific config changes
    // For example, you could:
    // 1. Notify other services about the change
    // 2. Update internal caches
    // 3. Trigger specific actions based on the config key
}

async fn trace_middleware<B>(
    request: axum::extract::Request<B>,
    next: axum::middleware::Next<B>,
) -> axum::response::Response {
    let method = request.method().to_string();
    let path = request.uri().path().to_string();

    let start = std::time::Instant::now();
    let response = next.run(request).await;
    let duration = start.elapsed();
    let status = response.status().as_u16();

    info!(
        method = %method,
        path = %path,
        status = %status,
        duration_ms = %duration.as_millis(),
        "Request completed"
    );

    response
}
