use axum::extract::FromRef;
use sqlx::PgPool;
use std::sync::Arc;
use topems_shared_auth::auth::AuthState;
use topems_shared_core::error::TopemsError;
use topems_shared_core::response::ApiResponse;
use topems_shared_db::scope::Db;
use topems_shared_event::event::EventPublisher;
use topems_shared_service_client::service_client::{TypedServiceClient, WorkflowApi};

#[derive(Clone)]
pub struct AppState {
    pub auth_state: AuthState,
    pub pool: PgPool,
    /// 租户作用域数据库句柄（service 层唯一入口）。
    pub db: Db,
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

/// 统一错误出口（替代历史 `ApiResponse::from(TopemsError::internal("业务上下文", e))` 统一出口）。
///
/// 按错误的真实类型映射业务/HTTP code，而非一律 500：
/// - `sqlx::Error::RowNotFound` / `TopemsError::DatabaseRecordNotFound` → 404（资源不存在）
/// - 校验失败 / 业务逻辑错误 → 400；资源已存在 → 409；越权 → 403
/// - 真实 DB / 内部错误 → 500，且细节只进服务端日志，不回显给客户端
///
/// `E: Into<TopemsError>` 同时兼容 service 层两种错误返回：
/// `Result<_, TopemsError>`（恒等转换）与 `Result<_, sqlx::Error>`（经 `From<sqlx::Error>`）。
///
/// 返回 `ApiResponse<T>`（非 `Json<..>`），与既有 `Json(err_resp(e))` 外层包装一致。
pub fn err_resp<T, E: Into<TopemsError>>(e: E) -> ApiResponse<T> {
    ApiResponse::from(e.into())
}
