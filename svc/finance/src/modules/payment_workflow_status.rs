//! 付款单工作流关联状态（W5-B B217）
//!
//! `finance.core_finance_payment_workflow.status` 是自由文本（DB 默认 `pending`，无 CHECK）。
//! 建关联时写死 `'pending'` 字面量；审批 / 驳回时把**外部工作流引擎返回的**
//! `instance.status` 原样绑进 `UPDATE`，上游给什么就落什么，任何拼写错误、
//! 新状态、甚至空串都会进库。
//!
//! 值集与 `public.core_workflow_instances.status` 的唯一值源
//! `svc/unified-core/src/modules/flow/workflow_instance_status.rs` 对齐（8 值）。
//! Finance 不依赖 unified-core crate，这里做一份镜像常量；两边新增状态时必须同步。

use std::fmt;
use std::str::FromStr;

use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum PaymentWorkflowStatus {
    Pending,
    Running,
    Approved,
    Rejected,
    Cancelled,
    Suspended,
    Completed,
    Error,
}

impl PaymentWorkflowStatus {
    pub const ALL: [Self; 8] = [
        Self::Pending,
        Self::Running,
        Self::Approved,
        Self::Rejected,
        Self::Cancelled,
        Self::Suspended,
        Self::Completed,
        Self::Error,
    ];

    pub const DB_VALUES: [&'static str; 8] = [
        "pending",
        "running",
        "approved",
        "rejected",
        "cancelled",
        "suspended",
        "completed",
        "error",
    ];

    /// DB 默认值（`core_finance_payment_workflow.status DEFAULT 'pending'`）。
    pub const DEFAULT: Self = Self::Pending;

    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Running => "running",
            Self::Approved => "approved",
            Self::Rejected => "rejected",
            Self::Cancelled => "cancelled",
            Self::Suspended => "suspended",
            Self::Completed => "completed",
            Self::Error => "error",
        }
    }

    /// 严格解析（大小写敏感，仅历史别名 `in_progress` → `running`）。
    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim() {
            "pending" => Some(Self::Pending),
            "running" => Some(Self::Running),
            "approved" => Some(Self::Approved),
            "rejected" => Some(Self::Rejected),
            "cancelled" | "canceled" => Some(Self::Cancelled),
            "suspended" => Some(Self::Suspended),
            "completed" => Some(Self::Completed),
            "error" | "failed" => Some(Self::Error),
            // 历史别名：早期引擎用 in_progress 表示运行中。
            "in_progress" => Some(Self::Running),
            _ => None,
        }
    }

    /// 列表 / 事件过滤归一：`None`、空串、`all` 一律视为不过滤。
    pub fn parse_filter(raw: Option<&str>) -> Result<Option<Self>, String> {
        match raw.map(str::trim) {
            None | Some("") => Ok(None),
            Some(v) if v.eq_ignore_ascii_case("all") => Ok(None),
            Some(v) => Self::from_db_str(v).map(Some).ok_or_else(|| {
                format!(
                    "非法付款单工作流状态: {v}，可选值: {}",
                    Self::DB_VALUES.join("/")
                )
            }),
        }
    }
}

impl fmt::Display for PaymentWorkflowStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

impl FromStr for PaymentWorkflowStatus {
    type Err = ();

    fn from_str(raw: &str) -> Result<Self, Self::Err> {
        Self::from_db_str(raw).ok_or(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn db_values_round_trip() {
        for status in PaymentWorkflowStatus::ALL {
            assert_eq!(
                PaymentWorkflowStatus::from_db_str(status.as_str()),
                Some(status)
            );
        }
        assert_eq!(PaymentWorkflowStatus::DB_VALUES.len(), 8);
    }

    #[test]
    fn defaults_and_aliases() {
        assert_eq!(
            PaymentWorkflowStatus::DEFAULT,
            PaymentWorkflowStatus::Pending
        );
        assert_eq!(
            PaymentWorkflowStatus::from_db_str(" in_progress "),
            Some(PaymentWorkflowStatus::Running)
        );
        assert_eq!(
            PaymentWorkflowStatus::from_db_str("failed"),
            Some(PaymentWorkflowStatus::Error)
        );
    }

    #[test]
    fn unknown_values_rejected() {
        assert_eq!(PaymentWorkflowStatus::from_db_str("approve"), None);
        assert_eq!(PaymentWorkflowStatus::from_db_str(""), None);
        assert!("APPROVED".parse::<PaymentWorkflowStatus>().is_err());
    }

    #[test]
    fn parse_filter_normalizes_blank_and_all() {
        assert_eq!(PaymentWorkflowStatus::parse_filter(None), Ok(None));
        assert_eq!(PaymentWorkflowStatus::parse_filter(Some("  ")), Ok(None));
        assert_eq!(PaymentWorkflowStatus::parse_filter(Some("ALL")), Ok(None));
        assert_eq!(
            PaymentWorkflowStatus::parse_filter(Some(" approved ")),
            Ok(Some(PaymentWorkflowStatus::Approved))
        );
        assert!(PaymentWorkflowStatus::parse_filter(Some("bogus")).is_err());
    }
}
