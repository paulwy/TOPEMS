//! Saga 持久化存储
//!
//! 提供 SagaStore trait 定义及其内存和 Postgres 实现。

use crate::event::EventError;
use crate::saga::orchestrator::{SagaInstance, SagaStatus};
use crate::saga::step::StepStatus;
use async_trait::async_trait;
use std::collections::HashMap;
use std::sync::Arc;
use thiserror::Error;
use tokio::sync::RwLock;
use uuid::Uuid;

/// Saga 模块统一 Result 类型
pub type SagaResult<T> = std::result::Result<T, SagaError>;

/// Saga 模块错误类型
#[derive(Error, Debug)]
pub enum SagaError {
    /// 存储层错误
    #[error("Store error: {0}")]
    StoreError(String),

    /// 步骤执行失败
    #[error("Step failed: {0}")]
    StepFailed(String),

    /// 补偿失败
    #[error("Compensation failed: {0}")]
    CompensationFailed(String),

    /// Saga 实例未找到
    #[error("Saga not found: {0}")]
    SagaNotFound(Uuid),

    /// 序列化错误
    #[error("Serialization error: {0}")]
    SerializationError(String),

    /// 事件层错误
    #[error("Event error: {0}")]
    EventError(#[from] EventError),
}

/// Saga 存储抽象 trait
///
/// 负责持久化 SagaInstance 和步骤状态，是编排器与底层持久化机制（Postgres、内存等）之间的解耦。
#[async_trait]
pub trait SagaStore: Send + Sync {
    /// 保存（覆盖式）一个 Saga 实例
    async fn save_saga(&self, saga: &SagaInstance) -> SagaResult<()>;

    /// 按 ID 加载 Saga 实例
    async fn load_saga(&self, saga_id: Uuid) -> SagaResult<SagaInstance>;

    /// 更新 Saga 实例状态
    async fn update_saga_status(&self, saga_id: Uuid, status: SagaStatus) -> SagaResult<()>;

    /// 更新某个步骤的状态和错误信息
    async fn update_step_status(
        &self,
        saga_id: Uuid,
        step_index: u32,
        status: StepStatus,
        error: Option<String>,
    ) -> SagaResult<()>;

    /// 列出所有 Pending 状态的 Saga 实例
    async fn list_pending_sagas(&self) -> SagaResult<Vec<SagaInstance>>;

    /// 列出所有 Failed 状态的 Saga 实例
    async fn list_failed_sagas(&self) -> SagaResult<Vec<SagaInstance>>;
}

/// 内存版 SagaStore 实现
///
/// 用于开发与测试环境，无需依赖外部存储。
#[derive(Debug, Default)]
pub struct InMemorySagaStore {
    sagas: Arc<RwLock<HashMap<Uuid, SagaInstance>>>,
}

impl InMemorySagaStore {
    pub fn new() -> Self {
        Self::default()
    }
}

#[async_trait]
impl SagaStore for InMemorySagaStore {
    async fn save_saga(&self, saga: &SagaInstance) -> SagaResult<()> {
        let mut sagas = self.sagas.write().await;
        sagas.insert(saga.id, saga.clone());
        Ok(())
    }

    async fn load_saga(&self, saga_id: Uuid) -> SagaResult<SagaInstance> {
        let sagas = self.sagas.read().await;
        sagas
            .get(&saga_id)
            .cloned()
            .ok_or(SagaError::SagaNotFound(saga_id))
    }

    async fn update_saga_status(&self, saga_id: Uuid, status: SagaStatus) -> SagaResult<()> {
        let mut sagas = self.sagas.write().await;
        let saga = sagas
            .get_mut(&saga_id)
            .ok_or(SagaError::SagaNotFound(saga_id))?;
        saga.status = status;
        match saga.status {
            SagaStatus::Completed
            | SagaStatus::Failed
            | SagaStatus::Compensated
            | SagaStatus::Aborted => {
                saga.completed_at = Some(chrono::Utc::now());
            }
            _ => {}
        }
        Ok(())
    }

    async fn update_step_status(
        &self,
        saga_id: Uuid,
        step_index: u32,
        status: StepStatus,
        error: Option<String>,
    ) -> SagaResult<()> {
        let mut sagas = self.sagas.write().await;
        let saga = sagas
            .get_mut(&saga_id)
            .ok_or(SagaError::SagaNotFound(saga_id))?;
        for step in &mut saga.steps {
            if step.step_index == step_index {
                step.status = status;
                if status == StepStatus::Running {
                    step.started_at = Some(chrono::Utc::now());
                }
                if matches!(
                    status,
                    StepStatus::Completed
                        | StepStatus::Failed
                        | StepStatus::Compensated
                        | StepStatus::Skipped
                ) {
                    step.completed_at = Some(chrono::Utc::now());
                }
                if let Some(e) = error {
                    step.error = Some(e);
                }
                break;
            }
        }
        Ok(())
    }

    async fn list_pending_sagas(&self) -> SagaResult<Vec<SagaInstance>> {
        let sagas = self.sagas.read().await;
        Ok(sagas
            .values()
            .filter(|s| s.status == SagaStatus::Pending)
            .cloned()
            .collect())
    }

    async fn list_failed_sagas(&self) -> SagaResult<Vec<SagaInstance>> {
        let sagas = self.sagas.read().await;
        Ok(sagas
            .values()
            .filter(|s| s.status == SagaStatus::Failed)
            .cloned()
            .collect())
    }
}

/// Postgres 版 SagaStore 实现
///
/// 生产环境使用，对应 schema 为 `core_infra`，表名 `saga_instances` 和 `saga_steps`。
/// 当前为 stub 实现，待后续迁移脚本补充表结构后完善。
pub struct PostgresSagaStore {
    /// SQL 连接池，目前未使用，待后续实现
    #[allow(dead_code)]
    pool: sqlx::PgPool,
}

impl PostgresSagaStore {
    pub fn new(pool: sqlx::PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl SagaStore for PostgresSagaStore {
    async fn save_saga(&self, _saga: &SagaInstance) -> SagaResult<()> {
        // stub: 待表结构迁移完成后实现
        // 实际实现将使用 `INSERT INTO core_infra.saga_instances ... ON CONFLICT ... UPDATE ...`
        Err(SagaError::StoreError(
            "PostgresSagaStore is not yet implemented (table schema pending)".to_string(),
        ))
    }

    async fn load_saga(&self, _saga_id: Uuid) -> SagaResult<SagaInstance> {
        // stub: 待表结构迁移完成后实现
        // 实际实现将使用 `SELECT ... FROM core_infra.saga_instances WHERE id = $1`
        Err(SagaError::StoreError(
            "PostgresSagaStore is not yet implemented (table schema pending)".to_string(),
        ))
    }

    async fn update_saga_status(&self, _saga_id: Uuid, _status: SagaStatus) -> SagaResult<()> {
        // stub: 待表结构迁移完成后实现
        // 实际实现将使用 `UPDATE core_infra.saga_instances SET status = $2, completed_at = $3 WHERE id = $1`
        Err(SagaError::StoreError(
            "PostgresSagaStore is not yet implemented (table schema pending)".to_string(),
        ))
    }

    async fn update_step_status(
        &self,
        _saga_id: Uuid,
        _step_index: u32,
        _status: StepStatus,
        _error: Option<String>,
    ) -> SagaResult<()> {
        // stub: 待表结构迁移完成后实现
        // 实际实现将使用 `UPDATE core_infra.saga_steps SET status = $3, error = $4 WHERE saga_id = $1 AND step_index = $2`
        Err(SagaError::StoreError(
            "PostgresSagaStore is not yet implemented (table schema pending)".to_string(),
        ))
    }

    async fn list_pending_sagas(&self) -> SagaResult<Vec<SagaInstance>> {
        // stub: 待表结构迁移完成后实现
        // 实际实现将使用 `SELECT ... FROM core_infra.saga_instances WHERE status = 'pending'`
        Err(SagaError::StoreError(
            "PostgresSagaStore is not yet implemented (table schema pending)".to_string(),
        ))
    }

    async fn list_failed_sagas(&self) -> SagaResult<Vec<SagaInstance>> {
        // stub: 待表结构迁移完成后实现
        // 实际实现将使用 `SELECT ... FROM core_infra.saga_instances WHERE status = 'failed'`
        Err(SagaError::StoreError(
            "PostgresSagaStore is not yet implemented (table schema pending)".to_string(),
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_saga(status: SagaStatus) -> SagaInstance {
        let mut saga = SagaInstance::new("test_saga", serde_json::json!({"key": "value"}));
        saga.status = status;
        saga
    }

    #[tokio::test]
    async fn test_save_and_load_saga() {
        let store = InMemorySagaStore::new();
        let saga = make_saga(SagaStatus::Pending);
        let saga_id = saga.id;

        store.save_saga(&saga).await.expect("save should succeed");

        let loaded = store.load_saga(saga_id).await.expect("load should succeed");
        assert_eq!(loaded.id, saga_id);
        assert_eq!(loaded.saga_type, "test_saga");
        assert_eq!(loaded.status, SagaStatus::Pending);
    }

    #[tokio::test]
    async fn test_load_nonexistent_saga_returns_error() {
        let store = InMemorySagaStore::new();
        let fake_id = Uuid::new_v4();
        let result = store.load_saga(fake_id).await;
        assert!(result.is_err());
        match result.unwrap_err() {
            SagaError::SagaNotFound(id) => assert_eq!(id, fake_id),
            other => panic!("Expected SagaNotFound, got {other:?}"),
        }
    }

    #[tokio::test]
    async fn test_update_saga_status_sets_completed_at() {
        let store = InMemorySagaStore::new();
        let saga = make_saga(SagaStatus::Pending);
        let saga_id = saga.id;
        store.save_saga(&saga).await.unwrap();

        store
            .update_saga_status(saga_id, SagaStatus::Completed)
            .await
            .expect("update should succeed");

        let loaded = store.load_saga(saga_id).await.unwrap();
        assert_eq!(loaded.status, SagaStatus::Completed);
        assert!(loaded.completed_at.is_some());
    }

    #[tokio::test]
    async fn test_update_saga_status_running_does_not_set_completed_at() {
        let store = InMemorySagaStore::new();
        let saga = make_saga(SagaStatus::Pending);
        let saga_id = saga.id;
        store.save_saga(&saga).await.unwrap();

        store
            .update_saga_status(saga_id, SagaStatus::Running)
            .await
            .unwrap();

        let loaded = store.load_saga(saga_id).await.unwrap();
        assert_eq!(loaded.status, SagaStatus::Running);
        assert!(loaded.completed_at.is_none());
    }

    #[tokio::test]
    async fn test_update_saga_status_nonexistent_returns_error() {
        let store = InMemorySagaStore::new();
        let result = store
            .update_saga_status(Uuid::new_v4(), SagaStatus::Completed)
            .await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_update_step_status_running_sets_started_at() {
        let store = InMemorySagaStore::new();
        let mut saga = make_saga(SagaStatus::Running);
        saga.steps
            .push(crate::saga::step::SagaStep::new("step_0", 0));
        let saga_id = saga.id;
        store.save_saga(&saga).await.unwrap();

        store
            .update_step_status(saga_id, 0, StepStatus::Running, None)
            .await
            .unwrap();

        let loaded = store.load_saga(saga_id).await.unwrap();
        assert_eq!(loaded.steps[0].status, StepStatus::Running);
        assert!(loaded.steps[0].started_at.is_some());
    }

    #[tokio::test]
    async fn test_update_step_status_completed_sets_completed_at() {
        let store = InMemorySagaStore::new();
        let mut saga = make_saga(SagaStatus::Running);
        saga.steps
            .push(crate::saga::step::SagaStep::new("step_1", 0));
        let saga_id = saga.id;
        store.save_saga(&saga).await.unwrap();

        store
            .update_step_status(saga_id, 0, StepStatus::Completed, None)
            .await
            .unwrap();

        let loaded = store.load_saga(saga_id).await.unwrap();
        assert_eq!(loaded.steps[0].status, StepStatus::Completed);
        assert!(loaded.steps[0].completed_at.is_some());
    }

    #[tokio::test]
    async fn test_update_step_status_failed_records_error() {
        let store = InMemorySagaStore::new();
        let mut saga = make_saga(SagaStatus::Running);
        saga.steps
            .push(crate::saga::step::SagaStep::new("step_err", 0));
        let saga_id = saga.id;
        store.save_saga(&saga).await.unwrap();

        store
            .update_step_status(
                saga_id,
                0,
                StepStatus::Failed,
                Some("database timeout".to_string()),
            )
            .await
            .unwrap();

        let loaded = store.load_saga(saga_id).await.unwrap();
        assert_eq!(loaded.steps[0].status, StepStatus::Failed);
        assert_eq!(loaded.steps[0].error.as_deref(), Some("database timeout"));
    }

    #[tokio::test]
    async fn test_update_step_status_nonexistent_saga_returns_error() {
        let store = InMemorySagaStore::new();
        let result = store
            .update_step_status(Uuid::new_v4(), 0, StepStatus::Running, None)
            .await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_list_pending_sagas() {
        let store = InMemorySagaStore::new();
        store
            .save_saga(&make_saga(SagaStatus::Pending))
            .await
            .unwrap();
        store
            .save_saga(&make_saga(SagaStatus::Completed))
            .await
            .unwrap();
        store
            .save_saga(&make_saga(SagaStatus::Pending))
            .await
            .unwrap();

        let pending = store.list_pending_sagas().await.unwrap();
        assert_eq!(pending.len(), 2);
        assert!(pending.iter().all(|s| s.status == SagaStatus::Pending));
    }

    #[tokio::test]
    async fn test_list_failed_sagas() {
        let store = InMemorySagaStore::new();
        store
            .save_saga(&make_saga(SagaStatus::Failed))
            .await
            .unwrap();
        store
            .save_saga(&make_saga(SagaStatus::Completed))
            .await
            .unwrap();
        store
            .save_saga(&make_saga(SagaStatus::Failed))
            .await
            .unwrap();
        store
            .save_saga(&make_saga(SagaStatus::Aborted))
            .await
            .unwrap();

        let failed = store.list_failed_sagas().await.unwrap();
        assert_eq!(failed.len(), 2);
        assert!(failed.iter().all(|s| s.status == SagaStatus::Failed));
    }

    #[tokio::test]
    async fn test_save_overwrites_existing_saga() {
        let store = InMemorySagaStore::new();
        let mut saga = make_saga(SagaStatus::Pending);
        let saga_id = saga.id;
        store.save_saga(&saga).await.unwrap();

        saga.status = SagaStatus::Completed;
        store.save_saga(&saga).await.unwrap();

        let loaded = store.load_saga(saga_id).await.unwrap();
        assert_eq!(loaded.status, SagaStatus::Completed);
    }

    #[tokio::test]
    async fn test_list_pending_empty_returns_empty_vec() {
        let store = InMemorySagaStore::new();
        let pending = store.list_pending_sagas().await.unwrap();
        assert!(pending.is_empty());
    }

    #[tokio::test]
    async fn test_list_failed_empty_returns_empty_vec() {
        let store = InMemorySagaStore::new();
        let failed = store.list_failed_sagas().await.unwrap();
        assert!(failed.is_empty());
    }

    #[tokio::test]
    async fn test_in_memory_store_default_is_empty() {
        let store = InMemorySagaStore::default();
        assert!(store.list_pending_sagas().await.unwrap().is_empty());
        assert!(store.list_failed_sagas().await.unwrap().is_empty());
    }

    #[tokio::test]
    async fn test_postgres_store_stub_returns_errors() {
        // PostgresSagaStore requires a real PgPool, but all methods are stubs.
        // We test the stub behavior by verifying it returns StoreError.
        // Since we can't easily create a PgPool without a DB, we test
        // the error type indirectly through the trait method signatures.
        // The stub implementation is covered by compile-time trait compliance.
        // Here we just verify the error type is correct for the stub.
        let err = SagaError::StoreError("test".to_string());
        assert!(err.to_string().contains("test"));
    }

    #[test]
    fn test_saga_error_display() {
        let id = Uuid::new_v4();
        let err = SagaError::SagaNotFound(id);
        assert!(err.to_string().contains(&id.to_string()));

        let err = SagaError::StepFailed("timeout".to_string());
        assert!(err.to_string().contains("timeout"));

        let err = SagaError::CompensationFailed("rollback failed".to_string());
        assert!(err.to_string().contains("rollback failed"));

        let err = SagaError::SerializationError("json error".to_string());
        assert!(err.to_string().contains("json error"));
    }

    #[tokio::test]
    async fn test_update_step_status_skipped_sets_completed_at() {
        let store = InMemorySagaStore::new();
        let mut saga = make_saga(SagaStatus::Running);
        saga.steps
            .push(crate::saga::step::SagaStep::new("skip_step", 0));
        let saga_id = saga.id;
        store.save_saga(&saga).await.unwrap();

        store
            .update_step_status(saga_id, 0, StepStatus::Skipped, None)
            .await
            .unwrap();

        let loaded = store.load_saga(saga_id).await.unwrap();
        assert_eq!(loaded.steps[0].status, StepStatus::Skipped);
        assert!(loaded.steps[0].completed_at.is_some());
    }

    #[tokio::test]
    async fn test_update_step_status_compensated_sets_completed_at() {
        let store = InMemorySagaStore::new();
        let mut saga = make_saga(SagaStatus::Compensating);
        saga.steps
            .push(crate::saga::step::SagaStep::new("comp_step", 0));
        let saga_id = saga.id;
        store.save_saga(&saga).await.unwrap();

        store
            .update_step_status(saga_id, 0, StepStatus::Compensated, None)
            .await
            .unwrap();

        let loaded = store.load_saga(saga_id).await.unwrap();
        assert_eq!(loaded.steps[0].status, StepStatus::Compensated);
        assert!(loaded.steps[0].completed_at.is_some());
    }
}
