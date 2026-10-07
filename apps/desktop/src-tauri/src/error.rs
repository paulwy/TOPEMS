use serde::{Serialize, Serializer};

/// TOPEMS Desktop 本地错误类型。
///
/// Tauri `#[tauri::command]` 要求错误类型实现 `Serialize` 才能传递给前端；
/// 且 desktop crate 不依赖 topems 共享库（`TopemsError` 无 Serialize derive、无法直接引用）。
/// 本类型以「带上下文英文文案」承载错误（继承迁移前裸字符串错误语义），
/// 序列化输出为纯字符串，前端 invoke 的 catch 接收形态与迁移前完全一致。
///
/// 语义说明：desktop 错误均为本地操作失败（IPC/keystore/缓存/加密），无 HTTP 出口语义，
/// 统一为单个包装类型，不细分 ValidationFailed/OperationNotAllowed 等变体。
#[derive(Debug)]
pub struct DesktopError(pub String);

impl DesktopError {
    /// 构造带上下文文案的错误。
    pub fn new(message: impl Into<String>) -> Self {
        DesktopError(message.into())
    }
}

impl std::fmt::Display for DesktopError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.0)
    }
}

impl std::error::Error for DesktopError {}

impl From<String> for DesktopError {
    fn from(s: String) -> Self {
        DesktopError(s)
    }
}

impl From<&str> for DesktopError {
    fn from(s: &str) -> Self {
        DesktopError(s.to_string())
    }
}

/// 兼容 `ApiResponse::err(e)`（`impl Into<String>`）等消费点。
impl From<DesktopError> for String {
    fn from(e: DesktopError) -> Self {
        e.0
    }
}

/// 保持 Tauri command 错误序列化形态为字符串（前端零影响）。
impl Serialize for DesktopError {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.0)
    }
}
