//! Tauri KeyStore 模块（V257 拆分为多模块）
//!
//! - store: KeyStore 统一接口
//! - stronghold: StrongholdKeyStore 主实现 + FileKeyStore fallback stub
//! - platform: PlatformKeyStore 平台 Keychain（keyring 统三平台）
//! - master_key: 主密码 get_or_create + ensure_unlocked（首启自动）
//! - migration: auth_token.enc 迁移 + JSON 导入
//! - commands: Tauri IPC 命令层

pub mod commands;
pub mod master_key;
pub mod migration;
pub mod platform;
pub mod stronghold;
pub mod store;

pub use stronghold::{FileKeyStore, StrongholdKeyStore};
pub use store::KeyStore;
