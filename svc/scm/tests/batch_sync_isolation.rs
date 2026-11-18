//! `batch_sync_purchase_to_wms` 的按条事务隔离验证。
//!
//! 场景用 `BEFORE INSERT` 触发器让名字以 `PO-BAD` 开头的采购订单必然写入失败：
//!   * 失败只回滚该条，不连累同批其他条；
//!   * 失败条的重试计数是在 `ROLLBACK TO SAVEPOINT` 之后的可用事务里更新的；
//!   * 返回体如实区分成功 / 待重试 / 最终失败；
//!   * 全成功路径行为不变。

#![allow(clippy::unwrap_used, clippy::expect_used)]

use axum::extract::State;
use axum::Extension;
use sqlx::{PgPool, Row};
use std::sync::Arc;
use tokio::sync::Mutex;
use topems_scm::modules::data_sync::{batch_sync_purchase_to_wms, BatchSyncResult};
use topems_scm::modules::ApiState;
use topems_shared_auth::auth::{AuthState, Claims};
use topems_shared_core::l2_cache::{AsyncL2Cache, L2CacheConfig};
use topems_shared_core::response::ApiResponse;
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

fn user_claims(tenant_id: Uuid) -> Claims {
    Claims {
        sub: Uuid::new_v4().to_string(),
        username: "tester".to_string(),
        role: "user".to_string(),
        roles: vec!["user".to_string()],
        permissions: vec!["scm:sync:write".to_string()],
        is_superuser: false,
        exp: 0,
        iat: 0,
        email: None,
        department: None,
        tenant_id: Some(tenant_id.to_string()),
        department_id: None,
        position_id: None,
        position_code: None,
        must_change_password: false,
    }
}

/// 只建本用例需要的最小表 + 失败注入触发器（不跑迁移，不碰生产库）。
async fn setup_schema(pool: &PgPool) {
    sqlx::query("CREATE SCHEMA IF NOT EXISTS scm")
        .execute(pool)
        .await
        .unwrap();
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS scm.purchase_orders (
            id UUID PRIMARY KEY,
            po_no TEXT NOT NULL,
            supplier_id UUID,
            order_date TIMESTAMPTZ NOT NULL,
            delivery_date TIMESTAMPTZ,
            total_amount NUMERIC,
            status TEXT NOT NULL,
            remarks TEXT,
            is_synced_to_wms BOOLEAN NOT NULL DEFAULT FALSE,
            inbound_order_id UUID,
            inbound_order_number TEXT,
            sync_retry_count INTEGER NOT NULL DEFAULT 0,
            sync_error TEXT,
            last_sync_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL,
            tenant_id UUID NOT NULL
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS scm.wms_inbound_order_snapshots (
            id UUID PRIMARY KEY,
            order_number TEXT NOT NULL,
            warehouse_id UUID,
            supplier_id UUID,
            order_type TEXT NOT NULL,
            status TEXT NOT NULL,
            purchase_order_id UUID,
            purchase_order_number TEXT,
            received_at TIMESTAMPTZ,
            tenant_id UUID NOT NULL,
            synced_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL,
            deleted_at TIMESTAMPTZ
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS scm.sync_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            sync_type TEXT NOT NULL,
            source_module TEXT NOT NULL,
            target_module TEXT NOT NULL,
            source_entity TEXT NOT NULL,
            source_id UUID NOT NULL,
            source_code TEXT,
            target_id UUID,
            target_code TEXT,
            operation TEXT NOT NULL,
            status TEXT NOT NULL,
            error_message TEXT,
            retry_count INTEGER NOT NULL DEFAULT 0,
            max_retries INTEGER NOT NULL DEFAULT 3,
            next_retry_at TIMESTAMPTZ,
            executed_at TIMESTAMPTZ,
            updated_at TIMESTAMPTZ,
            tenant_id UUID NOT NULL
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();

    // 单条失败注入：用 RAISE EXCEPTION 让整个事务进入 aborted 状态，
    // 只有 ROLLBACK TO SAVEPOINT 才能恢复——正是本次修复要覆盖的语义。
    sqlx::query(
        r#"CREATE OR REPLACE FUNCTION scm.fail_bad_inbound() RETURNS trigger AS $$
           BEGIN
               IF NEW.purchase_order_number LIKE 'PO-BAD%' THEN
                   RAISE EXCEPTION 'synthetic insert failure for %', NEW.purchase_order_number;
               END IF;
               RETURN NEW;
           END;
           $$ LANGUAGE plpgsql"#,
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query("DROP TRIGGER IF EXISTS test_fail_bad_inbound ON scm.wms_inbound_order_snapshots")
        .execute(pool)
        .await
        .unwrap();
    sqlx::query(
        r#"CREATE TRIGGER test_fail_bad_inbound BEFORE INSERT ON scm.wms_inbound_order_snapshots
           FOR EACH ROW EXECUTE FUNCTION scm.fail_bad_inbound()"#,
    )
    .execute(pool)
    .await
    .unwrap();
}

async fn insert_po(pool: &PgPool, tenant: Uuid, po_no: &str, seq: i32, retry_count: i32) -> Uuid {
    let id = Uuid::new_v4();
    sqlx::query(
        r#"INSERT INTO scm.purchase_orders
            (id, po_no, supplier_id, order_date, total_amount, status, created_at, updated_at,
             tenant_id, sync_retry_count)
           VALUES ($1, $2, NULL, NOW(), 100.00, 'approved',
                   NOW() + ($3 || ' seconds')::interval, NOW(), $4, $5)"#,
    )
    .bind(id)
    .bind(po_no)
    .bind(seq.to_string())
    .bind(tenant)
    .bind(retry_count)
    .execute(pool)
    .await
    .unwrap();
    id
}

async fn run_batch(pool: PgPool, tenant: Uuid) -> ApiResponse<BatchSyncResult> {
    let txn = pool.begin().await.unwrap();
    let txn_arc = Arc::new(Mutex::new(Some(txn)));
    let state = api_state(pool);
    batch_sync_purchase_to_wms(
        State(state),
        Extension(user_claims(tenant)),
        Extension(txn_arc),
    )
    .await
}

async fn po_state(
    pool: &PgPool,
    id: Uuid,
) -> (bool, i32, Option<String>, Option<String>, Option<Uuid>) {
    let row = sqlx::query(
        r#"SELECT is_synced_to_wms, sync_retry_count, sync_error, status, inbound_order_id
           FROM scm.purchase_orders WHERE id = $1"#,
    )
    .bind(id)
    .fetch_one(pool)
    .await
    .unwrap();
    (
        row.get("is_synced_to_wms"),
        row.get("sync_retry_count"),
        row.get("sync_error"),
        row.get("status"),
        row.get("inbound_order_id"),
    )
}

async fn count_snapshots(pool: &PgPool, tenant: Uuid) -> i64 {
    sqlx::query_scalar("SELECT COUNT(*) FROM scm.wms_inbound_order_snapshots WHERE tenant_id = $1")
        .bind(tenant)
        .fetch_one(pool)
        .await
        .unwrap()
}

async fn count_logs(pool: &PgPool, tenant: Uuid, status: &str) -> i64 {
    sqlx::query_scalar("SELECT COUNT(*) FROM scm.sync_logs WHERE tenant_id = $1 AND status = $2")
        .bind(tenant)
        .bind(status)
        .fetch_one(pool)
        .await
        .unwrap()
}

topems_test_support::sqlx_dsn_guard!();
#[sqlx::test(migrations = false)]
async fn single_failure_does_not_poison_batch(pool: PgPool) {
    setup_schema(&pool).await;
    let tenant = Uuid::new_v4();
    let ok = insert_po(&pool, tenant, "PO-OK-1", 1, 0).await;
    let bad_retry = insert_po(&pool, tenant, "PO-BAD-RETRY-2", 2, 0).await;
    let bad_exhaust = insert_po(&pool, tenant, "PO-BAD-EXHAUST-3", 3, 2).await;

    let resp = run_batch(pool.clone(), tenant).await;
    assert_eq!(resp.code, 200, "部分失败仍应是 200: {}", resp.message);
    let data = resp.data.expect("应返回统计");

    assert_eq!(data.total_count, 3);
    assert_eq!(data.success_count, 1, "失败条之前的成功条应已提交");
    assert_eq!(data.retry_count, 1, "未达上限的失败条应记待重试");
    assert_eq!(data.failed_count, 1, "达到上限的失败条应记最终失败");
    assert!(data.partial_failure, "部分失败必须被标识");
    assert_eq!(data.errors.len(), 2, "两条失败原因都要上报");
    let codes: Vec<&str> = data
        .errors
        .iter()
        .filter_map(|e| e.source_code.as_deref())
        .collect();
    assert!(
        codes.contains(&"PO-BAD-RETRY-2"),
        "errors={:?}",
        data.errors
    );
    assert!(
        codes.contains(&"PO-BAD-EXHAUST-3"),
        "errors={:?}",
        data.errors
    );
    assert!(data
        .errors
        .iter()
        .all(|e| e.error.contains("synthetic insert failure")));

    // 成功的条目正常落库。
    let (synced, retry, err, status, inbound_id) = po_state(&pool, ok).await;
    assert!(synced, "成功条目应标记已同步");
    assert_eq!(status.as_deref(), Some("in_transit"));
    assert!(inbound_id.is_some(), "成功条目应回写入库单 ID");
    assert_eq!(retry, 0);
    assert!(err.is_none());

    // 失败条只回滚自己：未达上限的那条重试计数被 +1。
    let (synced, retry, err, status, inbound_id) = po_state(&pool, bad_retry).await;
    assert!(!synced, "失败条不得被标记已同步");
    assert_eq!(retry, 1, "失败条的重试计数必须在外层事务里更新成功");
    assert!(err
        .expect("应记录失败原因")
        .contains("synthetic insert failure"));
    assert_eq!(status.as_deref(), Some("approved"));
    assert!(inbound_id.is_none(), "失败条不得残留入库单引用");

    // 达到上限的那条不再累加，也不自动重试。
    let (synced, retry, _err, _, inbound_id) = po_state(&pool, bad_exhaust).await;
    assert!(!synced);
    assert_eq!(retry, 2, "已达上限的条目不应再累加重试计数");
    assert!(inbound_id.is_none());

    // 只有成功的那条产生快照，失败条没有半截写入。
    assert_eq!(count_snapshots(&pool, tenant).await, 1);
    assert_eq!(count_logs(&pool, tenant, "success").await, 1);
    assert_eq!(count_logs(&pool, tenant, "pending").await, 1);
    assert_eq!(count_logs(&pool, tenant, "failed").await, 1);
}

#[sqlx::test(migrations = false)]
async fn all_success_path_unchanged(pool: PgPool) {
    setup_schema(&pool).await;
    let tenant = Uuid::new_v4();
    let first = insert_po(&pool, tenant, "PO-OK-1", 1, 0).await;
    let second = insert_po(&pool, tenant, "PO-OK-2", 2, 0).await;

    let resp = run_batch(pool.clone(), tenant).await;
    assert_eq!(resp.code, 200);
    let data = resp.data.expect("应返回统计");

    assert_eq!(data.total_count, 2);
    assert_eq!(data.success_count, 2);
    assert_eq!(data.failed_count, 0);
    assert_eq!(data.retry_count, 0);
    assert!(!data.partial_failure);
    assert!(data.errors.is_empty());

    for id in [first, second] {
        let (synced, retry, err, status, inbound_id) = po_state(&pool, id).await;
        assert!(synced);
        assert_eq!(retry, 0);
        assert!(err.is_none());
        assert_eq!(status.as_deref(), Some("in_transit"));
        assert!(inbound_id.is_some());
    }
    assert_eq!(count_snapshots(&pool, tenant).await, 2);
    assert_eq!(count_logs(&pool, tenant, "success").await, 2);
}

#[sqlx::test(migrations = false)]
async fn all_failed_is_distinguishable_from_partial(pool: PgPool) {
    setup_schema(&pool).await;
    let tenant = Uuid::new_v4();
    insert_po(&pool, tenant, "PO-BAD-1", 1, 0).await;
    insert_po(&pool, tenant, "PO-BAD-2", 2, 0).await;

    let resp = run_batch(pool.clone(), tenant).await;
    assert_eq!(resp.code, 200);
    let data = resp.data.expect("应返回统计");

    assert_eq!(data.total_count, 2);
    assert_eq!(data.success_count, 0, "全部失败时不应有成功条数");
    assert_eq!(data.retry_count, 2);
    assert_eq!(data.failed_count, 0);
    assert!(!data.partial_failure, "全部失败不应被报成部分失败");
    assert_eq!(data.errors.len(), 2);
    assert_eq!(count_snapshots(&pool, tenant).await, 0);
    assert_eq!(count_logs(&pool, tenant, "pending").await, 2);
}
