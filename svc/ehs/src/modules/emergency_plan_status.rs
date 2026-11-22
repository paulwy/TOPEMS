//! 应急预案状态：`ehs.qa_ehs_emergency_plans.status` 的唯一值源。
//!
//! 前端 `apps/web/src/schemas/ehs/emergency.ts`：
//! draft / planned / ongoing / completed / cancelled。
//! 创建未传状态时沿用既有契约写 `planned`。

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EmergencyPlanStatus {
    Draft,
    Planned,
    Ongoing,
    Completed,
    Cancelled,
}

impl EmergencyPlanStatus {
    pub const DEFAULT: Self = Self::Planned;

    pub const DB_VALUES: [&'static str; 5] =
        ["draft", "planned", "ongoing", "completed", "cancelled"];

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Planned => "planned",
            Self::Ongoing => "ongoing",
            Self::Completed => "completed",
            Self::Cancelled => "cancelled",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "draft" => Some(Self::Draft),
            "planned" => Some(Self::Planned),
            "ongoing" => Some(Self::Ongoing),
            "completed" => Some(Self::Completed),
            "cancelled" | "canceled" => Some(Self::Cancelled),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_all_values() {
        for raw in EmergencyPlanStatus::DB_VALUES {
            assert_eq!(
                EmergencyPlanStatus::from_db_str(raw).map(EmergencyPlanStatus::as_db_str),
                Some(raw)
            );
        }
        assert_eq!(EmergencyPlanStatus::from_db_str("bogus"), None);
        assert_eq!(EmergencyPlanStatus::DEFAULT.as_db_str(), "planned");
    }
}
