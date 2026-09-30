//! ERP 企业资源计划模块数据模型

use serde::{Deserialize, Serialize};

/// 采购订单列表项
#[derive(Debug, Serialize, Deserialize)]
pub struct PurchaseOrder {
    pub id: String,
    pub order_no: Option<String>,
    pub supplier_name: Option<String>,
    pub order_date: Option<chrono::DateTime<chrono::Utc>>,
    pub delivery_date: Option<chrono::DateTime<chrono::Utc>>,
    pub status: Option<String>,
    pub total_amount: Option<f64>,
    pub payable_amount: Option<f64>,
}
