//! CRM 客户关系管理模块数据模型

use serde::{Deserialize, Serialize};

/// 客户列表项
#[derive(Debug, Serialize, Deserialize)]
pub struct Customer {
    pub id: String,
    pub name: Option<String>,
    pub customer_type: Option<String>,
    pub industry: Option<String>,
    pub rating: Option<String>,
    pub region: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
}
