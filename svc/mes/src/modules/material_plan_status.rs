//! 材料计划状态：`mes.material_plans.status` 的唯一值源。
//!
//! 生命周期：pending（创建）→ requisitioned（提交）→ sourced（请购完成）
//! → satisfied / shortage；cancelled 为终态。前端 `MaterialPlanStatus` 与本集合对齐。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MaterialPlanStatus {
    /// 待处理
    Pending,
    /// 已提交请购
    Requisitioned,
    /// 已寻源/请购完成
    Sourced,
    /// 已满足
    Satisfied,
    /// 短缺
    Shortage,
    /// 已取消
    Cancelled,
}

impl MaterialPlanStatus {
    /// `mes.material_plans.status` 允许的唯一集合
    pub const DB_VALUES: [&'static str; 6] = [
        "pending",
        "requisitioned",
        "sourced",
        "satisfied",
        "shortage",
        "cancelled",
    ];

    /// 新建材料计划的初始态
    pub const DEFAULT: Self = Self::Pending;

    /// 严格解析数据库/请求字符串；未知值返回 `None`
    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "pending" => Some(Self::Pending),
            "requisitioned" => Some(Self::Requisitioned),
            "sourced" => Some(Self::Sourced),
            "satisfied" => Some(Self::Satisfied),
            "shortage" => Some(Self::Shortage),
            "cancelled" | "canceled" => Some(Self::Cancelled),
            _ => None,
        }
    }

    /// 写入 `mes.material_plans.status` 的唯一字符串形式
    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Requisitioned => "requisitioned",
            Self::Sourced => "sourced",
            Self::Satisfied => "satisfied",
            Self::Shortage => "shortage",
            Self::Cancelled => "cancelled",
        }
    }

    /// 提交：仅 pending
    pub fn submit_from() -> &'static [&'static str] {
        &["pending"]
    }

    /// 请购：仅 requisitioned
    pub fn requisition_from() -> &'static [&'static str] {
        &["requisitioned"]
    }

    /// 取消：未到终态之前
    pub fn cancel_from() -> &'static [&'static str] {
        &["pending", "requisitioned", "sourced", "shortage"]
    }
}

impl std::fmt::Display for MaterialPlanStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_db_str())
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_all_values() {
        for raw in MaterialPlanStatus::DB_VALUES {
            assert_eq!(
                MaterialPlanStatus::from_db_str(raw).map(|v| v.as_db_str()),
                Some(raw)
            );
        }
        assert_eq!(MaterialPlanStatus::from_db_str("bogus"), None);
        assert_eq!(MaterialPlanStatus::DEFAULT.as_db_str(), "pending");
        assert!(MaterialPlanStatus::submit_from().contains(&"pending"));
        assert!(MaterialPlanStatus::requisition_from().contains(&"requisitioned"));
        assert!(!MaterialPlanStatus::cancel_from().contains(&"satisfied"));
    }
}
