use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::Instant;
use topems_shared_core::error::TopemsError;

use super::event_store::{EventRecord, EventStore};
use super::events::FinanceDomainEvent;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReplayResult {
    pub final_state: serde_json::Value,
    pub events_count: usize,
    pub duration_ms: u128,
    pub version: u64,
    pub aggregate_id: String,
    pub aggregate_type: String,
}

pub struct EventReplayer<T: EventStore> {
    event_store: Arc<T>,
}

impl<T: EventStore + Send + Sync + 'static> EventReplayer<T> {
    pub fn new(event_store: Arc<T>) -> Self {
        Self { event_store }
    }

    pub async fn replay_full(
        &self,
        aggregate_id: &str,
        aggregate_type: &str,
    ) -> Result<ReplayResult, TopemsError> {
        let start = Instant::now();
        let events = self.event_store.read_events(aggregate_id, 1, None).await?;
        let final_state = self.build_state(aggregate_type, &events);
        let version = events.last().map(|e| e.version).unwrap_or(0);
        let duration = start.elapsed();

        Ok(ReplayResult {
            final_state,
            events_count: events.len(),
            duration_ms: duration.as_millis(),
            version,
            aggregate_id: aggregate_id.to_string(),
            aggregate_type: aggregate_type.to_string(),
        })
    }

    pub async fn replay_to_time(
        &self,
        aggregate_id: &str,
        aggregate_type: &str,
        target_time: DateTime<Utc>,
    ) -> Result<ReplayResult, TopemsError> {
        let start = Instant::now();
        let all_events = self.event_store.read_events(aggregate_id, 1, None).await?;

        let filtered_events: Vec<EventRecord> = all_events
            .into_iter()
            .filter(|e| e.occurred_at <= target_time)
            .collect();

        let final_state = self.build_state(aggregate_type, &filtered_events);
        let version = filtered_events.last().map(|e| e.version).unwrap_or(0);
        let duration = start.elapsed();

        Ok(ReplayResult {
            final_state,
            events_count: filtered_events.len(),
            duration_ms: duration.as_millis(),
            version,
            aggregate_id: aggregate_id.to_string(),
            aggregate_type: aggregate_type.to_string(),
        })
    }

    pub async fn replay_to_version(
        &self,
        aggregate_id: &str,
        aggregate_type: &str,
        target_version: u64,
    ) -> Result<ReplayResult, TopemsError> {
        let start = Instant::now();
        let events = self
            .event_store
            .read_events(aggregate_id, 1, Some(target_version))
            .await?;

        let final_state = self.build_state(aggregate_type, &events);
        let version = events.last().map(|e| e.version).unwrap_or(0);
        let duration = start.elapsed();

        Ok(ReplayResult {
            final_state,
            events_count: events.len(),
            duration_ms: duration.as_millis(),
            version,
            aggregate_id: aggregate_id.to_string(),
            aggregate_type: aggregate_type.to_string(),
        })
    }

    fn build_state(&self, aggregate_type: &str, events: &[EventRecord]) -> serde_json::Value {
        match aggregate_type {
            "Voucher" => self.build_voucher_state(events),
            "Receivable" => self.build_receivable_state(events),
            "Payable" => self.build_payable_state(events),
            _ => serde_json::Value::Null,
        }
    }

    fn build_voucher_state(&self, events: &[EventRecord]) -> serde_json::Value {
        let mut state = serde_json::Map::new();
        let total_debit: f64 = 0.0;
        let total_credit: f64 = 0.0;
        let mut status = "Created";
        let mut posted_at: Option<DateTime<Utc>> = None;

        for event in events {
            match &event.payload {
                FinanceDomainEvent::VoucherCreated(e) => {
                    state.insert("id".to_string(), serde_json::json!(e.voucher_id));
                    state.insert("voucher_no".to_string(), serde_json::json!(e.voucher_no));
                    state.insert(
                        "voucher_type".to_string(),
                        serde_json::json!(e.voucher_type),
                    );
                    state.insert(
                        "total_amount".to_string(),
                        serde_json::json!(e.total_amount),
                    );
                    state.insert("created_by".to_string(), serde_json::json!(e.created_by));
                    state.insert(
                        "created_at".to_string(),
                        serde_json::json!(e.occurred_at.to_rfc3339()),
                    );
                }
                FinanceDomainEvent::VoucherPosted(e) => {
                    status = "Posted";
                    posted_at = Some(e.occurred_at);
                }
                FinanceDomainEvent::VoucherReversed(_e) => {
                    status = "Reversed";
                }
                _ => {}
            }
        }

        state.insert("status".to_string(), serde_json::json!(status));
        state.insert("total_debit".to_string(), serde_json::json!(total_debit));
        state.insert("total_credit".to_string(), serde_json::json!(total_credit));
        if let Some(pa) = posted_at {
            state.insert("posted_at".to_string(), serde_json::json!(pa.to_rfc3339()));
        }
        state.insert(
            "lines".to_string(),
            serde_json::json!(Vec::<serde_json::Value>::new()),
        );

        serde_json::Value::Object(state)
    }

    fn build_receivable_state(&self, events: &[EventRecord]) -> serde_json::Value {
        let mut state = serde_json::Map::new();
        let mut settled_amount: f64 = 0.0;
        let mut collections: Vec<serde_json::Value> = Vec::new();

        for event in events {
            match &event.payload {
                FinanceDomainEvent::ReceivableCreated(e) => {
                    state.insert(
                        "receivable_id".to_string(),
                        serde_json::json!(e.receivable_id),
                    );
                    state.insert(
                        "receivable_no".to_string(),
                        serde_json::json!(e.receivable_no),
                    );
                    state.insert("customer_id".to_string(), serde_json::json!(e.customer_id));
                    state.insert("amount".to_string(), serde_json::json!(e.amount));
                    state.insert(
                        "created_at".to_string(),
                        serde_json::json!(e.occurred_at.to_rfc3339()),
                    );
                }
                FinanceDomainEvent::ReceivableSettled(e) => {
                    settled_amount += e.settled_amount;
                    collections.push(serde_json::json!({
                        "collection_id": e.collection_id,
                        "settled_amount": e.settled_amount,
                        "occurred_at": e.occurred_at.to_rfc3339()
                    }));
                }
                FinanceDomainEvent::CollectionReceived(e) => {
                    collections.push(serde_json::json!({
                        "collection_id": e.collection_id,
                        "collection_no": e.collection_no,
                        "amount": e.amount,
                        "occurred_at": e.occurred_at.to_rfc3339()
                    }));
                }
                _ => {}
            }
        }

        state.insert(
            "settled_amount".to_string(),
            serde_json::json!(settled_amount),
        );
        state.insert("collections".to_string(), serde_json::json!(collections));
        state.insert("status".to_string(), serde_json::json!("Pending"));

        serde_json::Value::Object(state)
    }

    fn build_payable_state(&self, events: &[EventRecord]) -> serde_json::Value {
        let mut state = serde_json::Map::new();
        let mut settled_amount: f64 = 0.0;
        let mut payments: Vec<serde_json::Value> = Vec::new();

        for event in events {
            match &event.payload {
                FinanceDomainEvent::PayableCreated(e) => {
                    state.insert("payable_id".to_string(), serde_json::json!(e.payable_id));
                    state.insert("payable_no".to_string(), serde_json::json!(e.payable_no));
                    state.insert("supplier_id".to_string(), serde_json::json!(e.supplier_id));
                    state.insert("amount".to_string(), serde_json::json!(e.amount));
                    state.insert(
                        "created_at".to_string(),
                        serde_json::json!(e.occurred_at.to_rfc3339()),
                    );
                }
                FinanceDomainEvent::PayableSettled(e) => {
                    settled_amount += e.settled_amount;
                    payments.push(serde_json::json!({
                        "payment_id": e.payment_id,
                        "settled_amount": e.settled_amount,
                        "occurred_at": e.occurred_at.to_rfc3339()
                    }));
                }
                FinanceDomainEvent::PaymentMade(e) => {
                    payments.push(serde_json::json!({
                        "payment_id": e.payment_id,
                        "payment_no": e.payment_no,
                        "amount": e.amount,
                        "occurred_at": e.occurred_at.to_rfc3339()
                    }));
                }
                _ => {}
            }
        }

        state.insert(
            "settled_amount".to_string(),
            serde_json::json!(settled_amount),
        );
        state.insert("payments".to_string(), serde_json::json!(payments));
        state.insert("status".to_string(), serde_json::json!("Pending"));

        serde_json::Value::Object(state)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::event_store::InMemoryEventStore;
    use crate::domain::events::{VoucherCreatedEvent, VoucherPostedEvent, VoucherReversedEvent};
    use serde::{Deserialize, Serialize};

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    fn uid() -> String {
        uuid::Uuid::new_v4().to_string()
    }

    #[test]
    fn rt_replay_result() {
        roundtrip(&ReplayResult {
            final_state: serde_json::json!({ "status": "Posted", "total_amount": 1000 }),
            events_count: 3,
            duration_ms: 42,
            version: 3,
            aggregate_id: uid(),
            aggregate_type: "Voucher".into(),
        });
    }

    #[test]
    fn rt_replay_result_empty_state() {
        roundtrip(&ReplayResult {
            final_state: serde_json::Value::Null,
            events_count: 0,
            duration_ms: 0,
            version: 0,
            aggregate_id: "new-agg".into(),
            aggregate_type: "Receivable".into(),
        });
    }

    // ─── P0 补测：EventReplayer 事件回放（2026-10-07，盲区 event_replay 0/157）───
    // 用 InMemoryEventStore 注入，覆盖全量回放/时间回放/版本回放的状态重建。

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

    async fn store_with_events(events: Vec<FinanceDomainEvent>) -> Arc<InMemoryEventStore> {
        let store = Arc::new(InMemoryEventStore::new());
        for (i, ev) in events.iter().enumerate() {
            store
                .append_events("v-agg", "Voucher", &[ev.clone()], i as u64, None)
                .await
                .unwrap();
        }
        store
    }

    #[tokio::test]
    async fn replay_full_empty_aggregate() {
        let store = Arc::new(InMemoryEventStore::new());
        let replayer = EventReplayer::new(store);
        let result = replayer.replay_full("v-agg", "Voucher").await.unwrap();
        assert_eq!(result.events_count, 0);
        assert_eq!(result.version, 0);
        assert_eq!(result.final_state["status"], "Created");
        assert_eq!(result.aggregate_id, "v-agg");
    }

    #[tokio::test]
    async fn replay_full_reconstructs_voucher_state() {
        let store = store_with_events(vec![created_event("v-agg", "VN-1")]).await;
        let replayer = EventReplayer::new(store);
        let result = replayer.replay_full("v-agg", "Voucher").await.unwrap();
        assert_eq!(result.events_count, 1);
        assert_eq!(result.version, 1);
        assert_eq!(result.final_state["id"], "v-agg");
        assert_eq!(result.final_state["voucher_no"], "VN-1");
        assert_eq!(result.final_state["status"], "Created");
    }

    #[tokio::test]
    async fn replay_full_reflects_posted_and_reversed() {
        let store = store_with_events(vec![
            created_event("v-agg", "VN-2"),
            posted_event("v-agg", "VN-2"),
            FinanceDomainEvent::VoucherReversed(VoucherReversedEvent {
                voucher_id: "v-agg".into(),
                voucher_no: "VN-2".into(),
                reversed_by: "u3".into(),
                reason: "test".into(),
                occurred_at: chrono::Utc::now(),
            }),
        ]).await;
        let replayer = EventReplayer::new(store);
        let result = replayer.replay_full("v-agg", "Voucher").await.unwrap();
        assert_eq!(result.events_count, 3);
        assert_eq!(result.version, 3);
        assert_eq!(result.final_state["status"], "Reversed");
        assert!(result.final_state.get("posted_at").is_some());
    }

    #[tokio::test]
    async fn replay_to_version_truncates() {
        let store = store_with_events(vec![
            created_event("v-agg", "VN-3"),
            posted_event("v-agg", "VN-3"),
        ]).await;
        let replayer = EventReplayer::new(store);
        let result = replayer.replay_to_version("v-agg", "Voucher", 1).await.unwrap();
        assert_eq!(result.events_count, 1);
        assert_eq!(result.version, 1);
        assert_eq!(result.final_state["status"], "Created");
    }

    #[tokio::test]
    async fn replay_to_time_filters() {
        let store = store_with_events(vec![created_event("v-agg", "VN-4")]).await;
        let replayer = EventReplayer::new(store);

        // 目标时间在过去 → 过滤掉全部事件
        let past = chrono::Utc::now() - chrono::Duration::hours(1);
        let past_result = replayer
            .replay_to_time("v-agg", "Voucher", past)
            .await
            .unwrap();
        assert_eq!(past_result.events_count, 0);
        assert_eq!(past_result.version, 0);

        // 目标时间在未来 → 包含全部事件
        let future = chrono::Utc::now() + chrono::Duration::hours(1);
        let future_result = replayer
            .replay_to_time("v-agg", "Voucher", future)
            .await
            .unwrap();
        assert_eq!(future_result.events_count, 1);
        assert_eq!(future_result.final_state["id"], "v-agg");
    }

    #[tokio::test]
    async fn replay_unknown_aggregate_type_yields_null_state() {
        let store = store_with_events(vec![created_event("v-agg", "VN-5")]).await;
        let replayer = EventReplayer::new(store);
        let result = replayer.replay_full("v-agg", "UnknownType").await.unwrap();
        assert_eq!(result.final_state, serde_json::Value::Null);
    }
}
