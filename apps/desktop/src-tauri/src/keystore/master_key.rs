//! 主密码 helper: get_or_create + ensure_unlocked
//! 首启随机生成 32B 主密码写入 PlatformKeyStore，启动时读出解锁 Stronghold

use base64::{engine::general_purpose::STANDARD, Engine};
use rand::RngCore;

use super::platform::PlatformKeyStore;
use super::store::KeyStore;

/// Keychain 中存储主密码的 entry key
pub const MASTER_KEY_ENTRY: &str = "stronghold_master_key";

/// 解锁失败原因
#[derive(Debug)]
pub enum UnlockError {
    /// 平台 Keychain 不可用（如 Linux 无 secret-service 守护）
    KeychainUnavailable(String),
    /// Stronghold 初始化失败
    StrongholdInitFailed(String),
}

/// 获取或创建主密码
/// - 命中 PlatformKeyStore: 返回主密码（base64 编码后的 32B）
/// - 未命中: 随机生成 32B + base64 编码 + 写入 PlatformKeyStore
pub fn get_or_create_master_key(platform: &PlatformKeyStore) -> Result<Vec<u8>, String> {
    match platform.get(MASTER_KEY_ENTRY)? {
        Some(s) => Ok(s.into_bytes()),
        None => {
            let mut key = [0u8; 32];
            rand::rngs::OsRng.fill_bytes(&mut key);
            let encoded = STANDARD.encode(key);
            platform.set(MASTER_KEY_ENTRY, &encoded)?;
            Ok(encoded.into_bytes())
        }
    }
}

/// 确保主密码可用（首启自动生成，常规启动读出）
///
/// 返回主密码字节，供调用方初始化 StrongholdKeyStore。
/// Keychain 不可用时返回 KeychainUnavailable，前端走用户输入回退。
pub fn ensure_unlocked(app: &tauri::AppHandle) -> Result<Vec<u8>, UnlockError> {
    let platform = PlatformKeyStore::new();
    let master = get_or_create_master_key(&platform)
        .map_err(UnlockError::KeychainUnavailable)?;
    // 校验主密码非空（防御性：空密码等于不加密）
    if master.is_empty() {
        return Err(UnlockError::KeychainUnavailable(
            "master key is empty".to_string(),
        ));
    }
    let _ = app; // AppHandle 保留参数以备后续扩展（如日志/事件）
    Ok(master)
}
