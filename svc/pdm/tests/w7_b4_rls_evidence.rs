//! W7-B4 PDM 本地验证（证据 2 / 证据 3）
//!
//! 依赖：
//!   * 本地库 `w7_b4_fresh`（由生产 `--schema=pdm` 结构导入 + 两笔迁移 + A/B 造数）
//!   * 以**非超户**角色 `pdm_app` 连接（超户会绕过 RLS，测不出隔离）
//!   * 环境变量 `PDM_RLS_TEST_DB`，默认
//!     `postgres://pdm_app@127.0.0.1:5432/w7_b4_fresh`
//!
//! 覆盖：
//!   证据 2 —— 缓存不串：A 查 → B 查同一逻辑 key → 再 A 查，A 的结果没被 B 覆盖
//!   证据 3 —— nil 上下文报错：4 个业务入口在缺租户时返回 code=400，而不是空数组
#![allow(clippy::unwrap_used, clippy::expect_used)]

use std::sync::Arc;

use axum::extract::{Path, Query, State};
use axum::http::HeaderMap;
use axum::Extension;
use serde_json::Value;
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use uuid::Uuid;

use topems_pdm::modules::document::{self, ListDocumentsQuery};
use topems_pdm::modules::material::{self, MaterialQuery};
use topems_pdm::modules::product::{self, ProductQuery};
use topems_pdm::shared::AppState;
use topems_shared_auth::auth::{AuthState, Claims};
use topems_shared_auth::middleware::tenant::{
    rls_request_tenant, scope_request_tenant, RlsTxnCell,
};
use topems_shared_core::health::SimpleHealthConfig;
use topems_shared_core::l2_cache::{AsyncL2Cache, L2CacheConfig};
use topems_shared_db::scope::Db;

const TENANT_A: &str = "11111111-1111-1111-1111-111111111111";
const TENANT_B: &str = "22222222-2222-2222-2222-222222222222";

fn test_claims(tenant: Option<&str>, superuser: bool) -> Claims {
    Claims {
        sub: "w7-b4-probe".to_string(),
        username: "w7-b4-probe".to_string(),
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
    let url = std::env::var("PDM_RLS_TEST_DB")
        .unwrap_or_else(|_| {
            "postgres://pdm_app:pdm_app_local_only@127.0.0.1:5432/w7_b4_fresh".to_string()
        });
    PgPoolOptions::new()
        .max_connections(4)
        .connect(&url)
        .await
        .ok()
}

fn build_state(pool: PgPool) -> AppState {
    AppState {
        auth_state: AuthState::new(
            "w7-b4-test-jwt-secret-key-at-least-32-characters-long".to_string(),
            "w7-b4-test-refresh-secret-key-at-least-32-chars".to_string(),
            1,
        ),
        db: Db::new(pool, "pdm, public"),
        health_config: SimpleHealthConfig::new("pdm-w7-b4-test"),
        event_publisher: None,
        dict_cache: Arc::new(AsyncL2Cache::<Value>::new_l1_only(L2CacheConfig::default())),
    }
}

/// 模拟 tenant_middleware 建立的请求级事务 + 租户 task-local。
async fn txn_cell(pool: &PgPool) -> RlsTxnCell {
    let tx = pool.begin().await.expect("begin rls txn");
    Arc::new(tokio::sync::Mutex::new(Some(tx)))
}

async fn list_materials(
    state: &AppState,
    pool: &PgPool,
    claims: &Claims,
) -> topems_shared_core::response::ApiResponse<Value> {
    let cell = txn_cell(pool).await;
    let ctx = rls_request_tenant(claims);
    let st = state.clone();
    let c = claims.clone();
    scope_request_tenant(ctx, async move {
        material::list_materials(
            State(st),
            Extension(cell),
            Extension(c),
            Query(MaterialQuery {
                page: Some(1),
                page_size: Some(20),
                search: None,
                status: None,
            }),
            HeaderMap::new(),
        )
        .await
    })
    .await
}

async fn material_ids(data: &Value) -> Vec<String> {
    data.get("materials")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|m| m.get("id").and_then(|i| i.as_str()).map(str::to_string))
                .collect()
        })
        .unwrap_or_default()
}

/// 证据 2：缓存带租户维度，A 的结果不会被 B 覆盖。
#[tokio::test]
#[ignore = "requires local w7_b4_fresh with A/B seed"]
async fn evidence2_cache_does_not_bleed_across_tenants() {
    let Some(pool) = connect().await else {
        eprintln!("⏭ 跳过：本地 w7_b4_fresh 不可达");
        return;
    };
    let state = build_state(pool.clone());

    let claims_a = test_claims(Some(TENANT_A), false);
    let claims_b = test_claims(Some(TENANT_B), false);

    // 1) A 查一次
    let ra = list_materials(&state, &pool, &claims_a).await;
    assert_eq!(ra.code, 200, "A 列表应成功: {}", ra.message);
    let ids_a1 = material_ids(ra.data.as_ref().unwrap()).await;
    assert_eq!(ids_a1.len(), 1, "A 应只看到自己的 1 行，实际 {:?}", ids_a1);

    // 2) B 查同一逻辑 key（同 page/page_size/search/status，仅租户不同）
    let rb = list_materials(&state, &pool, &claims_b).await;
    assert_eq!(rb.code, 200, "B 列表应成功: {}", rb.message);
    let ids_b = material_ids(rb.data.as_ref().unwrap()).await;
    assert_eq!(ids_b.len(), 1, "B 应只看到自己的 1 行，实际 {:?}", ids_b);
    assert_ne!(ids_a1, ids_b, "A/B 结果不得相同（缓存串租户）");

    // 3) 再 A 查一次：必须仍是 A 的结果，没被 B 覆盖
    let ra2 = list_materials(&state, &pool, &claims_a).await;
    assert_eq!(ra2.code, 200);
    let ids_a2 = material_ids(ra2.data.as_ref().unwrap()).await;
    assert_eq!(ids_a1, ids_a2, "A 的缓存被 B 覆盖了");
}

/// 证据 3：nil 租户在业务入口必须 400，而不是返回空数组。
#[tokio::test]
#[ignore = "requires local w7_b4_fresh with A/B seed"]
async fn evidence3_nil_tenant_returns_400() {
    let Some(pool) = connect().await else {
        eprintln!("⏭ 跳过：本地 w7_b4_fresh 不可达");
        return;
    };
    let state = build_state(pool.clone());

    // 先取一个 A 的真实 id，供 get_* 入口使用
    let claims_a = test_claims(Some(TENANT_A), false);
    let ra = list_materials(&state, &pool, &claims_a).await;
    let ids = material_ids(ra.data.as_ref().unwrap()).await;
    let mid: Uuid = Uuid::parse_str(ids.first().expect("seed 缺失")).unwrap();

    // 普通用户 + 无租户
    let nil_claims = test_claims(None, false);

    let r1 = list_materials(&state, &pool, &nil_claims).await;
    assert_eq!(r1.code, 400, "list_materials 缺租户应 400，实际 {}", r1.code);

    let r2 = {
        let cell = txn_cell(&pool).await;
        let ctx = rls_request_tenant(&nil_claims);
        let st = state.clone();
        let c = nil_claims.clone();
        scope_request_tenant(ctx, async move {
            material::get_material(
                State(st),
                Extension(cell),
                Extension(c),
                Path(mid),
                HeaderMap::new(),
            )
            .await
        })
        .await
    };
    assert_eq!(r2.code, 400, "get_material 缺租户应 400，实际 {}", r2.code);

    let r3 = {
        let cell = txn_cell(&pool).await;
        let ctx = rls_request_tenant(&nil_claims);
        let st = state.clone();
        let c = nil_claims.clone();
        scope_request_tenant(ctx, async move {
            product::list_products(
                State(st),
                Extension(cell),
                Extension(c),
                Query(ProductQuery {
                    page: Some(1),
                    page_size: Some(20),
                    search: None,
                    status: None,
                }),
                HeaderMap::new(),
            )
            .await
        })
        .await
    };
    assert_eq!(r3.code, 400, "list_products 缺租户应 400，实际 {}", r3.code);

    let r4 = {
        let cell = txn_cell(&pool).await;
        let ctx = rls_request_tenant(&nil_claims);
        let st = state.clone();
        let c = nil_claims.clone();
        scope_request_tenant(ctx, async move {
            document::list_documents(
                State(st),
                Extension(cell),
                Extension(c),
                Query(ListDocumentsQuery {
                    page: Some(1),
                    page_size: Some(20),
                    search: None,
                    status: None,
                }),
                HeaderMap::new(),
            )
            .await
        })
        .await
    };
    assert_eq!(r4.code, 400, "list_documents 缺租户应 400，实际 {}", r4.code);
}
