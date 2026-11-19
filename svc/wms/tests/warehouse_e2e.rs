#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! P1 补测（2026-10-18）：wms warehouse 模块集成测试。
//! 复用 common/api_state.rs 工厂；覆盖 list/create/get/update/delete。
//! 注意：写类 handler 成功分支会 guard.take() + commit 消费事务，
//! 故每次 handler 调用前需 fresh_txn() 重建 txn_arc。
#![cfg(feature = "db-tests")]

#[path = "common/api_state.rs"]
mod api_state;

use api_state::{api_state, empty_params, super_claims};
use axum::extract::{Path, Query, State};
use axum::http::HeaderMap;
use axum::Extension;
use serde_json::Value;
use std::sync::Arc;
use tokio::sync::Mutex;
use topems_wms::models::warehouse::{CreateWarehouseRequest, UpdateWarehouseRequest};
use topems_wms::modules::warehouse::{
    create_warehouse, delete_warehouse, get_warehouse, list_warehouses, update_warehouse,
};

type TxnArc = Arc<Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>;

async fn fresh_txn(pool: &sqlx::PgPool) -> TxnArc {
    Arc::new(Mutex::new(Some(pool.begin().await.unwrap())))
}

async fn setup_schema(pool: &sqlx::PgPool) {
    sqlx::query("CREATE SCHEMA IF NOT EXISTS wms")
        .execute(pool)
        .await
        .unwrap();
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS wms.warehouses (
            id UUID PRIMARY KEY,
            tenant_id UUID,
            org_id UUID,
            organization_id UUID,
            warehouse_name TEXT,
            warehouse_code TEXT,
            address TEXT,
            manager TEXT,
            contact_phone TEXT,
            status TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            warehouse_name_en TEXT,
            deleted_at TIMESTAMPTZ
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
}

topems_test_support::sqlx_dsn_guard!();
#[sqlx::test(migrations = false)]
async fn list_empty_returns_zero(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let txn_arc = fresh_txn(&pool).await;
    let state = api_state(pool);
    let resp = list_warehouses(
        State(state),
        Extension(super_claims()),
        Query(empty_params()),
        HeaderMap::new(),
        Extension(txn_arc),
    )
    .await;
    let body = resp
        .data
        .unwrap_or_else(|| panic!("handler error: {:?}", resp.message));
    assert_eq!(body["total"].as_i64().unwrap(), 0);
}

#[sqlx::test(migrations = false)]
async fn create_then_list_and_get(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let state = api_state(pool.clone());

    let req = CreateWarehouseRequest {
        name: "石家庄一号仓".to_string(),
        warehouse_name_en: Some("SJZ-1".to_string()),
        code: Some("WH-001".to_string()),
        address: Some("高新区".to_string()),
        manager: Some("张工".to_string()),
        phone: Some("13800000000".to_string()),
    };
    let created = create_warehouse(
        State(state.clone()),
        Extension(super_claims()),
        HeaderMap::new(),
        Extension(fresh_txn(&pool).await),
        axum::Json(req),
    )
    .await;
    assert!(created.success, "create failed: {:?}", created.message);
    let wh = created.data.as_ref().unwrap();
    assert_eq!(wh.name, "石家庄一号仓");
    let id = wh.id;

    let listed = list_warehouses(
        State(state.clone()),
        Extension(super_claims()),
        Query(empty_params()),
        HeaderMap::new(),
        Extension(fresh_txn(&pool).await),
    )
    .await;
    let body: Value = listed.data.expect("list failed");
    assert_eq!(body["total"].as_i64().unwrap(), 1);

    let got = get_warehouse(
        State(state.clone()),
        Extension(super_claims()),
        Path(id),
        HeaderMap::new(),
        Extension(fresh_txn(&pool).await),
    )
    .await;
    assert!(got.success, "get failed: {:?}", got.message);
    assert_eq!(got.data.as_ref().unwrap().name, "石家庄一号仓");
}

#[sqlx::test(migrations = false)]
async fn update_warehouse_changes_name(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let state = api_state(pool.clone());

    let req = CreateWarehouseRequest {
        name: "旧仓".to_string(),
        warehouse_name_en: None,
        code: Some("WH-002".to_string()),
        address: None,
        manager: None,
        phone: None,
    };
    let created = create_warehouse(
        State(state.clone()),
        Extension(super_claims()),
        HeaderMap::new(),
        Extension(fresh_txn(&pool).await),
        axum::Json(req),
    )
    .await;
    assert!(created.success);
    let id = created.data.as_ref().unwrap().id;

    let upd = UpdateWarehouseRequest {
        name: Some("新仓".to_string()),
        warehouse_name_en: None,
        code: None,
        address: Some("新址".to_string()),
        manager: None,
        phone: None,
        status: Some("active".to_string()),
    };
    let updated = update_warehouse(
        State(state.clone()),
        Extension(super_claims()),
        Path(id),
        HeaderMap::new(),
        Extension(fresh_txn(&pool).await),
        axum::Json(upd),
    )
    .await;
    assert!(updated.success, "update failed: {:?}", updated.message);
    assert_eq!(updated.data.as_ref().unwrap().name, "新仓");

    let got = get_warehouse(
        State(state.clone()),
        Extension(super_claims()),
        Path(id),
        HeaderMap::new(),
        Extension(fresh_txn(&pool).await),
    )
    .await;
    assert_eq!(got.data.as_ref().unwrap().name, "新仓");
    assert_eq!(got.data.as_ref().unwrap().address.as_deref(), Some("新址"));
}

#[sqlx::test(migrations = false)]
async fn delete_warehouse_removes(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let state = api_state(pool.clone());

    let req = CreateWarehouseRequest {
        name: "待删仓".to_string(),
        warehouse_name_en: None,
        code: Some("WH-003".to_string()),
        address: None,
        manager: None,
        phone: None,
    };
    let created = create_warehouse(
        State(state.clone()),
        Extension(super_claims()),
        HeaderMap::new(),
        Extension(fresh_txn(&pool).await),
        axum::Json(req),
    )
    .await;
    assert!(created.success);
    let id = created.data.as_ref().unwrap().id;

    let del = delete_warehouse(
        State(state.clone()),
        Extension(super_claims()),
        Path(id),
        HeaderMap::new(),
        Extension(fresh_txn(&pool).await),
    )
    .await;
    assert!(del.success, "delete failed: {:?}", del.message);

    let got = get_warehouse(
        State(state),
        Extension(super_claims()),
        Path(id),
        HeaderMap::new(),
        Extension(fresh_txn(&pool).await),
    )
    .await;
    assert!(!got.success, "deleted warehouse should not be found");
}
