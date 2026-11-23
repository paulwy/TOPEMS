//! ERP 财务对账：`erp.fin_reconciliations.status` 的唯一值源。
//!
//! 列定义：varchar(20) NOT NULL DEFAULT 'pending'，本地与生产快照均 0 行。
//!
//! 写入方全部是事件消费者（`svc/erp/src/event_handlers/mod.rs`）：
//! - `ReconciliationCreated`：`INSERT ... status = payload.status`，生产者 `finance` 侧写 `"draft"`；
//! - `ReconciliationUpdated`：`UPDATE ... SET status = payload.status`，生产者写 `"matched"` / `"approved"`；
//! - `ReconciliationApproved`：`SET status = 'approved' WHERE status IN ('pending','draft')`。
//!
//! 前两条都是**事件载荷自由串**直接落库——生产方改一个字或旧版事件重放就能写进任意值。
//! 本批在消费者侧严格校验，非法状态显式失败（事件进入失败分支，不再静默写脏数据）。
//!
//! 值集只收有证据的四个：`pending`（DB 默认）、`draft`（建单）、`matched`（对账匹配完成）、
//! `approved`（审批通过）。

/// 财务对账单状态
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FinReconciliationStatus {
    /// 待处理（DB 默认）
    Pending,
    /// 草稿（建单时写入）
    Draft,
    /// 已匹配（明细对账完成）
    Matched,
    /// 已审批
    Approved,
}

impl FinReconciliationStatus {
    /// 该列允许的唯一集合
    pub const DB_VALUES: &'static [&'static str] = &["pending", "draft", "matched", "approved"];

    /// 默认状态（与 DB 默认一致）
    pub const DEFAULT: Self = Self::Pending;

    /// 审批前置状态：只有这两个状态可以流转到 approved
    pub const APPROVABLE: &'static [&'static str] = &["pending", "draft"];

    /// 严格解析数据库字符串；未知值返回 `None`
    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim() {
            "pending" => Some(Self::Pending),
            "draft" => Some(Self::Draft),
            "matched" => Some(Self::Matched),
            "approved" => Some(Self::Approved),
            _ => None,
        }
    }

    /// 写入该列的唯一字符串形式
    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Draft => "draft",
            Self::Matched => "matched",
            Self::Approved => "approved",
        }
    }

    /// 响应兜底：未知历史值回落 `DEFAULT`
    pub fn normalize(raw: &str) -> &'static str {
        Self::from_db_str(raw).unwrap_or(Self::DEFAULT).as_db_str()
    }
}

impl std::fmt::Display for FinReconciliationStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_db_str())
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_is_total() {
        for v in FinReconciliationStatus::DB_VALUES {
            let parsed = FinReconciliationStatus::from_db_str(v).expect("值集内必须可解析");
            assert_eq!(parsed.as_db_str(), *v);
        }
    }

    #[test]
    fn rejects_unknown_and_normalizes() {
        assert_eq!(FinReconciliationStatus::from_db_str("closed"), None);
        assert_eq!(FinReconciliationStatus::from_db_str(""), None);
        assert_eq!(FinReconciliationStatus::normalize("bogus"), "pending");
    }

    #[test]
    fn approvable_covers_pending_and_draft() {
        assert_eq!(FinReconciliationStatus::APPROVABLE, &["pending", "draft"]);
    }
}
