use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use sqlx::FromRow;

/// 仪表盘模型
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Dashboard {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub layout: serde_json::Value,
    pub filters: Option<serde_json::Value>,
    pub refresh_interval: Option<i32>,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub is_active: bool,
    pub is_public: bool,
}

/// 仪表盘组件模型
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct DashboardWidget {
    pub id: Uuid,
    pub dashboard_id: Uuid,
    pub widget_type: WidgetType,
    pub title: String,
    pub description: Option<String>,
    pub position: sqlx::types::Json<WidgetPosition>,
    pub size: sqlx::types::Json<WidgetSize>,
    pub config: serde_json::Value,
    pub data_source_id: Option<Uuid>,
    pub visualization_id: Option<Uuid>,
    pub refresh_interval: Option<i32>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub is_active: bool,
}

/// 组件类型
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "widget_type", rename_all = "lowercase")]
pub enum WidgetType {
    Chart,
    Table,
    Metric,
    Text,
    Image,
    Map,
    Gauge,
    Pie,
    Bar,
    Line,
    Scatter,
    Heatmap,
    Treemap,
    Funnel,
    Radar,
}

/// 组件位置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WidgetPosition {
    pub x: i32,
    pub y: i32,
}

/// 组件大小
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WidgetSize {
    pub width: i32,
    pub height: i32,
}

/// 创建仪表盘请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateDashboard {
    pub name: String,
    pub description: Option<String>,
    pub layout: serde_json::Value,
    pub filters: Option<serde_json::Value>,
    pub refresh_interval: Option<i32>,
    pub created_by: Option<Uuid>,
    pub is_public: Option<bool>,
}

/// 更新仪表盘请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateDashboard {
    pub name: Option<String>,
    pub description: Option<String>,
    pub layout: Option<serde_json::Value>,
    pub filters: Option<serde_json::Value>,
    pub refresh_interval: Option<i32>,
    pub is_active: Option<bool>,
    pub is_public: Option<bool>,
}

/// 添加仪表盘组件请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddDashboardWidget {
    pub dashboard_id: Uuid,
    pub widget_type: WidgetType,
    pub title: String,
    pub description: Option<String>,
    pub position: WidgetPosition,
    pub size: WidgetSize,
    pub config: serde_json::Value,
    pub data_source_id: Option<Uuid>,
    pub visualization_id: Option<Uuid>,
    pub refresh_interval: Option<i32>,
}

/// 更新仪表盘组件请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateDashboardWidget {
    pub title: Option<String>,
    pub description: Option<String>,
    pub position: Option<WidgetPosition>,
    pub size: Option<WidgetSize>,
    pub config: Option<serde_json::Value>,
    pub data_source_id: Option<Uuid>,
    pub visualization_id: Option<Uuid>,
    pub refresh_interval: Option<i32>,
    pub is_active: Option<bool>,
}

/// 获取仪表盘数据请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GetDashboardData {
    pub dashboard_id: Uuid,
    pub filters: Option<serde_json::Value>,
    pub time_range: Option<TimeRange>,
}

/// 时间范围
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeRange {
    pub start: DateTime<Utc>,
    pub end: DateTime<Utc>,
}

/// 仪表盘数据响应
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardDataResponse {
    pub dashboard_id: Uuid,
    pub widgets: Vec<WidgetData>,
    pub generated_at: DateTime<Utc>,
}

/// 组件数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WidgetData {
    pub widget_id: Uuid,
    pub widget_type: WidgetType,
    pub title: String,
    pub data: serde_json::Value,
    pub metadata: Option<serde_json::Value>,
}