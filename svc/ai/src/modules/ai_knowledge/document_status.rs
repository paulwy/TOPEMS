//! 知识文档状态：`core.knowledge_documents.status` 的唯一值源。
//!
//! 生命周期：pending → processing → ready / failed；failed 可重新处理。
//! processing 期间禁止再次进入，避免并发重复切块。

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum KnowledgeDocumentStatus {
    /// 待处理
    Pending,
    /// 处理中
    Processing,
    /// 已就绪
    Ready,
    /// 处理失败
    Failed,
}

impl KnowledgeDocumentStatus {
    pub const DB_VALUES: [&'static str; 4] = ["pending", "processing", "ready", "failed"];

    /// 新文档的初始态
    pub const DEFAULT: Self = Self::Pending;

    /// 允许进入处理的状态：待处理、失败重试、就绪重建。
    pub fn process_from() -> &'static [&'static str] {
        &["pending", "failed", "ready"]
    }

    #[must_use]
    pub fn from_db_str(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "pending" => Some(Self::Pending),
            "processing" => Some(Self::Processing),
            "ready" => Some(Self::Ready),
            "failed" => Some(Self::Failed),
            _ => None,
        }
    }

    #[must_use]
    pub fn as_db_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Processing => "processing",
            Self::Ready => "ready",
            Self::Failed => "failed",
        }
    }

    /// 显式改状态允许的迁移：pending↔processing，processing→ready/failed，failed/ready→pending。
    #[must_use]
    pub fn can_transition_to(self, target: Self) -> bool {
        if self == target {
            return true;
        }
        matches!(
            (self, target),
            (Self::Pending, Self::Processing)
                | (Self::Processing, Self::Ready | Self::Failed)
                | (Self::Failed | Self::Ready, Self::Pending)
        )
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used)]
mod tests {
    use super::*;

    #[test]
    fn db_strings_roundtrip() {
        for raw in KnowledgeDocumentStatus::DB_VALUES {
            let parsed = KnowledgeDocumentStatus::from_db_str(raw).expect("db value must parse");
            assert_eq!(parsed.as_db_str(), raw);
        }
        assert_eq!(KnowledgeDocumentStatus::from_db_str("completed"), None);
        assert_eq!(KnowledgeDocumentStatus::DEFAULT.as_db_str(), "pending");
    }

    #[test]
    fn transitions_are_canonical() {
        assert!(
            KnowledgeDocumentStatus::Pending.can_transition_to(KnowledgeDocumentStatus::Processing)
        );
        assert!(
            KnowledgeDocumentStatus::Processing.can_transition_to(KnowledgeDocumentStatus::Ready)
        );
        assert!(KnowledgeDocumentStatus::Failed.can_transition_to(KnowledgeDocumentStatus::Pending));
        assert!(!KnowledgeDocumentStatus::Processing
            .can_transition_to(KnowledgeDocumentStatus::Pending));
        assert!(
            !KnowledgeDocumentStatus::Ready.can_transition_to(KnowledgeDocumentStatus::Processing)
        );
    }
}
