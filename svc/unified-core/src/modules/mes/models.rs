//! MES 数据模型

use serde::{Deserialize, Serialize};

/// 设备信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Equipment {
    pub id: String,
    pub name: String,
    pub code: String,
    pub status: String, // running / idle / maintenance / fault
    pub location: String,
    pub product_line: String,
    pub temperature: Option<f64>,
    pub vibration: Option<f64>,
    pub running_hours: Option<f64>,
    pub last_maintenance: Option<String>,
    pub next_maintenance: Option<String>,
}

/// 工单信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkOrder {
    pub id: String,
    pub order_no: String,
    pub product_name: String,
    pub quantity: i32,
    pub completed: i32,
    pub status: String, // pending / in_progress / completed / paused
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub priority: String, // high / medium / low
    pub assignee: Option<String>,
}

/// WIP (在制品) 统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WipStatistics {
    pub total_wip: i32,
    pub by_status: Vec<StatusCount>,
    pub by_line: Vec<LineCount>,
    pub average_cycle_time: Option<f64>,
    pub on_time_rate: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StatusCount {
    pub status: String,
    pub count: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LineCount {
    pub line: String,
    pub count: i32,
}

/// 质量检测记录
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QualityInspection {
    pub id: String,
    pub inspection_no: String,
    pub product_name: String,
    pub batch_no: String,
    pub inspector: String,
    pub result: String, // pass / fail / pending
    pub defects: Vec<String>,
    pub inspected_at: String,
}

/// 分页响应
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginatedResponse<T> {
    pub items: Vec<T>,
    pub total: i64,
    pub page: i32,
    pub page_size: i32,
}

/// API 统一响应
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub message: Option<String>,
}

/// 生产订单
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductionOrder {
    pub id: String,
    pub order_no: String,
    pub product_name: String,
    pub quantity: i32,
    pub completed: i32,
    pub status: String,
    pub priority: String,
    pub start_date: Option<String>,
    pub due_date: Option<String>,
    pub assignee: Option<String>,
    pub workstation: Option<String>,
}

/// 工作站
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkStation {
    pub id: String,
    pub name: String,
    pub code: String,
    pub status: String,
    pub line: String,
    pub operator: Option<String>,
    pub current_order: Option<String>,
}

/// 生产记录
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductionRecord {
    pub id: String,
    pub record_no: String,
    pub order_no: String,
    pub product_name: String,
    pub quantity: i32,
    pub good_quantity: i32,
    pub defect_quantity: i32,
    pub operator: String,
    pub workstation: String,
    pub recorded_at: String,
}

/// 生产排程
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductionSchedule {
    pub id: String,
    pub schedule_no: String,
    pub order_no: String,
    pub product_name: String,
    pub workstation: String,
    pub planned_start: String,
    pub planned_end: String,
    pub status: String,
    pub priority: String,
}
