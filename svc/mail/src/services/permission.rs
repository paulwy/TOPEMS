use sqlx::PgPool;
use topems_shared::auth::Claims;
use topems_shared::permission::{
    check_module_permission, ModulePermission as SharedModulePermission,
};
use topems_shared::response::ApiResponse;

#[derive(Debug, Clone, PartialEq)]
#[allow(dead_code)]
pub enum MailPermission {
    EmailRead,
    EmailWrite,
    TemplateRead,
    TemplateWrite,
    AttachmentRead,
    AttachmentWrite,
    FolderRead,
    FolderWrite,
    SignatureRead,
    SignatureWrite,
    All,
}

impl std::fmt::Display for MailPermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            MailPermission::EmailRead => write!(f, "email_read"),
            MailPermission::EmailWrite => write!(f, "email_write"),
            MailPermission::TemplateRead => write!(f, "template_read"),
            MailPermission::TemplateWrite => write!(f, "template_write"),
            MailPermission::AttachmentRead => write!(f, "attachment_read"),
            MailPermission::AttachmentWrite => write!(f, "attachment_write"),
            MailPermission::FolderRead => write!(f, "folder_read"),
            MailPermission::FolderWrite => write!(f, "folder_write"),
            MailPermission::SignatureRead => write!(f, "signature_read"),
            MailPermission::SignatureWrite => write!(f, "signature_write"),
            MailPermission::All => write!(f, "all"),
        }
    }
}

impl SharedModulePermission for MailPermission {
    fn module_name() -> &'static str {
        "mail"
    }

    fn all_permission() -> Self {
        MailPermission::All
    }
}

pub async fn check_permission<T>(
    db: &PgPool,
    claims: &Claims,
    permission: &MailPermission,
) -> Result<(), axum::Json<ApiResponse<T>>> {
    check_module_permission(db, claims, permission).await
}
