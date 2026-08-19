//! Tauri KeyStore 模块（V251 接入 tauri-plugin-stronghold）
//!
//! 目标：替代 secure_store.rs 的文件加密方案
//! - V249: 仅骨架，trait + FileKeyStore 占位
//! - V251: 接入 tauri-plugin-stronghold，StrongholdKeyStore 作为主实现
//!         使用 stronghold::Stronghold + client.store() 真实读写
//!         FileKeyStore 保留为 fallback / 测试用

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use tauri_plugin_stronghold::stronghold::Stronghold;

const DEFAULT_CLIENT: &[u8] = b"topems-keystore-client";
const DEFAULT_VAULT: &[u8] = b"topems-keystore-vault";

/// KeyStore trait，定义统一的密钥存取接口
pub trait KeyStore: Send + Sync {
    /// 保存密钥
    fn set(&self, key: &str, value: &str) -> Result<(), String>;
    /// 读取密钥
    fn get(&self, key: &str) -> Result<Option<String>, String>;
    /// 删除密钥
    fn delete(&self, key: &str) -> Result<(), String>;
}

/// 文件系统 KeyStore（fallback / 测试用）
pub struct FileKeyStore {
    store: HashMap<String, String>,
}

impl FileKeyStore {
    pub fn new() -> Self {
        Self { store: HashMap::new() }
    }
}

impl Default for FileKeyStore {
    fn default() -> Self {
        Self::new()
    }
}

impl KeyStore for FileKeyStore {
    fn set(&self, _key: &str, _value: &str) -> Result<(), String> {
        Err("FileKeyStore: Not implemented yet (fallback only)".to_string())
    }
    fn get(&self, _key: &str) -> Result<Option<String>, String> {
        Ok(None)
    }
    fn delete(&self, _key: &str) -> Result<(), String> {
        Ok(())
    }
}

/// Stronghold 加密存储实现（V251 实际接入 tauri-plugin-stronghold）
///
/// 使用 tauri_plugin_stronghold::stronghold::Stronghold 底层 API，
/// 通过 client.store() 进行 KV 记录的增删查。
/// 快照文件首次写入时需要显式调用 save() 持久化到磁盘。
pub struct StrongholdKeyStore {
    path: PathBuf,
    password: Vec<u8>,
    stronghold: Option<Stronghold>,
}

impl StrongholdKeyStore {
    /// 创建 StrongholdKeyStore 实例（不立即初始化 Stronghold）
    ///
    /// # Arguments
    /// * `path` - Stronghold 快照文件路径
    /// * `password` - 用于加密快照的密码（会被派生为 keyprovider）
    ///
    /// 使用前需调用 init() 初始化 Stronghold 实例。
    pub fn new(path: &Path, password: Vec<u8>) -> Self {
        Self {
            path: path.to_path_buf(),
            password,
            stronghold: None,
        }
    }

    /// 初始化 Stronghold：加载或创建快照 + 确保 client 存在
    pub fn init(&mut self) -> Result<(), String> {
        if self.stronghold.is_some() {
            return Ok(());
        }
        let stronghold = Stronghold::new(&self.path, self.password.clone())
            .map_err(|e| format!("Stronghold init failed: {}", e))?;
        if stronghold.load_client(DEFAULT_CLIENT).is_err() {
            stronghold
                .create_client(DEFAULT_CLIENT)
                .map_err(|e| format!("Stronghold create_client failed: {}", e))?;
        }
        self.stronghold = Some(stronghold);
        Ok(())
    }

    /// 获取存储路径
    pub fn path(&self) -> &Path {
        &self.path
    }

    /// 检查 Stronghold 是否已初始化
    pub fn is_available(&self) -> bool {
        self.stronghold.is_some()
    }

    /// 将内存中变更持久化到快照文件
    pub fn save(&self) -> Result<(), String> {
        match &self.stronghold {
            Some(s) => s.save().map_err(|e| format!("Stronghold save failed: {}", e)),
            None => Err("Stronghold not initialized".to_string()),
        }
    }
}

impl KeyStore for StrongholdKeyStore {
    fn set(&self, key: &str, value: &str) -> Result<(), String> {
        let stronghold = self
            .stronghold
            .as_ref()
            .ok_or_else(|| "Stronghold not initialized".to_string())?;
        let client = stronghold
            .get_client(DEFAULT_CLIENT)
            .map_err(|e| format!("Stronghold get_client failed: {}", e))?;
        client
            .store()
            .insert(key.as_bytes().to_vec(), value.as_bytes().to_vec(), None)
            .map_err(|e| format!("Stronghold store insert failed: {}", e))?;
        Ok(())
    }

    fn get(&self, key: &str) -> Result<Option<String>, String> {
        let stronghold = self
            .stronghold
            .as_ref()
            .ok_or_else(|| "Stronghold not initialized".to_string())?;
        let client = stronghold
            .get_client(DEFAULT_CLIENT)
            .map_err(|e| format!("Stronghold get_client failed: {}", e))?;
        let bytes = client
            .store()
            .get(key.as_ref())
            .map_err(|e| format!("Stronghold store get failed: {}", e))?;
        match bytes {
            Some(b) => String::from_utf8(b)
                .map(Some)
                .map_err(|e| format!("Stronghold value is not valid UTF-8: {}", e)),
            None => Ok(None),
        }
    }

    fn delete(&self, key: &str) -> Result<(), String> {
        let stronghold = self
            .stronghold
            .as_ref()
            .ok_or_else(|| "Stronghold not initialized".to_string())?;
        let client = stronghold
            .get_client(DEFAULT_CLIENT)
            .map_err(|e| format!("Stronghold get_client failed: {}", e))?;
        client
            .store()
            .delete(key.as_ref())
            .map_err(|e| format!("Stronghold store delete failed: {}", e))?;
        Ok(())
    }
}

// 让 DEFAULT_VAULT 保留以避免 warnings（后续 vault API 扩展会用到）
#[allow(dead_code)]
fn _default_vault() -> &'static [u8] {
    DEFAULT_VAULT
}
