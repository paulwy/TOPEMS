pub mod permission;

use axum::extract::FromRef;
use sqlx::PgPool;
use std::sync::Arc;
use topems_shared::{
    event::EventPublisher, AuthState, WorkflowServiceClient,
};
use topems_shared::service_client::{
    api::hrm_api::HrmApi, api::mes_api::MesApi, api::notification_api::NotificationApi,
    api::qms_api::QmsApi, TypedServiceClient, WmsServiceClient,
};

#[derive(Clone)]
pub struct AppState {
    pub auth_state: AuthState,
    pub pool: PgPool,
    pub event_publisher: Option<Arc<EventPublisher>>,
    pub wms_client: WmsServiceClient,
    pub hrm_client: TypedServiceClient<HrmApi>,
    pub workflow_client: WorkflowServiceClient,
    pub notification_client: TypedServiceClient<NotificationApi>,
    pub mes_api_client: TypedServiceClient<MesApi>,
    pub qms_api_client: TypedServiceClient<QmsApi>,
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

impl FromRef<AppState> for WmsServiceClient {
    fn from_ref(state: &AppState) -> Self {
        state.wms_client.clone()
    }
}

impl FromRef<AppState> for TypedServiceClient<MesApi> {
    fn from_ref(state: &AppState) -> Self {
        state.mes_api_client.clone()
    }
}

impl FromRef<AppState> for TypedServiceClient<QmsApi> {
    fn from_ref(state: &AppState) -> Self {
        state.qms_api_client.clone()
    }
}

impl FromRef<AppState> for TypedServiceClient<HrmApi> {
    fn from_ref(state: &AppState) -> Self {
        state.hrm_client.clone()
    }
}

impl FromRef<AppState> for WorkflowServiceClient {
    fn from_ref(state: &AppState) -> Self {
        state.workflow_client.clone()
    }
}

impl FromRef<AppState> for TypedServiceClient<NotificationApi> {
    fn from_ref(state: &AppState) -> Self {
        state.notification_client.clone()
    }
}
