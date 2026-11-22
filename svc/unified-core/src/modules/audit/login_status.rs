//! 登录日志状态：`public.core_login_logs.status` 的唯一值源。

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LoginStatus {
    Success,
    Failed,
}

impl LoginStatus {
    pub const DB_VALUES: [&'static str; 2] = ["success", "failed"];
    pub const DEFAULT: Self = Self::Failed;

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Success => "success",
            Self::Failed => "failed",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "success" => Some(Self::Success),
            "failed" => Some(Self::Failed),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn login_status_roundtrip() {
        for value in LoginStatus::DB_VALUES {
            let Some(parsed) = LoginStatus::from_db_str(value) else {
                panic!("db value must parse: {value}");
            };
            assert_eq!(parsed.as_db_str(), value);
        }
        assert!(LoginStatus::from_db_str("SUCCESS").is_some());
        assert!(LoginStatus::from_db_str("bogus").is_none());
    }
}
