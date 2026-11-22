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
