mod api;
mod models;
mod services;

use axum::{
    routing::get,
    serve, Json, Router,
};
use tokio::net::TcpListener;
use socket2::{Socket, Domain, Type, Protocol};
use topems_shared::{
    ApiResponse,
    AuthState,
    auth_middleware,
    create_cors_layer,
    init_logging,
    create_database_pool,
    test_database_connection,
    Config,
    Result,
    ServiceHealth,
    build_health_response,
    create_api_info_router,
};
use utoipa::OpenApi;

#[tokio::main]
async fn main() -> Result<()> {
    dotenv::dotenv().ok();

    init_logging("topems-lims");

    let config = Config::load().await?;
    tracing::info!("Configuration loaded, environment: {}", config.env());

    let pool = create_database_pool(&config.get_database().await).await?;
    test_database_connection(&pool).await?;

    if let Err(e) = init_db(&pool).await {
        tracing::warn!("数据库初始化警告: {}", e);
    }

    let auth_state = AuthState::from_env();

    let cors = create_cors_layer();

    let public_routes = Router::new()
        .route("/health", get(health_check))
        .route("/api-docs/openapi.json", get(serve_openapi_json));

    let protected_routes = Router::new()
        .merge(api::create_routes(pool.clone(), auth_state.clone(), config.clone()).await?)
        .layer(axum::middleware::from_fn_with_state(
            auth_state.clone(),
            auth_middleware,
        ));

    let app = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .merge(create_api_info_router("topems-lims"))
        .layer(cors);

    let port = config.get_server().await.port;
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-LIMS 实验室信息管理系统启动中...");
    tracing::info!("📦 端口: {}", port);
    tracing::info!("🔒 认证保护已启用");

    use std::net::SocketAddr;
    use std::os::fd::AsRawFd;
    use libc::{setsockopt, SOL_SOCKET, SO_REUSEADDR, SO_REUSEPORT};
    
    let socket = Socket::new(Domain::IPV4, Type::STREAM, Some(Protocol::TCP))?;
    
    let optval: libc::c_int = 1;
    unsafe {
        setsockopt(
            socket.as_raw_fd(),
            SOL_SOCKET,
            SO_REUSEADDR,
            &optval as *const _ as *const libc::c_void,
            std::mem::size_of::<libc::c_int>() as libc::socklen_t,
        );
        setsockopt(
            socket.as_raw_fd(),
            SOL_SOCKET,
            SO_REUSEPORT,
            &optval as *const _ as *const libc::c_void,
            std::mem::size_of::<libc::c_int>() as libc::socklen_t,
        );
    }
    
    let socket_addr: SocketAddr = addr.parse().unwrap();
    socket.bind(&socket_addr.into())?;
    socket.listen(1024)?;
    let listener = TcpListener::from_std(socket.into())?;
    serve(listener, app.into_make_service()).await?;

    Ok(())
}

async fn health_check() -> ServiceHealth {
    build_health_response("topems-lims", true)
}

async fn serve_openapi_json() -> axum::Json<utoipa::openapi::OpenApi> {
    axum::Json(api::openapi::ApiDoc::openapi())
}

async fn init_db(_pool: &sqlx::PgPool) -> Result<()> {
    Ok(())
}