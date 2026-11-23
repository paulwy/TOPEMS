//! 合并范围状态（W5-B B222）
//!
//! `erp.consolidation_scopes.status` 是 varchar NOT NULL DEFAULT `draft`，没有 CHECK、
//! 也没有 Rust 类型：更新接口把请求体 `status` 原样 `COALESCE` 进库，列表过滤也裸绑，
//! 而消抵流程只认 `active`（`status != "active"` 字符串比较）。
//!
//! 值集取自前端 `ConsolidationScopePage` 的状态选择器：active / inactive / draft。

use std::fmt;
use std::str::FromStr;

use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ConsolidationScopeStatus {
    Draft,
    Active,
    Inactive,
}

impl ConsolidationScopeStatus {
    pub const ALL: [Self; 3] = [Self::Draft, Self::Active, Self::Inactive];

    pub const DB_VALUES: [&'static str; 3] = ["draft", "active", "inactive"];

    /// DB 默认值（`consolidation_scopes.status DEFAULT 'draft'`）。
    pub const DEFAULT: Self = Self::Draft;

    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Active => "active",
            Self::Inactive => "inactive",
        }
    }

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        self.as_str()
    }

    /// 严格解析：未知值返回 None。
    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim() {
            "draft" => Some(Self::Draft),
            "active" => Some(Self::Active),
            "inactive" => Some(Self::Inactive),
            _ => None,
        }
    }

    /// 列表过滤归一：`None`、空串、`all` 一律视为不过滤。
    pub fn parse_filter(raw: Option<&str>) -> Result<Option<Self>, String> {
        match raw.map(str::trim) {
            None | Some("") => Ok(None),
            Some(v) if v.eq_ignore_ascii_case("all") => Ok(None),
            Some(v) => Self::from_db_str(v).map(Some).ok_or_else(|| {
                format!(
                    "非法合并范围状态: {v}，可选值: {}",
                    Self::DB_VALUES.join("/")
                )
            }),
        }
    }

    /// 消抵流程要求合并范围处于启用状态。
    #[must_use]
    pub const fn is_runnable(self) -> bool {
        matches!(self, Self::Active)
    }
}

impl fmt::Display for ConsolidationScopeStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_str())
    }
}

impl FromStr for ConsolidationScopeStatus {
    type Err = ();

    fn from_str(raw: &str) -> Result<Self, Self::Err> {
        Self::from_db_str(raw).ok_or(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn canonical_round_trip() {
        for status in ConsolidationScopeStatus::ALL {
            assert_eq!(
                ConsolidationScopeStatus::from_db_str(status.as_str()),
                Some(status)
            );
        }
        assert_eq!(ConsolidationScopeStatus::DB_VALUES.len(), 3);
        assert_eq!(
            ConsolidationScopeStatus::DEFAULT,
            ConsolidationScopeStatus::Draft
        );
    }

    #[test]
    fn unknown_and_blank_rejected() {
        assert_eq!(ConsolidationScopeStatus::from_db_str("enabled"), None);
        assert_eq!(ConsolidationScopeStatus::from_db_str(""), None);
        assert!("ACTIVE".parse::<ConsolidationScopeStatus>().is_err());
    }

    #[test]
    fn filter_normalizes_blank_and_all() {
        assert_eq!(ConsolidationScopeStatus::parse_filter(None), Ok(None));
        assert_eq!(ConsolidationScopeStatus::parse_filter(Some("  ")), Ok(None));
        assert_eq!(
            ConsolidationScopeStatus::parse_filter(Some("ALL")),
            Ok(None)
        );
        assert_eq!(
            ConsolidationScopeStatus::parse_filter(Some(" active ")),
            Ok(Some(ConsolidationScopeStatus::Active))
        );
        assert!(ConsolidationScopeStatus::parse_filter(Some("bogus")).is_err());
    }

    #[test]
    fn only_active_runnable() {
        assert!(ConsolidationScopeStatus::Active.is_runnable());
        assert!(!ConsolidationScopeStatus::Draft.is_runnable());
        assert!(!ConsolidationScopeStatus::Inactive.is_runnable());
    }
}
