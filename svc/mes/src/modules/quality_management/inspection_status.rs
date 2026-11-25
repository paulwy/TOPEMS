//! 质量检验状态唯一集合。
//!
//! 落库列：`mes.quality_inspections.status`（varchar，DB 默认 `pending`）。
//! 值集覆盖检验生命周期与让步接收流转，前端 `apps/web/src/schemas/mes/quality.ts` 及
//! `apps/web/src/types/mes.ts` 的 `QualityInspectionResult`。

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InspectionStatus {
    Pending,
    Inspecting,
    Passed,
    Failed,
    Rework,
    Scrapped,
    ConcessionReceived,
}

impl InspectionStatus {
    pub const DEFAULT: Self = Self::Pending;

    pub const DB_VALUES: [&'static str; 7] = [
        "pending",
        "inspecting",
        "passed",
        "failed",
        "rework",
        "scrapped",
        "concession_received",
    ];

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Inspecting => "inspecting",
            Self::Passed => "passed",
            Self::Failed => "failed",
            Self::Rework => "rework",
            Self::Scrapped => "scrapped",
            Self::ConcessionReceived => "concession_received",
        }
    }

    /// 允许编辑/删除的未完结状态。
    #[must_use]
    pub const fn editable_from() -> &'static [&'static str] {
        &["pending", "inspecting", "failed", "rework"]
    }

    /// 更新入口的状态守卫：终态不可编辑，目标态必须按检验生命周期流转。
    pub fn can_update_from(self, target: Option<Self>) -> Result<(), &'static str> {
        if matches!(
            self,
            Self::Passed | Self::Scrapped | Self::ConcessionReceived
        ) {
            return Err("检验记录已完结，不可再编辑");
        }
        let Some(to) = target else {
            return Ok(());
        };
        if to == self {
            return Ok(());
        }
        match to {
            Self::Pending => Err("检验状态不允许回退到 pending"),
            Self::Inspecting => {
                if matches!(self, Self::Pending | Self::Failed | Self::Rework) {
                    Ok(())
                } else {
                    Err("只有 pending/failed/rework 可进入 inspecting")
                }
            }
            Self::Passed
            | Self::Failed
            | Self::Rework
            | Self::Scrapped
            | Self::ConcessionReceived => {
                if self == Self::Inspecting {
                    Ok(())
                } else {
                    Err("只有 inspecting 可判定为 passed/failed/rework/scrapped/concession_received")
                }
            }
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "pending" => Some(Self::Pending),
            "inspecting" => Some(Self::Inspecting),
            "passed" => Some(Self::Passed),
            "failed" => Some(Self::Failed),
            "rework" => Some(Self::Rework),
            "scrapped" => Some(Self::Scrapped),
            "concession_received" => Some(Self::ConcessionReceived),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_and_values_are_stable() {
        assert_eq!(InspectionStatus::DEFAULT.as_db_str(), "pending");
        assert_eq!(
            InspectionStatus::DB_VALUES,
            [
                "pending",
                "inspecting",
                "passed",
                "failed",
                "rework",
                "scrapped",
                "concession_received"
            ]
        );
    }

    #[test]
    fn update_lifecycle_is_strict() {
        assert!(InspectionStatus::Pending
            .can_update_from(Some(InspectionStatus::Inspecting))
            .is_ok());
        assert!(InspectionStatus::Inspecting
            .can_update_from(Some(InspectionStatus::Passed))
            .is_ok());
        assert!(InspectionStatus::Passed.can_update_from(None).is_err());
        assert!(InspectionStatus::Pending
            .can_update_from(Some(InspectionStatus::Passed))
            .is_err());
        assert!(InspectionStatus::Inspecting
            .can_update_from(Some(InspectionStatus::Pending))
            .is_err());
    }

    #[test]
    fn every_value_roundtrips() {
        for value in InspectionStatus::DB_VALUES {
            assert_eq!(
                InspectionStatus::from_db_str(value).map(|v| v.as_db_str()),
                Some(value)
            );
        }
        assert_eq!(InspectionStatus::from_db_str("bogus"), None);
    }
}
