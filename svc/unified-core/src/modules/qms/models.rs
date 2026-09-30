//! QMS 质量管理模块数据模型

use serde::{Deserialize, Serialize};

/// 检验项目列表项
#[derive(Debug, Serialize, Deserialize)]
pub struct InspectionItem {
    pub id: String,
    pub name: Option<String>,
    pub code: Option<String>,
    pub inspection_type: Option<String>,
    pub status: Option<String>,
}
