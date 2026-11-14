#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! P1 补测（2026-10-07）：mes equipment list handler 集成测试。
//! 复用 common/app_state.rs 工厂；暴露生产缺陷：SELECT 列 warranty_expiry_date/
//! maintenance_frequency_days 不存在（表列 warranty_end_date/maintenance_cycle）已修复。

#[path = "common/app_state.rs"]
mod app_state;

use app_state::{super_claims, test_app_state};
use axum::extract::{Query, State};
use axum::{Extension, Json};
use serde_json::{json, Value};
use topems_mes::modules::equipment::{
    create_equipment, list_equipment, CreateEquipmentRequest, ListEquipmentQuery,
};

fn empty_query() -> ListEquipmentQuery {
    serde_json::from_value(json!({})).unwrap()
}

async fn setup_schema(pool: &sqlx::PgPool) {
    sqlx::query("CREATE SCHEMA IF NOT EXISTS public")
        .execute(pool)
        .await
        .unwrap();
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS equipment (
            id UUID PRIMARY KEY,
            equipment_no VARCHAR(64),
            name VARCHAR(128),
            model VARCHAR(64),
            manufacturer VARCHAR(128),
            status VARCHAR(32) NOT NULL DEFAULT 'active',
            location VARCHAR(256),
            purchase_date DATE,
            warranty_expiry_date DATE,
            maintenance_frequency_days INT DEFAULT 30,
            last_maintenance_date DATE,
            next_maintenance_date DATE,
            description TEXT NOT NULL DEFAULT '',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            deleted_at TIMESTAMPTZ,
            equipment_name VARCHAR(256) NOT NULL,
            equipment_code VARCHAR(64) NOT NULL,
            equipment_type VARCHAR(50),
            tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
}

async fn body_of(pool: sqlx::PgPool, status: Option<&str>) -> Value {
    let state = test_app_state(pool);
    let claims = super_claims();
    let mut query: Value = json!({});
    if let Some(s) = status {
        query = json!({ "status": s });
    }
    let q: ListEquipmentQuery = serde_json::from_value(query).unwrap();
    let resp = list_equipment(State(state), Extension(claims), Query(q)).await;
    serde_json::to_value(
        resp.data
            .unwrap_or_else(|| panic!("handler error: {:?}", resp.message)),
    )
    .unwrap()
}

async fn insert_equipment(pool: &sqlx::PgPool, code: &str, status: &str) {
    sqlx::query(
        "INSERT INTO equipment (id, equipment_code, equipment_name, status, description) VALUES ($1, $2, $3, $4, '')",
    )
    .bind(uuid::Uuid::new_v4())
    .bind(code)
    .bind(format!("设备-{code}"))
    .bind(status)
    .execute(pool).await.unwrap();
}

#[sqlx::test(migrations = false)]
async fn list_empty_returns_zero(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let body = body_of(pool, None).await;
    assert_eq!(body["total"], 0);
}

#[sqlx::test(migrations = false)]
async fn list_returns_inserted_row(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    insert_equipment(&pool, "EQ-001", "active").await;

    let body = body_of(pool, None).await;
    assert_eq!(body["total"], 1);
    assert_eq!(body["equipments"][0]["equipment_no"], "EQ-001");
}

#[sqlx::test(migrations = false)]
async fn list_filters_by_status(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    insert_equipment(&pool, "EQ-A", "active").await;
    insert_equipment(&pool, "EQ-B", "maintenance").await;

    let body = body_of(pool, Some("maintenance")).await;
    assert_eq!(body["total"], 1);
    assert_eq!(body["equipments"][0]["equipment_no"], "EQ-B");
}

/// mes.equipment.description 在生产库为 NOT NULL：同租户建机台不传 description 必须是
/// 400 参数错误，而不是落库触发 23502 后打成 500。
#[sqlx::test(migrations = false)]
async fn create_equipment_without_description_returns_400(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let state = test_app_state(pool);
    let mut claims = super_claims();
    claims.tenant_id = Some(uuid::Uuid::new_v4().to_string());

    let req: CreateEquipmentRequest =
        serde_json::from_value(json!({ "name": "无描述机台" })).unwrap();
    let resp = create_equipment(State(state), Extension(claims), Json(req)).await;

    assert_eq!(
        resp.code, 400,
        "缺少 description 应返回 400 而不是 500；实际 code={}, message={}",
        resp.code, resp.message
    );
    assert!(
        resp.message.contains("设备描述不能为空"),
        "错误提示应明确说明设备描述不能为空，实际: {}",
        resp.message
    );
}
