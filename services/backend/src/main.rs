use axum::{
    extract::{State, FromRef},
    routing::{get, post},
    Json,
    Router,
};
use std::net::SocketAddr;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use topems_shared::{ApiResponse, AuthState, auth_middleware, create_cors_layer};
use sqlx::PgPool;
use dotenv::dotenv;

use models::*;
use db::*;

mod models;
mod db;
mod error;
mod middleware;
mod services;
mod api;

#[derive(Clone)]
struct AppState {
    auth_state: AuthState,
    pool: PgPool,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

async fn home() -> &'static str {
    "TOPEMS Backend System API"
}

async fn health() -> Json<ApiResponse<String>> {
    Json(ApiResponse::success("TOPEMS Backend is running!".to_string(), "OK"))
}

async fn get_production_plans(State(state): State<AppState>) -> Json<ApiResponse<Vec<ProductionPlan>>> {
    let plans = match Repository::get_all_production_plans(&state.pool).await {
        Ok(p) => p,
        Err(e) => {
            tracing::error!("Failed to get production plans: {:?}", e);
            vec![]
        }
    };
    Json(ApiResponse::success(plans, "Success"))
}

async fn create_production_plan(
    State(state): State<AppState>,
    Json(request): Json<CreateProductionPlanRequest>,
) -> Json<ApiResponse<ProductionPlan>> {
    if let Err(e) = Repository::validate_production_plan(&request) {
        return Json(ApiResponse::error(400, &e));
    }

    match Repository::create_production_plan(&state.pool, request).await {
        Ok(plan) => Json(ApiResponse::success(plan, "创建成功")),
        Err(e) => {
            tracing::error!("Failed to create production plan: {}", e);
            Json(ApiResponse::error(500, &format!("创建失败: {}", e)))
        }
    }
}

async fn get_supply_chain_orders(State(state): State<AppState>) -> Json<ApiResponse<Vec<SupplyChainOrder>>> {
    let orders = Repository::get_all_supply_chain_orders(&state.pool)
        .await
        .unwrap_or_else(|e| {
            tracing::error!("Failed to get supply chain orders: {}", e);
            vec![]
        });
    Json(ApiResponse::success(orders, "Success"))
}

async fn create_supply_chain_order(
    State(state): State<AppState>,
    Json(request): Json<CreateSupplyChainOrderRequest>,
) -> Json<ApiResponse<SupplyChainOrder>> {
    if let Err(e) = Repository::validate_supply_chain_order(&request) {
        return Json(ApiResponse::error(400, &e));
    }

    match Repository::create_supply_chain_order(&state.pool, request).await {
        Ok(order) => Json(ApiResponse::success(order, "创建成功")),
        Err(e) => {
            tracing::error!("Failed to create supply chain order: {}", e);
            Json(ApiResponse::error(500, &format!("创建失败: {}", e)))
        }
    }
}

async fn get_financial_records(State(state): State<AppState>) -> Json<ApiResponse<Vec<FinancialRecord>>> {
    let records = Repository::get_all_financial_records(&state.pool)
        .await
        .unwrap_or_else(|e| {
            tracing::error!("Failed to get financial records: {}", e);
            vec![]
        });
    Json(ApiResponse::success(records, "Success"))
}

async fn create_financial_record(
    State(state): State<AppState>,
    Json(request): Json<CreateFinancialRecordRequest>,
) -> Json<ApiResponse<FinancialRecord>> {
    if let Err(e) = Repository::validate_financial_record(&request) {
        return Json(ApiResponse::error(400, &e));
    }

    match Repository::create_financial_record(&state.pool, request).await {
        Ok(record) => Json(ApiResponse::success(record, "创建成功")),
        Err(e) => {
            tracing::error!("Failed to create financial record: {}", e);
            Json(ApiResponse::error(500, &format!("创建失败: {}", e)))
        }
    }
}

async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(DatabaseSchema::init_tables())
        .execute(pool)
        .await?;
    Ok(())
}

#[tokio::main]
async fn main() {
    dotenv::dotenv().ok();
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "topems_backend=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("🚀 TOPEMS Backend System starting...");

    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://topems:topems_secret@localhost:5432/topems".to_string());

    let pool = match PgPool::connect(&database_url).await {
        Ok(p) => {
            tracing::info!("Database connection successful");
            if let Err(e) = init_database(&p).await {
                tracing::warn!("Database initialization warning: {}", e);
            }
            p
        }
        Err(e) => {
            tracing::error!("Failed to connect to database: {}", e);
            panic!("Cannot connect to database: {}", e);
        }
    };

    let auth_state = AuthState::from_env();
    let state = AppState { auth_state, pool };

    let cors = create_cors_layer();

    let public_routes = Router::new()
        .route("/", get(home))
        .route("/health", get(health));

    let protected_routes = Router::new()
        .route("/api/v1/production-plans", get(get_production_plans).post(create_production_plan))
        .route("/api/v1/supply-chain-orders", get(get_supply_chain_orders).post(create_supply_chain_order))
        .route("/api/v1/financial-records", get(get_financial_records).post(create_financial_record))
        .layer(axum::middleware::from_fn_with_state(
            state.auth_state.clone(),
            auth_middleware,
        ));

    let app = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .layer(cors)
        .with_state(state);

    let _host = std::env::var("SERVER_HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let port = std::env::var("SERVER_PORT")
        .unwrap_or_else(|_| "8009".to_string())
        .parse()
        .unwrap_or(8009);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("✅ TOPEMS Backend running on http://{}", addr);

    axum::serve(
        tokio::net::TcpListener::bind(&addr).await.unwrap(),
        app.into_make_service(),
    )
    .await
    .unwrap();
}
