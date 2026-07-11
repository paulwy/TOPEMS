use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// 库存预警类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum AlertType {
    BelowMin,      // 低于最低库存
    AboveMax,      // 高于最高库存
    ReorderNeeded, // 需要补货
    ExpiryWarning, // 临期预警
    OutOfStock,    // 缺货
}

impl std::fmt::Display for AlertType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AlertType::BelowMin => write!(f, "below_min"),
            AlertType::AboveMax => write!(f, "above_max"),
            AlertType::ReorderNeeded => write!(f, "reorder_needed"),
            AlertType::ExpiryWarning => write!(f, "expiry_warning"),
            AlertType::OutOfStock => write!(f, "out_of_stock"),
        }
    }
}

/// 库存预警记录
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct InventoryAlert {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub inventory_id: Uuid,
    pub material_code: String,
    pub material_name: String,
    pub warehouse_id: Option<Uuid>,
    pub warehouse_name: Option<String>,
    pub location_id: Option<Uuid>,
    pub location_code: Option<String>,
    pub alert_type: String,
    pub current_quantity: f64,
    pub threshold_value: Option<f64>,
    pub deviation_quantity: Option<f64>,
    pub severity: String,
    pub status: String,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 库存预警汇总
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertSummary {
    pub total_alerts: i64,
    pub critical_count: i64,
    pub warning_count: i64,
    pub info_count: i64,
    pub below_min_count: i64,
    pub above_max_count: i64,
    pub reorder_count: i64,
    pub expiry_count: i64,
    pub out_of_stock_count: i64,
}

/// 库存预警查询参数
#[derive(Debug, Clone, Deserialize)]
pub struct AlertQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub alert_type: Option<String>,
    pub severity: Option<String>,
    pub status: Option<String>,
    pub warehouse_id: Option<Uuid>,
}

/// 库存预警统计数据（用于仪表盘）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertStatistics {
    pub summary: AlertSummary,
    pub alerts_by_warehouse: Vec<WarehouseAlertCount>,
    pub alerts_by_material: Vec<MaterialAlertCount>,
}

/// 按仓库统计预警数量
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WarehouseAlertCount {
    pub warehouse_id: Option<Uuid>,
    pub warehouse_name: Option<String>,
    pub alert_count: i64,
}

/// 按物料统计预警数量
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaterialAlertCount {
    pub material_code: String,
    pub material_name: String,
    pub alert_count: i64,
}

/// 创建预警请求
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateAlertRequest {
    pub inventory_id: Uuid,
    pub alert_type: String,
    pub threshold_value: Option<f64>,
    pub remarks: Option<String>,
}

/// 更新预警状态请求
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateAlertStatusRequest {
    pub status: String,
    pub remarks: Option<String>,
}

/// 循环盘点配置
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct CycleCountConfig {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub warehouse_id: Uuid,
    pub location_id: Option<Uuid>,
    pub material_category: Option<String>,
    pub count_frequency: String,
    pub priority_level: String,
    pub last_count_date: Option<DateTime<Utc>>,
    pub next_count_date: DateTime<Utc>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 创建循环盘点配置请求
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateCycleCountConfigRequest {
    pub warehouse_id: Uuid,
    pub location_id: Option<Uuid>,
    pub material_category: Option<String>,
    pub count_frequency: String,
    pub priority_level: String,
}

/// 盘点差异处理记录
#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct DiscrepancyRecord {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub stock_take_id: Uuid,
    pub stock_take_item_id: Uuid,
    pub inventory_id: Uuid,
    pub material_code: String,
    pub material_name: String,
    pub system_quantity: f64,
    pub counted_quantity: f64,
    pub discrepancy_quantity: f64,
    pub discrepancy_type: String,
    pub adjustment_quantity: Option<f64>,
    pub adjustment_status: String,
    pub approved_by: Option<String>,
    pub approval_date: Option<DateTime<Utc>>,
    pub adjustment_date: Option<DateTime<Utc>>,
    pub reason: Option<String>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 创建差异处理请求
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateDiscrepancyRequest {
    pub stock_take_item_id: Uuid,
    pub adjustment_quantity: f64,
    pub reason: String,
    pub notes: Option<String>,
}

/// 审批差异处理请求
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ApproveDiscrepancyRequest {
    pub action: String, // approve, reject
    pub notes: Option<String>,
}
