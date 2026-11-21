//! ERP→MES 成功分支集成测试（本地桩 + 本地测试库）
//!
//! 验证 `MesErpSyncService::sync_erp_to_mes` 的成功分支：
//! - 复用请求级 RLS 事务，并由服务在结束前显式提交；
//! - `integration.mes_erp_sync` 从 pending 更新为 success，并回填 MES 订单 id；
//! - `integration.mes_erp_sync_logs` 落一条 success 日志；
//! - `deny_request_own_txn` / `deny_request_tenant_scope` 开启时不触发守卫。
//!
//! ERP 与 MES 都由本机 axum 桩服务模拟，不连接任何外部系统。
//! 运行方式见 `docs/quality/integration-mes-erp-stub-verification-2026-11-22.md`。

#![allow(
    clippy::unwrap_used,
    clippy::expect_used,
    clippy::indexing_slicing,
    clippy::as_conversions,
    clippy::cast_possible_truncation
)]

use axum::extract::{Path, State};
use axum::routing::{get, post};
use axum::{Json, Router};
use serde_json::{json, Value};
use sqlx::postgres::{PgPool, PgPoolOptions};
use sqlx::Row;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use tokio::net::TcpListener;
use topems_integration::mes_erp_sync::MesErpSyncService;
use topems_shared_auth::middleware::tenant::{scope_request_tenant, RlsRequestTenant, RlsTxnCell};
use topems_shared_db::scope::Db;
use uuid::Uuid;

fn test_database_url() -> String {
    std::env::var("TEST_DATABASE_URL").expect(
        "[test-dsn] 未设置 TEST_DATABASE_URL：测试库 DSN 必须显式提供，禁止回退到 DATABASE_URL 或硬编码开发库",
    )
}

#[derive(Clone)]
struct StubState {
    mes_id: Uuid,
    order_no: String,
    erp_hits: Arc<AtomicUsize>,
    mes_hits: Arc<AtomicUsize>,
    last_mes_body: Arc<std::sync::Mutex<Option<Value>>>,
}

/// 模拟 ERP：GET /api/erp/production-orders/{id}
async fn erp_order(State(state): State<StubState>, Path(id): Path<String>) -> Json<Value> {
    state.erp_hits.fetch_add(1, Ordering::SeqCst);
    Json(json!({
        "data": {
            "id": id,
            "order_no": state.order_no,
            "product_name": "桩测试产品",
            "product_code": "STUB-P-001",
            "quantity": 12.5,
            "status": "released",
            "planned_start_date": "2026-11-23T00:00:00Z",
            "planned_end_date": "2026-11-30T00:00:00Z",
            "workshop_id": Uuid::nil().to_string(),
            "workshop_name": "桩测试车间",
            "priority": 1,
            "notes": "stub erp order",
            "source": "ERP_STUB",
        }
    }))
}

/// 模拟 MES：POST /api/mes/production-orders/from-erp
async fn mes_from_erp(State(state): State<StubState>, Json(body): Json<Value>) -> Json<Value> {
    state.mes_hits.fetch_add(1, Ordering::SeqCst);
    *state.last_mes_body.lock().expect("mes body lock") = Some(body);
    Json(json!({
        "code": 0,
        "data": {
            "id": state.mes_id.to_string(),
            "order_no": state.order_no,
        }
    }))
}

async fn spawn_stub(state: StubState) -> String {
    let app = Router::new()
        .route("/api/erp/production-orders/{id}", get(erp_order))
        .route("/api/mes/production-orders/from-erp", post(mes_from_erp))
        .with_state(state);
    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .expect("bind stub listener");
    let addr = listener.local_addr().expect("stub local addr");
    tokio::spawn(async move {
        axum::serve(listener, app).await.expect("serve stub");
    });
    format!("http://{addr}")
}

/// 本地测试库契约差异（仅测试用途，生产 schema 未改）：
/// `integration.mes_erp_sync.mes_order_id` 当前为 NOT NULL，而 ERP→MES 是
/// 「先建同步记录（MES 订单尚未创建）→ 成功后回填」，首条 INSERT 会写入 NULL。
/// 为验证成功分支语义，这里只对 TEST_DATABASE_URL 指向的本地库临时 DROP NOT NULL，
/// 测试结束恢复。该 schema/代码冲突需另行决策（迁移或改代码），见验证文档。
async fn mes_order_id_is_not_null(pool: &PgPool) -> bool {
    let is_nullable: Option<String> = sqlx::query_scalar(
        "SELECT is_nullable FROM information_schema.columns
         WHERE table_schema = 'integration' AND table_name = 'mes_erp_sync'
           AND column_name = 'mes_order_id'",
    )
    .fetch_optional(pool)
    .await
    .expect("query mes_order_id nullability");
    is_nullable.as_deref() == Some("NO")
}

async fn relax_mes_order_id(pool: &PgPool) -> bool {
    let was_not_null = mes_order_id_is_not_null(pool).await;
    if was_not_null {
        sqlx::query(
            "ALTER TABLE integration.mes_erp_sync ALTER COLUMN mes_order_id DROP NOT NULL",
        )
        .execute(pool)
        .await
        .expect("relax mes_order_id NOT NULL (local test db only)");
    }
    was_not_null
}

async fn restore_mes_order_id(pool: &PgPool, was_not_null: bool) {
    if !was_not_null {
        return;
    }
    if let Err(e) = sqlx::query(
        "ALTER TABLE integration.mes_erp_sync ALTER COLUMN mes_order_id SET NOT NULL",
    )
    .execute(pool)
    .await
    {
        eprintln!("[warn] 恢复 mes_order_id NOT NULL 失败（本地测试库可能残留 NULL 行）: {e}");
    }
}

/// 系统通道清理本租户的测试行（FORCE RLS 对 owner 也生效，必须显式开系统通道）。
async fn cleanup_tenant_rows(pool: &PgPool, tenant: Uuid) {
    let mut tx = pool.begin().await.expect("cleanup begin");
    sqlx::query("SELECT set_config('app.rls_system', 'on', true)")
        .execute(&mut *tx)
        .await
        .expect("cleanup rls_system");
    sqlx::query(
        "DELETE FROM integration.mes_erp_sync_logs
         WHERE sync_record_id IN (SELECT id FROM integration.mes_erp_sync WHERE tenant_id = $1)",
    )
    .bind(tenant)
    .execute(&mut *tx)
    .await
    .expect("cleanup logs");
    sqlx::query("DELETE FROM integration.mes_erp_sync WHERE tenant_id = $1")
        .bind(tenant)
        .execute(&mut *tx)
        .await
        .expect("cleanup sync rows");
    tx.commit().await.expect("cleanup commit");
}

#[tokio::test]
#[ignore = "requires TEST_DATABASE_URL (local topems_test)"]
async fn erp_to_mes_success_branch_writes_state_and_log() {
    let url = test_database_url();
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&url)
        .await
        .expect("connect test database");

    let was_not_null = relax_mes_order_id(&pool).await;

    let tenant = Uuid::new_v4();
    let erp_id = Uuid::new_v4();
    let mes_id = Uuid::new_v4();
    let order_no = format!("ERP-STUB-{}", &Uuid::new_v4().to_string()[..8]);

    let stub_state = StubState {
        mes_id,
        order_no: order_no.clone(),
        erp_hits: Arc::new(AtomicUsize::new(0)),
        mes_hits: Arc::new(AtomicUsize::new(0)),
        last_mes_body: Arc::new(std::sync::Mutex::new(None)),
    };
    let stub_url = spawn_stub(stub_state.clone()).await;

    // 与 svc/integration/src/main.rs 一致：两个请求上下文守卫都开启。
    let db = Db::new(pool.clone(), "integration, public")
        .deny_request_own_txn()
        .deny_request_tenant_scope();
    let service = MesErpSyncService::new(db, stub_url.clone(), stub_url.clone());

    let tx = pool.begin().await.expect("begin request txn");
    let cell: RlsTxnCell = Arc::new(tokio::sync::Mutex::new(Some(tx)));
    let tenant_ctx = RlsRequestTenant {
        tenant,
        system: false,
    };

    let result =
        scope_request_tenant(tenant_ctx, async { service.sync_erp_to_mes(&cell, tenant, erp_id).await })
            .await;

    // 失败时先把未提交的请求事务回滚，避免 DDL/清理被行锁阻塞；成功时 cell 已为空。
    {
        let mut guard = cell.lock().await;
        if let Some(tx) = guard.take() {
            let _ = tx.rollback().await;
        }
    }

    let sync_id = result
        .as_ref()
        .ok()
        .and_then(|r| r.sync_id)
        .unwrap_or_default();

    // 读取断言走独立事务 + 系统通道，避免受 RLS 影响。
    let mut read_tx = pool.begin().await.expect("read begin");
    sqlx::query("SELECT set_config('app.rls_system', 'on', true)")
        .execute(&mut *read_tx)
        .await
        .expect("read rls_system");

    let row = if sync_id.is_nil() {
        None
    } else {
        sqlx::query(
            "SELECT sync_direction, sync_status, mes_order_id, erp_order_id, sync_error, last_synced_at
             FROM integration.mes_erp_sync WHERE id = $1",
        )
        .bind(sync_id)
        .fetch_optional(&mut *read_tx)
        .await
        .expect("read sync row")
    };

    let log_row = if sync_id.is_nil() {
        None
    } else {
        sqlx::query(
            "SELECT sync_direction, sync_type, status, attempt, error_message
             FROM integration.mes_erp_sync_logs WHERE sync_record_id = $1",
        )
        .bind(sync_id)
        .fetch_optional(&mut *read_tx)
        .await
        .expect("read sync log")
    };

    read_tx.commit().await.expect("read commit");
    cleanup_tenant_rows(&pool, tenant).await;
    restore_mes_order_id(&pool, was_not_null).await;

    let result = result.expect("ERP→MES 成功分支不应返回错误");
    assert!(result.success, "result.success 应为 true");
    assert_eq!(result.sync_id, Some(sync_id), "应返回 sync_id");
    let details_id = result
        .details
        .as_ref()
        .and_then(|v| v.get("id"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    assert_eq!(details_id, Some(mes_id.to_string()), "details.id 应为 MES 订单 id");

    let row = row.expect("应能读到同步记录");
    assert_eq!(row.get::<String, _>("sync_direction"), "erp_to_mes");
    assert_eq!(row.get::<String, _>("sync_status"), "success");
    assert_eq!(
        row.get::<Option<Uuid>, _>("mes_order_id"),
        Some(mes_id),
        "成功分支应回填 MES 订单 id"
    );
    assert_eq!(row.get::<Option<Uuid>, _>("erp_order_id"), Some(erp_id));
    assert!(row.get::<Option<String>, _>("sync_error").is_none());
    assert!(
        row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("last_synced_at")
            .is_some(),
        "成功分支应写 last_synced_at"
    );

    let log_row = log_row.expect("应恰有一条同步日志");
    assert_eq!(log_row.get::<String, _>("sync_direction"), "erp_to_mes");
    assert_eq!(log_row.get::<String, _>("sync_type"), "create");
    assert_eq!(log_row.get::<String, _>("status"), "success");
    assert_eq!(log_row.get::<i32, _>("attempt"), 1);
    assert!(log_row.get::<Option<String>, _>("error_message").is_none());

    assert_eq!(stub_state.erp_hits.load(Ordering::SeqCst), 1, "ERP 桩应命中 1 次");
    assert_eq!(stub_state.mes_hits.load(Ordering::SeqCst), 1, "MES 桩应命中 1 次");

    let body = stub_state
        .last_mes_body
        .lock()
        .expect("mes body lock")
        .clone()
        .expect("MES 桩应收到请求体");
    assert_eq!(body["erp_order"]["order_number"], order_no);
    assert_eq!(
        body["erp_order"]["order_id"],
        erp_id.to_string(),
        "发给 MES 的 erp_order.order_id 应为 ERP 订单 id"
    );
}
