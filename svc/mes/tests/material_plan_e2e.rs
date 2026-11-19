#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! P1 补测（2026-10-08）：mes material_plan list handler 集成测试。
//!
//! K1（2026-11-16）：handler 走 `Db::scope_with(txn)`，无租户上下文按设计报错，
//! 因此用例必须像中间件一样先注入 task-local 租户上下文（`scope_request_tenant`），
//! 并插入第二个租户的数据证明列表只返回本租户行。
#![cfg(feature = "db-tests")]

#[path = "common/app_state.rs"]
mod app_state;

use app_state::{super_claims, test_app_state};
use axum::extract::{Extension, Query, State};
use serde_json::{json, Value};
use topems_mes::modules::material_plan::{list_material_plans, ListMaterialPlansQuery};
use topems_shared_auth::middleware::tenant::{scope_request_tenant, RlsRequestTenant};
use uuid::Uuid;

/// 本用例的租户 A；租户 B 用于验证跨租户行不可见。
fn tenant_a() -> Uuid {
    Uuid::parse_str("11111111-1111-1111-1111-111111111111").unwrap()
}

fn tenant_b() -> Uuid {
    Uuid::parse_str("22222222-2222-2222-2222-222222222222").unwrap()
}

async fn setup_schema(pool: &sqlx::PgPool) {
    sqlx::query("CREATE SCHEMA IF NOT EXISTS mes")
        .execute(pool)
        .await
        .unwrap();
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS mes.material_plans (
            id UUID PRIMARY KEY,
            plan_no TEXT NOT NULL,
            plan_id UUID,
            material_id UUID,
            material_code TEXT,
            material_name TEXT,
            required_quantity DOUBLE PRECISION NOT NULL DEFAULT 0,
            available_quantity DOUBLE PRECISION NOT NULL DEFAULT 0,
            shortfall_quantity DOUBLE PRECISION NOT NULL DEFAULT 0,
            required_date TIMESTAMPTZ,
            supply_type TEXT NOT NULL DEFAULT 'purchase',
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            tenant_id UUID
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
}

/// 以租户 `tenant` 的身份调用 handler：Claims 与 task-local RLS 上下文一致，
/// 与生产 `auth_middleware` → `Db::scope_with(txn)` 的取数路径相同。
async fn body_of(pool: sqlx::PgPool, tenant: Uuid, status: Option<&str>) -> Value {
    let txn_cell = app_state::request_txn_cell(&pool).await;
    let state = test_app_state(pool);
    let mut claims = super_claims();
    claims.tenant_id = Some(tenant.to_string());
    let q: ListMaterialPlansQuery = serde_json::from_value(if let Some(s) = status {
        json!({ "status": s })
    } else {
        json!({})
    })
    .unwrap();
    let resp = scope_request_tenant(
        RlsRequestTenant {
            tenant,
            system: false,
        },
        async move {
            list_material_plans(
                State(state),
                Extension(txn_cell),
                Extension(claims),
                Query(q),
            )
            .await
        },
    )
    .await
    .expect("handler error");
    serde_json::to_value(
        resp.data
            .unwrap_or_else(|| panic!("handler error: {:?}", resp.message)),
    )
    .unwrap()
}

async fn insert_plan(pool: &sqlx::PgPool, tenant: Uuid, plan_no: &str, status: &str) {
    sqlx::query(
        "INSERT INTO mes.material_plans (id, plan_no, material_code, material_name, status, tenant_id) VALUES ($1, $2, $3, $4, $5, $6)",
    )
    .bind(uuid::Uuid::new_v4())
    .bind(plan_no)
    .bind(format!("MC-{plan_no}"))
    .bind(format!("物料-{plan_no}"))
    .bind(status)
    .bind(tenant)
    .execute(pool).await.unwrap();
}

topems_test_support::sqlx_dsn_guard!();
#[sqlx::test(migrations = false)]
async fn list_empty_returns_zero(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    // 另一租户有数据，但本租户列表必须仍为空
    insert_plan(&pool, tenant_b(), "MP-B-ONLY", "pending").await;

    assert_eq!(body_of(pool, tenant_a(), None).await["total"], 0);
}

#[sqlx::test(migrations = false)]
async fn list_returns_inserted_row(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    insert_plan(&pool, tenant_a(), "MP-001", "pending").await;
    insert_plan(&pool, tenant_b(), "MP-OTHER", "pending").await;

    let body = body_of(pool, tenant_a(), None).await;
    assert_eq!(body["total"], 1);
    assert_eq!(body["items"][0]["plan_no"], "MP-001");
}

#[sqlx::test(migrations = false)]
async fn list_filters_by_status(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    insert_plan(&pool, tenant_a(), "MP-A", "pending").await;
    insert_plan(&pool, tenant_a(), "MP-B", "released").await;
    // 另一租户的 released 行不得被本租户筛选命中
    insert_plan(&pool, tenant_b(), "MP-B-OTHER", "released").await;

    let body = body_of(pool, tenant_a(), Some("released")).await;
    assert_eq!(body["total"], 1);
    assert_eq!(body["items"][0]["plan_no"], "MP-B");
}
