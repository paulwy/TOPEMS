//! 安全问题（`/api/ehs/issues`）状态唯一集合。
//!
//! 落库列：`ehs.safety_hazards.status`（varchar，NOT NULL，DB 默认 `reported`）。
//! 值集与前端 `apps/web/src/schemas/ehs/safetyIssue.ts` 的下拉、筛选、色板一致：
//! `reported`（已上报）→ `pending_approval`（审批中）→ `rectifying`（整改中）→
//! `pending_verification`（待验收）→ `verified`（已验收）/ `closed`（已闭环），
//! 另有 `rejected`（已驳回）与历史终态 `resolved`。
//!
//! 本批之前该列存在三套口径：前端默认 `reported`、DB 默认 `pending`、
//! 后端创建硬编码 `active`，且本地 11 行历史数据都是 `active`（前端无此值，只能显示灰色兜底）。
//! 现统一为 `reported`：DB 默认改为 `reported`，历史 `active` 归一为 `reported`。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SafetyHazardStatus {
    /// 已上报（创建默认）
    Reported,
    /// 审批中
    PendingApproval,
    /// 整改中
    Rectifying,
    /// 待验收
    PendingVerification,
    /// 已验收
    Verified,
    /// 已闭环
    Closed,
    /// 已驳回
    Rejected,
    /// 历史终态
    Resolved,
}

impl SafetyHazardStatus {
    pub const DEFAULT: Self = Self::Reported;

    pub const DB_VALUES: &'static [&'static str] = &[
        "reported",
        "pending_approval",
        "rectifying",
        "pending_verification",
        "verified",
        "closed",
        "rejected",
        "resolved",
    ];

    #[must_use]
    pub fn as_db_str(self) -> &'static str {
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

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
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

    /// 响应兜底：列 NOT NULL，未知值回落 `DEFAULT`。
    #[must_use]
    pub fn normalize(raw: &str) -> &'static str {
        Self::from_db_str(raw).unwrap_or(Self::DEFAULT).as_db_str()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_and_values_are_stable() {
        assert_eq!(SafetyHazardStatus::DEFAULT.as_db_str(), "reported");
        assert_eq!(
            SafetyHazardStatus::DB_VALUES,
            &[
                "reported",
                "pending_approval",
                "rectifying",
                "pending_verification",
                "verified",
                "closed",
                "rejected",
                "resolved"
            ]
        );
    }

    #[test]
    fn every_value_roundtrips() {
        for value in SafetyHazardStatus::DB_VALUES {
            assert_eq!(
                SafetyHazardStatus::from_db_str(value).map(|v| v.as_db_str()),
                Some(*value)
            );
        }
        assert_eq!(SafetyHazardStatus::from_db_str("active"), None);
        assert_eq!(SafetyHazardStatus::from_db_str("bogus"), None);
        assert_eq!(SafetyHazardStatus::normalize("active"), "reported");
        assert_eq!(SafetyHazardStatus::normalize(""), "reported");
        assert_eq!(SafetyHazardStatus::normalize("Closed"), "closed");
    }
}
