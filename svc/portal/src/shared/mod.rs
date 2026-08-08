use axum::extract::FromRef;
use reqwest::Client;
use sqlx::PgPool;
use std::sync::Arc;
use topems_shared::config::CacheConfig;
use topems_shared::AuthState;
use topems_shared_event::cache::CacheManager;
use topems_shared_event::event::EventPublisher;
use topems_shared_event::service_discovery::{LocalServiceRegistry, PortalServiceAggregator};
use topems_shared_service_client::service_client::{
    api::crm_api::CrmApi, api::finance_api::FinanceApi, api::hrm_api::HrmApi, api::iam_api::IamApi,
    api::mes_api::MesApi, api::notification_api::NotificationApi, create_erp_client,
    create_monitor_client, create_workflow_client, ErpServiceClient, MonitorServiceClient,
    TypedServiceClient, WorkflowServiceClient,
};

#[derive(Clone)]
pub struct AppState {
    pub auth_state: AuthState,
    pub service_registry: Arc<LocalServiceRegistry>,
    pub service_aggregator: Arc<PortalServiceAggregator>,
    pub http_client: Client,
    pub pool: PgPool,
    pub event_publisher: Option<Arc<EventPublisher>>,
    pub dashboard_cache: CacheManager,
    pub notification_client: TypedServiceClient<NotificationApi>,
    pub workflow_client: WorkflowServiceClient,
    pub mes_client: TypedServiceClient<MesApi>,
    pub monitor_client: MonitorServiceClient,
    pub iam_client: TypedServiceClient<IamApi>,
    pub hrm_client: TypedServiceClient<HrmApi>,
    pub erp_client: ErpServiceClient,
    pub crm_client: TypedServiceClient<CrmApi>,
    pub finance_client: TypedServiceClient<FinanceApi>,
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

impl AppState {
    pub async fn new(pool: PgPool, event_publisher: Option<Arc<EventPublisher>>) -> Self {
        let aggregator = PortalServiceAggregator::new();
        aggregator.init_default_services().await;

        let cache_config = CacheConfig::default();
        let dashboard_cache = CacheManager::new(&cache_config);

        Self {
            auth_state: AuthState::from_env(),
            service_registry: Arc::new(LocalServiceRegistry::new()),
            service_aggregator: Arc::new(aggregator),
            http_client: Client::new(),
            pool,
            event_publisher,
            dashboard_cache,
            notification_client: TypedServiceClient::<NotificationApi>::from_env_default()
                .unwrap_or_else(|_| {
                    TypedServiceClient::new(NotificationApi, "http://localhost:8000".to_string())
                        .unwrap()
                }),
            workflow_client: create_workflow_client().unwrap_or_else(|_| {
                WorkflowServiceClient::from_env().unwrap_or_else(|_| {
                    WorkflowServiceClient::new("http://localhost:8000".to_string()).unwrap()
                })
            }),
            mes_client: TypedServiceClient::<MesApi>::from_env_default().unwrap_or_else(|_| {
                TypedServiceClient::new(MesApi, "http://localhost:8030".to_string()).unwrap()
            }),
            monitor_client: create_monitor_client().unwrap_or_else(|_| {
                MonitorServiceClient::from_env().unwrap_or_else(|_| {
                    MonitorServiceClient::new("http://localhost:8000".to_string()).unwrap()
                })
            }),
            iam_client: TypedServiceClient::<IamApi>::from_env_default().unwrap_or_else(|_| {
                TypedServiceClient::new(IamApi, "http://localhost:8000".to_string()).unwrap()
            }),
            hrm_client: TypedServiceClient::<HrmApi>::from_env_default().unwrap_or_else(|_| {
                TypedServiceClient::new(HrmApi, "http://localhost:8020".to_string()).unwrap()
            }),
            erp_client: create_erp_client().unwrap_or_else(|_| {
                ErpServiceClient::from_env().unwrap_or_else(|_| {
                    ErpServiceClient::new("http://localhost:8010".to_string()).unwrap()
                })
            }),
            crm_client: TypedServiceClient::<CrmApi>::from_env_default().unwrap_or_else(|_| {
                TypedServiceClient::new(CrmApi, "http://localhost:8029".to_string()).unwrap()
            }),
            finance_client: TypedServiceClient::<FinanceApi>::from_env_default().unwrap_or_else(
                |_| {
                    TypedServiceClient::new(FinanceApi, "http://localhost:8011".to_string())
                        .unwrap()
                },
            ),
        }
    }
}
