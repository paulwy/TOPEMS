use axum::{
    extract::{State, FromRef},
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::sync::{Arc, Mutex};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use uuid::Uuid;
use chrono::Utc;
use topems_shared::{ApiResponse, AuthState, auth_middleware, create_cors_layer};

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ProductionPlan {
    id: String,
    product_name: String,
    product_code: String,
    planned_quantity: i32,
    start_date: String,
    end_date: String,
    status: String,
    created_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct CreateProductionPlanRequest {
    product_name: String,
    product_code: String,
    planned_quantity: i32,
    start_date: String,
    end_date: String,
    created_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SupplyChainOrder {
    id: String,
    order_type: String,
    material_name: String,
    quantity: i32,
    supplier_customer: String,
    status: String,
    order_date: String,
    expected_date: String,
    created_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct CreateSupplyChainOrderRequest {
    order_type: String,
    material_name: String,
    quantity: i32,
    supplier_customer: String,
    expected_date: String,
    created_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct FinancialRecord {
    id: String,
    record_type: String,
    description: String,
    amount: f64,
    category: String,
    date: String,
    reference_number: String,
    created_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct CreateFinancialRecordRequest {
    record_type: String,
    description: String,
    amount: f64,
    category: String,
    reference_number: String,
    created_by: String,
}

#[derive(Clone)]
struct AppState {
    production_plans: Arc<Mutex<Vec<ProductionPlan>>>,
    supply_chain_orders: Arc<Mutex<Vec<SupplyChainOrder>>>,
    financial_records: Arc<Mutex<Vec<FinancialRecord>>>,
    auth_state: AuthState,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

impl AppState {
    fn new(auth_state: AuthState) -> Self {
        let now = Utc::now().format("%Y-%m-%d").to_string();
        let next_week = (Utc::now() + chrono::Duration::days(7)).format("%Y-%m-%d").to_string();
        let next_month = (Utc::now() + chrono::Duration::days(30)).format("%Y-%m-%d").to_string();
        
        AppState {
            production_plans: Arc::new(Mutex::new(vec![
                ProductionPlan {
                    id: Uuid::new_v4().to_string(),
                    product_name: "高性能复合材料 A".to_string(),
                    product_code: "MAT-A-001".to_string(),
                    planned_quantity: 1000,
                    start_date: now.clone(),
                    end_date: next_week.clone(),
                    status: "计划中".to_string(),
                    created_by: "生产经理".to_string(),
                },
            ])),
            supply_chain_orders: Arc::new(Mutex::new(vec![
                SupplyChainOrder {
                    id: Uuid::new_v4().to_string(),
                    order_type: "采购".to_string(),
                    material_name: "化工原料 X".to_string(),
                    quantity: 500,
                    supplier_customer: "供应商 A".to_string(),
                    status: "待处理".to_string(),
                    order_date: now.clone(),
                    expected_date: next_month.clone(),
                    created_by: "采购员".to_string(),
                },
            ])),
            financial_records: Arc::new(Mutex::new(vec![
                FinancialRecord {
                    id: Uuid::new_v4().to_string(),
                    record_type: "收入".to_string(),
                    description: "产品销售订单".to_string(),
                    amount: 50000.0,
                    category: "销售收入".to_string(),
                    date: now.clone(),
                    reference_number: "INV-2026-001".to_string(),
                    created_by: "财务".to_string(),
                },
            ])),
            auth_state,
        }
    }
}

async fn home() -> &'static str {
    "TOPEMS Backend System API"
}

async fn health() -> ApiResponse<String> {
    ApiResponse::success("TOPEMS Backend is running!".to_string(), "OK")
}

async fn get_production_plans(State(state): State<Arc<AppState>>) -> ApiResponse<Vec<ProductionPlan>> {
    let plans = state.production_plans.lock().unwrap().clone();
    ApiResponse::success(plans, "Success")
}

async fn create_production_plan(
    State(state): State<Arc<AppState>>,
    axum::Json(request): axum::Json<CreateProductionPlanRequest>,
) -> ApiResponse<ProductionPlan> {
    let plan = ProductionPlan {
        id: Uuid::new_v4().to_string(),
        product_name: request.product_name,
        product_code: request.product_code,
        planned_quantity: request.planned_quantity,
        start_date: request.start_date,
        end_date: request.end_date,
        status: "计划中".to_string(),
        created_by: request.created_by,
    };

    state.production_plans.lock().unwrap().push(plan.clone());
    
    ApiResponse::success(plan, "创建成功")
}

async fn get_supply_chain_orders(State(state): State<Arc<AppState>>) -> ApiResponse<Vec<SupplyChainOrder>> {
    let orders = state.supply_chain_orders.lock().unwrap().clone();
    ApiResponse::success(orders, "Success")
}

async fn create_supply_chain_order(
    State(state): State<Arc<AppState>>,
    axum::Json(request): axum::Json<CreateSupplyChainOrderRequest>,
) -> ApiResponse<SupplyChainOrder> {
    let now = Utc::now().format("%Y-%m-%d").to_string();
    let order = SupplyChainOrder {
        id: Uuid::new_v4().to_string(),
        order_type: request.order_type,
        material_name: request.material_name,
        quantity: request.quantity,
        supplier_customer: request.supplier_customer,
        status: "待处理".to_string(),
        order_date: now,
        expected_date: request.expected_date,
        created_by: request.created_by,
    };

    state.supply_chain_orders.lock().unwrap().push(order.clone());
    
    ApiResponse::success(order, "创建成功")
}

async fn get_financial_records(State(state): State<Arc<AppState>>) -> ApiResponse<Vec<FinancialRecord>> {
    let records = state.financial_records.lock().unwrap().clone();
    ApiResponse::success(records, "Success")
}

async fn create_financial_record(
    State(state): State<Arc<AppState>>,
    axum::Json(request): axum::Json<CreateFinancialRecordRequest>,
) -> ApiResponse<FinancialRecord> {
    let now = Utc::now().format("%Y-%m-%d").to_string();
    let record = FinancialRecord {
        id: Uuid::new_v4().to_string(),
        record_type: request.record_type,
        description: request.description,
        amount: request.amount,
        category: request.category,
        date: now,
        reference_number: request.reference_number,
        created_by: request.created_by,
    };

    state.financial_records.lock().unwrap().push(record.clone());
    
    ApiResponse::success(record, "创建成功")
}

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "topems_backend=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("🚀 TOPEMS Backend System starting...");
    dotenv::dotenv().ok();

    let jwt_secret = std::env::var("JWT_SECRET")
        .unwrap_or_else(|_| {
            tracing::warn!("JWT_SECRET not set, using default (not recommended for production)");
            "topems-default-jwt-secret-change-me-in-production".to_string()
        });

    let auth_state = AuthState::new(jwt_secret);
    let state = Arc::new(AppState::new(auth_state.clone()));

    let cors = create_cors_layer();

    let app = Router::new()
        .route("/", get(home))
        .route("/health", get(health))
        .route("/api/v1/production-plans", get(get_production_plans).post(create_production_plan))
        .route("/api/v1/supply-chain-orders", get(get_supply_chain_orders).post(create_supply_chain_order))
        .route("/api/v1/financial-records", get(get_financial_records).post(create_financial_record))
        .layer(axum::middleware::from_fn_with_state(
            auth_state,
            auth_middleware,
        ))
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
