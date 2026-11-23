#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
#![cfg(feature = "db-tests")]
//! W12-B2 `public.system_settings` 参数分级与公司级隔离验证（2026-11-23 回改）。
//!
//! 直接执行 `database/migrations/20261123120000_system_settings_company_scope.sql`
//! 的真实 SQL，覆盖：
//!   1. 存量租户级行统一保留为集团母版行（不推断、不阻断），平台行默认 platform_only；
//!   2. 三层取值顺序：本司行 > 集团母版行 > 平台默认行；
//!   3. 普通公司可覆盖母版键、可写本司行；
//!   4. platform_only 的键写公司行被触发器拒绝（42501），CHECK 禁止公司行写 platform_only；
//!   5. 普通公司写平台行被拒（UPDATE 0 行 / INSERT 42501）；
//!   6. 普通公司写同租户兄弟公司行被拒（42501）；
//!   7. 母公司可读子公司行，代写子公司 0 行 / INSERT 42501；
//!   8. 平台通道只维护平台参数行；
//!   9. 多公司租户的存量行不再阻断迁移，保留为母版；
//!  10. 有公司行时回滚明确中止，清理后回滚成功，可再次前向。
//!
//! 运行：
//! ```bash
//! DATABASE_URL=<topems_test_runner DSN> cargo test -p topems-erp \
//!   --features db-tests --test system_settings_company_scope_tests
//! ```
//! 注意：连接角色不得是 superuser / BYPASSRLS，否则 RLS 断言恒真（假绿）。

use sqlx::{PgPool, Postgres, Transaction};
use uuid::Uuid;

const MIGRATION_SQL: &str =
    include_str!("../../../database/migrations/20261123120000_system_settings_company_scope.sql");
const ROLLBACK_SQL: &str = include_str!(
    "../../../database/rollback/20261123120000_system_settings_company_scope.rollback.sql"
);

async fn setup_tables(pool: &PgPool) {
    for stmt in [
        "CREATE SCHEMA IF NOT EXISTS hrm",
        "CREATE SCHEMA IF NOT EXISTS erp",
        r#"CREATE TABLE IF NOT EXISTS hrm.companies (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id uuid NOT NULL,
            name varchar(255) NOT NULL,
            UNIQUE (tenant_id, id)
        )"#,
        // 与生产迁移前一致的 10 列 + 旧唯一索引 + 单条租户级策略。
        r#"CREATE TABLE IF NOT EXISTS public.system_settings (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            deleted_at timestamptz,
            tenant_id uuid,
            key varchar(200) NOT NULL DEFAULT '',
            value text,
            description text,
            category varchar(100),
            is_active boolean NOT NULL DEFAULT true,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now()
        )"#,
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_system_settings_tenant_key \
         ON public.system_settings (tenant_id, key)",
        "ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY",
        "ALTER TABLE public.system_settings FORCE ROW LEVEL SECURITY",
        r#"CREATE POLICY rls_tenant_isolation ON public.system_settings
            USING (
                COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
                OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
            )
            WITH CHECK (
                COALESCE(current_setting('app.rls_system', true), 'off') = 'on'
                OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
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
        // 回滚清理账本行需要。
        r#"CREATE TABLE IF NOT EXISTS public._sqlx_migrations (
            version bigint PRIMARY KEY,
            description text,
            installed_on timestamptz NOT NULL DEFAULT now(),
            success boolean NOT NULL DEFAULT true,
            checksum bytea,
            execution_time bigint
        )"#,
    ] {
        sqlx::query(stmt).execute(pool).await.unwrap();
    }
}

async fn run_sql(pool: &PgPool, sql: &'static str) -> Result<(), sqlx::Error> {
    let mut tx = pool.begin().await?;
    sqlx::raw_sql(sql).execute(&mut *tx).await?;
    tx.commit().await?;
    Ok(())
}

async fn insert_company(pool: &PgPool, tenant: Uuid, name: &str) -> Uuid {
    sqlx::query_scalar("INSERT INTO hrm.companies (tenant_id, name) VALUES ($1, $2) RETURNING id")
        .bind(tenant)
        .bind(name)
        .fetch_one(pool)
        .await
        .unwrap()
}

/// 系统通道事务：用于迁移前种子与迁移后跨租户断言。
async fn system_tx<'a>(pool: &'a PgPool, tenant: Option<Uuid>) -> Transaction<'a, Postgres> {
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
    .bind(tenant.map(|t| t.to_string()).unwrap_or_default())
    .execute(&mut *tx)
    .await
    .unwrap();
    tx
}

/// 请求级事务：写入与 `tenant_middleware` 一致的 GUC。
async fn actor_tx<'a>(
    pool: &'a PgPool,
    tenant: Uuid,
    company: Uuid,
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
    .bind(company.to_string())
    .bind(if actor_is_parent { "on" } else { "off" })
    .bind(visible_csv)
    .execute(&mut *tx)
    .await
    .unwrap();
    tx
}

fn sqlstate(error: &sqlx::Error) -> Option<String> {
    match error {
        sqlx::Error::Database(db) => db.code().map(|c| c.to_string()),
        _ => None,
    }
}

fn rls_violation(error: &sqlx::Error) -> bool {
    sqlstate(error).as_deref() == Some("42501")
}

/// 迁移前种子：平台参数行 / 租户级行（RLS 已开启，走系统通道）。
async fn seed_setting(pool: &PgPool, tenant: Option<Uuid>, key: &str, value: &str) {
    let mut tx = system_tx(pool, tenant).await;
    sqlx::query(
        "INSERT INTO public.system_settings (tenant_id, key, value, category)
         VALUES ($1, $2, $3, 'general')",
    )
    .bind(tenant)
    .bind(key)
    .bind(value)
    .execute(&mut *tx)
    .await
    .unwrap();
    tx.commit().await.unwrap();
}

/// 存量租户级行保留为母版；平台行默认 platform_only（fail-closed）。
#[sqlx::test(migrations = false)]
async fn migration_keeps_tenant_rows_as_master_and_locks_platform(pool: PgPool) {
    setup_tables(&pool).await;
    let tenant = Uuid::new_v4();
    let _company = insert_company(&pool, tenant, "单公司").await;
    seed_setting(&pool, None, "platform.key", "platform-value").await;
    seed_setting(&pool, Some(tenant), "single.key", "single-value").await;

    run_sql(&pool, MIGRATION_SQL).await.unwrap();

    let mut tx = system_tx(&pool, Some(tenant)).await;
    let master: (Option<Uuid>, String) = sqlx::query_as(
        "SELECT company_id, override_policy FROM public.system_settings
          WHERE tenant_id = $1 AND key = 'single.key'",
    )
    .bind(tenant)
    .fetch_one(&mut *tx)
    .await
    .unwrap();
    let platform: (Option<Uuid>, String) = sqlx::query_as(
        "SELECT company_id, override_policy FROM public.system_settings
          WHERE tenant_id IS NULL AND key = 'platform.key'",
    )
    .fetch_one(&mut *tx)
    .await
    .unwrap();
    tx.rollback().await.unwrap();

    assert_eq!(
        master.0, None,
        "存量租户级行必须保留为集团母版行，不推断公司"
    );
    assert_eq!(master.1, "company_overridable", "母版行默认公司可覆盖");
    assert_eq!(platform.0, None, "平台行必须保持 company_id NULL");
    assert_eq!(platform.1, "platform_only", "平台行默认平台锁定");
}

/// 三层取值顺序：本司行 > 集团母版行 > 平台默认行。
#[sqlx::test(migrations = false)]
async fn resolution_order_is_company_then_master_then_platform(pool: PgPool) {
    setup_tables(&pool).await;
    let tenant = Uuid::new_v4();
    let company = insert_company(&pool, tenant, "本公司").await;
    seed_setting(&pool, None, "platform.key", "platform-value").await;
    seed_setting(&pool, Some(tenant), "platform.key", "master-value").await;
    run_sql(&pool, MIGRATION_SQL).await.unwrap();

    let mut tx = actor_tx(&pool, tenant, company, false, &[]).await;
    let effective: String = sqlx::query_scalar(
        "SELECT value FROM public.system_settings
          WHERE (tenant_id IS NULL OR tenant_id = $1) AND key = 'platform.key'
          ORDER BY CASE
                       WHEN company_id = erp.current_company_id() THEN 0
                       WHEN company_id IS NULL AND tenant_id IS NOT NULL THEN 1
                       ELSE 2
                   END
          LIMIT 1",
    )
    .bind(tenant)
    .fetch_one(&mut *tx)
    .await
    .unwrap();
    assert_eq!(effective, "master-value", "母版行优先于平台默认行");

    sqlx::query(
        "INSERT INTO public.system_settings
             (tenant_id, company_id, key, value, category, override_policy)
         VALUES ($1, $2, 'platform.key', 'company-value', 'general', 'company_overridable')",
    )
    .bind(tenant)
    .bind(company)
    .execute(&mut *tx)
    .await
    .expect("母版行允许本司覆盖");

    let effective: String = sqlx::query_scalar(
        "SELECT value FROM public.system_settings
          WHERE (tenant_id IS NULL OR tenant_id = $1) AND key = 'platform.key'
          ORDER BY CASE
                       WHEN company_id = erp.current_company_id() THEN 0
                       WHEN company_id IS NULL AND tenant_id IS NOT NULL THEN 1
                       ELSE 2
                   END
          LIMIT 1",
    )
    .bind(tenant)
    .fetch_one(&mut *tx)
    .await
    .unwrap();
    assert_eq!(effective, "company-value", "本司行优先于母版行");
    tx.rollback().await.unwrap();
}

/// platform_only 的键不允许公司行：触发器 42501；CHECK 禁止公司行写 platform_only。
#[sqlx::test(migrations = false)]
async fn platform_only_key_rejects_company_override(pool: PgPool) {
    setup_tables(&pool).await;
    let tenant = Uuid::new_v4();
    let company = insert_company(&pool, tenant, "本公司").await;
    seed_setting(&pool, None, "locked.key", "locked").await;
    run_sql(&pool, MIGRATION_SQL).await.unwrap();

    let mut tx = actor_tx(&pool, tenant, company, false, &[]).await;
    let err = sqlx::query(
        "INSERT INTO public.system_settings
             (tenant_id, company_id, key, value, category, override_policy)
         VALUES ($1, $2, 'locked.key', 'override', 'general', 'company_overridable')",
    )
    .bind(tenant)
    .bind(company)
    .execute(&mut *tx)
    .await
    .expect_err("platform_only 的键不得写公司行");
    assert!(
        rls_violation(&err),
        "平台锁定应由触发器 42501 拒绝，实际: {err}"
    );
    tx.rollback().await.unwrap();

    let mut tx = actor_tx(&pool, tenant, company, false, &[]).await;
    let err = sqlx::query(
        "INSERT INTO public.system_settings
             (tenant_id, company_id, key, value, category, override_policy)
         VALUES ($1, $2, 'free.key', 'v', 'general', 'platform_only')",
    )
    .bind(tenant)
    .bind(company)
    .execute(&mut *tx)
    .await
    .expect_err("公司行不得声明 platform_only");
    assert_eq!(
        sqlstate(&err).as_deref(),
        Some("23514"),
        "应触发 CHECK 违反，实际: {err}"
    );
    tx.rollback().await.unwrap();
}

/// 普通公司：写平台行必须失败（INSERT 42501，UPDATE 0 行）。
#[sqlx::test(migrations = false)]
async fn company_actor_cannot_write_platform_rows(pool: PgPool) {
    setup_tables(&pool).await;
    let tenant = Uuid::new_v4();
    let company = insert_company(&pool, tenant, "本公司").await;
    seed_setting(&pool, None, "platform.key", "platform-value").await;

    run_sql(&pool, MIGRATION_SQL).await.unwrap();

    let mut tx = actor_tx(&pool, tenant, company, false, &[]).await;
    let affected = sqlx::query(
        "UPDATE public.system_settings SET value = 'hacked'
          WHERE tenant_id IS NULL AND company_id IS NULL AND key = 'platform.key'",
    )
    .execute(&mut *tx)
    .await
    .expect("RLS 应过滤平台行，而不是报错")
    .rows_affected();
    assert_eq!(affected, 0, "普通公司不得改写平台行");

    let insert_err = sqlx::query(
        "INSERT INTO public.system_settings (tenant_id, company_id, key, value)
         VALUES (NULL, NULL, 'rogue.platform', 'x')",
    )
    .execute(&mut *tx)
    .await
    .expect_err("普通公司不得插入平台行");
    assert!(
        rls_violation(&insert_err),
        "平台行写入应触发 RLS 42501，实际: {insert_err}"
    );
    tx.rollback().await.unwrap();
}

/// 普通公司：不得写同租户兄弟公司行。
#[sqlx::test(migrations = false)]
async fn company_actor_cannot_write_other_company_row(pool: PgPool) {
    setup_tables(&pool).await;
    let tenant = Uuid::new_v4();
    let company = insert_company(&pool, tenant, "本公司").await;
    let sibling = insert_company(&pool, tenant, "兄弟公司").await;

    run_sql(&pool, MIGRATION_SQL).await.unwrap();

    let mut tx = actor_tx(&pool, tenant, company, false, &[]).await;
    let affected = sqlx::query(
        "UPDATE public.system_settings SET value = 'hacked'
          WHERE company_id = $1 AND key = 'sibling.key'",
    )
    .bind(sibling)
    .execute(&mut *tx)
    .await
    .expect("RLS 应过滤他司行")
    .rows_affected();
    assert_eq!(affected, 0);

    let err = sqlx::query(
        "INSERT INTO public.system_settings
             (tenant_id, company_id, key, value, override_policy)
         VALUES ($1, $2, 'sibling.rogue', 'x', 'company_only')",
    )
    .bind(tenant)
    .bind(sibling)
    .execute(&mut *tx)
    .await
    .expect_err("不得代写兄弟公司参数");
    assert!(rls_violation(&err), "他司写入应触发 RLS 42501，实际: {err}");
    tx.rollback().await.unwrap();
}

/// 母公司：读子公司行可见，代写被拒。
#[sqlx::test(migrations = false)]
async fn parent_reads_child_row_but_cannot_write(pool: PgPool) {
    setup_tables(&pool).await;
    let tenant = Uuid::new_v4();
    let parent = insert_company(&pool, tenant, "母公司").await;
    let child = insert_company(&pool, tenant, "子公司").await;

    run_sql(&pool, MIGRATION_SQL).await.unwrap();
    let mut tx = actor_tx(&pool, tenant, child, false, &[]).await;
    sqlx::query(
        "INSERT INTO public.system_settings
             (tenant_id, company_id, key, value, category, override_policy)
         VALUES ($1, $2, 'child.key', 'child-value', 'general', 'company_only')",
    )
    .bind(tenant)
    .bind(child)
    .execute(&mut *tx)
    .await
    .unwrap();
    tx.commit().await.unwrap();

    let mut tx = actor_tx(&pool, tenant, parent, true, &[child]).await;
    let seen: i64 = sqlx::query_scalar(
        "SELECT COUNT(*)::bigint FROM public.system_settings WHERE company_id = $1",
    )
    .bind(child)
    .fetch_one(&mut *tx)
    .await
    .unwrap();
    assert_eq!(seen, 1, "母公司应读得到子公司行");

    let affected =
        sqlx::query("UPDATE public.system_settings SET value = 'hacked' WHERE company_id = $1")
            .bind(child)
            .execute(&mut *tx)
            .await
            .expect("RLS 应过滤子公司行，而不是报错")
            .rows_affected();
    assert_eq!(affected, 0, "母公司不得代写子公司行");

    let insert_err = sqlx::query(
        "INSERT INTO public.system_settings
             (tenant_id, company_id, key, value, override_policy)
         VALUES ($1, $2, 'child.rogue', 'x', 'company_only')",
    )
    .bind(tenant)
    .bind(child)
    .execute(&mut *tx)
    .await
    .expect_err("母公司不得插入子公司行");
    assert!(
        rls_violation(&insert_err),
        "代写子公司应触发 RLS 42501，实际: {insert_err}"
    );
    tx.rollback().await.unwrap();
}

/// 平台通道：只维护平台参数行，且只落 `company_id IS NULL`。
#[sqlx::test(migrations = false)]
async fn platform_channel_maintains_platform_rows_only(pool: PgPool) {
    setup_tables(&pool).await;
    run_sql(&pool, MIGRATION_SQL).await.unwrap();

    let mut tx = system_tx(&pool, None).await;
    sqlx::query(
        "INSERT INTO public.system_settings
             (tenant_id, company_id, key, value, override_policy)
         VALUES (NULL, NULL, 'platform.new', 'v1', 'platform_only')",
    )
    .execute(&mut *tx)
    .await
    .expect("平台通道应可写平台参数行");
    let affected = sqlx::query(
        "UPDATE public.system_settings SET value = 'v2', override_policy = 'company_overridable'
          WHERE tenant_id IS NULL AND company_id IS NULL AND key = 'platform.new'",
    )
    .execute(&mut *tx)
    .await
    .unwrap()
    .rows_affected();
    assert_eq!(affected, 1);
    tx.commit().await.unwrap();

    let mut tx = system_tx(&pool, None).await;
    let company_rows: i64 = sqlx::query_scalar(
        "SELECT COUNT(*)::bigint FROM public.system_settings WHERE company_id IS NOT NULL",
    )
    .fetch_one(&mut *tx)
    .await
    .unwrap();
    tx.rollback().await.unwrap();
    assert_eq!(company_rows, 0, "平台通道不应产生公司行");
}

/// 多公司租户的租户级行不再阻断迁移，统一保留为母版。
#[sqlx::test(migrations = false)]
async fn multi_company_tenant_rows_kept_as_master_not_blocked(pool: PgPool) {
    setup_tables(&pool).await;
    let tenant = Uuid::new_v4();
    insert_company(&pool, tenant, "母公司").await;
    insert_company(&pool, tenant, "子公司").await;
    seed_setting(&pool, Some(tenant), "ambiguous.key", "1").await;

    run_sql(&pool, MIGRATION_SQL)
        .await
        .expect("多公司租户的存量行不得阻断迁移");

    let mut tx = system_tx(&pool, Some(tenant)).await;
    let row: (Option<Uuid>, String) = sqlx::query_as(
        "SELECT company_id, override_policy FROM public.system_settings
          WHERE tenant_id = $1 AND key = 'ambiguous.key'",
    )
    .bind(tenant)
    .fetch_one(&mut *tx)
    .await
    .unwrap();
    tx.rollback().await.unwrap();
    assert_eq!(row.0, None, "多公司租户存量行保留为母版，不推断公司");
    assert_eq!(row.1, "company_overridable");
}

/// 有公司行时回滚明确中止；清理公司行后回滚成功，并可再次前向。
#[sqlx::test(migrations = false)]
async fn rollback_blocks_on_company_rows_and_succeeds_after_cleanup(pool: PgPool) {
    setup_tables(&pool).await;
    let tenant = Uuid::new_v4();
    let company = insert_company(&pool, tenant, "本公司").await;
    seed_setting(&pool, None, "platform.key", "platform-value").await;

    run_sql(&pool, MIGRATION_SQL).await.unwrap();

    let mut tx = actor_tx(&pool, tenant, company, false, &[]).await;
    sqlx::query(
        "INSERT INTO public.system_settings
             (tenant_id, company_id, key, value, override_policy)
         VALUES ($1, $2, 'company.key', '1', 'company_overridable')",
    )
    .bind(tenant)
    .bind(company)
    .execute(&mut *tx)
    .await
    .unwrap();
    tx.commit().await.unwrap();

    let err = run_sql(&pool, ROLLBACK_SQL)
        .await
        .expect_err("存在公司行时回滚必须中止");
    assert!(
        format!("{err}").contains("回滚中止"),
        "回滚中止信息缺失，实际: {err}"
    );

    // 清理公司行（模拟归档）后再回滚。
    for stmt in [
        "ALTER TABLE public.system_settings DISABLE ROW LEVEL SECURITY",
        "DELETE FROM public.system_settings WHERE company_id IS NOT NULL",
        "ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY",
        "ALTER TABLE public.system_settings FORCE ROW LEVEL SECURITY",
    ] {
        sqlx::query(stmt).execute(&pool).await.unwrap();
    }

    run_sql(&pool, ROLLBACK_SQL).await.unwrap();

    let columns: i64 = sqlx::query_scalar(
        "SELECT COUNT(*)::bigint FROM pg_attribute
          WHERE attrelid = 'public.system_settings'::regclass
            AND attname IN ('company_id', 'override_policy')
            AND attnum > 0 AND NOT attisdropped",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(columns, 0, "回滚后 company_id/override_policy 必须不存在");

    let trigger: bool = sqlx::query_scalar(
        "SELECT EXISTS (
            SELECT 1 FROM pg_trigger
             WHERE tgrelid = 'public.system_settings'::regclass
               AND tgname = 'trg_system_settings_override_policy'
         )",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert!(!trigger, "回滚后触发器必须不存在");

    let policies: i64 = sqlx::query_scalar(
        "SELECT COUNT(*)::bigint FROM pg_policies
          WHERE schemaname = 'public' AND tablename = 'system_settings'",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(policies, 1, "回滚后只剩 rls_tenant_isolation");

    // 再次前向必须成功（此时只有平台行）。
    run_sql(&pool, MIGRATION_SQL).await.unwrap();
    let mut tx = system_tx(&pool, Some(tenant)).await;
    let companies: i64 = sqlx::query_scalar(
        "SELECT COUNT(*)::bigint FROM public.system_settings WHERE company_id IS NOT NULL",
    )
    .fetch_one(&mut *tx)
    .await
    .unwrap();
    tx.rollback().await.unwrap();
    assert_eq!(companies, 0, "再前向后不应凭空产生公司行");
}
