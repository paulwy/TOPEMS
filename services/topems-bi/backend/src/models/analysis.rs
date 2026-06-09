use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use sqlx::FromRow;

/// 分析查询类型
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "analysis_type", rename_all = "lowercase")]
pub enum AnalysisType {
    Query,
    Aggregation,
    Comparison,
    Trend,
}

/// 分析查询请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisQueryRequest {
    pub name: String,
    pub description: Option<String>,
    pub query_type: AnalysisType,
    pub data_source_id: Uuid,
    pub sql_query: Option<String>,
    pub filters: Option<serde_json::Value>,
    pub group_by: Option<Vec<String>>,
    pub aggregations: Option<Vec<AggregationConfig>>,
    pub time_range: Option<TimeRange>,
    pub created_by: Option<Uuid>,
}

/// 聚合配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AggregationConfig {
    pub field: String,
    pub function: AggregationFunction,
    pub alias: Option<String>,
}

/// 聚合函数类型
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AggregationFunction {
    Sum,
    Avg,
    Count,
    Max,
    Min,
    DistinctCount,
}

/// 时间范围
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeRange {
    pub field: String,
    pub start: DateTime<Utc>,
    pub end: DateTime<Utc>,
    pub granularity: Option<TimeGranularity>,
}

/// 时间粒度
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TimeGranularity {
    Hour,
    Day,
    Week,
    Month,
    Quarter,
    Year,
}

/// 分析查询模型
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AnalysisQuery {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub query_type: AnalysisType,
    pub data_source_id: Uuid,
    pub sql_query: Option<String>,
    pub filters: Option<serde_json::Value>,
    pub group_by: Option<serde_json::Value>,
    pub aggregations: Option<serde_json::Value>,
    pub time_range: Option<serde_json::Value>,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub is_active: bool,
}

/// 分析结果模型
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AnalysisResult {
    pub id: Uuid,
    pub query_id: Uuid,
    pub result_data: serde_json::Value,
    pub metadata: Option<serde_json::Value>,
    pub execution_time_ms: i64,
    pub row_count: i64,
    pub created_at: DateTime<Utc>,
    pub cached: bool,
}

/// 分析历史记录
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AnalysisHistory {
    pub id: Uuid,
    pub query_id: Uuid,
    pub user_id: Option<Uuid>,
    pub executed_at: DateTime<Utc>,
    pub execution_time_ms: i64,
    pub row_count: i64,
    pub status: String,
    pub error_message: Option<String>,
}

/// 创建分析查询请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateAnalysisQuery {
    pub name: String,
    pub description: Option<String>,
    pub query_type: AnalysisType,
    pub data_source_id: Uuid,
    pub sql_query: Option<String>,
    pub filters: Option<serde_json::Value>,
    pub group_by: Option<Vec<String>>,
    pub aggregations: Option<Vec<AggregationConfig>>,
    pub time_range: Option<TimeRange>,
    pub created_by: Option<Uuid>,
}

/// 更新分析查询请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateAnalysisQuery {
    pub name: Option<String>,
    pub description: Option<String>,
    pub sql_query: Option<String>,
    pub filters: Option<serde_json::Value>,
    pub group_by: Option<Vec<String>>,
    pub aggregations: Option<Vec<AggregationConfig>>,
    pub time_range: Option<TimeRange>,
    pub is_active: Option<bool>,
}

/// 执行分析查询请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecuteAnalysisQuery {
    pub query_id: Uuid,
    pub parameters: Option<serde_json::Value>,
    pub use_cache: Option<bool>,
    pub cache_ttl_seconds: Option<i64>,
}

/// 保存分析结果请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SaveAnalysisResult {
    pub query_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub result_data: serde_json::Value,
    pub metadata: Option<serde_json::Value>,
}