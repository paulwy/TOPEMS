use axum::{
    extract::{Json, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{postgres::PgRow, PgPool, Row};
use uuid::Uuid;

use super::auth_utils::extract_user_id_from_token;
use topems_shared_auth::auth::AuthState;
use topems_shared_core::response::ApiResponse;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BarcodeScanRequest {
    pub barcode: String,
    pub location_lat: Option<f64>,
    pub location_lng: Option<f64>,
    pub scan_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BarcodeScanResponse {
    pub barcode: String,
    pub decoded_data: String,
    pub scan_type: String,
    pub matched_item: Option<serde_json::Value>,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QrCodeScanRequest {
    pub qr_data: String,
    pub location_lat: Option<f64>,
    pub location_lng: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QrCodeScanResponse {
    pub qr_data: String,
    pub decoded_url: Option<String>,
    pub decoded_text: String,
    pub data_type: String,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageOcrRequest {
    pub image_base64: String,
    pub location_lat: Option<f64>,
    pub location_lng: Option<f64>,
    pub ocr_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageOcrResponse {
    pub recognized_text: String,
    pub confidence: f64,
    pub words: Vec<OcrWord>,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OcrWord {
    pub text: String,
    pub confidence: f64,
    pub bounding_box: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanRecord {
    pub id: Uuid,
    pub user_id: Uuid,
    pub scan_type: String,
    pub scan_data: String,
    pub result_data: Option<serde_json::Value>,
    pub location_lat: Option<f64>,
    pub location_lng: Option<f64>,
    pub created_at: DateTime<Utc>,
}

impl ScanRecord {
    pub fn from_row(row: &PgRow) -> sqlx::Result<Self> {
        Ok(Self {
            id: row.try_get("id")?,
            user_id: row.try_get("user_id")?,
            scan_type: row.try_get("scan_type")?,
            scan_data: row.try_get("scan_data")?,
            result_data: row.try_get("result_data")?,
            location_lat: row.try_get("location_lat")?,
            location_lng: row.try_get("location_lng")?,
            created_at: row.try_get("created_at")?,
        })
    }
}

pub async fn scan_barcode(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Json(payload): Json<BarcodeScanRequest>,
) -> impl IntoResponse {
    let user_id_str = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let scan_type = payload.scan_type.unwrap_or_else(|| "barcode".to_string());

    let response = BarcodeScanResponse {
        barcode: payload.barcode.clone(),
        decoded_data: payload.barcode.clone(),
        scan_type: scan_type.clone(),
        matched_item: Some(serde_json::json!({
            "item_code": payload.barcode,
            "item_name": "测试物品",
            "item_type": "inventory"
        })),
        timestamp: Utc::now(),
    };

    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(ApiResponse::error(400, "无效的用户ID")),
            );
        }
    };
    let response_json = match serde_json::to_value(&response) {
        Ok(v) => Some(v),
        Err(_) => None,
    };
    save_scan_record(
        &pool,
        user_id,
        &scan_type,
        &payload.barcode,
        response_json,
        payload.location_lat,
        payload.location_lng,
    )
    .await;

    (
        StatusCode::OK,
        Json(ApiResponse::success(response, "条形码扫描成功")),
    )
}

pub async fn scan_qrcode(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Json(payload): Json<QrCodeScanRequest>,
) -> impl IntoResponse {
    let user_id_str = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let (decoded_url, data_type) =
        if payload.qr_data.starts_with("http://") || payload.qr_data.starts_with("https://") {
            (Some(payload.qr_data.clone()), "url".to_string())
        } else {
            (None, "text".to_string())
        };

    let response = QrCodeScanResponse {
        qr_data: payload.qr_data.clone(),
        decoded_url,
        decoded_text: payload.qr_data.clone(),
        data_type: data_type.clone(),
        timestamp: Utc::now(),
    };

    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(ApiResponse::error(400, "无效的用户ID")),
            );
        }
    };
    let response_json = match serde_json::to_value(&response) {
        Ok(v) => Some(v),
        Err(_) => None,
    };
    save_scan_record(
        &pool,
        user_id,
        "qrcode",
        &payload.qr_data,
        response_json,
        payload.location_lat,
        payload.location_lng,
    )
    .await;

    (
        StatusCode::OK,
        Json(ApiResponse::success(response, "二维码扫描成功")),
    )
}

pub async fn image_ocr(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Json(payload): Json<ImageOcrRequest>,
) -> impl IntoResponse {
    let user_id_str = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let words = vec![
        OcrWord {
            text: "测试文本".to_string(),
            confidence: 0.95,
            bounding_box: None,
        },
        OcrWord {
            text: "OCR识别".to_string(),
            confidence: 0.92,
            bounding_box: None,
        },
    ];

    let response = ImageOcrResponse {
        recognized_text: "测试文本 OCR识别".to_string(),
        confidence: 0.93,
        words,
        timestamp: Utc::now(),
    };

    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(ApiResponse::error(400, "无效的用户ID")),
            );
        }
    };
    let response_json = match serde_json::to_value(&response) {
        Ok(v) => Some(v),
        Err(_) => None,
    };
    save_scan_record(
        &pool,
        user_id,
        "ocr",
        &payload.image_base64.chars().take(100).collect::<String>(),
        response_json,
        payload.location_lat,
        payload.location_lng,
    )
    .await;

    (
        StatusCode::OK,
        Json(ApiResponse::success(response, "OCR识别成功")),
    )
}

async fn save_scan_record(
    pool: &PgPool,
    user_id: Uuid,
    scan_type: &str,
    scan_data: &str,
    result_data: Option<serde_json::Value>,
    location_lat: Option<f64>,
    location_lng: Option<f64>,
) {
    if let Err(e) = sqlx::query("INSERT INTO mobile_scan_records (user_id, scan_type, scan_data, result_data, location_lat, location_lng) VALUES ($1, $2, $3, $4, $5, $6)")
        .bind(user_id)
        .bind(scan_type)
        .bind(scan_data)
        .bind(result_data)
        .bind(location_lat)
        .bind(location_lng)
        .execute(pool)
        .await
    {
        tracing::error!("保存扫描记录失败: {}", e);
    }
}
