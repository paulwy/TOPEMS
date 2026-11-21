#![allow(clippy::unwrap_used, clippy::expect_used)]
//! 公司上下文解析：请求头缺失时的隐式推断与优先级（隔离库 `sqlx::test`）。
//!
//! 直接驱动 [`resolve_company_context`] 的真实查询路径，验证：
//!   - 用户在当前租户只有一条成员记录时，不带 `x-company-id` 也能解析出该公司；
//!   - 多条或无记录时维持无上下文（数据库侧 fail-closed）；
//!   - 显式 `x-company-id` 覆盖推断结果，且仍走原有归属校验（403）。
#![cfg(feature = "db-tests")]

use axum::http::{HeaderMap, HeaderValue};
use sqlx::PgPool;
use uuid::Uuid;

use topems_shared_auth::middleware::company::{resolve_company_context, X_COMPANY_ID};
use topems_shared_auth::CompanyContext;

topems_test_support::sqlx_dsn_guard!();

async fn setup(pool: &PgPool) {
    for stmt in [
        "CREATE SCHEMA IF NOT EXISTS erp",
        r#"CREATE TABLE IF NOT EXISTS public.core_user_company_scopes (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id uuid NOT NULL,
            user_id uuid NOT NULL,
            company_id uuid NOT NULL,
            access_level varchar(20) NOT NULL DEFAULT 'read',
            created_at timestamptz NOT NULL DEFAULT now(),
            CONSTRAINT uq_user_company_scopes UNIQUE (tenant_id, user_id, company_id)
        )"#,
        r#"CREATE TABLE IF NOT EXISTS erp.company_relations (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id uuid NOT NULL,
            parent_company_id uuid NOT NULL,
            child_company_id uuid NOT NULL,
            status varchar(20) NOT NULL DEFAULT 'active',
            effective_date date NOT NULL DEFAULT CURRENT_DATE,
            expiry_date date,
            deleted_at timestamptz
        )"#,
    ] {
        sqlx::query(stmt).execute(pool).await.unwrap();
    }
}

async fn insert_scope(pool: &PgPool, tenant: Uuid, user: Uuid, company: Uuid) {
    sqlx::query(
        "INSERT INTO public.core_user_company_scopes (tenant_id, user_id, company_id)
         VALUES ($1, $2, $3)",
    )
    .bind(tenant)
    .bind(user)
    .bind(company)
    .execute(pool)
    .await
    .unwrap();
}

fn company_header(company: Uuid) -> HeaderMap {
    let mut headers = HeaderMap::new();
    headers.insert(
        X_COMPANY_ID,
        HeaderValue::from_str(&company.to_string()).unwrap(),
    );
    headers
}

async fn resolve(
    pool: &PgPool,
    tenant: Uuid,
    user: Uuid,
    headers: &HeaderMap,
) -> Result<Option<CompanyContext>, (u16, String)> {
    let mut tx = pool.begin().await.unwrap();
    sqlx::query("SELECT set_config('app.tenant_id', $1, true)")
        .bind(tenant.to_string())
        .execute(&mut *tx)
        .await
        .unwrap();
    let resolved = resolve_company_context(&mut tx, tenant, user, false, headers).await;
    let _ = tx.rollback().await;
    resolved
}

#[sqlx::test(migrations = false)]
async fn single_member_is_inferred_without_header(pool: PgPool) {
    setup(&pool).await;
    let tenant = Uuid::new_v4();
    let user = Uuid::new_v4();
    let company = Uuid::new_v4();
    insert_scope(&pool, tenant, user, company).await;

    let ctx = resolve(&pool, tenant, user, &HeaderMap::new())
        .await
        .unwrap()
        .expect("唯一成员应被自动推断为公司上下文");
    assert_eq!(ctx.company_id, company);
    assert!(!ctx.actor_is_parent, "推断路径默认是单公司视角");
    assert!(ctx.visible_company_ids.is_empty());
}

#[sqlx::test(migrations = false)]
async fn multi_member_without_header_stays_fail_closed(pool: PgPool) {
    setup(&pool).await;
    let tenant = Uuid::new_v4();
    let user = Uuid::new_v4();
    insert_scope(&pool, tenant, user, Uuid::new_v4()).await;
    insert_scope(&pool, tenant, user, Uuid::new_v4()).await;

    assert_eq!(
        resolve(&pool, tenant, user, &HeaderMap::new())
            .await
            .unwrap(),
        None,
        "多成员且未声明 x-company-id 时必须维持无上下文（下游 0 行）"
    );
}

#[sqlx::test(migrations = false)]
async fn explicit_header_overrides_inference(pool: PgPool) {
    setup(&pool).await;
    let tenant = Uuid::new_v4();
    let user = Uuid::new_v4();
    let first = Uuid::new_v4();
    let second = Uuid::new_v4();
    insert_scope(&pool, tenant, user, first).await;
    insert_scope(&pool, tenant, user, second).await;

    let ctx = resolve(&pool, tenant, user, &company_header(second))
        .await
        .unwrap()
        .expect("显式头必须优先生效");
    assert_eq!(ctx.company_id, second);
}

#[sqlx::test(migrations = false)]
async fn explicit_header_outside_scope_is_rejected(pool: PgPool) {
    setup(&pool).await;
    let tenant = Uuid::new_v4();
    let user = Uuid::new_v4();
    insert_scope(&pool, tenant, user, Uuid::new_v4()).await;

    let err = resolve(&pool, tenant, user, &company_header(Uuid::new_v4()))
        .await
        .unwrap_err();
    assert_eq!(err.0, 403, "显式头仍需通过归属校验");
}
