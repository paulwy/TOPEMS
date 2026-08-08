//! Settings module - External integration configuration (P36-5)
//!
//! Provides:
//! - SMTP config CRUD (persisted to `core_tenant_settings`)
//! - API Key vault CRUD (persisted to `core_tenant_settings`)
//!
//! Sensitive fields (SMTP password, API key secret) are encrypted at rest with
//! AES-256-GCM via `FieldEncryptionService` from `topems_shared::security` when
//! a field-encryption key is provisioned. Encryption/decryption is transparent
//! to callers: handlers always see plain text, and responses keep returning the
//! masked form. When no key is configured the module falls back to plain-text
//! storage for backwards compatibility. Provision a key via
//! `TOPEMS_FIELD_ENCRYPTION_KEY` (preferred), `SETTINGS_ENCRYPTION_KEY`, or
//! `ENCRYPTION_KEY`.

pub mod api_keys;
pub mod smtp;

use crate::AppState;
use topems_shared_auth::auth::Claims;
use uuid::Uuid;

/// Resolve the caller's tenant UUID, falling back to the nil UUID when the
/// claim is missing (e.g. a superuser without an assigned tenant).
pub(crate) fn tenant_uuid(claims: &Claims) -> Uuid {
    Uuid::parse_str(
        claims
            .tenant_id
            .as_deref()
            .unwrap_or("00000000-0000-0000-0000-000000000000"),
    )
    .unwrap_or_else(|_| Uuid::nil())
}

/// Encrypt a sensitive value for at-rest storage.
///
/// Returns the input unchanged when:
/// - the value is empty, or
/// - no encryption service is configured (plain-text fallback), or
/// - encryption fails (logged at `warn` and falls back to plain text to avoid
///   breaking the write path).
///
/// Encrypted values are serialized as the JSON form of `EncryptedField` and
/// therefore start with `{`, which [`decrypt_secret`] uses to detect them.
pub(crate) fn encrypt_secret(state: &AppState, value: &str) -> String {
    if value.is_empty() {
        return value.to_string();
    }
    // Already encrypted (e.g. preserved from a previous row) — keep as-is.
    if value.starts_with('{') {
        return value.to_string();
    }
    if let Some(svc) = &state.encryption {
        match svc.encrypt_to_string(value) {
            Ok(s) => return s,
            Err(e) => tracing::warn!("settings 字段加密失败，回退到明文存储: {}", e),
        }
    }
    value.to_string()
}

/// Decrypt a sensitive value previously stored at rest.
///
/// Returns the input unchanged when it does not look like an encrypted
/// `EncryptedField` JSON blob (i.e. does not start with `{`), which preserves
/// backwards compatibility with existing plain-text rows. When an encryption
/// service is configured but decryption fails, the raw stored value is
/// returned and a warning is logged so reads are not blocked.
pub(crate) fn decrypt_secret(state: &AppState, value: &str) -> String {
    if value.is_empty() || !value.starts_with('{') {
        return value.to_string();
    }
    if let Some(svc) = &state.encryption {
        match svc.decrypt_string(value) {
            Ok(s) => return s,
            Err(e) => tracing::warn!("settings 字段解密失败，返回原始值: {}", e),
        }
    }
    value.to_string()
}
