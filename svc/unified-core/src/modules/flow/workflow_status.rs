//! 工作流定义状态：`public.core_workflows.status` 的唯一值源。

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WorkflowStatus {
    Draft,
    Published,
    Active,
    Inactive,
    Deployed,
}

impl WorkflowStatus {
    pub const DEFAULT: Self = Self::Draft;

    pub const DB_VALUES: [&'static str; 5] =
        ["draft", "published", "active", "inactive", "deployed"];

    #[must_use]
    pub const fn as_db_str(self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Published => "published",
            Self::Active => "active",
            Self::Inactive => "inactive",
            Self::Deployed => "deployed",
        }
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "draft" => Some(Self::Draft),
            "published" => Some(Self::Published),
            "active" => Some(Self::Active),
            "inactive" => Some(Self::Inactive),
            "deployed" => Some(Self::Deployed),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_all_values() {
        for raw in WorkflowStatus::DB_VALUES {
            assert_eq!(
                WorkflowStatus::from_db_str(raw).map(WorkflowStatus::as_db_str),
                Some(raw)
            );
        }
        assert_eq!(WorkflowStatus::from_db_str("bogus"), None);
        assert_eq!(WorkflowStatus::DEFAULT.as_db_str(), "draft");
    }
}
