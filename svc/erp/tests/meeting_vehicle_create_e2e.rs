#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! K2 回归：创建会议预约 / 用车申请必须能读回父实体并成功写入。
//!
//! 背景：`create_booking` 曾用 `SELECT id, name` 却按 `MeetingRoom`（8 列）映射，
//! `create_vehicle_request` 曾用 `SELECT id, plate_number, status` 却按 `Vehicle`（12 列）映射，
//! 运行期报 `no column found for name: capacity/brand`，接口 500。
//! 本用例钉住修好后的行为：显式完整投影 + code 200 + 关联 id 与 tenant_id 正确。

#[path = "common/app_state.rs"]
mod app_state;

use axum::extract::State;
use axum::http::HeaderMap;
use axum::{Extension, Json};
use chrono::{Duration, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use app_state::{tenant_claims, test_api_state};
use topems_erp::models::{
    CreateMeetingBookingRequest, CreateMeetingRoomRequest, CreateVehicleRequest,
    CreateVehicleRequestRequest,
};
use topems_erp::modules::meeting_room::{create_booking, create_room};
use topems_erp::modules::vehicles::{create_vehicle, create_vehicle_request};

type RlsTxnCell =
    std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>;

/// 与 `tenant_middleware` 一致：BEGIN + 事务级 GUC。
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
    std::sync::Arc::new(tokio::sync::Mutex::new(Some(txn)))
}

async fn setup_schema(pool: &PgPool) {
    sqlx::raw_sql(
        r#"
        CREATE TABLE IF NOT EXISTS meeting_rooms (
            id UUID PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            capacity INT NOT NULL,
            location VARCHAR(255),
            facilities TEXT[],
            status VARCHAR(50) NOT NULL DEFAULT 'available',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            deleted_at TIMESTAMPTZ,
            tenant_id UUID
        );
        CREATE TABLE IF NOT EXISTS meeting_bookings (
            id UUID PRIMARY KEY,
            room_id UUID NOT NULL,
            room_name VARCHAR(255) NOT NULL,
            title VARCHAR(255) NOT NULL,
            organizer VARCHAR(255) NOT NULL,
            start_time TIMESTAMPTZ NOT NULL,
            end_time TIMESTAMPTZ NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'confirmed',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            deleted_at TIMESTAMPTZ,
            tenant_id UUID
        );
        CREATE TABLE IF NOT EXISTS vehicles (
            id UUID PRIMARY KEY,
            plate_number VARCHAR(64) UNIQUE NOT NULL,
            brand VARCHAR(64),
            model VARCHAR(64),
            vehicle_type VARCHAR(32),
            status VARCHAR(32) NOT NULL DEFAULT 'available',
            driver VARCHAR(64),
            last_service TIMESTAMPTZ,
            mileage INT,
            fuel_type VARCHAR(32),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            deleted_at TIMESTAMPTZ,
            tenant_id UUID
        );
        CREATE TABLE IF NOT EXISTS vehicle_requests (
            id UUID PRIMARY KEY,
            vehicle_id UUID NOT NULL,
            vehicle_plate VARCHAR(64) NOT NULL,
            requester VARCHAR(64) NOT NULL,
            purpose TEXT NOT NULL,
            start_time TIMESTAMPTZ NOT NULL,
            end_time TIMESTAMPTZ NOT NULL,
            driver_required BOOLEAN NOT NULL DEFAULT FALSE,
            status VARCHAR(32) NOT NULL DEFAULT 'pending',
            approved_by VARCHAR(64),
            approved_at TIMESTAMPTZ,
            rejected_reason TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            tenant_id UUID
        );
        "#,
    )
    .execute(pool)
    .await
    .unwrap();
}

async fn tenant_of(pool: &PgPool, table: &str, id: Uuid) -> Option<Uuid> {
    let sql = format!("SELECT tenant_id FROM {table} WHERE id = $1");
    sqlx::query_scalar(sqlx::AssertSqlSafe(sql))
        .bind(id)
        .fetch_optional(pool)
        .await
        .unwrap()
}


topems_test_support::sqlx_dsn_guard!();
#[sqlx::test(migrations = false)]
async fn create_booking_succeeds_and_binds_tenant(pool: PgPool) {
    setup_schema(&pool).await;
    let state = test_api_state(pool.clone());
    let tenant = Uuid::new_v4();
    let headers = HeaderMap::new();

    let room_resp = create_room(
        State(state.clone()),
        headers.clone(),
        Extension(begin_request_txn(&pool, tenant).await),
        Extension(tenant_claims(tenant)),
        Json(CreateMeetingRoomRequest {
            name: "K2 回归会议室".to_string(),
            capacity: 6,
            location: Some("2F".to_string()),
            facilities: Some(vec!["白板".to_string()]),
        }),
    )
    .await;
    assert_eq!(room_resp.code, 200, "建会议室失败: {}", room_resp.message);
    let room = room_resp.data.unwrap();
    assert_eq!(
        tenant_of(&pool, "meeting_rooms", room.id).await,
        Some(tenant)
    );

    let now = Utc::now();
    let booking_resp = create_booking(
        State(state),
        headers,
        Extension(begin_request_txn(&pool, tenant).await),
        Extension(tenant_claims(tenant)),
        Json(CreateMeetingBookingRequest {
            room_id: room.id,
            title: "K2 回归预约".to_string(),
            organizer: "tester".to_string(),
            start_time: now + Duration::hours(1),
            end_time: now + Duration::hours(2),
        }),
    )
    .await;
    assert_eq!(
        booking_resp.code, 200,
        "创建预约必须成功（K2 回归）: {}",
        booking_resp.message
    );
    let booking = booking_resp.data.unwrap();
    assert_eq!(booking.room_id, room.id, "预约应关联到刚建的会议室");
    assert_eq!(booking.room_name, "K2 回归会议室");
    assert_eq!(
        tenant_of(&pool, "meeting_bookings", booking.id).await,
        Some(tenant),
        "预约必须落 claims 租户"
    );
}

#[sqlx::test(migrations = false)]
async fn create_vehicle_request_succeeds_and_binds_tenant(pool: PgPool) {
    setup_schema(&pool).await;
    let state = test_api_state(pool.clone());
    let tenant = Uuid::new_v4();
    let headers = HeaderMap::new();

    let vehicle_resp = create_vehicle(
        State(state.clone()),
        headers.clone(),
        Extension(begin_request_txn(&pool, tenant).await),
        Extension(tenant_claims(tenant)),
        Json(CreateVehicleRequest {
            plate_number: "沪A·K20001".to_string(),
            brand: Some("回归".to_string()),
            model: Some("T1".to_string()),
            vehicle_type: Some("car".to_string()),
            driver: Some("tester".to_string()),
            mileage: Some(1),
            fuel_type: Some("gasoline".to_string()),
        }),
    )
    .await;
    assert_eq!(
        vehicle_resp.code, 200,
        "建车辆失败: {}",
        vehicle_resp.message
    );
    let vehicle = vehicle_resp.data.unwrap();
    assert_eq!(tenant_of(&pool, "vehicles", vehicle.id).await, Some(tenant));

    let now = Utc::now();
    let req_resp = create_vehicle_request(
        State(state),
        headers,
        Extension(begin_request_txn(&pool, tenant).await),
        Extension(tenant_claims(tenant)),
        Json(CreateVehicleRequestRequest {
            vehicle_id: vehicle.id,
            requester: "tester".to_string(),
            purpose: "K2 回归用车".to_string(),
            start_time: now + Duration::hours(3),
            end_time: now + Duration::hours(4),
            driver_required: true,
        }),
    )
    .await;
    assert_eq!(
        req_resp.code, 200,
        "创建用车申请必须成功（K2 回归）: {}",
        req_resp.message
    );
    let application = req_resp.data.unwrap();
    assert_eq!(
        application.vehicle_id, vehicle.id,
        "用车申请应关联到刚建的车辆"
    );
    assert_eq!(application.vehicle_plate, "沪A·K20001");
    assert_eq!(
        tenant_of(&pool, "vehicle_requests", application.id).await,
        Some(tenant),
        "用车申请必须落 claims 租户"
    );
}
