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

// =============================================================================
// V184 统一错误体 ErrorPayload
// =============================================================================
// 解决历史 9 种不同错误体格式问题（ApiResponse.error / TopemsError /
// TenantContextRejection / rate_limit / IAM ad-hoc / Analytics ad-hoc /
// Portal ad-hoc / GraphQL / WebSocket）。
//
// 统一规范（向后兼容 ApiResponse）：
// {
//   "success": false,           // 始终 false
//   "code": 400,                // HTTP 状态码（number，与 ApiResponse.code 一致）
//   "errorCode": "VALIDATION_FAILED",  // 机器可读字符串（可选，省略表示未知）
//   "message": "用户可读消息",   // 人类可读消息
//   "timestamp": "2026-08-12T10:00:00Z",  // RFC3339 时间戳
//   "traceId": "abc123",        // 链路追踪 ID（可选）
//   "errors": [                 // 字段级验证错误（可选，仅验证错误时存在）
//     { "field": "email", "message": "无效的邮箱格式" }
//   ]
// }
//
// 迁移策略：
// - ApiResponse::error 保持不变（已有 1000+ 调用点，shape 已兼容）
// - TopemsError::IntoResponse 重写为使用 ErrorPayload
// - TenantContextRejection / rate_limit / IAM ad-hoc 等改为 ErrorPayload
// - GraphQL {errors:[{message}]} 保留（规范要求）
// - 批量结果 B1-B3 保留（200 成功响应内的 errors 数组）
// =============================================================================

/// 字段级验证错误项
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[schema(as = FieldError)]
pub struct FieldError {
    /// 字段名（如 "email"）
    pub field: String,
    /// 字段错误消息（如 "无效的邮箱格式"）
    pub message: String,
}

/// V184 统一错误响应体
///
/// 替代历史 10 种不同错误体格式，所有后端错误响应必须使用此结构。
/// 详见模块顶部文档注释。
#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[schema(as = ErrorPayload)]
pub struct ErrorPayload {
    /// HTTP 状态码（与 ApiResponse.code 一致，始终为 number）
    #[schema(example = 400)]
    pub code: u16,
    /// 始终为 false
    #[schema(example = false)]
    pub success: bool,
    /// 机器可读错误码字符串（如 "VALIDATION_FAILED"）
    #[schema(example = "VALIDATION_FAILED")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_code: Option<String>,
    /// 人类可读错误消息
    #[schema(example = "请求数据验证失败")]
    pub message: String,
    /// RFC3339 时间戳
    #[schema(example = "2026-08-12T10:00:00Z")]
    pub timestamp: String,
    /// 链路追踪 ID（可选，从请求上下文获取）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub trace_id: Option<String>,
    /// 字段级验证错误列表（可选，仅验证错误时存在）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub errors: Option<Vec<FieldError>>,
}

impl ErrorPayload {
    /// 创建基础错误响应（无字段级错误）
    pub fn new(code: u16, message: &str) -> Self {
        Self {
            code,
            success: false,
            error_code: None,
            message: message.to_string(),
            timestamp: Utc::now().to_rfc3339(),
            trace_id: None,
            errors: None,
        }
    }

    /// 创建带机器可读错误码的错误响应
    pub fn with_error_code(mut self, error_code: &str) -> Self {
        self.error_code = Some(error_code.to_string());
        self
    }

    /// 创建带字段级验证错误的错误响应
    pub fn with_errors(mut self, errors: Vec<FieldError>) -> Self {
        self.errors = if errors.is_empty() {
            None
        } else {
            Some(errors)
        };
        self
    }

    /// 创建带链路追踪 ID 的错误响应
    pub fn with_trace_id(mut self, trace_id: &str) -> Self {
        self.trace_id = Some(trace_id.to_string());
        self
    }

    /// 便捷构造器：400 验证失败
    pub fn validation(message: &str, errors: Vec<FieldError>) -> Self {
        Self::new(400, message)
            .with_error_code("VALIDATION_FAILED")
            .with_errors(errors)
    }

    /// 便捷构造器：404 未找到
    pub fn not_found(message: &str) -> Self {
        Self::new(404, message).with_error_code("RESOURCE_NOT_FOUND")
    }

    /// 便捷构造器：401 未认证
    pub fn unauthorized(message: &str) -> Self {
        Self::new(401, message).with_error_code("UNAUTHORIZED")
    }

    /// 便捷构造器：403 禁止访问
    pub fn forbidden(message: &str) -> Self {
        Self::new(403, message).with_error_code("FORBIDDEN")
    }

    /// 便捷构造器：409 资源已存在
    pub fn conflict(message: &str) -> Self {
        Self::new(409, message).with_error_code("RESOURCE_ALREADY_EXISTS")
    }

    /// 便捷构造器：500 内部错误
    pub fn internal(message: &str) -> Self {
        Self::new(500, message).with_error_code("INTERNAL_ERROR")
    }
}

impl axum::response::IntoResponse for ErrorPayload {
    fn into_response(self) -> axum::response::Response {
        let status =
            axum::http::StatusCode::from_u16(self.code).unwrap_or(axum::http::StatusCode::OK);
        let body = axum::Json(self);
        (status, body).into_response()
    }
}

/// 便捷函数：创建 ErrorPayload
pub fn error_payload(code: u16, message: &str) -> ErrorPayload {
    ErrorPayload::new(code, message)
}

/// 便捷函数：创建 ErrorPayload 并序列化为 serde_json::Value
///
/// 用于在不改变返回类型（Json<serde_json::Value>）的情况下统一错误体格式。
/// 替代手写 `serde_json::json!({"success": false, "message": ..., "code": ...})` 模式。
pub fn error_value(code: u16, message: &str) -> serde_json::Value {
    serde_json::to_value(ErrorPayload::new(code, message)).unwrap_or_else(|_| {
        serde_json::json!({
            "code": code,
            "success": false,
            "message": message,
        })
    })
}

#[derive(Debug, Serialize, Deserialize, utoipa::IntoParams)]
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
    #[serde(alias = "pagesize", alias = "pageSize")]
    pub page_size: i64,
    #[schema(example = 5)]
    #[serde(alias = "totalPages")]
    pub total_pages: i64,
}

/// 纯函数：统一分页总页数算法。
/// - `total <= 0` → 0
/// - `page_size <= 0` → 0（无有效页大小则无页）
pub fn total_pages_of(total: i64, page_size: i64) -> i64 {
    if total <= 0 || page_size <= 0 {
        return 0;
    }
    (total - 1) / page_size + 1
}

impl<T> PaginatedResponse<T> {
    pub fn new(items: Vec<T>, total: i64, page: i64, page_size: i64) -> Self {
        let page = page.max(1);
        let page_size = page_size.clamp(1, 100);
        let total_pages = total_pages_of(total, page_size);
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
    #[serde(alias = "pagesize")]
    pub page_size: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[serde(alias = "totalPages")]
    pub total_pages: Option<i64>,
}

impl<T> ListResponse<T> {
    pub fn new(items: Vec<T>, total: i64) -> Self {
        Self {
            items,
            total,
            page: None,
            page_size: None,
            total_pages: None,
        }
    }

    pub fn with_pagination(items: Vec<T>, total: i64, page: i64, page_size: i64) -> Self {
        Self {
            items,
            total,
            page: Some(page),
            page_size: Some(page_size),
            total_pages: Some(total_pages_of(total, page_size)),
        }
    }

    pub fn from_parts(data: Vec<T>, count: i64) -> Self {
        Self::new(data, count)
    }
}

#[macro_export]
macro_rules! list_resp {
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
}
