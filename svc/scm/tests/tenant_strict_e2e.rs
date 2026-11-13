//! 租户上下文严格化的 handler 级验证：
//! - 缺少 tenant_id 的 claims → 400「缺少租户上下文」
//! - 正常 claims → 查询只返回该租户的数据（不再有 nil=全量 回退）

use axum::extract::{Path, State};
use axum::Extension;
use sqlx::PgPool;
use std::sync::Arc;
use tokio::sync::Mutex;
use topems_scm::modules::settings::get_settings;
use topems_scm::modules::ApiState;
use topems_shared_auth::auth::{AuthState, Claims};
use topems_shared_core::l2_cache::{AsyncL2Cache, L2CacheConfig};
use uuid::Uuid;

fn api_state(pool: PgPool) -> ApiState {
    ApiState {
        db: pool,
        auth_state: AuthState::new(
            "topems-test-jwt-secret-key-0123456789abcdef-0123456789".to_string(),
            "topems-test-refresh-secret-0123456789abcdef-0123456789".to_string(),
            24,
        ),
        cache: None,
        event_publisher: None,
        supplier_cache: Arc::new(AsyncL2Cache::new_l1_only(L2CacheConfig::default())),
        purchase_cache: Arc::new(AsyncL2Cache::new_l1_only(L2CacheConfig::default())),
        dict_cache: Arc::new(AsyncL2Cache::new_l1_only(L2CacheConfig::default())),
    }
}

fn user_claims(tenant_id: Option<Uuid>) -> Claims {
    Claims {
        sub: Uuid::new_v4().to_string(),
        username: "tester".to_string(),
        role: "user".to_string(),
        roles: vec!["user".to_string()],
        permissions: vec!["scm:read".to_string()],
        is_superuser: false,
        exp: 0,
        iat: 0,
        email: None,
        department: None,
        tenant_id: tenant_id.map(|t| t.to_string()),
        department_id: None,
        position_id: None,
        position_code: None,
        must_change_password: false,
    }
}

async fn setup_schema(pool: &PgPool) {
    sqlx::query("CREATE SCHEMA IF NOT EXISTS scm")
        .execute(pool)
        .await
        .unwrap();
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS scm.module_settings (
            category TEXT NOT NULL,
            key TEXT NOT NULL,
            value TEXT NOT NULL,
            created_at TIMESTAMP,
            updated_at TIMESTAMP,
            tenant_id UUID NOT NULL,
            PRIMARY KEY (tenant_id, category, key)
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
}

async fn insert_setting(pool: &PgPool, tenant: Uuid, key: &str, value: &str) {
    sqlx::query(
        r#"INSERT INTO scm.module_settings (category, key, value, created_at, updated_at, tenant_id)
           VALUES ('general', $1, $2, NOW(), NOW(), $3)"#,
    )
    .bind(key)
    .bind(value)
    .bind(tenant)
    .execute(pool)
    .await
    .unwrap();
}

async fn call_get_settings(
    pool: PgPool,
    claims: Claims,
) -> topems_shared_core::response::ApiResponse<serde_json::Value> {
    let txn = pool.begin().await.unwrap();
    let txn_arc = Arc::new(Mutex::new(Some(txn)));
    let state = api_state(pool);
    get_settings(
        State(state),
        Extension(claims),
        Path("general".to_string()),
        Extension(txn_arc),
    )
    .await
}

#[sqlx::test(migrations = false)]
async fn get_settings_returns_only_current_tenant(pool: PgPool) {
    setup_schema(&pool).await;
    let tenant_a = Uuid::new_v4();
    let tenant_b = Uuid::new_v4();
    insert_setting(&pool, tenant_a, "self_key", "self_value").await;
    insert_setting(&pool, tenant_b, "other_key", "other_value").await;

    let resp = call_get_settings(pool, user_claims(Some(tenant_a))).await;
    let data = resp.data.expect("正常 claims 应返回数据");
    let settings = data["settings"].as_object().expect("settings 应为对象");

    assert_eq!(settings.len(), 1, "只应返回当前租户的设置项: {settings:?}");
    assert_eq!(
        settings.get("self_key").and_then(|v| v.as_str()),
        Some("self_value")
    );
    assert!(!settings.contains_key("other_key"), "不得返回其他租户数据");
}

#[sqlx::test(migrations = false)]
async fn get_settings_rejects_missing_tenant(pool: PgPool) {
    setup_schema(&pool).await;

    let resp = call_get_settings(pool, user_claims(None)).await;

    assert_eq!(resp.code, 400);
    assert_eq!(resp.message, "缺少租户上下文");
    assert!(resp.data.is_none());
}
