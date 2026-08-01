use std::sync::Arc;

use super::events::FinanceDomainEvent;
use super::materialized_view::MaterializedView;

pub struct EventProjector {
    views: Vec<Arc<dyn MaterializedView>>,
}

impl EventProjector {
    pub fn new() -> Self {
        Self { views: Vec::new() }
    }

    pub fn register_view(&mut self, view: Arc<dyn MaterializedView>) {
        self.views.push(view);
    }

    pub async fn project(&self, event: &FinanceDomainEvent) -> Result<(), String> {
        for view in &self.views {
            view.handle_event(event).await.map_err(|e| {
                format!(
                    "Failed to project event to view '{}': {}",
                    view.view_name(),
                    e
                )
            })?;
        }
        Ok(())
    }

    pub async fn project_batch(&self, events: &[FinanceDomainEvent]) -> Result<(), String> {
        for event in events {
            self.project(event).await?;
        }
        Ok(())
    }

    pub async fn rebuild_all(&self) -> Result<(), String> {
        for view in &self.views {
            view.rebuild()
                .await
                .map_err(|e| format!("Failed to rebuild view '{}': {}", view.view_name(), e))?;
        }
        Ok(())
    }

    pub fn view_names(&self) -> Vec<&str> {
        self.views.iter().map(|v| v.view_name()).collect()
    }
}

impl Default for EventProjector {
    fn default() -> Self {
        Self::new()
    }
}
