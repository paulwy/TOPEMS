//! 权限回填 / 租户上下文端到端验证（真实 PostgreSQL + auth_middleware）
//!
//! 覆盖本次 JWT 精简改造的关键缺口：编码侧单测只证明 token 变小，本测试直接驱动
//! `auth_middleware`，验证：
//! - 紧凑 token（无逐条权限码）经中间件按 user_id 从授权表**回填**权限与角色；
//! - 授权表在 FORCE RLS 下仍能按 user_id 正确解析（系统上下文 + 事务级 SET LOCAL）；
//! - 回填后写入的 `RlsRequestTenant` 与 token 租户一致、普通用户不误入系统通道；
//! - 解析失败（DB 不可用）按 fail-closed 返回 503，而不是静默空权限 403。
#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]

use axum::{
    body::Body,
    extract::{Extension, Request},
    http::{header, StatusCode},
    middleware,
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use serde_json::{json, Value};
use sqlx::PgPool;
use tower::ServiceExt;
use uuid::Uuid;

use topems_shared_auth::auth::{auth_middleware, AuthState, Claims};
use topems_shared_auth::middleware::tenant::current_request_tenant;

const TEST_SECRET: &str = "permission-backfill-e2e-secret-at-least-32-characters";
const REFRESH_SECRET: &str = "permission-backfill-e2e-refresh-at-least-32-characters";
const SYSTEM_TENANT: &str = "00000000-0000-0000-0000-000000000000";

/// 返回中间件回填后的 Claims 与请求级 RLS 上下文，供断言。
async fn whoami(Extension(claims): Extension<Claims>) -> impl IntoResponse {
    let rls = current_request_tenant();
    Json(json!({
        "roles": claims.roles,
        "permissions": claims.permissions,
        "tenant_id": claims.tenant_id,
        "rls_tenant": rls.map(|c| c.tenant.to_string()),
        "rls_system": rls.map(|c| c.system),
    }))
}

/// 建最小授权表（与生产 `public.core_*` 对应列/cli 结构）。
async fn seed_grant_tables(pool: &PgPool) {
    for ddl in [
        "CREATE TABLE core_roles (id uuid PRIMARY KEY, name text NOT NULL)",
        "CREATE TABLE core_permissions (id uuid PRIMARY KEY, code text NOT NULL)",
        "CREATE TABLE core_user_roles (user_id uuid NOT NULL, role_id uuid NOT NULL, tenant_id uuid)",
        "CREATE TABLE core_role_permissions (role_id uuid NOT NULL, permission_id uuid NOT NULL, tenant_id uuid)",
    ] {
        sqlx::query(ddl).execute(pool).await.unwrap();
    }
}

/// 写入用户授权：一个角色 + 若干权限码，授权行归属指定租户。
async fn grant_user(pool: &PgPool, user_id: Uuid, role: &str, permissions: &[&str], tenant: Uuid) {
    let role_id = Uuid::new_v4();
    sqlx::query("INSERT INTO core_roles (id, name) VALUES ($1, $2)")
        .bind(role_id)
        .bind(role)
        .execute(pool)
        .await
        .unwrap();
    sqlx::query("INSERT INTO core_user_roles (user_id, role_id, tenant_id) VALUES ($1, $2, $3)")
        .bind(user_id)
        .bind(role_id)
        .bind(tenant)
        .execute(pool)
        .await
        .unwrap();

    for code in permissions {
        let perm_id = Uuid::new_v4();
        sqlx::query("INSERT INTO core_permissions (id, code) VALUES ($1, $2)")
            .bind(perm_id)
            .bind(code)
            .execute(pool)
            .await
            .unwrap();
        sqlx::query(
            "INSERT INTO core_role_permissions (role_id, permission_id, tenant_id) VALUES ($1, $2, $3)",
        )
        .bind(role_id)
        .bind(perm_id)
        .bind(tenant)
        .execute(pool)
        .await
        .unwrap();
    }
}

/// 将授权表切换为生产口径：FORCE RLS，仅系统租户（nil UUID）可见全部行。
async fn enable_prod_rls(pool: &PgPool) {
    // 表名来自本测试内的静态白名单，不拼接外部输入，DDL 走 AssertSqlSafe。
    for table in ["core_user_roles", "core_role_permissions"] {
        sqlx::query(sqlx::AssertSqlSafe(format!(
            "ALTER TABLE {table} ENABLE ROW LEVEL SECURITY"
        )))
        .execute(pool)
        .await
        .unwrap();
        sqlx::query(sqlx::AssertSqlSafe(format!(
            "ALTER TABLE {table} FORCE ROW LEVEL SECURITY"
        )))
        .execute(pool)
        .await
        .unwrap();
        sqlx::query(sqlx::AssertSqlSafe(format!(
            "CREATE POLICY {table}_tenant ON {table} USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid OR tenant_id IS NULL OR current_setting('app.tenant_id', true) = '{SYSTEM_TENANT}')"
        )))
        .execute(pool)
        .await
        .unwrap();
    }
}

fn make_claims(user_id: Uuid, tenant_id: Uuid) -> Claims {
    Claims {
        sub: user_id.to_string(),
        username: "tenant_user".to_string(),
        role: "user".to_string(),
        roles: vec!["user".to_string()],
        // 紧凑 token：不携带逐条权限码，必须由中间件回填。
        permissions: vec![],
        is_superuser: false,
        exp: 9_999_999_999,
        iat: 0,
        email: None,
        department: None,
        tenant_id: Some(tenant_id.to_string()),
        department_id: None,
        position_id: None,
        position_code: None,
        must_change_password: false,
    }
}

fn build_app(state: AuthState) -> Router {
    Router::new()
        .route("/whoami", get(whoami))
        .layer(middleware::from_fn_with_state(
            state.clone(),
            auth_middleware,
        ))
}

async fn call(app: &Router, token: &str) -> (StatusCode, Value) {
    let req = Request::builder()
        .uri("/whoami")
        .header(header::AUTHORIZATION, format!("Bearer {token}"))
        .body(Body::empty())
        .unwrap();
    let resp = app.clone().oneshot(req).await.unwrap();
    let status = resp.status();
    let body = axum::body::to_bytes(resp.into_body(), usize::MAX)
        .await
        .unwrap();
    let v: Value = serde_json::from_slice(&body).unwrap_or(Value::Null);
    (status, v)
}

fn auth_state(pool: PgPool) -> AuthState {
    AuthState::new(TEST_SECRET.to_string(), REFRESH_SECRET.to_string(), 1)
        .with_permission_resolver(pool)
}

#[sqlx::test(migrations = false)]
async fn auth_middleware_backfills_permissions_and_keeps_tenant(pool: PgPool) {
    seed_grant_tables(&pool).await;
    let user_id = Uuid::new_v4();
    let tenant = Uuid::new_v4();
    grant_user(
        &pool,
        user_id,
        "tenant_admin",
        &["crm:customer:read", "pm:project:read", "hrm:employee:read"],
        tenant,
    )
    .await;

    // 紧凑 token 内 roles/permissions 均为旧快照，必须被服务端解析覆盖。
    let claims = make_claims(user_id, tenant);
    let token = claims.encode_compact(TEST_SECRET).unwrap();
    assert!(topems_shared_auth::token_permission_version(&token).is_some());

    let (status, body) = call(&build_app(auth_state(pool)), &token).await;
    assert_eq!(status, StatusCode::OK, "回填成功应放行: {body}");

    let roles = body["roles"].as_array().unwrap();
    assert_eq!(roles.len(), 1);
    assert_eq!(roles[0], "tenant_admin", "角色应来自 DB 实时解析");

    let perms = body["permissions"].as_array().unwrap();
    let codes: Vec<&str> = perms.iter().filter_map(Value::as_str).collect();
    assert_eq!(codes.len(), 3, "权限码应完整回填: {codes:?}");
    for expected in ["crm:customer:read", "pm:project:read", "hrm:employee:read"] {
        assert!(codes.contains(&expected), "缺少权限 {expected}: {codes:?}");
    }

    // 租户上下文不得因权限回填而丢失，普通用户不得进入系统通道。
    assert_eq!(body["tenant_id"], tenant.to_string());
    assert_eq!(body["rls_tenant"], tenant.to_string());
    assert_eq!(body["rls_system"], false);
}

#[sqlx::test(migrations = false)]
async fn auth_middleware_rejects_cross_tenant_context_swap(pool: PgPool) {
    seed_grant_tables(&pool).await;
    let user_a = Uuid::new_v4();
    let user_b = Uuid::new_v4();
    let tenant_a = Uuid::new_v4();
    let tenant_b = Uuid::new_v4();
    grant_user(&pool, user_a, "employee", &["crm:customer:read"], tenant_a).await;
    grant_user(&pool, user_b, "employee", &["pm:project:read"], tenant_b).await;

    let app = build_app(auth_state(pool));
    let token_a = make_claims(user_a, tenant_a)
        .encode_compact(TEST_SECRET)
        .unwrap();
    let token_b = make_claims(user_b, tenant_b)
        .encode_compact(TEST_SECRET)
        .unwrap();

    let (status_a, body_a) = call(&app, &token_a).await;
    let (status_b, body_b) = call(&app, &token_b).await;
    assert_eq!(status_a, StatusCode::OK);
    assert_eq!(status_b, StatusCode::OK);

    assert_eq!(body_a["rls_tenant"], tenant_a.to_string());
    assert_eq!(body_b["rls_tenant"], tenant_b.to_string());
    assert_ne!(
        body_a["rls_tenant"], body_b["rls_tenant"],
        "不同租户的请求上下文必须互相隔离"
    );
    // 各自只回填自己的权限，不发生串用。
    assert_eq!(body_a["permissions"].as_array().unwrap().len(), 1);
    assert_eq!(body_b["permissions"].as_array().unwrap().len(), 1);
    assert_ne!(body_a["permissions"], body_b["permissions"]);
}

/// 生产口径回归：授权表 FORCE RLS 时，解析器必须以系统上下文读到用户授权，
/// 且该上下文只存在于解析事务内，不得泄漏给后续请求。
#[sqlx::test(migrations = false)]
async fn resolver_reads_tenant_scoped_grants_without_leaking_context(pool: PgPool) {
    seed_grant_tables(&pool).await;
    let user_id = Uuid::new_v4();
    let tenant = Uuid::new_v4();
    grant_user(
        &pool,
        user_id,
        "tenant_admin",
        &["crm:customer:read"],
        tenant,
    )
    .await;

    enable_prod_rls(&pool).await;

    // 无系统上下文时授权行必须不可见——证明 RLS 确实生效（测试不是空转）。
    let visible: i64 = sqlx::query_scalar("SELECT count(*) FROM core_user_roles")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(visible, 0, "未设置租户上下文时不应看到授权行");

    let resolver = topems_shared_auth::PermissionResolver::with_ttl(
        pool.clone(),
        std::time::Duration::from_secs(60),
    );
    let (roles, permissions) = resolver.resolve(user_id).await.unwrap();
    assert_eq!(roles, vec!["tenant_admin".to_string()]);
    assert_eq!(permissions, vec!["crm:customer:read".to_string()]);

    // 解析结束后 GUC 必须复位：复用同一池仍看不到授权行（无系统上下文泄漏）。
    let visible_after: i64 = sqlx::query_scalar("SELECT count(*) FROM core_user_roles")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(visible_after, 0, "权限解析的系统上下文不得泄漏给后续请求");
}

#[sqlx::test(migrations = false)]
async fn auth_middleware_fails_closed_when_resolver_errors(pool: PgPool) {
    seed_grant_tables(&pool).await;
    let user_id = Uuid::new_v4();
    let tenant = Uuid::new_v4();
    grant_user(&pool, user_id, "employee", &["crm:customer:read"], tenant).await;

    // 模拟授权表不可用：删表后 resolve 必然报错。
    sqlx::query("DROP TABLE core_user_roles")
        .execute(&pool)
        .await
        .unwrap();

    let token = make_claims(user_id, tenant)
        .encode_compact(TEST_SECRET)
        .unwrap();
    let (status, body) = call(&build_app(auth_state(pool)), &token).await;

    assert_eq!(
        status,
        StatusCode::SERVICE_UNAVAILABLE,
        "解析失败必须 fail-closed 返回 503，而不是静默空权限 403: {body}"
    );
}

#[sqlx::test(migrations = false)]
async fn auth_middleware_superuser_uses_system_channel(pool: PgPool) {
    seed_grant_tables(&pool).await;
    let mut claims = make_claims(Uuid::new_v4(), Uuid::new_v4());
    claims.is_superuser = true;

    let token = claims.encode_compact(TEST_SECRET).unwrap();
    let (status, body) = call(&build_app(auth_state(pool)), &token).await;

    assert_eq!(status, StatusCode::OK);
    // 超管短路：不查授权表，RLS 走系统通道（nil tenant + system=true）。
    assert_eq!(body["rls_system"], true);
    assert_eq!(
        body["rls_tenant"],
        Uuid::nil().to_string(),
        "超管应进入系统通道而非 token 租户"
    );
}
