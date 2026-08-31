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
    api::crm_api::CrmApi, api::erp_api::ErpApi, api::finance_api::FinanceApi, api::hrm_api::HrmApi,
    api::iam_api::IamApi, api::mes_api::MesApi, api::monitor_api::MonitorApi,
    api::notification_api::NotificationApi, TypedServiceClient, WorkflowApi,
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
    pub workflow_client: TypedServiceClient<WorkflowApi>,
    pub mes_client: TypedServiceClient<MesApi>,
    pub monitor_client: TypedServiceClient<MonitorApi>,
    pub iam_client: TypedServiceClient<IamApi>,
    pub hrm_client: TypedServiceClient<HrmApi>,
    pub erp_client: TypedServiceClient<ErpApi>,
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

        let jwt_secret = std::env::var("JWT_SECRET").unwrap_or_default();
        Self {
            auth_state: AuthState::from_env(),
            service_registry: Arc::new(LocalServiceRegistry::new()),
            service_aggregator: Arc::new(aggregator),
            http_client: Client::new(),
            pool,
            event_publisher,
            dashboard_cache,
            notification_client: TypedServiceClient::<NotificationApi>::from_env_default().and_then(|c| c.with_service_token(&jwt_secret, "portal-service", &["notification:read"]))
                .unwrap_or_else(|_| {
                    TypedServiceClient::new(NotificationApi, "http://localhost:8000".to_string())
                        .unwrap()
                }),
            workflow_client: TypedServiceClient::<WorkflowApi>::from_env_default().and_then(|c| c.with_service_token(&jwt_secret, "portal-service", &["workflow:read"])).unwrap_or_else(
                |_| {
                    TypedServiceClient::new(WorkflowApi, "http://localhost:8000".to_string())
                        .unwrap()
                },
            ),
            mes_client: TypedServiceClient::<MesApi>::from_env_default().and_then(|c| c.with_service_token(&jwt_secret, "portal-service", &["mes:admin"])).unwrap_or_else(|_| {
                TypedServiceClient::new(MesApi, "http://localhost:8030".to_string()).unwrap()
            }),
            monitor_client: TypedServiceClient::<MonitorApi>::from_env_default().and_then(|c| c.with_service_token(&jwt_secret, "portal-service", &["monitor:read"])).unwrap_or_else(
                |_| {
                    TypedServiceClient::new(MonitorApi, "http://localhost:8000".to_string())
                        .unwrap()
                },
            ),
            iam_client: TypedServiceClient::<IamApi>::from_env_default().and_then(|c| c.with_service_token(&jwt_secret, "portal-service", &["iam:read"])).unwrap_or_else(|_| {
                TypedServiceClient::new(IamApi, "http://localhost:8000".to_string()).unwrap()
            }),
            hrm_client: TypedServiceClient::<HrmApi>::from_env_default().and_then(|c| c.with_service_token(&jwt_secret, "portal-service", &["hrm:admin"])).unwrap_or_else(|_| {
                TypedServiceClient::new(HrmApi, "http://localhost:8020".to_string()).unwrap()
            }),
            erp_client: TypedServiceClient::<ErpApi>::from_env_default().and_then(|c| c.with_service_token(&jwt_secret, "portal-service", &["erp:admin"])).unwrap_or_else(|_| {
                TypedServiceClient::new(ErpApi, "http://localhost:8010".to_string()).unwrap()
            }),
            crm_client: TypedServiceClient::<CrmApi>::from_env_default().and_then(|c| c.with_service_token(&jwt_secret, "portal-service", &["crm:admin"])).unwrap_or_else(|_| {
                TypedServiceClient::new(CrmApi, "http://localhost:8029".to_string()).unwrap()
            }),
            finance_client: TypedServiceClient::<FinanceApi>::from_env_default().and_then(|c| c.with_service_token(&jwt_secret, "portal-service", &["finance:read"])).unwrap_or_else(
                |_| {
                    TypedServiceClient::new(FinanceApi, "http://localhost:8011".to_string())
                        .unwrap()
                },
            ),
        }
    }
}
