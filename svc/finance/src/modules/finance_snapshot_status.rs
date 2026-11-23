//! 对账/结算本地快照状态（W5-B B213）
//!
//! `finance.reconciliation_snapshots.status` 与 `finance.settlement_snapshots.status` 都是
//! `text` 可空列，写入来自事件载荷（ERP 对账事件、PM/Finance 结算事件）与本地审批/驳回字面量，
//! 此前没有任何校验：事件可重放、可被其它发布方伪造，非法状态会直接落库并让列表过滤静默查空。
//!
//! 值集只收有写入证据的值：
//! - 对账快照：ERP 对账事件（`FinReconciliationStatus`）pending/draft/matched/approved，
//!   本地审批写 approved；
//! - 结算快照：本地创建写 draft、PM 结算事件写 pending、本地审批/驳回写 approved/rejected。

use std::fmt;
use std::str::FromStr;

use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ReconciliationSnapshotStatus {
    Pending,
    Draft,
    Matched,
    Approved,
}

impl ReconciliationSnapshotStatus {
    pub const ALL: [Self; 4] = [Self::Pending, Self::Draft, Self::Matched, Self::Approved];
    pub const DB_VALUES: [&'static str; 4] = ["pending", "draft", "matched", "approved"];
    pub const DEFAULT: Self = Self::Pending;

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim() {
            "pending" => Some(Self::Pending),
            "draft" => Some(Self::Draft),
            "matched" => Some(Self::Matched),
            "approved" => Some(Self::Approved),
            _ => None,
        }
    }

    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Draft => "draft",
            Self::Matched => "matched",
            Self::Approved => "approved",
        }
    }

    /// 未知值原样返回 None；读取侧调用方自行决定兜底策略。
    #[must_use]
    pub fn normalize(raw: &str) -> Option<Self> {
        Self::from_db_str(raw)
    }

    /// 列表过滤：None / 空串 / all 表示不过滤；非法值返回 Err。
    pub fn parse_filter(raw: Option<&str>) -> Result<Option<Self>, String> {
        match raw.map(str::trim).filter(|s| !s.is_empty()) {
            None | Some("all") => Ok(None),
            Some(value) => Self::from_db_str(value).map(Some).ok_or_else(|| {
                format!(
                    "非法对账快照状态: {value}，可选值: {}",
                    Self::DB_VALUES.join("/")
                )
            }),
        }
    }
}

impl fmt::Display for ReconciliationSnapshotStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_db_str())
    }
}

impl FromStr for ReconciliationSnapshotStatus {
    type Err = ();

    fn from_str(raw: &str) -> Result<Self, Self::Err> {
        Self::from_db_str(raw).ok_or(())
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum SettlementSnapshotStatus {
    Pending,
    Draft,
    Approved,
    Rejected,
}

impl SettlementSnapshotStatus {
    pub const ALL: [Self; 4] = [Self::Pending, Self::Draft, Self::Approved, Self::Rejected];
    pub const DB_VALUES: [&'static str; 4] = ["pending", "draft", "approved", "rejected"];
    pub const DEFAULT: Self = Self::Pending;

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim() {
            "pending" => Some(Self::Pending),
            "draft" => Some(Self::Draft),
            "approved" => Some(Self::Approved),
            "rejected" => Some(Self::Rejected),
            _ => None,
        }
    }

    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Draft => "draft",
            Self::Approved => "approved",
            Self::Rejected => "rejected",
        }
    }

    #[must_use]
    pub fn normalize(raw: &str) -> Option<Self> {
        Self::from_db_str(raw)
    }

    pub fn parse_filter(raw: Option<&str>) -> Result<Option<Self>, String> {
        match raw.map(str::trim).filter(|s| !s.is_empty()) {
            None | Some("all") => Ok(None),
            Some(value) => Self::from_db_str(value).map(Some).ok_or_else(|| {
                format!(
                    "非法结算快照状态: {value}，可选值: {}",
                    Self::DB_VALUES.join("/")
                )
            }),
        }
    }
}

impl fmt::Display for SettlementSnapshotStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_db_str())
    }
}

impl FromStr for SettlementSnapshotStatus {
    type Err = ();

    fn from_str(raw: &str) -> Result<Self, Self::Err> {
        Self::from_db_str(raw).ok_or(())
    }
}

/// 事件写入入口的严格校验：未知值直接拒绝，不落库。
pub fn validate_reconciliation_status(raw: &str) -> Result<ReconciliationSnapshotStatus, String> {
    ReconciliationSnapshotStatus::from_db_str(raw).ok_or_else(|| {
        format!(
            "非法对账快照状态: {raw}，可选值: {}",
            ReconciliationSnapshotStatus::DB_VALUES.join("/")
        )
    })
}

/// 事件写入入口的严格校验：未知值直接拒绝，不落库。
pub fn validate_settlement_status(raw: &str) -> Result<SettlementSnapshotStatus, String> {
    SettlementSnapshotStatus::from_db_str(raw).ok_or_else(|| {
        format!(
            "非法结算快照状态: {raw}，可选值: {}",
            SettlementSnapshotStatus::DB_VALUES.join("/")
        )
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reconciliation_values_roundtrip() {
        for status in ReconciliationSnapshotStatus::ALL {
            assert_eq!(
                ReconciliationSnapshotStatus::from_db_str(status.as_db_str()),
                Some(status)
            );
            assert_eq!(status.to_string(), status.as_db_str());
        }
    }

    #[test]
    fn settlement_values_roundtrip() {
        for status in SettlementSnapshotStatus::ALL {
            assert_eq!(
                SettlementSnapshotStatus::from_db_str(status.as_db_str()),
                Some(status)
            );
            assert_eq!(status.to_string(), status.as_db_str());
        }
    }

    #[test]
    fn filters_accept_empty_and_all_but_reject_unknown() {
        assert_eq!(ReconciliationSnapshotStatus::parse_filter(None), Ok(None));
        assert_eq!(
            ReconciliationSnapshotStatus::parse_filter(Some("  ")),
            Ok(None)
        );
        assert_eq!(
            ReconciliationSnapshotStatus::parse_filter(Some("all")),
            Ok(None)
        );
        assert!(ReconciliationSnapshotStatus::parse_filter(Some("bogus")).is_err());
        assert_eq!(
            SettlementSnapshotStatus::parse_filter(Some("approved")),
            Ok(Some(SettlementSnapshotStatus::Approved))
        );
        assert!(SettlementSnapshotStatus::parse_filter(Some("bogus")).is_err());
    }

    #[test]
    fn validators_reject_unknown_values() {
        assert!(validate_reconciliation_status("matched").is_ok());
        assert!(validate_reconciliation_status("bogus").is_err());
        assert!(validate_settlement_status("rejected").is_ok());
        assert!(validate_settlement_status("bogus").is_err());
    }
}
