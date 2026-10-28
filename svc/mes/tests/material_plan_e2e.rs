#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! P1 补测（2026-10-08）：mes material_plan list handler 集成测试。

#[path = "common/app_state.rs"]
mod app_state;

use app_state::test_app_state;
use axum::extract::{Query, State};
use serde_json::{json, Value};
use topems_mes::modules::material_plan::{list_material_plans, ListMaterialPlansQuery};

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

async fn body_of(pool: sqlx::PgPool, status: Option<&str>) -> Value {
    let state = test_app_state(pool);
    let q: ListMaterialPlansQuery = serde_json::from_value(if let Some(s) = status {
        json!({ "status": s })
    } else {
        json!({})
    })
    .unwrap();
    let resp = list_material_plans(State(state), Query(q))
        .await
        .expect("handler error");
    serde_json::to_value(
        resp.data
            .unwrap_or_else(|| panic!("handler error: {:?}", resp.message)),
    )
    .unwrap()
}

async fn insert_plan(pool: &sqlx::PgPool, plan_no: &str, status: &str) {
    sqlx::query(
        "INSERT INTO mes.material_plans (id, plan_no, material_code, material_name, status) VALUES ($1, $2, $3, $4, $5)",
    )
    .bind(uuid::Uuid::new_v4())
    .bind(plan_no)
    .bind(format!("MC-{plan_no}"))
    .bind(format!("物料-{plan_no}"))
    .bind(status)
    .execute(pool).await.unwrap();
}

#[sqlx::test(migrations = false)]
async fn list_empty_returns_zero(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    assert_eq!(body_of(pool, None).await["total"], 0);
}

#[sqlx::test(migrations = false)]
async fn list_returns_inserted_row(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    insert_plan(&pool, "MP-001", "pending").await;

    let body = body_of(pool, None).await;
    assert_eq!(body["total"], 1);
    assert_eq!(body["items"][0]["plan_no"], "MP-001");
}

#[sqlx::test(migrations = false)]
async fn list_filters_by_status(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    insert_plan(&pool, "MP-A", "pending").await;
    insert_plan(&pool, "MP-B", "released").await;

    let body = body_of(pool, Some("released")).await;
    assert_eq!(body["total"], 1);
    assert_eq!(body["items"][0]["plan_no"], "MP-B");
}
