//! 公告与资产状态：`erp.announcements.status` / `erp.assets.status` 的唯一值源。
//!
//! 值集与前端 `apps/web/src/api/erp/core/announcement.ts`、`asset.ts` 的联合类型一致；
//! 解析未知值返回 `None`，不静默落默认。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AnnouncementStatus {
    Draft,
    Published,
    Expired,
    Archived,
}

impl AnnouncementStatus {
    pub const DB_VALUES: [&'static str; 4] = ["draft", "published", "expired", "archived"];

    /// 创建时固定落 draft（`create_announcement` 的 SQL 字面量与之保持一致）
    pub const DEFAULT: Self = Self::Draft;

    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "draft" => Some(Self::Draft),
            "published" => Some(Self::Published),
            "expired" => Some(Self::Expired),
            "archived" => Some(Self::Archived),
            _ => None,
        }
    }

    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Published => "published",
            Self::Expired => "expired",
            Self::Archived => "archived",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AssetStatus {
    InStock,
    InUse,
    Maintenance,
    Scrapped,
    Transferred,
}

impl AssetStatus {
    pub const DB_VALUES: [&'static str; 5] = [
        "in_stock",
        "in_use",
        "maintenance",
        "scrapped",
        "transferred",
    ];

    /// 创建时固定落 in_use（`create_asset` 的 SQL 字面量与之保持一致）
    pub const DEFAULT: Self = Self::InUse;

    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "in_stock" => Some(Self::InStock),
            // 历史旧默认值，B29 候选要求窗口内归一为 in_use；读取时按 in_use 兼容。
            "in_use" | "active" => Some(Self::InUse),
            "maintenance" => Some(Self::Maintenance),
            "scrapped" => Some(Self::Scrapped),
            "transferred" => Some(Self::Transferred),
            _ => None,
        }
    }

    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::InStock => "in_stock",
            Self::InUse => "in_use",
            Self::Maintenance => "maintenance",
            Self::Scrapped => "scrapped",
            Self::Transferred => "transferred",
        }
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn announcement_status_roundtrip_and_default() {
        for s in AnnouncementStatus::DB_VALUES {
            assert_eq!(
                AnnouncementStatus::from_db_str(s).map(|v| v.as_db_str()),
                Some(s)
            );
        }
        assert_eq!(AnnouncementStatus::DEFAULT.as_db_str(), "draft");
        assert_eq!(
            AnnouncementStatus::from_db_str("draft "),
            Some(AnnouncementStatus::Draft)
        );
        assert_eq!(AnnouncementStatus::from_db_str("publish"), None);
    }

    #[test]
    fn asset_status_roundtrip_and_default() {
        for s in AssetStatus::DB_VALUES {
            assert_eq!(AssetStatus::from_db_str(s).map(|v| v.as_db_str()), Some(s));
        }
        assert_eq!(AssetStatus::DEFAULT.as_db_str(), "in_use");
        assert_eq!(
            AssetStatus::from_db_str("active"),
            Some(AssetStatus::InUse),
            "历史旧默认值按 in_use 兼容"
        );
        assert_eq!(AssetStatus::from_db_str("bogus"), None);
        assert_eq!(AssetStatus::from_db_str("IN_USE"), Some(AssetStatus::InUse));
    }
}
