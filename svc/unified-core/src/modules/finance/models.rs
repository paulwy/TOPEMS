//! Finance 财务模块数据模型

use serde::{Deserialize, Serialize};

/// 应收列表项
#[derive(Debug, Serialize, Deserialize)]
pub struct Receivable {
    pub id: String,
    pub invoice_number: Option<String>,
    pub amount: Option<f64>,
    pub created_at: Option<chrono::DateTime<chrono::Utc>>,
}
