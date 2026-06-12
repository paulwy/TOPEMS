use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use time::OffsetDateTime;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Attachment {
    pub id: Uuid,
    pub email_id: Option<Uuid>, // Optional: can exist without email (uploaded but not sent)
    pub filename: String,
    pub original_filename: String,
    pub file_path: String,
    pub file_size: i64,
    pub content_type: String,
    pub created_by: Option<Uuid>,
    pub created_at: OffsetDateTime,
    pub updated_at: OffsetDateTime,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct AttachmentUploadResponse {
    pub id: Uuid,
    pub filename: String,
    pub original_filename: String,
    pub file_size: i64,
    pub content_type: String,
}

#[derive(Debug, Serialize)]
pub struct AttachmentListItem {
    pub id: Uuid,
    pub email_id: Option<Uuid>,
    pub filename: String,
    pub original_filename: String,
    pub file_size: i64,
    pub content_type: String,
    pub created_at: OffsetDateTime,
}

impl From<Attachment> for AttachmentListItem {
    fn from(att: Attachment) -> Self {
        AttachmentListItem {
            id: att.id,
            email_id: att.email_id,
            filename: att.filename,
            original_filename: att.original_filename,
            file_size: att.file_size,
            content_type: att.content_type,
            created_at: att.created_at,
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct AttachmentParams {
    pub email_id: Option<Uuid>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct AttachEmailRequest {
    pub attachment_ids: Vec<Uuid>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_attachment_creation() {
        let attachment = Attachment {
            id: Uuid::new_v4(),
            email_id: None,
            filename: "abc123.pdf".to_string(),
            original_filename: "report.pdf".to_string(),
            file_path: "/uploads/attachments/abc123.pdf".to_string(),
            file_size: 102400,
            content_type: "application/pdf".to_string(),
            created_by: None,
            created_at: OffsetDateTime::now_utc(),
            updated_at: OffsetDateTime::now_utc(),
        };

        assert!(attachment.email_id.is_none());
        assert_eq!(attachment.file_size, 102400);
    }

    #[test]
    fn test_attachment_list_item_from() {
        let attachment = Attachment {
            id: Uuid::new_v4(),
            email_id: Some(Uuid::new_v4()),
            filename: "test.jpg".to_string(),
            original_filename: "photo.jpg".to_string(),
            file_path: "/uploads/test.jpg".to_string(),
            file_size: 50000,
            content_type: "image/jpeg".to_string(),
            created_by: None,
            created_at: OffsetDateTime::now_utc(),
            updated_at: OffsetDateTime::now_utc(),
        };

        let list_item: AttachmentListItem = attachment.into();
        assert_eq!(list_item.content_type, "image/jpeg");
    }
}
