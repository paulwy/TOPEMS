use axum::extract::FromRef;
use reqwest::Client;
use sqlx::PgPool;
use std::sync::Arc;
use topems_shared::{
    AuthState, CacheConfig, HrmServiceClient, IamServiceClient, InMemoryCache,
    LocalServiceRegistry, MesServiceClient, NotificationSvcClient, PortalServiceAggregator,
    WorkflowServiceClient,
};

#[derive(Clone)]
pub struct AppState {
    pub auth_state: AuthState,
    pub service_registry: Arc<LocalServiceRegistry>,
    pub service_aggregator: Arc<PortalServiceAggregator>,
    pub http_client: Client,
    pub pool: PgPool,
    pub notification_client: NotificationSvcClient,
    pub iam_client: IamServiceClient,
    pub monitor_client: topems_shared::service_client::MonitorServiceClient,
    pub erp_client: topems_shared::service_client::ErpServiceClient,
    pub hrm_client: HrmServiceClient,
    pub workflow_client: WorkflowServiceClient,
    pub mes_client: MesServiceClient,
    pub dashboard_cache: InMemoryCache,
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
    pub async fn new(pool: PgPool) -> Self {
        let aggregator = PortalServiceAggregator::new();
        aggregator.init_default_services().await;

        let notification_client = create_notification_client();
        let iam_client = create_iam_client();
        let monitor_client = create_monitor_client();
        let erp_client = create_erp_client();
        let hrm_client = create_hrm_client();
        let workflow_client = create_workflow_client();
        let mes_client = create_mes_client();
        let dashboard_cache = create_dashboard_cache();

        let state = Self {
            auth_state: AuthState::from_env(),
            service_registry: Arc::new(LocalServiceRegistry::new()),
            service_aggregator: Arc::new(aggregator),
            http_client: Client::new(),
            pool,
            notification_client,
            iam_client,
            monitor_client,
            erp_client,
            hrm_client,
            workflow_client,
            mes_client,
            dashboard_cache,
        };

        let state_clone = state.clone();
        tokio::spawn(async move {
            crate::modules::dashboard::warmup_dashboard_cache(state_clone).await;
        });

        state
    }
}

fn create_notification_client() -> NotificationSvcClient {
    match topems_shared::create_notification_client() {
        Ok(client) => client,
        Err(e) => {
            tracing::warn!("Failed to create notification client, using default: {}", e);
            NotificationSvcClient::new("http://localhost:8000").unwrap()
        }
    }
}

fn create_iam_client() -> IamServiceClient {
    match topems_shared::create_iam_client() {
        Ok(client) => client,
        Err(e) => {
            tracing::warn!("Failed to create IAM client, using default: {}", e);
            IamServiceClient::new("http://localhost:8000").unwrap()
        }
    }
}

fn create_monitor_client() -> topems_shared::service_client::MonitorServiceClient {
    use topems_shared::service_client::MonitorServiceClient;
    match MonitorServiceClient::from_env() {
        Ok(client) => client,
        Err(e) => {
            tracing::warn!("Failed to create monitor client, using default: {}", e);
            MonitorServiceClient::new("http://localhost:8062").unwrap()
        }
    }
}

fn create_erp_client() -> topems_shared::service_client::ErpServiceClient {
    use topems_shared::service_client::ErpServiceClient;
    match ErpServiceClient::from_env() {
        Ok(client) => client,
        Err(e) => {
            tracing::warn!("Failed to create ERP client, using default: {}", e);
            ErpServiceClient::new("http://localhost:8010").unwrap()
        }
    }
}

fn create_hrm_client() -> HrmServiceClient {
    match HrmServiceClient::from_env() {
        Ok(client) => client,
        Err(e) => {
            tracing::warn!("Failed to create HRM client, using default: {}", e);
            HrmServiceClient::new("http://localhost:8012").unwrap()
        }
    }
}

fn create_workflow_client() -> WorkflowServiceClient {
    match WorkflowServiceClient::from_env() {
        Ok(client) => client,
        Err(e) => {
            tracing::warn!("Failed to create workflow client, using default: {}", e);
            WorkflowServiceClient::new("http://localhost:8000").unwrap()
        }
    }
}

fn create_mes_client() -> MesServiceClient {
    match MesServiceClient::from_env() {
        Ok(client) => client,
        Err(e) => {
            tracing::warn!("Failed to create MES client, using default: {}", e);
            MesServiceClient::new("http://localhost:8030").unwrap()
        }
    }
}

fn create_dashboard_cache() -> InMemoryCache {
    let config = CacheConfig {
        default_ttl: 30,
        memory_cache_size: 100,
        ..CacheConfig::default()
    };
    InMemoryCache::new(config)
}
