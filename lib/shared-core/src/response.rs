use chrono::Utc;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[schema(as = ApiResponse)]
pub struct ApiResponse<T> {
    #[schema(example = 200)]
    pub code: u16,
    #[schema(example = true)]
    pub success: bool,
    pub data: Option<T>,
    #[schema(example = "操作成功")]
    pub message: String,
    #[schema(example = "2024-01-01T00:00:00Z")]
    pub timestamp: String,
}

impl<T> ApiResponse<T> {
    pub fn success(data: T, message: &str) -> Self {
        Self {
            code: 200,
            success: true,
            data: Some(data),
            message: message.to_string(),
            timestamp: Utc::now().to_rfc3339(),
        }
    }

    pub fn success_no_data(message: &str) -> Self {
        Self {
            code: 200,
            success: true,
            data: None,
            message: message.to_string(),
            timestamp: Utc::now().to_rfc3339(),
        }
    }

    pub fn error(code: u16, message: &str) -> Self {
        ApiResponse {
            code,
            success: false,
            data: None,
            message: message.to_string(),
            timestamp: Utc::now().to_rfc3339(),
        }
    }
}

pub fn api_error<T>(code: u16, message: &str) -> ApiResponse<T> {
    ApiResponse {
        code,
        success: false,
        data: None,
        message: message.to_string(),
        timestamp: Utc::now().to_rfc3339(),
    }
}

pub fn api_success<T>(data: T) -> ApiResponse<T> {
    ApiResponse {
        code: 200,
        success: true,
        data: Some(data),
        message: "success".to_string(),
        timestamp: Utc::now().to_rfc3339(),
    }
}

impl<T> axum::response::IntoResponse for ApiResponse<T>
where
    T: Serialize,
{
    fn into_response(self) -> axum::response::Response {
        let status =
            axum::http::StatusCode::from_u16(self.code).unwrap_or(axum::http::StatusCode::OK);
        let body = axum::Json(self);
        (status, body).into_response()
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

impl PaginationParams {
    pub fn offset(&self) -> i64 {
        let page = self.page.unwrap_or(1).max(1);
        let page_size = self.page_size.unwrap_or(20).min(100);
        (page - 1) * page_size
    }

    pub fn limit(&self) -> i64 {
        self.page_size.unwrap_or(20).min(100)
    }
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[schema(as = PaginatedResponse)]
pub struct PaginatedResponse<T> {
    pub items: Vec<T>,
    #[schema(example = 100)]
    pub total: i64,
    #[schema(example = 1)]
    pub page: i64,
    #[schema(example = 20)]
    pub page_size: i64,
    #[schema(example = 5)]
    pub total_pages: i64,
}

impl<T> PaginatedResponse<T> {
    pub fn new(items: Vec<T>, total: i64, page: i64, page_size: i64) -> Self {
        let page = page.max(1);
        let page_size = page_size.clamp(1, 100);
        let total_pages = (total + page_size - 1) / page_size;
        Self {
            items,
            total,
            page,
            page_size,
            total_pages,
        }
    }
}
