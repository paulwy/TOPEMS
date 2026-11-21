//! 询价单状态：`srm.inquiries.status` 的唯一值源。
//!
//! 前端（`apps/web/src/schemas/srm/inquiry.ts`）提供六态：
//! draft / published / in_progress / closed / awarded / cancelled。
//! 后端只实现两条流转：draft（或历史 closed）→ published，published → closed；
//! 其余三态由审批/报价流程使用，本批只纳入合法集合，不新增流转。
//!
//! 注意：B40 之前创建/编辑接口把请求里的 `status` 原样写库，任意字符串都能落库；
//! 列表过滤同样接受任意字符串，非法值静默返回空列表。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum InquiryStatus {
    /// 草稿（创建默认）
    Draft,
    /// 已发布询价
    Published,
    /// 报价进行中
    InProgress,
    /// 已关闭
    Closed,
    /// 已定标
    Awarded,
    /// 已取消
    Cancelled,
}

impl InquiryStatus {
    /// `srm.inquiries.status` 允许的唯一集合（与前端六态对齐）
    pub const DB_VALUES: [&'static str; 6] = [
        "draft",
        "published",
        "in_progress",
        "closed",
        "awarded",
        "cancelled",
    ];

    /// 创建询价单的初始态
    pub const DEFAULT: Self = Self::Draft;

    /// 发布允许的起始状态（历史 closed 可直接重新发布）
    pub fn publish_from() -> &'static [&'static str] {
        &["draft", "closed"]
    }

    /// 关闭允许的起始状态
    pub fn close_from() -> &'static [&'static str] {
        &["published"]
    }

    pub fn is_terminal(&self) -> bool {
        matches!(self, Self::Closed | Self::Awarded | Self::Cancelled)
    }

    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "draft" => Some(Self::Draft),
            "published" => Some(Self::Published),
            "in_progress" => Some(Self::InProgress),
            "closed" => Some(Self::Closed),
            "awarded" => Some(Self::Awarded),
            "cancelled" => Some(Self::Cancelled),
            _ => None,
        }
    }

    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Published => "published",
            Self::InProgress => "in_progress",
            Self::Closed => "closed",
            Self::Awarded => "awarded",
            Self::Cancelled => "cancelled",
        }
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn status_roundtrip() {
        for s in InquiryStatus::DB_VALUES {
            assert_eq!(
                InquiryStatus::from_db_str(s).map(|v| v.as_db_str()),
                Some(s)
            );
        }
        assert_eq!(InquiryStatus::from_db_str("bogus"), None);
        assert_eq!(InquiryStatus::DEFAULT.as_db_str(), "draft");
    }

    #[test]
    fn transition_starts_are_canonical() {
        assert!(InquiryStatus::publish_from().contains(&"draft"));
        assert!(InquiryStatus::publish_from().contains(&"closed"));
        assert!(!InquiryStatus::publish_from().contains(&"published"));
        assert!(InquiryStatus::close_from().contains(&"published"));
        assert!(InquiryStatus::Closed.is_terminal());
    }
}
