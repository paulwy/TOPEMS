//! WMS 数据模型

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// 入库订单
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct InboundOrder {
    pub id: String,
    pub order_no: String,
    pub supplier: String,
    pub warehouse: String,
    pub status: String,
    pub total_amount: f64,
    pub created_at: String,
    pub updated_at: String,
}

/// 出库订单
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct OutboundOrder {
    pub id: String,
    pub order_no: String,
    pub customer: String,
    pub warehouse: String,
    pub status: String,
    pub total_amount: f64,
    pub created_at: String,
    pub updated_at: String,
}

/// 库存项目
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct InventoryItem {
    pub id: String,
    pub sku: String,
    pub product_name: String,
    pub warehouse: String,
    pub location: String,
    pub quantity: i32,
    pub unit: String,
    pub updated_at: String,
}

/// 调拨单
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct TransferOrder {
    pub id: String,
    pub transfer_no: String,
    pub from_warehouse: String,
    pub to_warehouse: String,
    pub status: String,
    pub total_quantity: i32,
    pub created_at: String,
}

/// 分页响应
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct PaginatedResponse<T> {
    pub items: Vec<T>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

/// API 响应包装
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub message: Option<String>,
}
