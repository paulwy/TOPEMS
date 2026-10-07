//! P1 补测（2026-10-08）：mes capacity list handler 集成测试（缓存 miss → DB 路径）。

#[path = "common/app_state.rs"]
mod app_state;

use axum::extract::{Query, State};
use axum::Extension;
use serde_json::{json, Value};
use topems_mes::modules::capacity::{list_capacities, ListCapacitiesQuery};
use app_state::{super_claims, test_app_state};

async fn setup_schema(pool: &sqlx::PgPool) {
    sqlx::query("CREATE SCHEMA IF NOT EXISTS mes").execute(pool).await.unwrap();
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS capacities (
            id UUID PRIMARY KEY,
            work_center_id UUID NOT NULL,
            work_center_name VARCHAR(256),
            capacity_date DATE,
            available_hours NUMERIC(10,2),
            used_hours NUMERIC(10,2) DEFAULT 0,
            utilization_rate NUMERIC(5,2),
            status VARCHAR(32),
            tenant_id UUID,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMPTZ
        )"#,
    )
    .execute(pool).await.unwrap();
}

async fn body_of(pool: sqlx::PgPool) -> Value {
    let state = test_app_state(pool);
    let claims = super_claims();
    let q: ListCapacitiesQuery = serde_json::from_value(json!({})).unwrap();
    let resp = list_capacities(State(state), Extension(claims), Query(q)).await;
    serde_json::to_value(resp.0.data.unwrap_or_else(|| panic!("handler error: {:?}", resp.0.message))).unwrap()
}

#[sqlx::test(migrations = false)]
async fn list_empty_returns_zero(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    // direct_query_debug：复制 handler SELECT 验证 decode
    let r = sqlx::query_as::<_, topems_mes::modules::capacity::Capacity>(
        r#"SELECT id, work_center_id, work_center_name, capacity_date,
               available_hours::float8, used_hours::float8, utilization_rate::float8,
               status, tenant_id, created_at, updated_at
        FROM capacities WHERE tenant_id = $1 LIMIT 1"#,
    )
    .bind(uuid::Uuid::nil())
    .fetch_all(&pool)
    .await;
    if let Err(e) = &r {
        panic!("direct query error: {e:?}");
    }
    assert_eq!(body_of(pool).await["total"], 0);
}

#[sqlx::test(migrations = false)]
async fn list_returns_inserted_row(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    sqlx::query(
        "INSERT INTO capacities (id, work_center_id, work_center_name, status, tenant_id) VALUES ($1, $2, $3, 'active', '00000000-0000-0000-0000-000000000000')",
    )
    .bind(uuid::Uuid::new_v4())
    .bind(uuid::Uuid::new_v4())
    .bind("WC-01")
    .execute(&pool).await.unwrap();

    let body = body_of(pool).await;
    assert_eq!(body["total"], 1);
    assert_eq!(body["capacities"][0]["work_center_name"], "WC-01");
}
