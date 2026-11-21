//! 招标状态：`srm.biddings.status` 的唯一值源。
//!
//! 生命周期：draft（创建）→ published（发布）→ opened（开标）→ evaluated（评标完成）
//! → awarded（定标）。每一步都只允许前驱态，重复动作命中 0 行。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum BiddingStatus {
    /// 草稿
    Draft,
    /// 已发布
    Published,
    /// 已开标
    Opened,
    /// 已评标
    Evaluated,
    /// 已定标
    Awarded,
}

impl BiddingStatus {
    /// `srm.biddings.status` 允许的唯一集合
    pub const DB_VALUES: [&'static str; 5] =
        ["draft", "published", "opened", "evaluated", "awarded"];

    /// 新建招标的初始态（与 DB 默认一致）
    pub const DEFAULT: Self = Self::Draft;

    #[must_use]
    pub fn as_db_str(self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Published => "published",
            Self::Opened => "opened",
            Self::Evaluated => "evaluated",
            Self::Awarded => "awarded",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "draft" => Some(Self::Draft),
            "published" => Some(Self::Published),
            "opened" => Some(Self::Opened),
            "evaluated" => Some(Self::Evaluated),
            "awarded" => Some(Self::Awarded),
            _ => None,
        }
    }

    /// 发布只允许草稿
    #[must_use]
    pub fn publish_from(self) -> &'static [&'static str] {
        &["draft"]
    }

    /// 开标只允许已发布
    #[must_use]
    pub fn open_from(self) -> &'static [&'static str] {
        &["published"]
    }

    /// 评标只允许已开标
    #[must_use]
    pub fn evaluate_from(self) -> &'static [&'static str] {
        &["opened"]
    }

    /// 定标只允许已评标
    #[must_use]
    pub fn award_from(self) -> &'static [&'static str] {
        &["evaluated"]
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_all_values() {
        for raw in BiddingStatus::DB_VALUES {
            let parsed = BiddingStatus::from_db_str(raw).expect("db value must parse");
            assert_eq!(parsed.as_db_str(), raw);
        }
        assert_eq!(BiddingStatus::from_db_str("bogus"), None);
        assert_eq!(BiddingStatus::DEFAULT.as_db_str(), "draft");
    }

    #[test]
    fn transitions_are_linear() {
        assert!(BiddingStatus::Published.publish_from().contains(&"draft"));
        assert!(!BiddingStatus::Published
            .publish_from()
            .contains(&"published"));
        assert!(BiddingStatus::Awarded.award_from().contains(&"evaluated"));
    }
}
