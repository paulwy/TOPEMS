use serde::{Deserialize, Serialize};

/// API 统一响应格式
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub code: u16,
    pub success: bool,
    pub data: Option<T>,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub errors: Option<Vec<String>>,
    pub timestamp: String,
}

impl<T> ApiResponse<T> {
    pub fn success(data: T, message: &str) -> Self {
        ApiResponse {
            code: 200,
            success: true,
            data: Some(data),
            message: message.to_string(),
            errors: None,
            timestamp: chrono::Utc::now().to_rfc3339(),
        }
    }

    pub fn error(code: u16, message: &str, errors: Option<Vec<String>>) -> Self {
        ApiResponse {
            code,
            success: false,
            data: None,
            message: message.to_string(),
            errors,
            timestamp: chrono::Utc::now().to_rfc3339(),
        }
    }

    pub fn not_found(message: &str) -> Self {
        Self::error(404, message, None)
    }

    pub fn bad_request(message: &str) -> Self {
        Self::error(400, message, None)
    }

    #[allow(dead_code)]
    pub fn unauthorized(message: &str) -> Self {
        Self::error(401, message, None)
    }

    pub fn forbidden(message: &str) -> Self {
        Self::error(403, message, None)
    }

    pub fn internal_error(message: &str) -> Self {
        Self::error(500, message, None)
    }
}

/// 分页响应
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PagedResponse<T> {
    pub items: Vec<T>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
    pub total_pages: i64,
}

impl<T> PagedResponse<T> {
    pub fn new(items: Vec<T>, total: i64, page: i64, page_size: i64) -> Self {
        let total_pages = if total == 0 {
            0
        } else {
            (total as f64 / page_size as f64).ceil() as i64
        };

        Self {
            items,
            total,
            page,
            page_size,
            total_pages,
        }
    }
}
