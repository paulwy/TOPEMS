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
}
