//! KeyStore trait - 统一密钥存取接口（从原 keystore.rs 抽出，API 不变）

use crate::error::DesktopError;

/// KeyStore trait，定义统一的密钥存取接口
pub trait KeyStore: Send + Sync {
    /// 保存密钥
    fn set(&self, key: &str, value: &str) -> Result<(), DesktopError>;
    /// 读取密钥
    fn get(&self, key: &str) -> Result<Option<String>, DesktopError>;
    /// 删除密钥
    fn delete(&self, key: &str) -> Result<(), DesktopError>;
}
