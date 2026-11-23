//! 请假记录状态：`hrm.leave_records.status` 的唯一值源。
//!
//! 列定义：varchar NOT NULL，DB 默认 `pending`。创建写 `pending`（待审批），
//! 批准 → `approved`，拒绝 → `rejected`；`cancelled` 由前端下拉与筛选项暴露
//! （`apps/web/src/schemas/hrm/leave.ts`），后端暂无写入口，属于前端可见、后端待补的合法值。
//!
//! 本枚举同时用于：创建写入口、列表过滤、更新/删除/批准的 `WHERE status` 期望态、
//! 批准/拒绝的状态流转、响应出口归一，以及 DB CHECK 候选。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LeaveRecordStatus {
    /// 待审批
    Pending,
    /// 已批准
    Approved,
    /// 已拒绝
    Rejected,
    /// 已撤销（前端可见，后端尚未提供写入口）
    Cancelled,
}

impl LeaveRecordStatus {
    /// `hrm.leave_records.status` 允许的唯一集合
    pub const DB_VALUES: [&'static str; 4] = ["pending", "approved", "rejected", "cancelled"];

    /// 创建请假记录的默认状态（与列默认值一致）
    pub const DEFAULT: Self = Self::Pending;

    /// 严格解析数据库字符串；未知值返回 `None`
    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "pending" => Some(Self::Pending),
            "approved" => Some(Self::Approved),
            "rejected" => Some(Self::Rejected),
            "cancelled" | "canceled" => Some(Self::Cancelled),
            _ => None,
        }
    }

    /// 写入 `hrm.leave_records.status` 的唯一字符串形式
    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Approved => "approved",
            Self::Rejected => "rejected",
            Self::Cancelled => "cancelled",
        }
    }

    /// 响应兜底：列 NOT NULL，未知历史值回落 `DEFAULT`
    pub fn normalize(raw: &str) -> &'static str {
        Self::from_db_str(raw).unwrap_or(Self::DEFAULT).as_db_str()
    }

    /// 列表过滤解析：`None` / 空串 / `all` 表示不过滤，未知值返回 `Err` 交调用方报 400
    pub fn parse_filter(raw: Option<&str>) -> Result<Option<Self>, &'static str> {
        match raw.map(str::trim) {
            None => Ok(None),
            Some("") => Ok(None),
            Some(v) if v.eq_ignore_ascii_case("all") => Ok(None),
            Some(v) => Self::from_db_str(v).map(Some).ok_or("unknown_status"),
        }
    }
}

impl std::fmt::Display for LeaveRecordStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_db_str())
    }
}

/// 审批结论：`hrm.leave_records.approval_status` 的唯一值源。
///
/// 该列与 `status` 同表并存：`status` 是申请整体状态，`approval_status` 是审批结论。
/// 历史问题是 **只有 status 被写、approval_status 从未被任何代码写**，而
/// `svc/hrm/src/modules/reports.rs` 的请假天数统计正是按 `approval_status = 'approved'` 计数，
/// 导致报表恒为 0。本枚举把审批结论绑进批准/拒绝两个写入口。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LeaveApprovalStatus {
    /// 待审批
    Pending,
    /// 已批准
    Approved,
    /// 已拒绝
    Rejected,
}

impl LeaveApprovalStatus {
    /// `hrm.leave_records.approval_status` 允许的唯一集合
    pub const DB_VALUES: [&'static str; 3] = ["pending", "approved", "rejected"];

    /// 新建请假记录的审批结论（与列默认值一致）
    pub const DEFAULT: Self = Self::Pending;

    /// 严格解析数据库字符串；未知值返回 `None`
    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "pending" => Some(Self::Pending),
            "approved" => Some(Self::Approved),
            "rejected" => Some(Self::Rejected),
            _ => None,
        }
    }

    /// 写入 `hrm.leave_records.approval_status` 的唯一字符串形式
    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Approved => "approved",
            Self::Rejected => "rejected",
        }
    }

    /// 响应/报表兜底：未知历史值回落 `DEFAULT`
    pub fn normalize(raw: &str) -> &'static str {
        Self::from_db_str(raw).unwrap_or(Self::DEFAULT).as_db_str()
    }
}

impl std::fmt::Display for LeaveApprovalStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_db_str())
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn leave_record_status_db_strings_roundtrip() {
        for s in LeaveRecordStatus::DB_VALUES {
            assert_eq!(
                LeaveRecordStatus::from_db_str(s).map(|v| v.as_db_str()),
                Some(s)
            );
        }
    }

    #[test]
    fn leave_record_status_defaults_to_pending() {
        assert_eq!(LeaveRecordStatus::DEFAULT.as_db_str(), "pending");
        assert_eq!(LeaveRecordStatus::DB_VALUES.len(), 4);
    }

    #[test]
    fn leave_record_status_rejects_unknown() {
        assert_eq!(LeaveRecordStatus::from_db_str("bogus"), None);
        assert_eq!(LeaveRecordStatus::from_db_str("draft"), None);
        assert!(LeaveRecordStatus::from_db_str("approved ").is_some());
    }

    #[test]
    fn leave_record_status_accepts_canceled_alias() {
        assert_eq!(
            LeaveRecordStatus::from_db_str("canceled").map(|v| v.as_db_str()),
            Some("cancelled")
        );
    }

    #[test]
    fn leave_record_status_normalize_falls_back() {
        assert_eq!(LeaveRecordStatus::normalize("approved"), "approved");
        assert_eq!(LeaveRecordStatus::normalize("  "), "pending");
        assert_eq!(LeaveRecordStatus::normalize("weird"), "pending");
    }

    #[test]
    fn leave_record_status_parse_filter() {
        assert_eq!(LeaveRecordStatus::parse_filter(None), Ok(None));
        assert_eq!(LeaveRecordStatus::parse_filter(Some("")), Ok(None));
        assert_eq!(LeaveRecordStatus::parse_filter(Some("ALL")), Ok(None));
        assert_eq!(
            LeaveRecordStatus::parse_filter(Some("rejected")),
            Ok(Some(LeaveRecordStatus::Rejected))
        );
        assert_eq!(
            LeaveRecordStatus::parse_filter(Some("nope")),
            Err("unknown_status")
        );
    }

    #[test]
    fn leave_approval_status_db_strings_roundtrip() {
        for s in LeaveApprovalStatus::DB_VALUES {
            assert_eq!(
                LeaveApprovalStatus::from_db_str(s).map(|v| v.as_db_str()),
                Some(s)
            );
        }
    }

    #[test]
    fn leave_approval_status_rejects_unknown_and_normalizes() {
        assert_eq!(LeaveApprovalStatus::from_db_str("cancelled"), None);
        assert_eq!(LeaveApprovalStatus::from_db_str("bogus"), None);
        assert_eq!(LeaveApprovalStatus::normalize("approved"), "approved");
        assert_eq!(LeaveApprovalStatus::normalize("weird"), "pending");
        assert_eq!(LeaveApprovalStatus::DEFAULT.as_db_str(), "pending");
    }
}
