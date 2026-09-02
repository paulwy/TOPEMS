use async_trait::async_trait;
use sqlx::{PgPool, Row};
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use super::event_store::{EventMetadata, EventRecord, EventStore, SnapshotRecord};
use super::events::FinanceDomainEvent;

pub struct PgEventStore {
    pool: PgPool,
}

impl PgEventStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
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

    fn row_to_event_record(row: &sqlx::postgres::PgRow) -> Result<EventRecord, String> {
        let id: Uuid = row.try_get("id").map_err(|e| e.to_string())?;
        let aggregate_id: String = row.try_get("aggregate_id").map_err(|e| e.to_string())?;
        let aggregate_type: String = row.try_get("aggregate_type").map_err(|e| e.to_string())?;
        let event_type: String = row.try_get("event_type").map_err(|e| e.to_string())?;
        let version: i64 = row.try_get("version").map_err(|e| e.to_string())?;
        let payload_json: serde_json::Value = row.try_get("payload").map_err(|e| e.to_string())?;
        let metadata_json: serde_json::Value =
            row.try_get("metadata").map_err(|e| e.to_string())?;
        let occurred_at: chrono::DateTime<chrono::Utc> =
            row.try_get("occurred_at").map_err(|e| e.to_string())?;

        let payload: FinanceDomainEvent =
            serde_json::from_value(payload_json).map_err(|e| e.to_string())?;
        let metadata: EventMetadata = serde_json::from_value(metadata_json).unwrap_or_default();

        Ok(EventRecord {
            id: id.to_string(),
            aggregate_id,
            aggregate_type,
            event_type,
            version: version as u64,
            payload,
            metadata,
            occurred_at,
        })
    }

    pub async fn get_events_since(
        &self,
        last_event_id: Option<&str>,
        batch_size: u32,
    ) -> Result<Vec<EventRecord>, String> {
        let batch_i64 = batch_size as i64;

        let rows = if let Some(last_id) = last_event_id {
            let last_uuid = Uuid::parse_str(last_id).map_err(|e| e.to_string())?;
            sqlx::query(
                only_own_schema_query!("finance", "SELECT id, aggregate_id, aggregate_type, event_type, payload, metadata, version, occurred_at FROM cqrs_events WHERE id > $1 ORDER BY occurred_at ASC, id ASC LIMIT $2"),
            )
            .bind(last_uuid)
            .bind(batch_i64)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| e.to_string())?
        } else {
            sqlx::query(only_own_schema_query!("finance", "SELECT id, aggregate_id, aggregate_type, event_type, payload, metadata, version, occurred_at FROM cqrs_events ORDER BY occurred_at ASC, id ASC LIMIT $1"))
                .bind(batch_i64)
                .fetch_all(&self.pool)
                .await
                .map_err(|e| e.to_string())?
        };

        let mut records = Vec::new();
        for row in rows {
            records.push(Self::row_to_event_record(&row)?);
        }
        Ok(records)
    }

    pub async fn get_event_count(&self) -> Result<u64, String> {
        let row = sqlx::query(only_own_schema_query!(
            "finance",
            "SELECT COUNT(*) as count FROM cqrs_events"
        ))
        .fetch_one(&self.pool)
        .await
        .map_err(|e| e.to_string())?;
        let count: i64 = row.try_get("count").map_err(|e| e.to_string())?;
        Ok(count as u64)
    }

    pub async fn get_events_by_type(
        &self,
        aggregate_type: &str,
        page: u32,
        page_size: u32,
    ) -> Result<(Vec<EventRecord>, u64), String> {
        let offset = ((page - 1) * page_size) as i64;
        let limit = page_size as i64;

        let count_row = sqlx::query(only_own_schema_query!(
            "finance",
            "SELECT COUNT(*) as count FROM cqrs_events WHERE aggregate_type = $1"
        ))
        .bind(aggregate_type)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| e.to_string())?;
        let total: i64 = count_row.try_get("count").map_err(|e| e.to_string())?;

        let rows = sqlx::query(
            only_own_schema_query!("finance", "SELECT id, aggregate_id, aggregate_type, event_type, payload, metadata, version, occurred_at FROM cqrs_events WHERE aggregate_type = $1 ORDER BY occurred_at DESC LIMIT $2 OFFSET $3"),
        )
        .bind(aggregate_type)
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        let mut records = Vec::new();
        for row in rows {
            records.push(Self::row_to_event_record(&row)?);
        }
        Ok((records, total as u64))
    }

    pub async fn get_snapshot_count(&self) -> Result<u64, String> {
        let row = sqlx::query(only_own_schema_query!(
            "finance",
            "SELECT COUNT(*) as count FROM cqrs_snapshots"
        ))
        .fetch_one(&self.pool)
        .await
        .map_err(|e| e.to_string())?;
        let count: i64 = row.try_get("count").map_err(|e| e.to_string())?;
        Ok(count as u64)
    }
}

#[async_trait]
impl EventStore for PgEventStore {
    async fn append_events(
        &self,
        aggregate_id: &str,
        aggregate_type: &str,
        events: &[FinanceDomainEvent],
        expected_version: u64,
        metadata: Option<EventMetadata>,
    ) -> Result<Vec<EventRecord>, String> {
        let mut tx = self.pool.begin().await.map_err(|e| e.to_string())?;

        let current_version_row = sqlx::query(only_own_schema_query!(
            "finance",
            "SELECT COALESCE(MAX(version), 0) as version FROM cqrs_events WHERE aggregate_id = $1"
        ))
        .bind(aggregate_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
        let current_version: i64 = current_version_row
            .try_get("version")
            .map_err(|e| e.to_string())?;
        let current_version_u64 = current_version as u64;

        if current_version_u64 != expected_version {
            return Err(format!(
                "Optimistic concurrency error: expected version {}, current version {}",
                expected_version, current_version_u64
            ));
        }

        let metadata = metadata.unwrap_or_default();
        let metadata_json = serde_json::to_value(&metadata).map_err(|e| e.to_string())?;
        let mut records = Vec::new();
        let mut version = current_version_u64;

        for event in events {
            version += 1;
            let event_type = Self::event_type(event);
            let payload_json = serde_json::to_value(event).map_err(|e| e.to_string())?;
            let id = Uuid::new_v4();

            let row = sqlx::query(
                only_own_schema_query!("finance", "INSERT INTO cqrs_events (id, aggregate_id, aggregate_type, event_type, version, payload, metadata, occurred_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                 RETURNING id, aggregate_id, aggregate_type, event_type, version, payload, metadata, occurred_at"),
            )
            .bind(id)
            .bind(aggregate_id)
            .bind(aggregate_type)
            .bind(&event_type)
            .bind(version as i64)
            .bind(&payload_json)
            .bind(&metadata_json)
            .fetch_one(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;

            records.push(Self::row_to_event_record(&row)?);
        }

        tx.commit().await.map_err(|e| e.to_string())?;
        Ok(records)
    }

    async fn read_events(
        &self,
        aggregate_id: &str,
        from_version: u64,
        to_version: Option<u64>,
    ) -> Result<Vec<EventRecord>, String> {
        let rows = if let Some(to_ver) = to_version {
            sqlx::query(
                only_own_schema_query!("finance", "SELECT id, aggregate_id, aggregate_type, event_type, payload, metadata, version, occurred_at FROM cqrs_events WHERE aggregate_id = $1 AND version >= $2 AND version <= $3 ORDER BY version ASC"),
            )
            .bind(aggregate_id)
            .bind(from_version as i64)
            .bind(to_ver as i64)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| e.to_string())?
        } else {
            sqlx::query(
                only_own_schema_query!("finance", "SELECT id, aggregate_id, aggregate_type, event_type, payload, metadata, version, occurred_at FROM cqrs_events WHERE aggregate_id = $1 AND version >= $2 ORDER BY version ASC"),
            )
            .bind(aggregate_id)
            .bind(from_version as i64)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| e.to_string())?
        };

        let mut records = Vec::new();
        for row in rows {
            records.push(Self::row_to_event_record(&row)?);
        }
        Ok(records)
    }

    async fn save_snapshot(&self, snapshot: SnapshotRecord) -> Result<(), String> {
        let state_json = serde_json::to_value(&snapshot.state).map_err(|e| e.to_string())?;

        sqlx::query(only_own_schema_query!(
            "finance",
            "INSERT INTO cqrs_snapshots (aggregate_id, aggregate_type, version, state, created_at)
             VALUES ($1, $2, $3, $4, NOW())
             ON CONFLICT (aggregate_id) DO UPDATE
             SET aggregate_type = EXCLUDED.aggregate_type,
                 version = EXCLUDED.version,
                 state = EXCLUDED.state,
                 created_at = NOW()"
        ))
        .bind(&snapshot.aggregate_id)
        .bind(&snapshot.aggregate_type)
        .bind(snapshot.version as i64)
        .bind(&state_json)
        .execute(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        Ok(())
    }

    async fn get_latest_snapshot(
        &self,
        aggregate_id: &str,
    ) -> Result<Option<SnapshotRecord>, String> {
        let result = sqlx::query(only_own_schema_query!("finance", "SELECT id, aggregate_id, aggregate_type, snapshot_data, version, created_at FROM cqrs_snapshots WHERE aggregate_id = $1"))
            .bind(aggregate_id)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| e.to_string())?;

        match result {
            Some(row) => {
                let aggregate_id: String =
                    row.try_get("aggregate_id").map_err(|e| e.to_string())?;
                let aggregate_type: String =
                    row.try_get("aggregate_type").map_err(|e| e.to_string())?;
                let version: i64 = row.try_get("version").map_err(|e| e.to_string())?;
                let state: serde_json::Value = row.try_get("state").map_err(|e| e.to_string())?;
                let created_at: chrono::DateTime<chrono::Utc> =
                    row.try_get("created_at").map_err(|e| e.to_string())?;

                Ok(Some(SnapshotRecord {
                    aggregate_id,
                    aggregate_type,
                    version: version as u64,
                    state,
                    created_at,
                }))
            }
            None => Ok(None),
        }
    }

    async fn get_aggregate_version(&self, aggregate_id: &str) -> Result<u64, String> {
        let row = sqlx::query(only_own_schema_query!(
            "finance",
            "SELECT COALESCE(MAX(version), 0) as version FROM cqrs_events WHERE aggregate_id = $1"
        ))
        .bind(aggregate_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| e.to_string())?;
        let version: i64 = row.try_get("version").map_err(|e| e.to_string())?;
        Ok(version as u64)
    }
}
