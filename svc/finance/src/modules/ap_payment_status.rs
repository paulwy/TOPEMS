//! 付款单状态单一源（W5-B B8）
//!
//! `finance.core_finance_payments.status` 原本没有任何写入口：
//! 建单依赖 DB 默认 `draft`，提交/审批/驳回/执行付款只改凭证或 `approved_by`、`executed_at`，
//! 付款单自身状态永远停在 `draft`（本地唯一历史行是手工写成 `completed`）。
//!
//! 同时 API 的 `PaymentResponse.status` 误用了凭证状态 `VoucherStatus`，前端付款页拿到的
//! 是 `draft/submitted/approved/posted...`，与付款页状态选项 `pending/processing/completed/...`
//! 完全对不上。本模块把付款单状态收敛为一套独立集合。

use std::fmt;
use std::str::FromStr;

use serde::Serialize;

/// 付款单状态（AP 付款单，不是结算中心回款状态）。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum PaymentStatus {
    /// 已建单，未提交审批
    Draft,
    /// 已提交，审批中
    Pending,
    /// 审批通过，待执行付款
    Processing,
    /// 已执行付款
    Completed,
    /// 审批驳回或付款失败
    Failed,
    /// 已取消
    Cancelled,
}

impl PaymentStatus {
    pub const ALL: [Self; 6] = [
        Self::Draft,
        Self::Pending,
        Self::Processing,
        Self::Completed,
        Self::Failed,
        Self::Cancelled,
    ];

    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Pending => "pending",
            Self::Processing => "processing",
            Self::Completed => "completed",
            Self::Failed => "failed",
            Self::Cancelled => "cancelled",
        }
    }

    pub const fn can_submit(self) -> bool {
        matches!(self, Self::Draft)
    }

    pub const fn can_approve(self) -> bool {
        matches!(self, Self::Pending)
    }

    pub const fn can_reject(self) -> bool {
        matches!(self, Self::Pending)
    }

    pub const fn can_execute(self) -> bool {
        matches!(self, Self::Processing)
    }
}

impl fmt::Display for PaymentStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

impl FromStr for PaymentStatus {
    type Err = ();

    fn from_str(raw: &str) -> Result<Self, Self::Err> {
        match raw.trim() {
            "draft" => Ok(Self::Draft),
            "pending" => Ok(Self::Pending),
            "processing" => Ok(Self::Processing),
            "completed" => Ok(Self::Completed),
            "failed" => Ok(Self::Failed),
            "cancelled" => Ok(Self::Cancelled),
            // 历史/别名：旧逻辑可能把凭证状态透出成付款状态。
            "approved" | "posted" => Ok(Self::Processing),
            "rejected" => Ok(Self::Failed),
            "paid" => Ok(Self::Completed),
            _ => Err(()),
        }
    }
}

pub fn normalize_payment_status(raw: &str) -> Option<PaymentStatus> {
    raw.parse().ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn canonical_values_roundtrip() {
        for status in PaymentStatus::ALL {
            assert_eq!(
                normalize_payment_status(status.as_str()),
                Some(status),
                "{}",
                status.as_str()
            );
        }
    }

    #[test]
    fn aliases_and_rejects() {
        assert_eq!(
            normalize_payment_status(" approved "),
            Some(PaymentStatus::Processing)
        );
        assert_eq!(
            normalize_payment_status("rejected"),
            Some(PaymentStatus::Failed)
        );
        assert_eq!(normalize_payment_status("reversed"), None);
        assert_eq!(normalize_payment_status(""), None);
    }

    #[test]
    fn transition_matrix() {
        assert!(PaymentStatus::Draft.can_submit());
        assert!(!PaymentStatus::Pending.can_submit());
        assert!(PaymentStatus::Pending.can_approve());
        assert!(!PaymentStatus::Processing.can_approve());
        assert!(PaymentStatus::Pending.can_reject());
        assert!(PaymentStatus::Processing.can_execute());
        assert!(!PaymentStatus::Completed.can_execute());
    }
}
