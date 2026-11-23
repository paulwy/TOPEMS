//! 劳动合同状态（W5-B B215）
//!
//! `hrm.contracts.status` 是 varchar NOT NULL DEFAULT `active`：
//! - 创建接口固定写 `active`（请求体没有 status 字段）；
//! - 更新接口接受任意 `status` 字符串并直接 COALESCE 落库；
//! - 列表过滤与“即将到期”查询裸绑/写死 `active`；
//! - 续签执行成功后回写 `active`。
//!
//! 值集取自前端合同 schema 的四个选项（active/expired/terminated/pending），
//! 后端全部写入方都落在这四个值内。

use std::fmt;
use std::str::FromStr;

use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ContractStatus {
    Active,
    Expired,
    Terminated,
    Pending,
}

impl ContractStatus {
    pub const ALL: [Self; 4] = [Self::Active, Self::Expired, Self::Terminated, Self::Pending];
    pub const DB_VALUES: [&'static str; 4] = ["active", "expired", "terminated", "pending"];
    pub const DEFAULT: Self = Self::Active;

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim() {
            "active" => Some(Self::Active),
            "expired" => Some(Self::Expired),
            "terminated" => Some(Self::Terminated),
            "pending" => Some(Self::Pending),
            _ => None,
        }
    }

    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Expired => "expired",
            Self::Terminated => "terminated",
            Self::Pending => "pending",
        }
    }

    #[must_use]
    pub fn normalize(raw: &str) -> Option<Self> {
        Self::from_db_str(raw)
    }

    /// 列表过滤：None / 空串 / all 表示不过滤；非法值返回 Err。
    pub fn parse_filter(raw: Option<&str>) -> Result<Option<Self>, String> {
        match raw.map(str::trim).filter(|s| !s.is_empty()) {
            None | Some("all") => Ok(None),
            Some(value) => Self::from_db_str(value).map(Some).ok_or_else(|| {
                format!(
                    "非法合同状态: {value}，可选值: {}",
                    Self::DB_VALUES.join("/")
                )
            }),
        }
    }

    /// 写入入口：`None` 保持原值（由 SQL 的 COALESCE 处理），`Some` 必须命中值域。
    pub fn parse_optional_write(raw: Option<&str>) -> Result<Option<Self>, String> {
        match raw.map(str::trim).filter(|s| !s.is_empty()) {
            None => Ok(None),
            Some(value) => Self::from_db_str(value).map(Some).ok_or_else(|| {
                format!(
                    "非法合同状态: {value}，可选值: {}",
                    Self::DB_VALUES.join("/")
                )
            }),
        }
    }
}

impl fmt::Display for ContractStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_db_str())
    }
}

impl FromStr for ContractStatus {
    type Err = ();

    fn from_str(raw: &str) -> Result<Self, Self::Err> {
        Self::from_db_str(raw).ok_or(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn values_roundtrip() {
        for status in ContractStatus::ALL {
            assert_eq!(
                ContractStatus::from_db_str(status.as_db_str()),
                Some(status)
            );
            assert_eq!(status.to_string(), status.as_db_str());
            assert_eq!(ContractStatus::from_str(status.as_db_str()), Ok(status));
        }
        assert_eq!(ContractStatus::from_db_str("bogus"), None);
    }

    #[test]
    fn filter_and_write_aliases() {
        assert_eq!(ContractStatus::parse_filter(None), Ok(None));
        assert_eq!(ContractStatus::parse_filter(Some("all")), Ok(None));
        assert_eq!(
            ContractStatus::parse_filter(Some("terminated")),
            Ok(Some(ContractStatus::Terminated))
        );
        assert!(ContractStatus::parse_filter(Some("bogus")).is_err());
        assert_eq!(ContractStatus::parse_optional_write(None), Ok(None));
        assert!(ContractStatus::parse_optional_write(Some("bogus")).is_err());
    }
}
