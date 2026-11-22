//! 工作流任务状态：`public.core_workflow_tasks.status` 的唯一值源。

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WorkflowTaskStatus {
    Pending,
    Claimed,
    Approved,
    Rejected,
    Completed,
    Delegated,
    Error,
}

impl WorkflowTaskStatus {
    pub const DEFAULT: Self = Self::Pending;

    pub const DB_VALUES: [&'static str; 7] = [
        "pending",
        "claimed",
        "approved",
        "rejected",
        "completed",
        "delegated",
        "error",
    ];

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Claimed => "claimed",
            Self::Approved => "approved",
            Self::Rejected => "rejected",
            Self::Completed => "completed",
            Self::Delegated => "delegated",
            Self::Error => "error",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "pending" => Some(Self::Pending),
            "claimed" => Some(Self::Claimed),
            "approved" => Some(Self::Approved),
            "rejected" => Some(Self::Rejected),
            "completed" => Some(Self::Completed),
            "delegated" => Some(Self::Delegated),
            "error" => Some(Self::Error),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_all_values() {
        for raw in WorkflowTaskStatus::DB_VALUES {
            assert_eq!(
                WorkflowTaskStatus::from_db_str(raw).map(WorkflowTaskStatus::as_db_str),
                Some(raw)
            );
        }
        assert_eq!(WorkflowTaskStatus::from_db_str("bogus"), None);
        assert_eq!(WorkflowTaskStatus::DEFAULT.as_db_str(), "pending");
    }
}
