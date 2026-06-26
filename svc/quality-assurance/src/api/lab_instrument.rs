use axum::{extract::Path, extract::State, routing::{get, post}, Json, Router};
use serde::{Deserialize, Serialize};

use crate::AppState;
use topems_shared::ApiResponse;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/api/qa/lab/instrument", get(list_instruments).post(create_instrument))
        .route("/api/qa/lab/instrument/{id}", get(get_instrument))
        .route("/api/qa/lab/instrument/{id}/calibration", post(calibrate))
}

#[derive(Debug, Deserialize)]
pub struct InstrumentQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct Instrument {
    pub id: String,
    pub instrument_no: String,
    pub name: String,
    pub model: Option<String>,
    pub manufacturer: Option<String>,
    pub status: String,
    pub location: Option<String>,
}

pub async fn list_instruments(
    State(_state): State<AppState>,
) -> Json<ApiResponse<Vec<Instrument>>> {
    tracing::info!("Listing instruments");
    Json(ApiResponse::success(Vec::<Instrument>::new(), "获取仪器列表成功"))
}

pub async fn create_instrument(
    State(_state): State<AppState>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<Instrument>> {
    tracing::info!("Creating instrument: {:?}", req);
    Json(ApiResponse::success(
        Instrument {
            id: uuid::Uuid::new_v4().to_string(),
            instrument_no: format!("INS-{}", uuid::Uuid::new_v4().to_string()[..8].to_uppercase()),
            name: "仪器".to_string(),
            model: None,
            manufacturer: None,
            status: "normal".to_string(),
            location: None,
        },
        "仪器创建成功",
    ))
}

pub async fn get_instrument(
    State(_state): State<AppState>,
    Path(id): Path<String>,
) -> Json<ApiResponse<Instrument>> {
    tracing::info!("Getting instrument: {}", id);
    Json(ApiResponse::success(
        Instrument {
            id,
            instrument_no: "INS-001".to_string(),
            name: "高效液相色谱仪".to_string(),
            model: Some("Agilent 1260".to_string()),
            manufacturer: Some("Agilent".to_string()),
            status: "normal".to_string(),
            location: Some("实验室A".to_string()),
        },
        "获取仪器成功",
    ))
}

pub async fn calibrate(
    State(_state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<Instrument>> {
    tracing::info!("Calibrating instrument {}: {:?}", id, req);
    Json(ApiResponse::success(
        Instrument {
            id,
            instrument_no: "INS-001".to_string(),
            name: "高效液相色谱仪".to_string(),
            model: Some("Agilent 1260".to_string()),
            manufacturer: Some("Agilent".to_string()),
            status: "calibrated".to_string(),
            location: Some("实验室A".to_string()),
        },
        "仪器校准成功",
    ))
}
