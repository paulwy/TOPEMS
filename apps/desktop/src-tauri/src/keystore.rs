//! Tauri KeyStore 模块骨架（V249 起手）
//!
//! 目标：替代 secure_store.rs 的文件加密方案，使用 OS 原生 Keychain
//! - macOS: Keychain Services
//! - Windows: Credential Manager
//! - Linux: Secret Service (libsecret)
//!
//! V249: 仅骨架，不实现具体逻辑
//! V250+: 接入 tauri-plugin-stronghold 或平台原生 API

use std::collections::HashMap;

/// KeyStore trait，定义统一的密钥存取接口
pub trait KeyStore: Send + Sync {
    /// 保存密钥
    fn set(&self, key: &str, value: &str) -> Result<(), String>;
    /// 读取密钥
    fn get(&self, key: &str) -> Result<Option<String>, String>;
    /// 删除密钥
    fn delete(&self, key: &str) -> Result<(), String>;
}

/// 文件系统 KeyStore（占位实现，后续替换为 OS 原生）
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
        Err("Not implemented yet (V249 skeleton)".to_string())
    }
    fn get(&self, _key: &str) -> Result<Option<String>, String> {
        Ok(None)
    }
    fn delete(&self, _key: &str) -> Result<(), String> {
        Ok(())
    }
}
