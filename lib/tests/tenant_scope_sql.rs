//! P0 租户作用域回归：显式租户通道 vs 历史 nil 哨兵的对照。
//!
//! 需要真实数据库（副本库）才能验证 SQL 语义，未设置 `TOPEMS_TEST_DATABASE_URL` 时跳过。
//! 只使用会话级 TEMP 表，不读写任何业务表：
//!
//! ```bash
//! TOPEMS_TEST_DATABASE_URL='postgres://topems_prod@localhost:5432/topems_iam_fix_20261113' \
//!   cargo test -p topems-shared --test tenant_scope_sql
//! ```
#![allow(clippy::unwrap_used, clippy::expect_used)]

use sqlx::{Connection, PgConnection};
use topems_shared_auth::middleware::{BindTenantScope, SystemChannel, TenantScope};
use uuid::Uuid;

const LEGACY_NIL_SENTINEL: &str = "00000000-0000-0000-0000-000000000000";

async fn probe_conn() -> Option<PgConnection> {
    let url = std::env::var("TOPEMS_TEST_DATABASE_URL").ok()?;
    let mut conn = PgConnection::connect(&url)
        .await
        .expect("TOPEMS_TEST_DATABASE_URL 连接失败");
    sqlx::query(
        "CREATE TEMP TABLE p0_probe (
             id serial primary key,
             tenant_id uuid not null,
             note text not null
         )",
    )
    .execute(&mut conn)
    .await
    .expect("创建 TEMP 探针表失败");
    sqlx::query(
        "INSERT INTO p0_probe (tenant_id, note) VALUES
             ('11111111-1111-1111-1111-111111111111', 'tenant-a'),
             ('11111111-1111-1111-1111-111111111111', 'tenant-a-2'),
             ('22222222-2222-2222-2222-222222222222', 'tenant-b'),
             ('33333333-3333-3333-3333-333333333333', 'tenant-c')",
    )
    .execute(&mut conn)
    .await
    .expect("写入探针数据失败");
    Some(conn)
}

#[tokio::test]
async fn legacy_nil_predicate_leaks_multi_tenant() {
    let Some(mut conn) = probe_conn().await else {
        eprintln!("skip: TOPEMS_TEST_DATABASE_URL 未设置");
        return;
    };
    let (rows, tenants): (i64, i64) = sqlx::query_as(sqlx::AssertSqlSafe(format!(
        "SELECT COUNT(*), COUNT(DISTINCT tenant_id) FROM p0_probe
         WHERE ($1::uuid = '{LEGACY_NIL_SENTINEL}'::uuid OR tenant_id = $1::uuid)"
    )))
    .bind(Uuid::nil())
    .fetch_one(&mut conn)
    .await
    .unwrap();

    assert_eq!(rows, 4, "旧谓词在 nil 参数下应返回全部行");
    assert_eq!(tenants, 3, "旧谓词在 nil 参数下应跨 3 个租户");
    eprintln!("[legacy-nil] rows={rows} tenants={tenants}");
}

#[tokio::test]
async fn tenant_scope_is_fail_closed_and_system_is_explicit() {
    let Some(mut conn) = probe_conn().await else {
        eprintln!("skip: TOPEMS_TEST_DATABASE_URL 未设置");
        return;
    };
    let tenant_a = Uuid::parse_str("11111111-1111-1111-1111-111111111111").unwrap();
    let tenant_scope = TenantScope::tenant(tenant_a).expect("合法租户");

    let (rows, tenants): (i64, i64) = sqlx::query_as(sqlx::AssertSqlSafe(format!(
        "SELECT COUNT(*), COUNT(DISTINCT tenant_id) FROM p0_probe WHERE {}",
        tenant_scope.sql_predicate("tenant_id", "$1")
    )))
    .bind_tenant_scope(&tenant_scope)
    .fetch_one(&mut conn)
    .await
    .unwrap();
    assert_eq!((rows, tenants), (2, 1), "租户通道只能看到本租户数据");
    eprintln!("[tenant-a] rows={rows} tenants={tenants}");

    let system_scope = TenantScope::system(SystemChannel::ServiceToken, "test", "p0_probe");
    let (rows, tenants): (i64, i64) = sqlx::query_as(sqlx::AssertSqlSafe(format!(
        "SELECT COUNT(*), COUNT(DISTINCT tenant_id) FROM p0_probe WHERE {}",
        system_scope.sql_predicate("tenant_id", "$1")
    )))
    .bind_tenant_scope(&system_scope)
    .fetch_one(&mut conn)
    .await
    .unwrap();
    assert_eq!((rows, tenants), (4, 3), "系统通道必须显式声明后才能全量");
    eprintln!("[system] rows={rows} tenants={tenants}");

    let err = TenantScope::tenant(Uuid::nil()).expect_err("nil 租户必须报错");
    assert_eq!(err.0, 400, "Tenant 分支绑出空值必须报错而不是放行");
}
