//! 库位占用状态规范集合。
//!
//! 状态集合与 `wms.locations.status` 的候选 CHECK 保持一致：
//! `available / partial / full / inactive`。
//!
//! 历史读兼容：旧前端把空闲写作 `empty`、部分占用写作 `partially_filled`，
//! 只读映射为 `available / partial`，不进入写入。
//!
//! 这是属性型状态，不设审批 FSM；允许在四个值之间改判。

/// 库位允许持久化的全部状态，顺序即前端展示顺序。
pub const DB_VALUES: &[&str] = &["available", "partial", "full", "inactive"];

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum LocationStatus {
    Available,
    Partial,
    Full,
    Inactive,
}

impl LocationStatus {
    pub const DB_VALUES: &'static [&'static str] = super::location_status::DB_VALUES;

    pub const DEFAULT: Self = Self::Available;

    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Available => "available",
            Self::Partial => "partial",
            Self::Full => "full",
            Self::Inactive => "inactive",
        }
    }

    /// 严格解析持久化值；未知值返回 400 错误文本。
    pub fn from_db_str(raw: &str) -> Result<Self, String> {
        match raw {
            "available" => Ok(Self::Available),
            "partial" => Ok(Self::Partial),
            "full" => Ok(Self::Full),
            "inactive" => Ok(Self::Inactive),
            other => Err(format!("未知库位状态: {other}")),
        }
    }

    /// 读侧兼容旧前端/旧数据的别名，只映射规范态，不接受写入。
    pub fn from_read_str(raw: &str) -> Result<Self, String> {
        match raw {
            "empty" => Ok(Self::Available),
            "partially_filled" => Ok(Self::Partial),
            other => Self::from_db_str(other),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_and_roundtrip_are_strict() {
        assert_eq!(LocationStatus::DEFAULT, LocationStatus::Available);
        for value in DB_VALUES {
            let parsed = LocationStatus::from_db_str(value).expect("规范值应可解析");
            assert_eq!(parsed.as_db_str(), *value);
        }
        assert!(LocationStatus::from_db_str("bogus").is_err());
        assert_eq!(
            LocationStatus::from_read_str("empty").expect("旧空闲态"),
            LocationStatus::Available
        );
        assert_eq!(
            LocationStatus::from_read_str("partially_filled").expect("旧部分占用"),
            LocationStatus::Partial
        );
    }

    #[test]
    fn aliases_do_not_leak_into_writes() {
        assert!(LocationStatus::from_db_str("empty").is_err());
        assert!(LocationStatus::from_db_str("partially_filled").is_err());
    }
}
