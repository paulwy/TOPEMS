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
            SagaStatus::Completed | SagaStatus::Failed | SagaStatus::Compensated | SagaStatus::Aborted => {
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
