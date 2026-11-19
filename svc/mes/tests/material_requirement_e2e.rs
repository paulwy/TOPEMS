#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! P1 补测（2026-10-08）：mes material_requirement list handler 集成测试。
#![cfg(feature = "db-tests")]

#[path = "common/app_state.rs"]
mod app_state;

use app_state::{super_claims, test_app_state};
use axum::extract::{Query, State};
use axum::Extension;
use serde_json::{json, Value};
use topems_mes::modules::material_requirement::{
    list_material_requirements, ListMaterialRequirementsQuery,
};
use topems_shared_auth::middleware::tenant::{scope_request_tenant, RlsRequestTenant};

async fn setup_schema(pool: &sqlx::PgPool) {
    sqlx::query("CREATE SCHEMA IF NOT EXISTS mes")
        .execute(pool)
        .await
        .unwrap();
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS material_requirements (
            id UUID PRIMARY KEY,
            mrp_no VARCHAR(64) NOT NULL,
            order_id UUID,
            order_number VARCHAR(64),
            product_code VARCHAR(64) NOT NULL,
            product_name VARCHAR(256) NOT NULL,
            material_code VARCHAR(64) NOT NULL,
            material_name VARCHAR(256) NOT NULL,
            specification VARCHAR(256),
            unit VARCHAR(32),
            required_quantity NUMERIC(12,2),
            available_quantity NUMERIC(12,2),
            shortfall_quantity NUMERIC(12,2),
            required_date TIMESTAMPTZ,
            priority VARCHAR(16),
            status VARCHAR(32),
            source_type VARCHAR(32),
            remark TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            tenant_id UUID,
            deleted_at TIMESTAMPTZ
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
}

async fn body_of(pool: sqlx::PgPool) -> Value {
    let txn_cell = app_state::request_txn_cell(&pool).await;
    let state = test_app_state(pool);
    let claims = super_claims();
    let q: ListMaterialRequirementsQuery = serde_json::from_value(json!({})).unwrap();
    // 生产环境由 auth_middleware 写入 task-local 租户上下文；直调 handler 必须显式补上，
    // 否则 scope_with 会按 fail-closed 拒绝执行（RLS context missing）。
    let resp = scope_request_tenant(
        RlsRequestTenant {
            tenant: uuid::Uuid::new_v4(),
            system: false,
        },
        list_material_requirements(
            State(state),
            Extension(txn_cell),
            Extension(claims),
            Query(q),
        ),
    )
    .await;
    serde_json::to_value(
        resp.data
            .unwrap_or_else(|| panic!("handler error: {:?}", resp.message)),
    )
    .unwrap()
}

topems_test_support::sqlx_dsn_guard!();
#[sqlx::test(migrations = false)]
async fn list_empty_returns_zero(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    assert_eq!(body_of(pool).await["total"], 0);
}

#[sqlx::test(migrations = false)]
async fn list_returns_inserted_row(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    sqlx::query(
        "INSERT INTO material_requirements (id, mrp_no, product_code, product_name, material_code, material_name) VALUES ($1, $2, $3, $4, $5, $6)",
    )
    .bind(uuid::Uuid::new_v4())
    .bind("MRP-001")
    .bind("P-001")
    .bind("产品1")
    .bind("M-001")
    .bind("物料1")
    .execute(&pool).await.unwrap();

    let body = body_of(pool).await;
    assert_eq!(body["total"], 1);
    assert_eq!(body["requirements"][0]["mrp_no"], "MRP-001");
}
