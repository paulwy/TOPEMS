//! 外部 ERP 连接与同步日志状态：`integration.erp_connections`、
//! `integration.external_erp_sync_logs` 及其 public 镜像的唯一值源。

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ErpConnectionStatus {
    Active,
    Inactive,
}

impl ErpConnectionStatus {
    pub const DB_VALUES: [&'static str; 2] = ["active", "inactive"];
    pub const DEFAULT: Self = Self::Inactive;

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Inactive => "inactive",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "active" => Some(Self::Active),
            "inactive" => Some(Self::Inactive),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ErpSyncLogStatus {
    Running,
    Success,
    Failed,
}

impl ErpSyncLogStatus {
    pub const DB_VALUES: [&'static str; 3] = ["running", "success", "failed"];
    pub const DEFAULT: Self = Self::Running;

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Running => "running",
            Self::Success => "success",
            Self::Failed => "failed",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "running" => Some(Self::Running),
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
    fn connection_status_roundtrip() {
        for value in ErpConnectionStatus::DB_VALUES {
            let parsed = ErpConnectionStatus::from_db_str(value).expect("valid connection status");
            assert_eq!(parsed.as_db_str(), value);
        }
        assert!(ErpConnectionStatus::from_db_str("ACTIVE").is_some());
        assert!(ErpConnectionStatus::from_db_str("bogus").is_none());
    }

    #[test]
    fn sync_log_status_roundtrip() {
        for value in ErpSyncLogStatus::DB_VALUES {
            let parsed = ErpSyncLogStatus::from_db_str(value).expect("valid sync status");
            assert_eq!(parsed.as_db_str(), value);
        }
        assert!(ErpSyncLogStatus::from_db_str("FAILED").is_some());
        assert!(ErpSyncLogStatus::from_db_str("bogus").is_none());
    }
}
