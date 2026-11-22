//! 对账中心关联 / 明细快照状态（W5-B B10）
//!
//! `finance.reconciliation_settlement_links.status` 只由创建写 `linked`、解除写
//! `cancelled`，但列表过滤接受任意字符串；`finance.reconciliation_item_snapshots.match_status`
//! 只在手工/自动对账写 `matched`，其余状态来自同步侧，DB 无约束，NULL 被统计隐式当未匹配。
//!
//! 这里把两列的口径固定下来，避免新增任意状态值后列表过滤静默返回 0 行。

use std::fmt;
use std::str::FromStr;

use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum SettlementLinkStatus {
    Linked,
    Cancelled,
}

impl SettlementLinkStatus {
    pub const ALL: [Self; 2] = [Self::Linked, Self::Cancelled];
    pub const DB_VALUES: [&'static str; 2] = ["linked", "cancelled"];
    pub const DEFAULT: Self = Self::Linked;

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim() {
            "linked" => Some(Self::Linked),
            "cancelled" => Some(Self::Cancelled),
            _ => None,
        }
    }

    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Linked => "linked",
            Self::Cancelled => "cancelled",
        }
    }
}

impl fmt::Display for SettlementLinkStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

impl FromStr for SettlementLinkStatus {
    type Err = ();

    fn from_str(raw: &str) -> Result<Self, Self::Err> {
        Self::from_db_str(raw).ok_or(())
    }
}

/// 对账明细快照匹配状态。值与 `models::MatchStatus` 保持一致，
/// 仅列名类型是 varchar，不能直接复用 sqlx ENUM 解码。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum SnapshotMatchStatus {
    Unmatched,
    Matched,
    Diff,
    Manual,
}

impl SnapshotMatchStatus {
    pub const ALL: [Self; 4] = [Self::Unmatched, Self::Matched, Self::Diff, Self::Manual];

    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Unmatched => "unmatched",
            Self::Matched => "matched",
            Self::Diff => "diff",
            Self::Manual => "manual",
        }
    }
}

impl fmt::Display for SnapshotMatchStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

impl FromStr for SnapshotMatchStatus {
    type Err = ();

    fn from_str(raw: &str) -> Result<Self, Self::Err> {
        match raw.trim() {
            "unmatched" => Ok(Self::Unmatched),
            "matched" => Ok(Self::Matched),
            "diff" => Ok(Self::Diff),
            "manual" => Ok(Self::Manual),
            _ => Err(()),
        }
    }
}

/// 差异调整状态：创建 `pending`，审批 `approved`，拒绝 `rejected`。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum DifferenceAdjustmentStatus {
    Pending,
    Approved,
    Rejected,
}

impl DifferenceAdjustmentStatus {
    pub const ALL: [Self; 3] = [Self::Pending, Self::Approved, Self::Rejected];

    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Approved => "approved",
            Self::Rejected => "rejected",
        }
    }
}

impl fmt::Display for DifferenceAdjustmentStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

impl FromStr for DifferenceAdjustmentStatus {
    type Err = ();

    fn from_str(raw: &str) -> Result<Self, Self::Err> {
        match raw.trim() {
            "pending" => Ok(Self::Pending),
            "approved" => Ok(Self::Approved),
            "rejected" => Ok(Self::Rejected),
            _ => Err(()),
        }
    }
}

/// NULL / 空串是未匹配的历史别名；未知值返回 `None`，由调用方拒绝。
pub fn normalize_snapshot_match_status(raw: Option<&str>) -> Option<SnapshotMatchStatus> {
    match raw.map(str::trim).filter(|s| !s.is_empty()) {
        Some(raw) => raw.parse().ok(),
        None => Some(SnapshotMatchStatus::Unmatched),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn link_values_roundtrip() {
        for status in SettlementLinkStatus::ALL {
            assert_eq!(SettlementLinkStatus::from_str(status.as_str()), Ok(status));
        }
        assert_eq!(SettlementLinkStatus::from_str("unknown"), Err(()));
    }

    #[test]
    fn snapshot_values_roundtrip() {
        for status in SnapshotMatchStatus::ALL {
            assert_eq!(
                normalize_snapshot_match_status(Some(status.as_str())),
                Some(status)
            );
        }
    }

    #[test]
    fn snapshot_null_is_unmatched() {
        assert_eq!(
            normalize_snapshot_match_status(None),
            Some(SnapshotMatchStatus::Unmatched)
        );
        assert_eq!(
            normalize_snapshot_match_status(Some("  ")),
            Some(SnapshotMatchStatus::Unmatched)
        );
    }

    #[test]
    fn difference_values_roundtrip() {
        for status in DifferenceAdjustmentStatus::ALL {
            assert_eq!(
                DifferenceAdjustmentStatus::from_str(status.as_str()),
                Ok(status)
            );
        }
        assert_eq!(DifferenceAdjustmentStatus::from_str("unknown"), Err(()));
        assert_eq!(DifferenceAdjustmentStatus::from_str("APPROVED"), Err(()));
    }

    #[test]
    fn snapshot_unknown_is_rejected() {
        assert_eq!(normalize_snapshot_match_status(Some("pending")), None);
    }
}
