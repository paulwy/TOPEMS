#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! 主数据事件消费者验收（A1 稳定 ID）
//!
//! 目的：证明同一实体反复发布的事件在 `core_master_data_refs` 里只有一行，
//! 而不是每来一次事件就多一行。
//!
//! 运行方式（必须显式指定测试库）：
//! ```bash
//! TEST_DATABASE_URL=postgres://topems_test_runner@127.0.0.1:5432/topems_test_runner \
//!   cargo test -p topems-unified-core --test master_event_consumer_e2e -- --test-threads=1
//! ```

use serde_json::json;
use sqlx::{AssertSqlSafe, PgPool};
use std::time::Duration;
use tokio::time::{sleep, Instant};
use topems_shared_db::scope::Db;
use topems_shared_event::event::{
    master_data_id_for, MasterDataAction, MasterDataDomain, MasterDataEvent,
};
use topems_unified_core::modules::master::consumer::consume_master_data_event;
use uuid::Uuid;

const REFS_TABLE: &str = "core_master_data_refs";

async fn count_refs(pool: &PgPool, tenant_id: Uuid) -> i64 {
    let db = Db::new(pool.clone(), "public, shared");
    let mut scope = db.scope_for_tenant(tenant_id).await.expect("scope txn");
    let count: i64 = sqlx::query_scalar(
        "SELECT count(*) FROM public.core_master_data_refs WHERE tenant_id = $1",
    )
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await
    .expect("count refs");
    scope.commit().await.expect("commit count");
    count
}

async fn fetch_ref(
    pool: &PgPool,
    tenant_id: Uuid,
    master_data_id: &str,
) -> (String, String, String, i32) {
    let db = Db::new(pool.clone(), "public, shared");
    let mut scope = db.scope_for_tenant(tenant_id).await.expect("scope txn");
    let row: (String, String, String, i32) = sqlx::query_as(
        "SELECT name, status, code, version FROM public.core_master_data_refs \
         WHERE tenant_id = $1 AND master_data_id = $2",
    )
    .bind(tenant_id)
    .bind(master_data_id)
    .fetch_one(&mut scope)
    .await
    .expect("fetch ref");
    scope.commit().await.expect("commit fetch");
    row
}

async fn tuple_inserted(pool: &PgPool, table: &str) -> i64 {
    sqlx::query_scalar(
        "SELECT COALESCE(n_tup_ins, 0) FROM pg_stat_user_tables \
         WHERE schemaname = 'public' AND relname = $1",
    )
    .bind(table)
    .fetch_optional(pool)
    .await
    .expect("read pg_stat_user_tables")
    .unwrap_or(0)
}

async fn wait_insert_delta(pool: &PgPool, table: &str, baseline: i64, min_delta: i64) -> i64 {
    let deadline = Instant::now() + Duration::from_secs(10);
    loop {
        let current = tuple_inserted(pool, table).await;
        if current - baseline >= min_delta || Instant::now() >= deadline {
            return current;
        }
        sleep(Duration::from_millis(200)).await;
    }
}

async fn cleanup(pool: &PgPool, tenant_id: Uuid) {
    let db = Db::new(pool.clone(), "public, shared");
    let mut scope = db.scope_for_tenant(tenant_id).await.expect("cleanup scope");
    sqlx::query(AssertSqlSafe(format!(
        "DELETE FROM public.{REFS_TABLE} WHERE tenant_id = $1"
    )))
    .bind(tenant_id)
    .execute(&mut scope)
    .await
    .expect("cleanup refs");
    scope.commit().await.expect("commit cleanup");
}

#[tokio::test]
#[ignore = "需要已执行全量迁移的测试库：MDM 表 core_master_data_refs 等由迁移创建，sqlx::test 新建库无此表"]
async fn same_entity_events_converge_to_one_ref() {
    topems_test_support::ensure_test_dsn();
    let pool = PgPool::connect(&topems_test_support::test_database_url())
        .await
        .expect("connect test db");

    let tenant_id = Uuid::new_v4();
    cleanup(&pool, tenant_id).await;

    // 同一实体 UUID 反复发布必须得到同一个 master_data_id
    let entity_id = Uuid::new_v4();
    let master_data_id = master_data_id_for(MasterDataDomain::Material, entity_id);
    assert_eq!(
        master_data_id,
        master_data_id_for(MasterDataDomain::Material, entity_id)
    );

    let insert_baseline = tuple_inserted(&pool, REFS_TABLE).await;

    // 1) 第一次发布：插入一行
    consume_master_data_event(
        &pool,
        MasterDataEvent::new(
            tenant_id,
            MasterDataDomain::Material,
            MasterDataAction::Created,
            master_data_id.clone(),
            "MAT-0001".to_string(),
            "pdm",
            json!({"name": "测试物料", "status": "active"}),
        ),
    )
    .await
    .expect("consume created");
    assert_eq!(count_refs(&pool, tenant_id).await, 1);
    assert_eq!(
        fetch_ref(&pool, tenant_id, &master_data_id).await,
        (
            "测试物料".to_string(),
            "active".to_string(),
            "MAT-0001".to_string(),
            1
        )
    );

    // 2) 同一实体再次发布（内容不变）：仍然只有一行
    consume_master_data_event(
        &pool,
        MasterDataEvent::new(
            tenant_id,
            MasterDataDomain::Material,
            MasterDataAction::Created,
            master_data_id.clone(),
            "MAT-0001".to_string(),
            "pdm",
            json!({"name": "测试物料", "status": "active"}),
        ),
    )
    .await
    .expect("consume duplicate");
    assert_eq!(
        count_refs(&pool, tenant_id).await,
        1,
        "同一实体重复发布不能新增 refs 行"
    );

    // 3) 更新事件：同一行被更新
    consume_master_data_event(
        &pool,
        MasterDataEvent::new(
            tenant_id,
            MasterDataDomain::Material,
            MasterDataAction::Updated,
            master_data_id.clone(),
            "MAT-0001".to_string(),
            "pdm",
            json!({"name": "测试物料-改名", "status": "inactive"}),
        ),
    )
    .await
    .expect("consume updated");
    assert_eq!(count_refs(&pool, tenant_id).await, 1);
    let (name, status, code, version) = fetch_ref(&pool, tenant_id, &master_data_id).await;
    assert_eq!(name, "测试物料-改名");
    assert_eq!(status, "inactive");
    assert_eq!(code, "MAT-0001");
    assert_eq!(version, 3);

    // 4) 删除事件：软删除同一行，不新增
    consume_master_data_event(
        &pool,
        MasterDataEvent::new(
            tenant_id,
            MasterDataDomain::Material,
            MasterDataAction::Deleted,
            master_data_id.clone(),
            String::new(),
            "pdm",
            json!({}),
        ),
    )
    .await
    .expect("consume deleted");
    assert_eq!(count_refs(&pool, tenant_id).await, 1);
    assert_eq!(
        fetch_ref(&pool, tenant_id, &master_data_id).await.1,
        "deleted"
    );

    // 5) 旧格式（不稳定 ID）事件被跳过，不制造重复行
    consume_master_data_event(
        &pool,
        MasterDataEvent::new(
            tenant_id,
            MasterDataDomain::Material,
            MasterDataAction::Created,
            "mat-20260101-deadbeef".to_string(),
            "MAT-LEGACY".to_string(),
            "pdm",
            json!({"name": "旧格式物料", "status": "active"}),
        ),
    )
    .await
    .expect("consume legacy id");
    assert_eq!(count_refs(&pool, tenant_id).await, 1);

    // 6) 无租户事件被跳过
    consume_master_data_event(
        &pool,
        MasterDataEvent::new(
            Uuid::nil(),
            MasterDataDomain::Material,
            MasterDataAction::Created,
            master_data_id_for(MasterDataDomain::Material, Uuid::new_v4()),
            "MAT-NOTENANT".to_string(),
            "pdm",
            json!({"name": "无租户物料", "status": "active"}),
        ),
    )
    .await
    .expect("consume nil tenant");
    assert_eq!(count_refs(&pool, tenant_id).await, 1);

    // 7) 4 次有效写入（1 次插入 + 3 次更新/软删）只应产生 1 次插入
    let inserted = wait_insert_delta(&pool, REFS_TABLE, insert_baseline, 1).await;
    assert!(
        inserted - insert_baseline <= 1,
        "期望只有 1 次 INSERT，实际增量 {}",
        inserted - insert_baseline
    );

    cleanup(&pool, tenant_id).await;
}
