//! 工作流实例状态：`public.core_workflow_instances.status` 的唯一值源。
//!
//! 值集来自实例创建 / 启动 / 审批 / 驳回 / 取消 / 恢复 / 暂停 / 重试端点，
//! 以及监控统计使用的终态 `completed` 与异常态 `error`。

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WorkflowInstanceStatus {
    Pending,
    Running,
    Approved,
    Rejected,
    Cancelled,
    Suspended,
    Completed,
    Error,
}

impl WorkflowInstanceStatus {
    pub const DEFAULT: Self = Self::Running;

    pub const DB_VALUES: [&'static str; 8] = [
        "pending",
        "running",
        "approved",
        "rejected",
        "cancelled",
        "suspended",
        "completed",
        "error",
    ];

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Running => "running",
            Self::Approved => "approved",
            Self::Rejected => "rejected",
            Self::Cancelled => "cancelled",
            Self::Suspended => "suspended",
            Self::Completed => "completed",
            Self::Error => "error",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "pending" => Some(Self::Pending),
            "running" => Some(Self::Running),
            "approved" => Some(Self::Approved),
            "rejected" => Some(Self::Rejected),
            "cancelled" | "canceled" => Some(Self::Cancelled),
            "suspended" => Some(Self::Suspended),
            "completed" => Some(Self::Completed),
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
        for raw in WorkflowInstanceStatus::DB_VALUES {
            assert_eq!(
                WorkflowInstanceStatus::from_db_str(raw).map(WorkflowInstanceStatus::as_db_str),
                Some(raw)
            );
        }
        assert_eq!(WorkflowInstanceStatus::from_db_str("bogus"), None);
        assert_eq!(WorkflowInstanceStatus::DEFAULT.as_db_str(), "running");
    }
}
