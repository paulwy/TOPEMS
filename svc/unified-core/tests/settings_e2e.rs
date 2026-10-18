#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! P1 补测（2026-10-18）：unified-core settings 模块集成测试。
//! 覆盖 api_keys（list/create/delete）+ smtp（get/update）。

#[path = "common/app_state.rs"]
mod app_state;

use app_state::{super_claims, test_app_state};
use axum::extract::{Extension, State};
use axum::Json;
use topems_unified_core::modules::settings::api_keys::{
    create_api_key, delete_api_key, list_api_keys, ApiKeyEntry, CreateApiKeyRequest,
};
use topems_unified_core::modules::settings::smtp::{
    get_smtp_config, update_smtp_config, SmtpConfig,
};

async fn setup_schema(pool: &sqlx::PgPool) {
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS public.core_tenant_settings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID,
            setting_key VARCHAR(128) NOT NULL,
            setting_value TEXT,
            is_public BOOLEAN DEFAULT FALSE,
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMPTZ,
            UNIQUE(tenant_id, setting_key)
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
}

fn smtp_payload() -> SmtpConfig {
    SmtpConfig {
        enabled: true,
        host: "smtp.example.com".to_string(),
        port: 465,
        user: "noreply".to_string(),
        password: "secret-123".to_string(),
        tls: "ssl".to_string(),
        from_email: "noreply@example.com".to_string(),
        from_name: "TOPEMS".to_string(),
    }
}

#[sqlx::test(migrations = false)]
async fn list_api_keys_empty(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let resp = list_api_keys(State(test_app_state(pool)), Extension(super_claims())).await;
    let data = resp
        .0
        .data
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.0.message));
    assert!(data.is_empty());
}

#[sqlx::test(migrations = false)]
async fn create_api_key_persists(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let payload = CreateApiKeyRequest {
        name: "部署密钥".to_string(),
        key_type: "other".to_string(),
        secret: "sk-abcdef1234".to_string(),
    };
    let resp = create_api_key(
        State(test_app_state(pool.clone())),
        Extension(super_claims()),
        Json(payload),
    )
    .await;
    let data = resp
        .0
        .data
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.0.message));
    assert_eq!(data.name, "部署密钥");
    assert!(data.secret.contains("****"));

    let resp = list_api_keys(
        State(test_app_state(pool.clone())),
        Extension(super_claims()),
    )
    .await;
    let items = resp
        .0
        .data
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.0.message));
    assert_eq!(items.len(), 1);
    assert_eq!(items[0].name, "部署密钥");
}

#[sqlx::test(migrations = false)]
async fn delete_api_key_removes(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let payload = CreateApiKeyRequest {
        name: "临时密钥".to_string(),
        key_type: "other".to_string(),
        secret: "sk-xyz".to_string(),
    };
    let created = create_api_key(
        State(test_app_state(pool.clone())),
        Extension(super_claims()),
        Json(payload),
    )
    .await;
    let entry: ApiKeyEntry = created
        .0
        .data
        .unwrap_or_else(|| panic!("handler error: {:?}", created.0.message));

    let del = delete_api_key(
        State(test_app_state(pool.clone())),
        Extension(super_claims()),
        axum::extract::Path(entry.id),
    )
    .await;
    assert!(del.0.data.is_some());

    let resp = list_api_keys(State(test_app_state(pool)), Extension(super_claims())).await;
    let items = resp
        .0
        .data
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.0.message));
    assert!(items.is_empty());
}

#[sqlx::test(migrations = false)]
async fn get_smtp_returns_default_when_unset(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let resp = get_smtp_config(State(test_app_state(pool)), Extension(super_claims())).await;
    let data = resp
        .0
        .data
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.0.message));
    assert!(!data.enabled);
}

#[sqlx::test(migrations = false)]
async fn update_smtp_persists_and_reads_back(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let payload = smtp_payload();
    let upd = update_smtp_config(
        State(test_app_state(pool.clone())),
        Extension(super_claims()),
        Json(payload),
    )
    .await;
    assert!(upd.0.data.is_some(), "update failed: {:?}", upd.0.message);

    let resp = get_smtp_config(State(test_app_state(pool)), Extension(super_claims())).await;
    let data = resp
        .0
        .data
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.0.message));
    assert!(data.enabled);
    assert_eq!(data.host, "smtp.example.com");
    assert_eq!(data.port, 465);
}
