use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;

use super::async_projector::{AsyncProjector, AsyncProjectorConfig};
use super::event_store::{EventMetadata, EventStore, InMemoryEventStore};
use super::events::*;
use super::materialized_view::*;
use super::pg_event_store::PgEventStore;
use super::pg_materialized_views::{PgReceivableAgingView, PgVoucherSummaryView};
use super::projector::EventProjector;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandResult {
    pub aggregate_id: String,
    pub version: u64,
    pub events_count: usize,
}

pub struct CommandHandler<T: EventStore> {
    event_store: Arc<T>,
    projector: Arc<EventProjector>,
}

impl<T: EventStore + Send + Sync + 'static> CommandHandler<T> {
    pub fn new(event_store: Arc<T>, projector: Arc<EventProjector>) -> Self {
        Self {
            event_store,
            projector,
        }
    }

    pub async fn handle_create_voucher(
        &self,
        cmd: CreateVoucherCommand,
        metadata: Option<EventMetadata>,
    ) -> Result<CommandResult, String> {
        let voucher_id = cmd
            .voucher_id
            .clone()
            .unwrap_or_else(|| Uuid::new_v4().to_string());
        let event = FinanceDomainEvent::VoucherCreated(VoucherCreatedEvent {
            voucher_id: voucher_id.clone(),
            voucher_no: cmd.voucher_no,
            voucher_type: cmd.voucher_type,
            total_amount: cmd.total_amount,
            created_by: cmd.created_by,
            occurred_at: chrono::Utc::now(),
        });

        let records = self
            .event_store
            .append_events(&voucher_id, "Voucher", &[event.clone()], 0, metadata)
            .await?;

        self.projector.project(&event).await?;

        Ok(CommandResult {
            aggregate_id: voucher_id,
            version: records.last().map(|r| r.version).unwrap_or(1),
            events_count: records.len(),
        })
    }

    pub async fn handle_post_voucher(
        &self,
        voucher_id: &str,
        cmd: PostVoucherCommand,
        metadata: Option<EventMetadata>,
    ) -> Result<CommandResult, String> {
        let current_version = self.event_store.get_aggregate_version(voucher_id).await?;
        if current_version == 0 {
            return Err(format!("Voucher {} not found", voucher_id));
        }

        let voucher_no = cmd.voucher_no.clone().unwrap_or_default();
        let event = FinanceDomainEvent::VoucherPosted(VoucherPostedEvent {
            voucher_id: voucher_id.to_string(),
            voucher_no,
            posted_by: cmd.posted_by,
            occurred_at: chrono::Utc::now(),
        });

        let records = self
            .event_store
            .append_events(
                voucher_id,
                "Voucher",
                &[event.clone()],
                current_version,
                metadata,
            )
            .await?;

        self.projector.project(&event).await?;

        Ok(CommandResult {
            aggregate_id: voucher_id.to_string(),
            version: records.last().map(|r| r.version).unwrap_or(current_version),
            events_count: records.len(),
        })
    }

    pub async fn handle_reverse_voucher(
        &self,
        voucher_id: &str,
        cmd: ReverseVoucherCommand,
        metadata: Option<EventMetadata>,
    ) -> Result<CommandResult, String> {
        let current_version = self.event_store.get_aggregate_version(voucher_id).await?;
        if current_version == 0 {
            return Err(format!("Voucher {} not found", voucher_id));
        }

        let voucher_no = cmd.voucher_no.clone().unwrap_or_default();
        let event = FinanceDomainEvent::VoucherReversed(VoucherReversedEvent {
            voucher_id: voucher_id.to_string(),
            voucher_no,
            reversed_by: cmd.reversed_by,
            reason: cmd.reason,
            occurred_at: chrono::Utc::now(),
        });

        let records = self
            .event_store
            .append_events(
                voucher_id,
                "Voucher",
                &[event.clone()],
                current_version,
                metadata,
            )
            .await?;

        self.projector.project(&event).await?;

        Ok(CommandResult {
            aggregate_id: voucher_id.to_string(),
            version: records.last().map(|r| r.version).unwrap_or(current_version),
            events_count: records.len(),
        })
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateVoucherCommand {
    pub voucher_id: Option<String>,
    pub voucher_no: String,
    pub voucher_type: String,
    pub total_amount: f64,
    pub created_by: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct PostVoucherCommand {
    pub voucher_no: Option<String>,
    pub posted_by: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ReverseVoucherCommand {
    pub voucher_no: Option<String>,
    pub reversed_by: String,
    pub reason: String,
}

pub struct CqrsContext {
    pub event_store: Arc<InMemoryEventStore>,
    pub projector: Arc<EventProjector>,
    pub voucher_summary_view: Arc<VoucherSummaryMaterializedView>,
    pub receivable_aging_view: Arc<ReceivableAgingMaterializedView>,
    pub command_handler: CommandHandler<InMemoryEventStore>,
}

impl CqrsContext {
    pub fn new() -> Self {
        let event_store = Arc::new(InMemoryEventStore::new());
        let voucher_summary_view = Arc::new(VoucherSummaryMaterializedView::new());
        let receivable_aging_view = Arc::new(ReceivableAgingMaterializedView::new());

        let mut projector = EventProjector::new();
        projector.register_view(
            Arc::<VoucherSummaryMaterializedView>::clone(&voucher_summary_view)
                as Arc<dyn MaterializedView>,
        );
        projector.register_view(Arc::<ReceivableAgingMaterializedView>::clone(
            &receivable_aging_view,
        ) as Arc<dyn MaterializedView>);
        let projector = Arc::new(projector);

        let command_handler = CommandHandler::new(Arc::clone(&event_store), Arc::clone(&projector));

        Self {
            event_store,
            projector,
            voucher_summary_view,
            receivable_aging_view,
            command_handler,
        }
    }
}

impl Default for CqrsContext {
    fn default() -> Self {
        Self::new()
    }
}

static CQRS_CONTEXT: std::sync::OnceLock<CqrsContext> = std::sync::OnceLock::new();

pub fn get_cqrs_context() -> &'static CqrsContext {
    CQRS_CONTEXT.get_or_init(CqrsContext::new)
}

pub struct PgCqrsContext {
    pub event_store: Arc<PgEventStore>,
    pub sync_projector: Arc<EventProjector>,
    pub async_projector: Arc<AsyncProjector>,
    pub voucher_summary_view: Arc<PgVoucherSummaryView>,
    pub receivable_aging_view: Arc<PgReceivableAgingView>,
    pub command_handler: CommandHandler<PgEventStore>,
}

impl PgCqrsContext {
    pub fn new(pool: sqlx::PgPool) -> Self {
        Self::with_config(pool, AsyncProjectorConfig::default())
    }

    pub fn with_config(pool: sqlx::PgPool, projector_config: AsyncProjectorConfig) -> Self {
        let event_store = Arc::new(PgEventStore::new(pool.clone()));
        let voucher_summary_view = Arc::new(PgVoucherSummaryView::new(pool.clone()));
        let receivable_aging_view = Arc::new(PgReceivableAgingView::new(pool.clone()));

        let mut sync_projector = EventProjector::new();
        sync_projector
            .register_view(Arc::<PgVoucherSummaryView>::clone(&voucher_summary_view)
                as Arc<dyn MaterializedView>);
        sync_projector.register_view(Arc::<PgReceivableAgingView>::clone(&receivable_aging_view)
            as Arc<dyn MaterializedView>);
        let sync_projector = Arc::new(sync_projector);

        let mut async_projector = AsyncProjector::new(pool.clone(), projector_config);
        async_projector
            .register_view(Arc::<PgVoucherSummaryView>::clone(&voucher_summary_view)
                as Arc<dyn MaterializedView>);
        async_projector.register_view(Arc::<PgReceivableAgingView>::clone(&receivable_aging_view)
            as Arc<dyn MaterializedView>);
        let async_projector = Arc::new(async_projector);

        let command_handler =
            CommandHandler::new(Arc::clone(&event_store), Arc::clone(&sync_projector));

        Self {
            event_store,
            sync_projector,
            async_projector,
            voucher_summary_view,
            receivable_aging_view,
            command_handler,
        }
    }

    pub async fn start_async_projection(self: &Arc<Self>) {
        Arc::clone(&self.async_projector).start_background().await;
    }
}

static PG_CQRS_CONTEXT: std::sync::OnceLock<Arc<PgCqrsContext>> = std::sync::OnceLock::new();

pub fn init_pg_cqrs_context(pool: sqlx::PgPool) -> &'static Arc<PgCqrsContext> {
    PG_CQRS_CONTEXT.get_or_init(|| Arc::new(PgCqrsContext::new(pool)))
}

pub fn get_pg_cqrs_context() -> Option<&'static Arc<PgCqrsContext>> {
    PG_CQRS_CONTEXT.get()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::{Deserialize, Serialize};

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    fn uid() -> String { uuid::Uuid::new_v4().to_string() }

    #[test]
    fn rt_command_result() {
        roundtrip(&CommandResult {
            aggregate_id: uid(),
            version: 5,
            events_count: 2,
        });
    }

    #[test]
    fn rt_command_result_minimal() {
        roundtrip(&CommandResult {
            aggregate_id: "test-agg".into(),
            version: 0,
            events_count: 0,
        });
    }
}
