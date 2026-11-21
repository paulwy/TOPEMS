//! 隐患状态：`ehs.qa_ehs_hazards.status` 的唯一值源。
//!
//! 生命周期（后端动作实际会写入的部分）：
//! reported（创建）→ pending_approval（启动审批）→ rectifying（创建整改）→
//! pending_verification（提交整改）→ closed（验收通过）或回退 rectifying（验收不通过）。
//! `resolved` 是历史终态（本地 39 行，代码不再写入）；
//! `verified` / `rejected` 是前端筛选保留态（当前后端不写入，保留兼容）。
//!
//! B42 之前列表过滤与编辑接口都接受任意字符串；启动审批写入的 `pending_approval`
//! 在列表筛选与状态色板里没有对应项，前端只能显示灰色 fallback。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum HazardStatus {
    /// 已上报（创建默认）
    Reported,
    /// 审批中（启动审批后）
    PendingApproval,
    /// 整改中
    Rectifying,
    /// 待验收（整改已提交）
    PendingVerification,
    /// 已验收（前端保留态，后端不写）
    Verified,
    /// 已闭环
    Closed,
    /// 已驳回（前端保留态，后端不写）
    Rejected,
    /// 历史终态（只读）
    Resolved,
}

impl HazardStatus {
    /// `ehs.qa_ehs_hazards.status` 允许的唯一集合
    pub const DB_VALUES: [&'static str; 8] = [
        "reported",
        "pending_approval",
        "rectifying",
        "pending_verification",
        "verified",
        "closed",
        "rejected",
        "resolved",
    ];

    /// 创建隐患的初始态
    pub const DEFAULT: Self = Self::Reported;

    /// 启动审批允许的起始状态
    pub fn approval_from() -> &'static [&'static str] {
        &["reported"]
    }

    /// 创建整改允许的起始状态
    pub fn rectify_from() -> &'static [&'static str] {
        &["reported", "pending_approval", "rectifying"]
    }

    /// 提交整改允许的起始状态
    pub fn submit_from() -> &'static [&'static str] {
        &["rectifying"]
    }

    /// 验收允许的起始状态
    pub fn verify_from() -> &'static [&'static str] {
        &["pending_verification"]
    }

    /// 是否终态（不可再流转）
    pub fn is_terminal(&self) -> bool {
        matches!(self, Self::Closed | Self::Resolved)
    }

    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "reported" => Some(Self::Reported),
            "pending_approval" => Some(Self::PendingApproval),
            "rectifying" => Some(Self::Rectifying),
            "pending_verification" => Some(Self::PendingVerification),
            "verified" => Some(Self::Verified),
            "closed" => Some(Self::Closed),
            "rejected" => Some(Self::Rejected),
            "resolved" => Some(Self::Resolved),
            _ => None,
        }
    }

    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Reported => "reported",
            Self::PendingApproval => "pending_approval",
            Self::Rectifying => "rectifying",
            Self::PendingVerification => "pending_verification",
            Self::Verified => "verified",
            Self::Closed => "closed",
            Self::Rejected => "rejected",
            Self::Resolved => "resolved",
        }
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn status_roundtrip() {
        for s in HazardStatus::DB_VALUES {
            assert_eq!(HazardStatus::from_db_str(s).map(|v| v.as_db_str()), Some(s));
        }
        assert_eq!(HazardStatus::from_db_str("identified"), None);
        assert_eq!(HazardStatus::DEFAULT.as_db_str(), "reported");
    }

    #[test]
    fn transition_starts_are_canonical() {
        assert!(HazardStatus::submit_from().contains(&"rectifying"));
        assert!(HazardStatus::verify_from().contains(&"pending_verification"));
        assert!(HazardStatus::Closed.is_terminal());
        assert!(!HazardStatus::Rectifying.is_terminal());
    }
}
