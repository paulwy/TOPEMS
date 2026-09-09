//! RLS A 方案 · 真实 tenant_middleware → handler 端到端验证（sqlx::test 临时库）
//!
//! 覆盖链路：Claims(tenant_id) → tenant_middleware（begin + set_config('app.tenant_id') + 注入 txn）
//! → handler 经 Extension 提取 txn → `&mut **txn` 查询 → RLS 过滤。
//! 此前该链路仅以 DB 层手动模拟（crm rls_isolation_test）；本测试直接驱动
//! 真实中间件代码，补"中间件 → handler"缺口。

use axum::{
    body::Body,
    extract::{Extension, Request, State},
    http::StatusCode,
    middleware,
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use serde_json::{json, Value};
use sqlx::PgPool;
use std::sync::Arc;
use tokio::sync::Mutex;
use tower::ServiceExt;
use uuid::Uuid;

use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::tenant_middleware;

type TxnExt = Arc<Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>;

async fn list_items(
    State(_pool): State<PgPool>,
    Extension(txn_arc): Extension<TxnExt>,
) -> impl IntoResponse {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let rows: Vec<(Uuid, String)> =
        sqlx::query_as("SELECT id, name FROM rls_e2e_items ORDER BY name")
            .fetch_all(&mut **txn)
            .await
            .unwrap();
    Json(json!({ "count": rows.len(), "rows": rows }))
}

fn make_claims(tenant_id: Option<&str>, user_id: &str, role: &str) -> Claims {
    Claims {
        sub: user_id.to_string(),
        username: "e2e-user".to_string(),
        role: role.to_string(),
        roles: vec![],
        permissions: vec![],
        is_superuser: false,
        exp: 9999999999,
        iat: 0,
        email: None,
        department: None,
        tenant_id: tenant_id.map(|s| s.to_string()),
        department_id: None,
        position_id: None,
        position_code: None,
    }
}

async fn seed_and_build(pool: &PgPool) -> (Uuid, Uuid) {
    sqlx::query("DROP TABLE IF EXISTS rls_e2e_items CASCADE")
        .execute(pool)
        .await
        .unwrap();
    sqlx::query(
        "CREATE TABLE rls_e2e_items (id uuid PRIMARY KEY, tenant_id uuid NOT NULL, name text NOT NULL)",
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query("ALTER TABLE rls_e2e_items ENABLE ROW LEVEL SECURITY")
        .execute(pool)
        .await
        .unwrap();
    sqlx::query("ALTER TABLE rls_e2e_items FORCE ROW LEVEL SECURITY")
        .execute(pool)
        .await
        .unwrap();
    sqlx::query("CREATE POLICY rls_tenant_isolation ON rls_e2e_items USING (
           current_setting('app.tenant_id', true) IS NULL
           OR current_setting('app.tenant_id', true) = ''
           OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
           OR tenant_id IS NULL
           OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
         ) WITH CHECK (
           current_setting('app.tenant_id', true) IS NULL
           OR current_setting('app.tenant_id', true) = ''
           OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
           OR tenant_id IS NULL
           OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
         )")
    .execute(pool)
    .await
    .unwrap();

    let t1 = Uuid::new_v4();
    let t2 = Uuid::new_v4();
    sqlx::query("INSERT INTO rls_e2e_items (id, tenant_id, name) VALUES ($1, $2, 't1-item')")
        .bind(Uuid::new_v4())
        .bind(t1)
        .execute(pool)
        .await
        .unwrap();
    sqlx::query("INSERT INTO rls_e2e_items (id, tenant_id, name) VALUES ($1, $2, 't2-item')")
        .bind(Uuid::new_v4())
        .bind(t2)
        .execute(pool)
        .await
        .unwrap();
    (t1, t2)
}

fn build_app(pool: PgPool) -> Router {
    Router::new()
        .route("/items", get(list_items))
        .with_state(pool.clone())
        .layer(middleware::from_fn_with_state(pool.clone(), tenant_middleware()))
}

async fn get_body(app: &Router, claims: Option<Claims>) -> (StatusCode, Value) {
    let mut req = Request::builder().uri("/items").body(Body::empty()).unwrap();
    if let Some(c) = claims {
        req.extensions_mut().insert(c);
    }
    let resp = app.clone().oneshot(req).await.unwrap();
    let status = resp.status();
    let body = axum::body::to_bytes(resp.into_body(), usize::MAX).await.unwrap();
    let v: Value = serde_json::from_slice(&body).unwrap_or(Value::Null);
    (status, v)
}

#[sqlx::test(migrations = false)]
async fn tenant_middleware_filters_by_claims_tenant(pool: PgPool) {
    let (t1, t2) = seed_and_build(&pool).await;
    let app = build_app(pool);

    let (status, body) = get_body(&app, Some(make_claims(Some(t1.to_string().as_str()), "123e4567-e89b-12d3-a456-426614174001", "user"))).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["count"], 1, "T1 上下文应仅见本租户行");
    assert_eq!(body["rows"][0][1], "t1-item");

    let (status, body) = get_body(&app, Some(make_claims(Some(t2.to_string().as_str()), "123e4567-e89b-12d3-a456-426614174002", "user"))).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["count"], 1, "T2 上下文应仅见本租户行");
    assert_eq!(body["rows"][0][1], "t2-item");
}

#[sqlx::test(migrations = false)]
async fn tenant_middleware_service_claims_full_access(pool: PgPool) {
    let (_t1, _t2) = seed_and_build(&pool).await;
    let app = build_app(pool);

    // service 身份：无 tenant_id，中间件置 nil UUID 上下文 → RLS 策略豁免 → 全量
    let (status, body) =
        get_body(&app, Some(make_claims(None, "00000000-0000-0000-0000-000000000000", "service"))).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["count"], 2, "service 身份应全量访问（nil 豁免）");
}

#[sqlx::test(migrations = false)]
async fn tenant_middleware_unauthorized_without_claims(pool: PgPool) {
    let (_t1, _t2) = seed_and_build(&pool).await;
    let app = build_app(pool);

    let (status, _body) = get_body(&app, None).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED, "无 Claims 应 401");
}
