use axum::{extract::FromRef, extract::State, routing::get, Router};
use sqlx::postgres::PgPool;
use std::sync::Arc;
use std::time::Instant;
use topems_shared_auth::auth::AuthState;
use topems_shared_core::config::Config;
use topems_shared_core::health::SystemMetrics;
use topems_shared_core::response::ApiResponse;
use topems_shared_db::scope::Db;
use topems_shared_event::event::EventPublisher;

pub mod ai_integration;
pub mod audit;
pub mod bug_status;
pub mod change_management;
pub mod doc_integration;
pub mod experiment;
pub mod formula;
pub mod material;
pub mod openapi;
pub mod patent;
pub mod project;
pub mod project_member;
pub mod project_milestone;
pub mod project_phase;
pub mod project_report;
pub mod rd_ci_cd;
pub mod rd_project_status;
pub mod research_cost;
pub mod rs_plugin;
pub mod settings;
pub mod statistics;

#[derive(Clone)]
pub struct ApiState {
    /// 请求链路统一入口：已开启 `deny_request_own_txn` + `deny_request_tenant_scope`。
    /// handler 通过 `RlsTxnCell` 复用请求事务，不得再自开租户作用域。
    pub db: Db,
    /// 系统通道专用连接池：仅用于审计落库、健康探针与池指标，
    /// 不得用于请求租户查询。
    pub system_pool: PgPool,
    pub auth_state: AuthState,
    pub config: Config,
    pub metrics: Arc<SystemMetrics>,
    pub start_time: Instant,
    pub event_publisher: Option<Arc<EventPublisher>>,
}

impl FromRef<ApiState> for AuthState {
    fn from_ref(state: &ApiState) -> Self {
        state.auth_state.clone()
    }
}

impl FromRef<ApiState> for Db {
    fn from_ref(state: &ApiState) -> Self {
        state.db.clone()
    }
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .merge(rd_ci_cd::create_routes())
        .merge(project::create_routes())
        .merge(formula::create_routes())
        .merge(experiment::create_routes())
        .merge(material::create_routes())
        .merge(patent::create_routes())
        .merge(research_cost::create_routes())
        .merge(doc_integration::create_routes())
        .merge(ai_integration::create_routes())
        .merge(audit::create_routes())
        .merge(project_phase::create_routes())
        .merge(project_milestone::create_routes())
        .merge(project_member::create_routes())
        .merge(project_report::create_routes())
        .merge(statistics::create_routes())
        .merge(settings::create_routes())
        .merge(change_management::create_routes())
        // 前端 rd/index.ts health() 契约：GET /api/rd/health（业务路由内，复用鉴权）
        .route("/health", get(rd_health))
}

/// RD 模块健康检查（业务面）：返回 ok + 数据库探活。
#[utoipa::path(
    get,
    security(("BearerAuth" = ["rd:read"])),
    path = "/health",
    responses(
        (status = 200, description = "OK", body = serde_json::Value)
    ),
    tag = "rd"
)]
pub(crate) async fn rd_health(State(state): State<ApiState>) -> ApiResponse<String> {
    let db_ok = sqlx::query("SELECT 1")
        .fetch_one(&state.system_pool)
        .await
        .is_ok();
    if db_ok {
        ApiResponse::success("ok".to_string(), "rd 服务健康")
    } else {
        ApiResponse::server_error("rd 数据库探活失败")
    }
}
