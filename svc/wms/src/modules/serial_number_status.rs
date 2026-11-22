//! WMS 序列号状态与质量状态规范集合。
//!
//! 主状态：`in_stock / reserved / out_stock / frozen / scrapped`，默认 `in_stock`。
//! 质量状态：`pending / inspecting / qualified / unqualified`，默认 `pending`。
//! 历史 FSM 的 `pending / assigned / used / archived` 不再使用；本地与生产快照均无存量行。

pub const DB_VALUES: &[&str] = &["in_stock", "reserved", "out_stock", "frozen", "scrapped"];
pub const QUALITY_DB_VALUES: &[&str] = &["pending", "inspecting", "qualified", "unqualified"];

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SerialNumberStatus {
    InStock,
    Reserved,
    OutStock,
    Frozen,
    Scrapped,
}

impl SerialNumberStatus {
    pub const DB_VALUES: &'static [&'static str] = super::serial_number_status::DB_VALUES;
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
            other => Err(format!("未知序列号状态: {other}")),
        }
    }

    /// 序列号主状态迁移矩阵；同态回写视为幂等更新。
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
                "序列号状态不允许从 {} 流转到 {}",
                self.as_db_str(),
                target.as_db_str()
            ))
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SerialNumberQualityStatus {
    Pending,
    Inspecting,
    Qualified,
    Unqualified,
}

impl SerialNumberQualityStatus {
    pub const DB_VALUES: &'static [&'static str] = super::serial_number_status::QUALITY_DB_VALUES;
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
            other => Err(format!("未知序列号质量状态: {other}")),
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
                "序列号质量状态不允许从 {} 流转到 {}",
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
    fn serial_status_roundtrip() {
        assert_eq!(SerialNumberStatus::DEFAULT.as_db_str(), "in_stock");
        for raw in DB_VALUES {
            let parsed = SerialNumberStatus::from_db_str(raw).expect("规范值应可解析");
            assert_eq!(&parsed.as_db_str(), raw);
        }
        assert!(SerialNumberStatus::from_db_str("pending").is_err());
        assert!(SerialNumberStatus::from_db_str("archived").is_err());
    }

    #[test]
    fn serial_status_transition_matrix() {
        assert!(SerialNumberStatus::InStock
            .can_transition_to(SerialNumberStatus::Reserved)
            .is_ok());
        assert!(SerialNumberStatus::Reserved
            .can_transition_to(SerialNumberStatus::OutStock)
            .is_ok());
        assert!(SerialNumberStatus::OutStock
            .can_transition_to(SerialNumberStatus::InStock)
            .is_ok());
        assert!(SerialNumberStatus::Scrapped
            .can_transition_to(SerialNumberStatus::InStock)
            .is_err());
        assert!(SerialNumberStatus::InStock
            .can_transition_to(SerialNumberStatus::InStock)
            .is_ok());
    }

    #[test]
    fn serial_quality_roundtrip_and_matrix() {
        assert_eq!(SerialNumberQualityStatus::DEFAULT.as_db_str(), "pending");
        for raw in QUALITY_DB_VALUES {
            let parsed = SerialNumberQualityStatus::from_db_str(raw).expect("质量值应可解析");
            assert_eq!(&parsed.as_db_str(), raw);
        }
        assert!(SerialNumberQualityStatus::Pending
            .can_transition_to(SerialNumberQualityStatus::Inspecting)
            .is_ok());
        assert!(SerialNumberQualityStatus::Qualified
            .can_transition_to(SerialNumberQualityStatus::Pending)
            .is_err());
        assert!(SerialNumberQualityStatus::from_db_str("rejected").is_err());
    }
}
