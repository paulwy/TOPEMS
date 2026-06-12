use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ProjectStatus {
    Draft,
    PendingApproval,
    Active,
    Paused,
    Completed,
    Cancelled,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum RiskLevel {
    Low,
    Medium,
    High,
    Critical,
}

impl Default for RiskLevel {
    fn default() -> Self {
        RiskLevel::Medium
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Project {
    pub id: Uuid,
    pub name: String,
    pub code: String,
    pub description: Option<String>,
    pub project_type: String,
    pub status: String,
    pub leader: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub budget: Option<Decimal>,
    pub progress: i32,
    pub project_config: Option<serde_json::Value>,
    pub benefit_target: Option<serde_json::Value>,
    pub risk_level: Option<String>,
    pub priority: Option<i32>,
    pub tags: Option<Vec<String>>,
    pub parent_id: Option<Uuid>,
    pub workspace_id: Option<Uuid>,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// 项目财务扩展字段
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ProjectFinance {
    pub project_id: Uuid,
    pub actual_cost: Option<Decimal>,           // 实际成本
    pub cost_variance: Option<Decimal>,         // 成本差异
    pub cost_variance_rate: Option<Decimal>,    // 成本差异率
    pub cost_budget_ratio: Option<Decimal>,    // 成本预算比
    pub committed_cost: Option<Decimal>,         // 已承诺成本
    pub forecast_cost: Option<Decimal>,        // 预测成本
    pub revenue: Option<Decimal>,               // 收入
    pub earned_value: Option<Decimal>,          // 挣值
    pub profit: Option<Decimal>,                // 利润
    pub profit_margin: Option<Decimal>,         // 利润率
    pub investment_amount: Option<Decimal>,     // 投资金额
    pub roi: Option<Decimal>,                  // 投资回报率
    pub payment_status: String,                 // 付款状态
    pub invoice_status: String,                 // 发票状态
    pub tax_amount: Option<Decimal>,           // 税额
    pub cost_loaded_progress: Option<Decimal>,  // 成本加载进度
    pub schedule_variance: Option<Decimal>,     // 进度差异
    pub cost_performance_index: Option<Decimal>, // 成本绩效指数
    pub schedule_performance_index: Option<Decimal>, // 进度绩效指数
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateProjectRequest {
    pub name: String,
    pub code: String,
    pub description: Option<String>,
    pub project_type: String,
    pub leader: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub budget: Option<Decimal>,
    pub project_config: Option<serde_json::Value>,
    pub benefit_target: Option<serde_json::Value>,
    pub risk_level: Option<String>,
    pub priority: Option<i32>,
    pub tags: Option<Vec<String>>,
    pub parent_id: Option<Uuid>,
    pub workspace_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateProjectRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub leader: Option<String>,
    pub end_date: Option<DateTime<Utc>>,
    pub budget: Option<Decimal>,
    pub progress: Option<i32>,
    pub project_config: Option<serde_json::Value>,
    pub benefit_target: Option<serde_json::Value>,
    pub risk_level: Option<String>,
    pub priority: Option<i32>,
    pub tags: Option<Vec<String>>,
    pub parent_id: Option<Uuid>,
    pub workspace_id: Option<Uuid>,
}
