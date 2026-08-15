use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::events::FinanceDomainEvent;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventRecord {
    pub id: String,
    pub aggregate_id: String,
    pub aggregate_type: String,
    pub event_type: String,
    pub version: u64,
    pub payload: FinanceDomainEvent,
    pub metadata: EventMetadata,
    pub occurred_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventMetadata {
    pub causation_id: Option<String>,
    pub correlation_id: Option<String>,
    pub user_id: Option<String>,
    pub ip_address: Option<String>,
    pub extra: serde_json::Value,
}

impl Default for EventMetadata {
    fn default() -> Self {
        Self {
            causation_id: None,
            correlation_id: None,
            user_id: None,
            ip_address: None,
            extra: serde_json::Value::Object(serde_json::Map::new()),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SnapshotRecord {
    pub aggregate_id: String,
    pub aggregate_type: String,
    pub version: u64,
    pub state: serde_json::Value,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[async_trait]
pub trait EventStore: Send + Sync {
    async fn append_events(
        &self,
        aggregate_id: &str,
        aggregate_type: &str,
        events: &[FinanceDomainEvent],
        expected_version: u64,
        metadata: Option<EventMetadata>,
    ) -> Result<Vec<EventRecord>, String>;

    async fn read_events(
        &self,
        aggregate_id: &str,
        from_version: u64,
        to_version: Option<u64>,
    ) -> Result<Vec<EventRecord>, String>;

    async fn save_snapshot(&self, snapshot: SnapshotRecord) -> Result<(), String>;
    async fn get_latest_snapshot(
        &self,
        aggregate_id: &str,
    ) -> Result<Option<SnapshotRecord>, String>;
    async fn get_aggregate_version(&self, aggregate_id: &str) -> Result<u64, String>;
}

pub struct InMemoryEventStore {
    events: std::sync::Mutex<Vec<EventRecord>>,
    snapshots: std::sync::Mutex<Vec<SnapshotRecord>>,
}

impl InMemoryEventStore {
    pub fn new() -> Self {
        Self {
            events: std::sync::Mutex::new(Vec::new()),
            snapshots: std::sync::Mutex::new(Vec::new()),
        }
    }

    fn event_type(event: &FinanceDomainEvent) -> String {
        match event {
            FinanceDomainEvent::VoucherCreated(_) => "VoucherCreated",
            FinanceDomainEvent::VoucherPosted(_) => "VoucherPosted",
            FinanceDomainEvent::VoucherReversed(_) => "VoucherReversed",
            FinanceDomainEvent::ReceivableCreated(_) => "ReceivableCreated",
            FinanceDomainEvent::ReceivableSettled(_) => "ReceivableSettled",
            FinanceDomainEvent::PayableCreated(_) => "PayableCreated",
            FinanceDomainEvent::PayableSettled(_) => "PayableSettled",
            FinanceDomainEvent::CollectionReceived(_) => "CollectionReceived",
            FinanceDomainEvent::PaymentMade(_) => "PaymentMade",
            FinanceDomainEvent::AgingCalculated(_) => "AgingCalculated",
        }
        .to_string()
    }
}

impl Default for InMemoryEventStore {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl EventStore for InMemoryEventStore {
    async fn append_events(
        &self,
        aggregate_id: &str,
        aggregate_type: &str,
        events: &[FinanceDomainEvent],
        expected_version: u64,
        metadata: Option<EventMetadata>,
    ) -> Result<Vec<EventRecord>, String> {
        let mut all_events = self.events.lock().map_err(|e| e.to_string())?;

        let current_version = all_events
            .iter()
            .filter(|e| e.aggregate_id == aggregate_id)
            .map(|e| e.version)
            .max()
            .unwrap_or(0);

        if current_version != expected_version {
            return Err(format!(
                "Optimistic concurrency error: expected version {}, current version {}",
                expected_version, current_version
            ));
        }

        let metadata = metadata.unwrap_or_default();
        let mut records = Vec::new();
        let mut version = current_version;

        for event in events {
            version += 1;
            let record = EventRecord {
                id: Uuid::new_v4().to_string(),
                aggregate_id: aggregate_id.to_string(),
                aggregate_type: aggregate_type.to_string(),
                event_type: Self::event_type(event),
                version,
                payload: event.clone(),
                metadata: metadata.clone(),
                occurred_at: chrono::Utc::now(),
            };
            records.push(record);
        }

        all_events.extend(records.clone());
        Ok(records)
    }

    async fn read_events(
        &self,
        aggregate_id: &str,
        from_version: u64,
        to_version: Option<u64>,
    ) -> Result<Vec<EventRecord>, String> {
        let all_events = self.events.lock().map_err(|e| e.to_string())?;

        let mut events: Vec<EventRecord> = all_events
            .iter()
            .filter(|e| {
                e.aggregate_id == aggregate_id
                    && e.version >= from_version
                    && to_version.map_or(true, |v| e.version <= v)
            })
            .cloned()
            .collect();

        events.sort_by_key(|e| e.version);
        Ok(events)
    }

    async fn save_snapshot(&self, snapshot: SnapshotRecord) -> Result<(), String> {
        let mut snapshots = self.snapshots.lock().map_err(|e| e.to_string())?;

        snapshots.retain(|s| s.aggregate_id != snapshot.aggregate_id);
        snapshots.push(snapshot);
        Ok(())
    }

    async fn get_latest_snapshot(
        &self,
        aggregate_id: &str,
    ) -> Result<Option<SnapshotRecord>, String> {
        let snapshots = self.snapshots.lock().map_err(|e| e.to_string())?;

        Ok(snapshots
            .iter()
            .filter(|s| s.aggregate_id == aggregate_id)
            .max_by_key(|s| s.version)
            .cloned())
    }

    async fn get_aggregate_version(&self, aggregate_id: &str) -> Result<u64, String> {
        let all_events = self.events.lock().map_err(|e| e.to_string())?;

        Ok(all_events
            .iter()
            .filter(|e| e.aggregate_id == aggregate_id)
            .map(|e| e.version)
            .max()
            .unwrap_or(0))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::events::{FinanceDomainEvent, VoucherPostedEvent};
    use serde::{Deserialize, Serialize};

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    fn now() -> chrono::DateTime<chrono::Utc> {
        chrono::Utc::now()
    }

    fn uid() -> String {
        uuid::Uuid::new_v4().to_string()
    }

    fn sample_event() -> FinanceDomainEvent {
        FinanceDomainEvent::VoucherPosted(VoucherPostedEvent {
            voucher_id: uid(),
            voucher_no: "V-001".into(),
            posted_by: "alice".into(),
            occurred_at: now(),
        })
    }

    #[test]
    fn rt_event_metadata_default() {
        roundtrip(&EventMetadata::default());
    }

    #[test]
    fn rt_event_metadata_all_some() {
        roundtrip(&EventMetadata {
            causation_id: Some(uid()),
            correlation_id: Some(uid()),
            user_id: Some("user-123".into()),
            ip_address: Some("10.0.0.1".into()),
            extra: serde_json::json!({ "trace_id": "abc-123" }),
        });
    }

    #[test]
    fn rt_event_record_full() {
        roundtrip(&EventRecord {
            id: uid(),
            aggregate_id: "voucher-1".into(),
            aggregate_type: "Voucher".into(),
            event_type: "VoucherPosted".into(),
            version: 3,
            payload: sample_event(),
            metadata: EventMetadata {
                causation_id: Some(uid()),
                correlation_id: Some(uid()),
                user_id: Some("alice".into()),
                ip_address: None,
                extra: serde_json::Value::Null,
            },
            occurred_at: now(),
        });
    }

    #[test]
    fn rt_snapshot_record() {
        roundtrip(&SnapshotRecord {
            aggregate_id: "voucher-1".into(),
            aggregate_type: "Voucher".into(),
            version: 5,
            state: serde_json::json!({ "status": "Posted", "lines": [] }),
            created_at: now(),
        });
    }
}
