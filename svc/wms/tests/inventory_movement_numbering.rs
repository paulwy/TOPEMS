#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! P1 补测（2026-10-07）：inventory_movement 移动单号生成规则。
//! 覆盖 MV-YYYYMMDD-NNNNNN 格式、同 tenant 序号递增、跨 tenant 隔离。
//! sqlx::test 临时库 + 最小建表（对齐 wms.inventory_movements 关键列）。

use sqlx::PgPool;
use topems_wms::modules::inventory_movement::generate_movement_no;

async fn setup_schema(pool: &PgPool) {
    sqlx::query("CREATE SCHEMA IF NOT EXISTS wms")
        .execute(pool)
        .await
        .unwrap();
    // 最小列集：generate_movement_no 只依赖 tenant_id + movement_no（COUNT + LIKE）
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS wms.inventory_movements (
            id            TEXT PRIMARY KEY,
            movement_no   TEXT NOT NULL,
            tenant_id     UUID NOT NULL
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
}

topems_test_support::sqlx_dsn_guard!();
#[sqlx::test(migrations = false)]
async fn empty_table_yields_first_sequence(pool: PgPool) {
    setup_schema(&pool).await;
    let tenant = uuid::Uuid::new_v4();
    let today = chrono::Utc::now().format("%Y%m%d").to_string();

    let mut txn = pool.begin().await.unwrap();
    let no = generate_movement_no(&mut txn, tenant).await;
    txn.rollback().await.unwrap();

    assert_eq!(no, format!("MV-{}-000001", today));
}

#[sqlx::test(migrations = false)]
async fn sequence_increments_within_tenant(pool: PgPool) {
    setup_schema(&pool).await;
    let tenant = uuid::Uuid::new_v4();
    let today = chrono::Utc::now().format("%Y%m%d").to_string();

    let mut txn = pool.begin().await.unwrap();
    let no1 = generate_movement_no(&mut txn, tenant).await;
    sqlx::query(
        "INSERT INTO wms.inventory_movements (id, movement_no, tenant_id) VALUES ($1, $2, $3)",
    )
    .bind("m-1")
    .bind(&no1)
    .bind(tenant)
    .execute(&mut *txn)
    .await
    .unwrap();
    let no2 = generate_movement_no(&mut txn, tenant).await;
    txn.rollback().await.unwrap();

    assert_eq!(no1, format!("MV-{}-000001", today));
    assert_eq!(no2, format!("MV-{}-000002", today));
}

#[sqlx::test(migrations = false)]
async fn sequence_is_isolated_per_tenant(pool: PgPool) {
    setup_schema(&pool).await;
    let tenant_a = uuid::Uuid::new_v4();
    let tenant_b = uuid::Uuid::new_v4();
    let today = chrono::Utc::now().format("%Y%m%d").to_string();

    let mut txn = pool.begin().await.unwrap();
    let no_a = generate_movement_no(&mut txn, tenant_a).await;
    sqlx::query(
        "INSERT INTO wms.inventory_movements (id, movement_no, tenant_id) VALUES ($1, $2, $3)",
    )
    .bind("m-a")
    .bind(&no_a)
    .bind(tenant_a)
    .execute(&mut *txn)
    .await
    .unwrap();
    let no_b = generate_movement_no(&mut txn, tenant_b).await;
    txn.rollback().await.unwrap();

    assert_eq!(no_a, format!("MV-{}-000001", today));
    assert_eq!(no_b, format!("MV-{}-000001", today));
}
