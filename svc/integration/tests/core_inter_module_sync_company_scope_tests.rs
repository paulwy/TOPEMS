#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! W12-A2 `integration.core_inter_module_sync` 公司级隔离验证（2026-11-23）。
//!
//! 直接执行 `database/migrations/20261123100000_core_inter_module_sync_company_scope.sql`
//! 的真实 SQL，覆盖：
//!   1. 公司 actor 写本公司行成功；
//!   2. 公司 actor 写集团级行（company_id IS NULL）被 RLS 拒绝（42501）；
//!   3. 公司 actor 写同租户兄弟公司行被拒（42501）；
//!   4. 母公司视角可读子公司行与集团级行，子公司看不到兄弟公司与集团级行；
//!   5. 回填：data->>'company_id' 命中 → 该司；单公司租户 → 唯一公司；无痕迹/他司 → NULL。
//!
//! 运行：
//! ```bash
//! DATABASE_URL=postgres://... cargo test -p topems-integration \
//!   --features db-tests --test core_inter_module_sync_company_scope_tests
//! ```
#![cfg(feature = "db-tests")]

use sqlx::{PgPool, Postgres, Transaction};
use uuid::Uuid;

const MIGRATION_SQL: &str = include_str!(
    "../../../database/migrations/20261123100000_core_inter_module_sync_company_scope.sql"
);

async fn setup_tables(pool: &PgPool) {
    for stmt in [
        "CREATE SCHEMA IF NOT EXISTS hrm",
        "CREATE SCHEMA IF NOT EXISTS erp",
        "CREATE SCHEMA IF NOT EXISTS integration",
        r#"CREATE TABLE IF NOT EXISTS hrm.companies (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id uuid NOT NULL,
            name varchar(255) NOT NULL,
            status varchar(20) NOT NULL DEFAULT 'active',
            created_at timestamptz NOT NULL DEFAULT now(),
            UNIQUE (tenant_id, id)
        )"#,
        r#"CREATE TABLE IF NOT EXISTS integration.core_inter_module_sync (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id uuid,
            status varchar(20) NOT NULL DEFAULT 'pending',
            sync_type varchar(50) NOT NULL DEFAULT 'manual',
            source_module varchar(50),
            target_module varchar(50),
            operation varchar(20),
            entity_type varchar(50),
            entity_ids jsonb,
            error_message text,
            started_at timestamptz,
            finished_at timestamptz,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now(),
            deleted_at timestamptz,
            data jsonb
        )"#,
        // 与 20261114180000 / 20261121235940 保持一致的 erp 公司维度函数。
        r#"CREATE OR REPLACE FUNCTION erp.group_tenant_of(p_tenant uuid)
        RETURNS uuid LANGUAGE sql STABLE PARALLEL SAFE
        SET search_path = pg_catalog, pg_temp
        AS $fn$
            SELECT CASE
                WHEN p_tenant IS NULL THEN NULL
                WHEN p_tenant = '00000000-0000-0000-0000-000000000000'::uuid THEN NULL
                ELSE p_tenant
            END
        $fn$"#,
        r#"CREATE OR REPLACE FUNCTION erp.current_company_id()
        RETURNS uuid LANGUAGE sql STABLE PARALLEL SAFE
        SET search_path = pg_catalog, pg_temp
        AS $fn$
            SELECT CASE
                WHEN v IS NULL OR v = '' OR v = '00000000-0000-0000-0000-000000000000' THEN NULL
                ELSE v::uuid
            END
            FROM (SELECT NULLIF(current_setting('app.company_id', true), '') AS v) s
        $fn$"#,
        r#"CREATE OR REPLACE FUNCTION erp.parent_visible_company_ids()
        RETURNS uuid[] LANGUAGE sql STABLE PARALLEL SAFE
        SET search_path = pg_catalog, pg_temp
        AS $fn$
            SELECT CASE
                WHEN COALESCE(current_setting('app.actor_is_parent', true), 'off') <> 'on'
                    THEN ARRAY[]::uuid[]
                ELSE COALESCE(
                    string_to_array(NULLIF(current_setting('app.visible_company_ids', true), ''), ','),
                    ARRAY[]::text[]
                )::uuid[]
            END
        $fn$"#,
        r#"CREATE OR REPLACE FUNCTION erp.company_readable(p_company uuid)
        RETURNS boolean LANGUAGE sql STABLE PARALLEL SAFE
        SET search_path = pg_catalog, pg_temp
        AS $fn$
            SELECT p_company IS NOT NULL
               AND (
                   p_company = erp.current_company_id()
                   OR p_company = ANY (erp.parent_visible_company_ids())
               )
        $fn$"#,
        r#"CREATE POLICY rls_tenant_isolation ON integration.core_inter_module_sync
            USING (
                COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
                OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
            )
            WITH CHECK (
                COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
                OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
            )"#,
    ] {
        sqlx::query(stmt).execute(pool).await.unwrap();
    }
}

async fn insert_company(pool: &PgPool, tenant: Uuid, name: &str) -> Uuid {
    sqlx::query_scalar("INSERT INTO hrm.companies (tenant_id, name) VALUES ($1, $2) RETURNING id")
        .bind(tenant)
        .bind(name)
        .fetch_one(pool)
        .await
        .unwrap()
}

/// 迁移前写入存量任务（此时尚未 ENABLE RLS）。
async fn insert_legacy_task(
    pool: &PgPool,
    tenant: Uuid,
    sync_type: &str,
    data: Option<serde_json::Value>,
) -> Uuid {
    sqlx::query_scalar(
        "INSERT INTO integration.core_inter_module_sync (tenant_id, sync_type, status, data)
         VALUES ($1, $2, 'pending', $3) RETURNING id",
    )
    .bind(tenant)
    .bind(sync_type)
    .bind(data)
    .fetch_one(pool)
    .await
    .unwrap()
}

async fn enable_rls(pool: &PgPool) {
    for stmt in [
        "ALTER TABLE integration.core_inter_module_sync ENABLE ROW LEVEL SECURITY",
        "ALTER TABLE integration.core_inter_module_sync FORCE ROW LEVEL SECURITY",
    ] {
        sqlx::query(stmt).execute(pool).await.unwrap();
    }
}

/// 系统通道读事务：迁移前种子与迁移后断言都需要看全量行（含租户谓词）。
async fn system_tx<'a>(pool: &'a PgPool, tenant: Uuid) -> Transaction<'a, Postgres> {
    let mut tx = pool.begin().await.unwrap();
    sqlx::query("SET LOCAL row_security = on")
        .execute(&mut *tx)
        .await
        .unwrap();
    sqlx::query(
        "SELECT set_config('app.tenant_id', $1, true), \
                set_config('app.rls_system', 'on', true), \
                set_config('app.company_id', '', true), \
                set_config('app.actor_is_parent', 'off', true), \
                set_config('app.visible_company_ids', '', true)",
    )
    .bind(tenant.to_string())
    .execute(&mut *tx)
    .await
    .unwrap();
    tx
}

/// 以「请求级」事务写入与 `tenant_middleware` 一致的 GUC。
async fn actor_tx<'a>(
    pool: &'a PgPool,
    tenant: Uuid,
    company: Option<Uuid>,
    actor_is_parent: bool,
    visible: &[Uuid],
) -> Transaction<'a, Postgres> {
    let mut tx = pool.begin().await.unwrap();
    sqlx::query("SET LOCAL row_security = on")
        .execute(&mut *tx)
        .await
        .unwrap();
    let visible_csv = visible
        .iter()
        .map(|id| id.to_string())
        .collect::<Vec<_>>()
        .join(",");
    sqlx::query(
        "SELECT set_config('app.tenant_id', $1, true), \
                set_config('app.rls_system', 'off', true), \
                set_config('app.company_id', $2, true), \
                set_config('app.actor_is_parent', $3, true), \
                set_config('app.visible_company_ids', $4, true)",
    )
    .bind(tenant.to_string())
    .bind(company.map(|c| c.to_string()).unwrap_or_default())
    .bind(if actor_is_parent { "on" } else { "off" })
    .bind(visible_csv)
    .execute(&mut *tx)
    .await
    .unwrap();
    tx
}

fn rls_violation(error: &sqlx::Error) -> bool {
    matches!(error, sqlx::Error::Database(db) if db.code().as_deref() == Some("42501"))
}

async fn company_of(
    tx: &mut Transaction<'_, Postgres>,
    id: Uuid,
) -> Result<Option<Uuid>, sqlx::Error> {
    sqlx::query_scalar("SELECT company_id FROM integration.core_inter_module_sync WHERE id = $1")
        .bind(id)
        .fetch_one(&mut **tx)
        .await
}

struct Fixture {
    tenant: Uuid,
    other_tenant: Uuid,
    single_tenant: Uuid,
    parent: Uuid,
    child: Uuid,
    sibling: Uuid,
    other_company: Uuid,
    group_id: Uuid,
    data_hit_id: Uuid,
    sibling_task_id: Uuid,
    single_id: Uuid,
    foreign_id: Uuid,
}

async fn prepare(pool: &PgPool) -> Fixture {
    setup_tables(pool).await;
    let tenant = Uuid::new_v4();
    let other_tenant = Uuid::new_v4();
    let single_tenant = Uuid::new_v4();
    let parent = insert_company(pool, tenant, "集团母公司").await;
    let child = insert_company(pool, tenant, "子公司").await;
    let sibling = insert_company(pool, tenant, "兄弟公司").await;
    let other_company = insert_company(pool, other_tenant, "他租户公司").await;
    insert_company(pool, single_tenant, "单公司租户").await;

    // 迁移前存量行：多公司无痕迹 / data 命中子公司 / 兄弟公司任务 / 单公司租户 / data 指向他租户公司。
    let group_id = insert_legacy_task(pool, tenant, "group_task", None).await;
    let data_hit_id = insert_legacy_task(
        pool,
        tenant,
        "data_hit",
        Some(serde_json::json!({ "company_id": child })),
    )
    .await;
    let sibling_task_id = insert_legacy_task(
        pool,
        tenant,
        "sibling_task",
        Some(serde_json::json!({ "company_id": sibling })),
    )
    .await;
    let single_id = insert_legacy_task(pool, single_tenant, "single_tenant", None).await;
    let foreign_id = insert_legacy_task(
        pool,
        tenant,
        "data_foreign",
        Some(serde_json::json!({ "company_id": other_company })),
    )
    .await;

    enable_rls(pool).await;
    sqlx::raw_sql(MIGRATION_SQL).execute(pool).await.unwrap();

    Fixture {
        tenant,
        other_tenant,
        single_tenant,
        parent,
        child,
        sibling,
        other_company,
        group_id,
        data_hit_id,
        sibling_task_id,
        single_id,
        foreign_id,
    }
}

#[sqlx::test(migrations = false)]
async fn backfill_attributes_company_and_keeps_group_tasks(pool: PgPool) {
    let f = prepare(&pool).await;

    let mut tx = system_tx(&pool, f.tenant).await;
    let group_company = company_of(&mut tx, f.group_id).await.unwrap();
    let hit_company = company_of(&mut tx, f.data_hit_id).await.unwrap();
    let foreign_company = company_of(&mut tx, f.foreign_id).await.unwrap();
    tx.rollback().await.unwrap();

    assert_eq!(group_company, None, "多公司租户无痕迹任务应保留为集团级行");
    assert_eq!(
        hit_company,
        Some(f.child),
        "data->>company_id 命中应回填该司"
    );
    assert_eq!(foreign_company, None, "data 指向他租户公司时不得回填");

    let mut tx = system_tx(&pool, f.single_tenant).await;
    let single_company: Option<Uuid> = sqlx::query_scalar(
        "SELECT company_id FROM integration.core_inter_module_sync WHERE id = $1",
    )
    .bind(f.single_id)
    .fetch_one(&mut *tx)
    .await
    .unwrap();
    tx.rollback().await.unwrap();
    assert!(single_company.is_some(), "单公司租户的任务应回填唯一公司");
    assert_ne!(single_company, Some(f.other_company));
}

#[sqlx::test(migrations = false)]
async fn company_actor_can_write_own_company_row(pool: PgPool) {
    let f = prepare(&pool).await;

    let mut tx = actor_tx(&pool, f.tenant, Some(f.child), false, &[]).await;
    sqlx::query(
        "INSERT INTO integration.core_inter_module_sync
            (tenant_id, company_id, sync_type, status)
         VALUES ($1, $2, 'purchase_order_sync', 'pending')",
    )
    .bind(f.tenant)
    .bind(f.child)
    .execute(&mut *tx)
    .await
    .expect("本公司视角写本公司同步任务必须成功");

    let own: i64 = sqlx::query_scalar(
        "SELECT COUNT(*)::bigint FROM integration.core_inter_module_sync
          WHERE company_id = $1 AND sync_type = 'purchase_order_sync'",
    )
    .bind(f.child)
    .fetch_one(&mut *tx)
    .await
    .unwrap();
    assert_eq!(own, 1, "本公司应看到自己刚写入的任务");
    tx.rollback().await.unwrap();
}

#[sqlx::test(migrations = false)]
async fn company_actor_cannot_write_group_task(pool: PgPool) {
    let f = prepare(&pool).await;

    let mut tx = actor_tx(&pool, f.tenant, Some(f.child), false, &[]).await;
    let err = sqlx::query(
        "INSERT INTO integration.core_inter_module_sync
            (tenant_id, company_id, sync_type, status)
         VALUES ($1, NULL, 'group_task', 'pending')",
    )
    .bind(f.tenant)
    .execute(&mut *tx)
    .await
    .expect_err("子公司不得发起集团级任务");
    assert!(
        rls_violation(&err),
        "集团级写入应触发 RLS 42501，实际: {err}"
    );
    tx.rollback().await.unwrap();
}

#[sqlx::test(migrations = false)]
async fn company_actor_cannot_write_sibling_company_row(pool: PgPool) {
    let f = prepare(&pool).await;

    let mut tx = actor_tx(&pool, f.tenant, Some(f.child), false, &[]).await;
    let err = sqlx::query(
        "INSERT INTO integration.core_inter_module_sync
            (tenant_id, company_id, sync_type, status)
         VALUES ($1, $2, 'purchase_order_sync', 'pending')",
    )
    .bind(f.tenant)
    .bind(f.sibling)
    .execute(&mut *tx)
    .await
    .expect_err("不得代写同租户兄弟公司任务");
    assert!(rls_violation(&err), "他司写入应触发 RLS 42501，实际: {err}");
    tx.rollback().await.unwrap();
}

#[sqlx::test(migrations = false)]
async fn parent_reads_children_and_group_but_child_cannot_see_sibling(pool: PgPool) {
    let f = prepare(&pool).await;

    // 母公司视角：visible 含子公司，可读子公司回填行与集团级行。
    let mut tx = actor_tx(&pool, f.tenant, Some(f.parent), true, &[f.child]).await;
    let visible: i64 = sqlx::query_scalar(
        "SELECT COUNT(*)::bigint FROM integration.core_inter_module_sync WHERE id = ANY($1)",
    )
    .bind(vec![f.group_id, f.data_hit_id])
    .fetch_one(&mut *tx)
    .await
    .unwrap();
    tx.rollback().await.unwrap();
    assert_eq!(visible, 2, "母公司应同时看到集团级任务与子公司任务");

    // 子公司视角：只看本公司行；集团级与兄弟公司均不可见。
    let mut tx = actor_tx(&pool, f.tenant, Some(f.sibling), false, &[]).await;
    let group_visible: i64 = sqlx::query_scalar(
        "SELECT COUNT(*)::bigint FROM integration.core_inter_module_sync WHERE id = $1",
    )
    .bind(f.group_id)
    .fetch_one(&mut *tx)
    .await
    .unwrap();
    let child_visible: i64 = sqlx::query_scalar(
        "SELECT COUNT(*)::bigint FROM integration.core_inter_module_sync WHERE id = $1",
    )
    .bind(f.data_hit_id)
    .fetch_one(&mut *tx)
    .await
    .unwrap();
    tx.rollback().await.unwrap();
    assert_eq!(group_visible, 0, "子公司不得看到集团级任务");
    assert_eq!(child_visible, 0, "子公司不得看到兄弟公司任务");
}

#[sqlx::test(migrations = false)]
async fn child_cannot_update_sibling_or_group_rows(pool: PgPool) {
    let f = prepare(&pool).await;

    let mut tx = actor_tx(&pool, f.tenant, Some(f.child), false, &[]).await;
    let sibling_affected = sqlx::query(
        "UPDATE integration.core_inter_module_sync SET status = 'processing' WHERE id = $1",
    )
    .bind(f.sibling_task_id)
    .execute(&mut *tx)
    .await
    .expect("RLS 应过滤他司行，而不是报错")
    .rows_affected();
    let group_affected = sqlx::query(
        "UPDATE integration.core_inter_module_sync SET status = 'processing' WHERE id = $1",
    )
    .bind(f.group_id)
    .execute(&mut *tx)
    .await
    .expect("RLS 应过滤集团级行，而不是报错")
    .rows_affected();
    tx.rollback().await.unwrap();

    assert_eq!(sibling_affected, 0, "子公司不得改写他司任务");
    assert_eq!(group_affected, 0, "子公司不得改写集团级任务");
    let _ = f.other_tenant;
}
