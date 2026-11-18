#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! RLS 阶段二演练：新代码 + 新策略组合实测。
//!
//! 直连演练库（`topems_rls_drill`，应用角色 `topems_prod`，非超户、非表 owner），
//! 按 `tenant_middleware` 的真实做法开启请求事务并设置
//! `app.tenant_id` / `app.rls_system`，然后**直接调用 ERP 四个创建 handler**：
//! `/meeting-rooms`、`/meeting-bookings`、`/vehicles`、`/vehicle-requests`。
//! 目的是证明「阶段一代码写入的 INSERT 语句」与「M2 补列后的表结构 + M1 收紧后的策略」匹配。
//!
//! 运行：
//! ```bash
//! DATABASE_URL="postgres://topems_prod@localhost/topems_rls_drill?host=/tmp" \
//!   cargo test -p topems-erp --test rls_drill_erp_create -- --ignored --nocapture
//! ```

#[path = "common/app_state.rs"]
mod app_state;

use std::sync::Arc;

use axum::extract::State;
use axum::http::HeaderMap;
use axum::{Extension, Json};
use chrono::{Duration, Utc};
use sqlx::postgres::{PgPool, PgPoolOptions};
use uuid::Uuid;

use app_state::{tenant_claims as claims_for, test_api_state as test_state};
use topems_erp::models::{
    CreateMeetingBookingRequest, CreateMeetingRoomRequest, CreateVehicleRequest,
    CreateVehicleRequestRequest,
};
use topems_erp::modules::meeting_room::{create_booking, create_room};
use topems_erp::modules::vehicles::{create_vehicle, create_vehicle_request};

type RlsTxnCell = Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>;

/// 与 `tenant_middleware` 完全一致的请求事务：BEGIN + 事务级 GUC。
async fn begin_request_txn(pool: &PgPool, tenant: Uuid) -> RlsTxnCell {
    let mut txn = pool.begin().await.unwrap();
    sqlx::query(
        "SELECT set_config('app.tenant_id', $1, true), \
                set_config('app.rls_system', $2, true)",
    )
    .bind(tenant.to_string())
    .bind("off")
    .execute(&mut *txn)
    .await
    .unwrap();
    Arc::new(tokio::sync::Mutex::new(Some(txn)))
}

/// 只读作用域查询：同样带租户 GUC，验证落库结果与跨租户可见性。
async fn scoped_count(pool: &PgPool, tenant: Uuid, table: &str, id: Uuid) -> i64 {
    let mut txn = pool.begin().await.unwrap();
    sqlx::query(
        "SELECT set_config('app.tenant_id', $1, true), set_config('app.rls_system', 'off', true)",
    )
    .bind(tenant.to_string())
    .execute(&mut *txn)
    .await
    .unwrap();
    // table 只来自测试内常量，且用 AssertSqlSafe 标注已人工审阅
    let sql = format!("SELECT COUNT(*) FROM erp.{table} WHERE id = $1");
    let count: i64 = sqlx::query_scalar(sqlx::AssertSqlSafe(sql))
        .bind(id)
        .fetch_one(&mut *txn)
        .await
        .unwrap();
    txn.rollback().await.unwrap();
    count
}

async fn scoped_tenant_of(pool: &PgPool, tenant: Uuid, table: &str, id: Uuid) -> Option<Uuid> {
    let mut txn = pool.begin().await.unwrap();
    sqlx::query(
        "SELECT set_config('app.tenant_id', $1, true), set_config('app.rls_system', 'off', true)",
    )
    .bind(tenant.to_string())
    .execute(&mut *txn)
    .await
    .unwrap();
    let sql = format!("SELECT tenant_id FROM erp.{table} WHERE id = $1");
    let row: Option<Uuid> = sqlx::query_scalar(sqlx::AssertSqlSafe(sql))
        .bind(id)
        .fetch_optional(&mut *txn)
        .await
        .unwrap();
    txn.rollback().await.unwrap();
    row
}

#[tokio::test]
#[ignore = "演练专用：需要已应用 M1/M2 的本地演练库 topems_rls_drill"]
async fn erp_create_handlers_write_under_new_policies() {
    // 不再内置任何默认 DSN（原默认含生产角色 topems_prod）；演练库单独一个变量，
    // 不复用 DATABASE_URL，避免任何环境把它指向生产库。
    let url = std::env::var("RLS_DRILL_DATABASE_URL").expect(
        "缺少环境变量 RLS_DRILL_DATABASE_URL：演练测试不再回退到默认连接串。\
         请显式设置，例如 export RLS_DRILL_DATABASE_URL='postgres://topems_app@localhost/topems_rls_drill?host=/tmp'",
    );
    // 与 ERP 生产连接一致：search_path = erp, public, shared（handler 的 SQL 不带 schema 前缀）
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .after_connect(|conn, _meta| {
            Box::pin(async move {
                sqlx::query("SET search_path TO erp, public, shared")
                    .execute(conn)
                    .await?;
                Ok(())
            })
        })
        .connect(&url)
        .await
        .unwrap();

    let who: (String, bool, bool) = sqlx::query_as(
        "SELECT current_user::text, \
                (SELECT rolbypassrls FROM pg_roles r WHERE r.rolname = current_user), \
                (SELECT rolsuper FROM pg_roles r WHERE r.rolname = current_user)",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    println!(
        "[env] db={url} user={} bypassrls={} super={}",
        who.0, who.1, who.2
    );
    assert!(!who.1 && !who.2, "演练必须以非超户、非 bypassrls 角色执行");

    let state = test_state(pool.clone());
    let tenant_a = Uuid::new_v4();
    let tenant_b = Uuid::new_v4();
    let headers = HeaderMap::new();

    // 1) POST /erp/meeting-rooms
    let room_req = CreateMeetingRoomRequest {
        name: "RLS 演练会议室".to_string(),
        capacity: 8,
        location: Some("3F".to_string()),
        facilities: Some(vec!["投影".to_string()]),
    };
    let room_id = Uuid::new_v4();
    let room_resp = create_room(
        State(state.clone()),
        headers.clone(),
        Extension(begin_request_txn(&pool, tenant_a).await),
        Extension(claims_for(tenant_a)),
        Json(room_req),
    )
    .await;
    println!(
        "[1] POST /meeting-rooms success={} msg={}",
        room_resp.success, room_resp.message
    );
    assert!(room_resp.success, "创建会议室失败: {}", room_resp.message);
    let room_id = room_resp.data.map(|r| r.id).unwrap_or(room_id);
    assert_eq!(
        scoped_count(&pool, tenant_a, "meeting_rooms", room_id).await,
        1
    );
    assert_eq!(
        scoped_tenant_of(&pool, tenant_a, "meeting_rooms", room_id).await,
        Some(tenant_a)
    );
    println!("[1] tenant_id 落库 = {tenant_a}（与 claims 一致）");

    // 2) POST /erp/meeting-bookings
    let now = Utc::now();
    let booking_req = CreateMeetingBookingRequest {
        room_id,
        title: "RLS 演练预约".to_string(),
        organizer: "drill".to_string(),
        start_time: now + Duration::hours(1),
        end_time: now + Duration::hours(2),
    };
    let booking_resp = create_booking(
        State(state.clone()),
        headers.clone(),
        Extension(begin_request_txn(&pool, tenant_a).await),
        Extension(claims_for(tenant_a)),
        Json(booking_req),
    )
    .await;
    println!(
        "[2] POST /meeting-bookings success={} msg={}",
        booking_resp.success, booking_resp.message
    );
    assert!(
        booking_resp.success,
        "创建会议预约失败: {}",
        booking_resp.message
    );
    let booking_id = booking_resp.data.unwrap().id;
    assert_eq!(
        scoped_tenant_of(&pool, tenant_a, "meeting_bookings", booking_id).await,
        Some(tenant_a)
    );

    // 3) POST /erp/vehicles
    let vehicle_req = CreateVehicleRequest {
        plate_number: format!("沪A·{}", &Uuid::new_v4().to_string()[..8]),
        brand: Some("drill".to_string()),
        model: Some("T1".to_string()),
        vehicle_type: Some("car".to_string()),
        driver: Some("drill".to_string()),
        mileage: Some(0),
        fuel_type: Some("gasoline".to_string()),
    };
    let vehicle_resp = create_vehicle(
        State(state.clone()),
        headers.clone(),
        Extension(begin_request_txn(&pool, tenant_a).await),
        Extension(claims_for(tenant_a)),
        Json(vehicle_req),
    )
    .await;
    println!(
        "[3] POST /vehicles success={} msg={}",
        vehicle_resp.success, vehicle_resp.message
    );
    assert!(
        vehicle_resp.success,
        "创建车辆失败: {}",
        vehicle_resp.message
    );
    let vehicle = vehicle_resp.data.unwrap();
    assert_eq!(
        scoped_tenant_of(&pool, tenant_a, "vehicles", vehicle.id).await,
        Some(tenant_a)
    );

    // 4) POST /erp/vehicle-requests
    let vr_req = CreateVehicleRequestRequest {
        vehicle_id: vehicle.id,
        requester: "drill".to_string(),
        purpose: "RLS 演练用车".to_string(),
        start_time: now + Duration::hours(3),
        end_time: now + Duration::hours(4),
        driver_required: true,
    };
    let vr_resp = create_vehicle_request(
        State(state.clone()),
        headers.clone(),
        Extension(begin_request_txn(&pool, tenant_a).await),
        Extension(claims_for(tenant_a)),
        Json(vr_req),
    )
    .await;
    println!(
        "[4] POST /vehicle-requests success={} msg={}",
        vr_resp.success, vr_resp.message
    );
    assert!(vr_resp.success, "创建用车申请失败: {}", vr_resp.message);
    let vr_id = vr_resp.data.unwrap().id;
    assert_eq!(
        scoped_tenant_of(&pool, tenant_a, "vehicle_requests", vr_id).await,
        Some(tenant_a)
    );

    // 5) 跨租户隔离：B 看不到 A 的会议室，也不能以 A 的会议室创建预约
    assert_eq!(
        scoped_count(&pool, tenant_b, "meeting_rooms", room_id).await,
        0
    );
    assert_eq!(
        scoped_count(&pool, tenant_b, "vehicles", vehicle.id).await,
        0
    );
    let cross = create_booking(
        State(state.clone()),
        headers.clone(),
        Extension(begin_request_txn(&pool, tenant_b).await),
        Extension(claims_for(tenant_b)),
        Json(CreateMeetingBookingRequest {
            room_id,
            title: "越权预约".to_string(),
            organizer: "drill-b".to_string(),
            start_time: now + Duration::hours(5),
            end_time: now + Duration::hours(6),
        }),
    )
    .await;
    println!(
        "[5] 租户B 以租户A 会议室创建预约 success={} msg={}",
        cross.success, cross.message
    );
    assert!(!cross.success, "跨租户创建预约不应成功");
    assert_eq!(
        scoped_count(&pool, tenant_b, "meeting_bookings", booking_id).await,
        0
    );

    // 6) 审计写入由 handler 内的 log_audit_event 走系统通道完成；该角色在演练库对
    //    public.audit_logs 无 SELECT 权限，取证改用超户连接（见演练记录）。
    println!("[6] 审计落库取证见外部 psql（air 连接查询 public.audit_logs）");
    println!("ALL_ERP_CREATE_HANDLERS_OK tenant_a={tenant_a}");
}
