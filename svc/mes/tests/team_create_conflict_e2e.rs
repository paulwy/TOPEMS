#![allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
//! `create_team` 唯一键冲突（SQLSTATE 23505）→ 409 的回归测试。
//!
//! 表形状对齐 20261114 收敛后的 `mes.teams`：`UNIQUE NULLS NOT DISTINCT (tenant_id, team_code)`。

#[path = "common/app_state.rs"]
mod app_state;

use app_state::{super_claims, test_app_state};
use axum::extract::State;
use axum::http::HeaderMap;
use axum::Extension;
use topems_mes::modules::team::{create_team, CreateTeamRequest};
use topems_shared_auth::middleware::tenant::{scope_request_tenant, RlsRequestTenant};
use uuid::Uuid;

async fn setup_schema(pool: &sqlx::PgPool) {
    sqlx::query("CREATE SCHEMA IF NOT EXISTS mes")
        .execute(pool)
        .await
        .unwrap();
    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS mes.teams (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            team_code VARCHAR(100) NOT NULL,
            team_name VARCHAR(200) NOT NULL,
            team_type VARCHAR(50),
            work_station_id UUID,
            leader_id UUID,
            leader_name VARCHAR(100),
            member_count INT DEFAULT 0,
            status VARCHAR(32) DEFAULT 'active',
            description TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            tenant_id UUID
        )"#,
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        "CREATE UNIQUE INDEX IF NOT EXISTS uk_teams_tenant_code ON mes.teams (tenant_id, team_code) NULLS NOT DISTINCT",
    )
    .execute(pool)
    .await
    .unwrap();
}

fn req(team_code: &str) -> CreateTeamRequest {
    CreateTeamRequest {
        team_code: team_code.to_string(),
        team_name: "甲班".to_string(),
        team_type: Some("production".to_string()),
        work_station_id: None,
        leader_id: None,
        leader_name: None,
        description: None,
        members: None,
    }
}

/// 模拟 auth_middleware 落下的 RLS 上下文（`Db::scope()` 依赖该 task-local）。
async fn create(
    state: topems_mes::shared::AppState,
    tenant: &str,
    team_code: &str,
) -> topems_shared_core::response::ApiResponse<topems_mes::modules::team::TeamResponse> {
    let mut claims = super_claims();
    claims.tenant_id = Some(tenant.to_string());
    let txn_cell = app_state::request_txn_cell(&state.pool).await;
    scope_request_tenant(
        RlsRequestTenant {
            tenant: Uuid::parse_str(tenant).unwrap(),
            system: false,
        },
        create_team(
            State(state),
            Extension(txn_cell),
            Extension(claims),
            HeaderMap::new(),
            axum::Json(req(team_code)),
        ),
    )
    .await
}

const TENANT_A: &str = "11111111-1111-1111-1111-111111111111";
const TENANT_B: &str = "22222222-2222-2222-2222-222222222222";

topems_test_support::sqlx_dsn_guard!();
#[sqlx::test(migrations = false)]
async fn create_team_conflict_returns_409(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let state = test_app_state(pool.clone());

    let first = create(state.clone(), TENANT_A, "T-001").await;
    assert_eq!(first.code, 200, "首次创建应成功: {}", first.message);

    let second = create(state, TENANT_A, "T-001").await;
    assert_eq!(
        second.code, 409,
        "同租户 team_code 重复应为 409: {}",
        second.message
    );
    assert!(
        second.message.contains("team_code"),
        "错误信息应指明 team_code 重复: {}",
        second.message
    );

    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM mes.teams")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(count, 1, "冲突行不应落库");
}

#[sqlx::test(migrations = false)]
async fn create_team_same_code_other_tenant_ok(pool: sqlx::PgPool) {
    setup_schema(&pool).await;
    let state = test_app_state(pool.clone());

    let a = create(state.clone(), TENANT_A, "T-001").await;
    assert_eq!(a.code, 200, "租户 A 创建失败: {}", a.message);

    let b = create(state, TENANT_B, "T-001").await;
    assert_eq!(b.code, 200, "跨租户同码应允许: {}", b.message);
}
