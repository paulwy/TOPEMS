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
struct InspectionRecord {
    id: String,
    batch_id: String,
    product_name: String,
    inspection_date: String,
    inspector: String,
    status: String,
    result_summary: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct CreateInspectionRequest {
    batch_id: String,
    product_name: String,
    inspector: String,
    status: String,
    result_summary: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct NonConformance {
    id: String,
    nc_id: String,
    description: String,
    severity: String,
    status: String,
    reported_date: String,
    department: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct CreateNonConformanceRequest {
    description: String,
    severity: String,
    department: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct QualityStandard {
    id: String,
    standard_code: String,
    title: String,
    version: String,
    effective_date: String,
    category: String,
    status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct CreateQualityStandardRequest {
    standard_code: String,
    title: String,
    version: String,
    effective_date: String,
    category: String,
}

#[derive(Debug)]
struct AppState {
    inspections: Mutex<Vec<InspectionRecord>>,
    nonconformances: Mutex<Vec<NonConformance>>,
    standards: Mutex<Vec<QualityStandard>>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ApiResponse<T> {
    success: bool,
    data: Option<T>,
    message: String,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "topems_qms=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("🚀 TOPEMS-QMS 质量合规管理系统启动中...");
    dotenv::dotenv().ok();

    let state = Arc::new(AppState {
        inspections: Mutex::new(vec![
            InspectionRecord {
                id: "1".to_string(),
                batch_id: "BATCH-2026-05-001".to_string(),
                product_name: "高性能复合材料 A".to_string(),
                inspection_date: "2026-05-20".to_string(),
                inspector: "张质检".to_string(),
                status: "合格".to_string(),
                result_summary: "各项性能指标均符合标准要求".to_string(),
            },
            InspectionRecord {
                id: "2".to_string(),
                batch_id: "BATCH-2026-05-002".to_string(),
                product_name: "环保胶粘剂 B".to_string(),
                inspection_date: "2026-05-21".to_string(),
                inspector: "李质检".to_string(),
                status: "待检".to_string(),
                result_summary: "检验中".to_string(),
            },
        ]),
        nonconformances: Mutex::new(vec![
            NonConformance {
                id: "1".to_string(),
                nc_id: "NC-2026-001".to_string(),
                description: "生产环境温湿度超标".to_string(),
                severity: "中等".to_string(),
                status: "整改中".to_string(),
                reported_date: "2026-05-18".to_string(),
                department: "生产部".to_string(),
            },
        ]),
        standards: Mutex::new(vec![
            QualityStandard {
                id: "1".to_string(),
                standard_code: "QMS-STD-001".to_string(),
                title: "产品质量检验规范".to_string(),
                version: "V2.0".to_string(),
                effective_date: "2026-01-01".to_string(),
                category: "质量标准".to_string(),
                status: "生效中".to_string(),
            },
            QualityStandard {
                id: "2".to_string(),
                standard_code: "QMS-STD-002".to_string(),
                title: "不合格品处理流程".to_string(),
                version: "V1.5".to_string(),
                effective_date: "2026-03-01".to_string(),
                category: "流程文件".to_string(),
                status: "生效中".to_string(),
            },
        ]),
    });

    let app = Router::new()
        .route("/", get(home))
        .route("/health", get(health))
        .route("/api/v1/inspections", get(list_inspections).post(create_inspection))
        .route("/api/v1/nonconformances", get(list_nonconformances).post(create_nonconformance))
        .route("/api/v1/standards", get(list_standards).post(create_standard))
        .with_state(state);

    let host = std::env::var("SERVER_HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let port = std::env::var("SERVER_PORT")
        .unwrap_or_else(|_| "8007".to_string())
        .parse()
        .unwrap_or(8007);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("✅ TOPEMS-QMS 服务运行在 http://{}", addr);

    axum::serve(
        tokio::net::TcpListener::bind(&addr).await.unwrap(),
        app.into_make_service(),
    )
    .await
    .unwrap();
}

async fn home() -> &'static str {
    "TOPEMS-QMS 质量合规管理系统 API"
}

async fn health() -> Json<ApiResponse<String>> {
    Json(ApiResponse {
        success: true,
        data: Some("TOPEMS-QMS is running!".to_string()),
        message: "OK".to_string(),
    })
}

async fn list_inspections(State(state): State<Arc<AppState>>) -> Json<ApiResponse<Vec<InspectionRecord>>> {
    let inspections = state.inspections.lock().unwrap();
    Json(ApiResponse {
        success: true,
        data: Some(inspections.clone()),
        message: "Success".to_string(),
    })
}

async fn create_inspection(
    State(state): State<Arc<AppState>>,
    Json(request): Json<CreateInspectionRequest>,
) -> Json<ApiResponse<InspectionRecord>> {
    let inspection = InspectionRecord {
        id: Uuid::new_v4().to_string(),
        batch_id: request.batch_id,
        product_name: request.product_name,
        inspection_date: Utc::now().format("%Y-%m-%d").to_string(),
        inspector: request.inspector,
        status: request.status,
        result_summary: request.result_summary,
    };

    state.inspections.lock().unwrap().push(inspection.clone());
    
    Json(ApiResponse {
        success: true,
        data: Some(inspection),
        message: "创建成功".to_string(),
    })
}

async fn list_nonconformances(State(state): State<Arc<AppState>>) -> Json<ApiResponse<Vec<NonConformance>>> {
    let ncs = state.nonconformances.lock().unwrap();
    Json(ApiResponse {
        success: true,
        data: Some(ncs.clone()),
        message: "Success".to_string(),
    })
}

async fn create_nonconformance(
    State(state): State<Arc<AppState>>,
    Json(request): Json<CreateNonConformanceRequest>,
) -> Json<ApiResponse<NonConformance>> {
    let count = state.nonconformances.lock().unwrap().len() + 1;
    let nc = NonConformance {
        id: Uuid::new_v4().to_string(),
        nc_id: format!("NC-2026-{:03}", count),
        description: request.description,
        severity: request.severity,
        status: "待处理".to_string(),
        reported_date: Utc::now().format("%Y-%m-%d").to_string(),
        department: request.department,
    };

    state.nonconformances.lock().unwrap().push(nc.clone());
    
    Json(ApiResponse {
        success: true,
        data: Some(nc),
        message: "创建成功".to_string(),
    })
}

async fn list_standards(State(state): State<Arc<AppState>>) -> Json<ApiResponse<Vec<QualityStandard>>> {
    let standards = state.standards.lock().unwrap();
    Json(ApiResponse {
        success: true,
        data: Some(standards.clone()),
        message: "Success".to_string(),
    })
}

async fn create_standard(
    State(state): State<Arc<AppState>>,
    Json(request): Json<CreateQualityStandardRequest>,
) -> Json<ApiResponse<QualityStandard>> {
    let standard = QualityStandard {
        id: Uuid::new_v4().to_string(),
        standard_code: request.standard_code,
        title: request.title,
        version: request.version,
        effective_date: request.effective_date,
        category: request.category,
        status: "生效中".to_string(),
    };

    state.standards.lock().unwrap().push(standard.clone());
    
    Json(ApiResponse {
        success: true,
        data: Some(standard),
        message: "创建成功".to_string(),
    })
}
