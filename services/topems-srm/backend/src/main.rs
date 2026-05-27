use anyhow::Result;
use axum::{
    extract::{FromRef, State},
    routing::{delete, get, post, put},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use chrono::{Utc, DateTime};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use uuid::Uuid;
use std::env;

use topems_shared::{ApiResponse, AuthState, auth_middleware, create_cors_layer};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Supplier {
    pub id: Uuid,
    pub supplier_no: String,
    pub name: String,
    pub legal_name: Option<String>,
    pub category: String,
    pub status: String,
    pub tax_id: Option<String>,
    pub address: Option<String>,
    pub contact_person: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub website: Option<String>,
    pub credit_rating: Option<String>,
    pub risk_level: String,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSupplierRequest {
    pub supplier_no: String,
    pub name: String,
    pub legal_name: Option<String>,
    pub category: String,
    pub status: String,
    pub tax_id: Option<String>,
    pub address: Option<String>,
    pub contact_person: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub website: Option<String>,
    pub credit_rating: Option<String>,
    pub risk_level: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSupplierRequest {
    pub supplier_no: Option<String>,
    pub name: Option<String>,
    pub legal_name: Option<String>,
    pub category: Option<String>,
    pub status: Option<String>,
    pub tax_id: Option<String>,
    pub address: Option<String>,
    pub contact_person: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub website: Option<String>,
    pub credit_rating: Option<String>,
    pub risk_level: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SupplierEvaluation {
    pub id: Uuid,
    pub supplier_id: Uuid,
    pub evaluation_no: String,
    pub evaluation_date: DateTime<Utc>,
    pub evaluator: Option<String>,
    pub overall_score: Option<f64>,
    pub quality_score: Option<f64>,
    pub delivery_score: Option<f64>,
    pub service_score: Option<f64>,
    pub price_score: Option<f64>,
    pub comments: Option<String>,
    pub status: String,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSupplierEvaluationRequest {
    pub supplier_id: String,
    pub evaluation_no: String,
    pub evaluator: Option<String>,
    pub overall_score: Option<f64>,
    pub quality_score: Option<f64>,
    pub delivery_score: Option<f64>,
    pub service_score: Option<f64>,
    pub price_score: Option<f64>,
    pub comments: Option<String>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSupplierEvaluationRequest {
    pub supplier_id: Option<String>,
    pub evaluation_no: Option<String>,
    pub evaluator: Option<String>,
    pub overall_score: Option<f64>,
    pub quality_score: Option<f64>,
    pub delivery_score: Option<f64>,
    pub service_score: Option<f64>,
    pub price_score: Option<f64>,
    pub comments: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PurchaseOrder {
    pub id: Uuid,
    pub po_no: String,
    pub supplier_id: Uuid,
    pub order_date: DateTime<Utc>,
    pub expected_date: Option<DateTime<Utc>>,
    pub actual_date: Option<DateTime<Utc>>,
    pub total_amount: Option<f64>,
    pub currency: String,
    pub status: String,
    pub remarks: Option<String>,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePurchaseOrderRequest {
    pub po_no: String,
    pub supplier_id: String,
    pub expected_date: Option<String>,
    pub total_amount: Option<f64>,
    pub currency: String,
    pub status: String,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdatePurchaseOrderRequest {
    pub po_no: Option<String>,
    pub supplier_id: Option<String>,
    pub expected_date: Option<DateTime<Utc>>,
    pub actual_date: Option<DateTime<Utc>>,
    pub total_amount: Option<f64>,
    pub currency: Option<String>,
    pub status: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Clone)]
struct AppState {
    suppliers: Arc<Mutex<Vec<Supplier>>>,
    evaluations: Arc<Mutex<Vec<SupplierEvaluation>>>,
    purchase_orders: Arc<Mutex<Vec<PurchaseOrder>>>,
    auth_state: AuthState,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    dotenv::dotenv().ok();

    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("🚀 TOPEMS-SRM 供应商关系管理系统启动中...");

    let jwt_secret = env::var("JWT_SECRET")
        .unwrap_or_else(|_| {
            tracing::warn!("JWT_SECRET not set, using default (not recommended for production)");
            "topems-default-jwt-secret-change-me-in-production".to_string()
        });

    let app_state = AppState {
        suppliers: Arc::new(Mutex::new(Vec::new())),
        evaluations: Arc::new(Mutex::new(Vec::new())),
        purchase_orders: Arc::new(Mutex::new(Vec::new())),
        auth_state: AuthState::new(jwt_secret),
    };

    let cors = create_cors_layer();

    let app = Router::new()
        .route("/health", get(health))
        .route("/api/v1/suppliers", get(list_suppliers))
        .route("/api/v1/suppliers", post(create_supplier))
        .route("/api/v1/suppliers/{id}", get(get_supplier))
        .route("/api/v1/suppliers/{id}", put(update_supplier))
        .route("/api/v1/suppliers/{id}", delete(delete_supplier))
        .route("/api/v1/supplier-evaluations", get(list_evaluations))
        .route("/api/v1/supplier-evaluations", post(create_evaluation))
        .route("/api/v1/supplier-evaluations/{id}", get(get_evaluation))
        .route("/api/v1/supplier-evaluations/{id}", put(update_evaluation))
        .route("/api/v1/supplier-evaluations/{id}", delete(delete_evaluation))
        .route("/api/v1/purchase-orders", get(list_purchase_orders))
        .route("/api/v1/purchase-orders", post(create_purchase_order))
        .route("/api/v1/purchase-orders/{id}", get(get_purchase_order))
        .route("/api/v1/purchase-orders/{id}", put(update_purchase_order))
        .route("/api/v1/purchase-orders/{id}", delete(delete_purchase_order))
        .layer(cors)
        .with_state(app_state);

    let port = env::var("SERVER_PORT")
        .unwrap_or_else(|_| "8015".to_string());
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("✅ TOPEMS-SRM 服务已启动在 http://{} (内存模式)", addr);
    tracing::info!("🔒 认证保护已启用");

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health() -> Json<ApiResponse<&'static str>> {
    Json(ApiResponse::success("TOPEMS-SRM is running! (Memory mode)", "健康检查"))
}

async fn list_suppliers(State(state): State<AppState>) -> Json<ApiResponse<Vec<Supplier>>> {
    let suppliers = state.suppliers.lock().unwrap().clone();
    let mut sorted = suppliers;
    sorted.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Json(ApiResponse::success(sorted, "Suppliers retrieved successfully"))
}

async fn create_supplier(
    State(state): State<AppState>,
    Json(req): Json<CreateSupplierRequest>,
) -> Json<ApiResponse<Supplier>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let supplier = Supplier {
        id,
        supplier_no: req.supplier_no,
        name: req.name,
        legal_name: req.legal_name,
        category: req.category,
        status: req.status,
        tax_id: req.tax_id,
        address: req.address,
        contact_person: req.contact_person,
        phone: req.phone,
        email: req.email,
        website: req.website,
        credit_rating: req.credit_rating,
        risk_level: req.risk_level,
        created_by: None,
        created_at: now,
        updated_at: now,
    };

    state.suppliers.lock().unwrap().push(supplier.clone());
    Json(ApiResponse::success(supplier, "Supplier created successfully"))
}

async fn get_supplier(
    State(state): State<AppState>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
) -> Json<ApiResponse<Supplier>> {
    let suppliers = state.suppliers.lock().unwrap();
    if let Some(supplier) = suppliers.iter().find(|s| s.id == id) {
        Json(ApiResponse::success(supplier.clone(), "Supplier found"))
    } else {
        Json(ApiResponse::<Supplier>::error(404, "Supplier not found"))
    }
}

async fn update_supplier(
    State(state): State<AppState>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    Json(req): Json<UpdateSupplierRequest>,
) -> Json<ApiResponse<Supplier>> {
    let now = Utc::now();
    let mut suppliers = state.suppliers.lock().unwrap();
    if let Some(supplier) = suppliers.iter_mut().find(|s| s.id == id) {
        if let Some(v) = req.supplier_no { supplier.supplier_no = v; }
        if let Some(v) = req.name { supplier.name = v; }
        if let Some(v) = req.legal_name { supplier.legal_name = Some(v); }
        if let Some(v) = req.category { supplier.category = v; }
        if let Some(v) = req.status { supplier.status = v; }
        if let Some(v) = req.tax_id { supplier.tax_id = Some(v); }
        if let Some(v) = req.address { supplier.address = Some(v); }
        if let Some(v) = req.contact_person { supplier.contact_person = Some(v); }
        if let Some(v) = req.phone { supplier.phone = Some(v); }
        if let Some(v) = req.email { supplier.email = Some(v); }
        if let Some(v) = req.website { supplier.website = Some(v); }
        if let Some(v) = req.credit_rating { supplier.credit_rating = Some(v); }
        if let Some(v) = req.risk_level { supplier.risk_level = v; }
        supplier.updated_at = now;
        Json(ApiResponse::success(supplier.clone(), "Supplier updated successfully"))
    } else {
        Json(ApiResponse::<Supplier>::error(404, "Supplier not found"))
    }
}

async fn delete_supplier(
    State(state): State<AppState>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    let mut suppliers = state.suppliers.lock().unwrap();
    let initial_len = suppliers.len();
    suppliers.retain(|s| s.id != id);
    if suppliers.len() < initial_len {
        Json(ApiResponse::success(true, "Supplier deleted successfully"))
    } else {
        Json(ApiResponse::<bool>::error(404, "Supplier not found"))
    }
}

async fn list_evaluations(State(state): State<AppState>) -> Json<ApiResponse<Vec<SupplierEvaluation>>> {
    let evaluations = state.evaluations.lock().unwrap().clone();
    let mut sorted = evaluations;
    sorted.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Json(ApiResponse::success(sorted, "Evaluations retrieved successfully"))
}

async fn create_evaluation(
    State(state): State<AppState>,
    Json(req): Json<CreateSupplierEvaluationRequest>,
) -> Json<ApiResponse<SupplierEvaluation>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let supplier_uuid = Uuid::parse_str(&req.supplier_id).unwrap_or_else(|_| Uuid::new_v4());

    let evaluation = SupplierEvaluation {
        id,
        supplier_id: supplier_uuid,
        evaluation_no: req.evaluation_no,
        evaluation_date: now,
        evaluator: req.evaluator,
        overall_score: req.overall_score,
        quality_score: req.quality_score,
        delivery_score: req.delivery_score,
        service_score: req.service_score,
        price_score: req.price_score,
        comments: req.comments,
        status: req.status,
        created_by: None,
        created_at: now,
        updated_at: now,
    };

    state.evaluations.lock().unwrap().push(evaluation.clone());
    Json(ApiResponse::success(evaluation, "Evaluation created successfully"))
}

async fn get_evaluation(
    State(state): State<AppState>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
) -> Json<ApiResponse<SupplierEvaluation>> {
    let evaluations = state.evaluations.lock().unwrap();
    if let Some(evaluation) = evaluations.iter().find(|e| e.id == id) {
        Json(ApiResponse::success(evaluation.clone(), "Evaluation found"))
    } else {
        Json(ApiResponse::<SupplierEvaluation>::error(404, "Evaluation not found"))
    }
}

async fn update_evaluation(
    State(state): State<AppState>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    Json(req): Json<UpdateSupplierEvaluationRequest>,
) -> Json<ApiResponse<SupplierEvaluation>> {
    let now = Utc::now();
    let mut evaluations = state.evaluations.lock().unwrap();
    if let Some(evaluation) = evaluations.iter_mut().find(|e| e.id == id) {
        if let Some(v) = req.supplier_id {
            if let Ok(uuid) = Uuid::parse_str(&v) {
                evaluation.supplier_id = uuid;
            }
        }
        if let Some(v) = req.evaluation_no { evaluation.evaluation_no = v; }
        if let Some(v) = req.evaluator { evaluation.evaluator = Some(v); }
        if let Some(v) = req.overall_score { evaluation.overall_score = Some(v); }
        if let Some(v) = req.quality_score { evaluation.quality_score = Some(v); }
        if let Some(v) = req.delivery_score { evaluation.delivery_score = Some(v); }
        if let Some(v) = req.service_score { evaluation.service_score = Some(v); }
        if let Some(v) = req.price_score { evaluation.price_score = Some(v); }
        if let Some(v) = req.comments { evaluation.comments = Some(v); }
        if let Some(v) = req.status { evaluation.status = v; }
        evaluation.updated_at = now;
        Json(ApiResponse::success(evaluation.clone(), "Evaluation updated successfully"))
    } else {
        Json(ApiResponse::<SupplierEvaluation>::error(404, "Evaluation not found"))
    }
}

async fn delete_evaluation(
    State(state): State<AppState>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    let mut evaluations = state.evaluations.lock().unwrap();
    let initial_len = evaluations.len();
    evaluations.retain(|e| e.id != id);
    if evaluations.len() < initial_len {
        Json(ApiResponse::success(true, "Evaluation deleted successfully"))
    } else {
        Json(ApiResponse::<bool>::error(404, "Evaluation not found"))
    }
}

async fn list_purchase_orders(State(state): State<AppState>) -> Json<ApiResponse<Vec<PurchaseOrder>>> {
    let orders = state.purchase_orders.lock().unwrap().clone();
    let mut sorted = orders;
    sorted.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Json(ApiResponse::success(sorted, "Purchase orders retrieved successfully"))
}

async fn create_purchase_order(
    State(state): State<AppState>,
    Json(req): Json<CreatePurchaseOrderRequest>,
) -> Json<ApiResponse<PurchaseOrder>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let supplier_uuid = Uuid::parse_str(&req.supplier_id).unwrap_or_else(|_| Uuid::new_v4());

    let order = PurchaseOrder {
        id,
        po_no: req.po_no,
        supplier_id: supplier_uuid,
        order_date: now,
        expected_date: None,
        actual_date: None,
        total_amount: req.total_amount,
        currency: req.currency,
        status: req.status,
        remarks: req.remarks,
        created_by: None,
        created_at: now,
        updated_at: now,
    };

    state.purchase_orders.lock().unwrap().push(order.clone());
    Json(ApiResponse::success(order, "Purchase order created successfully"))
}

async fn get_purchase_order(
    State(state): State<AppState>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
) -> Json<ApiResponse<PurchaseOrder>> {
    let orders = state.purchase_orders.lock().unwrap();
    if let Some(order) = orders.iter().find(|o| o.id == id) {
        Json(ApiResponse::success(order.clone(), "Purchase order found"))
    } else {
        Json(ApiResponse::<PurchaseOrder>::error(404, "Purchase order not found"))
    }
}

async fn update_purchase_order(
    State(state): State<AppState>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
    Json(req): Json<UpdatePurchaseOrderRequest>,
) -> Json<ApiResponse<PurchaseOrder>> {
    let now = Utc::now();
    let mut orders = state.purchase_orders.lock().unwrap();
    if let Some(order) = orders.iter_mut().find(|o| o.id == id) {
        if let Some(v) = req.supplier_id {
            if let Ok(uuid) = Uuid::parse_str(&v) {
                order.supplier_id = uuid;
            }
        }
        if let Some(v) = req.po_no { order.po_no = v; }
        if let Some(v) = req.expected_date { order.expected_date = Some(v); }
        if let Some(v) = req.actual_date { order.actual_date = Some(v); }
        if let Some(v) = req.total_amount { order.total_amount = Some(v); }
        if let Some(v) = req.currency { order.currency = v; }
        if let Some(v) = req.status { order.status = v; }
        if let Some(v) = req.remarks { order.remarks = Some(v); }
        order.updated_at = now;
        Json(ApiResponse::success(order.clone(), "Purchase order updated successfully"))
    } else {
        Json(ApiResponse::<PurchaseOrder>::error(404, "Purchase order not found"))
    }
}

async fn delete_purchase_order(
    State(state): State<AppState>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    let mut orders = state.purchase_orders.lock().unwrap();
    let initial_len = orders.len();
    orders.retain(|o| o.id != id);
    if orders.len() < initial_len {
        Json(ApiResponse::success(true, "Purchase order deleted successfully"))
    } else {
        Json(ApiResponse::<bool>::error(404, "Purchase order not found"))
    }
}
