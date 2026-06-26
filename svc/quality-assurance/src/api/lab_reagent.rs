use axum::{extract::Path, extract::State, routing::{get, post}, Json, Router};
use serde::{Deserialize, Serialize};

use crate::AppState;
use topems_shared::ApiResponse;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/api/qa/lab/reagent", get(list_reagents).post(create_reagent))
        .route("/api/qa/lab/reagent/{id}", get(get_reagent))
}

#[derive(Debug, Deserialize)]
pub struct ReagentQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct Reagent {
    pub id: String,
    pub reagent_no: String,
    pub name: String,
    pub specification: Option<String>,
    pub manufacturer: Option<String>,
    pub batch_no: Option<String>,
    pub quantity: Option<f64>,
    pub unit: Option<String>,
    pub status: String,
}

pub async fn list_reagents(
    State(_state): State<AppState>,
) -> Json<ApiResponse<Vec<Reagent>>> {
    tracing::info!("Listing reagents");
    Json(ApiResponse::success(Vec::<Reagent>::new(), "获取试剂列表成功"))
}

pub async fn create_reagent(
    State(_state): State<AppState>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<Reagent>> {
    tracing::info!("Creating reagent: {:?}", req);
    Json(ApiResponse::success(
        Reagent {
            id: uuid::Uuid::new_v4().to_string(),
            reagent_no: format!("RGT-{}", uuid::Uuid::new_v4().to_string()[..8].to_uppercase()),
            name: "试剂".to_string(),
            specification: None,
            manufacturer: None,
            batch_no: None,
            quantity: Some(100.0),
            unit: Some("mL".to_string()),
            status: "normal".to_string(),
        },
        "试剂创建成功",
    ))
}

pub async fn get_reagent(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<Reagent>> {
    tracing::info!("Getting reagent: {}", id);
    Json(ApiResponse::success(
        Reagent {
            id,
            reagent_no: "RGT-001".to_string(),
            name: "甲醇".to_string(),
            specification: Some("HPLC级".to_string()),
            manufacturer: Some("Sigma-Aldrich".to_string()),
            batch_no: Some("MKCQ8945".to_string()),
            quantity: Some(500.0),
            unit: Some("mL".to_string()),
            status: "normal".to_string(),
        },
        "获取试剂成功",
    ))
}
