// IM 服务权限定义
use topems_shared::permission::ModulePermission;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ImPermission {
    // 消息操作
    MessageRead,
    MessageWrite,
    MessageDelete,
    // 聊天室操作
    ChatRoomRead,
    ChatRoomWrite,
    ChatRoomDelete,
    ChatRoomManage,
    // 联系人操作
    ContactRead,
    ContactWrite,
    ContactDelete,
    // 文件操作
    FileUpload,
    FileDownload,
    FileDelete,
    // 管理权限
    Manage,
}

impl std::fmt::Display for ImPermission {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ImPermission::MessageRead => write!(f, "im.message_read"),
            ImPermission::MessageWrite => write!(f, "im.message_write"),
            ImPermission::MessageDelete => write!(f, "im.message_delete"),
            ImPermission::ChatRoomRead => write!(f, "im.chat_room_read"),
            ImPermission::ChatRoomWrite => write!(f, "im.chat_room_write"),
            ImPermission::ChatRoomDelete => write!(f, "im.chat_room_delete"),
            ImPermission::ChatRoomManage => write!(f, "im.chat_room_manage"),
            ImPermission::ContactRead => write!(f, "im.contact_read"),
            ImPermission::ContactWrite => write!(f, "im.contact_write"),
            ImPermission::ContactDelete => write!(f, "im.contact_delete"),
            ImPermission::FileUpload => write!(f, "im.file_upload"),
            ImPermission::FileDownload => write!(f, "im.file_download"),
            ImPermission::FileDelete => write!(f, "im.file_delete"),
            ImPermission::Manage => write!(f, "im.manage"),
        }
    }
}

impl ModulePermission for ImPermission {
    fn module_name() -> &'static str {
        "im"
    }

    fn all_permission() -> Self {
        ImPermission::Manage
    }
}

/// 检查 IM 权限
pub fn check_im_permission(claims: &topems_shared::auth::Claims, permission: &ImPermission) -> Result<(), String> {
    // 超级用户拥有所有权限
    if claims.is_superuser {
        return Ok(());
    }

    // 检查模块管理权限
    let module_manage = format!("{}.manage", ImPermission::module_name());
    if claims.has_permission(&module_manage) {
        return Ok(());
    }

    // 检查具体权限
    let perm_str = permission.to_string();
    if claims.has_permission(&perm_str) {
        Ok(())
    } else {
        Err(format!("权限不足：需要 {} 权限", perm_str))
    }
}
