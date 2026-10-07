use async_trait::async_trait;
use topems_shared_core::error::TopemsError;

use super::aggregates::*;
use super::entities::*;
use super::event_store::{EventMetadata, EventStore, SnapshotRecord};
use super::events::FinanceDomainEvent;
use super::value_objects::*;

#[async_trait]
pub trait EventSourcedRepository<A> {
    async fn load(&self, id: &str) -> Result<Option<A>, TopemsError>;
    async fn save(
        &self,
        aggregate: &mut A,
        metadata: Option<EventMetadata>,
    ) -> Result<(), TopemsError>;
}

pub struct VoucherEventSourcedRepository<T: EventStore> {
    event_store: T,
    snapshot_threshold: u64,
}

impl<T: EventStore> VoucherEventSourcedRepository<T> {
    pub fn new(event_store: T) -> Self {
        Self {
            event_store,
            snapshot_threshold: 50,
        }
    }

    pub fn with_snapshot_threshold(event_store: T, threshold: u64) -> Self {
        Self {
            event_store,
            snapshot_threshold: threshold,
        }
    }

    async fn load_from_events(&self, id: &str) -> Result<Option<VoucherAggregate>, TopemsError> {
        let snapshot = self.event_store.get_latest_snapshot(id).await?;

        let (aggregate, from_version) = match snapshot {
            Some(snap) => {
                let agg: VoucherAggregate = serde_json::from_value(snap.state).map_err(|e| {
                    TopemsError::ValidationFailed(format!("Failed to deserialize snapshot: {}", e))
                })?;
                (Some(agg), snap.version)
            }
            None => (None, 0),
        };

        let events = self.event_store.read_events(id, from_version, None).await?;
        if events.is_empty() && aggregate.is_none() {
            return Ok(None);
        }

        let mut agg = aggregate.unwrap_or_else(|| VoucherAggregate {
            id: id.to_string(),
            voucher_no: String::new(),
            voucher_date: chrono::Utc::now().date_naive(),
            voucher_type: String::new(),
            status: VoucherStatus::Draft,
            summary: String::new(),
            attachment_count: 0,
            created_by: String::new(),
            created_at: chrono::Utc::now(),
            posted_at: None,
            lines: Vec::new(),
            total_debit: 0.0,
            total_credit: 0.0,
        });

        for event in &events {
            Self::apply_event(&mut agg, &event.payload);
        }

        Ok(Some(agg))
    }

    fn apply_event(aggregate: &mut VoucherAggregate, event: &FinanceDomainEvent) {
        match event {
            FinanceDomainEvent::VoucherCreated(e) => {
                aggregate.id = e.voucher_id.clone();
                aggregate.voucher_no = e.voucher_no.clone();
                aggregate.voucher_type = e.voucher_type.clone();
                aggregate.total_debit = e.total_amount;
                aggregate.created_by = e.created_by.clone();
                aggregate.created_at = e.occurred_at;
                aggregate.status = VoucherStatus::Draft;
            }
            FinanceDomainEvent::VoucherPosted(e) => {
                aggregate.id = e.voucher_id.clone();
                aggregate.voucher_no = e.voucher_no.clone();
                aggregate.status = VoucherStatus::Posted;
                aggregate.posted_at = Some(e.occurred_at);
            }
            FinanceDomainEvent::VoucherReversed(e) => {
                aggregate.id = e.voucher_id.clone();
                aggregate.voucher_no = e.voucher_no.clone();
                aggregate.status = VoucherStatus::Reversed;
            }
            _ => {}
        }
    }

    async fn save_snapshot_if_needed(
        &self,
        aggregate: &VoucherAggregate,
        version: u64,
    ) -> Result<(), TopemsError> {
        if version.is_multiple_of(self.snapshot_threshold) && version > 0 {
            let state = serde_json::to_value(aggregate).map_err(|e| {
                TopemsError::ValidationFailed(format!("Failed to serialize snapshot: {}", e))
            })?;
            let snapshot = SnapshotRecord {
                aggregate_id: aggregate.id.clone(),
                aggregate_type: "Voucher".to_string(),
                version,
                state,
                created_at: chrono::Utc::now(),
            };
            self.event_store.save_snapshot(snapshot).await?;
        }
        Ok(())
    }
}

#[async_trait]
impl<T: EventStore + Send + Sync> EventSourcedRepository<VoucherAggregate>
    for VoucherEventSourcedRepository<T>
{
    async fn load(&self, id: &str) -> Result<Option<VoucherAggregate>, TopemsError> {
        self.load_from_events(id).await
    }

    #[allow(clippy::as_conversions)]
    async fn save(
        &self,
        aggregate: &mut VoucherAggregate,
        metadata: Option<EventMetadata>,
    ) -> Result<(), TopemsError> {
        let current_version = self
            .event_store
            .get_aggregate_version(&aggregate.id)
            .await?;

        let events = vec![];
        let records = self
            .event_store
            .append_events(&aggregate.id, "Voucher", &events, current_version, metadata)
            .await?;

        let new_version = current_version + records.len() as u64;
        self.save_snapshot_if_needed(aggregate, new_version).await?;

        Ok(())
    }
}

pub struct ReceivableEventSourcedRepository<T: EventStore> {
    event_store: T,
    snapshot_threshold: u64,
}

impl<T: EventStore> ReceivableEventSourcedRepository<T> {
    pub fn new(event_store: T) -> Self {
        Self {
            event_store,
            snapshot_threshold: 50,
        }
    }

    async fn load_from_events(&self, id: &str) -> Result<Option<ReceivableAggregate>, TopemsError> {
        let snapshot = self.event_store.get_latest_snapshot(id).await?;

        let (aggregate, from_version) = match snapshot {
            Some(snap) => {
                let agg: ReceivableAggregate = serde_json::from_value(snap.state).map_err(|e| {
                    TopemsError::ValidationFailed(format!("Failed to deserialize snapshot: {}", e))
                })?;
                (Some(agg), snap.version)
            }
            None => (None, 0),
        };

        let events = self.event_store.read_events(id, from_version, None).await?;
        if events.is_empty() && aggregate.is_none() {
            return Ok(None);
        }

        let mut agg = aggregate.unwrap_or_else(|| ReceivableAggregate {
            receivable: Receivable {
                id: id.to_string(),
                receivable_no: String::new(),
                customer_id: String::new(),
                customer_name: String::new(),
                amount: 0.0,
                settled_amount: 0.0,
                status: SettlementStatus::Unsettled,
                billing_date: chrono::Utc::now().date_naive(),
                due_date: chrono::Utc::now().date_naive(),
                created_at: chrono::Utc::now(),
            },
            collections: Vec::new(),
            aging_buckets: Vec::new(),
        });

        for event in &events {
            Self::apply_event(&mut agg, &event.payload);
        }

        Ok(Some(agg))
    }

    fn apply_event(aggregate: &mut ReceivableAggregate, event: &FinanceDomainEvent) {
        match event {
            FinanceDomainEvent::ReceivableCreated(e) => {
                aggregate.receivable.id = e.receivable_id.clone();
                aggregate.receivable.receivable_no = e.receivable_no.clone();
                aggregate.receivable.customer_id = e.customer_id.clone();
                aggregate.receivable.amount = e.amount;
                aggregate.receivable.status = SettlementStatus::Unsettled;
                aggregate.receivable.created_at = e.occurred_at;
            }
            FinanceDomainEvent::ReceivableSettled(e) => {
                aggregate.receivable.id = e.receivable_id.clone();
                aggregate.receivable.settled_amount += e.settled_amount;
                aggregate.receivable.status =
                    if aggregate.receivable.settled_amount >= aggregate.receivable.amount {
                        SettlementStatus::Settled
                    } else {
                        SettlementStatus::PartiallySettled
                    };
            }
            FinanceDomainEvent::AgingCalculated(e) if e.entity_type == "receivable" => {
                aggregate.aging_buckets = e.buckets.clone();
            }
            _ => {}
        }
    }

    async fn save_snapshot_if_needed(
        &self,
        aggregate: &ReceivableAggregate,
        version: u64,
    ) -> Result<(), TopemsError> {
        if version.is_multiple_of(self.snapshot_threshold) && version > 0 {
            let state = serde_json::to_value(aggregate).map_err(|e| {
                TopemsError::ValidationFailed(format!("Failed to serialize snapshot: {}", e))
            })?;
            let snapshot = SnapshotRecord {
                aggregate_id: aggregate.receivable.id.clone(),
                aggregate_type: "Receivable".to_string(),
                version,
                state,
                created_at: chrono::Utc::now(),
            };
            self.event_store.save_snapshot(snapshot).await?;
        }
        Ok(())
    }
}

#[async_trait]
impl<T: EventStore + Send + Sync> EventSourcedRepository<ReceivableAggregate>
    for ReceivableEventSourcedRepository<T>
{
    async fn load(&self, id: &str) -> Result<Option<ReceivableAggregate>, TopemsError> {
        self.load_from_events(id).await
    }

    #[allow(clippy::as_conversions)]
    async fn save(
        &self,
        aggregate: &mut ReceivableAggregate,
        metadata: Option<EventMetadata>,
    ) -> Result<(), TopemsError> {
        let current_version = self
            .event_store
            .get_aggregate_version(&aggregate.receivable.id)
            .await?;

        let events = vec![];
        let records = self
            .event_store
            .append_events(
                &aggregate.receivable.id,
                "Receivable",
                &events,
                current_version,
                metadata,
            )
            .await?;

        let new_version = current_version + records.len() as u64;
        self.save_snapshot_if_needed(aggregate, new_version).await?;

        Ok(())
    }
}

pub struct PayableEventSourcedRepository<T: EventStore> {
    event_store: T,
    snapshot_threshold: u64,
}

impl<T: EventStore> PayableEventSourcedRepository<T> {
    pub fn new(event_store: T) -> Self {
        Self {
            event_store,
            snapshot_threshold: 50,
        }
    }

    async fn load_from_events(&self, id: &str) -> Result<Option<PayableAggregate>, TopemsError> {
        let snapshot = self.event_store.get_latest_snapshot(id).await?;

        let (aggregate, from_version) = match snapshot {
            Some(snap) => {
                let agg: PayableAggregate = serde_json::from_value(snap.state).map_err(|e| {
                    TopemsError::ValidationFailed(format!("Failed to deserialize snapshot: {}", e))
                })?;
                (Some(agg), snap.version)
            }
            None => (None, 0),
        };

        let events = self.event_store.read_events(id, from_version, None).await?;
        if events.is_empty() && aggregate.is_none() {
            return Ok(None);
        }

        let mut agg = aggregate.unwrap_or_else(|| PayableAggregate {
            payable: Payable {
                id: id.to_string(),
                payable_no: String::new(),
                supplier_id: String::new(),
                supplier_name: String::new(),
                amount: 0.0,
                settled_amount: 0.0,
                status: SettlementStatus::Unsettled,
                billing_date: chrono::Utc::now().date_naive(),
                due_date: chrono::Utc::now().date_naive(),
                created_at: chrono::Utc::now(),
            },
            payments: Vec::new(),
            aging_buckets: Vec::new(),
        });

        for event in &events {
            Self::apply_event(&mut agg, &event.payload);
        }

        Ok(Some(agg))
    }

    fn apply_event(aggregate: &mut PayableAggregate, event: &FinanceDomainEvent) {
        match event {
            FinanceDomainEvent::PayableCreated(e) => {
                aggregate.payable.id = e.payable_id.clone();
                aggregate.payable.payable_no = e.payable_no.clone();
                aggregate.payable.supplier_id = e.supplier_id.clone();
                aggregate.payable.amount = e.amount;
                aggregate.payable.status = SettlementStatus::Unsettled;
                aggregate.payable.created_at = e.occurred_at;
            }
            FinanceDomainEvent::PayableSettled(e) => {
                aggregate.payable.id = e.payable_id.clone();
                aggregate.payable.settled_amount += e.settled_amount;
                aggregate.payable.status =
                    if aggregate.payable.settled_amount >= aggregate.payable.amount {
                        SettlementStatus::Settled
                    } else {
                        SettlementStatus::PartiallySettled
                    };
            }
            FinanceDomainEvent::AgingCalculated(e) if e.entity_type == "payable" => {
                aggregate.aging_buckets = e.buckets.clone();
            }
            _ => {}
        }
    }

    async fn save_snapshot_if_needed(
        &self,
        aggregate: &PayableAggregate,
        version: u64,
    ) -> Result<(), TopemsError> {
        if version.is_multiple_of(self.snapshot_threshold) && version > 0 {
            let state = serde_json::to_value(aggregate).map_err(|e| {
                TopemsError::ValidationFailed(format!("Failed to serialize snapshot: {}", e))
            })?;
            let snapshot = SnapshotRecord {
                aggregate_id: aggregate.payable.id.clone(),
                aggregate_type: "Payable".to_string(),
                version,
                state,
                created_at: chrono::Utc::now(),
            };
            self.event_store.save_snapshot(snapshot).await?;
        }
        Ok(())
    }
}

#[async_trait]
impl<T: EventStore + Send + Sync> EventSourcedRepository<PayableAggregate>
    for PayableEventSourcedRepository<T>
{
    async fn load(&self, id: &str) -> Result<Option<PayableAggregate>, TopemsError> {
        self.load_from_events(id).await
    }

    #[allow(clippy::as_conversions)]
    async fn save(
        &self,
        aggregate: &mut PayableAggregate,
        metadata: Option<EventMetadata>,
    ) -> Result<(), TopemsError> {
        let current_version = self
            .event_store
            .get_aggregate_version(&aggregate.payable.id)
            .await?;

        let events = vec![];
        let records = self
            .event_store
            .append_events(
                &aggregate.payable.id,
                "Payable",
                &events,
                current_version,
                metadata,
            )
            .await?;

        let new_version = current_version + records.len() as u64;
        self.save_snapshot_if_needed(aggregate, new_version).await?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::event_store::InMemoryEventStore;
    use crate::domain::events::{VoucherCreatedEvent, VoucherPostedEvent, VoucherReversedEvent};
    use std::sync::Arc;

    fn created_event(voucher_id: &str, voucher_no: &str) -> FinanceDomainEvent {
        FinanceDomainEvent::VoucherCreated(VoucherCreatedEvent {
            voucher_id: voucher_id.to_string(),
            voucher_no: voucher_no.to_string(),
            voucher_type: "general".into(),
            total_amount: 100.0,
            created_by: "u1".into(),
            occurred_at: chrono::Utc::now(),
        })
    }

    fn posted_event(voucher_id: &str, voucher_no: &str) -> FinanceDomainEvent {
        FinanceDomainEvent::VoucherPosted(VoucherPostedEvent {
            voucher_id: voucher_id.to_string(),
            voucher_no: voucher_no.to_string(),
            posted_by: "u2".into(),
            occurred_at: chrono::Utc::now(),
        })
    }

    fn reversed_event(voucher_id: &str, voucher_no: &str) -> FinanceDomainEvent {
        FinanceDomainEvent::VoucherReversed(VoucherReversedEvent {
            voucher_id: voucher_id.to_string(),
            voucher_no: voucher_no.to_string(),
            reversed_by: "u3".into(),
            reason: "test".into(),
            occurred_at: chrono::Utc::now(),
        })
    }

    fn snapshot(state: serde_json::Value, version: u64) -> SnapshotRecord {
        SnapshotRecord {
            aggregate_id: "v-snap".to_string(),
            aggregate_type: "Voucher".to_string(),
            version,
            state,
            created_at: chrono::Utc::now(),
        }
    }

    #[tokio::test]
    async fn load_returns_none_when_empty() {
        let repo = VoucherEventSourcedRepository::new(InMemoryEventStore::new());
        let loaded = repo.load("v-none").await.unwrap();
        assert!(loaded.is_none());
    }

    #[tokio::test]
    async fn load_reconstructs_aggregate_from_events() {
        let store = InMemoryEventStore::new();
        store
            .append_events("v-1", "Voucher", &[created_event("v-1", "VN-1")], 0, None)
            .await
            .unwrap();
        store
            .append_events("v-1", "Voucher", &[posted_event("v-1", "VN-1")], 1, None)
            .await
            .unwrap();
        let repo = VoucherEventSourcedRepository::new(store);
        let agg = repo.load("v-1").await.unwrap().unwrap();
        assert_eq!(agg.id, "v-1");
        assert_eq!(agg.voucher_no, "VN-1");
        assert_eq!(agg.total_debit, 100.0);
        assert_eq!(agg.status, VoucherStatus::Posted);
        assert!(agg.posted_at.is_some());
    }

    #[tokio::test]
    async fn load_reconstructs_reversed_status() {
        let store = InMemoryEventStore::new();
        store
            .append_events("v-2", "Voucher", &[created_event("v-2", "VN-2")], 0, None)
            .await
            .unwrap();
        store
            .append_events("v-2", "Voucher", &[reversed_event("v-2", "VN-2")], 1, None)
            .await
            .unwrap();
        let repo = VoucherEventSourcedRepository::new(store);
        let agg = repo.load("v-2").await.unwrap().unwrap();
        assert_eq!(agg.status, VoucherStatus::Reversed);
    }

    #[tokio::test]
    async fn load_restores_from_snapshot() {
        let store = InMemoryEventStore::new();
        let agg = VoucherAggregate {
            id: "v-snap".to_string(),
            voucher_no: "VN-S".to_string(),
            voucher_date: chrono::Utc::now().date_naive(),
            voucher_type: "general".into(),
            status: VoucherStatus::Posted,
            summary: "snap".into(),
            attachment_count: 0,
            created_by: "u1".into(),
            created_at: chrono::Utc::now(),
            posted_at: Some(chrono::Utc::now()),
            lines: Vec::new(),
            total_debit: 200.0,
            total_credit: 200.0,
        };
        store
            .save_snapshot(snapshot(serde_json::to_value(&agg).unwrap(), 1))
            .await
            .unwrap();
        let repo = VoucherEventSourcedRepository::new(store);
        let loaded = repo.load("v-snap").await.unwrap().unwrap();
        assert_eq!(loaded.voucher_no, "VN-S");
        assert_eq!(loaded.status, VoucherStatus::Posted);
        assert_eq!(loaded.total_debit, 200.0);
    }

    #[tokio::test]
    async fn load_corrupt_snapshot_returns_validation_error() {
        let store = InMemoryEventStore::new();
        store
            .save_snapshot(snapshot(serde_json::json!({ "not": "aggregate" }), 1))
            .await
            .unwrap();
        let repo = VoucherEventSourcedRepository::new(store);
        let err = repo.load("v-snap").await.unwrap_err();
        assert!(matches!(err, TopemsError::ValidationFailed(_)));
    }

    #[tokio::test]
    async fn save_snapshots_at_threshold() {
        let store = Arc::new(InMemoryEventStore::new());
        store
            .append_events("v-3", "Voucher", &[created_event("v-3", "VN-3")], 0, None)
            .await
            .unwrap();
        let repo = VoucherEventSourcedRepository::with_snapshot_threshold(store.clone(), 1);
        let mut agg = repo.load("v-3").await.unwrap().unwrap();
        assert_eq!(agg.status, VoucherStatus::Draft);

        repo.save(&mut agg, None).await.unwrap();
        let snap = store.get_latest_snapshot("v-3").await.unwrap();
        assert!(snap.is_some());
        assert_eq!(snap.unwrap().version, 1);
    }
}
