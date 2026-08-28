//! 通用 DSH 类型定义

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

/// 统一响应结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DshResponse<T> {
    /// 是否成功
    pub success: bool,
    /// 状态码
    pub code: String,
    /// 消息
    pub message: String,
    /// 业务数据
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,
    /// 错误信息
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<DshError>,
    /// 元数据
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<DshMetadata>,
}

impl<T> DshResponse<T> {
    /// 创建成功响应
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            code: "SUCCESS".to_string(),
            message: "操作成功".to_string(),
            data: Some(data),
            error: None,
            metadata: Some(DshMetadata::default()),
        }
    }

    /// 创建成功响应（带消息）
    pub fn success_with_message(data: T, message: impl Into<String>) -> Self {
        Self {
            success: true,
            code: "SUCCESS".to_string(),
            message: message.into(),
            data: Some(data),
            error: None,
            metadata: Some(DshMetadata::default()),
        }
    }

    /// 创建错误响应
    pub fn error(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            success: false,
            code: code.into(),
            message: message.into(),
            data: None,
            error: Some(DshError {
                error_type: "UNKNOWN".to_string(),
                field: None,
                details: None,
                suggestion: None,
            }),
            metadata: Some(DshMetadata::default()),
        }
    }
}

/// 错误信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DshError {
    /// 错误类型
    pub error_type: String,
    /// 相关字段
    #[serde(skip_serializing_if = "Option::is_none")]
    pub field: Option<String>,
    /// 详细信息
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<String>,
    /// 建议
    #[serde(skip_serializing_if = "Option::is_none")]
    pub suggestion: Option<String>,
}

/// 元数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DshMetadata {
    /// 请求 ID
    pub request_id: String,
    /// 处理时间（毫秒）
    pub processing_time_ms: u64,
    /// 时间戳
    pub timestamp: String,
    /// 租户 ID
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tenant_id: Option<String>,
    /// 用户 ID
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user_id: Option<String>,
}

impl Default for DshMetadata {
    fn default() -> Self {
        Self {
            request_id: Uuid::new_v4().to_string(),
            processing_time_ms: 0,
            timestamp: chrono::Utc::now().to_rfc3339(),
            tenant_id: None,
            user_id: None,
        }
    }
}

/// 分页请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginationRequest {
    /// 页码（从 1 开始）
    #[serde(default = "default_page")]
    pub page: u32,
    /// 每页大小
    #[serde(default = "default_page_size")]
    pub page_size: u32,
    /// 排序字段
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sort_by: Option<String>,
    /// 排序方向
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sort_order: Option<SortOrder>,
}

fn default_page() -> u32 { 1 }
fn default_page_size() -> u32 { 20 }

impl Default for PaginationRequest {
    fn default() -> Self {
        Self {
            page: 1,
            page_size: 20,
            sort_by: None,
            sort_order: None,
        }
    }
}

/// 排序方向
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum SortOrder {
    /// 升序
    Asc,
    /// 降序
    Desc,
}

/// 分页响应
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginationResponse<T> {
    /// 数据列表
    pub items: Vec<T>,
    /// 总记录数
    pub total: u64,
    /// 当前页码
    pub page: u32,
    /// 每页大小
    pub page_size: u32,
    /// 总页数
    pub total_pages: u32,
    /// 是否有下一页
    pub has_next: bool,
    /// 是否有上一页
    pub has_prev: bool,
}

impl<T> PaginationResponse<T> {
    /// 创建分页响应
    pub fn new(items: Vec<T>, total: u64, page: u32, page_size: u32) -> Self {
        let total_pages = if page_size == 0 {
            0
        } else {
            ((total as f64) / (page_size as f64)).ceil() as u32
        };
        Self {
            has_next: page < total_pages,
            has_prev: page > 1,
            items,
            total,
            page,
            page_size,
            total_pages,
        }
    }
}

/// 通用键值对
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyValue<K, V> {
    pub key: K,
    pub value: V,
}

/// 通用统计数据
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Statistics {
    /// 总数
    pub total: u64,
    /// 今日新增
    pub today: u64,
    /// 本周新增
    pub this_week: u64,
    /// 本月新增
    pub this_month: u64,
    /// 按日期统计
    #[serde(skip_serializing_if = "Option::is_none")]
    by_date: Option<HashMap<String, u64>>,
}

/// 操作结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OperationResult {
    /// 操作是否成功
    pub success: bool,
    /// 操作的记录 ID
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,
    /// 影响的记录数
    pub affected_count: u64,
    /// 消息
    pub message: String,
}

/// 批量操作结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchOperationResult {
    /// 总数
    pub total: u64,
    /// 成功数
    pub success_count: u64,
    /// 失败数
    pub failure_count: u64,
    /// 成功的 ID 列表
    pub success_ids: Vec<String>,
    /// 失败的详情
    pub failures: Vec<BatchFailure>,
}

/// 批量操作失败项
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchFailure {
    /// ID
    pub id: String,
    /// 错误码
    pub error_code: String,
    /// 错误消息
    pub error_message: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dsh_response_success() {
        let resp = DshResponse::success("hello".to_string());
        assert!(resp.success);
        assert_eq!(resp.code, "SUCCESS");
        assert_eq!(resp.data.unwrap(), "hello");
    }

    #[test]
    fn test_dsh_response_error() {
        let resp: DshResponse<()> = DshResponse::error("ERROR", "出错了");
        assert!(!resp.success);
        assert_eq!(resp.code, "ERROR");
        assert_eq!(resp.message, "出错了");
    }

    #[test]
    fn test_pagination_response() {
        let items: Vec<i32> = vec![1, 2, 3];
        let resp = PaginationResponse::new(items, 100, 1, 10);
        assert_eq!(resp.total, 100);
        assert_eq!(resp.page, 1);
        assert_eq!(resp.page_size, 10);
        assert_eq!(resp.total_pages, 10);
        assert!(resp.has_next);
        assert!(!resp.has_prev);
    }

    #[test]
    fn test_sort_order_serialization() {
        let asc = SortOrder::Asc;
        let json = serde_json::to_string(&asc).unwrap();
        assert_eq!(json, "\"asc\"");

        let desc = SortOrder::Desc;
        let json = serde_json::to_string(&desc).unwrap();
        assert_eq!(json, "\"desc\"");
    }
}
