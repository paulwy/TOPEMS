//! 供应商报价状态唯一集合。
//!
//! 落库列：`srm.quotations.status`（varchar，DB 默认 `draft`）。
//! 代码实际创建 pending，中标 awarded，拒绝 rejected；本地 0 行。
//! 列默认需在窗口内改为 pending，对齐创建入口。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum QuotationStatus {
    Pending,
    Awarded,
    Rejected,
}

impl QuotationStatus {
    pub const DEFAULT: Self = Self::Pending;

    pub const DB_VALUES: &'static [&'static str] = &["pending", "awarded", "rejected"];

    #[must_use]
    pub fn as_db_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Awarded => "awarded",
            Self::Rejected => "rejected",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw {
            "pending" => Some(Self::Pending),
            "awarded" => Some(Self::Awarded),
            "rejected" => Some(Self::Rejected),
            _ => None,
        }
    }

    /// 中标/拒绝/修改/删除只允许从 pending 进入，终态不可再改。
    #[must_use]
    pub fn pending_from() -> &'static [Self] {
        &[Self::Pending]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_all_values() {
        for raw in QuotationStatus::DB_VALUES {
            let parsed = QuotationStatus::from_db_str(raw).expect("db value must parse");
            assert_eq!(parsed.as_db_str(), *raw);
        }
        assert_eq!(QuotationStatus::from_db_str("draft"), None);
        assert_eq!(QuotationStatus::DEFAULT.as_db_str(), "pending");
    }

    #[test]
    fn only_pending_is_mutable() {
        assert_eq!(QuotationStatus::pending_from().len(), 1);
        assert!(QuotationStatus::pending_from().contains(&QuotationStatus::Pending));
    }
}
