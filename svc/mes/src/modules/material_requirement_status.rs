//! 物料需求状态唯一集合。
//!
//! 落库列：`mes.material_requirements.status`（varchar，DB 默认 `draft`）。
//! 值集与前端 `apps/web/src/schemas/mes/materialRequirement.ts` 一致。

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MaterialRequirementStatus {
    Draft,
    Confirmed,
    Released,
    Completed,
    Cancelled,
}

impl MaterialRequirementStatus {
    pub const DEFAULT: Self = Self::Draft;

    pub const DB_VALUES: [&'static str; 5] =
        ["draft", "confirmed", "released", "completed", "cancelled"];

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Confirmed => "confirmed",
            Self::Released => "released",
            Self::Completed => "completed",
            Self::Cancelled => "cancelled",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "draft" => Some(Self::Draft),
            "confirmed" => Some(Self::Confirmed),
            "released" => Some(Self::Released),
            "completed" => Some(Self::Completed),
            "cancelled" => Some(Self::Cancelled),
            _ => None,
        }
    }

    /// 物料需求单向生命周期：draft → confirmed → released → completed；
    /// 各阶段可取消，completed/cancelled 终态，同态幂等。
    pub fn can_transition_to(self, target: Self) -> Result<(), String> {
        if self == target {
            return Ok(());
        }
        let allowed = match self {
            Self::Draft => matches!(target, Self::Confirmed | Self::Cancelled),
            Self::Confirmed => matches!(target, Self::Released | Self::Cancelled),
            Self::Released => matches!(target, Self::Completed | Self::Cancelled),
            Self::Completed | Self::Cancelled => false,
        };
        if allowed {
            Ok(())
        } else {
            Err(format!(
                "物料需求状态不允许从 {} 流转到 {}",
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
    fn defaults_and_values_are_stable() {
        assert_eq!(MaterialRequirementStatus::DEFAULT.as_db_str(), "draft");
        assert_eq!(
            MaterialRequirementStatus::DB_VALUES,
            ["draft", "confirmed", "released", "completed", "cancelled"]
        );
    }

    #[test]
    fn every_value_roundtrips() {
        for value in MaterialRequirementStatus::DB_VALUES {
            assert_eq!(
                MaterialRequirementStatus::from_db_str(value).map(|v| v.as_db_str()),
                Some(value)
            );
        }
        assert_eq!(MaterialRequirementStatus::from_db_str("bogus"), None);
    }

    #[test]
    fn transition_matrix_is_linear() {
        use MaterialRequirementStatus::*;
        assert!(Draft.can_transition_to(Confirmed).is_ok());
        assert!(Draft.can_transition_to(Cancelled).is_ok());
        assert!(Confirmed.can_transition_to(Released).is_ok());
        assert!(Released.can_transition_to(Completed).is_ok());
        assert!(Released.can_transition_to(Cancelled).is_ok());
        assert!(Draft.can_transition_to(Released).is_err());
        assert!(Confirmed.can_transition_to(Completed).is_err());
        assert!(Completed.can_transition_to(Confirmed).is_err());
        assert!(Cancelled.can_transition_to(Draft).is_err());
        assert!(Completed.can_transition_to(Completed).is_ok());
    }
}
