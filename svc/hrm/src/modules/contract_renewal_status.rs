//! 合同续签状态（W5-B B214）
//!
//! `hrm.contract_renewals.status` 是 varchar 默认 `pending`，写入全部是字面量：
//! 创建写 pending、审批 approved、驳回 rejected、执行 executed，
//! 更新/取消用 `WHERE status = 'pending'` 守卫，执行接口用 `!= "approved"` 字符串比较，
//! 列表过滤接受任意字符串（非法值静默返回 0 行）。本模块把值域固定为唯一枚举。

use std::fmt;
use std::str::FromStr;

use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ContractRenewalStatus {
    Pending,
    Approved,
    Rejected,
    Executed,
}

impl ContractRenewalStatus {
    pub const ALL: [Self; 4] = [
        Self::Pending,
        Self::Approved,
        Self::Rejected,
        Self::Executed,
    ];
    pub const DB_VALUES: [&'static str; 4] = ["pending", "approved", "rejected", "executed"];
    pub const DEFAULT: Self = Self::Pending;

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim() {
            "pending" => Some(Self::Pending),
            "approved" => Some(Self::Approved),
            "rejected" => Some(Self::Rejected),
            "executed" => Some(Self::Executed),
            _ => None,
        }
    }

    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Approved => "approved",
            Self::Rejected => "rejected",
            Self::Executed => "executed",
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
                    "非法续签状态: {value}，可选值: {}",
                    Self::DB_VALUES.join("/")
                )
            }),
        }
    }
}

impl fmt::Display for ContractRenewalStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.as_db_str())
    }
}

impl FromStr for ContractRenewalStatus {
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
        for status in ContractRenewalStatus::ALL {
            assert_eq!(
                ContractRenewalStatus::from_db_str(status.as_db_str()),
                Some(status)
            );
            assert_eq!(status.to_string(), status.as_db_str());
            assert_eq!(
                ContractRenewalStatus::from_str(status.as_db_str()),
                Ok(status)
            );
        }
        assert_eq!(ContractRenewalStatus::from_db_str("bogus"), None);
    }

    #[test]
    fn filter_accepts_empty_and_all_but_rejects_unknown() {
        assert_eq!(ContractRenewalStatus::parse_filter(None), Ok(None));
        assert_eq!(ContractRenewalStatus::parse_filter(Some("  ")), Ok(None));
        assert_eq!(ContractRenewalStatus::parse_filter(Some("all")), Ok(None));
        assert_eq!(
            ContractRenewalStatus::parse_filter(Some("executed")),
            Ok(Some(ContractRenewalStatus::Executed))
        );
        assert!(ContractRenewalStatus::parse_filter(Some("bogus")).is_err());
    }
}
