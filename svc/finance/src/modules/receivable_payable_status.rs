//! W5-B：应收/应付状态唯一口径（代码侧）
//!
//! `finance.receivables.status` 与 `finance.payables.status` 是自由文本列，
//! 前端表单用 `draft/approved/posted/cancelled`，后端创建却写死 `unpaid`。
//! 本模块固定集合，历史 `unpaid`/`pending` 归一为 `draft`。DB CHECK 待生产窗口。

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ReceivablePayableStatus {
    Draft,
    Approved,
    Posted,
    Cancelled,
}

impl ReceivablePayableStatus {
    /// 两列允许的唯一集合（规范化后）
    pub const DB_VALUES: &'static [&'static str] = &["draft", "approved", "posted", "cancelled"];

    /// 新建缺省状态
    pub const DEFAULT: Self = Self::Draft;

    /// 严格解析 canonical 值；历史别名走 `normalize_receivable_payable`
    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim() {
            "draft" => Some(Self::Draft),
            "approved" => Some(Self::Approved),
            "posted" => Some(Self::Posted),
            "cancelled" => Some(Self::Cancelled),
            _ => None,
        }
    }

    /// 响应兜底：脏值回落 `draft`
    #[must_use]
    pub fn normalize(raw: &str) -> &'static str {
        normalize_receivable_payable(raw)
            .unwrap_or(Self::DEFAULT)
            .as_str()
    }

    /// 列表筛选解析：`None` / 空串 / `all` 表示不过滤，未知值（含历史别名口径外）→ `Err`
    pub fn parse_filter(raw: Option<&str>) -> Result<Option<Self>, &'static str> {
        match raw.map(str::trim) {
            None => Ok(None),
            Some("") => Ok(None),
            Some(v) if v.eq_ignore_ascii_case("all") => Ok(None),
            Some(v) => normalize_receivable_payable(v)
                .map(Some)
                .ok_or("unknown_status"),
        }
    }

    /// 生命周期：draft → approved/cancelled；approved → posted/cancelled；
    /// posted、cancelled 为终态，同态幂等。
    pub fn can_transition_to(self, target: Self) -> bool {
        if self == target {
            return true;
        }
        match self {
            Self::Draft => matches!(target, Self::Approved | Self::Cancelled),
            Self::Approved => matches!(target, Self::Posted | Self::Cancelled),
            Self::Posted | Self::Cancelled => false,
        }
    }

    /// 仅未进入过账台账的 draft/cancelled 可软删；approved 需先转 cancelled 或 posted。
    pub fn can_delete(self) -> bool {
        matches!(self, Self::Draft | Self::Cancelled)
    }

    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Approved => "approved",
            Self::Posted => "posted",
            Self::Cancelled => "cancelled",
        }
    }
}

/// `unpaid` 是旧创建默认值，`pending` 是 DB 默认值，都归一到 `draft`。
#[must_use]
pub fn normalize_receivable_payable(raw: &str) -> Option<ReceivablePayableStatus> {
    match raw.trim() {
        "draft" | "unpaid" | "pending" => Some(ReceivablePayableStatus::Draft),
        "approved" => Some(ReceivablePayableStatus::Approved),
        "posted" => Some(ReceivablePayableStatus::Posted),
        "cancelled" => Some(ReceivablePayableStatus::Cancelled),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn canonical_values() {
        for (raw, expected) in [
            ("draft", ReceivablePayableStatus::Draft),
            ("approved", ReceivablePayableStatus::Approved),
            ("posted", ReceivablePayableStatus::Posted),
            ("cancelled", ReceivablePayableStatus::Cancelled),
        ] {
            assert_eq!(normalize_receivable_payable(raw), Some(expected));
        }
    }

    #[test]
    fn legacy_aliases_and_unknown() {
        assert_eq!(
            normalize_receivable_payable("unpaid"),
            Some(ReceivablePayableStatus::Draft)
        );
        assert_eq!(
            normalize_receivable_payable("pending"),
            Some(ReceivablePayableStatus::Draft)
        );
        assert_eq!(normalize_receivable_payable("paid"), None);
        assert_eq!(normalize_receivable_payable(""), None);
    }

    #[test]
    fn parse_filter_accepts_alias_and_rejects_unknown() {
        assert_eq!(ReceivablePayableStatus::parse_filter(None), Ok(None));
        assert_eq!(ReceivablePayableStatus::parse_filter(Some("all")), Ok(None));
        assert_eq!(
            ReceivablePayableStatus::parse_filter(Some("unpaid")),
            Ok(Some(ReceivablePayableStatus::Draft))
        );
        assert_eq!(
            ReceivablePayableStatus::parse_filter(Some("posted")),
            Ok(Some(ReceivablePayableStatus::Posted))
        );
        assert_eq!(
            ReceivablePayableStatus::parse_filter(Some("bogus")),
            Err("unknown_status")
        );
    }

    #[test]
    fn lifecycle_transitions() {
        use ReceivablePayableStatus::*;
        assert!(Draft.can_transition_to(Approved));
        assert!(Draft.can_transition_to(Cancelled));
        assert!(!Draft.can_transition_to(Posted));
        assert!(Approved.can_transition_to(Posted));
        assert!(Approved.can_transition_to(Cancelled));
        assert!(!Approved.can_transition_to(Draft));
        assert!(!Posted.can_transition_to(Approved));
        assert!(!Cancelled.can_transition_to(Draft));
    }

    #[test]
    fn delete_only_unposted_or_cancelled() {
        use ReceivablePayableStatus::*;
        assert!(Draft.can_delete());
        assert!(!Approved.can_delete());
        assert!(!Posted.can_delete());
        assert!(Cancelled.can_delete());
    }

    #[test]
    fn normalize_falls_back_to_draft() {
        assert_eq!(ReceivablePayableStatus::normalize("pending"), "draft");
        assert_eq!(ReceivablePayableStatus::normalize("bogus"), "draft");
        assert_eq!(ReceivablePayableStatus::normalize("posted"), "posted");
    }
}
