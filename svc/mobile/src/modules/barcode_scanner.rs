use axum::{
    extract::{Json, Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use super::auth_utils::extract_user_id_from_token;
use crate::db::repository::*;
use crate::models::{BarcodeScan, CreateBarcodeScan};
use topems_shared_auth::auth::AuthState;
use topems_shared_core::response::ApiResponse;

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

/// 条码格式枚举，用于校验输入是否符合指定格式。
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BarcodeFormat {
    QrCode,
    Code128,
    Code39,
    Ean13,
    Ean8,
    UpcA,
    Unknown,
}

/// 解析后的条码数据。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ParsedBarcode {
    pub raw: String,
    pub format: String,
    pub decoded: String,
    pub length: usize,
    pub is_valid: bool,
}

/// 校验条码内容是否符合指定格式（按字符串形式给出，例如 "EAN_13"）。
pub fn validate_barcode_format(code: &str, format: &str) -> bool {
    if code.is_empty() {
        return false;
    }
    match format {
        "QR_CODE" => !code.is_empty(),
        "CODE_128" => code.chars().all(|c| c.is_ascii_alphanumeric()),
        "CODE_39" => code.chars().all(|c| {
            c.is_ascii_alphanumeric()
                || c == '-'
                || c == '.'
                || c == ' '
                || c == '$'
                || c == '/'
                || c == '+'
                || c == '%'
        }),
        "EAN_13" => code.len() == 13 && code.chars().all(|c| c.is_ascii_digit()),
        "EAN_8" => code.len() == 8 && code.chars().all(|c| c.is_ascii_digit()),
        "UPC_A" => code.len() == 12 && code.chars().all(|c| c.is_ascii_digit()),
        _ => false,
    }
}

/// 计算条码格式是否为有效格式名称。
pub fn is_supported_barcode_format(format: &str) -> bool {
    matches!(
        format,
        "QR_CODE" | "CODE_128" | "CODE_39" | "EAN_13" | "EAN_8" | "UPC_A"
    )
}

/// 解析条码字符串，返回包含原始值、格式、解码数据等信息的结构。
pub fn parse_barcode(code: &str) -> Result<ParsedBarcode, String> {
    if code.is_empty() {
        return Err("条码不能为空".to_string());
    }
    let format = detect_barcode_type(code);
    let decoded = decode_barcode(code, &format);
    let is_valid = is_supported_barcode_format(&format) && validate_barcode_format(code, &format);
    Ok(ParsedBarcode {
        raw: code.to_string(),
        format,
        decoded,
        length: code.len(),
        is_valid,
    })
}

/// 计算 EAN-13 条码的校验位，返回 None 表示输入不是 12 位数字。
pub fn calculate_ean13_checksum(code: &str) -> Option<u8> {
    if code.len() != 12 || !code.chars().all(|c| c.is_ascii_digit()) {
        return None;
    }
    let sum: u32 = code
        .chars()
        .enumerate()
        .map(|(i, c)| {
            let d = c.to_digit(10).unwrap_or(0);
            if i % 2 == 0 {
                d
            } else {
                d * 3
            }
        })
        .sum();
    let checksum = (10 - (sum % 10)) % 10;
    Some(checksum as u8)
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

    let tenant_id = Uuid::new_v4();
    let scan = match db_create_barcode_scan(&pool, tenant_id, user_id, create_data).await {
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:scan:read"])),
    path = "/barcode/history",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "scan"
)]
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:scan:read"])),
    path = "/barcode/history/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "scan"
)]
pub async fn get_scan_by_id(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let _ = extract_user_id_from_token(&headers, &auth_state.jwt_secret);

    let row = match sqlx::query(only_own_schema_query!("mobile", "SELECT id, user_id, barcode, barcode_type, scan_result, scanned_at FROM mobile.barcode_scans WHERE id = $1"))
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:scan:read"])),
    path = "/barcode/types",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "scan"
)]
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

    let result = sqlx::query(only_own_schema_query!(
        "mobile",
        "DELETE FROM mobile.barcode_scans WHERE id = $1 AND user_id = $2"
    ))
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

#[cfg(test)]
mod tests {
    use super::*;

    // ---- validate_barcode_format ----

    #[test]
    fn test_validate_barcode_format_empty_input() {
        assert!(!validate_barcode_format("", "EAN_13"));
        assert!(!validate_barcode_format("", "QR_CODE"));
    }

    #[test]
    fn test_validate_barcode_format_ean13_valid() {
        assert!(validate_barcode_format("4006381333931", "EAN_13"));
    }

    #[test]
    fn test_validate_barcode_format_ean13_wrong_length() {
        assert!(!validate_barcode_format("123456789012", "EAN_13"));
        assert!(!validate_barcode_format("12345678901234", "EAN_13"));
    }

    #[test]
    fn test_validate_barcode_format_ean13_non_digit() {
        assert!(!validate_barcode_format("12345678901AB", "EAN_13"));
    }

    #[test]
    fn test_validate_barcode_format_ean8() {
        assert!(validate_barcode_format("12345678", "EAN_8"));
        assert!(!validate_barcode_format("1234567", "EAN_8"));
        assert!(!validate_barcode_format("123456789", "EAN_8"));
    }

    #[test]
    fn test_validate_barcode_format_upc_a() {
        assert!(validate_barcode_format("123456789012", "UPC_A"));
        assert!(!validate_barcode_format("12345678901", "UPC_A"));
        assert!(!validate_barcode_format("1234567890123", "UPC_A"));
    }

    #[test]
    fn test_validate_barcode_format_code128() {
        assert!(validate_barcode_format("ABC123", "CODE_128"));
        assert!(!validate_barcode_format("ABC-123", "CODE_128"));
    }

    #[test]
    fn test_validate_barcode_format_unknown_format() {
        assert!(!validate_barcode_format("ABC123", "NOT_A_FORMAT"));
    }

    #[test]
    fn test_validate_barcode_format_qr_code_any_non_empty() {
        assert!(validate_barcode_format("anything", "QR_CODE"));
        assert!(validate_barcode_format(
            "https://example.com/path?q=1",
            "QR_CODE"
        ));
    }

    // ---- is_supported_barcode_format ----

    #[test]
    fn test_is_supported_barcode_format_valid() {
        assert!(is_supported_barcode_format("QR_CODE"));
        assert!(is_supported_barcode_format("CODE_128"));
        assert!(is_supported_barcode_format("CODE_39"));
        assert!(is_supported_barcode_format("EAN_13"));
        assert!(is_supported_barcode_format("EAN_8"));
        assert!(is_supported_barcode_format("UPC_A"));
    }

    #[test]
    fn test_is_supported_barcode_format_invalid() {
        assert!(!is_supported_barcode_format(""));
        assert!(!is_supported_barcode_format("qr_code"));
        assert!(!is_supported_barcode_format("DATAMATRIX"));
    }

    // ---- parse_barcode ----

    #[test]
    fn test_parse_barcode_empty() {
        assert!(parse_barcode("").is_err());
    }

    #[test]
    fn test_parse_barcode_ean13() {
        let parsed = parse_barcode("4006381333931").unwrap();
        assert_eq!(parsed.raw, "4006381333931");
        assert_eq!(parsed.length, 13);
        assert_eq!(parsed.decoded, "4006381333931");
        assert!(!parsed.format.is_empty());
    }

    #[test]
    fn test_parse_barcode_qr_url() {
        let parsed = parse_barcode("https://example.com").unwrap();
        assert_eq!(parsed.raw, "https://example.com");
        assert_eq!(parsed.length, "https://example.com".len());
    }

    #[test]
    fn test_parse_barcode_unknown_returns_ok() {
        // UNKNOWN 类型仍然返回 Ok，但 is_valid 为 false
        let parsed = parse_barcode("!@#").unwrap();
        assert_eq!(parsed.format, "UNKNOWN");
        assert!(!parsed.is_valid);
    }

    #[test]
    fn test_parse_barcode_code128_alpha() {
        let parsed = parse_barcode("ABC1234567").unwrap();
        assert_eq!(parsed.format, "CODE_128");
    }

    // ---- calculate_ean13_checksum ----

    #[test]
    fn test_calculate_ean13_checksum_known_value() {
        // 4006381333931 -> 校验位应为 1
        assert_eq!(calculate_ean13_checksum("400638133393"), Some(1));
    }

    #[test]
    fn test_calculate_ean13_checksum_wrong_length() {
        assert_eq!(calculate_ean13_checksum("12345678901"), None);
        assert_eq!(calculate_ean13_checksum("1234567890123"), None);
    }

    #[test]
    fn test_calculate_ean13_checksum_non_digit() {
        assert_eq!(calculate_ean13_checksum("12345678901A"), None);
    }

    #[test]
    fn test_calculate_ean13_checksum_empty() {
        assert_eq!(calculate_ean13_checksum(""), None);
    }

    #[test]
    fn test_calculate_ean13_checksum_zero_sum_mod() {
        // 000000000000 -> sum=0, checksum=(10-0)%10=0
        assert_eq!(calculate_ean13_checksum("000000000000"), Some(0));
    }

    // ---- detect_barcode_type (existing private fn) ----

    #[test]
    fn test_detect_barcode_type_ean13() {
        assert_eq!(detect_barcode_type("4006381333931"), "EAN_13");
    }

    #[test]
    fn test_detect_barcode_type_ean8_short_input_returns_unknown() {
        // 现有 detect_barcode_type 要求 len >= 10 才会进入类型判定，
        // 因此 8 位数字串会返回 "UNKNOWN"。
        assert_eq!(detect_barcode_type("12345678"), "UNKNOWN");
    }

    #[test]
    fn test_detect_barcode_type_url_qr_alphanumeric_only() {
        // 现有 detect_barcode_type 要求所有字符为字母数字，
        // 因此真实 URL（含 : / .）会被识别为 UNKNOWN。
        assert_eq!(detect_barcode_type("https://example.com"), "UNKNOWN");
        // 但纯字母数字且以 http 开头的字符串会被判定为 QR_CODE
        assert_eq!(detect_barcode_type("httpABC12345"), "QR_CODE");
    }

    #[test]
    fn test_detect_barcode_type_code128_alpha() {
        assert_eq!(detect_barcode_type("ABC1234567"), "CODE_128");
    }

    #[test]
    fn test_detect_barcode_type_unknown_short() {
        assert_eq!(detect_barcode_type("AB"), "UNKNOWN");
    }

    #[test]
    fn test_detect_barcode_type_empty() {
        assert_eq!(detect_barcode_type(""), "UNKNOWN");
    }

    // ---- decode_barcode (existing private fn) ----

    #[test]
    fn test_decode_barcode_qr_url() {
        assert_eq!(
            decode_barcode("https://example.com", "QR_CODE"),
            "https://example.com"
        );
    }

    #[test]
    fn test_decode_barcode_ean13_strips_non_digits() {
        assert_eq!(decode_barcode("4006381333931", "EAN_13"), "4006381333931");
    }

    #[test]
    fn test_decode_barcode_code128_returns_input() {
        assert_eq!(decode_barcode("ABC123", "CODE_128"), "ABC123");
    }

    #[test]
    fn test_decode_barcode_unknown_returns_input() {
        assert_eq!(decode_barcode("anything", "UNKNOWN"), "anything");
    }

    // ---- match_barcode (existing private fn) ----

    #[test]
    fn test_match_barcode_qr_url_action() {
        let (_, action, data) = match_barcode("https://example.com", "QR_CODE");
        assert_eq!(action, Some("open_url".to_string()));
        assert_eq!(
            data,
            Some(serde_json::json!({ "url": "https://example.com" }))
        );
    }

    #[test]
    fn test_match_barcode_mailto_action() {
        let (_, action, _) = match_barcode("mailto:test@example.com", "QR_CODE");
        assert_eq!(action, Some("send_email".to_string()));
    }

    #[test]
    fn test_match_barcode_tel_action() {
        let (_, action, _) = match_barcode("tel:+8610000000", "QR_CODE");
        assert_eq!(action, Some("make_call".to_string()));
    }

    #[test]
    fn test_match_barcode_default_view_detail() {
        let (matched, action, _) = match_barcode("ABC123", "CODE_128");
        assert!(matched.is_some());
        assert_eq!(action, Some("view_detail".to_string()));
    }

    #[test]
    fn test_match_barcode_non_qr_default() {
        let (matched, _, _) = match_barcode("4006381333931", "EAN_13");
        assert!(matched.is_some());
    }
}
