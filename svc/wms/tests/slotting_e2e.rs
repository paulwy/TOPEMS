#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! P1 补测（2026-10-07）：wms slotting list_suggestions handler 集成测试。
//! 复用 common/api_state.rs 工厂；覆盖空表/有数据/warehouse_id 过滤。

#[path = "common/api_state.rs"]
mod api_state;

use api_state::{api_state, super_claims};
use axum::extract::{Query, State};
use axum::Extension;
use serde_json::Value;
use std::sync::Arc;
use tokio::sync::Mutex;
use topems_wms::modules::slotting::{list_suggestions, SuggestionQueryParams};

fn empty_params() -> SuggestionQueryParams {
    SuggestionQueryParams {
        page: None,
        page_size: None,
        warehouse_id: None,
        status: None,
    }
}

async fn setup_schema(pool: &sqlx::PgPool) {
    sqlx::query("CREATE SCHEMA IF NOT EXISTS wms")
        .execute(pool)
        .await
        .unwrap();
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS wms.slotting_suggestions (
            id UUID PRIMARY KEY,
            tenant_id UUID,
            warehouse_id UUID,
            material_id UUID,
            material_code TEXT,
            material_name TEXT,
            current_location_id UUID,
            suggested_location_id UUID,
            suggested_location_name TEXT,
            reason TEXT,
            score FLOAT8 DEFAULT 0,
            expected_improvement FLOAT8 DEFAULT 0,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            applied_at TIMESTAMPTZ
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
}

async fn body_of(pool: sqlx::PgPool, params: SuggestionQueryParams) -> Value {
    let mut txn = pool.begin().await.unwrap();
    let txn_arc = Arc::new(Mutex::new(Some(txn)));
    let state = api_state(pool);
    let claims = super_claims();
    let resp = list_suggestions(
        State(state),
        Extension(claims),
        Query(params),
        Extension(txn_arc),
    )
    .await;
    resp.0
        .data
        .clone()
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.0.message))
}

#[sqlx::test(migrations = false)]
async fn list_empty_returns_zero(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let body = body_of(pool, empty_params()).await;
    assert_eq!(body["total"], 0);
}

#[sqlx::test(migrations = false)]
async fn list_returns_inserted_row(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    sqlx::query(
        "INSERT INTO wms.slotting_suggestions (id, tenant_id, warehouse_id, material_id, material_code, material_name, reason, status) VALUES ($1, $2, $3, $4, 'M001', '物料A', '近邻率高', 'pending')",
    )
    .bind(uuid::Uuid::new_v4())
    .bind(uuid::Uuid::new_v4())
    .bind(uuid::Uuid::new_v4())
    .bind(uuid::Uuid::new_v4())
    .execute(&pool)
    .await
    .unwrap();

    let body = body_of(pool, empty_params()).await;
    assert_eq!(body["total"], 1);
    assert_eq!(body["items"][0]["material_code"], "M001");
}

#[sqlx::test(migrations = false)]
async fn list_filters_by_warehouse(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let wh_a = uuid::Uuid::new_v4();
    let wh_b = uuid::Uuid::new_v4();
    for (i, wh) in [wh_a, wh_b].iter().enumerate() {
        sqlx::query(
            "INSERT INTO wms.slotting_suggestions (id, tenant_id, warehouse_id, material_id, material_code, material_name, reason, status) VALUES ($1, $2, $3, $4, $5, $6, '近邻率高', 'pending')",
        )
        .bind(uuid::Uuid::new_v4())
        .bind(uuid::Uuid::new_v4())
        .bind(wh)
        .bind(uuid::Uuid::new_v4())
        .bind(format!("M{i}"))
        .bind(format!("物料{i}"))
        .execute(&pool)
        .await
        .unwrap();
    }

    let mut params = empty_params();
    params.warehouse_id = Some(wh_a);
    let body = body_of(pool, params).await;
    assert_eq!(body["total"], 1);
    assert_eq!(body["items"][0]["warehouse_id"], wh_a.to_string());
}
