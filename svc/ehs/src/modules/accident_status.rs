//! 事故（ehs.qa_ehs_accidents）状态唯一集合。
//!
//! 落库列：`ehs.qa_ehs_accidents.status`（varchar，DB 默认 `reported`）。
//! 上报写 reported；结案动作写 closed；本地 48 行全部 reported。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AccidentStatus {
    Reported,
    Closed,
}

impl AccidentStatus {
    pub const DEFAULT: Self = Self::Reported;

    pub const DB_VALUES: &'static [&'static str] = &["reported", "closed"];

    #[must_use]
    pub fn as_db_str(self) -> &'static str {
        match self {
            Self::Reported => "reported",
            Self::Closed => "closed",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw {
            "reported" => Some(Self::Reported),
            "closed" => Some(Self::Closed),
            _ => None,
        }
    }

    /// 结案动作只允许从 reported 进入；重复结案不再假成功。
    #[must_use]
    pub fn close_from() -> &'static [Self] {
        &[Self::Reported]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_all_values() {
        for raw in AccidentStatus::DB_VALUES {
            let parsed = AccidentStatus::from_db_str(raw).expect("db value must parse");
            assert_eq!(parsed.as_db_str(), *raw);
        }
        assert_eq!(AccidentStatus::from_db_str("pending"), None);
        assert_eq!(AccidentStatus::from_db_str("调查中"), None);
        assert_eq!(AccidentStatus::DEFAULT.as_db_str(), "reported");
    }

    #[test]
    fn close_only_from_reported() {
        let allowed = AccidentStatus::close_from();
        assert!(allowed.contains(&AccidentStatus::Reported));
        assert_eq!(AccidentStatus::close_from().len(), 1);
    }
}
