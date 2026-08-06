use axum::{routing::get, routing::post, routing::put, Router};
use topems_shared_bootstrap::{bootstrap_service, build_application, run, ServiceConfig};
use utoipa::OpenApi;

mod handlers;
mod models;
mod openapi;

#[tokio::main]
async fn main() {
    let config = ServiceConfig {
        name: "topems-billing",
        port: 8085,
        port_env_var: Some("BILLING_PORT"),
        max_db_connections: 20,
        enable_events: false,
        enable_rls: true,
        enable_request_context: true,
        api_prefix: "/api/billing",
        legacy_prefixes: &["/api/v1/billing"],
    };

    let ctx = match bootstrap_service(&config).await {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("❌ Failed to bootstrap billing service: {}", e);
            std::process::exit(1);
        }
    };

    handlers::init_database(&ctx.db)
        .await
        .expect("Failed to init billing database");
    tracing::info!("✅ Billing database initialized");

    let public_routes = Router::new().route(
        "/health",
        get(|| async {
            axum::Json(serde_json::json!({
                "status": "healthy",
                "service": "topems-billing",
                "timestamp": chrono::Utc::now().to_rfc3339(),
            }))
        }),
    );

    let protected_routes = Router::new()
        .route("/plans", get(handlers::list_plans))
        .route("/plans/{id}", get(handlers::get_plan))
        .route(
            "/subscriptions/{tenant_id}",
            get(handlers::get_subscription),
        )
        .route("/subscriptions", post(handlers::create_subscription))
        .route(
            "/subscriptions/{tenant_id}",
            put(handlers::cancel_subscription),
        )
        .route("/invoices/{tenant_id}", get(handlers::list_invoices))
        .route("/usage/{tenant_id}", get(handlers::get_usage_summary))
        .route(
            "/usage/{tenant_id}/{metric_type}",
            post(handlers::record_usage),
        )
        .with_state(ctx.db.clone());

    let openapi_json = Some(
        serde_json::to_string(&openapi::BillingApiDoc::openapi())
            .unwrap_or_else(|_| "{}".to_string()),
    );

    let app = build_application(&ctx, &config, public_routes, protected_routes, openapi_json);

    tracing::info!(
        "📋 Billing API prefix: {} (legacy: {:?})",
        config.api_prefix,
        config.legacy_prefixes
    );

    if let Err(e) = run(app).await {
        tracing::error!("Server error: {}", e);
    }
}
