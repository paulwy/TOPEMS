//! PDM 产品数据管理模块数据模型

use serde::{Deserialize, Serialize};

/// 物料列表项
#[derive(Debug, Serialize, Deserialize)]
pub struct Material {
    pub id: String,
    pub material_code: Option<String>,
    pub material_name: Option<String>,
    pub material_type: Option<String>,
    pub unit: Option<String>,
    pub status: Option<String>,
}
