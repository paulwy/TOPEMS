//! Tauri IPC 命令层（原有 3 个 + 新增 4 个）

use std::path::Path;

use serde::Serialize;
use tauri::Manager;

use super::master_key::{ensure_unlocked, UnlockError};
use super::migration::{import_json, migrate_auth_token, MigrationResult};
use super::store::KeyStore;
use super::stronghold::StrongholdKeyStore;

/// 构造已解锁的 StrongholdKeyStore（用主密码初始化）
fn stronghold_for(app: &tauri::AppHandle) -> Result<StrongholdKeyStore, String> {
    let master = ensure_unlocked(app).map_err(|e| match e {
        UnlockError::KeychainUnavailable(m) => format!("Keychain unavailable: {}", m),
        UnlockError::StrongholdInitFailed(m) => format!("Stronghold init failed: {}", m),
    })?;
    let path = app
        .path()
        .app_config_dir()
        .map_err(|e| e.to_string())?
        .join("keystore.stronghold");
    let mut sh = StrongholdKeyStore::new(&path, master);
    sh.init()?;
    Ok(sh)
}

#[tauri::command]
pub async fn keystore_set(
    app: tauri::AppHandle,
    key: String,
    value: String,
    _password: Option<String>,
) -> Result<(), String> {
    let sh = stronghold_for(&app)?;
    sh.set(&key, &value)?;
    sh.save()
}

#[tauri::command]
pub async fn keystore_get(
    app: tauri::AppHandle,
    key: String,
    _password: Option<String>,
) -> Result<Option<String>, String> {
    let sh = stronghold_for(&app)?;
    sh.get(&key)
}

#[tauri::command]
pub async fn keystore_delete(
    app: tauri::AppHandle,
    key: String,
    _password: Option<String>,
) -> Result<(), String> {
    let sh = stronghold_for(&app)?;
    sh.delete(&key)?;
    sh.save()
}

#[derive(Serialize)]
pub struct UnlockStatus {
    pub unlocked: bool,
    pub first_run: bool,
    pub keychain_available: bool,
}

#[tauri::command]
pub async fn keystore_unlocked_status(app: tauri::AppHandle) -> Result<UnlockStatus, String> {
    let path = app
        .path()
        .app_config_dir()
        .map_err(|e| e.to_string())?
        .join("keystore.stronghold");
    let first_run = !path.exists();
    match ensure_unlocked(&app) {
        Ok(_) => Ok(UnlockStatus {
            unlocked: true,
            first_run,
            keychain_available: true,
        }),
        Err(UnlockError::KeychainUnavailable(_)) => Ok(UnlockStatus {
            unlocked: false,
            first_run,
            keychain_available: false,
        }),
        Err(UnlockError::StrongholdInitFailed(e)) => Err(e),
    }
}

#[tauri::command]
pub async fn keystore_unlock_with_password(
    app: tauri::AppHandle,
    password: String,
) -> Result<(), String> {
    let path = app
        .path()
        .app_config_dir()
        .map_err(|e| e.to_string())?
        .join("keystore.stronghold");
    let mut sh = StrongholdKeyStore::new(&path, password.into_bytes());
    sh.init()
}

#[derive(Serialize)]
pub struct MigrateStatus {
    pub result: String,
    pub detail: Option<String>,
}

#[tauri::command]
pub async fn keystore_migrate_status(app: tauri::AppHandle) -> Result<MigrateStatus, String> {
    let sh = stronghold_for(&app)?;
    let r = migrate_auth_token(&sh);
    Ok(match r {
        MigrationResult::Migrated => MigrateStatus {
            result: "migrated".into(),
            detail: None,
        },
        MigrationResult::NoLegacy => MigrateStatus {
            result: "no_legacy".into(),
            detail: None,
        },
        MigrationResult::Failed(d) => MigrateStatus {
            result: "failed".into(),
            detail: Some(d),
        },
    })
}

#[derive(Serialize)]
pub struct ImportResult {
    pub imported: usize,
}

#[tauri::command]
pub async fn keystore_import_json(
    app: tauri::AppHandle,
    path: String,
) -> Result<ImportResult, String> {
    let sh = stronghold_for(&app)?;
    let count = import_json(&sh, Path::new(&path))?;
    Ok(ImportResult { imported: count })
}
