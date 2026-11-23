#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
#![cfg(feature = "db-tests")]
//! W13：search 投影 v1 + v2 双写验证（2026-11-23）。
//!
//! 覆盖：
//!   1. upsert 同时写 v1 与 v2，v2 保留 company_id；
//!   2. delete 同时删 v1 与 v2；
//!   3. v2 表不可用时（模拟迁移未应用）`apply_event` 仍返回 Ok 且 v1 已写入
//!      （v2 失败只告警入重试队列，绝不回滚 v1 / 不阻断主链路）；
//!   4. 载荷缺 company_id（旧格式）时 v2 行 company_id 为 NULL。
//!
//! 运行：
//! ```bash
//! DATABASE_URL=<DSN> cargo test -p topems-search --features db-tests \
//!   --test w13_dual_write_tests
//! ```

use sqlx::{PgPool, Row};
use topems_search::projection::apply_event;
use topems_shared_db::scope::Db;
use topems_shared_event::event::SearchableEntityChangedPayload;
use uuid::Uuid;

/// 三个用例共享同一组表（其中之一会 DROP v2），必须串行执行避免互相踩踏。
static TEST_LOCK: tokio::sync::Mutex<()> = tokio::sync::Mutex::const_new(());

async fn setup(pool: &PgPool) {
    // v1：与 migration 20261015000071 对齐的最小结构（测试库可能未应用迁移）。
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS public.search_entity_projections (
            tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
            entity_type VARCHAR(32) NOT NULL,
            entity_id UUID NOT NULL,
            name TEXT, contact_person TEXT, contact_phone TEXT, email TEXT,
            address TEXT, status TEXT, remark TEXT,
            source_updated_at TIMESTAMPTZ,
            projected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (tenant_id, entity_type, entity_id)
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
    recreate_v2(pool).await;
}

async fn recreate_v2(pool: &PgPool) {
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS public.search_entity_projections_v2 (
            tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
            company_id UUID,
            entity_type VARCHAR(32) NOT NULL,
            entity_id UUID NOT NULL,
            name TEXT, contact_person TEXT, contact_phone TEXT, email TEXT,
            address TEXT, status TEXT, remark TEXT,
            source_updated_at TIMESTAMPTZ,
            projected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (tenant_id, entity_type, entity_id)
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
}

fn payload(
    tenant: Uuid,
    company: Option<Uuid>,
    entity_id: Uuid,
    op: &str,
) -> SearchableEntityChangedPayload {
    SearchableEntityChangedPayload {
        entity_type: "sales_order".to_string(),
        entity_id,
        tenant_id: Some(tenant),
        company_id: company,
        op: op.to_string(),
        name: Some("SO-W13".to_string()),
        contact_person: None,
        contact_phone: None,
        email: None,
        address: None,
        status: Some("draft".to_string()),
        remark: None,
        source_updated_at: None,
    }
}

async fn count_v1(db: &Db, tenant: Uuid, entity_id: Uuid) -> i64 {
    // 测试库 v1 表开启了 FORCE RLS，必须走系统读通道才能全量计数。
    let mut scope = db.scope_read_system().await.unwrap();
    sqlx::query_scalar(
        "SELECT count(*) FROM public.search_entity_projections
         WHERE tenant_id = $1 AND entity_type = 'sales_order' AND entity_id = $2",
    )
    .bind(tenant)
    .bind(entity_id)
    .fetch_one(&mut scope)
    .await
    .unwrap()
}

async fn count_v2(db: &Db, tenant: Uuid, entity_id: Uuid) -> i64 {
    let mut scope = db.scope_read_system().await.unwrap();
    sqlx::query_scalar(
        "SELECT count(*) FROM public.search_entity_projections_v2
         WHERE tenant_id = $1 AND entity_type = 'sales_order' AND entity_id = $2",
    )
    .bind(tenant)
    .bind(entity_id)
    .fetch_one(&mut scope)
    .await
    .unwrap()
}

async fn company_in_v2(db: &Db, tenant: Uuid, entity_id: Uuid) -> Option<Uuid> {
    let mut scope = db.scope_read_system().await.unwrap();
    sqlx::query(
        "SELECT company_id FROM public.search_entity_projections_v2
         WHERE tenant_id = $1 AND entity_id = $2",
    )
    .bind(tenant)
    .bind(entity_id)
    .fetch_one(&mut scope)
    .await
    .unwrap()
    .try_get("company_id")
    .unwrap()
}

async fn cleanup(db: &Db, tenant: Uuid, entity_id: Uuid) {
    for table in [
        "public.search_entity_projections",
        "public.search_entity_projections_v2",
    ] {
        let mut scope = db.scope_system().await.unwrap();
        let _ = sqlx::query(sqlx::AssertSqlSafe(format!(
            "DELETE FROM {table} WHERE tenant_id = $1 AND entity_id = $2"
        )))
        .bind(tenant)
        .bind(entity_id)
        .execute(&mut scope)
        .await;
    }
}

#[tokio::test]
async fn upsert_writes_both_v1_and_v2_with_company() {
    let _guard = TEST_LOCK.lock().await;
    let Ok(pool) =
        PgPool::connect(&std::env::var("DATABASE_URL").expect("db-tests 需要 DATABASE_URL")).await
    else {
        eprintln!("跳过：无法连接 DATABASE_URL");
        return;
    };
    setup(&pool).await;
    let db = Db::new(pool.clone(), "public, shared");
    let tenant = Uuid::new_v4();
    let company = Uuid::new_v4();
    let entity_id = Uuid::new_v4();

    apply_event(&db, payload(tenant, Some(company), entity_id, "upsert"))
        .await
        .unwrap();

    assert_eq!(count_v1(&db, tenant, entity_id).await, 1);
    assert_eq!(count_v2(&db, tenant, entity_id).await, 1);
    assert_eq!(company_in_v2(&db, tenant, entity_id).await, Some(company));

    // delete 双写
    apply_event(&db, payload(tenant, Some(company), entity_id, "delete"))
        .await
        .unwrap();
    assert_eq!(count_v1(&db, tenant, entity_id).await, 0);
    assert_eq!(count_v2(&db, tenant, entity_id).await, 0);
    cleanup(&db, tenant, entity_id).await;
}

#[tokio::test]
async fn v2_failure_does_not_block_v1() {
    let _guard = TEST_LOCK.lock().await;
    let Ok(pool) =
        PgPool::connect(&std::env::var("DATABASE_URL").expect("db-tests 需要 DATABASE_URL")).await
    else {
        eprintln!("跳过：无法连接 DATABASE_URL");
        return;
    };
    setup(&pool).await;
    let db = Db::new(pool.clone(), "public, shared");
    let tenant = Uuid::new_v4();
    let entity_id = Uuid::new_v4();

    // 模拟 v2 迁移未应用：删表后 apply_event 必须仍成功且 v1 已写入。
    sqlx::query("DROP TABLE IF EXISTS public.search_entity_projections_v2")
        .execute(&pool)
        .await
        .unwrap();
    let res = apply_event(&db, payload(tenant, None, entity_id, "upsert")).await;
    assert!(
        res.is_ok(),
        "v2 失败不得让 apply_event 报错: {:?}",
        res.err()
    );
    assert_eq!(count_v1(&db, tenant, entity_id).await, 1);

    recreate_v2(&pool).await;
    cleanup(&db, tenant, entity_id).await;
}

#[tokio::test]
async fn legacy_payload_without_company_writes_null_company_in_v2() {
    let _guard = TEST_LOCK.lock().await;
    let Ok(pool) =
        PgPool::connect(&std::env::var("DATABASE_URL").expect("db-tests 需要 DATABASE_URL")).await
    else {
        eprintln!("跳过：无法连接 DATABASE_URL");
        return;
    };
    setup(&pool).await;
    let db = Db::new(pool.clone(), "public, shared");
    let tenant = Uuid::new_v4();
    let entity_id = Uuid::new_v4();

    apply_event(&db, payload(tenant, None, entity_id, "upsert"))
        .await
        .unwrap();
    assert!(
        company_in_v2(&db, tenant, entity_id).await.is_none(),
        "旧载荷无 company_id 时 v2 写 NULL（可空列）"
    );
    cleanup(&db, tenant, entity_id).await;
}
