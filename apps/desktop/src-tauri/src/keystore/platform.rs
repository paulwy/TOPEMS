//! PlatformKeyStore - 平台原生 Keychain 存取（keyring crate 统三平台）
//! macOS Keychain / Windows Credential Manager / Linux Secret Service

use crate::error::DesktopError;
use keyring::Entry;

use super::store::KeyStore;

const SERVICE_NAME: &str = "com.topems.TOPEMS";

/// 平台原生 Keychain KeyStore
pub struct PlatformKeyStore {
    service: String,
}

impl PlatformKeyStore {
    pub fn new() -> Self {
        Self { service: SERVICE_NAME.to_string() }
    }

    pub fn with_service(service: &str) -> Self {
        Self { service: service.to_string() }
    }
}

impl Default for PlatformKeyStore {
    fn default() -> Self {
        Self::new()
    }
}

impl KeyStore for PlatformKeyStore {
    fn set(&self, key: &str, value: &str) -> Result<(), DesktopError> {
        let entry = Entry::new(&self.service, key)
            .map_err(|e| DesktopError(format!("PlatformKeyStore entry new failed: {}", e)))?;
        entry
            .set_password(value)
            .map_err(|e| DesktopError(format!("PlatformKeyStore set failed: {}", e)))
    }

    fn get(&self, key: &str) -> Result<Option<String>, DesktopError> {
        let entry = Entry::new(&self.service, key)
            .map_err(|e| DesktopError(format!("PlatformKeyStore entry new failed: {}", e)))?;
        match entry.get_password() {
            Ok(v) => Ok(Some(v)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => Err(DesktopError(format!("PlatformKeyStore get failed: {}", e))),
        }
    }

    fn delete(&self, key: &str) -> Result<(), DesktopError> {
        let entry = Entry::new(&self.service, key)
            .map_err(|e| DesktopError(format!("PlatformKeyStore entry new failed: {}", e)))?;
        match entry.delete_password() {
            Ok(()) => Ok(()),
            Err(keyring::Error::NoEntry) => Ok(()),
            Err(e) => Err(DesktopError(format!("PlatformKeyStore delete failed: {}", e))),
        }
    }
}
