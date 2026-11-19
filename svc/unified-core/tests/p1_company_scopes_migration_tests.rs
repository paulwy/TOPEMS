#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! P1 主数据与主体范围迁移测试（2026-11-08）。
//!
//! 直接执行 `database/migrations/20261108130000_p1_company_master_and_scopes.sql`
//! 的真实 SQL，验证：
//!   - 单公司租户一次性回填（read/write/consolidate）且在职用户零遗漏；
//!   - 多公司租户不自动授予；0 公司租户不建 scope、不报错；
//!   - 重复 code、非法 access_level、跨租户公司引用均被数据库拒绝。
#![cfg(feature = "db-tests")]

use std::borrow::Cow;
use uuid::Uuid;

const MIGRATION_SQL: &str =
    include_str!("../../../database/migrations/20261108130000_p1_company_master_and_scopes.sql");

async fn setup_base_schema(pool: &sqlx::PgPool) {
    for stmt in [
        "CREATE SCHEMA IF NOT EXISTS hrm",
        "CREATE SCHEMA IF NOT EXISTS erp",
        "CREATE SCHEMA IF NOT EXISTS iam",
        r#"CREATE TABLE IF NOT EXISTS hrm.companies (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id uuid,
            name varchar(255) NOT NULL,
            status varchar(20) NOT NULL DEFAULT 'active',
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now(),
            deleted_at timestamptz
        )"#,
        r#"CREATE TABLE IF NOT EXISTS iam.users (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            username varchar(100) NOT NULL,
            status varchar(20) NOT NULL DEFAULT 'active',
            is_active boolean NOT NULL DEFAULT true,
            is_superuser boolean NOT NULL DEFAULT false,
            roles text[] DEFAULT '{}',
            permissions text[] DEFAULT '{}',
            deleted_at timestamptz
        )"#,
        r#"CREATE TABLE IF NOT EXISTS public.core_tenant_users (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id uuid NOT NULL,
            user_id uuid NOT NULL,
            status varchar(20) NOT NULL DEFAULT 'active',
            deleted_at timestamptz
        )"#,
        r#"CREATE TABLE IF NOT EXISTS public.core_roles (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            name varchar(100) NOT NULL
        )"#,
        r#"CREATE TABLE IF NOT EXISTS public.core_user_roles (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id uuid NOT NULL,
            role_id uuid NOT NULL
        )"#,
        r#"CREATE TABLE IF NOT EXISTS public.core_role_permissions (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            role_id uuid NOT NULL,
            permission_id uuid NOT NULL
        )"#,
        r#"CREATE TABLE IF NOT EXISTS public.core_permissions (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            code varchar(200) NOT NULL
        )"#,
        r#"CREATE TABLE IF NOT EXISTS erp.consolidation_scope_companies (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id uuid,
            scope_id uuid NOT NULL,
            company_id uuid NOT NULL,
            company_name varchar(255) NOT NULL DEFAULT '',
            is_parent boolean NOT NULL DEFAULT false,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now(),
            deleted_at timestamptz
        )"#,
        r#"CREATE TABLE IF NOT EXISTS erp.company_relations (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id uuid,
            parent_company_id uuid NOT NULL,
            child_company_id uuid NOT NULL,
            relation_type varchar(50) NOT NULL DEFAULT 'subsidiary',
            status varchar(20) NOT NULL DEFAULT 'active',
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now(),
            deleted_at timestamptz
        )"#,
    ] {
        sqlx::query(stmt).execute(pool).await.unwrap();
    }
}

async fn insert_user(
    pool: &sqlx::PgPool,
    tenant: Uuid,
    roles: &[&str],
    permissions: &[&str],
    is_active: bool,
) -> Uuid {
    let id = Uuid::new_v4();
    sqlx::query(
        r#"INSERT INTO iam.users (id, username, status, is_active, roles, permissions)
           VALUES ($1, $2, 'active', $3, $4, $5)"#,
    )
    .bind(id)
    .bind(format!("u-{}", id))
    .bind(is_active)
    .bind(roles.iter().map(|s| s.to_string()).collect::<Vec<_>>())
    .bind(
        permissions
            .iter()
            .map(|s| s.to_string())
            .collect::<Vec<_>>(),
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query("INSERT INTO public.core_tenant_users (tenant_id, user_id) VALUES ($1, $2)")
        .bind(tenant)
        .bind(id)
        .execute(pool)
        .await
        .unwrap();
    id
}

async fn insert_company(pool: &sqlx::PgPool, tenant: Uuid, name: &str) -> Uuid {
    let id = Uuid::new_v4();
    sqlx::query("INSERT INTO hrm.companies (id, tenant_id, name) VALUES ($1, $2, $3)")
        .bind(id)
        .bind(tenant)
        .bind(name)
        .execute(pool)
        .await
        .unwrap();
    id
}

async fn run_migration(pool: &sqlx::PgPool) {
    sqlx::raw_sql(MIGRATION_SQL).execute(pool).await.unwrap();
}

async fn scope_level(pool: &sqlx::PgPool, tenant: Uuid, user: Uuid) -> Option<String> {
    sqlx::query_scalar(
        "SELECT access_level FROM public.core_user_company_scopes WHERE tenant_id = $1 AND user_id = $2",
    )
    .bind(tenant)
    .bind(user)
    .fetch_optional(pool)
    .await
    .unwrap()
}

topems_test_support::sqlx_dsn_guard!();
#[sqlx::test(migrations = false)]
async fn single_company_tenant_backfill_and_multi_company_no_grant(pool: sqlx::PgPool) {
    setup_base_schema(&pool).await;

    // 单公司租户：admin / 普通 / 合并权限 / 停用用户
    let tenant_single = Uuid::new_v4();
    insert_company(&pool, tenant_single, "单公司主体").await;
    let admin = insert_user(&pool, tenant_single, &["tenant_admin"], &[], true).await;
    let normal = insert_user(&pool, tenant_single, &[], &[], true).await;
    let consolidator = insert_user(
        &pool,
        tenant_single,
        &[],
        &["erp:consolidation:report:create"],
        true,
    )
    .await;
    let inactive = insert_user(&pool, tenant_single, &[], &[], false).await;

    // 多公司租户：不自动授予
    let tenant_multi = Uuid::new_v4();
    insert_company(&pool, tenant_multi, "主体一").await;
    insert_company(&pool, tenant_multi, "主体二").await;
    let multi_user = insert_user(&pool, tenant_multi, &["tenant_admin"], &[], true).await;

    // 0 公司租户：不报错、不产生 scope
    let tenant_zero = Uuid::new_v4();
    let zero_user = insert_user(&pool, tenant_zero, &[], &[], true).await;

    run_migration(&pool).await;

    assert_eq!(
        scope_level(&pool, tenant_single, admin).await.as_deref(),
        Some("write"),
        "tenant_admin 应获得 write"
    );
    assert_eq!(
        scope_level(&pool, tenant_single, normal).await.as_deref(),
        Some("read"),
        "普通在职用户应获得 read"
    );
    assert_eq!(
        scope_level(&pool, tenant_single, consolidator)
            .await
            .as_deref(),
        Some("consolidate"),
        "持有合并权限的用户应获得 consolidate"
    );
    assert_eq!(
        scope_level(&pool, tenant_single, inactive).await,
        None,
        "停用用户不参与回填"
    );

    let multi_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*)::bigint FROM public.core_user_company_scopes WHERE tenant_id = $1",
    )
    .bind(tenant_multi)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(multi_count, 0, "多公司租户不自动授予");
    assert_eq!(scope_level(&pool, tenant_multi, multi_user).await, None);

    let zero_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*)::bigint FROM public.core_user_company_scopes WHERE tenant_id = $1",
    )
    .bind(tenant_zero)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(zero_count, 0, "0 公司租户不产生 scope，也不应阻断迁移");
    assert_eq!(scope_level(&pool, tenant_zero, zero_user).await, None);
}

fn unique_violation(error: &sqlx::Error) -> bool {
    matches!(
        error,
        sqlx::Error::Database(db) if db.code() == Some(Cow::Borrowed("23505"))
    )
}

fn check_violation(error: &sqlx::Error) -> bool {
    matches!(
        error,
        sqlx::Error::Database(db) if db.code() == Some(Cow::Borrowed("23514"))
    )
}

fn foreign_key_violation(error: &sqlx::Error) -> bool {
    matches!(
        error,
        sqlx::Error::Database(db) if db.code() == Some(Cow::Borrowed("23503"))
    )
}

#[sqlx::test(migrations = false)]
async fn duplicate_code_in_same_tenant_is_rejected(pool: sqlx::PgPool) {
    setup_base_schema(&pool).await;
    let tenant = Uuid::new_v4();
    let company = insert_company(&pool, tenant, "主公司").await;
    run_migration(&pool).await;

    let code: String = sqlx::query_scalar("SELECT code FROM hrm.companies WHERE id = $1")
        .bind(company)
        .fetch_one(&pool)
        .await
        .unwrap();

    let err = sqlx::query(
        "INSERT INTO hrm.companies (tenant_id, code, name) VALUES ($1, $2, '重复代码公司')",
    )
    .bind(tenant)
    .bind(code.to_lowercase())
    .execute(&pool)
    .await
    .unwrap_err();

    assert!(
        unique_violation(&err),
        "同租户重复 code 必须被拒绝：{:?}",
        err
    );
}

#[sqlx::test(migrations = false)]
async fn invalid_access_level_is_rejected(pool: sqlx::PgPool) {
    setup_base_schema(&pool).await;
    let tenant = Uuid::new_v4();
    let company = insert_company(&pool, tenant, "主公司").await;
    run_migration(&pool).await;

    let err = sqlx::query(
        "INSERT INTO public.core_user_company_scopes (tenant_id, user_id, company_id, access_level)
         VALUES ($1, $2, $3, 'admin')",
    )
    .bind(tenant)
    .bind(Uuid::new_v4())
    .bind(company)
    .execute(&pool)
    .await
    .unwrap_err();

    assert!(
        check_violation(&err),
        "非法 access_level 必须被拒绝：{:?}",
        err
    );
}

#[sqlx::test(migrations = false)]
async fn cross_tenant_company_reference_is_rejected(pool: sqlx::PgPool) {
    setup_base_schema(&pool).await;
    let tenant_a = Uuid::new_v4();
    let tenant_b = Uuid::new_v4();
    insert_company(&pool, tenant_a, "A 公司").await;
    let company_b = insert_company(&pool, tenant_b, "B 公司").await;
    run_migration(&pool).await;

    let err = sqlx::query(
        "INSERT INTO public.core_user_company_scopes (tenant_id, user_id, company_id, access_level)
         VALUES ($1, $2, $3, 'read')",
    )
    .bind(tenant_a)
    .bind(Uuid::new_v4())
    .bind(company_b)
    .execute(&pool)
    .await
    .unwrap_err();
    assert!(
        foreign_key_violation(&err),
        "跨租户 scope 引用必须被拒绝：{:?}",
        err
    );

    let err = sqlx::query(
        "INSERT INTO erp.consolidation_scope_companies (tenant_id, scope_id, company_id, company_name)
         VALUES ($1, $2, $3, 'B 公司')",
    )
    .bind(tenant_a)
    .bind(Uuid::new_v4())
    .bind(company_b)
    .execute(&pool)
    .await
    .unwrap_err();
    assert!(
        foreign_key_violation(&err),
        "合并范围跨租户公司引用必须被拒绝：{:?}",
        err
    );
}
