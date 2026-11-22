//! 库位优化建议状态：`wms.slotting_suggestions.status` 的唯一值源。
//!
//! 生命周期：优化任务生成 `pending`；人工应用 `applied`，人工拒绝 `rejected`。
//! `applied / rejected` 均为终态，不允许再次流转。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SlottingSuggestionStatus {
    /// 待处理
    Pending,
    /// 已应用
    Applied,
    /// 已拒绝
    Rejected,
}

impl SlottingSuggestionStatus {
    /// `wms.slotting_suggestions.status` 允许的唯一集合
    pub const DB_VALUES: [&'static str; 3] = ["pending", "applied", "rejected"];

    /// 优化任务生成的初始态
    pub const DEFAULT: Self = Self::Pending;

    /// 允许应用/拒绝的起始状态
    pub fn decide_from() -> &'static [&'static str] {
        &["pending"]
    }

    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "pending" => Some(Self::Pending),
            "applied" => Some(Self::Applied),
            "rejected" => Some(Self::Rejected),
            _ => None,
        }
    }

    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Applied => "applied",
            Self::Rejected => "rejected",
        }
    }

    pub fn is_terminal(&self) -> bool {
        matches!(self, Self::Applied | Self::Rejected)
    }

    /// 迁移矩阵：`pending` 可应用或拒绝，终态不可回退；同态回写视为幂等。
    pub fn can_transition_to(&self, target: Self) -> Result<(), String> {
        if *self == target {
            return Ok(());
        }
        let allowed = match self {
            Self::Pending => matches!(target, Self::Applied | Self::Rejected),
            Self::Applied | Self::Rejected => false,
        };
        if allowed {
            Ok(())
        } else {
            Err(format!(
                "库位优化建议状态不允许从 {} 流转到 {}",
                self.as_db_str(),
                target.as_db_str()
            ))
        }
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn status_roundtrip() {
        for s in SlottingSuggestionStatus::DB_VALUES {
            assert_eq!(
                SlottingSuggestionStatus::from_db_str(s).map(|v| v.as_db_str()),
                Some(s)
            );
        }
        assert_eq!(SlottingSuggestionStatus::from_db_str("done"), None);
        assert_eq!(SlottingSuggestionStatus::DEFAULT.as_db_str(), "pending");
    }

    #[test]
    fn status_transition_matrix() {
        assert!(SlottingSuggestionStatus::Pending
            .can_transition_to(SlottingSuggestionStatus::Applied)
            .is_ok());
        assert!(SlottingSuggestionStatus::Pending
            .can_transition_to(SlottingSuggestionStatus::Rejected)
            .is_ok());
        assert!(SlottingSuggestionStatus::Applied
            .can_transition_to(SlottingSuggestionStatus::Pending)
            .is_err());
        assert!(SlottingSuggestionStatus::Rejected
            .can_transition_to(SlottingSuggestionStatus::Applied)
            .is_err());
    }
}
