#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! P1 补测（2026-10-18）：wms labor 模块集成测试。
//! 覆盖 list_labor_shifts（空/计数）、create_labor_shift、list_labor_efficiency（wave_picks 聚合）。
//! 建表自建：labor_shifts + wave_picks（efficiency 数据源）。

#[path = "common/api_state.rs"]
mod api_state;

use api_state::{api_state, empty_params, super_claims};
use axum::extract::{Json, Query, State};
use axum::Extension;
use serde_json::Value;
use std::sync::Arc;
use tokio::sync::Mutex;
use topems_wms::modules::labor::{
    create_labor_shift, list_labor_efficiency, list_labor_shifts, CreateShiftRequest, LaborQuery,
};

async fn setup_schema(pool: &sqlx::PgPool) {
    sqlx::query("CREATE SCHEMA IF NOT EXISTS wms")
        .execute(pool)
        .await
        .unwrap();
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS wms.labor_shifts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id UUID NOT NULL,
            tenant_id UUID NOT NULL,
            user_id UUID NOT NULL,
            user_name VARCHAR(255),
            shift_date DATE NOT NULL,
            start_time TIMESTAMPTZ,
            end_time TIMESTAMPTZ,
            warehouse_id UUID,
            zone VARCHAR(100),
            status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
            tasks_assigned BIGINT NOT NULL DEFAULT 0,
            tasks_completed BIGINT NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMPTZ,
            org_id UUID NOT NULL
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS wms.wave_picks (
            id UUID PRIMARY KEY,
            org_id UUID NOT NULL,
            wave_pick_number VARCHAR(100) NOT NULL,
            wave_pick_type VARCHAR(50) NOT NULL DEFAULT 'standard',
            warehouse_id UUID,
            warehouse_name VARCHAR(255),
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            priority VARCHAR(20) DEFAULT 'medium',
            assigned_to UUID,
            assigned_user_name VARCHAR(255),
            batch_id UUID,
            start_time TIMESTAMPTZ,
            end_time TIMESTAMPTZ,
            total_items BIGINT NOT NULL DEFAULT 0,
            picked_items BIGINT NOT NULL DEFAULT 0,
            total_quantity NUMERIC(15,2) NOT NULL DEFAULT 0,
            picked_quantity NUMERIC(15,2) NOT NULL DEFAULT 0,
            remarks TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMPTZ,
            tenant_id UUID
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
}

async fn insert_shift(pool: &sqlx::PgPool, user_name: &str, status: &str) {
    sqlx::query(
        r#"INSERT INTO wms.labor_shifts
           (id, organization_id, tenant_id, user_id, user_name, shift_date, status, org_id)
           VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, $6, $2)"#,
    )
    .bind(uuid::Uuid::new_v4())
    .bind(uuid::Uuid::new_v4())
    .bind(uuid::Uuid::new_v4())
    .bind(uuid::Uuid::new_v4())
    .bind(user_name)
    .bind(status)
    .execute(pool)
    .await
    .unwrap();
}

async fn shifts_body(pool: sqlx::PgPool) -> Value {
    let txn = pool.begin().await.unwrap();
    let txn_arc = Arc::new(Mutex::new(Some(txn)));
    let state = api_state(pool);
    let claims = super_claims();
    let resp = list_labor_shifts(
        State(state),
        Extension(claims),
        Query(empty_params()),
        Extension(txn_arc),
    )
    .await;
    let data = resp
        .0
        .data
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.0.message));
    serde_json::to_value(data).unwrap()
}

#[sqlx::test(migrations = false)]
async fn shifts_list_empty_returns_zero(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let body = shifts_body(pool).await;
    assert_eq!(body["total"], 0);
}

#[sqlx::test(migrations = false)]
async fn shifts_list_returns_inserted(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    insert_shift(&pool, "张三", "completed").await;

    let body = shifts_body(pool).await;
    assert_eq!(body["total"], 1);
    assert_eq!(body["items"][0]["user_name"], "张三");
}

#[sqlx::test(migrations = false)]
async fn create_shift_creates(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let uid = uuid::Uuid::new_v4();
    let req = CreateShiftRequest {
        user_id: uid,
        user_name: Some("李四".to_string()),
        shift_date: chrono::NaiveDate::from_ymd_opt(2026, 10, 18).unwrap(),
        start_time: None,
        end_time: None,
        warehouse_id: None,
        zone: Some("A区".to_string()),
        status: None,
    };
    let txn = pool.begin().await.unwrap();
    let txn_arc = Arc::new(Mutex::new(Some(txn)));
    let state = api_state(pool.clone());
    let claims = super_claims();
    let resp = create_labor_shift(
        State(state),
        Extension(claims),
        Extension(txn_arc),
        Json(req),
    )
    .await;
    let data = resp
        .0
        .data
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.0.message));
    let shift = serde_json::to_value(data).unwrap();
    assert_eq!(shift["user_id"], serde_json::to_value(uid).unwrap());
    assert_eq!(shift["status"], "scheduled");
    assert_eq!(shift["zone"], "A区");

    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM wms.labor_shifts")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(count, 1);
}

#[sqlx::test(migrations = false)]
async fn efficiency_computes_from_wave_picks(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let uid = uuid::Uuid::new_v4();
    for (status, items, picked) in [("completed", 10i64, 10i64), ("pending", 5i64, 0i64)] {
        sqlx::query(
            "INSERT INTO wms.wave_picks (id, org_id, wave_pick_number, status, assigned_to, assigned_user_name, total_items, picked_items, total_quantity, picked_quantity, start_time, end_time) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 100, 50, NOW() - interval '1 hour', NOW())",
        )
        .bind(uuid::Uuid::new_v4())
        .bind(uuid::Uuid::new_v4())
        .bind(format!("WP-{}", status))
        .bind(status)
        .bind(uid)
        .bind("王五")
        .bind(items)
        .bind(picked)
        .execute(&pool)
        .await
        .unwrap();
    }

    let txn = pool.begin().await.unwrap();
    let txn_arc = Arc::new(Mutex::new(Some(txn)));
    let state = api_state(pool);
    let claims = super_claims();
    let params = LaborQuery {
        date_from: None,
        date_to: None,
        warehouse_id: None,
    };
    let resp = list_labor_efficiency(
        State(state),
        Extension(claims),
        Query(params),
        Extension(txn_arc),
    )
    .await;
    let data = resp
        .0
        .data
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.0.message));
    let rows = serde_json::to_value(data).unwrap();
    let rows = rows.as_array().unwrap();
    assert_eq!(rows.len(), 1);
    assert_eq!(rows[0]["user_name"], "王五");
    assert_eq!(rows[0]["total_lists"], 2);
    assert_eq!(rows[0]["completed_lists"], 1);
}
