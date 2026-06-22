import os

services = {
    'mes': {
        'port': 8030,
        'env_var': 'MES_PORT',
        'service_name': 'topems-mes',
        'module_name': 'mes',
        'routes': [
            ('/api/mfg/production-order', 'get', 'list_production_orders'),
            ('/api/mfg/production-order', 'post', 'create_production_order'),
            ('/api/mfg/production-order/{id}', 'get', 'get_production_order'),
            ('/api/mfg/production-order/{id}', 'put', 'update_production_order'),
            ('/api/mfg/production-order/{id}', 'delete', 'delete_production_order'),
            ('/api/mfg/production-order/{id}/start', 'post', 'start_production_order'),
            ('/api/mfg/production-order/{id}/complete', 'post', 'complete_production_order'),
            ('/api/mfg/production-order/{id}/cancel', 'post', 'cancel_production_order'),
            ('/api/mfg/process', 'get', 'list_processes'),
            ('/api/mfg/process', 'post', 'create_process'),
            ('/api/mfg/process/{id}', 'get', 'get_process'),
            ('/api/mfg/process/{id}', 'put', 'update_process'),
            ('/api/mfg/process/{id}', 'delete', 'delete_process'),
            ('/api/mfg/record', 'get', 'list_records'),
            ('/api/mfg/record', 'post', 'create_record'),
            ('/api/mfg/record/{id}', 'get', 'get_record'),
            ('/api/mfg/equipment', 'get', 'list_equipment'),
            ('/api/mfg/equipment', 'post', 'create_equipment'),
            ('/api/mfg/equipment/{id}', 'get', 'get_equipment'),
            ('/api/mfg/equipment/{id}', 'put', 'update_equipment'),
            ('/api/mfg/work-station', 'get', 'list_work_stations'),
            ('/api/mfg/work-station', 'post', 'create_work_station'),
            ('/api/mfg/work-station/{id}', 'get', 'get_work_station'),
            ('/api/mfg/work-station/{id}', 'put', 'update_work_station'),
        ],
        'has_plugin': True,
    },
    'pdm': {
        'port': 8031,
        'env_var': 'PDM_PORT',
        'service_name': 'topems-pdm',
        'module_name': 'pdm',
        'routes': [
            ('/api/mfg/pdm/product', 'get', 'list_products'),
            ('/api/mfg/pdm/product', 'post', 'create_product'),
            ('/api/mfg/pdm/product/{id}', 'get', 'get_product'),
            ('/api/mfg/pdm/product/{id}', 'put', 'update_product'),
            ('/api/mfg/pdm/product/{id}', 'delete', 'delete_product'),
            ('/api/mfg/pdm/material', 'get', 'list_materials'),
            ('/api/mfg/pdm/material', 'post', 'create_material'),
            ('/api/mfg/pdm/material/{id}', 'get', 'get_material'),
            ('/api/mfg/pdm/material/{id}', 'put', 'update_material'),
            ('/api/mfg/pdm/configuration', 'get', 'list_configurations'),
            ('/api/mfg/pdm/configuration', 'post', 'create_configuration'),
            ('/api/mfg/pdm/configuration/{id}', 'get', 'get_configuration'),
            ('/api/mfg/pdm/configuration/{id}', 'put', 'update_configuration'),
            ('/api/mfg/pdm/document', 'get', 'list_documents'),
            ('/api/mfg/pdm/document', 'post', 'create_document'),
            ('/api/mfg/pdm/document/{id}', 'get', 'get_document'),
            ('/api/mfg/pdm/document/{id}', 'put', 'update_document'),
            ('/api/mfg/pdm/version', 'get', 'list_versions'),
            ('/api/mfg/pdm/version', 'post', 'create_version'),
            ('/api/mfg/pdm/version/{id}', 'get', 'get_version'),
            ('/api/mfg/pdm/version/{id}', 'put', 'update_version'),
        ],
        'has_plugin': False,
    },
}

for name, info in services.items():
    routes_code = '\n'.join([
        f'.route("{path}", {method}(modules::{info["module_name"]}::{handler}))'
        for path, method, handler in info['routes']
    ])
    
    plugin_routes = ''
    auto_register = ''
    if info['has_plugin']:
        plugin_routes = f'''        .route("/api/plugins/info", get(modules::{info["module_name"]}::plugin::get_plugin_info))
        .route("/api/plugins/health", get(modules::{info["module_name"]}::plugin::plugin_health_check))'''
        auto_register = f'''    let core_url = std::env::var("CORE_URL").ok();
    tokio::spawn(async move {{
        modules::{info["module_name"]}::plugin::auto_register_to_core(core_url.as_deref()).await;
    }});'''
    
    content = f'''//! TOPEMS {name.upper()} Service

#![allow(clippy::match_like_matches_macro)]
#![allow(clippy::manual_ok_err)]
#![allow(clippy::redundant_pattern_matching)]
#![allow(clippy::useless_format)]
#![allow(clippy::useless_vec)]
#![allow(clippy::clone_on_copy)]
#![allow(clippy::identity_op)]
#![allow(clippy::needless_borrows_for_generic_args)]
#![allow(clippy::unnecessary_cast)]
#![allow(clippy::redundant_closure)]
#![allow(dead_code)]

mod modules;

use std::net::SocketAddr;

use axum::{{extract::State, routing::get, Json, Router}};
use axum_prometheus::PrometheusMetricLayer;
use sqlx::PgPool;

use topems_shared::{{auth_middleware, create_cors_layer, get_api_info_handler, init_logging, simple_health_check, ApiResponse, AuthState, ServiceHealth, SimpleHealthConfig}};

#[derive(Clone)]
pub struct AppState {{
    pub auth_state: AuthState,
    pub pool: PgPool,
    pub health_config: SimpleHealthConfig,
}}

impl axum::extract::FromRef<AppState> for AuthState {{
    fn from_ref(state: &AppState) -> Self {{
        state.auth_state.clone()
    }}
}}

#[tokio::main]
async fn main() {{
    _ = dotenv::dotenv();
    init_logging("{info["service_name"]}");
    tracing::info!("TOPEMS {name.upper()} Service starting...");

    let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| "postgres://topems:topems_secret@localhost:5432/topems".to_string());

    let pool = match sqlx::postgres::PgPoolOptions::new().max_connections(10).connect(&database_url).await {{
        Ok(p) => {{ tracing::info!("Database connection successful"); p }}
        Err(e) => {{ tracing::error!("Failed to connect to database: {{}}", e); panic!("Cannot connect to database: {{}}", e); }}
    }};

    if let Err(e) = modules::{info["module_name"]}::init_database(&pool).await {{
        tracing::warn!("{name.upper()} database init warning: {{}}", e);
    }}

    let auth_state = AuthState::from_env();
    let health_config = SimpleHealthConfig::new("{info["service_name"]}").with_db(pool.clone());

    let state = AppState {{ auth_state, pool, health_config }};
    let cors = create_cors_layer();
    let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();

    let public_routes = Router::new()
        .route("/", get(home))
        .route("/health", get(health))
        .route("/api", get(|| get_api_info_handler("{name}-service")))
        .route("/api/info", get(|| get_api_info_handler("{name}-service")))
{plugin_routes}
        .route("/metrics", get(move || async move {{ metric_handle.render() }}));

    let protected_routes = Router::new()
{routes_code}
        .route("/api/v1/health/detailed", get(detailed_health))
        .layer(axum::middleware::from_fn_with_state(state.auth_state.clone(), auth_middleware));

    let app = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .layer(cors)
        .layer(prometheus_layer)
        .with_state(state);

    let port = std::env::var("{info["env_var"]}").unwrap_or_else(|_| "{info["port"]}".to_string()).parse().unwrap_or({info["port"]});
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("{name.upper()} Service is running at http://{{}}", addr);

{auto_register}

    axum::serve(tokio::net::TcpListener::bind(&addr).await.unwrap(), app.into_make_service()).await.unwrap();
}}

async fn home() -> &'static str {{
    "TOPEMS {name.upper()} Service API\\n\\n- /health - Health check"
}}

async fn health(State(state): State<AppState>) -> ServiceHealth {{
    simple_health_check(&state.health_config).await
}}

async fn detailed_health(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {{
    let db_status = match sqlx::query("SELECT 1").fetch_one(&state.pool).await {{
        Ok(_) => "healthy", Err(_) => "unhealthy",
    }};
    let response = serde_json::json!({{
        "service": "{name}-service", "status": if db_status == "healthy" {{ "healthy" }} else {{ "unhealthy" }},
        "timestamp": chrono::Utc::now().to_rfc3339(), "version": "1.0.0"
    }});
    Json(ApiResponse::success(response, "Detailed health check"))
}}
'''
    
    file_path = f'/Users/xingzhai/TOPEMS/svc/{name}/src/main.rs'
    with open(file_path, 'w') as f:
        f.write(content)
    print(f'Created {name}/main.rs')

print('Done!')
