pub mod permission;

use axum::extract::FromRef;
use sqlx::PgPool;
use std::sync::Arc;
use topems_shared::AuthState;
use topems_shared_event::event::EventPublisher;

// ── 迁移完成（WorkflowServiceClient → TypedServiceClient<WorkflowApi>）──
//
// 旧式客户端 `WorkflowServiceClient`（手写 struct，定义在
// `shared-service-client/src/service_client/workflow_client.rs`）
// 已完全迁移到基于 trait 的泛型客户端 `TypedServiceClient<WorkflowApi>`。
//
// 新客户端优势：
//   - 基于 `ServiceApi` trait，服务发现 / URL 构建 / 回退逻辑统一
//   - 消除手写 Client 样板代码
//   - 支持通用 HTTP 方法（get / post / put / delete）与 ApiResponse 解包辅助
//   - 已实现全部强类型业务方法与数据结构
use topems_shared_service_client::service_client::api::workflow_api::WorkflowApi;
use topems_shared_service_client::TypedServiceClient;

#[derive(Clone)]
pub struct AppState {
    pub auth_state: AuthState,
    pub pool: PgPool,
    pub workflow_client: TypedServiceClient<WorkflowApi>,
    pub event_publisher: Option<Arc<EventPublisher>>,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

impl FromRef<AppState> for PgPool {
    fn from_ref(state: &AppState) -> Self {
        state.pool.clone()
    }
}

impl FromRef<AppState> for TypedServiceClient<WorkflowApi> {
    fn from_ref(state: &AppState) -> Self {
        state.workflow_client.clone()
    }
}
