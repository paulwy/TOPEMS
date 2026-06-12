#![allow(dead_code)]

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// 可视化图表类型
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "visualization_type", rename_all = "lowercase")]
pub enum VisualizationType {
    Line,
    Bar,
    Pie,
    Scatter,
    Area,
    Radar,
    Gauge,
    Heatmap,
    Treemap,
    Funnel,
    Sankey,
    Boxplot,
    Candlestick,
    Map,
    Graph,
    Table,
    Metric,
    Custom,
}

/// 可视化图表模型
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Visualization {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub visualization_type: VisualizationType,
    pub data_source_id: Option<Uuid>,
    pub query_config: serde_json::Value,
    pub chart_config: serde_json::Value,
    pub style_config: Option<serde_json::Value>,
    pub interaction_config: Option<serde_json::Value>,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub is_active: bool,
    pub is_public: bool,
}

/// 可视化数据模型
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct VisualizationData {
    pub id: Uuid,
    pub visualization_id: Uuid,
    pub data: serde_json::Value,
    pub metadata: Option<serde_json::Value>,
    pub generated_at: DateTime<Utc>,
    pub cached: bool,
    pub cache_expires_at: Option<DateTime<Utc>>,
}

/// 创建可视化图表请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateVisualization {
    pub name: String,
    pub description: Option<String>,
    pub visualization_type: VisualizationType,
    pub data_source_id: Option<Uuid>,
    pub query_config: serde_json::Value,
    pub chart_config: serde_json::Value,
    pub style_config: Option<serde_json::Value>,
    pub interaction_config: Option<serde_json::Value>,
    pub created_by: Option<Uuid>,
    pub is_public: Option<bool>,
}

/// 更新可视化图表请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateVisualization {
    pub name: Option<String>,
    pub description: Option<String>,
    pub visualization_type: Option<VisualizationType>,
    pub data_source_id: Option<Uuid>,
    pub query_config: Option<serde_json::Value>,
    pub chart_config: Option<serde_json::Value>,
    pub style_config: Option<serde_json::Value>,
    pub interaction_config: Option<serde_json::Value>,
    pub is_active: Option<bool>,
    pub is_public: Option<bool>,
}

/// 获取可视化数据请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GetVisualizationData {
    pub visualization_id: Uuid,
    pub parameters: Option<serde_json::Value>,
    pub time_range: Option<TimeRange>,
    pub use_cache: Option<bool>,
    pub cache_ttl_seconds: Option<i64>,
}

/// 时间范围
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeRange {
    pub start: DateTime<Utc>,
    pub end: DateTime<Utc>,
}

/// 可视化数据响应
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VisualizationDataResponse {
    pub visualization_id: Uuid,
    pub visualization_type: VisualizationType,
    pub data: serde_json::Value,
    pub metadata: Option<serde_json::Value>,
    pub generated_at: DateTime<Utc>,
    pub cached: bool,
}

/// 查询配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryConfig {
    pub sql_query: Option<String>,
    pub table_name: Option<String>,
    pub fields: Vec<FieldConfig>,
    pub filters: Option<Vec<FilterConfig>>,
    pub group_by: Option<Vec<String>>,
    pub order_by: Option<Vec<OrderConfig>>,
    pub limit: Option<i32>,
}

/// 字段配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldConfig {
    pub name: String,
    pub alias: Option<String>,
    pub aggregation: Option<AggregationFunction>,
}

/// 聚合函数
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

/// 过滤配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilterConfig {
    pub field: String,
    pub operator: FilterOperator,
    pub value: serde_json::Value,
}

/// 过滤操作符
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum FilterOperator {
    Eq,
    Ne,
    Gt,
    Gte,
    Lt,
    Lte,
    Like,
    In,
    NotIn,
    Between,
    IsNull,
    IsNotNull,
}

/// 排序配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderConfig {
    pub field: String,
    pub direction: OrderDirection,
}

/// 排序方向
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum OrderDirection {
    Asc,
    Desc,
}

/// 图表配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChartConfig {
    pub title: Option<String>,
    pub subtitle: Option<String>,
    pub x_axis: Option<AxisConfig>,
    pub y_axis: Option<AxisConfig>,
    pub legend: Option<LegendConfig>,
    pub tooltip: Option<TooltipConfig>,
    pub series: Vec<SeriesConfig>,
}

/// 轴配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AxisConfig {
    pub title: Option<String>,
    pub field: String,
    pub r#type: AxisType,
    pub min: Option<f64>,
    pub max: Option<f64>,
}

/// 轴类型
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AxisType {
    Category,
    Value,
    Time,
    Log,
}

/// 图例配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LegendConfig {
    pub show: bool,
    pub position: LegendPosition,
}

/// 图例位置
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LegendPosition {
    Top,
    Bottom,
    Left,
    Right,
}

/// 提示框配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TooltipConfig {
    pub show: bool,
    pub trigger: TooltipTrigger,
    pub formatter: Option<String>,
}

/// 提示框触发方式
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TooltipTrigger {
    Item,
    Axis,
}

/// 系列配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SeriesConfig {
    pub name: String,
    pub field: String,
    pub r#type: VisualizationType,
    pub color: Option<String>,
    pub stack: Option<String>,
}
