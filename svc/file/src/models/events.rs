use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::permission::Principal;

/// 文件事件枚举
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
#[allow(dead_code)]
pub enum FileEvent {
    /// 文件上传事件
    FileUploaded {
        file_id: Uuid,
        owner_id: Uuid,
        owner_department_id: Option<Uuid>,
        file_type: String,
        storage_path: String,
        content_type: String,
        file_size: i64,
    },

    /// 文件删除事件
    FileDeleted {
        file_id: Uuid,
        storage_path: String,
        owner_id: Uuid,
    },

    /// 文件分享事件
    FileShared {
        file_id: Uuid,
        shared_with: Principal,
        granted_by: Uuid,
    },

    /// 文件版本创建事件
    FileVersionCreated {
        file_id: Uuid,
        new_version_id: Uuid,
        new_storage_path: String,
    },

    /// 文件分享取消事件
    FileUnshared { file_id: Uuid, principal: Principal },

    /// 向量化状态更新事件
    VectorStatusUpdated {
        file_id: Uuid,
        vector_document_id: Option<Uuid>,
        status: String,
    },
}

impl FileEvent {
    /// 获取事件类型名称
    #[allow(dead_code)]
    pub fn event_type(&self) -> &'static str {
        match self {
            FileEvent::FileUploaded { .. } => "file.uploaded",
            FileEvent::FileDeleted { .. } => "file.deleted",
            FileEvent::FileShared { .. } => "file.shared",
            FileEvent::FileVersionCreated { .. } => "file.version_created",
            FileEvent::FileUnshared { .. } => "file.unshared",
            FileEvent::VectorStatusUpdated { .. } => "file.vector_status_updated",
        }
    }
}

/// 判断文件是否应该触发向量化
pub fn should_vectorize_for_event(content_type: &str) -> bool {
    matches!(
        content_type,
        "text/plain"
            | "text/markdown"
            | "text/csv"
            | "application/pdf"
            | "application/msword"
            | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            | "application/vnd.ms-excel"
            | "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_event_type() {
        let event = FileEvent::FileUploaded {
            file_id: Uuid::new_v4(),
            owner_id: Uuid::new_v4(),
            owner_department_id: None,
            file_type: "document".to_string(),
            storage_path: "/test/file.txt".to_string(),
            content_type: "text/plain".to_string(),
            file_size: 1024,
        };

        assert_eq!(event.event_type(), "file.uploaded");
    }

    #[test]
    fn test_should_vectorize() {
        assert!(should_vectorize_for_event("text/plain"));
        assert!(should_vectorize_for_event("application/pdf"));
        assert!(!should_vectorize_for_event("image/png"));
        assert!(!should_vectorize_for_event("video/mp4"));
    }
}
