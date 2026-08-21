//! 迁移逻辑: auth_token.enc -> Stronghold + JSON 导入

use std::collections::HashMap;
use std::path::Path;

use serde::Serialize;

use crate::secure_store;
use super::store::KeyStore;
use super::stronghold::StrongholdKeyStore;

/// 迁移结果
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum MigrationResult {
    /// 成功迁移并清理旧文件
    Migrated,
    /// 无遗留数据
    NoLegacy,
    /// 迁移失败（保留旧文件）
    Failed(String),
}

/// 迁移 auth_token.enc -> Stronghold(key="auth_token")
///
/// 流程:
/// 1. secure_store::load_token_encrypted() -> None => NoLegacy
/// 2. Some(token) => Stronghold.set + save + clear_token_encrypted => Migrated
/// 3. Err => Failed(保留旧文件)
pub fn migrate_auth_token(stronghold: &StrongholdKeyStore) -> MigrationResult {
    match secure_store::load_token_encrypted() {
        Ok(Some(token)) => {
            if let Err(e) = stronghold.set("auth_token", &token) {
                return MigrationResult::Failed(format!("Stronghold set failed: {}", e));
            }
            if let Err(e) = stronghold.save() {
                return MigrationResult::Failed(format!("Stronghold save failed: {}", e));
            }
            if let Err(e) = secure_store::clear_token_encrypted() {
                return MigrationResult::Failed(format!("clear_token_encrypted failed: {}", e));
            }
            MigrationResult::Migrated
        }
        Ok(None) => MigrationResult::NoLegacy,
        Err(e) => MigrationResult::Failed(format!("load_token_encrypted failed: {}", e)),
    }
}

/// JSON 导入工具: 读扁平 KV JSON -> 逐条 Stronghold.set -> save
///
/// 输入格式: { "key1": "value1", "key2": "value2" }
/// 事务性: 任一条 set 失败则不 save（内存变更未持久化）
pub fn import_json(stronghold: &StrongholdKeyStore, path: &Path) -> Result<usize, String> {
    let content = std::fs::read_to_string(path)
        .map_err(|e| format!("read json failed: {}", e))?;
    let map: HashMap<String, String> = serde_json::from_str(&content)
        .map_err(|e| format!("parse json failed: {}", e))?;
    let count = map.len();
    for (k, v) in &map {
        stronghold
            .set(k, v)
            .map_err(|e| format!("set key {} failed: {}", k, e))?;
    }
    stronghold.save()?;
    Ok(count)
}
