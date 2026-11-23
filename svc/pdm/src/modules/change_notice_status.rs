//! 工程变更通知（ECN）状态唯一集合（W5-B B225）
//!
//! `pdm.pdm_change_notices.status` 是 varchar NOT NULL DEFAULT `draft`，没有 CHECK、
//! 也没有 Rust 类型。写入口有三类：创建硬编码 `'draft'`、提交/审批/驳回硬编码
//! `'pending'`/`'approved'`/`'rejected'`、通用更新接口把请求体 `status` 原样入库。
//! `modules/state_machine.rs` 里已有完整 ECN 转移表，但从未被这些 handler 调用，
//! 于是 `PUT /change-notices/{id}` 可以 `draft → approved`，直接绕过审批。
//!
//! 值集取 `state_machine::ecn_transitions()` 的 8 个状态。

use std::fmt;
use std::str::FromStr;

use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ChangeNoticeStatus {
    Draft,
    Pending,
    Approved,
    Rejected,
    Implemented,
    Closed,
    Cancelled,
    Withdrawn,
}

impl ChangeNoticeStatus {
    pub const ALL: [Self; 8] = [
        Self::Draft,
        Self::Pending,
        Self::Approved,
        Self::Rejected,
        Self::Implemented,
        Self::Closed,
        Self::Cancelled,
        Self::Withdrawn,
    ];

    pub const DB_VALUES: [&'static str; 8] = [
        "draft",
        "pending",
        "approved",
        "rejected",
        "implemented",
        "closed",
        "cancelled",
        "withdrawn",
    ];

    /// DB 默认值（`pdm_change_notices.status DEFAULT 'draft'`）。
    pub const DEFAULT: Self = Self::Draft;

    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Pending => "pending",
            Self::Approved => "approved",
            Self::Rejected => "rejected",
            Self::Implemented => "implemented",
            Self::Closed => "closed",
            Self::Cancelled => "cancelled",
            Self::Withdrawn => "withdrawn",
        }
    }

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        self.as_str()
    }

    /// 严格解析；历史别名 `submitted` → pending、`canceled` → cancelled。
    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "draft" => Some(Self::Draft),
            "pending" | "submitted" => Some(Self::Pending),
            "approved" => Some(Self::Approved),
            "rejected" => Some(Self::Rejected),
            "implemented" => Some(Self::Implemented),
            "closed" => Some(Self::Closed),
            "cancelled" | "canceled" => Some(Self::Cancelled),
            "withdrawn" => Some(Self::Withdrawn),
            _ => None,
        }
    }

    /// 只有草稿可以提交审批。
    #[must_use]
    pub const fn can_submit_from(self) -> bool {
        matches!(self, Self::Draft)
    }

    /// 只有待审批可以审批通过 / 驳回。
    #[must_use]
    pub const fn can_review_from(self) -> bool {
        matches!(self, Self::Pending)
    }

    /// 列表 / 查询参数归一：`None`、空串、`all` 视为不过滤。
    pub fn parse_filter(raw: Option<&str>) -> Result<Option<Self>, String> {
        match raw.map(str::trim) {
            None | Some("") => Ok(None),
            Some(v) if v.eq_ignore_ascii_case("all") => Ok(None),
            Some(v) => Self::from_db_str(v).map(Some).ok_or_else(|| {
                format!(
                    "非法工程变更状态: {v}，可选值: {}",
                    Self::DB_VALUES.join("/")
                )
            }),
        }
    }

    /// 入口入参归一：接受历史别名，未知值返回错误文案。
    pub fn normalize(raw: &str) -> Result<Self, String> {
        Self::from_db_str(raw).ok_or_else(|| {
            format!(
                "非法工程变更状态: {raw}，可选值: {}",
                Self::DB_VALUES.join("/")
            )
        })
    }
}

impl fmt::Display for ChangeNoticeStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

impl FromStr for ChangeNoticeStatus {
    type Err = ();

    fn from_str(raw: &str) -> Result<Self, Self::Err> {
        Self::from_db_str(raw).ok_or(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn canonical_round_trip() {
        for status in ChangeNoticeStatus::ALL {
            assert_eq!(
                ChangeNoticeStatus::from_db_str(status.as_str()),
                Some(status)
            );
        }
        assert_eq!(ChangeNoticeStatus::DB_VALUES.len(), 8);
        assert_eq!(ChangeNoticeStatus::DEFAULT, ChangeNoticeStatus::Draft);
    }

    #[test]
    fn aliases_and_unknown() {
        assert_eq!(
            ChangeNoticeStatus::from_db_str("submitted"),
            Some(ChangeNoticeStatus::Pending)
        );
        assert_eq!(
            ChangeNoticeStatus::from_db_str("canceled"),
            Some(ChangeNoticeStatus::Cancelled)
        );
        assert_eq!(ChangeNoticeStatus::from_db_str("bogus"), None);
        assert!("DRAFT".parse::<ChangeNoticeStatus>().is_ok());
    }

    #[test]
    fn endpoint_guards() {
        assert!(ChangeNoticeStatus::Draft.can_submit_from());
        assert!(!ChangeNoticeStatus::Pending.can_submit_from());
        assert!(ChangeNoticeStatus::Pending.can_review_from());
        assert!(!ChangeNoticeStatus::Draft.can_review_from());
        assert!(!ChangeNoticeStatus::Approved.can_review_from());
    }

    #[test]
    fn filter_normalizes_blank_and_all() {
        assert_eq!(ChangeNoticeStatus::parse_filter(None), Ok(None));
        assert_eq!(ChangeNoticeStatus::parse_filter(Some("ALL")), Ok(None));
        assert_eq!(
            ChangeNoticeStatus::parse_filter(Some(" pending ")),
            Ok(Some(ChangeNoticeStatus::Pending))
        );
        assert!(ChangeNoticeStatus::parse_filter(Some("bogus")).is_err());
    }
}
