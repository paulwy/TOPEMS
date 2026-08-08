use crate::models::ServiceDto;
use std::sync::Arc;
use topems_shared_event::service_discovery::PortalServiceAggregator;
use topems_shared_event::service_discovery::ServiceRegistryStatus;

pub struct ServiceRegistryService {
    aggregator: Arc<PortalServiceAggregator>,
}

impl ServiceRegistryService {
    pub fn new(aggregator: Arc<PortalServiceAggregator>) -> Self {
        Self { aggregator }
    }

    pub async fn list_all(&self) -> Vec<ServiceDto> {
        let services = self.aggregator.registry.list_all().await;

        services
            .into_iter()
            .map(|s| ServiceDto {
                id: s.code,
                name: s.name,
                description: s.description,
                url: s
                    .url
                    .map(|_| format!("http://localhost:{}", s.port))
                    .unwrap_or_default(),
                icon: s.icon.unwrap_or_else(|| "App".to_string()),
                status: match s.status {
                    ServiceRegistryStatus::Active => "running".to_string(),
                    ServiceRegistryStatus::Inactive => "stopped".to_string(),
                    ServiceRegistryStatus::Maintenance => "maintenance".to_string(),
                },
                category: format!("{:?}", s.category),
            })
            .collect()
    }
}
