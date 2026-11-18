#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! Redis 网络级消费验收：XADD → 订阅 → 消费 → refs 收敛
//!
//! 走真实 `MasterDataEvent::publish()` 路径（Redis Stream XADD），由真实
//! `EventSubscriber` 订阅消费，最终落到 `core_master_data_refs`。
//!
//! 运行方式（`TEST_REDIS_URL` 必须指向**隔离的 Redis DB**，测试会清理该域的
//! stream 与消费组；未设置时自动跳过，便于无 Redis 的 CI 环境）：
//! ```bash
//! TEST_DATABASE_URL=postgres://topems_test_runner@127.0.0.1:5432/topems_test_runner \
//! TEST_REDIS_URL=redis://127.0.0.1:6379/15 \
//!   cargo test -p topems-unified-core --test master_redis_consumer_e2e -- --test-threads=1 --nocapture
//! ```

use serde_json::json;
use sqlx::{AssertSqlSafe, PgPool};
use std::time::Duration;
use tokio::time::{sleep, Instant};
use topems_shared_db::scope::Db;
use topems_shared_event::event::{
    master_data_id_for, EventSubscriber, MasterDataAction, MasterDataDomain, MasterDataEvent,
};
use topems_unified_core::modules::master::consumer::consume_master_data_event;
use uuid::Uuid;

const STREAM_KEY: &str = "topems:stream:master_data:mat";
const REFS_TABLE: &str = "core_master_data_refs";

async fn count_refs(pool: &PgPool, tenant_id: Uuid) -> i64 {
    let db = Db::new(pool.clone(), "public, shared");
    let mut scope = db.scope_for_tenant(tenant_id).await.expect("scope txn");
    let count: i64 =
        sqlx::query_scalar("SELECT count(*) FROM public.core_master_data_refs WHERE tenant_id = $1")
            .bind(tenant_id)
            .fetch_one(&mut scope)
            .await
            .expect("count refs");
    scope.commit().await.expect("commit count");
    count
}

/// 行可能尚未落库，返回 None 避免在清理前 panic
async fn fetch_ref_opt(pool: &PgPool, tenant_id: Uuid, master_data_id: &str) -> Option<(String, String, i32)> {
    let db = Db::new(pool.clone(), "public, shared");
    let mut scope = db.scope_for_tenant(tenant_id).await.expect("scope txn");
    let row: Option<(String, String, i32)> = sqlx::query_as(
        "SELECT name, status, version FROM public.core_master_data_refs \
         WHERE tenant_id = $1 AND master_data_id = $2",
    )
    .bind(tenant_id)
    .bind(master_data_id)
    .fetch_optional(&mut scope)
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

/// n_tup_ins 由统计收集器异步刷新，轮询到增量达标或超时
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

/// 轮询等待，返回是否在超时前满足条件
async fn wait_until<F, Fut>(timeout: Duration, mut check: F) -> bool
where
    F: FnMut() -> Fut,
    Fut: std::future::Future<Output = bool>,
{
    let deadline = Instant::now() + timeout;
    loop {
        if check().await {
            return true;
        }
        if Instant::now() >= deadline {
            return false;
        }
        sleep(Duration::from_millis(200)).await;
    }
}

async fn cleanup_pg(pool: &PgPool, tenant_id: Uuid) {
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
async fn redis_publish_twice_converges_to_one_ref_and_acks() {
    let Some(redis_url) = std::env::var("TEST_REDIS_URL").ok() else {
        eprintln!("SKIP: TEST_REDIS_URL 未设置（需要隔离 Redis DB 才能跑网络级消费测试）");
        return;
    };
    // MasterDataEvent::publish 与 EventSubscriber 都读 REDIS_URL
    std::env::set_var("REDIS_URL", &redis_url);

    topems_test_support::ensure_test_dsn();
    let pool = PgPool::connect(&topems_test_support::test_database_url())
        .await
        .expect("connect test db");

    let tenant_id = Uuid::new_v4();
    cleanup_pg(&pool, tenant_id).await;

    let entity_id = Uuid::new_v4();
    let master_data_id = master_data_id_for(MasterDataDomain::Material, entity_id);
    let group = format!("unified-core-mdm-refs-test-{}", Uuid::new_v4());

    // 预建消费组并从 $ 开始：避免启动后重放 Redis 中的历史事件
    let client = redis::Client::open(redis_url.as_str()).expect("open redis");
    let mut con = client
        .get_multiplexed_async_connection()
        .await
        .expect("redis connection");
    let created: Result<String, redis::RedisError> = redis::cmd("XGROUP")
        .arg("CREATE")
        .arg(STREAM_KEY)
        .arg(&group)
        .arg("$")
        .arg("MKSTREAM")
        .query_async(&mut con)
        .await;
    if let Err(e) = &created {
        assert!(
            e.to_string().contains("BUSYGROUP"),
            "预建消费组失败: {e}"
        );
    }

    // 真实订阅路径：EventSubscriber + 生产消费函数
    let subscriber = EventSubscriber::new_with_mode("unified-core-mdm-refs-test", true)
        .expect("build subscriber")
        .with_consumer_group(group.clone())
        .subscribe_master_data_handler(vec![MasterDataDomain::Material], {
            let pool = pool.clone();
            move |event| {
                let pool = pool.clone();
                Box::pin(async move { consume_master_data_event(&pool, event).await })
            }
        });
    let handle = tokio::spawn(async move {
        let _ = subscriber.start_listening().await;
    });

    let insert_baseline = tuple_inserted(&pool, REFS_TABLE).await;

    // —— 第一次发布：XADD → 消费 → 插入 1 行
    MasterDataEvent::new(
        tenant_id,
        MasterDataDomain::Material,
        MasterDataAction::Created,
        master_data_id.clone(),
        "MAT-REDIS-001".to_string(),
        "pdm",
        json!({"name": "Redis 物料", "status": "active"}),
    )
    .publish()
    .await
    .expect("publish first event");

    let first_ok = wait_until(Duration::from_secs(15), || {
        let pool = pool.clone();
        async move { count_refs(&pool, tenant_id).await == 1 }
    })
    .await;
    assert!(first_ok, "首次发布后 refs 未在超时内出现");

    // —— 第二次发布：同一实体 → 仍 1 行，内容更新
    MasterDataEvent::new(
        tenant_id,
        MasterDataDomain::Material,
        MasterDataAction::Updated,
        master_data_id.clone(),
        "MAT-REDIS-001".to_string(),
        "pdm",
        json!({"name": "Redis 物料-变更", "status": "inactive"}),
    )
    .publish()
    .await
    .expect("publish second event");

    let second_ok = wait_until(Duration::from_secs(15), || {
        let pool = pool.clone();
        let master_data_id = master_data_id.clone();
        async move {
            fetch_ref_opt(&pool, tenant_id, &master_data_id)
                .await
                .is_some_and(|(_, _, version)| version >= 2)
        }
    })
    .await;

    // —— 消费组 pending 已 ACK
    let acked = wait_until(Duration::from_secs(15), || {
        let mut con = con.clone();
        let group = group.clone();
        async move {
            let pending: Vec<redis::Value> = redis::cmd("XPENDING")
                .arg(STREAM_KEY)
                .arg(&group)
                .arg("-")
                .arg("+")
                .arg(10)
                .query_async(&mut con)
                .await
                .unwrap_or_default();
            pending.is_empty()
        }
    })
    .await;

    // —— 两次发布只应产生 1 次 INSERT（统计异步刷新，轮询等待）
    let inserted = wait_insert_delta(&pool, REFS_TABLE, insert_baseline, 1).await;

    // —— 先读观测值，再清理，最后断言：断言失败也不会残留 stream/group/租户行
    let ref_count = count_refs(&pool, tenant_id).await;
    let snapshot = fetch_ref_opt(&pool, tenant_id, &master_data_id).await;

    handle.abort();
    let _: Result<i64, redis::RedisError> = redis::cmd("XGROUP")
        .arg("DESTROY")
        .arg(STREAM_KEY)
        .arg(&group)
        .query_async(&mut con)
        .await;
    let _: Result<i64, redis::RedisError> = redis::cmd("DEL")
        .arg(STREAM_KEY)
        .query_async(&mut con)
        .await;
    cleanup_pg(&pool, tenant_id).await;

    assert!(second_ok, "第二次发布未被消费（version 未增长）");
    assert_eq!(
        ref_count, 1,
        "同一实体连续发布两次后 refs 必须仍为 1 行"
    );
    let (name, status, _version) = snapshot.expect("refs 行应存在");
    assert_eq!(name, "Redis 物料-变更");
    assert_eq!(status, "inactive");
    assert!(acked, "消费组仍有未 ACK 的 pending 消息");
    assert_eq!(
        inserted - insert_baseline,
        1,
        "两次发布应只产生 1 次 INSERT（baseline={insert_baseline}, current={inserted}）"
    );
}
