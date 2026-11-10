use sqlx::{PgPool, Row};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::time::{self, Duration};
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::error::TopemsError;
use topems_shared_db::scope::Db;
use uuid::Uuid;

use super::event_store::EventRecord;
use super::materialized_view::MaterializedView;

#[derive(Debug, Clone)]
pub struct AsyncProjectorConfig {
    pub poll_interval_ms: u64,
    pub batch_size: u32,
    pub retry_delay_ms: u64,
    pub max_retries: u32,
}

impl Default for AsyncProjectorConfig {
    fn default() -> Self {
        Self {
            poll_interval_ms: 1000,
            batch_size: 100,
            retry_delay_ms: 5000,
            max_retries: 5,
        }
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ProjectionProgress {
    pub view_name: String,
    pub last_event_id: Option<String>,
    pub last_event_time: Option<chrono::DateTime<chrono::Utc>>,
    pub processed_count: u64,
    pub error_count: u64,
    pub last_error: Option<String>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

pub struct AsyncProjector {
    pool: PgPool,
    /// 投影进度表（`tenant_id = …0000` 系统行）走显式系统作用域。
    db: Db,
    views: Vec<Arc<dyn MaterializedView>>,
    config: AsyncProjectorConfig,
    running: AtomicBool,
}

impl AsyncProjector {
    pub fn new(pool: PgPool, config: AsyncProjectorConfig) -> Self {
        let db = Db::new(pool.clone(), "finance, public");
        Self {
            pool,
            db,
            views: Vec::new(),
            config,
            running: AtomicBool::new(false),
        }
    }

    pub fn register_view(&mut self, view: Arc<dyn MaterializedView>) {
        self.views.push(view);
    }

    pub fn is_running(&self) -> bool {
        self.running.load(Ordering::SeqCst)
    }

    pub fn stop(&self) {
        self.running.store(false, Ordering::SeqCst);
    }

    #[allow(clippy::as_conversions, clippy::cast_sign_loss)]
    async fn get_last_progress(&self, view_name: &str) -> Result<ProjectionProgress, TopemsError> {
        // 系统表 tenant_id = …0000，无请求上下文，显式系统通道（登记 §2.1）。
        let mut scope = self.db.scope_read_system().await?;
        let result = sqlx::query(only_own_schema_query!("finance", "SELECT view_name, last_event_id, last_event_time, processed_count, error_count, last_error, updated_at FROM finance.cqrs_projection_progress WHERE view_name = $1"))
            .bind(view_name)
            .fetch_optional(&mut scope)
            .await
            ?;
        scope.commit().await?;

        match result {
            Some(row) => {
                let last_event_id: Option<Uuid> = row.try_get("last_event_id")?;
                let last_event_time: Option<chrono::DateTime<chrono::Utc>> =
                    row.try_get("last_event_time")?;
                let processed_count: i64 = row.try_get("processed_count")?;
                let error_count: i64 = row.try_get("error_count")?;
                let last_error: Option<String> = row.try_get("last_error")?;
                let updated_at: chrono::DateTime<chrono::Utc> = row.try_get("updated_at")?;

                Ok(ProjectionProgress {
                    view_name: view_name.to_string(),
                    last_event_id: last_event_id.map(|u| u.to_string()),
                    last_event_time,
                    processed_count: processed_count as u64,
                    error_count: error_count as u64,
                    last_error,
                    updated_at,
                })
            }
            None => {
                let mut tx = self.db.scope_system().await?;
                sqlx::query(
                    only_own_schema_query!("finance", "INSERT INTO finance.cqrs_projection_progress (view_name, processed_count, error_count, tenant_id) VALUES ($1, 0, 0, $2)"),
                )
                .bind(view_name)
                .bind(Uuid::nil())
                .execute(&mut tx)
                .await
                ?;
                tx.commit().await?;

                Ok(ProjectionProgress {
                    view_name: view_name.to_string(),
                    last_event_id: None,
                    last_event_time: None,
                    processed_count: 0,
                    error_count: 0,
                    last_error: None,
                    updated_at: chrono::Utc::now(),
                })
            }
        }
    }

    #[allow(clippy::as_conversions, clippy::cast_possible_wrap)]
    async fn update_progress(
        &self,
        view_name: &str,
        last_event_id: Option<&str>,
        last_event_time: Option<chrono::DateTime<chrono::Utc>>,
        processed_increment: u64,
        error: Option<&str>,
    ) -> Result<(), TopemsError> {
        let last_event_uuid = match last_event_id {
            Some(id) => Some(
                Uuid::parse_str(id)
                    .map_err(|e| TopemsError::ValidationFailed(format!("无效UUID: {e}")))?,
            ),
            None => None,
        };

        // 系统表 tenant_id = …0000，无请求上下文，显式系统通道（登记 §2.1）。
        let mut scope = self.db.scope_system().await?;
        if let Some(err) = error {
            sqlx::query(only_own_schema_query!(
                "finance",
                "UPDATE finance.cqrs_projection_progress 
                 SET last_event_id = $1, last_event_time = $2, 
                     error_count = error_count + 1, last_error = $3, updated_at = NOW()
                 WHERE view_name = $4"
            ))
            .bind(last_event_uuid)
            .bind(last_event_time)
            .bind(err)
            .bind(view_name)
            .execute(&mut scope)
            .await?;
        } else {
            sqlx::query(only_own_schema_query!(
                "finance",
                "UPDATE finance.cqrs_projection_progress 
                 SET last_event_id = $1, last_event_time = $2, 
                     processed_count = processed_count + $3, last_error = NULL, updated_at = NOW()
                 WHERE view_name = $4"
            ))
            .bind(last_event_uuid)
            .bind(last_event_time)
            .bind(processed_increment as i64)
            .bind(view_name)
            .execute(&mut scope)
            .await?;
        }
        scope.commit().await?;

        Ok(())
    }

    async fn fetch_events(
        &self,
        last_event_id: Option<&str>,
        batch_size: u32,
    ) -> Result<Vec<EventRecord>, TopemsError> {
        use super::pg_event_store::PgEventStore;

        let store = PgEventStore::new(self.pool.clone());
        store.get_events_since(last_event_id, batch_size).await
    }

    async fn process_view_batch(
        &self,
        view: &dyn MaterializedView,
        events: &[EventRecord],
    ) -> Result<u64, TopemsError> {
        let mut processed = 0u64;

        for event_record in events {
            let mut retries = 0;
            loop {
                match view.handle_event(&event_record.payload).await {
                    Ok(()) => {
                        processed += 1;
                        break;
                    }
                    Err(e) => {
                        retries += 1;
                        if retries >= self.config.max_retries {
                            return Err(TopemsError::BusinessLogic(format!(
                                "Failed to process event {} for view '{}' after {} retries: {}",
                                event_record.id,
                                view.view_name(),
                                self.config.max_retries,
                                e
                            )));
                        }
                        time::sleep(Duration::from_millis(self.config.retry_delay_ms)).await;
                    }
                }
            }
        }

        Ok(processed)
    }

    pub async fn run_once(&self) -> Result<u64, TopemsError> {
        let mut total_processed = 0u64;

        for view in &self.views {
            let view_name = view.view_name().to_string();
            let progress = self.get_last_progress(&view_name).await?;

            let events = self
                .fetch_events(progress.last_event_id.as_deref(), self.config.batch_size)
                .await?;

            if events.is_empty() {
                continue;
            }

            match self.process_view_batch(view.as_ref(), &events).await {
                Ok(processed) => {
                    let last_event = events.last();
                    let last_id = last_event.map(|e| e.id.as_str());
                    let last_time = last_event.map(|e| e.occurred_at);
                    self.update_progress(&view_name, last_id, last_time, processed, None)
                        .await?;
                    total_processed += processed;
                }
                Err(e) => {
                    let last_event = events.last();
                    let last_id = last_event.map(|e| e.id.as_str());
                    let last_time = last_event.map(|e| e.occurred_at);
                    self.update_progress(&view_name, last_id, last_time, 0, Some(&e.to_string()))
                        .await?;
                    tracing::error!("Projection error for view '{}': {}", view_name, e);
                }
            }
        }

        Ok(total_processed)
    }

    pub async fn start_background(self: Arc<Self>) {
        self.running.store(true, Ordering::SeqCst);
        let projector = Arc::clone(&self);

        tokio::spawn(async move {
            tracing::info!(
                "AsyncProjector started with {} views",
                projector.views.len()
            );

            while projector.running.load(Ordering::SeqCst) {
                match projector.run_once().await {
                    Ok(processed) if processed > 0 => {
                        tracing::debug!("Processed {} events across all views", processed);
                    }
                    Ok(_) => {
                        time::sleep(Duration::from_millis(projector.config.poll_interval_ms)).await;
                    }
                    Err(e) => {
                        tracing::error!("AsyncProjector run error: {}", e);
                        time::sleep(Duration::from_millis(projector.config.retry_delay_ms)).await;
                    }
                }
            }

            tracing::info!("AsyncProjector stopped");
        });
    }

    pub async fn get_progress(&self) -> Result<Vec<ProjectionProgress>, TopemsError> {
        let mut results = Vec::new();

        for view in &self.views {
            let view_name = view.view_name();
            match self.get_last_progress(view_name).await {
                Ok(progress) => results.push(progress),
                Err(e) => {
                    tracing::warn!("Failed to get progress for view '{}': {}", view_name, e);
                }
            }
        }

        Ok(results)
    }

    pub async fn replay_view(&self, view_name: &str) -> Result<(), TopemsError> {
        let view = self
            .views
            .iter()
            .find(|v| v.view_name() == view_name)
            .ok_or_else(|| format!("View '{}' not found", view_name))?;

        view.rebuild().await?;

        sqlx::query(only_own_schema_query!(
            "finance",
            "UPDATE finance.cqrs_projection_progress 
             SET last_event_id = NULL, last_event_time = NULL, 
                 processed_count = 0, error_count = 0, last_error = NULL, updated_at = NOW()
             WHERE view_name = $1"
        ))
        .bind(view_name)
        .execute(&self.pool)
        .await?;

        Ok(())
    }
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

    fn now() -> chrono::DateTime<chrono::Utc> {
        chrono::Utc::now()
    }

    fn uid() -> String {
        uuid::Uuid::new_v4().to_string()
    }

    #[test]
    fn rt_projection_progress_all_none() {
        roundtrip(&ProjectionProgress {
            view_name: "voucher_summary".into(),
            last_event_id: None,
            last_event_time: None,
            processed_count: 0,
            error_count: 0,
            last_error: None,
            updated_at: now(),
        });
    }

    #[test]
    fn rt_projection_progress_all_some() {
        roundtrip(&ProjectionProgress {
            view_name: "receivable_aging".into(),
            last_event_id: Some(uid()),
            last_event_time: Some(now()),
            processed_count: 1234,
            error_count: 2,
            last_error: Some("downstream timeout".into()),
            updated_at: now(),
        });
    }
}
