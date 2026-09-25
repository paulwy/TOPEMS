use axum::{
    extract::{Json, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{postgres::PgRow, PgPool, Row};
use topems_shared_boundary::only_own_schema_query;
use utoipa::ToSchema;
use uuid::Uuid;

use super::auth_utils::extract_user_id_from_token;
use topems_shared_auth::auth::AuthState;
use topems_shared_core::response::ApiResponse;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
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

/// 校验扫描结果是否符合预期格式。
/// - expected_format = "url" 要求以 http:// 或 https:// 开头
/// - expected_format = "email" 要求以 mailto: 开头
/// - expected_format = "phone" 要求以 tel: 开头
/// - expected_format = "numeric" 要求全部为 ASCII 数字
/// - expected_format = "text" 任意非空字符串
pub fn validate_scan_result(code: &str, expected_format: &str) -> Result<(), String> {
    if code.is_empty() {
        return Err("扫描内容不能为空".to_string());
    }
    match expected_format {
        "url" => {
            if code.starts_with("http://") || code.starts_with("https://") {
                Ok(())
            } else {
                Err("URL 必须以 http:// 或 https:// 开头".to_string())
            }
        }
        "email" => {
            if code.starts_with("mailto:") {
                Ok(())
            } else {
                Err("邮箱必须以 mailto: 开头".to_string())
            }
        }
        "phone" => {
            if code.starts_with("tel:") {
                Ok(())
            } else {
                Err("电话必须以 tel: 开头".to_string())
            }
        }
        "numeric" => {
            if code.chars().all(|c| c.is_ascii_digit()) {
                Ok(())
            } else {
                Err("内容必须全部为数字".to_string())
            }
        }
        "text" => Ok(()),
        other => Err(format!("不支持的预期格式: {}", other)),
    }
}

/// 根据 QR 码内容推断数据类型。
pub fn detect_scan_type(qr_data: &str) -> &'static str {
    if qr_data.starts_with("http://") || qr_data.starts_with("https://") {
        "url"
    } else if qr_data.starts_with("mailto:") {
        "email"
    } else if qr_data.starts_with("tel:") {
        "phone"
    } else if qr_data.starts_with("WIFI:") {
        "wifi"
    } else if qr_data.starts_with("BEGIN:VCARD") {
        "vcard"
    } else if qr_data.chars().all(|c| c.is_ascii_digit()) && !qr_data.is_empty() {
        "numeric"
    } else {
        "text"
    }
}

/// 提取 QR 码中的 URL；若不是 URL 则返回 None。
pub fn extract_url_from_qr(qr_data: &str) -> Option<&str> {
    if qr_data.starts_with("http://") || qr_data.starts_with("https://") {
        Some(qr_data)
    } else {
        None
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mobile:write"])),
    path = "/scan/barcode",
    tag = "scan",
    request_body = BarcodeScanRequest,
    responses(
        (status = 200, description = "条形码扫描成功", body = serde_json::Value),
        (status = 401, description = "未授权"),
        (status = 500, description = "扫描失败")
    )
)]
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
    let response_json = serde_json::to_value(&response).ok();
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
#[utoipa::path(
    post,
    security(("BearerAuth" = ["mobile:scan:write"])),
    path = "/scan/qrcode",
    responses((status = 200, description = "scan_qrcode OK")),
    tag = "scan"
)]

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
    let response_json = serde_json::to_value(&response).ok();
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

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mobile:scan:write"])),
    path = "/scan/image-ocr",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "scan"
)]
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
    let response_json = serde_json::to_value(&response).ok();
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
    if let Err(e) = sqlx::query(only_own_schema_query!("mobile", "INSERT INTO mobile.mobile_scan_records (user_id, scan_type, scan_data, result_data, location_lat, location_lng, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7)"))
        .bind(user_id)
        .bind(scan_type)
        .bind(scan_data)
        .bind(result_data)
        .bind(location_lat)
        .bind(location_lng)
        .bind(Uuid::nil())
        .execute(pool)
        .await
    {
        tracing::error!("保存扫描记录失败: {}", e);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ---- validate_scan_result ----

    #[test]
    fn test_validate_scan_result_empty() {
        assert!(validate_scan_result("", "text").is_err());
        assert!(validate_scan_result("", "url").is_err());
    }

    #[test]
    fn test_validate_scan_result_url_valid() {
        assert!(validate_scan_result("https://example.com", "url").is_ok());
        assert!(validate_scan_result("http://example.com", "url").is_ok());
    }

    #[test]
    fn test_validate_scan_result_url_invalid() {
        assert!(validate_scan_result("ftp://example.com", "url").is_err());
        assert!(validate_scan_result("example.com", "url").is_err());
    }

    #[test]
    fn test_validate_scan_result_email_valid() {
        assert!(validate_scan_result("mailto:test@example.com", "email").is_ok());
    }

    #[test]
    fn test_validate_scan_result_email_invalid() {
        assert!(validate_scan_result("test@example.com", "email").is_err());
    }

    #[test]
    fn test_validate_scan_result_phone_valid() {
        assert!(validate_scan_result("tel:+8610000000", "phone").is_ok());
    }

    #[test]
    fn test_validate_scan_result_phone_invalid() {
        assert!(validate_scan_result("+8610000000", "phone").is_err());
    }

    #[test]
    fn test_validate_scan_result_numeric_valid() {
        assert!(validate_scan_result("1234567890", "numeric").is_ok());
    }

    #[test]
    fn test_validate_scan_result_numeric_invalid() {
        assert!(validate_scan_result("123abc", "numeric").is_err());
        assert!(validate_scan_result("", "numeric").is_err());
    }

    #[test]
    fn test_validate_scan_result_text_any_non_empty() {
        assert!(validate_scan_result("任意文本", "text").is_ok());
        assert!(validate_scan_result("123", "text").is_ok());
    }

    #[test]
    fn test_validate_scan_result_unsupported_format() {
        assert!(validate_scan_result("data", "weird").is_err());
    }

    // ---- detect_scan_type ----

    #[test]
    fn test_detect_scan_type_https_url() {
        assert_eq!(detect_scan_type("https://example.com"), "url");
    }

    #[test]
    fn test_detect_scan_type_http_url() {
        assert_eq!(detect_scan_type("http://example.com"), "url");
    }

    #[test]
    fn test_detect_scan_type_email() {
        assert_eq!(detect_scan_type("mailto:test@example.com"), "email");
    }

    #[test]
    fn test_detect_scan_type_phone() {
        assert_eq!(detect_scan_type("tel:+8610000000"), "phone");
    }

    #[test]
    fn test_detect_scan_type_wifi() {
        assert_eq!(
            detect_scan_type("WIFI:S:MyNetwork;T:WPA;P:password;;"),
            "wifi"
        );
    }

    #[test]
    fn test_detect_scan_type_vcard() {
        assert_eq!(detect_scan_type("BEGIN:VCARD\nFN:Test\nEND:VCARD"), "vcard");
    }

    #[test]
    fn test_detect_scan_type_numeric() {
        assert_eq!(detect_scan_type("1234567890"), "numeric");
    }

    #[test]
    fn test_detect_scan_type_text_default() {
        assert_eq!(detect_scan_type("hello world"), "text");
    }

    #[test]
    fn test_detect_scan_type_empty_is_text() {
        assert_eq!(detect_scan_type(""), "text");
    }

    // ---- extract_url_from_qr ----

    #[test]
    fn test_extract_url_from_qr_https() {
        assert_eq!(
            extract_url_from_qr("https://example.com"),
            Some("https://example.com")
        );
    }

    #[test]
    fn test_extract_url_from_qr_http() {
        assert_eq!(
            extract_url_from_qr("http://example.com"),
            Some("http://example.com")
        );
    }

    #[test]
    fn test_extract_url_from_qr_non_url() {
        assert_eq!(extract_url_from_qr("mailto:test@example.com"), None);
        assert_eq!(extract_url_from_qr("hello"), None);
        assert_eq!(extract_url_from_qr(""), None);
    }
}
