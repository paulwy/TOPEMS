#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! P1 补测（2026-10-18）：wms analytics 模块集成测试。
//! 覆盖 get_dashboard_summary（跨 6 表聚合：仓库/库存/出入库/告警/库位利用率）。
#![cfg(feature = "db-tests")]

#[path = "common/api_state.rs"]
mod api_state;

use api_state::{api_state, tenant_claims, test_tenant};
use axum::extract::State;
use axum::Extension;
use serde_json::Value;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_wms::modules::analytics::{get_dashboard_summary, get_flow_trend, AnalyticsQueryParams};

/// 直调 handler 的测试没有 tenant_middleware，用空事务单元代替（release 为空操作）。
fn no_txn_cell() -> Extension<RlsTxnCell> {
    Extension(std::sync::Arc::new(tokio::sync::Mutex::new(None)))
}

async fn setup_schema(pool: &sqlx::PgPool) {
    sqlx::query("CREATE SCHEMA IF NOT EXISTS wms")
        .execute(pool)
        .await
        .unwrap();
    for (table, ddl) in [
        (
            "warehouses",
            "id UUID PRIMARY KEY, name VARCHAR(200), tenant_id UUID, deleted_at TIMESTAMPTZ",
        ),
        (
            "inventory",
            "id UUID PRIMARY KEY, material_code VARCHAR(100), quantity NUMERIC(15,2), tenant_id UUID, deleted_at TIMESTAMPTZ",
        ),
        (
            "inbound_orders",
            "id UUID PRIMARY KEY, created_at TIMESTAMPTZ DEFAULT NOW(), tenant_id UUID, deleted_at TIMESTAMPTZ",
        ),
        (
            "outbound_orders",
            "id UUID PRIMARY KEY, created_at TIMESTAMPTZ DEFAULT NOW(), tenant_id UUID, deleted_at TIMESTAMPTZ",
        ),
        (
            "alerts",
            "id UUID PRIMARY KEY, status VARCHAR(20), severity VARCHAR(20), tenant_id UUID, deleted_at TIMESTAMPTZ",
        ),
        (
            "locations",
            "id UUID PRIMARY KEY, status VARCHAR(20), tenant_id UUID, deleted_at TIMESTAMPTZ",
        ),
    ] {
        sqlx::query(sqlx::AssertSqlSafe(format!(
            "CREATE TABLE IF NOT EXISTS wms.{table} ({ddl})"
        )))
        .execute(pool)
        .await
        .unwrap();
    }
}

topems_test_support::sqlx_dsn_guard!();
#[sqlx::test(migrations = false)]
async fn dashboard_aggregates_core_metrics(pool: sqlx::PgPool) {
    setup_schema(&pool).await;

    sqlx::query(
        "INSERT INTO wms.warehouses (id, name, tenant_id) VALUES (gen_random_uuid(), 'W1', $1)",
    )
    .bind(test_tenant())
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        "INSERT INTO wms.inventory (id, material_code, quantity, tenant_id) VALUES (gen_random_uuid(), 'A001', 100, $1), (gen_random_uuid(), 'B002', 50, $1)",
    )
    .bind(test_tenant())
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query("INSERT INTO wms.inbound_orders (id, tenant_id) VALUES (gen_random_uuid(), $1)")
        .bind(test_tenant())
        .execute(&pool)
        .await
        .unwrap();
    sqlx::query("INSERT INTO wms.outbound_orders (id, tenant_id) VALUES (gen_random_uuid(), $1)")
        .bind(test_tenant())
        .execute(&pool)
        .await
        .unwrap();
    sqlx::query(
        "INSERT INTO wms.alerts (id, status, severity, tenant_id) VALUES (gen_random_uuid(), 'active', 'critical', $1), (gen_random_uuid(), 'active', 'warning', $1)",
    )
    .bind(test_tenant())
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        "INSERT INTO wms.locations (id, status, tenant_id) VALUES (gen_random_uuid(), 'occupied', $1), (gen_random_uuid(), 'empty', $1)",
    )
    .bind(test_tenant())
    .execute(&pool)
    .await
    .unwrap();

    let state = api_state(pool);
    let claims = tenant_claims();
    let resp = get_dashboard_summary(State(state), Extension(claims), no_txn_cell()).await;
    let data = resp
        .data
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.message));
    let summary: Value = serde_json::to_value(data).unwrap();
    assert_eq!(summary["warehouse_count"], 1);
    assert_eq!(summary["inventory_total"], 150.0);
    assert_eq!(summary["inventory_sku_count"], 2);
    assert_eq!(summary["inbound_today"], 1);
    assert_eq!(summary["outbound_today"], 1);
    assert_eq!(summary["alert_count"], 2);
    assert_eq!(summary["alert_critical"], 1);
    assert_eq!(summary["location_utilization"], 50.0);
}

// ===== flow-trend 权限校验 =====

fn flow_params() -> AnalyticsQueryParams {
    AnalyticsQueryParams {
        start_date: None,
        end_date: None,
        group_by: Some("month".to_string()),
        warehouse_id: None,
    }
}

/// 普通用户（非超管）且无 wms:read → 403。
#[sqlx::test(migrations = false)]
async fn flow_trend_requires_wms_read(pool: sqlx::PgPool) {
    sqlx::query("CREATE SCHEMA IF NOT EXISTS wms")
        .execute(&pool)
        .await
        .unwrap();
    for table in ["inbound_orders", "outbound_orders"] {
        sqlx::query(sqlx::AssertSqlSafe(format!(
            "CREATE TABLE IF NOT EXISTS wms.{table} (
                id UUID PRIMARY KEY, created_at TIMESTAMPTZ DEFAULT NOW(),
                total_items NUMERIC(15,2), warehouse_id UUID,
                tenant_id UUID, deleted_at TIMESTAMPTZ)"
        )))
        .execute(&pool)
        .await
        .unwrap();
    }

    let state = api_state(pool.clone());
    let mut claims = tenant_claims();
    claims.is_superuser = false;
    claims.permissions = vec![];

    let resp = get_flow_trend(
        State(state),
        Extension(claims),
        axum::extract::Query(flow_params()),
        no_txn_cell(),
    )
    .await;
    assert_eq!(resp.code, 403, "无 wms:read 应 403: {}", resp.message);
    assert!(
        resp.message.contains("权限不足"),
        "message={}",
        resp.message
    );
}

/// 普通用户持有 wms:read → 200，且只统计本租户数据。
#[sqlx::test(migrations = false)]
async fn flow_trend_allows_wms_read(pool: sqlx::PgPool) {
    sqlx::query("CREATE SCHEMA IF NOT EXISTS wms")
        .execute(&pool)
        .await
        .unwrap();
    for table in ["inbound_orders", "outbound_orders"] {
        sqlx::query(sqlx::AssertSqlSafe(format!(
            "CREATE TABLE IF NOT EXISTS wms.{table} (
                id UUID PRIMARY KEY, created_at TIMESTAMPTZ DEFAULT NOW(),
                total_items NUMERIC(15,2), warehouse_id UUID,
                tenant_id UUID, deleted_at TIMESTAMPTZ)"
        )))
        .execute(&pool)
        .await
        .unwrap();
    }
    sqlx::query(
        "INSERT INTO wms.inbound_orders (id, total_items, tenant_id) VALUES (gen_random_uuid(), 10, $1)",
    )
    .bind(test_tenant())
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        "INSERT INTO wms.outbound_orders (id, total_items, tenant_id) VALUES (gen_random_uuid(), 4, $1)",
    )
    .bind(test_tenant())
    .execute(&pool)
    .await
    .unwrap();

    let state = api_state(pool);
    let mut claims = tenant_claims();
    claims.is_superuser = false;
    claims.permissions = vec!["wms:read".to_string()];

    let resp = get_flow_trend(
        State(state),
        Extension(claims),
        axum::extract::Query(flow_params()),
        no_txn_cell(),
    )
    .await;
    assert_eq!(resp.code, 200, "wms:read 应放行: {}", resp.message);
    let data = resp.data.unwrap();
    let body = serde_json::to_value(data).unwrap();
    assert_eq!(body["summary"]["total_inbound_qty"], 10.0);
    assert_eq!(body["summary"]["total_outbound_qty"], 4.0);
}
