#![allow(clippy::unwrap_used, clippy::expect_used)]
//! 公司上下文解析：请求头缺失时的隐式推断与优先级（隔离库 `sqlx::test`）。
//!
//! 直接驱动 [`resolve_company_context`] 的真实查询路径，验证优先级链：
//!   显式 `x-company-id` > `is_default` > 唯一成员推断 > 无上下文（fail-closed）。
//!
//! 行为变化：改造前「多成员不带头 = 0 行」的用例只对「无默认公司」的多成员用户仍成立；
//! 一旦用户有默认公司（迁移回填或人工指定），同一条无头请求会解析出默认公司。
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
            is_default boolean NOT NULL DEFAULT false,
            created_at timestamptz NOT NULL DEFAULT now(),
            CONSTRAINT uq_user_company_scopes UNIQUE (tenant_id, user_id, company_id)
        )"#,
        r#"CREATE UNIQUE INDEX IF NOT EXISTS uq_user_company_scopes_default
            ON public.core_user_company_scopes (tenant_id, user_id)
            WHERE is_default"#,
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

async fn insert_scope(pool: &PgPool, tenant: Uuid, user: Uuid, company: Uuid, is_default: bool) {
    sqlx::query(
        "INSERT INTO public.core_user_company_scopes (tenant_id, user_id, company_id, is_default)
         VALUES ($1, $2, $3, $4)",
    )
    .bind(tenant)
    .bind(user)
    .bind(company)
    .bind(is_default)
    .execute(pool)
    .await
    .unwrap();
}

async fn delete_scope(pool: &PgPool, tenant: Uuid, user: Uuid, company: Uuid) {
    sqlx::query(
        "DELETE FROM public.core_user_company_scopes
          WHERE tenant_id = $1 AND user_id = $2 AND company_id = $3",
    )
    .bind(tenant)
    .bind(user)
    .bind(company)
    .execute(pool)
    .await
    .unwrap();
}

async fn set_default(pool: &PgPool, tenant: Uuid, user: Uuid, company: Uuid) {
    let mut tx = pool.begin().await.unwrap();
    sqlx::query(
        "UPDATE public.core_user_company_scopes SET is_default = false
          WHERE tenant_id = $1 AND user_id = $2",
    )
    .bind(tenant)
    .bind(user)
    .execute(&mut *tx)
    .await
    .unwrap();
    sqlx::query(
        "UPDATE public.core_user_company_scopes SET is_default = true
          WHERE tenant_id = $1 AND user_id = $2 AND company_id = $3",
    )
    .bind(tenant)
    .bind(user)
    .bind(company)
    .execute(&mut *tx)
    .await
    .unwrap();
    tx.commit().await.unwrap();
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
    insert_scope(&pool, tenant, user, company, false).await;

    let ctx = resolve(&pool, tenant, user, &HeaderMap::new())
        .await
        .unwrap()
        .expect("唯一成员应被自动推断为公司上下文");
    assert_eq!(ctx.company_id, company);
    assert!(!ctx.actor_is_parent, "推断路径默认是单公司视角");
    assert!(ctx.visible_company_ids.is_empty());
}

#[sqlx::test(migrations = false)]
async fn multi_member_without_default_stays_fail_closed(pool: PgPool) {
    setup(&pool).await;
    let tenant = Uuid::new_v4();
    let user = Uuid::new_v4();
    insert_scope(&pool, tenant, user, Uuid::new_v4(), false).await;
    insert_scope(&pool, tenant, user, Uuid::new_v4(), false).await;

    assert_eq!(
        resolve(&pool, tenant, user, &HeaderMap::new())
            .await
            .unwrap(),
        None,
        "多成员、无默认公司且未声明 x-company-id 时必须维持无上下文（下游 0 行）"
    );
}

#[sqlx::test(migrations = false)]
async fn default_company_applies_for_multi_member(pool: PgPool) {
    setup(&pool).await;
    let tenant = Uuid::new_v4();
    let user = Uuid::new_v4();
    let other = Uuid::new_v4();
    let default_company = Uuid::new_v4();
    insert_scope(&pool, tenant, user, other, false).await;
    insert_scope(&pool, tenant, user, default_company, true).await;

    let ctx = resolve(&pool, tenant, user, &HeaderMap::new())
        .await
        .unwrap()
        .expect("多成员用户应解析出默认公司");
    assert_eq!(ctx.company_id, default_company);
}

#[sqlx::test(migrations = false)]
async fn explicit_header_overrides_inference(pool: PgPool) {
    setup(&pool).await;
    let tenant = Uuid::new_v4();
    let user = Uuid::new_v4();
    let first = Uuid::new_v4();
    let second = Uuid::new_v4();
    insert_scope(&pool, tenant, user, first, false).await;
    insert_scope(&pool, tenant, user, second, false).await;

    let ctx = resolve(&pool, tenant, user, &company_header(second))
        .await
        .unwrap()
        .expect("显式头必须优先生效");
    assert_eq!(ctx.company_id, second);
}

#[sqlx::test(migrations = false)]
async fn explicit_header_overrides_default_company(pool: PgPool) {
    setup(&pool).await;
    let tenant = Uuid::new_v4();
    let user = Uuid::new_v4();
    let default_company = Uuid::new_v4();
    let explicit = Uuid::new_v4();
    insert_scope(&pool, tenant, user, default_company, true).await;
    insert_scope(&pool, tenant, user, explicit, false).await;

    let ctx = resolve(&pool, tenant, user, &company_header(explicit))
        .await
        .unwrap()
        .expect("显式头必须覆盖默认公司");
    assert_eq!(ctx.company_id, explicit);
}

#[sqlx::test(migrations = false)]
async fn default_switch_takes_effect_immediately(pool: PgPool) {
    setup(&pool).await;
    let tenant = Uuid::new_v4();
    let user = Uuid::new_v4();
    let old_default = Uuid::new_v4();
    let new_default = Uuid::new_v4();
    insert_scope(&pool, tenant, user, old_default, true).await;
    insert_scope(&pool, tenant, user, new_default, false).await;

    let before = resolve(&pool, tenant, user, &HeaderMap::new())
        .await
        .unwrap()
        .expect("初始默认公司应生效");
    assert_eq!(before.company_id, old_default);

    // 把默认公司改成另一家：无头请求必须立刻切到新默认，不做任何缓存。
    set_default(&pool, tenant, user, new_default).await;
    let after = resolve(&pool, tenant, user, &HeaderMap::new())
        .await
        .unwrap()
        .expect("新默认公司应立即生效");
    assert_eq!(after.company_id, new_default);

    // 旧公司失去数据范围后，显式旧头立即失效（403）。
    delete_scope(&pool, tenant, user, old_default).await;
    let err = resolve(&pool, tenant, user, &company_header(old_default))
        .await
        .unwrap_err();
    assert_eq!(err.0, 403, "旧头对应的范围已移除，必须立即失效");
}

#[sqlx::test(migrations = false)]
async fn explicit_header_outside_scope_is_rejected(pool: PgPool) {
    setup(&pool).await;
    let tenant = Uuid::new_v4();
    let user = Uuid::new_v4();
    insert_scope(&pool, tenant, user, Uuid::new_v4(), false).await;

    let err = resolve(&pool, tenant, user, &company_header(Uuid::new_v4()))
        .await
        .unwrap_err();
    assert_eq!(err.0, 403, "显式头仍需通过归属校验");
}
