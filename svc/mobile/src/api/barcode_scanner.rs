use axum::{
    extract::{Json, Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use super::auth_utils::extract_user_id_from_token;
use crate::db::repository::*;
use crate::models::{BarcodeScan, CreateBarcodeScan};
use sqlx::Row;
use topems_shared::{ApiResponse, AuthState};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanRequest {
    pub barcode: String,
    pub barcode_type: Option<String>,
    pub location_lat: Option<f64>,
    pub location_lng: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanResponse {
    pub scan_id: Uuid,
    pub barcode: String,
    pub barcode_type: String,
    pub decoded_data: String,
    pub matched_item: Option<serde_json::Value>,
    pub result_action: Option<String>,
    pub result_data: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanHistoryResponse {
    pub items: Vec<BarcodeScan>,
    pub total: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BarcodeType {
    pub code: String,
    pub name: String,
    pub description: String,
}

pub async fn scan_barcode(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Json(payload): Json<ScanRequest>,
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

    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(ApiResponse::error(400, "无效的用户ID")),
            );
        }
    };

    let barcode_type = payload
        .barcode_type
        .unwrap_or_else(|| detect_barcode_type(&payload.barcode));

    let decoded_data = decode_barcode(&payload.barcode, &barcode_type);

    let (matched_item, result_action, result_data) = match_barcode(&payload.barcode, &barcode_type);

    let create_data = CreateBarcodeScan {
        barcode: payload.barcode.clone(),
        barcode_type: barcode_type.clone(),
        decoded_data: decoded_data.clone(),
        location_lat: payload.location_lat,
        location_lng: payload.location_lng,
    };

    let scan = match db_create_barcode_scan(&pool, user_id, create_data).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("保存扫描记录失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "保存扫描记录失败")),
            );
        }
    };

    let response = ScanResponse {
        scan_id: scan.id,
        barcode: payload.barcode,
        barcode_type,
        decoded_data,
        matched_item,
        result_action,
        result_data,
    };

    (
        StatusCode::OK,
        Json(ApiResponse::success(response, "条码扫描成功")),
    )
}

fn detect_barcode_type(barcode: &str) -> String {
    if barcode.len() >= 10 && barcode.chars().all(|c| c.is_ascii_alphanumeric()) {
        if barcode.starts_with("http") || barcode.contains("://") {
            return "QR_CODE".to_string();
        }
        if barcode.len() == 13 && barcode.chars().all(|c| c.is_ascii_digit()) {
            return "EAN_13".to_string();
        }
        if barcode.len() == 8 && barcode.chars().all(|c| c.is_ascii_digit()) {
            return "EAN_8".to_string();
        }
        if barcode.chars().all(|c| c.is_ascii_digit())
            && (barcode.len() == 12 || barcode.len() == 13)
        {
            return "UPC_A".to_string();
        }
        if barcode.chars().all(|c| c.is_ascii_alphanumeric()) {
            let has_alpha = barcode.chars().any(|c| c.is_ascii_alphabetic());
            if has_alpha {
                return "CODE_128".to_string();
            }
        }
    }
    "UNKNOWN".to_string()
}

fn decode_barcode(barcode: &str, barcode_type: &str) -> String {
    match barcode_type {
        "QR_CODE" => {
            if barcode.starts_with("http://") || barcode.starts_with("https://") {
                barcode.to_string()
            } else {
                barcode.to_string()
            }
        }
        "CODE_128" | "CODE_39" => barcode.to_string(),
        "EAN_13" | "EAN_8" | "UPC_A" => {
            let digits: String = barcode.chars().filter(|c| c.is_ascii_digit()).collect();
            digits
        }
        _ => barcode.to_string(),
    }
}

fn match_barcode(
    barcode: &str,
    barcode_type: &str,
) -> (
    Option<serde_json::Value>,
    Option<String>,
    Option<serde_json::Value>,
) {
    if barcode_type == "QR_CODE" {
        if barcode.starts_with("http://") || barcode.starts_with("https://") {
            return (
                None,
                Some("open_url".to_string()),
                Some(serde_json::json!({ "url": barcode })),
            );
        }
        if barcode.starts_with("mailto:") {
            return (
                None,
                Some("send_email".to_string()),
                Some(serde_json::json!({ "email": barcode.replace("mailto:", "") })),
            );
        }
        if barcode.starts_with("tel:") {
            return (
                None,
                Some("make_call".to_string()),
                Some(serde_json::json!({ "phone": barcode.replace("tel:", "") })),
            );
        }
    }

    let mock_item = serde_json::json!({
        "item_code": barcode,
        "item_name": "测试物品",
        "item_type": "inventory",
        "barcode_type": barcode_type,
    });

    (Some(mock_item), Some("view_detail".to_string()), None)
}

pub async fn get_scan_history(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Query(params): Query<ScanHistoryQuery>,
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

    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(ApiResponse::error(400, "无效的用户ID")),
            );
        }
    };

    let page = params.page.unwrap_or(1);
    let size = params.size.unwrap_or(20);

    let scans = match db_get_barcode_scans(&pool, user_id, params.barcode_type.as_deref()).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("获取扫描历史失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "获取扫描历史失败")),
            );
        }
    };

    let total = scans.len() as i64;
    let start = ((page - 1) * size) as usize;
    let end = (start + size as usize).min(scans.len());
    let items = scans[start..end].to_vec();

    let response = ScanHistoryResponse { items, total };

    (
        StatusCode::OK,
        Json(ApiResponse::success(response, "获取扫描历史成功")),
    )
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanHistoryQuery {
    pub page: Option<i64>,
    pub size: Option<i64>,
    pub barcode_type: Option<String>,
}

pub async fn get_scan_by_id(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let _ = extract_user_id_from_token(&headers, &auth_state.jwt_secret);

    let row = match sqlx::query("SELECT * FROM barcode_scans WHERE id = $1")
        .bind(id)
        .fetch_optional(&pool)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("查询扫描记录失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "查询扫描记录失败")),
            );
        }
    };

    if let Some(row) = row {
        let scan = match BarcodeScan::from_row(&row) {
            Ok(s) => s,
            Err(e) => {
                tracing::error!("解析扫描记录失败: {}", e);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ApiResponse::error(500, "解析扫描记录失败")),
                );
            }
        };
        (
            StatusCode::OK,
            Json(ApiResponse::success(scan, "获取扫描记录成功")),
        )
    } else {
        (
            StatusCode::NOT_FOUND,
            Json(ApiResponse::error(404, "扫描记录不存在")),
        )
    }
}

pub async fn get_supported_barcode_types(
    _headers: HeaderMap,
    State(_auth_state): State<AuthState>,
) -> impl IntoResponse {
    let types = vec![
        BarcodeType {
            code: "QR_CODE".to_string(),
            name: "QR Code".to_string(),
            description: "二维码".to_string(),
        },
        BarcodeType {
            code: "CODE_128".to_string(),
            name: "Code 128".to_string(),
            description: "Code 128 条码".to_string(),
        },
        BarcodeType {
            code: "CODE_39".to_string(),
            name: "Code 39".to_string(),
            description: "Code 39 条码".to_string(),
        },
        BarcodeType {
            code: "EAN_13".to_string(),
            name: "EAN-13".to_string(),
            description: "13位欧洲商品条码".to_string(),
        },
        BarcodeType {
            code: "EAN_8".to_string(),
            name: "EAN-8".to_string(),
            description: "8位欧洲商品条码".to_string(),
        },
        BarcodeType {
            code: "UPC_A".to_string(),
            name: "UPC-A".to_string(),
            description: "12位美国商品条码".to_string(),
        },
    ];

    (
        StatusCode::OK,
        Json(ApiResponse::success(types, "获取支持的条码类型成功")),
    )
}

pub async fn delete_scan_record(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
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

    let user_id = match Uuid::parse_str(&user_id_str) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(ApiResponse::error(400, "无效的用户ID")),
            );
        }
    };

    let result = sqlx::query("DELETE FROM barcode_scans WHERE id = $1 AND user_id = $2")
        .bind(id)
        .bind(user_id)
        .execute(&pool)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => (
            StatusCode::OK,
            Json(ApiResponse::success((), "删除扫描记录成功")),
        ),
        Ok(_) => (
            StatusCode::NOT_FOUND,
            Json(ApiResponse::error(404, "扫描记录不存在或无权删除")),
        ),
        Err(e) => {
            tracing::error!("删除扫描记录失败: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "删除扫描记录失败")),
            )
        }
    }
}
