//! WMS 批次状态与质量状态规范集合。
//!
//! 主状态：`in_stock / reserved / out_stock / frozen / scrapped`，默认 `in_stock`。
//! 质量状态：`pending / inspecting / qualified / unqualified`，默认 `pending`。
//! 历史兼容：旧代码把主状态写成 `active`，只读映射为 `in_stock`，不再写入。

pub const DB_VALUES: &[&str] = &["in_stock", "reserved", "out_stock", "frozen", "scrapped"];
pub const EDITABLE: &[&str] = &["in_stock", "reserved", "out_stock", "frozen"];

pub const QUALITY_DB_VALUES: &[&str] = &["pending", "inspecting", "qualified", "unqualified"];

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BatchStatus {
    InStock,
    Reserved,
    OutStock,
    Frozen,
    Scrapped,
}

impl BatchStatus {
    pub const DB_VALUES: &'static [&'static str] = super::batch_status::DB_VALUES;
    pub const DEFAULT: Self = Self::InStock;

    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::InStock => "in_stock",
            Self::Reserved => "reserved",
            Self::OutStock => "out_stock",
            Self::Frozen => "frozen",
            Self::Scrapped => "scrapped",
        }
    }

    pub fn from_db_str(raw: &str) -> Result<Self, String> {
        match raw {
            "in_stock" => Ok(Self::InStock),
            "reserved" => Ok(Self::Reserved),
            "out_stock" => Ok(Self::OutStock),
            "frozen" => Ok(Self::Frozen),
            "scrapped" => Ok(Self::Scrapped),
            other => Err(format!("未知批次状态: {other}")),
        }
    }

    /// 只读兼容：旧初始态 `active` 映射为 `in_stock`。
    pub fn from_read_str(raw: &str) -> Result<Self, String> {
        match raw {
            "active" => Ok(Self::InStock),
            other => Self::from_db_str(other),
        }
    }

    pub const fn is_editable(self) -> bool {
        !matches!(self, Self::Scrapped)
    }

    /// 批次主状态迁移矩阵；同态回写视为幂等更新。
    pub fn can_transition_to(self, target: Self) -> Result<(), String> {
        if self == target {
            return Ok(());
        }
        let allowed = match self {
            Self::InStock => matches!(
                target,
                Self::Reserved | Self::OutStock | Self::Frozen | Self::Scrapped
            ),
            Self::Reserved => matches!(
                target,
                Self::InStock | Self::OutStock | Self::Frozen | Self::Scrapped
            ),
            Self::OutStock => matches!(target, Self::InStock | Self::Scrapped),
            Self::Frozen => matches!(target, Self::InStock | Self::Scrapped),
            Self::Scrapped => false,
        };
        if allowed {
            Ok(())
        } else {
            Err(format!(
                "批次状态不允许从 {} 流转到 {}",
                self.as_db_str(),
                target.as_db_str()
            ))
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BatchQualityStatus {
    Pending,
    Inspecting,
    Qualified,
    Unqualified,
}

impl BatchQualityStatus {
    pub const DB_VALUES: &'static [&'static str] = super::batch_status::QUALITY_DB_VALUES;
    pub const DEFAULT: Self = Self::Pending;

    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Inspecting => "inspecting",
            Self::Qualified => "qualified",
            Self::Unqualified => "unqualified",
        }
    }

    pub fn from_db_str(raw: &str) -> Result<Self, String> {
        match raw {
            "pending" => Ok(Self::Pending),
            "inspecting" => Ok(Self::Inspecting),
            "qualified" => Ok(Self::Qualified),
            "unqualified" => Ok(Self::Unqualified),
            other => Err(format!("未知批次质量状态: {other}")),
        }
    }

    /// 质量结论迁移矩阵；允许复检在 qualified/unqualified 之间回写。
    pub fn can_transition_to(self, target: Self) -> Result<(), String> {
        if self == target {
            return Ok(());
        }
        let allowed = match self {
            Self::Pending => matches!(
                target,
                Self::Inspecting | Self::Qualified | Self::Unqualified
            ),
            Self::Inspecting => matches!(target, Self::Qualified | Self::Unqualified),
            Self::Qualified => matches!(target, Self::Inspecting | Self::Unqualified),
            Self::Unqualified => matches!(target, Self::Inspecting | Self::Qualified),
        };
        if allowed {
            Ok(())
        } else {
            Err(format!(
                "批次质量状态不允许从 {} 流转到 {}",
                self.as_db_str(),
                target.as_db_str()
            ))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn batch_status_roundtrip_and_legacy_read_alias() {
        assert_eq!(BatchStatus::DEFAULT.as_db_str(), "in_stock");
        for raw in DB_VALUES {
            let parsed = BatchStatus::from_db_str(raw).expect("规范值应可解析");
            assert_eq!(&parsed.as_db_str(), raw);
        }
        assert_eq!(
            BatchStatus::from_read_str("active").unwrap().as_db_str(),
            "in_stock"
        );
        assert!(BatchStatus::from_db_str("active").is_err());
        assert!(BatchStatus::from_db_str("created").is_err());
    }

    #[test]
    fn batch_status_transition_matrix() {
        assert!(BatchStatus::InStock
            .can_transition_to(BatchStatus::Reserved)
            .is_ok());
        assert!(BatchStatus::Reserved
            .can_transition_to(BatchStatus::OutStock)
            .is_ok());
        assert!(BatchStatus::OutStock
            .can_transition_to(BatchStatus::InStock)
            .is_ok());
        assert!(BatchStatus::Scrapped
            .can_transition_to(BatchStatus::InStock)
            .is_err());
        assert!(BatchStatus::InStock
            .can_transition_to(BatchStatus::InStock)
            .is_ok());
    }

    #[test]
    fn batch_quality_status_roundtrip_and_matrix() {
        assert_eq!(BatchQualityStatus::DEFAULT.as_db_str(), "pending");
        for raw in QUALITY_DB_VALUES {
            let parsed = BatchQualityStatus::from_db_str(raw).expect("质量值应可解析");
            assert_eq!(&parsed.as_db_str(), raw);
        }
        assert!(BatchQualityStatus::Pending
            .can_transition_to(BatchQualityStatus::Inspecting)
            .is_ok());
        assert!(BatchQualityStatus::Inspecting
            .can_transition_to(BatchQualityStatus::Qualified)
            .is_ok());
        assert!(BatchQualityStatus::Qualified
            .can_transition_to(BatchQualityStatus::Pending)
            .is_err());
        assert!(BatchQualityStatus::from_db_str("rejected").is_err());
    }
}
