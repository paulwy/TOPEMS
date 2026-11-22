//! 收款记录状态单一源（W5-B B7）
//!
//! `finance.erp_collection_records.status` 是自由文本，且历史行大量为 NULL（本地 553 行中 351 行）。
//! 代码里存在三值：`pending` / `confirmed` / `written_off`；读取路径把 NULL 当 `pending`，
//! 但确认谓词写成 `status != 'confirmed'`，在 PostgreSQL 中 NULL 不满足比较，导致历史 NULL 行
//! 永远无法确认。更新入口又接受任意字符串。这里统一三值，并把 NULL 归一为 `pending`。

use std::fmt;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CollectionStatus {
    Pending,
    Confirmed,
    WrittenOff,
}

impl CollectionStatus {
    pub const ALL: [Self; 3] = [Self::Pending, Self::Confirmed, Self::WrittenOff];
    pub const DB_VALUES: [&'static str; 3] = ["pending", "confirmed", "written_off"];
    pub const DEFAULT: Self = Self::Pending;

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim() {
            "pending" => Some(Self::Pending),
            "confirmed" => Some(Self::Confirmed),
            "written_off" => Some(Self::WrittenOff),
            _ => None,
        }
    }

    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Confirmed => "confirmed",
            Self::WrittenOff => "written_off",
        }
    }

    /// 允许确认的起始状态；NULL 由调用方先归一为 Pending。
    pub const fn can_confirm(self) -> bool {
        matches!(self, Self::Pending)
    }

    /// 允许核销的起始状态：待确认或已确认；已核销不可重复核销。
    pub const fn can_write_off(self) -> bool {
        matches!(self, Self::Pending | Self::Confirmed)
    }
}

impl fmt::Display for CollectionStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

/// 把数据库可空状态归一为业务状态；NULL/空串视为历史默认 `pending`。
pub fn normalize_collection_status(raw: Option<&str>) -> Option<CollectionStatus> {
    match raw.map(str::trim).filter(|s| !s.is_empty()) {
        None => Some(CollectionStatus::Pending),
        Some(value) => CollectionStatus::from_db_str(value),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn null_and_empty_mean_pending() {
        assert_eq!(
            normalize_collection_status(None),
            Some(CollectionStatus::Pending)
        );
        assert_eq!(
            normalize_collection_status(Some("  ")),
            Some(CollectionStatus::Pending)
        );
    }

    #[test]
    fn canonical_values_roundtrip() {
        for status in CollectionStatus::ALL {
            assert_eq!(
                normalize_collection_status(Some(status.as_str())),
                Some(status),
                "{}",
                status.as_str()
            );
        }
    }

    #[test]
    fn unknown_rejected_and_trimmed() {
        assert_eq!(normalize_collection_status(Some(" completed ")), None);
        assert_eq!(
            normalize_collection_status(Some(" confirmed ")),
            Some(CollectionStatus::Confirmed)
        );
    }

    #[test]
    fn transition_matrix() {
        assert!(CollectionStatus::Pending.can_confirm());
        assert!(!CollectionStatus::Confirmed.can_confirm());
        assert!(!CollectionStatus::WrittenOff.can_confirm());

        assert!(CollectionStatus::Pending.can_write_off());
        assert!(CollectionStatus::Confirmed.can_write_off());
        assert!(!CollectionStatus::WrittenOff.can_write_off());
    }
}
