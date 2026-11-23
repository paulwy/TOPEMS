//! 请假申请状态：`erp.leave_requests.status` 的唯一值源。
//!
//! 列定义：varchar NOT NULL，DB 默认 `draft`。写入口、列表过滤、四种状态流转
//! （提交 / 批准 / 驳回 / 撤销）与 DB CHECK 候选共用本集合。
//!
//! 前端口径（`apps/web/src/schemas/hrm/leave.ts`）只暴露 `pending` /
//! `approved` / `rejected` / `cancelled`；`draft` 是后端「创建 → 提交」之间的
//! 内部态（internal_state），不进入前端下拉与筛选，但仍必须能落库与回读。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LeaveRequestStatus {
    /// 草稿（创建后的初始态，仅可编辑 / 提交 / 撤销）
    Draft,
    /// 待审批
    Pending,
    /// 已批准
    Approved,
    /// 已驳回
    Rejected,
    /// 已撤销
    Cancelled,
}

impl LeaveRequestStatus {
    /// `erp.leave_requests.status` 允许的唯一集合
    pub const DB_VALUES: [&'static str; 5] =
        ["draft", "pending", "approved", "rejected", "cancelled"];

    /// 创建请假申请的默认状态（与列默认值一致）
    pub const DEFAULT: Self = Self::Draft;

    /// 严格解析数据库字符串；未知值返回 `None`
    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "draft" => Some(Self::Draft),
            "pending" => Some(Self::Pending),
            "approved" => Some(Self::Approved),
            "rejected" => Some(Self::Rejected),
            "cancelled" | "canceled" => Some(Self::Cancelled),
            _ => None,
        }
    }

    /// 写入 `erp.leave_requests.status` 的唯一字符串形式
    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Draft => "draft",
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

    /// 列表过滤解析：`None` / 空串 / `all` 表示不过滤，未知值返回 `None` 交调用方报 400
    pub fn parse_filter(raw: Option<&str>) -> Result<Option<Self>, &'static str> {
        match raw.map(str::trim) {
            None => Ok(None),
            Some("") => Ok(None),
            Some(v) if v.eq_ignore_ascii_case("all") => Ok(None),
            Some(v) => Self::from_db_str(v).map(Some).ok_or("unknown_status"),
        }
    }
}

impl std::fmt::Display for LeaveRequestStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_db_str())
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn leave_request_status_db_strings_roundtrip() {
        for s in LeaveRequestStatus::DB_VALUES {
            assert_eq!(
                LeaveRequestStatus::from_db_str(s).map(|v| v.as_db_str()),
                Some(s)
            );
        }
    }

    #[test]
    fn leave_request_status_defaults_to_draft() {
        assert_eq!(LeaveRequestStatus::DEFAULT.as_db_str(), "draft");
        assert_eq!(LeaveRequestStatus::DB_VALUES.len(), 5);
    }

    #[test]
    fn leave_request_status_rejects_unknown() {
        assert_eq!(LeaveRequestStatus::from_db_str("bogus"), None);
        assert_eq!(LeaveRequestStatus::from_db_str("active"), None);
        assert!(LeaveRequestStatus::from_db_str("approved ").is_some());
    }

    #[test]
    fn leave_request_status_accepts_canceled_alias() {
        assert_eq!(
            LeaveRequestStatus::from_db_str("canceled").map(|v| v.as_db_str()),
            Some("cancelled")
        );
    }

    #[test]
    fn leave_request_status_normalize_falls_back() {
        assert_eq!(LeaveRequestStatus::normalize("pending"), "pending");
        assert_eq!(LeaveRequestStatus::normalize("  "), "draft");
        assert_eq!(LeaveRequestStatus::normalize("weird"), "draft");
    }

    #[test]
    fn leave_request_status_parse_filter() {
        assert_eq!(LeaveRequestStatus::parse_filter(None), Ok(None));
        assert_eq!(LeaveRequestStatus::parse_filter(Some("")), Ok(None));
        assert_eq!(LeaveRequestStatus::parse_filter(Some("ALL")), Ok(None));
        assert_eq!(
            LeaveRequestStatus::parse_filter(Some("approved")),
            Ok(Some(LeaveRequestStatus::Approved))
        );
        assert_eq!(
            LeaveRequestStatus::parse_filter(Some("nope")),
            Err("unknown_status")
        );
    }
}
