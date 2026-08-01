//! Settings module - External integration configuration (P36-5)
//!
//! Provides:
//! - SMTP config CRUD (persisted to `core_tenant_settings`)
//! - API Key vault CRUD (persisted to `core_tenant_settings`)
//!
//! NOTE: Secrets (SMTP password, API key values) are currently stored as
//! plain text in `core_tenant_settings.setting_value`. This is acceptable for
//! the feasible subset. TODO: encrypt at rest using `FieldEncryptionService`
//! from `topems_shared::security` once a field-encryption key is provisioned
//! via `TOPEMS_FIELD_ENCRYPTION_KEY`.

pub mod api_keys;
pub mod smtp;

use topems_shared::auth::Claims;
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
