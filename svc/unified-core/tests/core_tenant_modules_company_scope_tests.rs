#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! W12-A1 `public.core_tenant_modules` 公司级隔离验证（2026-11-23）。
//!
//! 直接执行 `database/migrations/20261123090000_core_tenant_modules_company_scope.sql`
//! 的真实 SQL，覆盖四类行为：
//!   1. 写公司行成功；
//!   2. 改母版行（company_id IS NULL）被拒（UPDATE 0 行 / INSERT 触发 RLS 42501）；
//!   3. 写他司行被拒（同租户兄弟公司，RLS 42501）；
//!   4. 母公司视角可读子公司，单公司视角不可读。
//!
//! 运行：
//! ```bash
//! DATABASE_URL=postgres://... cargo test -p topems-unified-core \
//!   --features db-tests --test core_tenant_modules_company_scope_tests
//! ```
#![cfg(feature = "db-tests")]

use sqlx::{PgPool, Postgres, Transaction};
use uuid::Uuid;

const MIGRATION_SQL: &str = include_str!(
    "../../../database/migrations/20261123090000_core_tenant_modules_company_scope.sql"
);

async fn setup_tables(pool: &PgPool) {
    for stmt in [
        "CREATE SCHEMA IF NOT EXISTS hrm",
        "CREATE SCHEMA IF NOT EXISTS erp",
        r#"CREATE TABLE IF NOT EXISTS hrm.companies (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id uuid NOT NULL,
            name varchar(255) NOT NULL,
            status varchar(20) NOT NULL DEFAULT 'active',
            created_at timestamptz NOT NULL DEFAULT now(),
            UNIQUE (tenant_id, id)
        )"#,
        r#"CREATE TABLE IF NOT EXISTS public.core_tenant_modules (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id uuid NOT NULL,
            module_code varchar(120) NOT NULL,
            module_name varchar(200),
            tier varchar(20) NOT NULL DEFAULT 'basic',
            is_active boolean NOT NULL DEFAULT true,
            activated_at timestamptz NOT NULL DEFAULT now(),
            expires_at timestamptz,
            UNIQUE (tenant_id, module_code)
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

async fn insert_master(pool: &PgPool, tenant: Uuid, code: &str) -> Uuid {
    sqlx::query_scalar(
        "INSERT INTO public.core_tenant_modules (tenant_id, module_code, module_name, is_active)
         VALUES ($1, $2, $3, TRUE) RETURNING id",
    )
    .bind(tenant)
    .bind(code)
    .bind(format!("{code} 母版"))
    .fetch_one(pool)
    .await
    .unwrap()
}

/// 以「请求级」事务写入与 `tenant_middleware` 一致的 GUC。
///
/// `sqlx::test` 的连接角色（`topems_test_runner`）不是超级用户、也不带 BYPASSRLS；
/// 表由它创建且 `FORCE ROW LEVEL SECURITY`，因此不必切换角色即可让 RLS 生效。
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

async fn enable_rls(pool: &PgPool) {
    for stmt in [
        "ALTER TABLE public.core_tenant_modules ENABLE ROW LEVEL SECURITY",
        "ALTER TABLE public.core_tenant_modules FORCE ROW LEVEL SECURITY",
    ] {
        sqlx::query(stmt).execute(pool).await.unwrap();
    }
}

/// 系统通道读事务：迁移前的种子与迁移后的断言都需要看全量行。
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

struct Fixture {
    tenant: Uuid,
    parent: Uuid,
    child: Uuid,
    sibling: Uuid,
    master_id: Uuid,
}

async fn prepare(pool: &PgPool) -> Fixture {
    setup_tables(pool).await;
    let tenant = Uuid::new_v4();
    let other_tenant = Uuid::new_v4();
    let parent = insert_company(pool, tenant, "集团母公司").await;
    let child = insert_company(pool, tenant, "子公司").await;
    let sibling = insert_company(pool, tenant, "兄弟公司").await;
    insert_company(pool, other_tenant, "他租户公司").await;
    // RLS 启用前写入存量母版行（迁移要求存量行保持 company_id IS NULL）。
    let master_id = insert_master(pool, tenant, "crm:customer").await;
    insert_master(pool, other_tenant, "crm:customer").await;

    enable_rls(pool).await;
    sqlx::raw_sql(MIGRATION_SQL).execute(pool).await.unwrap();

    Fixture {
        tenant,
        parent,
        child,
        sibling,
        master_id,
    }
}

topems_test_support::sqlx_dsn_guard!();

#[sqlx::test(migrations = false)]
async fn company_actor_can_write_own_company_row(pool: PgPool) {
    let f = prepare(&pool).await;

    let mut tx = actor_tx(&pool, f.tenant, Some(f.child), false, &[]).await;
    sqlx::query(
        "INSERT INTO public.core_tenant_modules (tenant_id, company_id, module_code, is_active)
         VALUES ($1, $2, 'erp:sales_order', TRUE)",
    )
    .bind(f.tenant)
    .bind(f.child)
    .execute(&mut *tx)
    .await
    .expect("本公司视角写本公司开通行必须成功");

    let own: i64 = sqlx::query_scalar(
        "SELECT COUNT(*)::bigint FROM public.core_tenant_modules WHERE company_id = $1",
    )
    .bind(f.child)
    .fetch_one(&mut *tx)
    .await
    .unwrap();
    assert_eq!(own, 1, "本公司应看到自己刚写入的开通行");
    tx.rollback().await.unwrap();

    // 母公司路径不能被这条写入波及：子公司行只属于子公司。
    let mut check = system_tx(&pool, f.tenant).await;
    let by_company: i64 = sqlx::query_scalar(
        "SELECT COUNT(*)::bigint FROM public.core_tenant_modules WHERE company_id = $1",
    )
    .bind(f.child)
    .fetch_one(&mut *check)
    .await
    .unwrap();
    check.rollback().await.unwrap();
    assert_eq!(by_company, 0, "回滚后公司行不得残留");
}

#[sqlx::test(migrations = false)]
async fn master_row_cannot_be_modified_by_company_actor(pool: PgPool) {
    let f = prepare(&pool).await;

    let mut tx = actor_tx(&pool, f.tenant, Some(f.child), false, &[]).await;
    let affected =
        sqlx::query("UPDATE public.core_tenant_modules SET is_active = FALSE WHERE id = $1")
            .bind(f.master_id)
            .execute(&mut *tx)
            .await
            .expect("RLS 应把母版行过滤掉，而不是报错")
            .rows_affected();
    assert_eq!(affected, 0, "公司视角不得修改母版行");

    let err = sqlx::query(
        "INSERT INTO public.core_tenant_modules (tenant_id, company_id, module_code, is_active)
         VALUES ($1, NULL, 'erp:master_only', TRUE)",
    )
    .bind(f.tenant)
    .execute(&mut *tx)
    .await
    .unwrap_err();
    assert!(
        rls_violation(&err),
        "公司视角写母版行必须被 RLS 明确拒绝：{err:?}"
    );
    tx.rollback().await.unwrap();

    let mut check = system_tx(&pool, f.tenant).await;
    let active: bool =
        sqlx::query_scalar("SELECT is_active FROM public.core_tenant_modules WHERE id = $1")
            .bind(f.master_id)
            .fetch_one(&mut *check)
            .await
            .unwrap();
    check.rollback().await.unwrap();
    assert!(active, "母版行必须保持原值");
}

#[sqlx::test(migrations = false)]
async fn other_company_row_cannot_be_written(pool: PgPool) {
    let f = prepare(&pool).await;

    let mut tx = actor_tx(&pool, f.tenant, Some(f.child), false, &[]).await;
    let err = sqlx::query(
        "INSERT INTO public.core_tenant_modules (tenant_id, company_id, module_code, is_active)
         VALUES ($1, $2, 'wms:inbound', TRUE)",
    )
    .bind(f.tenant)
    .bind(f.sibling)
    .execute(&mut *tx)
    .await
    .unwrap_err();
    assert!(
        rls_violation(&err),
        "写同租户兄弟公司的开通行必须被 RLS 拒绝：{err:?}"
    );
    tx.rollback().await.unwrap();
}

#[sqlx::test(migrations = false)]
async fn parent_can_read_child_but_single_company_cannot(pool: PgPool) {
    let f = prepare(&pool).await;

    // 子公司、兄弟公司各自以本公司身份写入自己的开通记录（写路径合法）。
    for (company, code) in [(f.child, "erp:sales_order"), (f.sibling, "wms:inbound")] {
        let mut tx = actor_tx(&pool, f.tenant, Some(company), false, &[]).await;
        sqlx::query(
            "INSERT INTO public.core_tenant_modules (tenant_id, company_id, module_code, is_active)
             VALUES ($1, $2, $3, TRUE)",
        )
        .bind(f.tenant)
        .bind(company)
        .bind(code)
        .execute(&mut *tx)
        .await
        .unwrap();
        tx.commit().await.unwrap();
    }

    // 母公司视角：母版行 + 子公司行可见，兄弟公司行不可见。
    let mut tx = actor_tx(&pool, f.tenant, Some(f.parent), true, &[f.child]).await;
    let codes: Vec<String> = sqlx::query_scalar(
        "SELECT module_code FROM public.core_tenant_modules ORDER BY module_code",
    )
    .fetch_all(&mut *tx)
    .await
    .unwrap();
    assert_eq!(
        codes,
        vec!["crm:customer".to_string(), "erp:sales_order".to_string()],
        "母公司应看到母版目录与子公司开通，且不含他租户/兄弟公司行"
    );
    tx.rollback().await.unwrap();

    // 单公司视角（未声明母公司）：只能看到母版行。
    let mut tx = actor_tx(&pool, f.tenant, Some(f.parent), false, &[]).await;
    let codes: Vec<String> = sqlx::query_scalar(
        "SELECT module_code FROM public.core_tenant_modules ORDER BY module_code",
    )
    .fetch_all(&mut *tx)
    .await
    .unwrap();
    assert_eq!(
        codes,
        vec!["crm:customer".to_string()],
        "未声明母公司视角时不得读取子公司开通"
    );
    tx.rollback().await.unwrap();
}
