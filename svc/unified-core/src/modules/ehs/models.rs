//! EHS 环境健康安全模块数据模型

use serde::{Deserialize, Serialize};

/// 事故列表项
#[derive(Debug, Serialize, Deserialize)]
pub struct Accident {
    pub id: String,
    pub accident_no: Option<String>,
    pub accident_type: Option<String>,
    pub accident_level: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
}
