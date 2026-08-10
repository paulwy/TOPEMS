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
    #[serde(alias = "pagesize")]
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

    pub fn pagesize(&self) -> Option<i64> {
        self.page_size
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

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ListResponse<T> {
    pub items: Vec<T>,
    pub total: i64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub page: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub page_size: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub total_pages: Option<i64>,
}

impl<T> ListResponse<T> {
    pub fn new(items: Vec<T>, total: i64) -> Self {
<<<<<<< Updated upstream
        Self {
            items,
            total,
            page: None,
            page_size: None,
            total_pages: None,
        }
    }

    pub fn with_pagination(items: Vec<T>, total: i64, page: i64, page_size: i64) -> Self {
        let total_pages = if total == 0 {
            0
        } else {
            (total - 1) / page_size.max(1) + 1
        };
        Self {
            items,
            total,
            page: Some(page),
            page_size: Some(page_size),
            total_pages: Some(total_pages),
        }
=======
        Self { items, total, page: None, page_size: None, total_pages: None }
    }

    pub fn with_pagination(items: Vec<T>, total: i64, page: i64, page_size: i64) -> Self {
        let total_pages = if total == 0 { 0 } else { (total - 1) / page_size.max(1) + 1 };
        Self { items, total, page: Some(page), page_size: Some(page_size), total_pages: Some(total_pages) }
>>>>>>> Stashed changes
    }

    pub fn from_parts(data: Vec<T>, count: i64) -> Self {
        Self::new(data, count)
    }
}

#[macro_export]
macro_rules! list_resp {
<<<<<<< Updated upstream
    ($vec:expr, $total:expr) => {
        $crate::response::ListResponse::new($vec, $total)
    };
    ($vec:expr, $total:expr, $page:expr, $page_size:expr) => {
        $crate::response::ListResponse::with_pagination($vec, $total, $page, $page_size)
    };
}

/// V67.1 P0-10: 统一 handler 错误处理宏
/// 替代 357 处重复的 `match ... { Ok(data) => Json(ApiResponse::success(...)), Err(e) => Json(ApiResponse::error(500, &e.to_string())) }`
/// 用法: `handle_result!(service.create(req), "创建成功")`
#[macro_export]
macro_rules! handle_result {
    ($expr:expr, $ok_msg:expr) => {{
        match $expr.await {
            Ok(data) => axum::Json($crate::response::ApiResponse::success(data, $ok_msg)),
            Err(e) => {
                tracing::error!("{}: {}", $ok_msg, e);
                axum::Json($crate::response::ApiResponse::error(500, &e.to_string()))
            }
        }
    }};
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json;

    // ========== ApiResponse ==========

    #[test]
    fn test_api_response_success_has_data() {
        let resp: ApiResponse<String> = ApiResponse::success("hello".to_string(), "操作成功");
        assert_eq!(resp.code, 200);
        assert!(resp.success);
        assert_eq!(resp.data, Some("hello".to_string()));
        assert_eq!(resp.message, "操作成功");
        assert!(!resp.timestamp.is_empty());
    }

    #[test]
    fn test_api_response_success_no_data() {
        let resp: ApiResponse<String> = ApiResponse::success_no_data("操作完成");
        assert_eq!(resp.code, 200);
        assert!(resp.success);
        assert!(resp.data.is_none());
        assert_eq!(resp.message, "操作完成");
    }

    #[test]
    fn test_api_response_error() {
        let resp: ApiResponse<()> = ApiResponse::error(404, "未找到");
        assert_eq!(resp.code, 404);
        assert!(!resp.success);
        assert!(resp.data.is_none());
        assert_eq!(resp.message, "未找到");
    }

    #[test]
    fn test_api_success_helper() {
        let resp: ApiResponse<i32> = api_success(42);
        assert_eq!(resp.code, 200);
        assert!(resp.success);
        assert_eq!(resp.data, Some(42));
        assert_eq!(resp.message, "success");
    }

    #[test]
    fn test_api_error_helper() {
        let resp: ApiResponse<()> = api_error(500, "出错了");
        assert_eq!(resp.code, 500);
        assert!(!resp.success);
        assert!(resp.data.is_none());
        assert_eq!(resp.message, "出错了");
    }

    #[test]
    fn test_api_response_serde_roundtrip() {
        let original: ApiResponse<i32> = ApiResponse::success(123, "ok");
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: ApiResponse<i32> = serde_json::from_str(&json).unwrap();
        assert_eq!(original.code, deserialized.code);
        assert_eq!(original.success, deserialized.success);
        assert_eq!(original.data, deserialized.data);
        assert_eq!(original.message, deserialized.message);
    }

    // ========== PaginationParams ==========

    #[test]
    fn test_pagination_offset_default() {
        let params = PaginationParams {
            page: None,
            page_size: None,
            search: None,
            status: None,
        };
        assert_eq!(params.offset(), 0);
        assert_eq!(params.limit(), 20);
    }

    #[test]
    fn test_pagination_offset_page_2() {
        let params = PaginationParams {
            page: Some(2),
            page_size: Some(10),
            search: None,
            status: None,
        };
        assert_eq!(params.offset(), 10);
        assert_eq!(params.limit(), 10);
    }

    #[test]
    fn test_pagination_clamps_page_size_to_100() {
        let params = PaginationParams {
            page: Some(1),
            page_size: Some(500),
            search: None,
            status: None,
        };
        assert_eq!(params.limit(), 100);
        assert_eq!(params.offset(), 0);
    }

    #[test]
    fn test_pagination_page_below_1_treated_as_1() {
        let params = PaginationParams {
            page: Some(0),
            page_size: Some(20),
            search: None,
            status: None,
        };
        assert_eq!(params.offset(), 0);

        let params2 = PaginationParams {
            page: Some(-5),
            page_size: Some(20),
            search: None,
            status: None,
        };
        assert_eq!(params2.offset(), 0);
    }

    #[test]
    fn test_pagination_pagesize_alias_works() {
        use serde::Deserialize;
        let json = r#"{"pagesize": 15, "page": 3}"#;
        let params: PaginationParams = serde_json::from_str(json).unwrap();
        assert_eq!(params.page, Some(3));
        assert_eq!(params.page_size, Some(15));
        assert_eq!(params.offset(), 30);
    }

    // ========== PaginatedResponse ==========

    #[test]
    fn test_paginated_response_new_calculates_total_pages() {
        let items: Vec<i32> = vec![1, 2, 3];
        let resp = PaginatedResponse::new(items, 95, 1, 10);
        assert_eq!(resp.total, 95);
        assert_eq!(resp.page, 1);
        assert_eq!(resp.page_size, 10);
        assert_eq!(resp.total_pages, 10);
        assert_eq!(resp.items.len(), 3);
    }

    #[test]
    fn test_paginated_response_exact_pages() {
        let items: Vec<i32> = vec![];
        let resp = PaginatedResponse::new(items, 100, 1, 20);
        assert_eq!(resp.total_pages, 5);
    }

    #[test]
    fn test_paginated_response_zero_total() {
        let items: Vec<String> = vec![];
        let resp = PaginatedResponse::new(items, 0, 1, 20);
        assert_eq!(resp.total_pages, 0);
    }

    #[test]
    fn test_paginated_response_clamps_page_size() {
        let items: Vec<i32> = vec![1];
        let resp = PaginatedResponse::new(items, 10, 1, 500);
        assert_eq!(resp.page_size, 100);
    }

    // ========== ListResponse ==========

    #[test]
    fn test_list_response_new_without_pagination() {
        let items = vec!["a".to_string(), "b".to_string()];
        let resp: ListResponse<String> = ListResponse::new(items, 50);
        assert_eq!(resp.items.len(), 2);
        assert_eq!(resp.total, 50);
        assert!(resp.page.is_none());
        assert!(resp.page_size.is_none());
        assert!(resp.total_pages.is_none());
    }

    #[test]
    fn test_list_response_with_pagination_calculates_total_pages() {
        let items: Vec<i32> = vec![10, 20, 30];
        let resp = ListResponse::with_pagination(items, 25, 2, 10);
        assert_eq!(resp.total, 25);
        assert_eq!(resp.page, Some(2));
        assert_eq!(resp.page_size, Some(10));
        assert_eq!(resp.total_pages, Some(3));
    }

    #[test]
    fn test_list_response_with_pagination_zero_total() {
        let items: Vec<i32> = vec![];
        let resp = ListResponse::with_pagination(items, 0, 1, 10);
        assert_eq!(resp.total_pages, Some(0));
    }

    #[test]
    fn test_list_response_from_parts_alias() {
        let items = vec![true, false];
        let resp: ListResponse<bool> = ListResponse::from_parts(items, 100);
        assert_eq!(resp.total, 100);
        assert_eq!(resp.items.len(), 2);
        assert!(resp.page.is_none());
    }

    #[test]
    fn test_list_response_serde_without_pagination_fields() {
        let resp: ListResponse<i32> = ListResponse::new(vec![1, 2], 10);
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("\"items\""));
        assert!(json.contains("\"total\""));
        assert!(!json.contains("\"page\""));
        assert!(!json.contains("\"pageSize\""));
    }

    #[test]
    fn test_list_response_serde_with_pagination_fields() {
        let resp = ListResponse::with_pagination(vec![1i32], 5, 1, 10);
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("\"page\""));
        assert!(json.contains("\"pageSize\""));
        assert!(json.contains("\"totalPages\""));
    }
=======
    ($vec:expr, $total:expr) => { $crate::response::ListResponse::new($vec, $total) };
    ($vec:expr, $total:expr, $page:expr, $page_size:expr) => { $crate::response::ListResponse::with_pagination($vec, $total, $page, $page_size) };
>>>>>>> Stashed changes
}
