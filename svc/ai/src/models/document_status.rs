//! AI 文档状态：`ai.documents.status` 的唯一值源。
//!
//! 写入方：`services/vector.rs#create_document`（pending）、
//! `services/document.rs` 处理完成（processed）/内容为空（empty）。

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum DocumentStatus {
    /// 已入库待处理
    Pending,
    /// 已切块并写入向量
    Processed,
    /// 内容为空，无法切块
    Empty,
}

impl DocumentStatus {
    pub const DB_VALUES: [&'static str; 3] = ["pending", "processed", "empty"];

    /// 创建文档的初始态
    pub const DEFAULT: Self = Self::Pending;

    pub fn from_db_str(s: &str) -> Option<Self> {
        match s.trim().to_ascii_lowercase().as_str() {
            "pending" => Some(Self::Pending),
            "processed" => Some(Self::Processed),
            "empty" => Some(Self::Empty),
            _ => None,
        }
    }

    pub fn as_db_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Processed => "processed",
            Self::Empty => "empty",
        }
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn document_status_db_strings_roundtrip() {
        for s in DocumentStatus::DB_VALUES {
            assert_eq!(
                DocumentStatus::from_db_str(s).map(|v| v.as_db_str()),
                Some(s)
            );
        }
        assert_eq!(DocumentStatus::DEFAULT.as_db_str(), "pending");
        assert_eq!(DocumentStatus::from_db_str("failed"), None);
        assert_eq!(
            DocumentStatus::from_db_str("PROCESSED"),
            Some(DocumentStatus::Processed)
        );
    }
}
