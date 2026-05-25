use axum::{
    extract::State,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::sync::{Arc, Mutex};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use uuid::Uuid;
use chrono::Utc;

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

#[derive(Debug)]
struct AppState {
    production_plans: Mutex<Vec<ProductionPlan>>,
    supply_chain_orders: Mutex<Vec<SupplyChainOrder>>,
    financial_records: Mutex<Vec<FinancialRecord>>,
}

impl AppState {
    fn new() -> Self {
        let now = Utc::now().format("%Y-%m-%d").to_string();
        let next_week = (Utc::now() + chrono::Duration::days(7)).format("%Y-%m-%d").to_string();
        let next_month = (Utc::now() + chrono::Duration::days(30)).format("%Y-%m-%d").to_string();
        
        AppState {
            production_plans: Mutex::new(vec![
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
            ]),
            supply_chain_orders: Mutex::new(vec![
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
            ]),
            financial_records: Mutex::new(vec![
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
            ]),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
struct ApiResponse<T> {
    success: bool,
    data: Option<T>,
    message: String,
}

async fn home() -> &'static str {
    "TOPEMS ERP System API"
}

async fn health() -> Json<ApiResponse<String>> {
    Json(ApiResponse {
        success: true,
        data: Some("TOPEMS ERP is running!".to_string()),
        message: "OK".to_string(),
    })
}

async fn get_production_plans(State(state): State<Arc<AppState>>) -> Json<ApiResponse<Vec<ProductionPlan>>> {
    let plans = state.production_plans.lock().unwrap().clone();
    Json(ApiResponse {
        success: true,
        data: Some(plans),
        message: "Success".to_string(),
    })
}

async fn create_production_plan(
    State(state): State<Arc<AppState>>,
    Json(request): Json<CreateProductionPlanRequest>,
) -> Json<ApiResponse<ProductionPlan>> {
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
    
    Json(ApiResponse {
        success: true,
        data: Some(plan),
        message: "创建成功".to_string(),
    })
}

async fn get_supply_chain_orders(State(state): State<Arc<AppState>>) -> Json<ApiResponse<Vec<SupplyChainOrder>>> {
    let orders = state.supply_chain_orders.lock().unwrap().clone();
    Json(ApiResponse {
        success: true,
        data: Some(orders),
        message: "Success".to_string(),
    })
}

async fn create_supply_chain_order(
    State(state): State<Arc<AppState>>,
    Json(request): Json<CreateSupplyChainOrderRequest>,
) -> Json<ApiResponse<SupplyChainOrder>> {
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
    
    Json(ApiResponse {
        success: true,
        data: Some(order),
        message: "创建成功".to_string(),
    })
}

async fn get_financial_records(State(state): State<Arc<AppState>>) -> Json<ApiResponse<Vec<FinancialRecord>>> {
    let records = state.financial_records.lock().unwrap().clone();
    Json(ApiResponse {
        success: true,
        data: Some(records),
        message: "Success".to_string(),
    })
}

async fn create_financial_record(
    State(state): State<Arc<AppState>>,
    Json(request): Json<CreateFinancialRecordRequest>,
) -> Json<ApiResponse<FinancialRecord>> {
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
    
    Json(ApiResponse {
        success: true,
        data: Some(record),
        message: "创建成功".to_string(),
    })
}

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "topems_erp=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("🚀 TOPEMS ERP System starting...");
    dotenv::dotenv().ok();

    let state = Arc::new(AppState::new());

    let cors = tower_http::cors::CorsLayer::new()
        .allow_origin(tower_http::cors::Any)
        .allow_methods(tower_http::cors::Any)
        .allow_headers(tower_http::cors::Any);

    let app = Router::new()
        .route("/", get(home))
        .route("/health", get(health))
        .route("/api/v1/production-plans", get(get_production_plans).post(create_production_plan))
        .route("/api/v1/supply-chain-orders", get(get_supply_chain_orders).post(create_supply_chain_order))
        .route("/api/v1/financial-records", get(get_financial_records).post(create_financial_record))
        .layer(cors)
        .with_state(state);

    let host = std::env::var("SERVER_HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let port = std::env::var("SERVER_PORT")
        .unwrap_or_else(|_| "8009".to_string())
        .parse()
        .unwrap_or(8009);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("✅ TOPEMS ERP running on http://{}", addr);

    axum::serve(
        tokio::net::TcpListener::bind(&addr).await.unwrap(),
        app.into_make_service(),
    )
    .await
    .unwrap();
}
