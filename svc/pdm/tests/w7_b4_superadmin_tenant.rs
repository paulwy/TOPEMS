//! 口径 1 实证：超管必须显式选租户（`x-tenant-id`），不允许隐式跨租户。
//!
//! 走真实 `tenant_middleware` + 真实 `pdm` 表与策略，返回实际 HTTP 状态码与行数：
//!   1. 超管 + `x-tenant-id: A`      → 200，只见 A 租户数据
//!   2. 超管 + 无租户头              → 400「缺少租户上下文」
//!   3. 普通用户(租户 A) + `x-tenant-id: B` → 200，仍按 A 解析（头不可欺骗）
//!
//! 依赖同 `w7_b4_rls_evidence.rs`：本地 `w7_b4_fresh`，非超户 `pdm_app` 连接。
#![allow(clippy::unwrap_used, clippy::expect_used)]

use axum::{
    body::Body,
    extract::{Extension, State},
    http::{Request, StatusCode},
    middleware,
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use serde_json::{json, Value};
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use tower::ServiceExt;

use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::{tenant_middleware, RlsTxnCell};

const TENANT_A: &str = "11111111-1111-1111-1111-111111111111";
const TENANT_B: &str = "22222222-2222-2222-2222-222222222222";

fn claims(tenant: Option<&str>, superuser: bool) -> Claims {
    Claims {
        sub: "33333333-3333-3333-3333-333333333333".to_string(),
        username: "w7-b4-superadmin-probe".to_string(),
        role: "admin".to_string(),
        roles: vec!["admin".to_string()],
        permissions: Vec::new(),
        is_superuser: superuser,
        exp: 4_102_444_800,
        iat: 0,
        email: None,
        department: None,
        tenant_id: tenant.map(|s| s.to_string()),
        department_id: None,
        position_id: None,
        position_code: None,
        must_change_password: false,
    }
}

async fn connect() -> Option<PgPool> {
    let url = std::env::var("PDM_RLS_TEST_DB").unwrap_or_else(|_| {
        "postgres://pdm_app:pdm_app_local_only@127.0.0.1:5432/w7_b4_fresh".to_string()
    });
    PgPoolOptions::new()
        .max_connections(4)
        .connect(&url)
        .await
        .ok()
}

/// 真实表 + 真实策略下的可见租户集合（用租户集合而非行数，避免 A/B 行数相同导致断言失效）。
async fn visible_tenants(
    State(_pool): State<PgPool>,
    Extension(cell): Extension<RlsTxnCell>,
) -> impl IntoResponse {
    let mut guard = cell.lock().await;
    let Some(txn) = guard.as_mut() else {
        return (StatusCode::INTERNAL_SERVER_ERROR, "rls txn missing").into_response();
    };
    let tenants: Vec<(String,)> =
        sqlx::query_as("SELECT DISTINCT tenant_id::text FROM pdm.pdm_materials ORDER BY 1")
            .fetch_all(&mut **txn)
            .await
            .unwrap_or_default();
    Json(json!({
        "count": tenants.len(),
        "tenants": tenants.into_iter().map(|t| t.0).collect::<Vec<_>>(),
    }))
    .into_response()
}

fn app(pool: PgPool) -> Router {
    Router::new()
        .route("/visible-tenants", get(visible_tenants))
        .with_state(pool.clone())
        .layer(middleware::from_fn_with_state(
            pool.clone(),
            tenant_middleware(),
        ))
}

async fn call(app: &Router, claims: Claims, tenant_header: Option<&str>) -> (StatusCode, Value) {
    let mut builder = Request::builder().uri("/visible-tenants");
    if let Some(t) = tenant_header {
        builder = builder.header("x-tenant-id", t);
    }
    let mut req = builder.body(Body::empty()).unwrap();
    req.extensions_mut().insert(claims);
    let resp = app.clone().oneshot(req).await.unwrap();
    let status = resp.status();
    let body = axum::body::to_bytes(resp.into_body(), usize::MAX)
        .await
        .unwrap();
    let v: Value = serde_json::from_slice(&body).unwrap_or(Value::Null);
    (status, v)
}

#[tokio::test]
#[ignore = "requires local w7_b4_fresh with A/B seed"]
async fn superadmin_with_explicit_tenant_header_scoped_to_that_tenant() {
    let Some(pool) = connect().await else {
        eprintln!("⏭ 跳过：本地 w7_b4_fresh 不可达");
        return;
    };
    let (status, body) = call(&app(pool), claims(None, true), Some(TENANT_A)).await;
    println!("超管+头A → {status} {body}");
    assert_eq!(status, StatusCode::OK, "超管显式选租户应放行");
    assert_eq!(
        body["tenants"],
        json!([TENANT_A]),
        "超管带 x-tenant-id=A 时只能看到 A 的数据"
    );
}

#[tokio::test]
#[ignore = "requires local w7_b4_fresh with A/B seed"]
async fn superadmin_without_tenant_header_is_400() {
    let Some(pool) = connect().await else {
        eprintln!("⏭ 跳过：本地 w7_b4_fresh 不可达");
        return;
    };
    let (status, body) = call(&app(pool), claims(None, true), None).await;
    println!("超管+无头 → {status} {body}");
    assert_eq!(status, StatusCode::BAD_REQUEST, "超管无租户头必须 400");
    assert_eq!(body["code"], 400);
    assert!(
        body["message"]
            .as_str()
            .unwrap_or_default()
            .contains("缺少租户上下文"),
        "错误信息必须说明缺少租户上下文，实际：{}",
        body["message"]
    );
}

#[tokio::test]
#[ignore = "requires local w7_b4_fresh with A/B seed"]
async fn normal_user_cannot_be_spoofed_by_tenant_header() {
    let Some(pool) = connect().await else {
        eprintln!("⏭ 跳过：本地 w7_b4_fresh 不可达");
        return;
    };
    let (status, body) = call(&app(pool), claims(Some(TENANT_A), false), Some(TENANT_B)).await;
    println!("普通用户(租户A)+头B → {status} {body}");
    assert_eq!(status, StatusCode::OK);
    assert_eq!(
        body["tenants"],
        json!([TENANT_A]),
        "普通用户伪造他人的 x-tenant-id 仍必须按自己租户解析"
    );
}
